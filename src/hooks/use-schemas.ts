import { useCallback } from "react";
import type { AepConnectionConfig, AepSchema, AepDescriptor } from "@/lib/types";
import { paginateSchemaRegistry } from "@/lib/paginate";

const NS_PREFIX = "https://ns.adobe.com/";

const GLOBAL_NS_SEGMENTS = ["xdm/", "experience/", "adobe/"];

function classifySchemaId(id: string): { primary: "global" | "tenant"; fallback: "tenant" | "global" } {
  const path = id.startsWith(NS_PREFIX)
    ? id.slice(NS_PREFIX.length)
    : id.startsWith("_")
    ? id.slice(1)
    : id;

  const isGlobal = GLOBAL_NS_SEGMENTS.some((seg) => path.startsWith(seg));
  return isGlobal
    ? { primary: "global", fallback: "tenant" }
    : { primary: "tenant", fallback: "global" };
}

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

type RegistryLookupResult =
  | { status: "found"; schema: AepSchema }
  | { status: "notFound" }
  | { status: "skip"; reason: string }
  | { status: "fatal"; httpStatus: number };

function registryErrorMessage(httpStatus: number, registry: string): string {
  switch (httpStatus) {
    case 401: return `401 Unauthorized on ${registry} registry — token may be expired`;
    case 429: return `429 Too Many Requests on ${registry} registry — rate limited`;
    case 500: return `500 Internal Server Error on ${registry} registry`;
    case 502: return `502 Bad Gateway on ${registry} registry`;
    case 503: return `503 Service Unavailable on ${registry} registry`;
    case 504: return `504 Gateway Timeout on ${registry} registry`;
    default:  return `HTTP ${httpStatus} on ${registry} registry`;
  }
}

async function fetchSchemaFromRegistry(
  registry: "tenant" | "global",
  schemaId: string,
  headers: Record<string, string>,
): Promise<RegistryLookupResult> {
  try {
    const url = `/api/aep/schemaregistry/${registry}/schemas?_resourceId=${encodeURIComponent(schemaId)}`;
    const res = await fetch(url, { headers });

    if (res.ok) {
      const data = await res.json();
      if (data?.$id) return { status: "found", schema: data as AepSchema };
      return { status: "notFound" };
    }

    // 403 treated same as 404 — wrong registry for this namespace, try the other.
    if (res.status === 404 || res.status === 403) return { status: "notFound" };

    if (res.status === 401) return { status: "fatal", httpStatus: 401 };

    return { status: "skip", reason: registryErrorMessage(res.status, registry) };
  } catch {
    return { status: "skip", reason: `Network error reaching ${registry} registry` };
  }
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

  const fetchSchemasByIds = useCallback(
    async (
      schemaIds: string[],
      config: AepConnectionConfig,
      onProgress?: (resolved: number, total: number) => void,
    ): Promise<AepSchema[]> => {
      if (schemaIds.length === 0) return [];

      const headers = proxyHeaders(config);
      const total = schemaIds.length;
      let resolved = 0;

      const results = await Promise.allSettled(
        schemaIds.map(async (id) => {
          const normalizedId = id.startsWith(NS_PREFIX) ? id : NS_PREFIX + id.slice(1);
          const { primary, fallback } = classifySchemaId(id);

          const primaryResult = await fetchSchemaFromRegistry(primary, normalizedId, headers);

          if (primaryResult.status === "found") {
            onProgress?.(++resolved, total);
            return primaryResult.schema;
          }

          if (primaryResult.status === "fatal") {
            throw new Error(`${registryErrorMessage(primaryResult.httpStatus, primary)} — check that your bearer token is current`);
          }

          if (primaryResult.status === "notFound") {
            const fallbackResult = await fetchSchemaFromRegistry(fallback, normalizedId, headers);

            if (fallbackResult.status === "found") {
              onProgress?.(++resolved, total);
              return fallbackResult.schema;
            }

            if (fallbackResult.status === "fatal") {
              throw new Error(`${registryErrorMessage(fallbackResult.httpStatus, fallback)} — check that your bearer token is current`);
            }

            if (fallbackResult.status === "notFound") {
              console.warn(`[Schemas] Not found in ${primary} or ${fallback} registry: ${id}`);
            } else {
              console.warn(`[Schemas] ${fallbackResult.reason} for: ${id}`);
            }
          } else {
            console.warn(`[Schemas] ${primaryResult.reason} for: ${id}`);
          }

          onProgress?.(++resolved, total);
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
