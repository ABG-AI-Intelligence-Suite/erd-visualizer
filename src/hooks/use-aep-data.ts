import { useCallback, useState } from "react";
import type { AepConnectionConfig, AepConnection, AepSchema } from "@/lib/types";
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

function buildSchemaIdSet(schemas: AepSchema[]): Set<string> {
  const ids = new Set<string>();
  schemas.forEach((s) => {
    ids.add(s.$id);
    if (s["meta:altId"]) ids.add(s["meta:altId"]);
    if (s.$id.startsWith(NS_PREFIX)) {
      ids.add("_" + s.$id.slice(NS_PREFIX.length));
    } else if (s.$id.startsWith("_")) {
      ids.add(NS_PREFIX + s.$id.slice(1));
    }
  });
  return ids;
}

function buildSchemaIdLookup(schemas: AepSchema[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (let i = 0; i < schemas.length; i++) {
    const schema = schemas[i];
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

export function useAepData() {
  const { fetchDatasets } = useDatasets();
  const { fetchSchemas, fetchMissingSchemas } = useSchemas();
  const { fetchFieldGroups } = useFieldGroups();
  const { fetchFlows, fetchMissingConnections, fetchFlowDetails } = useFlows();
  const { fetchSchemaFields } = useSchemaFields();
  const setGraph = useCanvasStore((s) => s.setGraph);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(
    async (config: AepConnectionConfig) => {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.allSettled([
          fetchDatasets(config),
          fetchSchemas(config),
          fetchFieldGroups(config),
          fetchFlows(config),
        ]);

        const errors: string[] = [];
        const datasets = results[0].status === "fulfilled" ? results[0].value : (errors.push(getSettledError(results[0])), []);
        const schemaResult = results[1].status === "fulfilled" ? results[1].value : (errors.push(getSettledError(results[1])), { schemas: [], descriptors: [] });
        const fieldGroups = results[2].status === "fulfilled" ? results[2].value : (errors.push(getSettledError(results[2])), []);
        const flowResult = results[3].status === "fulfilled" ? results[3].value : (errors.push(getSettledError(results[3])), { flows: [], connections: [] });

        let allSchemas = schemaResult.schemas;

        const knownIds = buildSchemaIdSet(allSchemas);
        const missingRefs = new Set<string>();
        datasets.forEach((ds) => {
          if (ds.schemaRef?.id && !knownIds.has(ds.schemaRef.id)) {
            missingRefs.add(ds.schemaRef.id);
          }
        });

        if (missingRefs.size > 0) {
          const backfilled = await fetchMissingSchemas(
            Array.from(missingRefs),
            config
          );
          if (backfilled.length > 0) {
            allSchemas = [...allSchemas, ...backfilled];
          }
        }

        if (errors.length > 0) {
          setError(errors.join("\n\n"));
        }

        let allConnections = flowResult.connections;
        const connMap = new Map(allConnections.map((c) => [c.id, c]));

        const flowsWithTargets = flowResult.flows.filter(
          (f) => f.targetConnectionIds && f.targetConnectionIds.length > 0
        );
        if (flowsWithTargets.length > 0) {
          const flowDetails = await fetchFlowDetails(
            flowsWithTargets.map((f) => f.id),
            config
          );
          flowDetails.forEach((flow) => {
            flow.targetConnections?.forEach((tc) => {
              if (tc.id && tc.params) {
                const conn: AepConnection = {
                  id: tc.id,
                  name: connMap.get(tc.id)?.name ?? tc.id,
                  state: connMap.get(tc.id)?.state ?? "enabled",
                  connectionSpec: tc.connectionSpec,
                  params: tc.params,
                };
                connMap.set(tc.id, conn);
              }
            });
          });
        }

        const missingConnIds: string[] = [];
        flowResult.flows.forEach((f) => {
          f.targetConnectionIds?.forEach((connId) => {
            const conn = connMap.get(connId);
            if (!conn || (!conn.params?.dataSetId && !conn.params?.datasets?.length)) {
              missingConnIds.push(connId);
            }
          });
        });
        if (missingConnIds.length > 0) {
          const backfilledConns = await fetchMissingConnections(
            Array.from(new Set(missingConnIds)),
            config
          );
          backfilledConns.forEach((c) => connMap.set(c.id, c));
        }

        allConnections = Array.from(connMap.values());

        const schemaIdLookup = buildSchemaIdLookup(allSchemas);
        const referencedSchemaIds = new Set<string>();
        datasets.forEach((ds) => {
          if (ds.schemaRef?.id) {
            const canonicalId = schemaIdLookup.get(ds.schemaRef.id);
            if (canonicalId) referencedSchemaIds.add(canonicalId);
          }
        });

        let schemaFieldsMap;
        if (referencedSchemaIds.size > 0) {
          try {
            schemaFieldsMap = await fetchSchemaFields(
              Array.from(referencedSchemaIds),
              config,
              schemaResult.descriptors
            );
          } catch {
          }
        }

        const { nodes, edges } = transformToGraph({
          datasets,
          schemas: allSchemas,
          fieldGroups,
          flows: flowResult.flows,
          connections: allConnections,
          descriptors: schemaResult.descriptors,
          schemaFieldsMap,
        });

        setGraph(nodes, edges);
        saveGraphToCache(config.orgId, config.sandbox, nodes, edges);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to fetch AEP data";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [fetchDatasets, fetchSchemas, fetchMissingSchemas, fetchFieldGroups, fetchFlows, fetchFlowDetails, fetchMissingConnections, fetchSchemaFields, setGraph]
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

  return { loading, error, fetchAll, loadMockData, restoreCachedGraph };
}
