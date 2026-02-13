import type { Node, Edge } from "@xyflow/react";
import type {
  AepDataset,
  AepSchema,
  AepFieldGroup,
  AepFlow,
  AepConnection,
  AepDescriptor,
  DatasetNodeData,
  SchemaNodeData,
  FieldGroupNodeData,
  FlowNodeData,
  RelationshipEdgeData,
} from "./types";

// ─── Layout helpers ─────────────────────────────────────────────────────────

const COL_WIDTH = 320;
const ROW_HEIGHT = 180;

function columnPosition(col: number, row: number) {
  return { x: col * COL_WIDTH + 40, y: row * ROW_HEIGHT + 40 };
}

// ─── Identity / PK resolution ───────────────────────────────────────────────

function buildIdentityMap(descriptors: AepDescriptor[]) {
  const pkMap = new Map<string, string>(); // schemaId → primary identity field
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

// ─── Node builders ──────────────────────────────────────────────────────────

function buildDatasetNodes(
  datasets: AepDataset[],
  pkMap: Map<string, string>
): Node<DatasetNodeData>[] {
  return datasets.map((ds, i) => {
    const schemaId = ds.schemaRef?.id;
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
        profileEnabled: ds.unifiedProfile?.isEnabled ?? false,
        identityField: schemaId ? pkMap.get(schemaId) : undefined,
        format: ds.fileDescription?.format,
      },
    };
  });
}

function buildSchemaNodes(
  schemas: AepSchema[],
  pkMap: Map<string, string>
): Node<SchemaNodeData>[] {
  return schemas.map((s, i) => ({
    id: `schema-${s.$id}`,
    type: "schemaNode",
    position: columnPosition(2, i),
    data: {
      entityType: "schema" as const,
      label: s.title || s.$id,
      schemaId: s.$id,
      description: s.description,
      className: s["meta:class"],
      fieldCount: s.properties ? Object.keys(s.properties).length : 0,
      primaryIdentityField: pkMap.get(s.$id),
      extends: s["meta:extends"] ?? [],
    },
  }));
}

function buildFieldGroupNodes(
  fieldGroups: AepFieldGroup[]
): Node<FieldGroupNodeData>[] {
  return fieldGroups.map((fg, i) => {
    const fields = fg.properties ? Object.keys(fg.properties) : [];
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
        keyFields: fields.slice(0, 5),
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
      },
    };
  });
}

// ─── Edge builders ──────────────────────────────────────────────────────────

function buildDatasetSchemaEdges(datasets: AepDataset[]): Edge<RelationshipEdgeData>[] {
  const edges: Edge<RelationshipEdgeData>[] = [];
  datasets.forEach((ds) => {
    if (ds.schemaRef?.id) {
      edges.push({
        id: `edge-ds-schema-${ds.id}`,
        source: `dataset-${ds.id}`,
        target: `schema-${ds.schemaRef.id}`,
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

function buildSchemaFieldGroupEdges(schemas: AepSchema[]): Edge<RelationshipEdgeData>[] {
  const edges: Edge<RelationshipEdgeData>[] = [];
  schemas.forEach((s) => {
    const extends_ = s["meta:extends"] ?? [];
    extends_.forEach((fgId) => {
      edges.push({
        id: `edge-schema-fg-${s.$id}-${fgId}`,
        source: `schema-${s.$id}`,
        target: `fieldgroup-${fgId}`,
        type: "relationshipEdge",
        data: {
          relationshipType: "schema-fieldgroup",
          label: "extends",
          fkLabel: `extends`,
          pkLabel: fgId.split("/").pop() ?? fgId,
        },
      });
    });
  });
  return edges;
}

function buildSchemaRelationshipEdges(
  descriptors: AepDescriptor[]
): Edge<RelationshipEdgeData>[] {
  return getRelationshipDescriptors(descriptors).map((d) => ({
    id: `edge-schema-rel-${d["@id"]}`,
    source: `schema-${d["xdm:sourceSchema"]}`,
    target: `schema-${d["xdm:destinationSchema"]}`,
    type: "relationshipEdge",
    data: {
      relationshipType: "schema-schema" as const,
      label: "relationship",
      fkLabel: `FK: ${d["xdm:sourceProperty"] ?? "?"}`,
      pkLabel: `PK: ${d["xdm:destinationProperty"] ?? "?"}`,
      sourceField: d["xdm:sourceProperty"],
      targetField: d["xdm:destinationProperty"],
    },
  }));
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

// ─── Main transform ─────────────────────────────────────────────────────────

export interface TransformInput {
  datasets: AepDataset[];
  schemas: AepSchema[];
  fieldGroups: AepFieldGroup[];
  flows: AepFlow[];
  connections: AepConnection[];
  descriptors: AepDescriptor[];
}

export function transformToGraph(input: TransformInput) {
  const { datasets, schemas, fieldGroups, flows, connections, descriptors } = input;

  const pkMap = buildIdentityMap(descriptors);
  const connectionMap = new Map(connections.map((c) => [c.id, c]));
  const datasetIds = new Set(datasets.map((d) => d.id));

  const nodes: Node[] = [
    ...buildDatasetNodes(datasets, pkMap),
    ...buildSchemaNodes(schemas, pkMap),
    ...buildFieldGroupNodes(fieldGroups),
    ...buildFlowNodes(flows, connectionMap),
  ];

  const edges: Edge[] = [
    ...buildDatasetSchemaEdges(datasets),
    ...buildSchemaFieldGroupEdges(schemas),
    ...buildSchemaRelationshipEdges(descriptors),
    ...buildFlowDatasetEdges(flows, connectionMap, datasetIds),
  ];

  return { nodes, edges };
}
