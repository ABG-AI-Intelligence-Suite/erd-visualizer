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
          "/api/aep/schemaregistry/tenant/descriptors?limit=500",
          { headers }
        ),
      ]);

      if (!schemasRes.ok) throw new Error(`Schema API error: ${schemasRes.status}`);
      const schemasData = await schemasRes.json();
      const schemaList: AepSchema[] = schemasData.results ?? [];
      setSchemas(schemaList);

      let descriptorList: AepDescriptor[] = [];
      if (descriptorsRes.ok) {
        const descData = await descriptorsRes.json();
        descriptorList = descData.results ?? [];
        setDescriptors(descriptorList);
      }

      return { schemas: schemaList, descriptors: descriptorList };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch schemas";
      setError(msg);
      return { schemas: [], descriptors: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  return { schemas, descriptors, loading, error, fetchSchemas: fetch_ };
}
