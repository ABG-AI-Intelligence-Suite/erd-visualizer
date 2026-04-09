/**
 * Excel Import Module — Future State Schema Import
 *
 * ─── INPUT SHAPE (Excel file) ───────────────────────────────────────────────
 *   Each worksheet can contain ONE or MULTIPLE schemas.
 *   Schema identity is determined by the "Schema name" column value (NOT the
 *   sheet name). Rows with the same "Schema name" belong to the same schema.
 *   The sheet name is not used as a schema identifier.
 *
 *   Row 0: column headers (matched by exact string, case-sensitive).
 *   Rows 1+: one XDM field per row.
 *
 *   A sheet is skipped if it does not contain a "XDM path" OR "Business field"
 *   column — e.g. catalogue/reference sheets that are not schema definitions.
 *
 *   Parsed columns:
 *     "Schema name"                       → groups rows into schemas
 *     "Schema type"                       → "Record" | "TimeSeries"
 *     "Business field"                    → ErdField.name  (display label)
 *     "XDM path"                          → ErdField.path  (dot-notation canonical id)
 *     "FAC candidate"                     → boolean-like: "TRUE"/"YES"/"Y" → isFacCandidate: true
 *                                           "FALSE"/"NO"/"N"/"" → false
 *     "Field group"                       → drives field group sub-nodes (see below)
 *     "Field group type"                  → stored as field metadata
 *     "Data type"                         → ErdField.type
 *     "Cardinality"                       → stored as field metadata
 *     "Identity? (namespace)"             → namespace extracted from "Yes (NS)" pattern;
 *                                           "No" / "No (…)" → treated as no identity
 *     "Primary identity for schema (Y/N)" → "Y" → isPrimaryKey; drives edge inference
 *     "Consent scope"                     → stored as field metadata
 *     "PII / sensitivity"                 → stored as field metadata
 *     "Belongs to Data Type"              → stored as field metadata
 *     "Allowed for stitching"             → stored as field metadata
 *     "OOTB doc URL"                      → stored as field metadata
 *
 *   Ignored columns:
 *     "Source", "Section", "Notes / mapping guidance",
 *     "Map key example", "Recommended change", and any extra columns.
 *
 * ─── OUTPUT SHAPE ────────────────────────────────────────────────────────────
 *   { nodes: Node[], edges: Edge[], conflicts: string[] }
 *
 *   Schema Nodes — type: "schemaNode", data.entityType: "schema"
 *     id                 = "schema-future:<schemaName>"
 *     data.schemaId      = "future:<schemaName>"
 *     data.isFutureState = true
 *     data.isConflict    = true if label matches an existing API schema label
 *
 *   FieldGroup Sub-nodes — type: "fieldGroupNode", data.entityType: "fieldGroup"
 *     id                 = "fieldgroup-future:<schemaName>:<fieldGroupName>"
 *     data.isFutureState = true
 *     Created for each unique (schemaName, fieldGroupName) pair.
 *
 *   Edges:
 *     schema-fieldgroup  → schema node to each of its field group sub-nodes
 *     schema-identity    → future schema → existing identity hub node
 *                          (when namespace matches an existing "identity-<ns>" node)
 *
 * ─── MALFORMED ROW HANDLING ──────────────────────────────────────────────────
 *   Rows missing both "XDM path" AND "Business field" are skipped with a
 *   console.warn. Parsing continues for all remaining rows.
 */

import * as XLSX from "xlsx";
import type { Node, Edge } from "@xyflow/react";
import type { SchemaNodeData, FieldGroupNodeData, IdentityNodeData, ErdField, RelationshipEdgeData } from "./types";

// ─── Column header constants ─────────────────────────────────────────────────
const COL_SCHEMA_NAME      = "Schema name";
const COL_SCHEMA_TYPE      = "Schema type";
const COL_BUSINESS_FIELD   = "Business field";
const COL_XDM_PATH         = "XDM path";
const COL_FAC_CANDIDATE    = "FAC candidate";
const COL_FIELD_GROUP      = "Field group";
const COL_FIELD_GROUP_TYPE = "Field group type";
const COL_DATA_TYPE        = "Data type";
const COL_CARDINALITY      = "Cardinality";
const COL_IDENTITY_NS      = "Identity? (namespace)";
const COL_PRIMARY_IDENTITY = "Primary identity for schema (Y/N)";
const COL_CONSENT_SCOPE    = "Consent scope";
const COL_PII              = "PII / sensitivity";
const COL_BELONGS_TO       = "Belongs to Data Type";
const COL_STITCHING        = "Allowed for stitching";
const COL_OOTB_DOC         = "OOTB doc URL";

/**
 * Alternate (snake_case) column name aliases → canonical column name.
 * Handles files that use snake_case headers instead of the expected title-case.
 * schema_class values ("experienceevent", "profile") are remapped to the
 * canonical schema type ("TimeSeries", "Record") during row normalization.
 */
const COLUMN_ALIASES: Record<string, string> = {
  schema_name:        COL_SCHEMA_NAME,
  schema_class:       COL_SCHEMA_TYPE,
  field_name:         COL_BUSINESS_FIELD,
  field_path:         COL_XDM_PATH,
  fac_candidate:      COL_FAC_CANDIDATE,
  field_group:        COL_FIELD_GROUP,
  field_group_type:   COL_FIELD_GROUP_TYPE,
  data_type:          COL_DATA_TYPE,
  cardinality:        COL_CARDINALITY,
  identity_namespace: COL_IDENTITY_NS,
  identity_rank:      COL_PRIMARY_IDENTITY,
  consent_scope:      COL_CONSENT_SCOPE,
  pii_sensitivity:    COL_PII,
};

/** schema_class raw values → canonical Schema type string */
const SCHEMA_CLASS_MAP: Record<string, string> = {
  experienceevent: "TimeSeries",
  profile:         "Record",
};

/**
 * Remap snake_case column names to the canonical title-case names expected by
 * the rest of the parser.  Also converts schema_class values ("experienceevent")
 * to the canonical schema type ("TimeSeries") so downstream logic is unaffected.
 * Rows that already use canonical column names are returned unchanged.
 */
function normalizeRow(row: SheetRow): SheetRow {
  const keys = Object.keys(row);
  // If the first canonical key is present, the row is already in canonical form.
  if (keys.includes(COL_SCHEMA_NAME) || keys.includes(COL_XDM_PATH) || keys.includes(COL_BUSINESS_FIELD)) {
    return row;
  }
  const out: SheetRow = {};
  for (const key of keys) {
    const canonical = COLUMN_ALIASES[key];
    if (canonical) {
      let value = row[key];
      // Remap schema_class raw values to the canonical schema type string
      if (key === "schema_class" && typeof value === "string") {
        value = SCHEMA_CLASS_MAP[value.trim().toLowerCase()] ?? value;
      }
      out[canonical] = value;
    } else {
      out[key] = row[key];
    }
  }
  return out;
}

// AEP class URIs
const CLASS_RECORD     = "https://ns.adobe.com/xdm/context/profile";
const CLASS_TIMESERIES = "https://ns.adobe.com/xdm/data/experienceevent";

// ─── Types ───────────────────────────────────────────────────────────────────
type SheetRow = Record<string, unknown>;

// ─── Value parsers ────────────────────────────────────────────────────────────

function cellStr(row: SheetRow, col: string): string {
  const v = row[col];
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

/**
 * Parse a boolean-like cell value for FAC candidate.
 * XLSX converts boolean cells to "TRUE"/"FALSE" strings when raw:false is used.
 * Only returns true for explicit affirmatives; "FALSE", "N", empty → false.
 */
function parseFacCandidate(raw: string): boolean {
  const v = raw.trim().toUpperCase();
  return v === "TRUE" || v === "YES" || v === "Y" || v === "1";
}

/**
 * Extract the identity namespace from values like:
 *   "Yes (CDMID)"                               → "CDMID"
 *   "Yes (cdmid)"                               → "cdmid"
 *   "Yes (email identity recommended via …)"    → "email"
 *   "Optional (email/phone)"                    → "email"
 *   "Yes (Phone)"                               → "Phone"
 *   "No", "No (reference-only)", ""             → "" (not an identity)
 *   "Yes" (no parens)                           → "" (ambiguous, skip)
 *   "ECID", "email", "CRMID"                    → raw value (snake_case file format)
 */
function extractNamespace(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const lower   = trimmed.toLowerCase();

  // Explicit negatives
  if (lower === "no" || lower.startsWith("no ") || lower.startsWith("no(")) {
    return "";
  }

  // "Yes (NS)" / "Optional (NS)" format — extract from parens
  const match = trimmed.match(/\(([^)]+)\)/);
  if (match) {
    const content = match[1].trim();
    // Take the first alphanumeric token (handles "email identity recommended…", "email/phone")
    const firstToken = content.split(/[\s/,;]+/)[0].trim();
    return firstToken || "";
  }

  // "Yes" or "Optional" with no parens — ambiguous namespace, skip
  if (lower.startsWith("yes") || lower.startsWith("optional")) return "";

  // Raw namespace value (snake_case file format — no "Yes/No" prefix)
  return trimmed;
}

// ─── Sheet validation ────────────────────────────────────────────────────────
/**
 * Return true if this sheet contains schema field definitions.
 * Sheets without "XDM path" / "Business field" (or their snake_case aliases
 * "field_path" / "field_name") are treated as reference/catalog sheets and skipped.
 */
function isSchemaSheet(rows: SheetRow[]): boolean {
  if (rows.length === 0) return false;
  const headers = Object.keys(rows[0]);
  return (
    headers.includes(COL_XDM_PATH)      || headers.includes(COL_BUSINESS_FIELD) ||
    headers.includes("field_path")       || headers.includes("field_name")
  );
}

// ─── ID helpers ──────────────────────────────────────────────────────────────
function futureSchemaId(schemaName: string): string {
  return `future:${schemaName}`;
}
function futureSchemaNodeId(schemaName: string): string {
  return `schema-future:${schemaName}`;
}
function futureFgNodeId(schemaName: string, fgName: string): string {
  return `fieldgroup-future:${schemaName}:${fgName}`;
}

// ─── Per-schema accumulated data ─────────────────────────────────────────────
interface ParsedSchema {
  schemaName: string;
  schemaType: string;
  fields: ErdField[];
  primaryIdentityPath: string | undefined;
  /** Unique field group names in insertion order */
  fieldGroupNames: string[];
  /** Fields grouped by field group name */
  fieldsByGroup: Map<string, ErdField[]>;
  /** All identity entries: { path, namespace (extracted, raw-case), isPrimary } */
  identities: Array<{ path: string; namespace: string; isPrimary: boolean }>;
}

// ─── Row → field ──────────────────────────────────────────────────────────────
function parseRow(
  row: SheetRow,
  rowIdx: number,
  sheetName: string,
  schema: ParsedSchema
): void {
  const xdmPath  = cellStr(row, COL_XDM_PATH);
  const bizField = cellStr(row, COL_BUSINESS_FIELD);

  if (!xdmPath && !bizField) {
    console.warn(
      `[excel-import] Sheet "${sheetName}" row ${rowIdx + 2}: ` +
      `missing both "XDM path" and "Business field" — skipping.`
    );
    return;
  }

  const fieldPath = xdmPath   || bizField;
  const fieldName = bizField  || xdmPath;
  const dataType  = cellStr(row, COL_DATA_TYPE)   || "string";
  const rawNs     = cellStr(row, COL_IDENTITY_NS);
  const namespace = extractNamespace(rawNs);
  const primaryRaw = cellStr(row, COL_PRIMARY_IDENTITY);
  // Handles "Y" (title-case format) and "1" / "1.0" (snake_case identity_rank format)
  const isPrimary  = primaryRaw.toUpperCase() === "Y" || primaryRaw === "1" || primaryRaw === "1.0";
  const isFac     = parseFacCandidate(cellStr(row, COL_FAC_CANDIDATE));
  const fgName    = cellStr(row, COL_FIELD_GROUP);

  if (isPrimary) schema.primaryIdentityPath = xdmPath || undefined;

  if (namespace) {
    schema.identities.push({ path: fieldPath, namespace, isPrimary });
  }

  // Update schema type from first populated cell (all rows should agree)
  const rowSchemaType = cellStr(row, COL_SCHEMA_TYPE);
  if (rowSchemaType) schema.schemaType = rowSchemaType;

  const field: ErdField = {
    path:         fieldPath,
    name:         fieldName,
    type:         dataType,
    isPrimaryKey: isPrimary,
    isForeignKey: false,
    ...(isFac      && { isFacCandidate:    true }),
    ...(namespace  && { identityNamespace: namespace }),
    // Metadata storage
    ...(fgName                                 && { fieldGroup:          fgName }),
    ...(cellStr(row, COL_FIELD_GROUP_TYPE)     && { fieldGroupType:      cellStr(row, COL_FIELD_GROUP_TYPE) }),
    ...(cellStr(row, COL_CARDINALITY)          && { cardinality:         cellStr(row, COL_CARDINALITY) }),
    ...(cellStr(row, COL_CONSENT_SCOPE)        && { consentScope:        cellStr(row, COL_CONSENT_SCOPE) }),
    ...(cellStr(row, COL_PII)                  && { piiSensitivity:      cellStr(row, COL_PII) }),
    ...(cellStr(row, COL_BELONGS_TO)           && { belongsToDataType:   cellStr(row, COL_BELONGS_TO) }),
    ...(cellStr(row, COL_STITCHING)            && { allowedForStitching: cellStr(row, COL_STITCHING) }),
    ...(cellStr(row, COL_OOTB_DOC)             && { ootbDocUrl:          cellStr(row, COL_OOTB_DOC) }),
  };

  schema.fields.push(field);

  // Track field group membership
  if (fgName) {
    if (!schema.fieldsByGroup.has(fgName)) {
      schema.fieldGroupNames.push(fgName);
      schema.fieldsByGroup.set(fgName, []);
    }
    schema.fieldsByGroup.get(fgName)!.push(field);
  }
}

// ─── Schema node builder ──────────────────────────────────────────────────────
function buildSchemaNode(
  parsed: ParsedSchema,
  conflictLabels: Set<string>
): Node<SchemaNodeData & { isFutureState: boolean; isConflict: boolean }> {
  const { schemaName, schemaType, fields, primaryIdentityPath } = parsed;
  const className = schemaType === "TimeSeries" ? CLASS_TIMESERIES : CLASS_RECORD;
  return {
    id:   futureSchemaNodeId(schemaName),
    type: "schemaNode",
    position: { x: 0, y: 0 },
    data: {
      entityType:           "schema" as const,
      label:                schemaName,
      schemaId:             futureSchemaId(schemaName),
      description:          `Future state schema (${schemaType})`,
      className,
      fieldCount:           fields.length,
      primaryIdentityField: primaryIdentityPath,
      extends:              [],
      isSystem:             false,
      fields,
      isFutureState:        true,
      isConflict:           conflictLabels.has(schemaName),
    },
  };
}

// ─── Field group node builders ───────────────────────────────────────────────
function buildFieldGroupNodes(
  parsed: ParsedSchema
): Node<FieldGroupNodeData & { isFutureState: boolean }>[] {
  const { schemaName, fieldGroupNames, fieldsByGroup } = parsed;
  return fieldGroupNames.map((fgName) => {
    const fields   = fieldsByGroup.get(fgName) ?? [];
    const keyFields = fields.slice(0, 5).map((f) => f.name);
    return {
      id:   futureFgNodeId(schemaName, fgName),
      type: "fieldGroupNode",
      position: { x: 0, y: 0 },
      data: {
        entityType:    "fieldGroup" as const,
        label:         fgName,
        fieldGroupId:  futureFgNodeId(schemaName, fgName),
        description:   `Future state field group (${schemaName})`,
        fieldCount:    fields.length,
        keyFields,
        isSystem:      false,
        fields,
        isFutureState: true,
      },
    };
  });
}

function buildSchemaFgEdges(parsed: ParsedSchema): Edge<RelationshipEdgeData>[] {
  const { schemaName, fieldGroupNames } = parsed;
  const schemaNodeId = futureSchemaNodeId(schemaName);
  return fieldGroupNames.map((fgName) => ({
    id:     `edge-future-schema-fg-${schemaName}-${fgName}`,
    source: schemaNodeId,
    target: futureFgNodeId(schemaName, fgName),
    type:   "relationshipEdge",
    data: {
      relationshipType: "schema-fieldgroup" as const,
      label:            fgName,
      fkLabel:          "includes",
      pkLabel:          fgName,
    },
  }));
}

// ─── Identity hub + edge builders ────────────────────────────────────────────
/**
 * Connect future-state schemas to identity hubs via schema-identity edges.
 *
 * For each identity namespace found across the parsed schemas:
 *   • If an existing hub node ("identity-<ns>") is already in the graph → reuse it.
 *   • If no existing hub BUT 2+ future schemas share the namespace → create a new
 *     future-state identity hub node so the schemas are visually connected.
 *   • A namespace used by only 1 future schema with no existing hub is skipped
 *     (no hub needed for a single schema).
 *
 * Returns both the new identity hub nodes to add and the edges to draw.
 */
function buildIdentityConnections(
  parsedSchemas: ParsedSchema[],
  existingNodeIds: Set<string>
): { nodes: Node<IdentityNodeData & { isFutureState: boolean }>[]; edges: Edge<RelationshipEdgeData>[] } {
  const newNodes: Node<IdentityNodeData & { isFutureState: boolean }>[] = [];
  const edges: Edge<RelationshipEdgeData>[] = [];
  const edgeSeen = new Set<string>();

  // Group all identity entries by normalised namespace key
  type Entry = { schemaName: string; path: string; rawNs: string };
  const byNamespace = new Map<string, Entry[]>();
  for (const schema of parsedSchemas) {
    for (const id of schema.identities) {
      const nsKey = id.namespace.toLowerCase();
      const list = byNamespace.get(nsKey);
      if (list) list.push({ schemaName: schema.schemaName, path: id.path, rawNs: id.namespace });
      else byNamespace.set(nsKey, [{ schemaName: schema.schemaName, path: id.path, rawNs: id.namespace }]);
    }
  }

  for (const [nsKey, entries] of Array.from(byNamespace)) {
    // Prefer existing hub; try original casing, lowercase, uppercase
    const rawNs = entries[0].rawNs;
    const existingHubId = [
      `identity-${rawNs}`,
      `identity-${nsKey}`,
      `identity-${rawNs.toUpperCase()}`,
    ].find((h) => existingNodeIds.has(h));

    let hubId: string;
    if (existingHubId) {
      hubId = existingHubId;
    } else if (entries.length >= 2) {
      // Multiple future schemas share this namespace — create a new hub
      hubId = `identity-${nsKey}`;
      newNodes.push({
        id:   hubId,
        type: "identityNode",
        position: { x: 0, y: 0 },
        data: {
          entityType:    "identity" as const,
          label:         rawNs,
          namespace:     nsKey,
          schemaCount:   entries.length,
          isFutureState: true,
        },
      });
    } else {
      continue; // Single schema, no existing hub — no connection needed
    }

    for (const entry of entries) {
      const schemaNodeId = futureSchemaNodeId(entry.schemaName);
      const edgeId = `edge-future-cross-identity-${nsKey}-${schemaNodeId}`;
      if (edgeSeen.has(edgeId)) continue;
      edgeSeen.add(edgeId);

      edges.push({
        id:     edgeId,
        source: hubId,
        target: schemaNodeId,
        type:   "relationshipEdge",
        data: {
          relationshipType: "schema-identity" as const,
          label:            "shared identity",
          fkLabel:          entry.rawNs,
          pkLabel:          entry.path,
          targetField:      entry.path,
        },
      });
    }
  }

  return { nodes: newNodes, edges };
}

// ─── Public API ───────────────────────────────────────────────────────────────
export interface ExcelImportResult {
  nodes: Node[];
  edges: Edge[];
  /** Labels of future-state schemas that collide with an existing API schema label. */
  conflicts: string[];
}

/**
 * Parse an .xlsx file containing future-state schema definitions.
 *
 * The file may have one or more sheets. Each sheet may define one or more
 * schemas — rows are grouped by the "Schema name" column value, NOT by the
 * sheet name. Sheets that lack both "XDM path" and "Business field" columns
 * are detected as non-schema reference sheets and skipped.
 *
 * @param file          The File object from the browser file picker.
 * @param existingNodes Current rawNodes from the store (for conflict + cross-edge detection).
 */
export async function parseExcelFutureState(
  file: File,
  existingNodes: Node[] = []
): Promise<ExcelImportResult> {
  const buffer   = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", raw: false });

  // Build lookup of existing schema labels for conflict detection
  const existingLabels = new Set<string>(
    existingNodes
      .filter((n) => n.type === "schemaNode")
      .map((n) => String((n.data as Record<string, unknown>).label ?? ""))
  );

  // Build set of existing node IDs for cross-edge detection
  const existingNodeIds = new Set<string>(existingNodes.map((n) => n.id));

  // Accumulate schemas across all sheets, keyed by schema name
  const schemaMap = new Map<string, ParsedSchema>();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows  = XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: "", raw: false });

    if (!isSchemaSheet(rows)) {
      console.warn(
        `[excel-import] Sheet "${sheetName}" has no "XDM path" or "Business field" column — ` +
        `treating as a non-schema reference sheet and skipping.`
      );
      continue;
    }

    rows.forEach((rawRow, rowIdx) => {
      const row = normalizeRow(rawRow);
      const schemaName = cellStr(row, COL_SCHEMA_NAME).trim();
      if (!schemaName) {
        // Skip rows with no schema name (could be a section header or empty row)
        return;
      }

      if (!schemaMap.has(schemaName)) {
        schemaMap.set(schemaName, {
          schemaName,
          schemaType:          "Record",
          fields:              [],
          primaryIdentityPath: undefined,
          fieldGroupNames:     [],
          fieldsByGroup:       new Map(),
          identities:          [],
        });
      }

      parseRow(row, rowIdx, sheetName, schemaMap.get(schemaName)!);
    });
  }

  const parsedSchemas = Array.from(schemaMap.values());

  if (parsedSchemas.length === 0) {
    console.warn("[excel-import] No schemas found in the uploaded file.");
    return { nodes: [], edges: [], conflicts: [] };
  }

  // Detect conflicts with existing API schema labels
  const conflictLabels = new Set<string>(
    parsedSchemas
      .map((p) => p.schemaName)
      .filter((name) => existingLabels.has(name))
  );

  if (conflictLabels.size > 0) {
    console.warn(
      `[excel-import] Schema name conflict(s) detected — future-state schema(s) share ` +
      `a name with existing API schema(s): ${Array.from(conflictLabels).join(", ")}`
    );
  }

  // Build nodes: one schema node + N field group nodes per schema
  const nodes: Node[] = [];
  for (const parsed of parsedSchemas) {
    nodes.push(buildSchemaNode(parsed, conflictLabels));
    nodes.push(...buildFieldGroupNodes(parsed));
  }

  // Build edges + any new identity hub nodes
  const schemaFgEdges                   = parsedSchemas.flatMap(buildSchemaFgEdges);
  const { nodes: identityHubNodes,
          edges: identityEdges }         = buildIdentityConnections(parsedSchemas, existingNodeIds);

  nodes.push(...identityHubNodes);
  const edges: Edge[] = [...schemaFgEdges, ...identityEdges];

  console.info(
    `[excel-import] Imported ${parsedSchemas.length} schema(s), ` +
    `${nodes.length} node(s) total, ${edges.length} edge(s).` +
    (conflictLabels.size > 0 ? ` ${conflictLabels.size} conflict(s) detected.` : "")
  );

  return { nodes, edges, conflicts: Array.from(conflictLabels) };
}
