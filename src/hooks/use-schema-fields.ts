import { useCallback } from "react";
import type { AepConnectionConfig, AepDescriptor, ErdField } from "@/lib/types";
import { extractSchemaFields, buildDescriptorInfo } from "@/lib/extract-fields";

function proxyHeaders(config: AepConnectionConfig): Record<string, string> {
  return {
    "x-aep-token": config.token,
    "x-aep-org-id": config.orgId,
    "x-aep-sandbox": config.sandbox,
    "x-aep-api-key": config.apiKey,
  };
}

export function useSchemaFields() {
  const fetchSchemaFields = useCallback(
    async (
      schemaIds: string[],
      config: AepConnectionConfig,
      descriptors: AepDescriptor[]
    ): Promise<Map<string, ErdField[]>> => {
      const fieldsMap = new Map<string, ErdField[]>();
      if (schemaIds.length === 0) return fieldsMap;

      const headers = proxyHeaders(config);

      for (let i = 0; i < schemaIds.length; i += 5) {
        const batch = schemaIds.slice(i, i + 5);
        const results = await Promise.allSettled(
          batch.map(async (schemaId) => {
            const qs = new URLSearchParams({
              _resourceId: schemaId,
              _accept: "full",
            });
            const url = `/api/aep/schemaregistry/tenant/schemas?${qs.toString()}`;
            const res = await fetch(url, { headers });
            if (!res.ok) {
              return { schemaId, fields: [] as ErdField[] };
            }
            const fullSchema = (await res.json()) as Record<string, unknown>;
            const descriptorInfo = buildDescriptorInfo(schemaId, descriptors);
            const fields = extractSchemaFields(fullSchema, descriptorInfo);
            return { schemaId, fields };
          })
        );

        for (const result of results) {
          if (result.status === "fulfilled" && result.value.fields.length > 0) {
            fieldsMap.set(result.value.schemaId, result.value.fields);
          }
        }
      }

      return fieldsMap;
    },
    []
  );

  return { fetchSchemaFields };
}
