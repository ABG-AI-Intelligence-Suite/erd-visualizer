import type { Node, Edge } from "@xyflow/react";
import type {
  AepDataset,
  AepSchema,
  AepFieldGroup,
  AepFlow,
  AepConnection,
  AepDescriptor,
  ErdField,
  DatasetNodeData,
  SchemaNodeData,
  FieldGroupNodeData,
  FlowNodeData,
  IdentityNodeData,
  RelationshipEdgeData,
} from "./types";
import { extractFields } from "./extract-fields";

const COL_WIDTH = 320;
const ROW_HEIGHT = 280;

function columnPosition(col: number, row: number) {
  return { x: col * COL_WIDTH + 40, y: row * ROW_HEIGHT + 40 };
}

const NS_PREFIX = "https://ns.adobe.com/";

// Well-known AEP source connector spec IDs → display names.
// Covers the most common batch and streaming sources.
const CONNECTOR_SPEC_NAMES: Record<string, string> = {
  "cfc0fee1-7dc0-40ef-b73e-d8b134c436f5": "Salesforce",
  "51ae16c2-bdad-42fd-9fce-8d5dfddaf140": "Snowflake",
  "ecadc60c-7455-4d87-84dc-2a0e293d997b": "Amazon S3",
  "b3ba5556-48be-44b7-8b85-ff2b69b46dc5": "Azure Blob",
  "26d74102-c690-462d-b546-351613a78ba5": "Azure ADLS Gen2",
  "32e8f412-cdf7-464c-9885-78184cb113fd": "Google Cloud Storage",
  "3c9b37f8-13a6-43d8-bad3-b863b941fedd": "Azure Synapse",
  "aa8e8b21-f80f-46ce-a897-d33b4804cca0": "Google BigQuery",
  "d771e9c1-4f26-40dc-8617-ce58c4b53702": "Adobe Analytics",
  "42a8ce5d-9a6f-4d31-bef4-05f97c76de87": "Marketo",
  "784d7b26-0bca-4bef-b5ea-c8082b6e97d4": "SFTP",
  "bf9f5905-92b7-48bf-bf20-455bc6b60a4e": "Amazon Kinesis",
  "86043421-563b-46ec-8e6c-e23184711bf6": "Azure Event Hubs",
  "bc7b00d6-623a-4dfc-9fdb-f1240aeadaeb": "HTTP API",
  "c604ff05-7f1a-43c0-8e18-33bf874cb11c": "AEP Data Lake",
  "2d31dfd1-df1a-456b-948f-226e040ba102": "Salesforce Service Cloud",
  "20283d08-d010-4ef5-aea9-41c14612bcc7": "Microsoft Dynamics",
  "38ad80fe-8b06-4938-94f4-d4ee80266b07": "SAP HANA",
  "48e7a7a7-5e7a-4a37-9b3c-d3c3e72a9c7d": "Oracle",
};

function deriveConnectorName(conn: AepConnection): string {
  if (conn.connectionSpec?.id) {
    const known = CONNECTOR_SPEC_NAMES[conn.connectionSpec.id];
    if (known) return known;
  }
  // Fall back: strip common boilerplate suffixes from the connection name
  const name = conn.name ?? "";
  return (
    name
      .replace(/\s+(base|source|target)?\s*connection\b.*/i, "")
      .replace(/\s*[-–]\s*\S.*$/, "") // strip "- production", "– prod" etc.
      .trim() || name
  );
}

function buildSchemaIdLookup(schemas: AepSchema[]): Map<string, string> {
  const lookup = new Map<string, string>();

  schemas.forEach((s) => {
    lookup.set(s.$id, s.$id);
    if (s["meta:altId"]) lookup.set(s["meta:altId"], s.$id);
    if (s.$id.startsWith(NS_PREFIX)) {
      const derived = "_" + s.$id.slice(NS_PREFIX.length);
      lookup.set(derived, s.$id);
    } else if (s.$id.startsWith("_")) {
      const derived = NS_PREFIX + s.$id.slice(1);
      lookup.set(derived, s.$id);
    }
  });

  return lookup;
}

function buildFieldGroupIdLookup(fieldGroups: AepFieldGroup[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (let i = 0; i < fieldGroups.length; i++) {
    const fg = fieldGroups[i];
    lookup.set(fg.$id, fg.$id);
    if (fg.$id.startsWith(NS_PREFIX)) {
      lookup.set("_" + fg.$id.slice(NS_PREFIX.length), fg.$id);
    } else if (fg.$id.startsWith("_")) {
      lookup.set(NS_PREFIX + fg.$id.slice(1), fg.$id);
    }
  }
  return lookup;
}

function resolveSchemaId(
  ref: string,
  lookup: Map<string, string>
): string {
  return lookup.get(ref) ?? ref;
}

function buildIdentityMap(descriptors: AepDescriptor[]) {
  const pkMap = new Map<string, string>();
  descriptors.forEach((d) => {
    if (d["@type"] === "xdm:descriptorIdentity" && d["xdm:isPrimary"]) {
      pkMap.set(d["xdm:sourceSchema"], d["xdm:sourceProperty"] ?? "unknown");
    }
  });
  return pkMap;
}

function getRelationshipDescriptors(descriptors: AepDescriptor[]) {
  return descriptors.filter(
    (d) =>
      d["@type"] === "xdm:descriptorOneToOne" ||
      d["@type"] === "xdm:descriptorManyToOne"
  );
}

export function isSystemId(id: string): boolean {
  return id.startsWith("https://ns.adobe.com/xdm/") || id.startsWith("_xdm/");
}

function isProfileEnabled(
  unifiedProfile?: { isEnabled: boolean } | string[],
  tagsUnifiedProfile?: string[]
): boolean {
  const arr = Array.isArray(unifiedProfile) ? unifiedProfile : tagsUnifiedProfile;
  if (arr?.length) {
    return arr.some(
      (v) =>
        v === "enabled" ||
        v === "enabled:true" ||
        (typeof v === "string" && v.startsWith("enabled"))
    );
  }
  if (unifiedProfile && typeof unifiedProfile === "object" && !Array.isArray(unifiedProfile)) {
    return unifiedProfile.isEnabled ?? false;
  }
  return false;
}

function buildDatasetNodes(
  datasets: AepDataset[],
  pkMap: Map<string, string>,
  schemaIdLookup: Map<string, string>,
  schemaFieldsMap?: Map<string, ErdField[]>
): Node<DatasetNodeData>[] {
  return datasets.map((ds, i) => {
    const rawSchemaId = ds.schemaRef?.id;
    const schemaId = rawSchemaId
      ? resolveSchemaId(rawSchemaId, schemaIdLookup)
      : undefined;
    const fields = schemaId ? (schemaFieldsMap?.get(schemaId) ?? []) : [];
    const isSystem = schemaId ? isSystemId(schemaId) : false;
    return {
      id: `dataset-${ds.id}`,
      type: "datasetNode",
      position: columnPosition(1, i),
      data: {
        entityType: "dataset" as const,
        label: ds.name || ds.id,
        datasetId: ds.id,
        description: ds.description,
        schemaRefId: schemaId,
        profileEnabled: isProfileEnabled(ds.unifiedProfile, ds.tags?.unifiedProfile),
        identityField: schemaId ? (pkMap.get(schemaId) ?? pkMap.get(rawSchemaId!)) : undefined,
        format: ds.fileDescription?.format,
        isSystem,
        fields,
      },
    };
  });
}

function buildSchemaNodes(
  schemas: AepSchema[],
  pkMap: Map<string, string>,
  schemaFieldsMap?: Map<string, ErdField[]>
): Node<SchemaNodeData>[] {
  return schemas.map((s, i) => {
    const altId =
      s["meta:altId"] ??
      (s.$id.startsWith(NS_PREFIX) ? "_" + s.$id.slice(NS_PREFIX.length) : undefined);

    const fields = schemaFieldsMap?.get(s.$id) ?? [];
    const fieldCount = fields.length > 0
      ? fields.length
      : (s.properties ? Object.keys(s.properties).length : 0);

    return {
      id: `schema-${s.$id}`,
      type: "schemaNode",
      position: columnPosition(2, i),
      data: {
        entityType: "schema" as const,
        label: s.title || s.$id,
        schemaId: s.$id,
        altId,
        description: s.description,
        className: s["meta:class"],
        fieldCount,
        primaryIdentityField: pkMap.get(s.$id),
        extends: s["meta:extends"] ?? [],
        isSystem: isSystemId(s.$id),
        fields,
      },
    };
  });
}

function extractFieldGroupFields(fg: AepFieldGroup): ErdField[] {
  // Primary: top-level properties (present in xed-full+json responses)
  if (fg.properties) {
    const fields = extractFields(fg.properties as Record<string, unknown>);
    if (fields.length > 0) return fields;
  }

  // Fallback: properties nested inside definitions (concise xed+json format
  // stores properties in definitions with internal $ref in allOf)
  if (fg.definitions) {
    const fields: ErdField[] = [];
    for (const def of Object.values(fg.definitions)) {
      if (def && typeof def === "object" && "properties" in def) {
        fields.push(
          ...extractFields(
            (def as Record<string, unknown>).properties as Record<string, unknown>
          )
        );
      }
    }
    if (fields.length > 0) return fields;
  }

  return [];
}

function buildFieldGroupNodes(
  fieldGroups: AepFieldGroup[]
): Node<FieldGroupNodeData>[] {
  return fieldGroups.map((fg, i) => {
    const fields = extractFieldGroupFields(fg);
    const propKeys = fg.properties
      ? Object.keys(fg.properties).slice(0, 5)
      : fields.slice(0, 5).map((f) => f.name);
    return {
      id: `fieldgroup-${fg.$id}`,
      type: "fieldGroupNode",
      position: columnPosition(3, i),
      data: {
        entityType: "fieldGroup" as const,
        label: fg.title || fg.$id,
        fieldGroupId: fg.$id,
        description: fg.description,
        fieldCount: fields.length,
        keyFields: propKeys,
        isSystem: isSystemId(fg.$id),
        fields,
      },
    };
  });
}

function buildFlowNodes(
  flows: AepFlow[],
  connectionMap: Map<string, AepConnection>
): Node<FlowNodeData>[] {
  return flows.map((f, i) => {
    const sourceConns = f.sourceConnectionIds?.map((id) => connectionMap.get(id)).filter(Boolean) as AepConnection[];
    const sourceName = sourceConns.length
      ? sourceConns.map((c) => c.name).join(", ")
      : "N/A";
    const targetName =
      f.targetConnectionIds
        ?.map((id) => connectionMap.get(id)?.name ?? id)
        .join(", ") ?? "N/A";

    // Derive the connector platform name (e.g. "Snowflake") from the first source connection
    const sourceType = sourceConns.length ? deriveConnectorName(sourceConns[0]) : undefined;

    return {
      id: `flow-${f.id}`,
      type: "flowNode",
      position: columnPosition(0, i),
      data: {
        entityType: "flow" as const,
        label: f.name || f.id,
        flowId: f.id,
        description: f.description,
        state: f.state,
        sourceType,
        sourceSummary: sourceName,
        targetSummary: targetName,
        isSystem: false,
      },
    };
  });
}

function buildDatasetSchemaEdges(
  datasets: AepDataset[],
  schemaIdLookup: Map<string, string>,
  pkMap: Map<string, string>
): Edge<RelationshipEdgeData>[] {
  const edges: Edge<RelationshipEdgeData>[] = [];
  datasets.forEach((ds) => {
    if (ds.schemaRef?.id) {
      const resolvedId = resolveSchemaId(ds.schemaRef.id, schemaIdLookup);
      const pkField = pkMap.get(resolvedId) ?? pkMap.get(ds.schemaRef.id) ?? "$id";
      edges.push({
        id: `edge-ds-schema-${ds.id}`,
        source: `dataset-${ds.id}`,
        target: `schema-${resolvedId}`,
        type: "relationshipEdge",
        data: {
          relationshipType: "dataset-schema",
          label: "uses schema",
          fkLabel: `FK: schemaRef.id`,
          pkLabel: `PK: ${pkField}`,
          sourceField: "schemaRef.id",
          targetField: pkField,
        },
      });
    }
  });
  return edges;
}

function buildSchemaFieldGroupEdges(
  schemas: AepSchema[],
  fieldGroupIds: Set<string>,
  fieldGroupIdLookup: Map<string, string>
): Edge<RelationshipEdgeData>[] {
  const edges: Edge<RelationshipEdgeData>[] = [];
  schemas.forEach((s) => {
    const refs = new Set<string>(s["meta:extends"] ?? []);
    s.allOf?.forEach((entry) => {
      if (entry.$ref) refs.add(entry.$ref);
    });

    refs.forEach((refId) => {
      const resolvedId = fieldGroupIdLookup.get(refId) ?? refId;
      if (!fieldGroupIds.has(resolvedId)) return;
      edges.push({
        id: `edge-schema-fg-${s.$id}-${resolvedId}`,
        source: `schema-${s.$id}`,
        target: `fieldgroup-${resolvedId}`,
        type: "relationshipEdge",
        data: {
          relationshipType: "schema-fieldgroup",
          label: "extends",
          fkLabel: `extends`,
          pkLabel: resolvedId.split("/").pop() ?? resolvedId,
        },
      });
    });
  });
  return edges;
}

function buildSchemaRelationshipEdges(
  descriptors: AepDescriptor[],
  schemaIdLookup: Map<string, string>,
  pkMap: Map<string, string>
): Edge<RelationshipEdgeData>[] {
  return getRelationshipDescriptors(descriptors).map((d) => {
    const sourceSchemaId = resolveSchemaId(d["xdm:sourceSchema"], schemaIdLookup);
    const destinationSchemaId = resolveSchemaId(d["xdm:destinationSchema"] ?? "", schemaIdLookup);
    const fkField = d["xdm:sourceProperty"] ?? pkMap.get(sourceSchemaId) ?? "?";
    const pkField = d["xdm:destinationProperty"] ?? pkMap.get(destinationSchemaId) ?? "?";
    return {
      id: `edge-schema-rel-${d["@id"]}`,
      source: `schema-${sourceSchemaId}`,
      target: `schema-${destinationSchemaId}`,
      type: "relationshipEdge",
      data: {
        relationshipType: "schema-schema" as const,
        label: "relationship",
        fkLabel: `FK: ${fkField}`,
        pkLabel: `PK: ${pkField}`,
        sourceField: fkField,
        targetField: pkField,
      },
    };
  });
}

function buildIdentityHubsAndEdges(
  descriptors: AepDescriptor[],
  schemaIdLookup: Map<string, string>
): { nodes: Node<IdentityNodeData>[]; edges: Edge<RelationshipEdgeData>[] } {
  const namespaceToSchemas = new Map<string, Array<{ schemaId: string; property: string }>>();

  descriptors.forEach((d) => {
    if (d["@type"] !== "xdm:descriptorIdentity" || !d["xdm:isPrimary"] || !d["xdm:namespace"]) return;
    const schemaId = resolveSchemaId(d["xdm:sourceSchema"], schemaIdLookup);
    const namespace = d["xdm:namespace"];
    const entry = { schemaId, property: d["xdm:sourceProperty"] ?? "unknown" };
    const list = namespaceToSchemas.get(namespace);
    if (list) list.push(entry);
    else namespaceToSchemas.set(namespace, [entry]);
  });

  const nodes: Node<IdentityNodeData>[] = [];
  const edges: Edge<RelationshipEdgeData>[] = [];

  namespaceToSchemas.forEach((schemas, namespace) => {
    if (schemas.length < 2) return;
    const hubId = `identity-${namespace}`;
    nodes.push({
      id: hubId,
      type: "identityNode",
      position: { x: 0, y: 0 },
      data: {
        entityType: "identity" as const,
        label: namespace,
        namespace,
        schemaCount: schemas.length,
      },
    });
    schemas.forEach(({ schemaId, property }) => {
      edges.push({
        id: `edge-identity-${namespace}-${schemaId}`,
        source: hubId,
        target: `schema-${schemaId}`,
        type: "relationshipEdge",
        data: {
          relationshipType: "schema-identity" as const,
          label: "shared identity",
          fkLabel: namespace,
          pkLabel: property,
          targetField: property,
        },
      });
    });
  });

  return { nodes, edges };
}

function buildFlowDatasetEdges(
  flows: AepFlow[],
  connectionMap: Map<string, AepConnection>,
  datasetIds: Set<string>
): Edge<RelationshipEdgeData>[] {
  const edges: Edge<RelationshipEdgeData>[] = [];
  flows.forEach((f) => {
    f.targetConnectionIds?.forEach((connId) => {
      const conn = connectionMap.get(connId);
      const dsId =
        conn?.params?.dataSetId ??
        conn?.params?.datasets?.[0]?.dataSetId;
      if (dsId && datasetIds.has(dsId)) {
        edges.push({
          id: `edge-flow-ds-${f.id}-${dsId}`,
          source: `flow-${f.id}`,
          target: `dataset-${dsId}`,
          type: "relationshipEdge",
          data: {
            relationshipType: "flow-dataset",
            label: "targets",
            fkLabel: `targetConnectionId: ${connId.slice(0, 8)}...`,
            pkLabel: `dataSetId`,
          },
        });
      }
    });
  });
  return edges;
}

export interface TransformInput {
  datasets: AepDataset[];
  schemas: AepSchema[];
  fieldGroups: AepFieldGroup[];
  flows: AepFlow[];
  connections: AepConnection[];
  descriptors: AepDescriptor[];
  schemaFieldsMap?: Map<string, ErdField[]>;
}

export function transformToGraph(input: TransformInput) {
  const { datasets, schemas, fieldGroups, flows, connections, descriptors, schemaFieldsMap } = input;

  const pkMap = buildIdentityMap(descriptors);
  const connectionMap = new Map(connections.map((c) => [c.id, c]));
  const datasetIds = new Set(datasets.map((d) => d.id));
  const fieldGroupIds = new Set(fieldGroups.map((fg) => fg.$id));
  const fieldGroupIdLookup = buildFieldGroupIdLookup(fieldGroups);
  const schemaIdLookup = buildSchemaIdLookup(schemas);

  const identityHubs = buildIdentityHubsAndEdges(descriptors, schemaIdLookup);

  const nodes: Node[] = [
    ...identityHubs.nodes,
    ...buildDatasetNodes(datasets, pkMap, schemaIdLookup, schemaFieldsMap),
    ...buildSchemaNodes(schemas, pkMap, schemaFieldsMap),
    ...buildFieldGroupNodes(fieldGroups),
    ...buildFlowNodes(flows, connectionMap),
  ];

  const nodeIds = new Set(nodes.map((n) => n.id));

  const allEdges: Edge[] = [
    ...buildDatasetSchemaEdges(datasets, schemaIdLookup, pkMap),
    ...buildSchemaFieldGroupEdges(schemas, fieldGroupIds, fieldGroupIdLookup),
    ...buildSchemaRelationshipEdges(descriptors, schemaIdLookup, pkMap),
    ...identityHubs.edges,
    ...buildFlowDatasetEdges(flows, connectionMap, datasetIds),
  ];

  const edges = allEdges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  return { nodes, edges };
}
