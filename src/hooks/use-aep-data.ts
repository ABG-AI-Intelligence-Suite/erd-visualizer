import { useCallback, useState } from "react";
import type { AepConnectionConfig, AepDataset, AepDescriptor, AepSchema, AepFieldGroup, AepFlow, AepConnection, ErdField, ProgressStep, StepStatus, FetchOptions } from "@/lib/types";
import { transformToGraph, type TransformInput } from "@/lib/transform";
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

function schemaIdsFromDatasets(datasets: AepDataset[]): Set<string> {
  const ids = new Set<string>();
  for (const ds of datasets) {
    if (ds.schemaRef?.id) ids.add(ds.schemaRef.id);
  }
  return ids;
}

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

// Refs that appear in meta:extends but are not field groups (behaviors, base classes).
const XDM_NON_FIELDGROUP_PREFIXES = [
  "https://ns.adobe.com/xdm/data/",
  "https://ns.adobe.com/xdm/common/",
];

function collectFieldGroupRefs(
  schemas: { $id?: string; "meta:class"?: string; "meta:extends"?: string[]; allOf?: Array<{ $ref: string }> }[]
): string[] {
  const refs = new Set<string>();
  for (const schema of schemas) {
    const classRef = schema["meta:class"];
    const selfRef = schema.$id;

    if (schema.allOf && schema.allOf.length > 0) {
      // allOf is the direct, non-recursive composition: [class, ...fieldGroups].
      // Excluding the class ref and known non-field-group prefixes leaves only the field groups.
      for (const entry of schema.allOf) {
        if (
          entry.$ref &&
          entry.$ref !== classRef &&
          entry.$ref !== selfRef &&
          !XDM_NON_FIELDGROUP_PREFIXES.some((p) => entry.$ref.startsWith(p))
        ) {
          refs.add(entry.$ref);
        }
      }
    } else if (schema["meta:extends"]) {
      // Fallback: meta:extends is the fully-flattened ancestor chain.
      // Filter out the class, self-ref, and known non-field-group XDM base refs.
      for (const ref of schema["meta:extends"]) {
        if (ref === classRef || ref === selfRef) continue;
        if (XDM_NON_FIELDGROUP_PREFIXES.some((p) => ref.startsWith(p))) continue;
        refs.add(ref);
      }
    }
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

const INITIAL_STEPS: ProgressStep[] = [
  { id: "datasets",      label: "Fetching datasets",           status: "pending", unit: "datasets" },
  { id: "descriptors",   label: "Fetching descriptors",        status: "pending", unit: "descriptors" },
  { id: "flows",         label: "Fetching flows & connections", status: "pending", unit: "flows" },
  { id: "schemas",       label: "Fetching schemas",            status: "pending", unit: "schemas" },
  { id: "field-groups",  label: "Fetching field groups",       status: "pending", unit: "field groups" },
  { id: "schema-fields", label: "Loading field definitions",   status: "pending", unit: "schemas" },
  { id: "connections",   label: "Resolving connections",       status: "pending" },
  { id: "transform",     label: "Building graph",              status: "pending" },
];

export function useAepData() {
  const { fetchDatasets } = useDatasets();
  const { fetchDescriptors, fetchSchemasByIds } = useSchemas();
  const { fetchFieldGroupsByRefs } = useFieldGroups();
  const { fetchFlows, fetchMissingConnections } = useFlows();
  const { fetchSchemaFields } = useSchemaFields();
  const setGraph = useCanvasStore((s) => s.setGraph);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressStep[]>(INITIAL_STEPS);

  const updateStep = useCallback((id: string, status: StepStatus, count?: number, total?: number) => {
    setProgress((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status,
              ...(count !== undefined ? { count } : {}),
              ...(total !== undefined ? { total } : {}),
            }
          : s
      )
    );
  }, []);

  const DEFAULT_FETCH_OPTIONS: FetchOptions = {
    datasets: true,
    schemas: true,
    fieldGroups: true,
    flows: true,
  };

  const fetchAll = useCallback(
    async (config: AepConnectionConfig, fetchOpts?: FetchOptions) => {
      const opts = fetchOpts ?? DEFAULT_FETCH_OPTIONS;
      setLoading(true);
      setError(null);

      // Build the steps list based on what we're fetching
      const activeSteps = INITIAL_STEPS.map((s) => {
        // Skip steps for disabled entity types
        if (s.id === "datasets" && !opts.datasets) return { ...s, status: "done" as StepStatus, count: 0 };
        if (s.id === "flows" && !opts.flows) return { ...s, status: "done" as StepStatus, count: 0 };
        if (s.id === "connections" && !opts.flows) return { ...s, status: "done" as StepStatus, count: 0 };
        if (s.id === "field-groups" && !opts.fieldGroups) return { ...s, status: "done" as StepStatus, count: 0 };
        // schemas and descriptors are always fetched if datasets OR schemas are requested
        if (s.id === "schemas" && !opts.schemas && !opts.datasets) return { ...s, status: "done" as StepStatus, count: 0 };
        if (s.id === "schema-fields" && !opts.schemas && !opts.datasets) return { ...s, status: "done" as StepStatus, count: 0 };
        return { ...s, status: "pending" as StepStatus };
      });
      setProgress(activeSteps);

      let datasets:    AepDataset[]                = [];
      let descriptors: AepDescriptor[]             = [];
      let schemas:     AepSchema[]                 = [];
      let fieldGroups: AepFieldGroup[]             = [];
      let schemaFieldsMap: Map<string, ErdField[]> | undefined;
      const errors: string[] = [];

      // Flows (optional)
      let flowsPromise: Promise<{ flows: AepFlow[]; connections: AepConnection[] }>;
      if (opts.flows) {
        updateStep("flows", "active");
        flowsPromise = fetchFlows(config)
          .then((r) => { updateStep("flows", "done", r.flows.length); return r; })
          .catch((err: Error) => {
            errors.push(err.message);
            updateStep("flows", "done", 0);
            return { flows: [] as AepFlow[], connections: [] as AepConnection[] };
          });
      } else {
        flowsPromise = Promise.resolve({ flows: [] as AepFlow[], connections: [] as AepConnection[] });
      }

      // Datasets (optional) and Descriptors (needed for schemas)
      const fetchDatasetsProm = opts.datasets
        ? (updateStep("datasets", "active"), fetchDatasets(config).then((r) => { updateStep("datasets", "done", r.length); return r; }))
        : Promise.resolve([] as AepDataset[]);

      const needDescriptors = opts.schemas || opts.datasets;
      const fetchDescriptorsProm = needDescriptors
        ? (updateStep("descriptors", "active"), fetchDescriptors(config).then((r) => { updateStep("descriptors", "done", r.length); return r; }))
        : Promise.resolve([] as AepDescriptor[]);

      const [datasetsResult, descriptorsResult] = await Promise.allSettled([
        fetchDatasetsProm,
        fetchDescriptorsProm,
      ]);

      datasets    = datasetsResult.status    === "fulfilled" ? datasetsResult.value    : (errors.push(getSettledError(datasetsResult)),    []);
      descriptors = descriptorsResult.status === "fulfilled" ? descriptorsResult.value : (errors.push(getSettledError(descriptorsResult)), []);

      // Schemas (if datasets or schemas requested)
      if (opts.schemas || opts.datasets) {
        const allSchemaIds = Array.from((() => {
          const ids = new Set<string>();
          schemaIdsFromDatasets(datasets).forEach((id) => ids.add(id));
          schemaIdsFromDescriptors(descriptors).forEach((id) => ids.add(id));
          return ids;
        })());

        updateStep("schemas", "active", 0, allSchemaIds.length);
        schemas = await fetchSchemasByIds(allSchemaIds, config, (resolved, total) => {
          updateStep("schemas", "active", resolved, total);
        }).catch((err: Error) => { errors.push(err.message); return []; });
        updateStep("schemas", "done", schemas.length);
      }

      const fgRefs = opts.fieldGroups ? collectFieldGroupRefs(schemas) : [];
      const schemaIdLookup = buildSchemaIdLookup(schemas);
      const uniqueSchemaIds = Array.from(new Set(
        datasets
          .map((ds) => ds.schemaRef?.id ? schemaIdLookup.get(ds.schemaRef.id) : undefined)
          .filter((id): id is string => id !== undefined)
      ));

      // Field groups & schema fields
      const fetchFgProm = opts.fieldGroups && fgRefs.length > 0
        ? (updateStep("field-groups", "active"), fetchFieldGroupsByRefs(fgRefs, config).then((r) => { updateStep("field-groups", "done", r.length); return r; }))
        : Promise.resolve([] as AepFieldGroup[]).then((r) => { updateStep("field-groups", "done", 0); return r; });

      const fetchSfProm = (opts.schemas || opts.datasets) && uniqueSchemaIds.length > 0
        ? (updateStep("schema-fields", "active"), fetchSchemaFields(uniqueSchemaIds, config, descriptors).then((r) => { updateStep("schema-fields", "done", r.size); return r; }))
        : Promise.resolve(new Map<string, ErdField[]>()).then((r) => { updateStep("schema-fields", "done", 0); return r; });

      const [fieldGroupsResult, schemaFieldsResult] = await Promise.allSettled([fetchFgProm, fetchSfProm]);

      fieldGroups     = fieldGroupsResult.status  === "fulfilled" ? fieldGroupsResult.value  : (errors.push(getSettledError(fieldGroupsResult)),  []);
      schemaFieldsMap = schemaFieldsResult.status === "fulfilled" ? schemaFieldsResult.value : undefined;

      try {
        if (errors.length > 0) setError(errors.join("\n\n"));

        updateStep("transform", "active");
        const { nodes: earlyNodes, edges: earlyEdges } = transformToGraph({
          datasets,
          schemas,
          fieldGroups,
          flows: [],
          connections: [],
          descriptors,
          schemaFieldsMap,
        });
        updateStep("transform", "done", earlyNodes.length);
        setGraph(earlyNodes, earlyEdges);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to build graph");
      } finally {
        setLoading(false);
      }

      try {
        const flowResult = await flowsPromise;
        if (flowResult.flows.length === 0) return;

        const connMap = new Map(flowResult.connections.map((c) => [c.id, c]));
        const missingConnIds = Array.from(new Set(
          flowResult.flows.flatMap((f) =>
            (f.targetConnectionIds ?? []).filter((connId) => {
              const c = connMap.get(connId);
              return !c || (!c.params?.dataSetId && !c.params?.datasets?.length);
            })
          )
        ));

        updateStep("connections", "active");
        const missingConns = await fetchMissingConnections(missingConnIds, config).catch(() => []);
        missingConns.forEach((c) => connMap.set(c.id, c));
        updateStep("connections", "done", missingConns.length);

        const { nodes, edges } = transformToGraph({
          datasets,
          schemas,
          fieldGroups,
          flows: flowResult.flows,
          connections: Array.from(connMap.values()),
          descriptors,
          schemaFieldsMap,
        });
        setGraph(nodes, edges);
      } catch (err) {
        console.warn("[Flows] Background graph update failed:", err instanceof Error ? err.message : err);
      }
    },
    [fetchDatasets, fetchDescriptors, fetchSchemasByIds, fetchFieldGroupsByRefs, fetchFlows, fetchMissingConnections, fetchSchemaFields, updateStep, setGraph]
  );

  const loadMockData = useCallback((input: TransformInput) => {
    const { nodes, edges } = transformToGraph(input);
    setGraph(nodes, edges);
  }, [setGraph]);

  return { loading, error, progress, fetchAll, loadMockData };
}
