export interface AepConnectionConfig {
  token: string;
  orgId: string;
  sandbox: string;
  apiKey: string;
}

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
  unifiedProfile?: { isEnabled: boolean } | string[];
  unifiedIdentity?: { isEnabled: boolean } | string[];
  fileDescription?: {
    format: string;
  };
}

export interface AepSchema {
  $id: string;
  "meta:altId"?: string;
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

export interface AepDescriptor {
  "@id": string;
  "@type": string;
  "xdm:sourceSchema": string;
  "xdm:sourceVersion"?: number;
  "xdm:sourceProperty"?: string;
  "xdm:isPrimary"?: boolean;
  "xdm:destinationSchema"?: string;
  "xdm:destinationProperty"?: string;
  "xdm:destinationVersion"?: number;
  "xdm:namespace"?: string;
}

export interface AepFlow {
  id: string;
  name: string;
  description?: string;
  state: string;
  sourceConnectionIds?: string[];
  targetConnectionIds?: string[];
  targetConnections?: Array<{
    id: string;
    connectionSpec?: { id: string };
    params?: {
      dataSetId?: string;
      datasets?: Array<{ dataSetId?: string }>;
      [key: string]: unknown;
    };
  }>;
  transformations?: unknown[];
  created: number;
  updated: number;
}

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

export interface DatasetsResponse {
  [datasetId: string]: AepDataset;
}

export interface SchemasResponse {
  results: AepSchema[];
}

export interface FieldGroupsResponse {
  results: AepFieldGroup[];
}

export interface DescriptorsResponse {
  results: AepDescriptor[];
}

export interface FlowsResponse {
  items: AepFlow[];
}

export interface ConnectionsResponse {
  items: AepConnection[];
}

export type EntityType = "dataset" | "schema" | "fieldGroup" | "flow";

export interface ErdField {
  path: string;
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  fkTarget?: string;
}

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
  isSystem: boolean;
  fields: ErdField[];
}

export interface SchemaNodeData {
  [key: string]: unknown;
  entityType: "schema";
  label: string;
  schemaId: string;
  altId?: string;
  description?: string;
  className?: string;
  fieldCount: number;
  primaryIdentityField?: string;
  extends: string[];
  isSystem: boolean;
  fields: ErdField[];
}

export interface FieldGroupNodeData {
  [key: string]: unknown;
  entityType: "fieldGroup";
  label: string;
  fieldGroupId: string;
  description?: string;
  fieldCount: number;
  keyFields: string[];
  isSystem: boolean;
  fields: ErdField[];
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
  isSystem: boolean;
}

export type ErdNodeData =
  | DatasetNodeData
  | SchemaNodeData
  | FieldGroupNodeData
  | FlowNodeData;

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

export type EntityFilterKey = "datasets" | "schemas" | "fieldGroups" | "flows";
export type ViewMode = "full" | "schema";

export interface FilterState {
  datasets: boolean;
  schemas: boolean;
  fieldGroups: boolean;
  flows: boolean;
  profileOnly: boolean;
  showSystem: boolean;
  showCustom: boolean;
  connectedFlowsOnly: boolean;
}
