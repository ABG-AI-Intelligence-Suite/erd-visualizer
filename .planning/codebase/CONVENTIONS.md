# Coding Conventions

**Analysis Date:** 2026-03-05

## Naming Patterns

**Files:**
- React components: `kebab-case.tsx` — e.g., `dataset-node.tsx`, `node-card.tsx`, `detail-sheet.tsx`
- Hooks: `use-kebab-case.ts` — e.g., `use-aep-data.ts`, `use-filtered-graph.ts`
- Lib utilities: `kebab-case.ts` — e.g., `extract-fields.ts`, `aep-proxy.ts`, `transform.ts`
- Store: `kebab-case-store.ts` — e.g., `canvas-store.ts`
- API routes: Next.js convention, `route.ts` inside `src/app/api/` subdirectories

**React Components:**
- Named exports using `memo`: `export const DatasetNode = memo(DatasetNodeComponent);`
- Internal implementation function uses `ComponentNameComponent` suffix then exported as `ComponentName`
- Page-level sub-components declared with `memo(function NamedFunction...)` inline: `const CanvasArea = memo(function CanvasArea(...))`
- All client components include `"use client"` directive at top of file

**Functions:**
- camelCase for all regular functions: `buildSchemaNodes`, `filterByType`, `applyGridLayout`
- Private helpers (module-scope, not exported) named descriptively: `columnPosition`, `deriveConnectorName`, `shouldSkip`
- Event handlers prefixed with `handle`: `handleConnect`, `handleUpdate`, `handleLoadSample`, `handleClick`
- Callback props prefixed with `on`: `onConnect`, `onUpdate`, `onLoadSample`, `onOpenConnectionDialog`

**Variables:**
- camelCase throughout: `rawNodes`, `schemaIdLookup`, `fieldGroupIds`, `focusExpansionStep`
- Boolean state/props: `isLoading`, `isFutureState`, `isConflict`, `isSelected`, `isSystem`, `profileEnabled`
- Constants (module-scope): SCREAMING_SNAKE_CASE — `COL_WIDTH`, `ROW_HEIGHT`, `NS_PREFIX`, `INITIAL_STEPS`
- Record/Map keys: camelCase strings matching TypeScript interface property names

**TypeScript Types and Interfaces:**
- Interfaces use PascalCase: `AepConnectionConfig`, `DatasetNodeData`, `RelationshipEdgeData`
- Type aliases use PascalCase: `EntityType`, `ViewMode`, `StepStatus`, `RelationshipType`
- All types centralized in `src/lib/types.ts`
- `interface` preferred over `type` for object shapes; `type` used for union types and aliases
- Generic type parameters: single uppercase letter (e.g., `<T>`) in paginate utilities

**Node IDs (documented convention from CLAUDE.md):**
- `schema-${$id}` for schema nodes
- `schema-future:${sheetName}` for future-state schema nodes
- `dataset-${id}` for dataset nodes
- `fieldgroup-${$id}` for field group nodes
- `flow-${id}` for flow nodes
- `identity-${namespace}` for identity hub nodes
- Edge IDs follow `edge-${type}-${sourceId}-${targetId}` pattern

## Code Style

**Formatting:**
- No Prettier or Biome config file found — style is enforced by TypeScript strict mode and Next.js linting
- Single quotes not enforced; double quotes used in JSX attributes and string literals throughout
- Trailing commas present in multi-line destructuring and function parameters
- Semicolons used consistently

**Linting:**
- Next.js built-in ESLint (via `next lint` script in `package.json`)
- No `.eslintrc` config file — uses Next.js defaults
- Occasional `// eslint-disable-line` inline suppression for `react-hooks/exhaustive-deps` in hooks
- Occasional `// eslint-disable-next-line @typescript-eslint/no-explicit-any` for API response parsing

**TypeScript:**
- `strict: true` in `tsconfig.json` — all strict checks enabled
- `noEmit: true` — type-checking only, no emitted JS from tsc
- `moduleResolution: "bundler"` — Next.js/Turbopack resolution
- Type assertions use `as` keyword; `unknown` preferred over `any` for API data
- Type narrowing with `instanceof Error` before accessing `.message`

## Import Organization

**Order (observed pattern):**
1. React and framework imports: `import { memo, useCallback, useMemo } from "react"`
2. Third-party library imports: `import { create } from "zustand"`, `import { Handle, Position } from "@xyflow/react"`
3. Internal type imports (with `type` keyword): `import type { AepConnectionConfig } from "@/lib/types"`
4. Internal implementation imports: `import { useCanvasStore } from "@/store/canvas-store"`
5. Relative imports: `import { NodeCard } from "./node-card"`

**Path Aliases:**
- `@/*` maps to `./src/*` (defined in `tsconfig.json`)
- Use `@/lib/types`, `@/store/canvas-store`, `@/components/ui/badge`, etc.
- Relative imports (`./`) used only within the same directory

**Type-only imports:**
- `import type { ... }` used consistently for type-only imports to prevent runtime cost

## Error Handling

**Pattern in hooks:**
```typescript
try {
  const result = await someAsyncCall();
  return result;
} catch (err) {
  const msg = err instanceof Error ? err.message : "Fallback message";
  setError(msg);
  throw err;
} finally {
  setLoading(false);
}
```

**Pattern in API routes (Next.js):**
```typescript
try {
  // ...operation...
  return NextResponse.json(data);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown proxy error";
  return NextResponse.json({ error: message }, { status: 502 });
}
```

**Pattern in `Promise.allSettled` results:**
```typescript
const result = settledResult.status === "fulfilled"
  ? settledResult.value
  : (errors.push(getSettledError(settledResult)), []);
```

**Error propagation:**
- Hooks set local `error` state AND re-throw so callers can also handle
- `useAepData` accumulates multiple errors in `errors: string[]` array, joins with `"\n\n"`
- API routes always return structured `{ error: string }` JSON, never plain strings

**Type narrowing:**
- Always use `err instanceof Error ? err.message : String(err)` or `"fallback string"`
- Never access `.message` on `unknown` directly

## Logging

**Framework:** Native `console` API (no logging library)

**Patterns:**
- `console.warn` for non-fatal issues: pagination cap hits, schema fetch failures, background update failures
- `console.error` for unexpected failures: Excel import errors, snapshot save failures
- Log messages include module prefix in brackets: `[Flows]`, `[Schemas]`, `[paginateCatalog]`, `[excel-import]`
- No `console.log` in production paths — only `console.warn` and `console.error`

## Comments

**When to Comment:**
- JSDoc-style block comments on complex logic sections using `//` prefixed lines (not `/** */`)
- Inline comments explain non-obvious decisions: API format variants, fallback chains, BFS optimization notes
- Section separators with `// ──` lines used in `canvas-store.ts` to delimit logical groupings

**Examples from codebase:**
```typescript
// allOf is the direct, non-recursive composition: [class, ...fieldGroups].
// Excluding the class ref and known non-field-group prefixes leaves only the field groups.

// Index-based queue avoids O(n^2) shift cost.

// Separate memo'd component so only this button re-renders when the export list changes
```

## Function Design

**Size:** Functions are kept focused. Large orchestration functions (e.g., `fetchAll` in `use-aep-data.ts`) broken into private helper functions (`buildSchemaNodes`, `buildDatasetSchemaEdges`, etc.)

**Parameters:** Prefer typed objects for complex parameter sets. Paginate functions use `PaginateOpts` interface. Graph-building functions receive explicit typed inputs.

**Return Values:** Functions either return data or `void`. Async functions return the value directly (not wrapped in an extra object unless there are multiple things to return). Helpers return typed arrays or Maps.

## Module Design

**Exports:**
- Named exports throughout — no default exports except Next.js page/layout/route conventions
- API route handlers exported as named HTTP method functions: `export async function GET(...)`, `export async function POST(...)`
- Store exported as a named `useCanvasStore` hook: `export const useCanvasStore = create<CanvasStore>(...)`
- Transform function and its input type both exported: `export function transformToGraph(...)`, `export interface TransformInput`

**Barrel Files:**
- Not used — each file imported directly by path

## Color Palette (documented in CLAUDE.md)
- Dataset: `#3b82f6` → Tailwind class `bg-dataset` / `border-l-dataset`
- Schema: `#8b5cf6` → `bg-schema` / `border-l-schema`
- Field group: `#22c55e` → `bg-fieldgroup` / `border-l-fieldgroup`
- Flow: `#f97316` → `bg-flow` / `border-l-flow`
- Identity: `#0ea5e9` → `bg-identity` / `border-l-identity`
- Future-state overlay: teal — `bg-teal-50/50`, `border-teal-300`, `border-dashed`
- Conflict overlay: amber — `ring-2 ring-amber-400`

## State Management Pattern

**Zustand store (`src/store/canvas-store.ts`):**
- Single store `useCanvasStore` holds all global UI and graph state
- Each piece of state paired with a setter: `isLoading` / `setIsLoading`, `error` / `setError`
- Complex mutations use set callbacks: `set((state) => ({ ... }))`
- Components select specific slices: `useCanvasStore((s) => s.selectedNodeId)` — never destructure the whole store

**Local state in hooks:**
- `useState` for loading/error/data within data-fetching hooks
- `useCallback` wrapping all async functions to prevent re-renders
- `useMemo` for expensive derivations in `useFilteredGraph`
- `useDeferredValue` on filter state to keep UI responsive during heavy filtering

---

*Convention analysis: 2026-03-05*
