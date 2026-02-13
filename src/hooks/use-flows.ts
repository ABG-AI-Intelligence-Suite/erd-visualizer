import { useCallback, useState } from "react";
import type { AepConnectionConfig, AepFlow, AepConnection } from "@/lib/types";

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

      const [flowsRes, connectionsRes] = await Promise.all([
        fetch("/api/aep/flowservice/flows?limit=200", { headers }),
        fetch("/api/aep/flowservice/connections?limit=200", { headers }),
      ]);

      if (!flowsRes.ok) throw new Error(`Flows API error: ${flowsRes.status}`);
      const flowsData = await flowsRes.json();
      const flowList: AepFlow[] = flowsData.items ?? [];
      setFlows(flowList);

      let connectionList: AepConnection[] = [];
      if (connectionsRes.ok) {
        const connData = await connectionsRes.json();
        connectionList = connData.items ?? [];
        setConnections(connectionList);
      }

      return { flows: flowList, connections: connectionList };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch flows";
      setError(msg);
      return { flows: [], connections: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  return { flows, connections, loading, error, fetchFlows: fetch_ };
}
