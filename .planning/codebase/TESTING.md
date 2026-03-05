# Testing Patterns

**Analysis Date:** 2026-03-05

## Test Framework

**Runner:** None — no test framework is installed or configured.

**Assertion Library:** None

**Test Config:** No `jest.config.*`, `vitest.config.*`, or similar file exists.

**Run Commands:**
```bash
# No test commands defined in package.json
# Scripts present: dev, build, start, lint
pnpm run lint    # ESLint via next lint — only quality check available
npx tsc --noEmit # Type checking — used as the primary correctness gate (per CLAUDE.md)
```

## Test File Organization

**Location:** No test files exist in the repository. No `*.test.*` or `*.spec.*` files found anywhere in `src/` or the project root.

**Naming:** N/A

**Structure:** N/A

## Current Quality Gates

In the absence of automated tests, the project uses these correctness mechanisms:

**TypeScript strict mode:**
- `strict: true` in `tsconfig.json` covers: `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, etc.
- Run after every file edit: `npx tsc --noEmit` (required per CLAUDE.md instructions)
- This is the primary automated quality gate

**Next.js ESLint:**
- `pnpm run lint` runs `next lint`
- Default Next.js ruleset with occasional inline `eslint-disable` suppressions

**Manual validation approach (per CLAUDE.md):**
- Auth validation: make a single test request before batch operations
- Stop on empty/401/403 API responses — treat as auth failure, not "no data"
- Pre-flight checklist: `node_modules`, port 3000, required Next.js files, `.env.local` values, clean tsc

## Test Coverage Gaps

Given the complete absence of tests, all areas are untested:

**Critical untested logic:**

**`src/lib/transform.ts`:**
- `transformToGraph` — core graph-building function converting raw AEP API data into React Flow nodes and edges
- All `build*Nodes` and `build*Edges` helpers
- `isSystemId`, `buildSchemaIdLookup`, `buildIdentityHubsAndEdges`
- Risk: graph rendering bugs (missing edges, wrong IDs) would only surface visually

**`src/lib/extract-fields.ts`:**
- `extractFields` — recursive property traversal with depth limit
- `extractSchemaFields` — handles `properties` and `allOf` variants
- `buildDescriptorInfo` — primary/foreign key classification
- Risk: incorrect field classification (PK/FK) would not be caught until runtime

**`src/lib/paginate.ts`:**
- `paginateCatalog`, `paginateSchemaRegistry`, `paginateFlowService` — all three pagination strategies
- Retry logic, page-cap warnings, URL construction
- Risk: silent data truncation on large sandboxes

**`src/lib/aep-proxy.ts`:**
- `buildAepUrl` — URL construction from path segments and service map
- `buildAepHeaders` — Accept header selection logic for schema registry
- Risk: wrong headers silently cause API to return wrong data format

**`src/hooks/use-filtered-graph.ts`:**
- `computeDistances`, `applySchemaRelationshipLayout`, `limitFocusGraph`
- Filter combinations: `profileOnly`, `showSystem`/`showCustom`, `connectedFlowsOnly`, `identityLinks`
- Focus mode pagination logic
- Risk: filter interactions produce wrong visible node sets

**`src/lib/excel-import.ts`:**
- Future-state Excel import parsing
- Risk: malformed spreadsheets silently produce incorrect graph nodes

**`src/store/canvas-store.ts`:**
- `mergeGraph`, `removeEntityTypes`, `importFutureState`, `clearFutureState`, `toggleFutureStateVisible`
- State consistency across future-state toggle operations
- Risk: stale nodes/edges remaining after clear operations

## Recommended Testing Setup

If tests are added, the following setup matches the existing stack:

**Recommended framework:**
```bash
pnpm add -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

**Recommended config (`vitest.config.ts`):**
```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

**Recommended test file placement:**
- Co-located with source: `src/lib/transform.test.ts` next to `src/lib/transform.ts`
- Or in a dedicated directory: `src/__tests__/`

**Priority order for first tests:**
1. `src/lib/transform.ts` — pure functions, no React, easy to unit test
2. `src/lib/extract-fields.ts` — pure functions, critical for correct field display
3. `src/lib/paginate.ts` — fetch mocking, important for pagination correctness
4. `src/lib/aep-proxy.ts` — pure URL/header builders, no async

## Mocking Guidance (for future tests)

**Fetch mocking:**
```typescript
// Vitest pattern for mocking fetch
import { vi } from "vitest";

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ results: [...] }),
  text: async () => JSON.stringify({ results: [...] }),
} as Response);
```

**Store mocking for component tests:**
```typescript
// Use actual store but reset between tests
import { useCanvasStore } from "@/store/canvas-store";

beforeEach(() => {
  useCanvasStore.setState({
    rawNodes: [],
    rawEdges: [],
    // ...other defaults
  });
});
```

**What to mock:**
- `fetch` calls in paginate utilities
- File system (`fs`) in API route tests
- `crypto` in snapshot route tests

**What NOT to mock:**
- Pure transform/utility functions — test them directly with real inputs
- Zustand store state — use actual store with `setState` for setup

## Example Test Patterns (for pure lib functions)

**Unit test for transform:**
```typescript
import { describe, it, expect } from "vitest";
import { transformToGraph, isSystemId } from "@/lib/transform";

describe("isSystemId", () => {
  it("identifies XDM system IDs", () => {
    expect(isSystemId("https://ns.adobe.com/xdm/context/profile")).toBe(true);
    expect(isSystemId("https://ns.adobe.com/tenant/schemas/custom")).toBe(false);
  });
});

describe("transformToGraph", () => {
  it("builds dataset and schema nodes with an edge between them", () => {
    const input = {
      datasets: [{ id: "ds1", name: "My Dataset", schemaRef: { id: "_tenant/schemas/abc", contentType: "application/json" }, created: 0, updated: 0 }],
      schemas: [{ $id: "https://ns.adobe.com/tenant/schemas/abc", title: "My Schema", type: "object" }],
      fieldGroups: [],
      flows: [],
      connections: [],
      descriptors: [],
    };
    const { nodes, edges } = transformToGraph(input);
    expect(nodes.some((n) => n.id === "dataset-ds1")).toBe(true);
    expect(edges.some((e) => e.source === "dataset-ds1")).toBe(true);
  });
});
```

---

*Testing analysis: 2026-03-05*
