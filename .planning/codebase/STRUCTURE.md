# Codebase Structure

**Analysis Date:** 2026-03-05

## Directory Layout

```
aeprtcpt-erd-visualizer/
├── src/
│   ├── app/                        # Next.js App Router root
│   │   ├── page.tsx                # Single application page (route /)
│   │   ├── layout.tsx              # Root HTML layout + TooltipProvider
│   │   ├── globals.css             # Tailwind base styles
│   │   ├── error.tsx               # Next.js error boundary
│   │   ├── not-found.tsx           # Next.js 404 page
│   │   └── api/                    # Next.js API routes (BFF layer)
│   │       ├── aep/[...path]/      # AEP proxy — all Adobe API calls
│   │       ├── token/              # Adobe IMS token exchange
│   │       ├── config/             # Serve env-var credentials to browser
│   │       ├── snapshots/          # List + save snapshots (POST/GET)
│   │       ├── snapshots/[filename]/ # Load individual snapshot
│   │       └── miro/export/        # Miro board export (streaming NDJSON)
│   ├── components/                 # React UI components
│   │   ├── canvas/                 # React Flow canvas wrapper + controls
│   │   ├── nodes/                  # One file per React Flow node type
│   │   ├── edges/                  # Custom React Flow edge type
│   │   ├── sidebar/                # Detail panel (sheet + tabs)
│   │   ├── toolbar/                # Top toolbar, search bar, connection form
│   │   ├── overlays/               # Empty state, loading overlay, error banner
│   │   ├── export/                 # Export dialog (PNG, JSON, Miro)
│   │   ├── command-palette/        # Keyboard-driven command palette
│   │   ├── keyboard-shortcuts/     # Shortcuts help dialog
│   │   ├── layout/                 # App header
│   │   └── ui/                     # Shared UI primitives (shadcn/ui)
│   ├── hooks/                      # Custom React hooks
│   ├── lib/                        # Pure utilities and type definitions
│   └── store/                      # Zustand store
│       └── canvas-store.ts         # Single global store
├── snapshots/                      # Runtime-written snapshot JSON files
├── .planning/                      # GSD planning artifacts
│   └── codebase/                   # Codebase analysis documents
├── .env.example                    # Required env vars template
├── next.config.mjs                 # Next.js config
├── tailwind.config.ts              # Tailwind config
├── tsconfig.json                   # TypeScript config
└── package.json                    # Dependencies (pnpm)
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router pages and API routes
- Contains: Single page component, root layout, API route handlers
- Key files: `src/app/page.tsx` (application root), `src/app/layout.tsx`

**`src/app/api/aep/[...path]/`:**
- Purpose: Catchall proxy forwarding all browser requests to Adobe AEP REST APIs
- Contains: `route.ts` with a single `GET` handler
- Key files: `src/app/api/aep/[...path]/route.ts`

**`src/app/api/snapshots/`:**
- Purpose: Save and list local graph snapshots as JSON files
- Contains: `route.ts` with GET (list) and POST (save) handlers
- Key files: `src/app/api/snapshots/route.ts`, `src/app/api/snapshots/[filename]/route.ts`

**`src/app/api/miro/export/`:**
- Purpose: Server-side Miro board creation — streams progress via NDJSON
- Key files: `src/app/api/miro/export/route.ts`

**`src/components/canvas/`:**
- Purpose: React Flow canvas and in-canvas overlays
- Key files: `src/components/canvas/erd-canvas.tsx` (node/edge type registry, layout), `src/components/canvas/controls-panel.tsx`, `src/components/canvas/legend-overlay.tsx`

**`src/components/nodes/`:**
- Purpose: Custom React Flow node components, one per entity type
- Key files: `dataset-node.tsx`, `schema-node.tsx`, `field-group-node.tsx`, `flow-node.tsx`, `identity-node.tsx`, `summary-node.tsx`
- Contains also: `node-card.tsx` (shared card wrapper), `field-list.tsx` (shared field list)

**`src/components/edges/`:**
- Purpose: Single custom edge type used for all relationships
- Key files: `src/components/edges/relationship-edge.tsx`

**`src/components/sidebar/`:**
- Purpose: Right-side detail panel for a selected node; tabbed interface
- Key files: `detail-sheet.tsx` (drawer container), `detail-panel.tsx`, `details-tab.tsx`, `fields-tab.tsx`, `relations-tab.tsx`

**`src/components/toolbar/`:**
- Purpose: Top bar with search, filters, view mode, and connection management
- Key files: `toolbar.tsx`, `search-bar.tsx`, `filter-controls.tsx`, `connection-form.tsx`

**`src/components/overlays/`:**
- Purpose: Full-screen or floating overlays for app states
- Key files: `empty-state.tsx`, `loading-overlay.tsx`, `error-banner.tsx`

**`src/hooks/`:**
- Purpose: Data-fetching orchestration and derived graph state
- Key files:
  - `use-aep-data.ts` — main orchestrator (fetchAll, fetchUpdate, loadMockData)
  - `use-filtered-graph.ts` — derives visible/laid-out nodes+edges from store
  - `use-datasets.ts`, `use-schemas.ts`, `use-field-groups.ts`, `use-flows.ts`, `use-schema-fields.ts` — per-entity API helpers
  - `use-snapshots.ts` — snapshot CRUD
  - `use-env-auto-connect.ts` — reads `/api/config` and auto-connects on mount
  - `use-export.ts` — PNG/JSON export logic
  - `use-miro-export.ts` — Miro streaming export
  - `use-hotkeys.ts` — global keyboard shortcuts
  - `use-search-index.ts`, `use-credential-profiles.ts`

**`src/lib/`:**
- Purpose: Pure functions, type definitions, and utilities; no React dependencies
- Key files:
  - `types.ts` — all TypeScript interfaces and types (AEP payloads, node/edge data, store shapes)
  - `transform.ts` — `transformToGraph()` — converts raw AEP data to React Flow graph
  - `aep-proxy.ts` — `buildAepUrl()` and `buildAepHeaders()` used by the proxy route
  - `extract-fields.ts` — `extractFields()` / `extractSchemaFields()` for XDM property trees
  - `excel-import.ts` — `parseExcelFutureState()` for `.xlsx` future-state import
  - `paginate.ts` — pagination helpers for AEP list APIs
  - `mock-data.ts` — `getMockTransformInput()` for demo/sample data
  - `utils.ts` — general utilities (e.g., `cn` class name helper)

**`src/store/`:**
- Purpose: Global Zustand state
- Key files: `src/store/canvas-store.ts` — single store export `useCanvasStore`

**`snapshots/`:**
- Purpose: Runtime-written JSON files; one file per saved graph snapshot
- Generated: Yes (at runtime by `/api/snapshots` POST handler)
- Committed: No (gitignored)

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Application root — mounts all top-level components
- `src/app/layout.tsx`: HTML shell and global providers

**Configuration:**
- `next.config.mjs`: Next.js build config
- `tailwind.config.ts`: Tailwind theme (colors, fonts)
- `tsconfig.json`: TypeScript paths alias `@/` → `src/`
- `components.json`: shadcn/ui component registry config
- `.env.example`: Documents required env vars

**Core Logic:**
- `src/lib/transform.ts`: Central data transformation pipeline
- `src/lib/types.ts`: All shared TypeScript types
- `src/store/canvas-store.ts`: All application state
- `src/hooks/use-aep-data.ts`: Full data load orchestration
- `src/hooks/use-filtered-graph.ts`: Visible graph derivation

**API Routes:**
- `src/app/api/aep/[...path]/route.ts`: AEP proxy
- `src/app/api/token/route.ts`: IMS token exchange
- `src/app/api/config/route.ts`: Env credential serving
- `src/app/api/snapshots/route.ts`: Snapshot list/save
- `src/app/api/miro/export/route.ts`: Miro streaming export

**Testing:**
- Not present — no test files detected

## Naming Conventions

**Files:**
- React components: `kebab-case.tsx` (e.g., `dataset-node.tsx`, `erd-canvas.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-aep-data.ts`)
- Lib utilities: `kebab-case.ts` (e.g., `aep-proxy.ts`, `extract-fields.ts`)
- API routes: always `route.ts` inside the directory named after the route segment

**Directories:**
- `kebab-case` throughout (e.g., `command-palette/`, `keyboard-shortcuts/`)
- API route segments match the URL path segment (e.g., `api/miro/export/`)

**Exports:**
- Named exports for all components and hooks
- `useCanvasStore` is the single default-like export from `src/store/canvas-store.ts`
- `transformToGraph` and `TransformInput` are named exports from `src/lib/transform.ts`

**Node IDs (critical — must follow exactly):**
- Dataset: `dataset-${datasetId}`
- Schema (live): `schema-${schemaId}` (schemaId is full `$id` URI)
- Schema (future): `schema-future:${schemaName}`
- Field group (live): `fieldgroup-${fieldGroupId}`
- Field group (future): `fieldgroup-future:${schemaName}:${fieldGroupName}`
- Flow: `flow-${flowId}`
- Identity hub: `identity-${namespace}`
- Summary (collapsed): `summary-${entityType}`

## Where to Add New Code

**New entity type (new node variant):**
- Type definition: `src/lib/types.ts` — add `*NodeData` interface, extend `ErdNodeData` union
- Transform builder: `src/lib/transform.ts` — add `build*Nodes()` and `build*Edges()` functions
- Node component: `src/components/nodes/` — new `*-node.tsx` file
- Register in canvas: `src/components/canvas/erd-canvas.tsx` — add to `nodeTypes` map
- Store filters: `src/store/canvas-store.ts` — update `FilterState`, `EntityFilterKey`
- Filter UI: `src/components/toolbar/filter-controls.tsx`

**New API integration (new external service):**
- Proxy route: `src/app/api/<service>/route.ts`
- Lib helpers: `src/lib/<service>-proxy.ts` for URL/header building
- Hook: `src/hooks/use-<feature>.ts`

**New library/utility:**
- Pure functions with no React: `src/lib/`
- React hooks: `src/hooks/`

**New UI component:**
- Shared primitive (button, dialog, etc.): `src/components/ui/`
- Feature-specific component: `src/components/<feature-area>/`

**New store state:**
- Add field and setter to the `CanvasStore` interface and `create` body in `src/store/canvas-store.ts`

## Special Directories

**`snapshots/`:**
- Purpose: Persisted graph snapshots written at runtime by `/api/snapshots`
- Generated: Yes — created by Next.js API route using Node.js `fs`
- Committed: No

**`.planning/`:**
- Purpose: GSD planning documents (phases, codebase analysis)
- Generated: By GSD commands
- Committed: Yes

**`.claude/`:**
- Purpose: Claude Code configuration (launch config, etc.)
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-03-05*
