import { useCallback } from "react";
import type { AepConnectionConfig, AepFieldGroup } from "@/lib/types";

const NS_PREFIX = "https://ns.adobe.com/";

const GLOBAL_NS_SEGMENTS = ["xdm/", "experience/", "adobe/"];

function classifyRef(ref: string): "global" | "tenant" {
  const path = ref.startsWith(NS_PREFIX)
    ? ref.slice(NS_PREFIX.length)
    : ref.startsWith("_")
    ? ref.slice(1)
    : ref;
  return GLOBAL_NS_SEGMENTS.some((seg) => path.startsWith(seg)) ? "global" : "tenant";
}

function proxyHeaders(config: AepConnectionConfig): Record<string, string> {
  return {
    "x-aep-token": config.token,
    "x-aep-org-id": config.orgId,
    "x-aep-sandbox": config.sandbox,
    "x-aep-api-key": config.apiKey,
  };
}

function dedupeFieldGroupsById(items: AepFieldGroup[]): AepFieldGroup[] {
  const map = new Map<string, AepFieldGroup>();
  for (const fg of items) map.set(fg.$id, fg);
  return Array.from(map.values());
}

async function fetchFieldGroupFromRegistry(
  registry: "tenant" | "global",
  filterValue: string,
  headers: Record<string, string>,
): Promise<AepFieldGroup | null> {
  const qs = new URLSearchParams({ property: `$id==${filterValue}`, limit: "1" });
  const url = `/api/aep/schemaregistry/${registry}/fieldgroups?${qs.toString()}`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    const fgs: AepFieldGroup[] = data.results ?? [];
    return fgs[0] ?? null;
  } catch {
    return null;
  }
}

export function useFieldGroups() {
  const fetchFieldGroupsByRefs = useCallback(
    async (refs: string[], config: AepConnectionConfig): Promise<AepFieldGroup[]> => {
      if (refs.length === 0) return [];

      const headers = proxyHeaders(config);
      const requestHeaders = { ...headers, Accept: "application/vnd.adobe.xed+json" };

      const results = await Promise.allSettled(
        refs.map(async (ref) => {
          const filterValue = ref.startsWith(NS_PREFIX) ? ref : NS_PREFIX + ref.slice(1);
          const primary = classifyRef(ref);
          const fallback = primary === "global" ? "tenant" : "global";

          const fg = await fetchFieldGroupFromRegistry(primary, filterValue, requestHeaders);
          if (fg) return fg;

          return fetchFieldGroupFromRegistry(fallback, filterValue, requestHeaders);
        })
      );

      const fetched = results
        .filter((r): r is PromiseFulfilledResult<AepFieldGroup> => r.status === "fulfilled" && r.value !== null)
        .map((r) => r.value);

      return dedupeFieldGroupsById(fetched);
    },
    []
  );

  return { fetchFieldGroupsByRefs };
}
