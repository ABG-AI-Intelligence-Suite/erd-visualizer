# Codebase Concerns

**Analysis Date:** 2026-03-05

## Security Considerations

**Credentials exposed via unauthenticated API endpoint:**
- Risk: `GET /api/config` returns `AEP_BEARER_TOKEN`, `AEP_ORG_ID`, `AEP_API_KEY`, and `AEP_SANDBOX` from environment variables to any browser or network client with no authentication check.
- Files: `src/app/api/config/route.ts`
- Current mitigation: The endpoint is only served from the local dev server; there is no production deployment target currently. The `.env.example` documents that `.env` must not be committed.
- Recommendations: Add an authentication guard or restrict this endpoint to server-side consumption only. If the app is ever deployed remotely, this endpoint leaks all credentials to anyone who can reach the server. Consider removing the endpoint and using `server-only` imports or Next.js server actions instead.

**Credential profiles stored unencrypted in `localStorage`:**
- Risk: API keys and org IDs are written to browser `localStorage` in plaintext via `useCredentialProfiles`. Any script with same-origin access (XSS) or a shared browser profile can read them.
- Files: `src/hooks/use-credential-profiles.ts`
- Current mitigation: Bearer tokens are explicitly excluded from profile storage; only `orgId`, `apiKey`, and `sandbox` are saved.
- Recommendations: Document that only non-secret identifiers (API Key / Org ID) should be saved, not bearer tokens. Consider encrypting with a user-provided passphrase or warning users about the risk.

**Bearer token transmitted as a plain HTTP header through the proxy:**
- Risk: Every AEP API call passes the bearer token as `x-aep-token` from the browser to the local Next.js server. If the server is not localhost-bound, this token is visible in plain-text HTTP traffic.
- Files: `src/app/api/aep/[...path]/route.ts`, `src/hooks/use-schemas.ts`
- Current mitigation: This is a local dev tool; the proxy exists to avoid CORS issues.
- Recommendations: Note this design is safe only for local use. Add a warning in README if remote deployment is ever considered.

**Snapshot files saved to disk contain full graph data including `orgId`:**
- Risk: `POST /api/snapshots` writes a JSON file including `orgId` and `sandboxName` to the `snapshots/` directory. The `token` and `apiKey` are stripped (`_token`, `_apiKey` destructuring), but org identifiers persist on disk.
- Files: `src/app/api/snapshots/route.ts`
- Current mitigation: `token` and `apiKey` are not written to snapshot files (destructured as `_token`, `_apiKey`). The `snapshots/` directory is local only.
- Recommendations: Confirm `snapshots/` is in `.gitignore` to prevent accidental org ID leakage. Currently it is NOT excluded from git — the `snapshots/` directory and 9 `.local.json` files are committed to the repository.

**Committed snapshot files contain `orgId` data:**
- Risk: 9 snapshot files in `snapshots/` are committed and contain `orgId` and `sandboxName` metadata.
- Files: `snapshots/13939128-*.local.json` (9 files)
- Current mitigation: None — files are committed.
- Recommendations: Add `snapshots/*.local.json` to `.gitignore` immediately. Consider using `git filter-branch` or BFG to remove historical snapshots if the repository is shared.

---

## Tech Debt

**`eslint-disable` for missing `useEffect` dependencies:**
- Issue: Three `useEffect`/`useCallback` hooks suppress the exhaustive-deps lint rule rather than restructuring the code to avoid stale closures.
- Files:
  - `src/hooks/use-aep-data.ts:444` — `fetchMissingConnections` omitted from `fetchUpdate` dependency array
  - `src/components/toolbar/connection-form.tsx:157` — `open` effect omits all dependencies intentionally
  - `src/components/ui/export-toast.tsx:30` — `miroToast` effect omits `miroToast` from deps
- Impact: Potential stale closures that could cause subtle bugs when connection config changes mid-fetch.
- Fix approach: Restructure `fetchUpdate` to read `useCanvasStore.getState()` imperatively (already partially done for `rawNodes`), eliminating the need for the missing dependency.

**`any` types in pagination utilities:**
- Issue: `paginateSchemaRegistry` and `paginateFlowService` parse API responses as `any`, losing type safety for the intermediate response body before extracting `data.results` and `data.items`.
- Files: `src/lib/paginate.ts:41`, `src/lib/paginate.ts:111`
- Impact: Type errors in the pagination shape (e.g. API returning `items` instead of `results`) will not be caught at compile time.
- Fix approach: Define typed interfaces for the pagination envelope (e.g. `{ results: T[]; _page?: { next?: string } }`) and replace the `any` casts.

**`[key: string]: unknown` index signatures on all node data interfaces:**
- Issue: Every node data type (`DatasetNodeData`, `SchemaNodeData`, etc.) has `[key: string]: unknown` as a top-level index signature, required by `@xyflow/react`'s `NodeData` constraint. This erodes type safety throughout component code where `node.data` is accessed.
- Files: `src/lib/types.ts`
- Impact: Downstream code frequently casts `node.data as Record<string, unknown>` or uses type assertions instead of typed access. Bugs in data shape are not caught at compile time.
- Fix approach: This is a React Flow constraint. Mitigate by using typed accessor functions that take `Node` and return the correctly-typed data, centralizing the cast.

**`buildSchemaIdLookup` function duplicated:**
- Issue: Identical or near-identical `buildSchemaIdLookup` logic exists in both `src/lib/transform.ts` and `src/hooks/use-aep-data.ts`.
- Files: `src/lib/transform.ts:43`, `src/hooks/use-aep-data.ts:81`
- Impact: Schema ID resolution bugs must be fixed in two places; implementations could diverge.
- Fix approach: Export `buildSchemaIdLookup` from `src/lib/transform.ts` and import it in `use-aep-data.ts`.

**`use-filtered-graph.ts` is large and handles multiple concerns:**
- Issue: At 667 lines, `use-filtered-graph.ts` combines layout algorithms (grid, BFS relationship layout, focus layout), filtering logic, and collapse/summary-node generation in a single `useMemo`. It is the largest source file.
- Files: `src/hooks/use-filtered-graph.ts`
- Impact: Difficult to test individual layout algorithms in isolation; any change risks side effects across filtering modes.
- Fix approach: Extract layout functions (`applyGridLayout`, `applySchemaRelationshipLayout`, `limitFocusGraph`) into a separate `src/lib/layout.ts` utility module.

**Connection form `useEffect` depends on `open` only and intentionally ignores all other deps:**
- Issue: `connection-form.tsx:157` uses `[open]` as the only dependency with an explicit `eslint-disable` comment. On each open, it reads `loadedTypes`, `isConnected`, `connection`, and `activeSnapshotLabel` from the store but none of these are dependencies. A render where `open` stays `true` but `connection` changes would not re-run initialization.
- Files: `src/components/toolbar/connection-form.tsx:121-157`
- Impact: Low in practice since the dialog is always closed before connection changes, but fragile if dialog state is refactored.
- Fix approach: Use `useCanvasStore.getState()` inside the effect to read current store values, removing the need to suppress the lint rule.

---

## Performance Bottlenecks

**Schema fetching: one HTTP request per schema ID:**
- Problem: `fetchSchemasByIds` in `use-schemas.ts` fires `Promise.allSettled` over every schema ID with no request batching or concurrency limit. For large orgs with 100+ schemas, this creates 100+ simultaneous fetch requests.
- Files: `src/hooks/use-schemas.ts:106-166`
- Cause: Adobe's Schema Registry API does not support batch fetch by multiple IDs, so individual requests are unavoidable. However, there is no concurrency cap (e.g., `p-limit`).
- Improvement path: Add a concurrency limiter (e.g., process 10 schemas at a time) to avoid hitting rate limits and overwhelming the browser's HTTP connection pool.

**`useFilteredGraph` runs entirely synchronously on every store change:**
- Problem: The `useMemo` in `use-filtered-graph.ts` recomputes the full graph layout (including BFS traversal over all nodes and edges) whenever any of its 8 dependencies change. On large graphs (500+ nodes), layout recomputation can block the main thread.
- Files: `src/hooks/use-filtered-graph.ts:387-666`
- Cause: `useDeferredValue` is used for filters, focus, and viewMode, but not for `rawNodes`/`rawEdges` themselves, so new data from the store triggers synchronous recomputation.
- Improvement path: Wrap `rawNodes` and `rawEdges` with `useDeferredValue` as well, or move layout computation to a Web Worker.

**Miro export: sequential API calls with `sleep(72ms)` between each:**
- Problem: The Miro export route creates board shapes and connectors one at a time with a 72ms sleep between each request to respect Miro's rate limit. For a 200-node export, this takes approximately 14+ seconds (200 * 72ms for shapes + connectors).
- Files: `src/app/api/miro/export/route.ts:69-226`
- Cause: Miro API rate limiting; the 72ms delay was chosen empirically.
- Improvement path: Use Miro's bulk creation endpoints if available, or batch requests in groups of ~5 with a single sleep between groups.

---

## Fragile Areas

**Snapshot DELETE functionality is absent:**
- Files: `src/app/api/snapshots/route.ts`, `src/app/api/snapshots/[filename]/route.ts`
- Why fragile: The snapshot API only implements `GET` (list), `POST` (create), and `GET /:filename` (load). There is no `DELETE` endpoint or UI to remove snapshots. The `snapshots/` directory will grow unboundedly.
- Safe modification: Add a `DELETE /api/snapshots/:filename` route that validates the `VALID_FILENAME` regex before deletion, and add a delete button in the snapshot list UI in `connection-form.tsx`.
- Test coverage: None.

**Snapshot filename regex matches only 8-char hex prefix:**
- Files: `src/app/api/snapshots/[filename]/route.ts:6`
- Why fragile: `VALID_FILENAME = /^[a-f0-9]{8}-\d+\.local\.json$/` validates filenames, but the 8-char hex is derived from a SHA256 of `orgId::sandbox`. If the hashing logic changes, existing snapshot files cannot be loaded.
- Safe modification: Treat the regex as a security boundary only (preventing path traversal), not as a versioning mechanism.

**Excel import column names are case-sensitive hardcoded strings:**
- Files: `src/lib/excel-import.ts:69-84`
- Why fragile: Column detection uses exact string constants (`"Schema name"`, `"XDM path"`, `"Business field"`, etc.). A spreadsheet with a trailing space, different capitalisation, or a BOM in the header row will silently produce empty results.
- Safe modification: Normalise column names (trim + case-fold) before matching against constants during `isSchemaSheet` and `cellStr` lookups.
- Test coverage: None.

**Identity hub creation requires exactly 2+ schemas sharing a namespace:**
- Files: `src/lib/transform.ts:388`
- Why fragile: `buildIdentityHubsAndEdges` creates an identity node only when `schemas.length >= 2` for a namespace. A future-state schema with a valid namespace that connects to exactly one existing schema will not produce an identity hub, and its cross-identity edges in Excel import will silently produce no hub to connect to.
- Safe modification: Document this intentional threshold or relax it to 1 if single-schema identity hubs are desired.

**`use-filtered-graph` focus mode uses a 3-pass fixed edge expansion:**
- Files: `src/hooks/use-filtered-graph.ts:313-334`
- Why fragile: `limitFocusGraph` expands connected nodes using exactly 3 passes over all edges. If a graph has long chains (e.g., flow → dataset → schema → fieldgroup → fieldgroup), 3 passes may not reach all relevant nodes, causing edges to point to hidden nodes.
- Safe modification: Replace the fixed 3-pass loop with a BFS/flood-fill that converges.

**`detailPanelPinned` state not persisted:**
- Files: `src/store/canvas-store.ts:252`
- Why fragile: The pinned state of the detail panel resets to `false` on every page load. This is minor UX friction but could confuse users expecting persistence.
- Safe modification: Persist `detailPanelPinned` in `localStorage` alongside other UI preferences.

---

## Test Coverage Gaps

**No tests exist anywhere in the codebase:**
- What's not tested: All business logic including graph transformation, pagination, schema ID resolution, Excel import, URL/header construction for the AEP proxy, and all API routes.
- Files: Every file in `src/` — no `*.test.*` or `*.spec.*` files found.
- Risk: Regressions in schema ID normalisation (`buildSchemaIdLookup`), pagination edge cases (retry logic in `paginateSchemaRegistry`), Excel parsing (namespace extraction regex, FAC candidate parsing), and Miro export stream handling are entirely invisible.
- Priority: High

**Critical untested logic — schema ID normalisation:**
- What's not tested: `buildSchemaIdLookup` in `src/lib/transform.ts` and `src/hooks/use-aep-data.ts` handles NS prefix conversion (`https://ns.adobe.com/` ↔ `_`-prefixed shorthand). Bugs here cause missing edges across the entire graph.
- Files: `src/lib/transform.ts:43-59`, `src/hooks/use-aep-data.ts:81-90`
- Risk: Silent data loss (edges not rendered) with no error surfaced to the user.
- Priority: High

**Critical untested logic — paginate retry and truncation:**
- What's not tested: `paginateSchemaRegistry` retries on non-first-page failures (up to 2 retries), silently stops on page cap, and reconstructs the next-page URL from the proxy base path. These are complex stateful conditions.
- Files: `src/lib/paginate.ts`
- Risk: Silently truncated results at page 50 or incorrect next-page URL construction causes incomplete data loads.
- Priority: High

**Critical untested logic — Excel import namespace extraction:**
- What's not tested: `extractNamespace` parses free-text values like `"Yes (email identity recommended via …)"` and `"Optional (email/phone)"`. The regex and first-token split logic has multiple edge cases.
- Files: `src/lib/excel-import.ts:121-142`
- Risk: Incorrect namespace extraction causes identity edges to link future-state schemas to wrong identity hubs.
- Priority: Medium

---

## Missing Critical Features

**No snapshot deletion UI or API:**
- Problem: Users cannot delete snapshots from the UI or API. The `snapshots/` directory accumulates files indefinitely.
- Blocks: Snapshot management workflow; org ID data cleanup.

**No token expiry detection or refresh:**
- Problem: Bearer tokens expire (typically 24 hours for Adobe IMS). When a token expires mid-fetch, individual schema requests return 401s that are silently swallowed as `null` results (`fetchSchemaFromRegistry` returns `{ status: "fatal" }` only on the first-page 401; later pages silently break). The user sees partial data with no warning.
- Files: `src/hooks/use-schemas.ts:79`, `src/lib/paginate.ts:30-31`
- Blocks: Reliable large-org data loads.

**No rate-limit backoff for schema fetching:**
- Problem: `fetchSchemasByIds` fires all schema requests concurrently with no rate-limit handling. Adobe's Schema Registry returns 429 when the rate limit is hit, but there is no backoff or retry for 429 responses in the per-schema fetch path (only in `registryErrorMessage` which formats the error string but doesn't retry).
- Files: `src/hooks/use-schemas.ts:106-166`
- Blocks: Successful loads for orgs with 50+ schemas.

---

## Dependencies at Risk

**`xlsx` package (version 0.18.5) — unmaintained:**
- Risk: The `xlsx` (SheetJS community edition) package at `^0.18.5` has not had a significant release since 2023 and has known security advisories. The Pro edition has taken over active development.
- Impact: Security vulnerabilities when parsing untrusted Excel files; no upstream fixes for bugs.
- Migration plan: Evaluate `exceljs` as a drop-in replacement for the Excel import feature in `src/lib/excel-import.ts`, or restrict file input to trusted internal files only.

**`html-to-image` DOM-based PNG/SVG export:**
- Risk: `html-to-image` uses `foreignObject` in SVG, which has known rendering inconsistencies across browsers and fails entirely on some CSS features (e.g., CSS variables, some Tailwind utilities). Export quality degrades on complex graphs.
- Impact: PNG/SVG exports may produce blank or incorrectly rendered areas.
- Migration plan: Use `@nivo` canvas rendering or `react-flow`'s built-in `getViewportForBounds` combined with HTML Canvas directly for more reliable exports.

---

*Concerns audit: 2026-03-05*
