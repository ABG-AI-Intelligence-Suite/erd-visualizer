import { useCallback, useState } from "react";
import type { AepConnectionConfig, AepConnection, AepSchema } from "@/lib/types";
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
function buildSchemaIdSet(schemas: AepSchema[]): Set<string> {
  const ids = new Set<string>();
  schemas.forEach((s) => {
    ids.add(s.$id);
    if (s["meta:altId"]) ids.add(s["meta:altId"]);
    if (s.$id.startsWith(NS_PREFIX)) {
      ids.add("_" + s.$id.slice(NS_PREFIX.length));
    }
  });
  return ids;
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

        const referencedSchemaIds = new Set<string>();
        datasets.forEach((ds) => {
          if (ds.schemaRef?.id) {
            const rawId = ds.schemaRef.id;
            const found = allSchemas.find(
              (s) => s.$id === rawId || s["meta:altId"] === rawId
            );
            if (found) referencedSchemaIds.add(found.$id);
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
  }, [setGraph]);

  return { loading, error, fetchAll, loadMockData };
}
