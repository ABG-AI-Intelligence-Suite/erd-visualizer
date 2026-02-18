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

function buildFieldGroupNodes(
  fieldGroups: AepFieldGroup[]
): Node<FieldGroupNodeData>[] {
  return fieldGroups.map((fg, i) => {
    const propKeys = fg.properties ? Object.keys(fg.properties) : [];
    const fields: ErdField[] = fg.properties
      ? extractFields(fg.properties as Record<string, unknown>)
      : [];
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
        keyFields: propKeys.slice(0, 5),
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
    const sourceName =
      f.sourceConnectionIds
        ?.map((id) => connectionMap.get(id)?.name ?? id)
        .join(", ") ?? "N/A";
    const targetName =
      f.targetConnectionIds
        ?.map((id) => connectionMap.get(id)?.name ?? id)
        .join(", ") ?? "N/A";

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
        sourceSummary: sourceName,
        targetSummary: targetName,
        isSystem: false,
      },
    };
  });
}

function buildDatasetSchemaEdges(
  datasets: AepDataset[],
  schemaIdLookup: Map<string, string>
): Edge<RelationshipEdgeData>[] {
  const edges: Edge<RelationshipEdgeData>[] = [];
  datasets.forEach((ds) => {
    if (ds.schemaRef?.id) {
      const resolvedId = resolveSchemaId(ds.schemaRef.id, schemaIdLookup);
      edges.push({
        id: `edge-ds-schema-${ds.id}`,
        source: `dataset-${ds.id}`,
        target: `schema-${resolvedId}`,
        type: "relationshipEdge",
        data: {
          relationshipType: "dataset-schema",
          label: "uses schema",
          fkLabel: `FK: schemaRef.id`,
          pkLabel: `PK: $id`,
          sourceField: "schemaRef.id",
          targetField: "$id",
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
    // Collect candidate refs from both meta:extends and allOf.$ref so that
    // schemas work regardless of which the registry populates in a list response.
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
  schemaIdLookup: Map<string, string>
): Edge<RelationshipEdgeData>[] {
  return getRelationshipDescriptors(descriptors).map((d) => {
    const sourceSchemaId = resolveSchemaId(d["xdm:sourceSchema"], schemaIdLookup);
    const destinationSchemaId = resolveSchemaId(d["xdm:destinationSchema"] ?? "", schemaIdLookup);
    return {
      id: `edge-schema-rel-${d["@id"]}`,
      source: `schema-${sourceSchemaId}`,
      target: `schema-${destinationSchemaId}`,
      type: "relationshipEdge",
      data: {
        relationshipType: "schema-schema" as const,
        label: "relationship",
        fkLabel: `FK: ${d["xdm:sourceProperty"] ?? "?"}`,
        pkLabel: `PK: ${d["xdm:destinationProperty"] ?? "?"}`,
        sourceField: d["xdm:sourceProperty"],
        targetField: d["xdm:destinationProperty"],
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
    ...buildDatasetSchemaEdges(datasets, schemaIdLookup),
    ...buildSchemaFieldGroupEdges(schemas, fieldGroupIds, fieldGroupIdLookup),
    ...buildSchemaRelationshipEdges(descriptors, schemaIdLookup),
    ...identityHubs.edges,
    ...buildFlowDatasetEdges(flows, connectionMap, datasetIds),
  ];

  const edges = allEdges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  return { nodes, edges };
}
