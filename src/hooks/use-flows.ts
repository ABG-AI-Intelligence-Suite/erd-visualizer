import { useCallback, useState } from "react";
import type { AepConnectionConfig, AepFlow, AepConnection } from "@/lib/types";
import { paginateFlowService } from "@/lib/paginate";

function proxyHeaders(config: AepConnectionConfig): Record<string, string> {
  return {
    "x-aep-token": config.token,
    "x-aep-org-id": config.orgId,
    "x-aep-sandbox": config.sandbox,
    "x-aep-api-key": config.apiKey,
  };
}

export function useFlows() {
  const [flows, setFlows] = useState<AepFlow[]>([]);
  const [connections, setConnections] = useState<AepConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async (config: AepConnectionConfig) => {
    setLoading(true);
    setError(null);
    try {
      const headers = proxyHeaders(config);

      const [flowList, connectionList, targetConnectionList] = await Promise.all([
        paginateFlowService<AepFlow>({
          url: "/api/aep/flowservice/flows?limit=200&property=state%3D%3Denabled",
          headers,
        }),
        paginateFlowService<AepConnection>({
          url: "/api/aep/flowservice/connections?limit=200",
          headers,
        }).catch(() => [] as AepConnection[]),
        paginateFlowService<AepConnection>({
          url: "/api/aep/flowservice/targetConnections?limit=200",
          headers,
        }).catch(() => [] as AepConnection[]),
      ]);

      const mergedConnections = new Map(connectionList.map((c) => [c.id, c]));
      targetConnectionList.forEach((tc) => mergedConnections.set(tc.id, tc));
      const allConnections = Array.from(mergedConnections.values());

      setFlows(flowList);
      setConnections(allConnections);

      return { flows: flowList, connections: allConnections };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch flows";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMissingConnections = useCallback(
    async (
      connectionIds: string[],
      config: AepConnectionConfig
    ): Promise<AepConnection[]> => {
      if (connectionIds.length === 0) return [];

      const headers = proxyHeaders(config);
      const results = await Promise.allSettled(
        connectionIds.map(async (connId) => {
          const res = await fetch(`/api/aep/flowservice/targetConnections/${connId}`, { headers });
          if (!res.ok) return null;
          return (await res.json()) as AepConnection;
        })
      );

      return results
        .filter((r): r is PromiseFulfilledResult<AepConnection> => r.status === "fulfilled" && r.value !== null)
        .map((r) => r.value);
    },
    []
  );

  return {
    flows,
    connections,
    loading,
    error,
    fetchFlows: fetch_,
    fetchMissingConnections,
  };
}
