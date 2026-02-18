import { useCallback } from "react";
import type { AepConnectionConfig, AepFieldGroup } from "@/lib/types";

const NS_PREFIX = "https://ns.adobe.com/";

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

export function useFieldGroups() {
  // Fetches field groups by their refs collected from schema meta:extends / allOf.$ref.
  // Searches both tenant and global registries in parallel for each ref.
  const fetchFieldGroupsByRefs = useCallback(
    async (refs: string[], config: AepConnectionConfig): Promise<AepFieldGroup[]> => {
      if (refs.length === 0) return [];

      const headers = proxyHeaders(config);
      const requestHeaders = { ...headers, Accept: "application/vnd.adobe.xed+json" };

      const results = await Promise.allSettled(
        refs.map(async (ref) => {
          const filterValue = ref.startsWith(NS_PREFIX) ? ref : NS_PREFIX + ref.slice(1);
          const qs = new URLSearchParams({ property: `$id==${filterValue}`, limit: "1" });
          const tenantUrl = `/api/aep/schemaregistry/tenant/fieldgroups?${qs.toString()}`;
          const globalUrl = `/api/aep/schemaregistry/global/fieldgroups?${qs.toString()}`;

          const [tenantRes, globalRes] = await Promise.allSettled([
            fetch(tenantUrl, { headers: requestHeaders }),
            fetch(globalUrl, { headers: requestHeaders }),
          ]);

          for (const candidate of [tenantRes, globalRes]) {
            if (candidate.status !== "fulfilled" || !candidate.value.ok) continue;
            const data = await candidate.value.json();
            const fgs: AepFieldGroup[] = data.results ?? [];
            if (fgs.length > 0) return fgs[0];
          }
          return null;
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
