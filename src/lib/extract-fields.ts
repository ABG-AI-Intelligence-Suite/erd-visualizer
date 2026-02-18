import type { ErdField, AepDescriptor } from "./types";

const SKIP_PREFIXES = ["repo:", "meta:", "xdm:"];
const SKIP_KEYS = new Set([
  "@type",
  "@id",
  "@context",
  "_id",
  "$id",
  "$schema",
  "version",
  "imsOrg",
]);

function shouldSkip(key: string): boolean {
  if (SKIP_KEYS.has(key)) return true;
  return SKIP_PREFIXES.some((p) => key.startsWith(p));
}

interface DescriptorInfo {
  pkFields: Set<string>;
  fkFields: Map<string, string>;
}

export function buildDescriptorInfo(
  schemaId: string,
  descriptors: AepDescriptor[]
): DescriptorInfo {
  const pkFields = new Set<string>();
  const fkFields = new Map<string, string>();

  for (const d of descriptors) {
    if (d["xdm:sourceSchema"] !== schemaId) continue;

    if (d["@type"] === "xdm:descriptorIdentity" && d["xdm:isPrimary"] && d["xdm:sourceProperty"]) {
      pkFields.add(d["xdm:sourceProperty"]);
    }

    if (
      (d["@type"] === "xdm:descriptorOneToOne" || d["@type"] === "xdm:descriptorManyToOne") &&
      d["xdm:sourceProperty"] &&
      d["xdm:destinationSchema"]
    ) {
      fkFields.set(d["xdm:sourceProperty"], d["xdm:destinationSchema"]);
    }
  }

  return { pkFields, fkFields };
}

export function extractFields(
  properties: Record<string, unknown>,
  descriptorInfo?: DescriptorInfo,
  prefix = "",
  maxDepth = 3
): ErdField[] {
  if (maxDepth <= 0) return [];

  const fields: ErdField[] = [];

  for (const [key, value] of Object.entries(properties)) {
    if (shouldSkip(key)) continue;

    const path = prefix ? `${prefix}.${key}` : key;
    const prop = value as Record<string, unknown> | null;
    if (!prop || typeof prop !== "object") continue;

    const xdmType = (prop.type as string) ?? (prop["meta:xdmType"] as string) ?? "unknown";
    const fieldPath = `/${path.replace(/\./g, "/")}`;

    const isPrimaryKey = descriptorInfo?.pkFields.has(fieldPath) ?? false;
    const fkTarget = descriptorInfo?.fkFields.get(fieldPath);

    fields.push({
      path,
      name: key,
      type: xdmType,
      isPrimaryKey,
      isForeignKey: !!fkTarget,
      fkTarget,
    });

    if (xdmType === "object" && prop.properties && typeof prop.properties === "object") {
      fields.push(
        ...extractFields(
          prop.properties as Record<string, unknown>,
          descriptorInfo,
          path,
          maxDepth - 1
        )
      );
    }
  }

  return fields;
}

export function extractSchemaFields(
  schema: Record<string, unknown>,
  descriptorInfo?: DescriptorInfo
): ErdField[] {
  const allFields: ErdField[] = [];
  const seenPaths = new Set<string>();

  function addFields(props: Record<string, unknown>) {
    const fields = extractFields(props, descriptorInfo);
    for (const f of fields) {
      if (!seenPaths.has(f.path)) {
        seenPaths.add(f.path);
        allFields.push(f);
      }
    }
  }

  if (schema.properties && typeof schema.properties === "object") {
    addFields(schema.properties as Record<string, unknown>);
  }

  if (Array.isArray(schema.allOf)) {
    for (const entry of schema.allOf) {
      if (entry && typeof entry === "object" && "properties" in entry) {
        addFields((entry as Record<string, unknown>).properties as Record<string, unknown>);
      }
    }
  }

  return allFields;
}
