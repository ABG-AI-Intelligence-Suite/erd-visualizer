import { useCallback, useState } from "react";
import type { AepConnectionConfig, AepDataset } from "@/lib/types";

function proxyHeaders(config: AepConnectionConfig): Record<string, string> {
  return {
    "x-aep-token": config.token,
    "x-aep-org-id": config.orgId,
    "x-aep-sandbox": config.sandbox,
    "x-aep-api-key": config.apiKey,
  };
}

export function useDatasets() {
  const [datasets, setDatasets] = useState<AepDataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async (config: AepConnectionConfig) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "/api/aep/catalog/dataSets?limit=200&properties=name,description,schemaRef,tags,unifiedProfile,unifiedIdentity,fileDescription",
        { headers: proxyHeaders(config) }
      );
      if (!res.ok) throw new Error(`Catalog API error: ${res.status}`);
      const data = await res.json();
      // Catalog returns { id: dataset, ... } — flatten to array
      const list: AepDataset[] = Object.entries(data)
        .filter(([key]) => !key.startsWith("_"))
        .map(([id, ds]) => ({ ...(ds as AepDataset), id }));
      setDatasets(list);
      return list;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch datasets";
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { datasets, loading, error, fetchDatasets: fetch_ };
}
