import { useCallback, useState } from "react";
import type { AepConnectionConfig, AepDataset } from "@/lib/types";
import { paginateCatalog } from "@/lib/paginate";

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
      const list = await paginateCatalog<AepDataset>({
        url: "/api/aep/catalog/dataSets?limit=100&properties=name,description,schemaRef,tags,fileDescription",
        headers: proxyHeaders(config),
      });
      setDatasets(list);
      return list;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch datasets";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { datasets, loading, error, fetchDatasets: fetch_ };
}
