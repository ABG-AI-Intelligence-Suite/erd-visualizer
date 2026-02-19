# AEP ERD Visualizer — Agent Rules

Rules and conventions for AI agents working in this codebase.

---

## Architecture Overview

| Layer | Path | Purpose |
|---|---|---|
| Pages | `src/app/` | Next.js App Router pages |
| Components | `src/components/` | React UI — nodes, edges, canvas, toolbar, sidebar |
| Hooks | `src/hooks/` | Data fetching (`use-aep-data`, `use-schemas`, …) and graph filtering (`use-filtered-graph`) |
| Store | `src/store/canvas-store.ts` | Zustand store — single source of truth for filters, focus, selection, raw graph |
| Transform | `src/lib/transform.ts` | Converts raw AEP API payloads → ReactFlow `Node[]` / `Edge[]` |
| Types | `src/lib/types.ts` | Shared TypeScript interfaces for AEP entities and graph data |

---

## Key Conventions

### Graph Data Flow

```
AEP API → useAepData (fetches) → transformToGraph (builds nodes/edges)
       → setGraph (into Zustand) → useFilteredGraph (filters/layouts)
       → ErdCanvas (renders via ReactFlow)
```

- `rawNodes` / `rawEdges` in the store are the **unfiltered source of truth** — never mutate them.
- `useFilteredGraph` derives the visible graph via `useMemo`; all filter/layout logic lives there.
- `transformToGraph` in `src/lib/transform.ts` is the only place AEP API payloads are converted to graph nodes/edges.

### Node & Edge IDs

Node IDs follow a strict prefix convention — do not deviate:

| Type | ID format |
|---|---|
| Dataset | `dataset-{datasetId}` |
| Schema | `schema-{schemaId}` |
| Field Group | `fieldgroup-{fieldGroupId}` |
| Flow | `flow-{flowId}` |
| Identity hub | `identity-{namespace}` |
| Summary | `summary-{entityType}` |

Edge IDs: `edge-{type}-{sourceId}-{targetId}` (or `edge-{type}-{descriptorId}`).

### Edge `relationshipType` values

Only these values are valid; they drive styling and filtering:
`dataset-schema` | `schema-fieldgroup` | `schema-schema` | `schema-identity` | `flow-dataset` | `flow-source`

### PK / FK Labels on Edges

- `pkLabel` must reflect the **actual primary identity field** of the target schema (from `pkMap`, built from `xdm:descriptorIdentity` descriptors) — not a hardcoded `"$id"`.
- `fkLabel` must reflect the actual source property from the relationship descriptor.
- Both are set in `buildDatasetSchemaEdges` and `buildSchemaRelationshipEdges` in `transform.ts`.

### Filters & Default State (`canvas-store.ts`)

| Filter | Default | Notes |
|---|---|---|
| `datasets` | `true` | |
| `schemas` | `true` | |
| `fieldGroups` | `true` | Field group nodes are visible in the grid when this is on |
| `flows` | `false` | Off by default — flows are expensive to load and clutter the canvas |
| `profileOnly` | `false` | |
| `showSystem` / `showCustom` | `true` | |
| `connectedFlowsOnly` | `true` | |
| `identityLinks` | `true` | |

### Layout Constants (`use-filtered-graph.ts`)

- `COL_WIDTH = 480` — horizontal gap between grid columns
- `ROW_HEIGHT = 340` — vertical gap between same-column nodes
- Schema view uses separate constants (`SCHEMA_LEVEL_GAP`, `SCHEMA_NODE_GAP`)

### Canvas Settings (`erd-canvas.tsx`)

- `MIN_ZOOM = 0.5` — prevent zooming out too far; keeps nodes readable
- Field group nodes are **not** hidden by default. They render in column 3 of the grid when `filters.fieldGroups` is true. Clicking a schema node collapses/expands its field group children (tracked via `data.children`).

---

## Code Style

- **No one-off code.** Every function should be general enough to support future entity types or relationship types without rewrites.
- **Index-based loops** over `Array.forEach` for hot paths (layout, edge filtering) — avoids closure overhead on large graphs.
- **Memoize derived data** in hooks with `useMemo`; use `useDeferredValue` for filter inputs that drive expensive graph computations.
- **No inline hardcoded strings** for things like node types or relationship types — use the existing constants / type unions.
- **focus on speed and scalability** for any and all fetch requests
