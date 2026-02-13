// ─── AEP API Response Types ──────────────────────────────────────────────────

export interface AepConnectionConfig {
  token: string;
  orgId: string;
  sandbox: string;
  apiKey: string;
}

// Catalog API — Datasets
export interface AepDataset {
  id: string;
  name: string;
  description?: string;
  schemaRef?: {
    id: string;
    contentType: string;
  };
  tags?: Record<string, string[]>;
  created: number;
  updated: number;
  unifiedProfile?: {
    isEnabled: boolean;
  };
  unifiedIdentity?: {
    isEnabled: boolean;
  };
  fileDescription?: {
    format: string;
  };
}

export interface DatasetsResponse {
  [datasetId: string]: AepDataset;
}

// Schema Registry — Schemas
export interface AepSchema {
  $id: string;
  title: string;
  description?: string;
  type: string;
  "meta:class"?: string;
  "meta:extends"?: string[];
  "meta:sandboxId"?: string;
  "meta:sandboxType"?: string;
  properties?: Record<string, unknown>;
  allOf?: Array<{ $ref: string }>;
  version?: string;
}

export interface SchemasResponse {
  results: AepSchema[];
}

// Schema Registry — Field Groups
export interface AepFieldGroup {
  $id: string;
  title: string;
  description?: string;
  type: string;
  "meta:extensible"?: boolean;
  "meta:intendedToExtend"?: string[];
  properties?: Record<string, unknown>;
  definitions?: Record<string, unknown>;
}

export interface FieldGroupsResponse {
  results: AepFieldGroup[];
}

// Schema Registry — Descriptors (identity + relationship)
export interface AepDescriptor {
  "@id": string;
  "@type": string;
  "xdm:sourceSchema": string;
  "xdm:sourceVersion"?: number;
  "xdm:sourceProperty"?: string;
  "xdm:isPrimary"?: boolean;
  // Relationship descriptor fields
  "xdm:destinationSchema"?: string;
  "xdm:destinationProperty"?: string;
  "xdm:destinationVersion"?: number;
  // Identity namespace
  "xdm:namespace"?: string;
}

export interface DescriptorsResponse {
  results: AepDescriptor[];
}

// Flow Service — Flows
export interface AepFlow {
  id: string;
  name: string;
  description?: string;
  state: string;
  sourceConnectionIds?: string[];
  targetConnectionIds?: string[];
  transformations?: unknown[];
  created: number;
  updated: number;
}

export interface FlowsResponse {
  items: AepFlow[];
}

// Flow Service — Connections
export interface AepConnection {
  id: string;
  name: string;
  description?: string;
  connectionSpec?: { id: string };
  state: string;
  params?: {
    dataSetId?: string;
    datasets?: Array<{ dataSetId?: string }>;
    [key: string]: unknown;
  };
}

export interface ConnectionsResponse {
  items: AepConnection[];
}

// ─── React Flow Node Data Types ─────────────────────────────────────────────

export type EntityType = "dataset" | "schema" | "fieldGroup" | "flow";

export interface DatasetNodeData {
  [key: string]: unknown;
  entityType: "dataset";
  label: string;
  datasetId: string;
  description?: string;
  schemaRefId?: string;
  profileEnabled: boolean;
  identityField?: string;
  format?: string;
}

export interface SchemaNodeData {
  [key: string]: unknown;
  entityType: "schema";
  label: string;
  schemaId: string;
  description?: string;
  className?: string;
  fieldCount: number;
  primaryIdentityField?: string;
  extends: string[];
}

export interface FieldGroupNodeData {
  [key: string]: unknown;
  entityType: "fieldGroup";
  label: string;
  fieldGroupId: string;
  description?: string;
  fieldCount: number;
  keyFields: string[];
}

export interface FlowNodeData {
  [key: string]: unknown;
  entityType: "flow";
  label: string;
  flowId: string;
  description?: string;
  state: string;
  sourceSummary: string;
  targetSummary: string;
}

export type ErdNodeData =
  | DatasetNodeData
  | SchemaNodeData
  | FieldGroupNodeData
  | FlowNodeData;

// ─── React Flow Edge Data Types ─────────────────────────────────────────────

export type RelationshipType =
  | "dataset-schema"
  | "schema-fieldgroup"
  | "schema-schema"
  | "flow-dataset"
  | "flow-source";

export interface RelationshipEdgeData {
  [key: string]: unknown;
  relationshipType: RelationshipType;
  label: string;
  fkLabel?: string;
  pkLabel?: string;
  sourceField?: string;
  targetField?: string;
}

// ─── Filter State ───────────────────────────────────────────────────────────

export interface FilterState {
  datasets: boolean;
  schemas: boolean;
  fieldGroups: boolean;
  flows: boolean;
}
