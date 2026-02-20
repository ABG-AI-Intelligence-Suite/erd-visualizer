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
  id: string,
  headers: Record<string, string>,
): Promise<AepFieldGroup | null> {
  // Use _resourceId for a direct fetch — same pattern as schema fetching,
  // more reliable than the property=$id== list filter.
  // _accept=full resolves internal $ref so properties appear at the top level.
  const url = `/api/aep/schemaregistry/${registry}/fieldgroups?_resourceId=${encodeURIComponent(id)}&_accept=full`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.$id) return data as AepFieldGroup;
    return null;
  } catch {
    return null;
  }
}

export function useFieldGroups() {
  const fetchFieldGroupsByRefs = useCallback(
    async (refs: string[], config: AepConnectionConfig): Promise<AepFieldGroup[]> => {
      if (refs.length === 0) return [];

      const headers = proxyHeaders(config);

      const results = await Promise.allSettled(
        refs.map(async (ref) => {
          const filterValue = ref.startsWith(NS_PREFIX) ? ref : NS_PREFIX + ref.slice(1);
          const primary = classifyRef(ref);
          const fallback = primary === "global" ? "tenant" : "global";

          const fg = await fetchFieldGroupFromRegistry(primary, filterValue, headers);
          if (fg) return fg;

          return fetchFieldGroupFromRegistry(fallback, filterValue, headers);
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
