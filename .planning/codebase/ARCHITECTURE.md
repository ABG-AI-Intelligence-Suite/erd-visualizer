# Architecture

**Analysis Date:** 2026-03-05

## Pattern Overview

**Overall:** Single-page application with a BFF (Backend for Frontend) proxy layer

**Key Characteristics:**
- Client-side React app rendered by Next.js 14 App Router (single page at `/`)
- Next.js API routes act as a secure proxy between the browser and Adobe AEP APIs — credentials never leave the server
- Zustand store is the single source of truth for all graph data, filters, UI state, and connection config
- Data flows one direction: AEP APIs → proxy → hooks → transform → store → filtered view → React Flow canvas
- All graph layout is computed client-side (pure functions, no layout library)

## Layers

**API Proxy Layer:**
- Purpose: Forward authenticated requests to Adobe AEP REST APIs; prevent CORS issues and keep credentials server-side
- Location: `src/app/api/aep/[...path]/route.ts`
- Contains: Catchall GET route, header injection, URL building
- Depends on: `src/lib/aep-proxy.ts` (URL builder, header factory)
- Used by: Data-fetching hooks via `fetch("/api/aep/...")`

**Data-Fetching Hooks:**
- Purpose: Orchestrate parallel/sequential calls to the proxy, track loading progress, drive store updates
- Location: `src/hooks/` — `use-aep-data.ts` (orchestrator), `use-datasets.ts`, `use-schemas.ts`, `use-field-groups.ts`, `use-flows.ts`, `use-schema-fields.ts`
- Contains: `fetchAll` (full load), `fetchUpdate` (incremental merge), `loadMockData`
- Depends on: API proxy at `/api/aep/*`, `src/lib/transform.ts`, `src/store/canvas-store.ts`
- Used by: `src/app/page.tsx`

**Transform Layer:**
- Purpose: Convert raw AEP API payloads into React Flow `Node[]` and `Edge[]`
- Location: `src/lib/transform.ts`, `src/lib/extract-fields.ts`
- Contains: `transformToGraph(input: TransformInput)`, node builders per entity type, edge builders per relationship type
- Depends on: `src/lib/types.ts`
- Used by: `use-aep-data.ts`, `src/lib/excel-import.ts`

**State Layer:**
- Purpose: Single Zustand store holding all application state
- Location: `src/store/canvas-store.ts`
- Contains: Raw graph (`rawNodes`, `rawEdges`), future-state layer, filters, view mode, focus node, UI panel open/close flags, Miro export list, connection config, snapshot label
- Depends on: `src/lib/types.ts`
- Used by: All hooks, all UI components

**Graph Computation Layer:**
- Purpose: Derive the visible, laid-out, filtered subset of the raw graph for React Flow
- Location: `src/hooks/use-filtered-graph.ts`
- Contains: Type filters, view modes (`full` / `schema`), focus mode (BFS subgraph), collapse mode, layout algorithms (grid and schema-relationship)
- Depends on: `src/store/canvas-store.ts`
- Used by: `src/app/page.tsx` → `FlowContent` component

**Presentation Layer:**
- Purpose: Render the ERD canvas, panels, dialogs, overlays using React Flow
- Location: `src/components/`
- Contains: Node types, edge type, canvas wrapper, toolbar, sidebar detail panel, command palette, export dialog, overlays
- Depends on: `src/store/canvas-store.ts`, `src/hooks/`
- Used by: `src/app/page.tsx`

**Secondary API Routes:**
- `src/app/api/token/route.ts` — POST to Adobe IMS to exchange client credentials for a bearer token
- `src/app/api/config/route.ts` — GET serves env-var credentials to the browser for auto-connect
- `src/app/api/snapshots/route.ts` (list/save) and `src/app/api/snapshots/[filename]/route.ts` (load) — file-system persistence of graph snapshots in `snapshots/` at project root
- `src/app/api/miro/export/route.ts` — POST streams NDJSON progress events while creating Miro boards via the Miro API

## Data Flow

**Primary: Live AEP Data Load**

1. User submits credentials in `ConnectionDialog` → `handleConnect` in `src/app/page.tsx`
2. `useAepData().fetchAll(config, fetchOpts)` kicks off parallel requests:
   - Datasets via `/api/aep/catalog/dataSets`
   - Descriptors via `/api/aep/schemaregistry/tenant/descriptors`
   - Flows via `/api/aep/flowservice/flows`
3. Schema IDs are collected from dataset refs and descriptors; schemas fetched by IDs in batches
4. Field groups are fetched by refs collected from schema `allOf` / `meta:extends`
5. Per-schema field definitions fetched individually with `xed-full+json` Accept header
6. `transformToGraph(input)` converts all payloads to `Node[]` + `Edge[]`
7. `setGraph(nodes, edges)` writes to Zustand store
8. `useFilteredGraph()` derives visible/laid-out nodes+edges via `useMemo` with deferred values
9. `ErdCanvas` renders the React Flow graph

**Future-State Layer:**

1. User uploads `.xlsx` file → `parseExcelFutureState(file, rawNodes)` in `src/lib/excel-import.ts`
2. Returns schema nodes, field-group nodes, and edges (tagged `isFutureState: true`)
3. `importFutureState(nodes, edges)` merges into Zustand store alongside live data
4. Toggle `toggleFutureStateVisible()` adds/removes future nodes from `rawNodes`/`rawEdges`

**Snapshot Flow:**

1. After successful `fetchAll`, `saveSnapshot(config, nodes, edges)` POSTs to `/api/snapshots`
2. Server writes JSON file to `snapshots/<orgHash>-<timestamp>.local.json`
3. `loadSnapshot(filename)` reads from `/api/snapshots/<filename>` and calls `setGraph`

**State Management:**

- Single Zustand store (`useCanvasStore`) — no React Context, no reducers
- `rawNodes` / `rawEdges` = source of truth for graph data
- `useFilteredGraph()` = derived view (never mutates store)
- Future-state nodes are merged into `rawNodes` when visible; stored separately in `futureStateNodes` to allow toggling

## Key Abstractions

**TransformInput / transformToGraph:**
- Purpose: Stable interface between raw AEP data and React Flow graph
- Location: `src/lib/transform.ts` — `export interface TransformInput`, `export function transformToGraph`
- Pattern: Pure function, no side effects; all node ID generation follows patterns defined in CLAUDE.md

**ErdNodeData union type:**
- Purpose: Typed data payload for all node variants
- Location: `src/lib/types.ts` — `DatasetNodeData`, `SchemaNodeData`, `FieldGroupNodeData`, `FlowNodeData`, `IdentityNodeData`, union `ErdNodeData`
- Pattern: Discriminated union on `entityType` field; consumed by node components and detail panel

**RelationshipEdgeData:**
- Purpose: Typed payload for all edges
- Location: `src/lib/types.ts`
- Pattern: All edges use `type: "relationshipEdge"`; `relationshipType` discriminates behavior in `src/components/edges/relationship-edge.tsx`

**Custom Node Components:**
- Purpose: Per-entity-type visual card rendered by React Flow
- Location: `src/components/nodes/` — `dataset-node.tsx`, `schema-node.tsx`, `field-group-node.tsx`, `flow-node.tsx`, `identity-node.tsx`, `summary-node.tsx`
- Pattern: Registered in `erd-canvas.tsx` `nodeTypes` map; read data via React Flow `NodeProps`

## Entry Points

**Application Entry:**
- Location: `src/app/page.tsx`
- Triggers: Next.js App Router renders this as the root `/` page
- Responsibilities: Mounts `ReactFlowProvider`, wires `useAepData`, `useEnvAutoConnect`, `useSnapshots`; renders all top-level components and dialogs

**Root Layout:**
- Location: `src/app/layout.tsx`
- Responsibilities: Wraps app in `TooltipProvider`, sets HTML metadata, applies global CSS

**API Proxy Entry:**
- Location: `src/app/api/aep/[...path]/route.ts`
- Triggers: Any `GET /api/aep/<service>/<path>` request from hooks
- Responsibilities: Validates auth headers, builds Adobe API URL, forwards request, returns JSON

## Error Handling

**Strategy:** Per-layer error capture; non-fatal errors collected and surfaced via store; fatal errors abort the load

**Patterns:**
- `fetchAll` uses `Promise.allSettled` for parallel steps; per-step errors are pushed to an `errors[]` array and joined into a single error string via `setError`
- Flow fetch errors are non-fatal — graph is shown without flows
- API proxy returns structured JSON errors with `status` and `detail` fields
- Node/edge transforms are wrapped in try/catch; failures abort transform with an error message
- UI displays errors via `ErrorBanner` component reading from store `error` field

## Cross-Cutting Concerns

**Logging:** `console.warn` / `console.info` / `console.error` — no structured logging library; prefixed with module name (e.g., `[excel-import]`, `[Flows]`)

**Validation:** Input validated at API route boundaries (required headers, required body fields); no client-side form library

**Authentication:** Adobe IMS bearer token passed by the browser as `x-aep-token` header on every proxy request; `/api/token` route exchanges client credentials for a token server-side; `/api/config` serves env-var credentials for auto-connect

---

*Architecture analysis: 2026-03-05*
