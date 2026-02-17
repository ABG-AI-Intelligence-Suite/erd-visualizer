# AEP ERD Visualizer — Technical Overview & API Access Request

## What Is It?

The AEP ERD Visualizer is an internal web tool that generates an interactive Entity-Relationship Diagram (ERD) of our Adobe Experience Platform (AEP) environment. It connects to AEP APIs, pulls metadata about our datasets, schemas, field groups, and dataflows, and renders them as a visual graph showing how everything relates to each other.

This gives our team a live, navigable map of our AEP data architecture — something that doesn't exist out of the box in AEP.

---

## What APIs Does It Need?

The tool requires **read-only** access to three Adobe Platform API services. All calls are GET requests — the tool does not create, modify, or delete anything.

### 1. Catalog API — Datasets

| Detail | Value |
|--------|-------|
| **Base URL** | `https://platform.adobe.io/data/foundation/catalog` |
| **Endpoint** | `GET /dataSets?limit=200&properties=name,description,schemaRef,tags,unifiedProfile,unifiedIdentity,fileDescription` |
| **Purpose** | Retrieves the list of datasets and their schema references, profile enablement status, and file format metadata |

### 2. Schema Registry API — Schemas, Field Groups & Descriptors

| Detail | Value |
|--------|-------|
| **Base URL** | `https://platform.adobe.io/data/foundation/schemaregistry` |

| Endpoint | Purpose |
|----------|---------|
| `GET /tenant/schemas?orderby=title&limit=200` | Retrieves all tenant-scoped XDM schemas |
| `GET /tenant/fieldgroups?orderby=title&limit=200` | Retrieves reusable field group definitions |
| `GET /tenant/descriptors?limit=500` | Retrieves identity and relationship descriptors that define how schemas relate to each other |

### 3. Flow Service API — Dataflows & Connections

| Detail | Value |
|--------|-------|
| **Base URL** | `https://platform.adobe.io/data/foundation/flowservice` |

| Endpoint | Purpose |
|----------|---------|
| `GET /flows?limit=200` | Retrieves data integration flows (e.g., Salesforce ingestion) |
| `GET /connections?limit=200` | Retrieves source and target connection configurations |

### Summary of All API Calls

| # | Method | Full URL | Data Returned |
|---|--------|----------|---------------|
| 1 | GET | `platform.adobe.io/data/foundation/catalog/dataSets` | Dataset names, schema links, profile flags |
| 2 | GET | `platform.adobe.io/data/foundation/schemaregistry/tenant/schemas` | Schema definitions and class types |
| 3 | GET | `platform.adobe.io/data/foundation/schemaregistry/tenant/descriptors` | Identity markers, schema-to-schema relationships |
| 4 | GET | `platform.adobe.io/data/foundation/schemaregistry/tenant/fieldgroups` | Reusable field group definitions |
| 5 | GET | `platform.adobe.io/data/foundation/flowservice/flows` | Dataflow configurations |
| 6 | GET | `platform.adobe.io/data/foundation/flowservice/connections` | Source/target connector details |

**Total: 6 read-only GET endpoints.**

---

## What Headers / Credentials Are Required?

All requests include these standard Adobe Platform headers:

```
Authorization: Bearer {access_token}
x-api-key: {client_id}
x-gw-ims-org-id: {ims_org_id}
x-sandbox-name: {sandbox_name}
Accept: application/vnd.adobe.xed-full+json; version=1
Content-Type: application/json
```

### Credentials Needed (from Adobe Developer Console)

| Credential | Description | Example Format |
|------------|-------------|----------------|
| **Bearer Token** | Short-lived OAuth access token | `eyJhbGciOi...` (JWT) |
| **API Key (Client ID)** | From an Adobe Developer Console project | UUID string |
| **IMS Org ID** | Organization identifier | `ABC123@AdobeOrg` |
| **Sandbox Name** | AEP sandbox to query | `prod` (default) |

### What We Need From IT

An **Adobe Developer Console project** (or Service Account integration) with the following API permissions:

- **Experience Platform API** — read access to Catalog, Schema Registry, and Flow Service
- Scoped to the appropriate IMS Org and sandbox(es)

The tool only requires **read** permissions. It never writes, updates, or deletes any data.

---

## What Does The Tool Produce?

### Interactive ERD Canvas

The tool renders a visual graph with four entity types:

| Entity Type | Color | What It Represents |
|-------------|-------|--------------------|
| **Datasets** | Blue | Data containers in AEP (e.g., "Customer Profiles", "Web Events") |
| **Schemas** | Purple | XDM schema definitions that structure the data |
| **Field Groups** | Green | Reusable collections of fields shared across schemas |
| **Dataflows** | Orange | Ingestion pipelines (e.g., Salesforce CRM sync) |

### Relationships Visualized

| Relationship | Meaning |
|-------------|---------|
| Dataset → Schema | "This dataset is structured by this schema" |
| Schema → Field Group | "This schema includes these field groups" |
| Schema → Schema | "This schema has a relationship to this other schema" (e.g., lookup) |
| Dataflow → Dataset | "This dataflow ingests into this dataset" |

### User Interactions

- **Pan & zoom** across the diagram
- **Click any node** to see full metadata (IDs, descriptions, field counts, identity fields, profile enablement, etc.)
- **Filter by entity type** to focus on specific areas (e.g., show only datasets and schemas)

---

## Architecture & Security

```
Browser (localhost:3000)
    |
    |  credentials sent via HTTPS
    v
Next.js API Proxy (server-side)
    |
    |  Authorization header added server-side
    v
platform.adobe.io APIs (read-only GET requests)
```

**Key security points:**

- Credentials are entered per-session and stored only in browser memory — never persisted to disk or database
- All Adobe API calls go through a server-side proxy — credentials are never exposed in client-side JavaScript
- The tool runs locally (`localhost:3000`) — it is not publicly hosted
- All communication with Adobe APIs is over HTTPS
- **Strictly read-only** — zero write/update/delete operations

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 |
| Language | TypeScript |
| Visualization | React Flow |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Package Manager | pnpm |

---

## Sample Output (Mock Data)

When connected, the tool visualizes entities like:

**Datasets:** Customer Profiles (CRM), Web Experience Events (clickstream), Product Catalog, Email Interactions

**Schemas:** Customer Profile Schema, Web Experience Event Schema, Product Schema, Email Interaction Schema

**Field Groups:** Person Identity Core, Web Behavior Tracking, Product Details, Email Engagement

**Dataflows:** CRM Ingest Flow (Salesforce → AEP), Web Analytics Flow (Adobe Analytics → AEP)

Each of these appears as an interactive node on the canvas, connected by edges that show the data architecture at a glance.

---

## Why We Need This

- AEP does not provide a built-in way to visualize the full data architecture across datasets, schemas, field groups, and dataflows in one view
- Understanding relationships between these entities is critical for data modeling, troubleshooting, and onboarding new team members
- This tool gives a real-time, always-accurate picture of our AEP environment with zero manual documentation effort
