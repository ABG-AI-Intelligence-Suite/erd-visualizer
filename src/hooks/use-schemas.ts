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

function dedupeSchemasById(items: AepSchema[]): AepSchema[] {
  const map = new Map<string, AepSchema>();
  for (let i = 0; i < items.length; i++) {
    const schema = items[i];
    map.set(schema.$id, schema);
  }
  return Array.from(map.values());
}

function dedupeDescriptorsById(items: AepDescriptor[]): AepDescriptor[] {
  const map = new Map<string, AepDescriptor>();
  for (let i = 0; i < items.length; i++) {
    const descriptor = items[i];
    map.set(descriptor["@id"], descriptor);
  }
  return Array.from(map.values());
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

      const [
        tenantSchemas,
        globalSchemas,
        tenantDescriptors,
        globalDescriptors,
      ] = await Promise.all([
        paginateSchemaRegistry<AepSchema>({
          url: "/api/aep/schemaregistry/tenant/schemas?limit=200",
          headers,
        }),
        paginateSchemaRegistry<AepSchema>({
          url: "/api/aep/schemaregistry/global/schemas?limit=200",
          headers,
        }).catch(() => [] as AepSchema[]),
        paginateSchemaRegistry<AepDescriptor>({
          url: "/api/aep/schemaregistry/tenant/descriptors?limit=300",
          headers,
        }).catch((err) => {
          console.warn(`[Descriptors] Fetch failed: ${err.message}`);
          return [] as AepDescriptor[];
        }),
        paginateSchemaRegistry<AepDescriptor>({
          url: "/api/aep/schemaregistry/global/descriptors?limit=300",
          headers,
        }).catch(() => [] as AepDescriptor[]),
      ]);

      const schemaList = dedupeSchemasById([...tenantSchemas, ...globalSchemas]);
      const descriptorList = dedupeDescriptorsById([
        ...tenantDescriptors,
        ...globalDescriptors,
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
            const tenantUrl = `/api/aep/schemaregistry/tenant/schemas?${qs.toString()}`;
            const globalUrl = `/api/aep/schemaregistry/global/schemas?${qs.toString()}`;
            const requestHeaders = {
              ...headers,
              Accept: "application/vnd.adobe.xed+json",
            };
            const candidateResponses = await Promise.allSettled([
              fetch(tenantUrl, { headers: requestHeaders }),
              fetch(globalUrl, { headers: requestHeaders }),
            ]);

            for (let j = 0; j < candidateResponses.length; j++) {
              const candidate = candidateResponses[j];
              if (candidate.status !== "fulfilled" || !candidate.value.ok) continue;
              const data = await candidate.value.json();
              const results: AepSchema[] = data.results ?? [];
              if (results.length > 0) return results[0];
            }
            return null;
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
