import { useCallback, useState } from "react";
import type { AepConnectionConfig, AepConnection, AepDataset, AepDescriptor, ProgressStep, StepStatus } from "@/lib/types";
import { transformToGraph, type TransformInput } from "@/lib/transform";
import type { Node, Edge } from "@xyflow/react";
import { useDatasets } from "./use-datasets";
import { useSchemas } from "./use-schemas";
import { useFieldGroups } from "./use-field-groups";
import { useFlows } from "./use-flows";
import { useSchemaFields } from "./use-schema-fields";
import { useCanvasStore } from "@/store/canvas-store";

function getSettledError(result: PromiseRejectedResult): string {
  const reason = result.reason;
  return reason instanceof Error ? reason.message : String(reason);
}

const NS_PREFIX = "https://ns.adobe.com/";

// Collects unique schema IDs from dataset schemaRefs.
function schemaIdsFromDatasets(datasets: AepDataset[]): Set<string> {
  const ids = new Set<string>();
  for (const ds of datasets) {
    if (ds.schemaRef?.id) ids.add(ds.schemaRef.id);
  }
  return ids;
}

// Adds schema IDs from relationship descriptors so cross-schema relationships
// are complete even when one side has no dataset.
function schemaIdsFromDescriptors(descriptors: AepDescriptor[]): Set<string> {
  const ids = new Set<string>();
  for (const d of descriptors) {
    if (
      d["@type"] === "xdm:descriptorOneToOne" ||
      d["@type"] === "xdm:descriptorManyToOne"
    ) {
      if (d["xdm:sourceSchema"]) ids.add(d["xdm:sourceSchema"]);
      if (d["xdm:destinationSchema"]) ids.add(d["xdm:destinationSchema"]);
    }
  }
  return ids;
}
const GRAPH_CACHE_KEY = "aep-erd:last-graph:v1";
const GRAPH_CACHE_META_KEY = "aep-erd:last-graph:meta:v2";
const GRAPH_CACHE_DB_NAME = "aep-erd-cache";
const GRAPH_CACHE_STORE = "graphs";
const GRAPH_CACHE_RECORD_KEY = "last-graph-v2";

interface CachedGraph {
  version: 1;
  createdAt: number;
  orgId: string;
  sandbox: string;
  nodes: Node[];
  edges: Edge[];
}

interface CachedGraphV2 {
  version: 2;
  createdAt: number;
  orgId: string;
  sandbox: string;
  nodes: Node[];
  edges: Edge[];
}

interface CachedGraphMeta {
  version: 2;
  createdAt: number;
  orgId: string;
  sandbox: string;
  nodeCount: number;
  edgeCount: number;
}

function openGraphCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(GRAPH_CACHE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(GRAPH_CACHE_STORE)) {
        db.createObjectStore(GRAPH_CACHE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open cache database"));
  });
}

function readGraphFromIndexedDb(): Promise<CachedGraphV2 | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      resolve(null);
      return;
    }
    openGraphCacheDb()
      .then((db) => {
        const tx = db.transaction(GRAPH_CACHE_STORE, "readonly");
        const store = tx.objectStore(GRAPH_CACHE_STORE);
        const request = store.get(GRAPH_CACHE_RECORD_KEY);
        request.onsuccess = () => {
          const value = request.result as CachedGraphV2 | undefined;
          resolve(value && value.version === 2 ? value : null);
        };
        request.onerror = () => resolve(null);
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
      })
      .catch(() => resolve(null));
  });
}

function writeGraphToIndexedDb(payload: CachedGraphV2) {
  if (typeof window === "undefined" || !("indexedDB" in window)) return;
  openGraphCacheDb()
    .then((db) => {
      const tx = db.transaction(GRAPH_CACHE_STORE, "readwrite");
      tx.objectStore(GRAPH_CACHE_STORE).put(payload, GRAPH_CACHE_RECORD_KEY);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    })
    .catch(() => {
    });
}

function collectFieldGroupRefs(schemas: { "meta:extends"?: string[]; allOf?: Array<{ $ref: string }> }[]): string[] {
  const refs = new Set<string>();
  for (const schema of schemas) {
    schema["meta:extends"]?.forEach((ref) => refs.add(ref));
    schema.allOf?.forEach((entry) => {
      if (entry.$ref) refs.add(entry.$ref);
    });
  }
  return Array.from(refs);
}

function buildSchemaIdLookup(schemas: { $id: string; "meta:altId"?: string }[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const schema of schemas) {
    lookup.set(schema.$id, schema.$id);
    if (schema["meta:altId"]) lookup.set(schema["meta:altId"], schema.$id);
    if (schema.$id.startsWith(NS_PREFIX)) lookup.set("_" + schema.$id.slice(NS_PREFIX.length), schema.$id);
    if (schema.$id.startsWith("_")) lookup.set(NS_PREFIX + schema.$id.slice(1), schema.$id);
  }
  return lookup;
}

function saveGraphToCache(orgId: string, sandbox: string, nodes: Node[], edges: Edge[]) {
  if (typeof window === "undefined") return;
  const payload: CachedGraphV2 = {
    version: 2,
    createdAt: Date.now(),
    orgId,
    sandbox,
    nodes,
    edges,
  };
  const meta: CachedGraphMeta = {
    version: 2,
    createdAt: payload.createdAt,
    orgId,
    sandbox,
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };
  window.localStorage.setItem(GRAPH_CACHE_META_KEY, JSON.stringify(meta));
  // Large graph payloads in localStorage are synchronous and can freeze UI on restore.
  window.localStorage.removeItem(GRAPH_CACHE_KEY);
  writeGraphToIndexedDb(payload);
}

function readGraphFromCache(): CachedGraph | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GRAPH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedGraph;
    if (!parsed || parsed.version !== 1) return null;
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function readGraphFromCacheAsync(): Promise<CachedGraphV2 | CachedGraph | null> {
  if (typeof window === "undefined") return null;
  const cachedV2 = await readGraphFromIndexedDb();
  if (cachedV2) return cachedV2;
  return readGraphFromCache();
}

function applyGraphOnNextFrame(setGraph: (nodes: Node[], edges: Edge[]) => void, nodes: Node[], edges: Edge[]) {
  if (typeof window === "undefined") {
    setGraph(nodes, edges);
    return;
  }
  window.requestAnimationFrame(() => {
    setGraph(nodes, edges);
  });
}

const INITIAL_STEPS: ProgressStep[] = [
  { id: "datasets",      label: "Fetching datasets",         status: "pending", unit: "datasets" },
  { id: "descriptors",   label: "Fetching descriptors",      status: "pending", unit: "descriptors" },
  { id: "flows",         label: "Fetching flows",            status: "pending", unit: "flows" },
  { id: "schemas",       label: "Fetching schemas",          status: "pending", unit: "schemas" },
  { id: "flow-details",  label: "Fetching flow details",     status: "pending" },
  { id: "field-groups",  label: "Fetching field groups",     status: "pending", unit: "field groups" },
  { id: "connections",   label: "Resolving connections",     status: "pending" },
  { id: "schema-fields", label: "Loading field definitions", status: "pending", unit: "schemas" },
  { id: "transform",     label: "Building graph",            status: "pending" },
];

export function useAepData() {
  const { fetchDatasets } = useDatasets();
  const { fetchDescriptors, fetchSchemasByIds } = useSchemas();
  const { fetchFieldGroupsByRefs } = useFieldGroups();
  const { fetchFlows, fetchMissingConnections, fetchFlowDetails } = useFlows();
  const { fetchSchemaFields } = useSchemaFields();
  const setGraph = useCanvasStore((s) => s.setGraph);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressStep[]>(INITIAL_STEPS);

  const updateStep = useCallback((id: string, status: StepStatus, count?: number) => {
    setProgress((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status, ...(count !== undefined ? { count } : {}) } : s
      )
    );
  }, []);

  const fetchAll = useCallback(
    async (config: AepConnectionConfig) => {
      setLoading(true);
      setError(null);
      setProgress(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" as StepStatus })));
      try {
        // Phase 1: datasets, descriptors, flows — all independent, run in parallel.
        updateStep("datasets",    "active");
        updateStep("descriptors", "active");
        updateStep("flows",       "active");

        const [datasetsResult, descriptorsResult, flowsResult] = await Promise.allSettled([
          fetchDatasets(config).then((r)    => { updateStep("datasets",    "done", r.length);         return r; }),
          fetchDescriptors(config).then((r) => { updateStep("descriptors", "done", r.length);         return r; }),
          fetchFlows(config).then((r)       => { updateStep("flows",       "done", r.flows.length);   return r; }),
        ]);

        const errors: string[] = [];
        const datasets    = datasetsResult.status    === "fulfilled" ? datasetsResult.value    : (errors.push(getSettledError(datasetsResult)),    []);
        const descriptors = descriptorsResult.status === "fulfilled" ? descriptorsResult.value : (errors.push(getSettledError(descriptorsResult)), []);
        const flowResult  = flowsResult.status       === "fulfilled" ? flowsResult.value       : (errors.push(getSettledError(flowsResult)),       { flows: [], connections: [] });

        // Phase 2: fetch schemas by exact IDs (from datasets + relationship descriptors)
        //          and flow details in parallel — both only need phase 1 results.
        const datasetSchemaIds  = schemaIdsFromDatasets(datasets);
        const descriptorSchemaIds = schemaIdsFromDescriptors(descriptors);
        const combinedSchemaIds = new Set<string>();
        datasetSchemaIds.forEach((id) => combinedSchemaIds.add(id));
        descriptorSchemaIds.forEach((id) => combinedSchemaIds.add(id));
        const allSchemaIds = Array.from(combinedSchemaIds);

        updateStep("schemas",      "active");
        updateStep("flow-details", "active");

        const connMap = new Map(flowResult.connections.map((c) => [c.id, c]));
        const flowsWithTargets = flowResult.flows.filter(
          (f) => f.targetConnectionIds && f.targetConnectionIds.length > 0
        );

        const [schemasResult, flowDetailsResult] = await Promise.allSettled([
          fetchSchemasByIds(allSchemaIds, config).then((r) => { updateStep("schemas", "done", r.length); return r; }),
          fetchFlowDetails(flowsWithTargets.map((f) => f.id), config).then((r) => {
            updateStep("flow-details", "done", r.length);
            r.forEach((flow) => {
              flow.targetConnections?.forEach((tc) => {
                if (tc.id && tc.params) {
                  connMap.set(tc.id, {
                    id: tc.id,
                    name: connMap.get(tc.id)?.name ?? tc.id,
                    state: connMap.get(tc.id)?.state ?? "enabled",
                    connectionSpec: tc.connectionSpec,
                    params: tc.params,
                  } as AepConnection);
                }
              });
            });
            return r;
          }),
        ]);

        const schemas = schemasResult.status === "fulfilled" ? schemasResult.value : (errors.push(getSettledError(schemasResult)), []);
        if (flowDetailsResult.status === "rejected") errors.push(getSettledError(flowDetailsResult));

        // Phase 3: field groups by refs, missing connections, schema fields
        //          — all depend on phase 2, and are independent of each other.
        const fgRefs = collectFieldGroupRefs(schemas);

        const missingConnIds = Array.from(new Set(
          flowResult.flows.flatMap((f) =>
            (f.targetConnectionIds ?? []).filter((connId) => {
              const c = connMap.get(connId);
              return !c || (!c.params?.dataSetId && !c.params?.datasets?.length);
            })
          )
        ));

        const schemaIdLookup = buildSchemaIdLookup(schemas);
        const referencedSchemaIds = datasets
          .map((ds) => ds.schemaRef?.id ? schemaIdLookup.get(ds.schemaRef.id) : undefined)
          .filter((id): id is string => id !== undefined);
        const uniqueSchemaIds = Array.from(new Set(referencedSchemaIds));

        updateStep("field-groups",  "active");
        updateStep("connections",   "active");
        updateStep("schema-fields", "active");

        const [fieldGroupsResult, connectionsResult, schemaFieldsResult] = await Promise.allSettled([
          fetchFieldGroupsByRefs(fgRefs, config).then((r) => { updateStep("field-groups", "done", r.length); return r; }),
          fetchMissingConnections(missingConnIds, config).then((r) => {
            r.forEach((c) => connMap.set(c.id, c));
            updateStep("connections", "done", r.length);
            return r;
          }),
          uniqueSchemaIds.length > 0
            ? fetchSchemaFields(uniqueSchemaIds, config, descriptors).then((r) => { updateStep("schema-fields", "done", r.size); return r; })
            : Promise.resolve(new Map()).then((r) => { updateStep("schema-fields", "done", 0); return r; }),
        ]);

        const fieldGroups     = fieldGroupsResult.status  === "fulfilled" ? fieldGroupsResult.value  : (errors.push(getSettledError(fieldGroupsResult)),  []);
        if (connectionsResult.status === "rejected") errors.push(getSettledError(connectionsResult));
        const schemaFieldsMap = schemaFieldsResult.status === "fulfilled" ? schemaFieldsResult.value : undefined;

        if (errors.length > 0) setError(errors.join("\n\n"));

        // Phase 4: build graph.
        updateStep("transform", "active");
        const { nodes, edges } = transformToGraph({
          datasets,
          schemas,
          fieldGroups,
          flows: flowResult.flows,
          connections: Array.from(connMap.values()),
          descriptors,
          schemaFieldsMap,
        });

        updateStep("transform", "done", nodes.length);
        setGraph(nodes, edges);
        saveGraphToCache(config.orgId, config.sandbox, nodes, edges);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to fetch AEP data";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [fetchDatasets, fetchDescriptors, fetchSchemasByIds, fetchFieldGroupsByRefs, fetchFlows, fetchFlowDetails, fetchMissingConnections, fetchSchemaFields, updateStep, setGraph]
  );

  const loadMockData = useCallback((input: TransformInput) => {
    const { nodes, edges } = transformToGraph(input);
    setGraph(nodes, edges);
    saveGraphToCache("mock", "mock", nodes, edges);
  }, [setGraph]);

  const restoreCachedGraph = useCallback(async () => {
    setLoading(true);
    try {
      const cached = await readGraphFromCacheAsync();
      if (!cached) return null;
      if (cached.version === 1) {
        saveGraphToCache(cached.orgId, cached.sandbox, cached.nodes, cached.edges);
      }
      applyGraphOnNextFrame(setGraph, cached.nodes, cached.edges);
      return {
        orgId: cached.orgId,
        sandbox: cached.sandbox,
        createdAt: cached.createdAt,
      };
    } finally {
      setLoading(false);
    }
  }, [setGraph]);

  return { loading, error, progress, fetchAll, loadMockData, restoreCachedGraph };
}
