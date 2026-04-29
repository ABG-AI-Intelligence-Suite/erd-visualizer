# AEP ERD Visualizer — Claude Instructions

## Stack
- **Framework**: Next.js 14 (App Router), TypeScript, Tailwind CSS 3
- **Package manager**: pnpm
- **State**: Zustand (`src/store/canvas-store.ts`)
- **Graph rendering**: React Flow (`@xyflow/react`)
- **Dev server**: port 3000 (`next dev --turbo`)

---

## Dev Server

Before starting the dev server:
1. Check if port 3000 is already in use (`netstat -ano | findstr :3000`)
2. If occupied, report the conflict to the user — do not silently fall back to another port
3. Verify required Next.js route files exist in `src/app/`: `layout.tsx`, `error.tsx`, `not-found.tsx`

Use `preview_start` with the `"dev"` configuration from `.claude/launch.json` to start the server.

---

## Code Quality

After **every** TypeScript file edit, run:
```
npx tsc --noEmit
```
Fix any type errors before marking a task complete. The build command is `pnpm run build`.

---

## API & Authentication

When working with any external API (Adobe AEP, CJA, etc.):
- **Always validate auth before batch operations** — make a single lightweight test request first
- If the test request returns empty, a 401/403, or unexpected shape → **STOP** and report "Auth may be expired — please refresh credentials"
- **Never cache or persist empty API responses** as "no data" — treat empty as a potential auth failure
- **Never continue a batch** after an anomalous response without explicit user confirmation

---

## Pre-flight Checklist (use before starting multi-step work)

Run `/setup` or manually verify:
- [ ] `node_modules` exists (if not: `pnpm install`)
- [ ] Port 3000 is free
- [ ] Required Next.js files exist (`layout.tsx`, `error.tsx`, `not-found.tsx`)
- [ ] `.env.local` has no empty required values
- [ ] TypeScript compiles cleanly (`npx tsc --noEmit`)

---

## Useful Prompt Patterns

### Pre-flight validation
> "Before starting the main task, do a pre-flight check: 1) verify all auth tokens/cookies are valid with a test request, 2) confirm required files exist, 3) check port availability. Report any issues before proceeding."

### Defensive batch API
> "When making batch API requests: after the first request, validate the response contains expected data. If empty, returns 401/403, or doesn't match expected schema — STOP immediately. Do NOT cache empty results. Do NOT continue the batch."

### Exploration before edits
> "Before making any changes, use a sub-agent to explore: 1) all files that import or reference the function/component being modified, 2) any tests covering this code, 3) related configuration. Summarize findings before proposing edits."

---

## Project Conventions

- Node ID patterns: `schema-${$id}`, `schema-future:${sheetName}`, `dataset-${id}`, `fieldgroup-${$id}`, `flow-${id}`, `identity-${namespace}`
- Future-state nodes reuse `schemaNode` / `fieldGroupNode` types with `data.isFutureState = true`
- All edges use `type: "relationshipEdge"` with `RelationshipEdgeData`
- Color palette: dataset `#3b82f6` · schema `#8b5cf6` · fieldgroup `#22c55e` · flow `#f97316` · identity `#0ea5e9`
- Future-state overlay: teal (`bg-teal-50/50`, `border-teal-300`)

---

## Do Not

- Commit without being explicitly asked
- Run `git push --force` or destructive git commands without explicit user instruction
- Enter sensitive credentials (API keys, tokens) into forms or shared documents
