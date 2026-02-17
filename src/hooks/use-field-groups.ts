import { useCallback, useState } from "react";
import type { AepConnectionConfig, AepFieldGroup } from "@/lib/types";

function proxyHeaders(config: AepConnectionConfig): Record<string, string> {
  return {
    "x-aep-token": config.token,
    "x-aep-org-id": config.orgId,
    "x-aep-sandbox": config.sandbox,
    "x-aep-api-key": config.apiKey,
  };
}

export function useFieldGroups() {
  const [fieldGroups, setFieldGroups] = useState<AepFieldGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async (config: AepConnectionConfig) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "/api/aep/schemaregistry/tenant/fieldgroups?orderby=title&limit=200",
        { headers: proxyHeaders(config) }
      );
      const data = await res.json();
      if (!res.ok) {
        console.error(`[FieldGroups] API error ${res.status}:`, JSON.stringify(data, null, 2));
        throw new Error(
          `Field Groups API error ${res.status}: ${data?.detail?.title || data?.detail?.detail || data?.error || res.statusText} | URL: ${data?.url || "unknown"}`
        );
      }
      const list: AepFieldGroup[] = data.results ?? [];
      setFieldGroups(list);
      return list;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch field groups";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fieldGroups, loading, error, fetchFieldGroups: fetch_ };
}
