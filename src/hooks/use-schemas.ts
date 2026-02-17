import { useCallback, useState } from "react";
import type { AepConnectionConfig, AepSchema, AepDescriptor } from "@/lib/types";

function proxyHeaders(config: AepConnectionConfig): Record<string, string> {
  return {
    "x-aep-token": config.token,
    "x-aep-org-id": config.orgId,
    "x-aep-sandbox": config.sandbox,
    "x-aep-api-key": config.apiKey,
  };
}

export function useSchemas() {
  const [schemas, setSchemas] = useState<AepSchema[]>([]);
  const [descriptors, setDescriptors] = useState<AepDescriptor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async (config: AepConnectionConfig) => {
    setLoading(true);
    setError(null);
    try {
      const headers = proxyHeaders(config);

      const [schemasRes, descriptorsRes] = await Promise.all([
        fetch(
          "/api/aep/schemaregistry/tenant/schemas?orderby=title&limit=200",
          { headers }
        ),
        fetch(
          "/api/aep/schemaregistry/tenant/descriptors?limit=300",
          { headers }
        ),
      ]);

      const schemasData = await schemasRes.json();
      if (!schemasRes.ok) {
        console.error(`[Schemas] API error ${schemasRes.status}:`, JSON.stringify(schemasData, null, 2));
        throw new Error(
          `Schema API error ${schemasRes.status}: ${schemasData?.detail?.title || schemasData?.detail?.detail || schemasData?.error || schemasRes.statusText} | URL: ${schemasData?.url || "unknown"}`
        );
      }
      const schemaList: AepSchema[] = schemasData.results ?? [];
      setSchemas(schemaList);

      let descriptorList: AepDescriptor[] = [];
      if (descriptorsRes.ok) {
        const descData = await descriptorsRes.json();
        descriptorList = descData.results ?? [];
        setDescriptors(descriptorList);
      } else {
        const descErr = await descriptorsRes.json();
        console.warn(`[Descriptors] API error ${descriptorsRes.status}:`, JSON.stringify(descErr, null, 2));
      }

      return { schemas: schemaList, descriptors: descriptorList };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch schemas";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { schemas, descriptors, loading, error, fetchSchemas: fetch_ };
}
