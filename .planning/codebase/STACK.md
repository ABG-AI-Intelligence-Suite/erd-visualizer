# Technology Stack

**Analysis Date:** 2026-03-05

## Languages

**Primary:**
- TypeScript 5.7 - All source files under `src/`

**Secondary:**
- CSS (Tailwind utility classes) - Styling via `src/app/globals.css` and component className attributes

## Runtime

**Environment:**
- Node.js (version not pinned — no `.nvmrc` present)

**Package Manager:**
- pnpm (version not pinned in package.json)
- Lockfile: `pnpm-lock.yaml` present

## Frameworks

**Core:**
- Next.js 14.2 (App Router) - Full-stack React framework; config at `next.config.mjs`
- React 18.3 - UI rendering
- React DOM 18.3 - DOM bindings

**UI Component Library:**
- shadcn/ui (New York style, slate base color) - Headless component pattern using Radix UI primitives; config at `components.json`
- Radix UI primitives (dialog, dropdown-menu, label, popover, scroll-area, separator, slot, tabs, toggle, toggle-group, tooltip) - Unstyled accessible components

**Styling:**
- Tailwind CSS 3.4 - Utility-first CSS; config at `tailwind.config.ts`
- tailwindcss-animate 1.0.7 - Animation utilities
- PostCSS 8.5 + autoprefixer - CSS processing; config at `postcss.config.mjs`
- class-variance-authority 0.7.1 - Typed variant system for component styles
- clsx 2.1.1 + tailwind-merge 3.5.0 - Conditional class merging; utility at `src/lib/utils.ts`

**Graph/Canvas:**
- @xyflow/react 12.4 (React Flow) - Interactive node/edge canvas; primary render surface at `src/components/canvas/erd-canvas.tsx`

**State Management:**
- Zustand 5.0 - Global client state; single store at `src/store/canvas-store.ts`

**Build/Dev:**
- Next.js Turbopack (`next dev --turbo`) - Fast dev bundler
- TypeScript compiler (`npx tsc --noEmit`) - Type checking; config at `tsconfig.json`

## Key Dependencies

**Critical:**
- `@xyflow/react` 12.4 - Entire ERD canvas depends on this; provides Node, Edge types used throughout the codebase
- `zustand` 5.0 - All cross-component state flows through `src/store/canvas-store.ts`
- `xlsx` 0.18.5 - Parses `.xlsx` files for future-state schema imports; used in `src/lib/excel-import.ts`
- `html-to-image` 1.11.13 - PNG/SVG export from the React Flow canvas viewport; used in `src/hooks/use-export.ts`

**UI/UX:**
- `lucide-react` 0.575 - Icon set used across all components
- `cmdk` 1.1.1 - Command palette primitive; used in `src/components/command-palette/command-palette.tsx`

**Infrastructure:**
- `next` 14.2 - Provides both the frontend framework and the API route runtime (`src/app/api/`)

## Configuration

**Environment:**
- Configured via `.env` (copied from `.env.example`; not committed)
- Required vars for auto-fetch on load: `AEP_API_KEY`, `AEP_ORG_ID`, `AEP_BEARER_TOKEN`
- Optional var: `AEP_SANDBOX` (defaults to `"prod"`)
- Exposed to client via `GET /api/config` route (`src/app/api/config/route.ts`)

**TypeScript:**
- Strict mode enabled (`strict: true`)
- Path alias `@/*` maps to `src/*`
- Module resolution: `bundler`
- Config: `tsconfig.json`

**Build:**
- `pnpm run build` — production build via Next.js
- `pnpm run dev` — dev server on port 3000 with Turbopack
- `pnpm run lint` — Next.js ESLint

## Platform Requirements

**Development:**
- Node.js (version unspecified)
- pnpm package manager
- Port 3000 must be free for dev server

**Production:**
- Next.js-compatible Node.js host (e.g., Vercel, self-hosted Node server)
- Filesystem write access required for snapshot persistence (`snapshots/` directory written by `src/app/api/snapshots/route.ts`)

---

*Stack analysis: 2026-03-05*
