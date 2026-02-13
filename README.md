# AEP ERD Visualizer

Interactive entity-relationship diagram for Adobe Experience Platform. Visualizes how datasets, schemas, field groups, and dataflows connect inside AEP.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and enter your AEP credentials in the toolbar.

## Credentials

The app needs four values (entered in the UI toolbar):

| Field | Description |
|---|---|
| **Bearer Token** | Short-lived access token from Adobe Developer Console |
| **Org ID** | Your IMS Org ID (`ABC123@AdobeOrg`) |
| **Sandbox** | AEP sandbox name (defaults to `prod`) |
| **API Key** | Client ID from your Adobe Developer project |

Credentials are sent only as headers through the Next.js API proxy and are never persisted.

## Architecture

```
Browser → Next.js API Route (/api/aep/[...path]) → platform.adobe.io
```

The catch-all API route acts as a proxy to avoid CORS and keep credentials server-side. Client hooks call the proxy, which forwards requests to AEP Catalog, Schema Registry, and Flow Service APIs.

## Entity Types

- **Datasets** (blue) — Data containers linked to schemas
- **Schemas** (purple) — XDM schemas with identity fields and class references
- **Field Groups** (green) — Reusable field collections extended by schemas
- **Dataflows** (orange) — Flow Service flows connecting sources to datasets

## Tech Stack

- Next.js 14 (App Router)
- React Flow (`@xyflow/react`)
- Tailwind CSS
- Zustand
- TypeScript
