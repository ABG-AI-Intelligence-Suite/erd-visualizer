import { useCallback } from "react";
import type { AepConnectionConfig, AepSchema, AepDescriptor } from "@/lib/types";
import { paginateSchemaRegistry } from "@/lib/paginate";

const NS_PREFIX = "https://ns.adobe.com/";

function proxyHeaders(config: AepConnectionConfig): Record<string, string> {
  return {
    "x-aep-token": config.token,
    "x-aep-org-id": config.orgId,
    "x-aep-sandbox": config.sandbox,
    "x-aep-api-key": config.apiKey,
  };
}

function dedupeSchemasById(items: AepSchema[]): AepSchema[] {
  const map = new Map<string, AepSchema>();
  for (const schema of items) map.set(schema.$id, schema);
  return Array.from(map.values());
}

function dedupeDescriptorsById(items: AepDescriptor[]): AepDescriptor[] {
  const map = new Map<string, AepDescriptor>();
  for (const d of items) map.set(d["@id"], d);
  return Array.from(map.values());
}

export function useSchemas() {
  const fetchDescriptors = useCallback(async (config: AepConnectionConfig): Promise<AepDescriptor[]> => {
    const headers = proxyHeaders(config);
    const [tenant, global_] = await Promise.all([
      paginateSchemaRegistry<AepDescriptor>({
        url: "/api/aep/schemaregistry/tenant/descriptors?limit=300",
        headers,
      }).catch((err: Error) => {
        console.warn(`[Descriptors] Fetch failed: ${err.message}`);
        return [] as AepDescriptor[];
      }),
      paginateSchemaRegistry<AepDescriptor>({
        url: "/api/aep/schemaregistry/global/descriptors?limit=300",
        headers,
      }).catch(() => [] as AepDescriptor[]),
    ]);
    return dedupeDescriptorsById([...tenant, ...global_]);
  }, []);

  // Fetches specific schemas by their $id or meta:altId. Searches both tenant
  // and global registries in parallel for each ID, taking the first hit.
  const fetchSchemasByIds = useCallback(
    async (schemaIds: string[], config: AepConnectionConfig): Promise<AepSchema[]> => {
      if (schemaIds.length === 0) return [];

      const headers = proxyHeaders(config);
      const requestHeaders = { ...headers, Accept: "application/vnd.adobe.xed+json" };

      const results = await Promise.allSettled(
        schemaIds.map(async (id) => {
          const filterValue = id.startsWith(NS_PREFIX) ? id : NS_PREFIX + id.slice(1);
          const qs = new URLSearchParams({ property: `$id==${filterValue}`, limit: "1" });
          const tenantUrl = `/api/aep/schemaregistry/tenant/schemas?${qs.toString()}`;
          const globalUrl = `/api/aep/schemaregistry/global/schemas?${qs.toString()}`;

          const [tenantRes, globalRes] = await Promise.allSettled([
            fetch(tenantUrl, { headers: requestHeaders }),
            fetch(globalUrl, { headers: requestHeaders }),
          ]);

          for (const candidate of [tenantRes, globalRes]) {
            if (candidate.status !== "fulfilled" || !candidate.value.ok) continue;
            const data = await candidate.value.json();
            const schemas: AepSchema[] = data.results ?? [];
            if (schemas.length > 0) return schemas[0];
          }
          return null;
        })
      );

      const fetched = results
        .filter((r): r is PromiseFulfilledResult<AepSchema> => r.status === "fulfilled" && r.value !== null)
        .map((r) => r.value);

      return dedupeSchemasById(fetched);
    },
    []
  );

  return { fetchDescriptors, fetchSchemasByIds };
}
