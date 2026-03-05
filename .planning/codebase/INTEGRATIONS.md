# External Integrations

**Analysis Date:** 2026-03-05

## APIs & External Services

**Adobe Experience Platform (AEP):**
- Adobe AEP REST API - Fetches live datasets, schemas, field groups, flows, and identity namespaces
  - Base URL: `https://platform.adobe.io/data/foundation`
  - Services proxied: `catalog`, `schemaregistry`, `flowservice`
  - Proxy route: `src/app/api/aep/[...path]/route.ts`
  - Client helper: `src/lib/aep-proxy.ts`
  - Auth headers per request: `Authorization: Bearer <token>`, `x-api-key`, `x-gw-ims-org-id`, `x-sandbox-name`
  - Accept headers vary by resource type: `application/vnd.adobe.xed+json` (schemas, fieldgroups), `application/vnd.adobe.xdm-v2+json` (descriptors), `application/vnd.adobe.xed-full+json; version=1` (full schema fetch)

**Adobe Identity Management Service (IMS):**
- Adobe IMS OAuth2 Token Endpoint - Exchanges client credentials for bearer tokens
  - URL: `https://ims-na1.adobelogin.com/ims/token/v3`
  - Grant type: `client_credentials`
  - Token route: `src/app/api/token/route.ts`
  - Default scopes: `openid,AdobeID,read_organizations,additional_info.projectedProductContext,session`
  - Inputs: `clientId`, `clientSecret` (submitted from UI, never persisted server-side)

**Miro:**
- Miro REST API v2 - Exports the ERD graph as a new or existing Miro board
  - Base URL: `https://api.miro.com/v2`
  - Export route: `src/app/api/miro/export/route.ts` (streaming NDJSON response, `maxDuration: 60`)
  - Auth: `Authorization: Bearer <miroToken>` (token provided by user at export time)
  - Creates: boards, frames, shapes, connectors
  - Rate limited client-side: 72ms delay between API calls

## Data Storage

**Databases:**
- None - no database is used. All live data is fetched from the Adobe AEP API on demand.

**File Storage — Snapshots:**
- Local filesystem - ERD graph snapshots are saved as JSON files on the server
  - Directory: `snapshots/` at project root (created on demand)
  - File pattern: `{sandboxHash}-{timestamp}.local.json`
  - Written by: `src/app/api/snapshots/route.ts` (POST)
  - Read by: `src/app/api/snapshots/route.ts` (GET) and `src/app/api/snapshots/[filename]/route.ts`
  - Content: snapshot metadata + raw React Flow nodes and edges
  - Note: snapshots are local to the running server instance; not suitable for multi-instance deployments

**Caching:**
- None - no Redis, Memcached, or in-memory cache. AEP API responses are not cached.

## Authentication & Identity

**Auth Provider:**
- Adobe IMS (OAuth2 client credentials flow)
  - Token fetch via server-side proxy: `POST /api/token`
  - Alternatively, users paste a pre-obtained bearer token directly into the connection form
  - Tokens are stored in Zustand client state only (`src/store/canvas-store.ts` `connection.token`) — not persisted to cookies or localStorage
  - Optional: environment variables `AEP_BEARER_TOKEN`, `AEP_API_KEY`, `AEP_ORG_ID`, `AEP_SANDBOX` enable auto-connect on page load via `src/app/api/config/route.ts`

## Monitoring & Observability

**Error Tracking:**
- Not detected - no Sentry, Datadog, or similar integration present

**Logs:**
- `console.warn` / `console.error` / `console.info` used directly in source
  - Notable logging sites: `src/lib/excel-import.ts` (import warnings), `src/app/api/snapshots/route.ts` (snapshot errors)

## CI/CD & Deployment

**Hosting:**
- Not configured in-repo - no Vercel config, Dockerfile, or deployment manifest present

**CI Pipeline:**
- Not detected - no GitHub Actions, CircleCI, or similar configuration found

## Environment Configuration

**Required env vars (for auto-connect):**
- `AEP_API_KEY` - Adobe API key for the integration
- `AEP_ORG_ID` - Adobe IMS Org ID (format: `<id>@AdobeOrg`)
- `AEP_BEARER_TOKEN` - Pre-obtained bearer token (bypasses IMS token flow)

**Optional env vars:**
- `AEP_SANDBOX` - AEP sandbox name; defaults to `"prod"` if omitted

**Secrets location:**
- `.env` file at project root (not committed; `.env.example` provided as template)
- Env vars are read server-side in `src/app/api/config/route.ts` and exposed to the client as plain JSON — note: bearer token is included in this response

## Webhooks & Callbacks

**Incoming:**
- None - the app does not expose any webhook receiver endpoints

**Outgoing:**
- None - the app does not send outgoing webhook events; all external calls are user-triggered fetches

## File Import

**Excel (.xlsx) Import:**
- Library: `xlsx` 0.18.5
- Parser: `src/lib/excel-import.ts`
- Purpose: Import future-state schema definitions from a structured Excel workbook
- Input: browser `File` object (`.xlsx`)
- Output: React Flow nodes and edges representing future-state schemas and field groups, merged into the canvas store

---

*Integration audit: 2026-03-05*
