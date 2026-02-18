import { useCallback, useState } from "react";
import type { AepConnectionConfig, AepSchema, AepDescriptor } from "@/lib/types";
import { paginateSchemaRegistry } from "@/lib/paginate";

function proxyHeaders(config: AepConnectionConfig): Record<string, string> {
  return {
    "x-aep-token": config.token,
    "x-aep-org-id": config.orgId,
    "x-aep-sandbox": config.sandbox,
    "x-aep-api-key": config.apiKey,
  };
}

const NS_PREFIX = "https://ns.adobe.com/";

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

      const [schemaList, descriptorList] = await Promise.all([
        paginateSchemaRegistry<AepSchema>({
          url: "/api/aep/schemaregistry/tenant/schemas?limit=200",
          headers,
        }),
        paginateSchemaRegistry<AepDescriptor>({
          url: "/api/aep/schemaregistry/tenant/descriptors?limit=300",
          headers,
        }).catch((err) => {
          console.warn(`[Descriptors] Fetch failed: ${err.message}`);
          return [] as AepDescriptor[];
        }),
      ]);

      setSchemas(schemaList);
      setDescriptors(descriptorList);

      return { schemas: schemaList, descriptors: descriptorList };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch schemas";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMissing = useCallback(
    async (
      missingRefs: string[],
      config: AepConnectionConfig
    ): Promise<AepSchema[]> => {
      if (missingRefs.length === 0) return [];

      const headers = proxyHeaders(config);
      const fetched: AepSchema[] = [];

      for (let i = 0; i < missingRefs.length; i += 5) {
        const batch = missingRefs.slice(i, i + 5);
        const results = await Promise.allSettled(
          batch.map(async (ref) => {
            const filterValue = ref.startsWith(NS_PREFIX)
              ? ref
              : NS_PREFIX + ref.slice(1); // convert altId → $id URI
            const qs = new URLSearchParams({
              "property": `$id==${filterValue}`,
              "limit": "1",
            });
            const url = `/api/aep/schemaregistry/tenant/schemas?${qs.toString()}`;
            const res = await fetch(url, {
              headers: {
                ...headers,
                Accept: "application/vnd.adobe.xed+json",
              },
            });
            if (!res.ok) {
              return null;
            }
            const data = await res.json();
            const results: AepSchema[] = data.results ?? [];
            return results.length > 0 ? results[0] : null;
          })
        );

        results.forEach((r) => {
          if (r.status === "fulfilled" && r.value) {
            fetched.push(r.value);
          }
        });
      }

      return fetched;
    },
    []
  );

  return { schemas, descriptors, loading, error, fetchSchemas: fetch_, fetchMissingSchemas: fetchMissing };
}
