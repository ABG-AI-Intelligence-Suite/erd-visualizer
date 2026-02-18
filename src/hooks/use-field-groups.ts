import { useCallback, useState } from "react";
import type { AepConnectionConfig, AepFieldGroup } from "@/lib/types";
import { paginateSchemaRegistry } from "@/lib/paginate";

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
  for (let i = 0; i < items.length; i++) {
    const fieldGroup = items[i];
    map.set(fieldGroup.$id, fieldGroup);
  }
  return Array.from(map.values());
}

export function useFieldGroups() {
  const [fieldGroups, setFieldGroups] = useState<AepFieldGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async (config: AepConnectionConfig) => {
    setLoading(true);
    setError(null);
    try {
      const headers = proxyHeaders(config);

      const [tenantList, globalList] = await Promise.all([
        paginateSchemaRegistry<AepFieldGroup>({
        url: "/api/aep/schemaregistry/tenant/fieldgroups?orderby=title&limit=200",
        headers,
        }),
        paginateSchemaRegistry<AepFieldGroup>({
          url: "/api/aep/schemaregistry/global/fieldgroups?orderby=title&limit=200",
          headers,
        }).catch(() => [] as AepFieldGroup[]),
      ]);

      const list = dedupeFieldGroupsById([...tenantList, ...globalList]);

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
