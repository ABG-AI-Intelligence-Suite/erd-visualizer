import { useCallback, useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { AepConnectionConfig, FilterState } from "@/lib/types";
import { transformToGraph, type TransformInput } from "@/lib/transform";
import { useDatasets } from "./use-datasets";
import { useSchemas } from "./use-schemas";
import { useFieldGroups } from "./use-field-groups";
import { useFlows } from "./use-flows";

function getSettledError(result: PromiseRejectedResult): string {
  const reason = result.reason;
  return reason instanceof Error ? reason.message : String(reason);
}

export function useAepData() {
  const { fetchDatasets } = useDatasets();
  const { fetchSchemas } = useSchemas();
  const { fetchFieldGroups } = useFieldGroups();
  const { fetchFlows } = useFlows();

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
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

        if (errors.length > 0) {
          setError(errors.join("\n\n"));
        }

        const { nodes: n, edges: e } = transformToGraph({
          datasets,
          schemas: schemaResult.schemas,
          fieldGroups,
          flows: flowResult.flows,
          connections: flowResult.connections,
          descriptors: schemaResult.descriptors,
        });

        setNodes(n);
        setEdges(e);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to fetch AEP data";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [fetchDatasets, fetchSchemas, fetchFieldGroups, fetchFlows]
  );

  const getFilteredGraph = useCallback(
    (filters: FilterState) => {
      const typeMap: Record<string, keyof FilterState> = {
        datasetNode: "datasets",
        schemaNode: "schemas",
        fieldGroupNode: "fieldGroups",
        flowNode: "flows",
      };

      const filteredNodes = nodes.filter(
        (n) => !n.type || filters[typeMap[n.type] ?? "datasets"]
      );
      const visibleIds = new Set(filteredNodes.map((n) => n.id));
      const filteredEdges = edges.filter(
        (e) => visibleIds.has(e.source) && visibleIds.has(e.target)
      );

      return { nodes: filteredNodes, edges: filteredEdges };
    },
    [nodes, edges]
  );

  const loadMockData = useCallback((input: TransformInput) => {
    const { nodes: n, edges: e } = transformToGraph(input);
    setNodes(n);
    setEdges(e);
  }, []);

  return { nodes, edges, loading, error, fetchAll, getFilteredGraph, loadMockData };
}
