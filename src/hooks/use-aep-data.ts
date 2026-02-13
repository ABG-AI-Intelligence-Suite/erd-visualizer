import { useCallback, useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { AepConnectionConfig, FilterState } from "@/lib/types";
import { transformToGraph, type TransformInput } from "@/lib/transform";
import { useDatasets } from "./use-datasets";
import { useSchemas } from "./use-schemas";
import { useFieldGroups } from "./use-field-groups";
import { useFlows } from "./use-flows";

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
        const [datasets, schemaResult, fieldGroups, flowResult] =
          await Promise.all([
            fetchDatasets(config),
            fetchSchemas(config),
            fetchFieldGroups(config),
            fetchFlows(config),
          ]);

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
