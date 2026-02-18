import type {
  AepDataset,
  AepSchema,
  AepFieldGroup,
  AepFlow,
  AepConnection,
  AepDescriptor,
} from "./types";
import type { TransformInput } from "./transform";

const SCHEMA_CUSTOMER = "https://ns.adobe.com/tenant/schemas/customer-profile";
const SCHEMA_WEB = "https://ns.adobe.com/tenant/schemas/web-event";
const SCHEMA_PRODUCT = "https://ns.adobe.com/tenant/schemas/product";
const SCHEMA_EMAIL = "https://ns.adobe.com/tenant/schemas/email-interaction";

const FG_PERSON = "https://ns.adobe.com/tenant/fieldgroups/person-identity";
const FG_WEB = "https://ns.adobe.com/tenant/fieldgroups/web-behavior";
const FG_PRODUCT = "https://ns.adobe.com/tenant/fieldgroups/product-details";
const FG_EMAIL = "https://ns.adobe.com/tenant/fieldgroups/email-engagement";

const datasets: AepDataset[] = [
  {
    id: "ds-customer-profiles",
    name: "Customer Profiles",
    description: "Unified customer profile records from CRM system",
    schemaRef: { id: SCHEMA_CUSTOMER, contentType: "application/vnd.adobe.xed+json" },
    tags: { "aep/siphon/partitions": ["_ACP_DATE"] },
    created: 1700000000000,
    updated: 1700100000000,
    unifiedProfile: { isEnabled: true },
    unifiedIdentity: { isEnabled: true },
    fileDescription: { format: "parquet" },
  },
  {
    id: "ds-web-events",
    name: "Web Experience Events",
    description: "Clickstream and web interaction events from Analytics",
    schemaRef: { id: SCHEMA_WEB, contentType: "application/vnd.adobe.xed+json" },
    tags: { "aep/siphon/partitions": ["_ACP_DATE"] },
    created: 1700000000000,
    updated: 1700200000000,
    unifiedProfile: { isEnabled: true },
    fileDescription: { format: "parquet" },
  },
  {
    id: "ds-product-catalog",
    name: "Product Catalog",
    description: "Master product catalog with SKU, pricing, and category data",
    schemaRef: { id: SCHEMA_PRODUCT, contentType: "application/vnd.adobe.xed+json" },
    created: 1700000000000,
    updated: 1700050000000,
    fileDescription: { format: "parquet" },
  },
  {
    id: "ds-email-interactions",
    name: "Email Interactions",
    description: "Email open, click, and bounce events from Campaign",
    schemaRef: { id: SCHEMA_EMAIL, contentType: "application/vnd.adobe.xed+json" },
    tags: { "aep/siphon/partitions": ["_ACP_DATE"] },
    created: 1700000000000,
    updated: 1700150000000,
    unifiedProfile: { isEnabled: true },
    fileDescription: { format: "parquet" },
  },
];

const schemas: AepSchema[] = [
  {
    $id: SCHEMA_CUSTOMER,
    title: "Customer Profile Schema",
    description: "XDM Individual Profile with CRM attributes",
    type: "object",
    "meta:class": "https://ns.adobe.com/xdm/context/profile",
    "meta:extends": [FG_PERSON, FG_EMAIL],
    "meta:sandboxId": "prod",
    "meta:sandboxType": "production",
    properties: {
      personId: { type: "string" },
      firstName: { type: "string" },
      lastName: { type: "string" },
      email: { type: "string" },
      loyaltyTier: { type: "string" },
      lifetimeValue: { type: "number" },
    },
  },
  {
    $id: SCHEMA_WEB,
    title: "Web Experience Event Schema",
    description: "XDM ExperienceEvent for web interactions",
    type: "object",
    "meta:class": "https://ns.adobe.com/xdm/context/experienceevent",
    "meta:extends": [FG_WEB, FG_PERSON],
    "meta:sandboxId": "prod",
    "meta:sandboxType": "production",
    properties: {
      visitorId: { type: "string" },
      personId: { type: "string" },
      pageUrl: { type: "string" },
      eventType: { type: "string" },
      timestamp: { type: "string" },
    },
  },
  {
    $id: SCHEMA_PRODUCT,
    title: "Product Schema",
    description: "Record schema for product catalog entries",
    type: "object",
    "meta:class": "https://ns.adobe.com/xdm/context/record",
    "meta:extends": [FG_PRODUCT],
    "meta:sandboxId": "prod",
    "meta:sandboxType": "production",
    properties: {
      sku: { type: "string" },
      productName: { type: "string" },
      category: { type: "string" },
      price: { type: "number" },
    },
  },
  {
    $id: SCHEMA_EMAIL,
    title: "Email Interaction Schema",
    description: "ExperienceEvent for email engagement tracking",
    type: "object",
    "meta:class": "https://ns.adobe.com/xdm/context/experienceevent",
    "meta:extends": [FG_EMAIL, FG_PERSON],
    "meta:sandboxId": "prod",
    "meta:sandboxType": "production",
    properties: {
      recipientId: { type: "string" },
      emailAction: { type: "string" },
      campaignId: { type: "string" },
      timestamp: { type: "string" },
      linkClicked: { type: "string" },
    },
  },
];

const fieldGroups: AepFieldGroup[] = [
  {
    $id: FG_PERSON,
    title: "Person Identity Core",
    description: "Core person identity fields including name and email",
    type: "object",
    "meta:extensible": true,
    "meta:intendedToExtend": [
      "https://ns.adobe.com/xdm/context/profile",
      "https://ns.adobe.com/xdm/context/experienceevent",
    ],
    properties: {
      personId: { type: "string" },
      firstName: { type: "string" },
      lastName: { type: "string" },
      email: { type: "string" },
      phoneNumber: { type: "string" },
    },
  },
  {
    $id: FG_WEB,
    title: "Web Behavior Tracking",
    description: "Web analytics and clickstream behavior fields",
    type: "object",
    "meta:extensible": true,
    "meta:intendedToExtend": ["https://ns.adobe.com/xdm/context/experienceevent"],
    properties: {
      pageUrl: { type: "string" },
      pageTitle: { type: "string" },
      referrer: { type: "string" },
      eventType: { type: "string" },
      sessionId: { type: "string" },
      deviceType: { type: "string" },
    },
  },
  {
    $id: FG_PRODUCT,
    title: "Product Details",
    description: "Product catalog attributes for SKU-level data",
    type: "object",
    "meta:extensible": true,
    "meta:intendedToExtend": ["https://ns.adobe.com/xdm/context/record"],
    properties: {
      sku: { type: "string" },
      productName: { type: "string" },
      category: { type: "string" },
      price: { type: "number" },
      brand: { type: "string" },
    },
  },
  {
    $id: FG_EMAIL,
    title: "Email Engagement",
    description: "Email campaign interaction and engagement metrics",
    type: "object",
    "meta:extensible": true,
    "meta:intendedToExtend": ["https://ns.adobe.com/xdm/context/experienceevent"],
    properties: {
      emailAction: { type: "string" },
      campaignId: { type: "string" },
      campaignName: { type: "string" },
      linkClicked: { type: "string" },
    },
  },
];

const connections: AepConnection[] = [
  {
    id: "conn-crm-source",
    name: "CRM Source (Salesforce)",
    description: "Salesforce CRM source connection for customer data",
    connectionSpec: { id: "cfc0fee1-7dc0-40ef-b73e-d8b134c436f5" },
    state: "enabled",
  },
  {
    id: "conn-web-source",
    name: "Web Analytics Source",
    description: "Adobe Analytics source connection for web events",
    connectionSpec: { id: "a]8b6e1-9d2c-4e3f-b5a7-c6d8e9f0a1b2" },
    state: "enabled",
  },
  {
    id: "conn-datalake-customers",
    name: "AEP Data Lake - Customers",
    description: "Data Lake target for customer profile ingestion",
    connectionSpec: { id: "c604ff05-7f1a-43c0-8e18-33bf874cb11c" },
    state: "enabled",
    params: { dataSetId: "ds-customer-profiles" },
  },
  {
    id: "conn-datalake-events",
    name: "AEP Data Lake - Web Events",
    description: "Data Lake target for web event ingestion",
    connectionSpec: { id: "c604ff05-7f1a-43c0-8e18-33bf874cb11c" },
    state: "enabled",
    params: { dataSetId: "ds-web-events" },
  },
];

const flows: AepFlow[] = [
  {
    id: "flow-crm-ingest",
    name: "CRM Ingest Flow",
    description: "Ingests customer records from Salesforce CRM into AEP",
    state: "enabled",
    sourceConnectionIds: ["conn-crm-source"],
    targetConnectionIds: ["conn-datalake-customers"],
    created: 1700000000000,
    updated: 1700300000000,
  },
  {
    id: "flow-web-analytics",
    name: "Web Analytics Flow",
    description: "Streams web clickstream events from Analytics into AEP",
    state: "enabled",
    sourceConnectionIds: ["conn-web-source"],
    targetConnectionIds: ["conn-datalake-events"],
    created: 1700000000000,
    updated: 1700250000000,
  },
];

const descriptors: AepDescriptor[] = [
  {
    "@id": "desc-identity-customer-personid",
    "@type": "xdm:descriptorIdentity",
    "xdm:sourceSchema": SCHEMA_CUSTOMER,
    "xdm:sourceVersion": 1,
    "xdm:sourceProperty": "/personId",
    "xdm:isPrimary": true,
    "xdm:namespace": "CRMId",
  },
  {
    "@id": "desc-identity-web-visitorid",
    "@type": "xdm:descriptorIdentity",
    "xdm:sourceSchema": SCHEMA_WEB,
    "xdm:sourceVersion": 1,
    "xdm:sourceProperty": "/visitorId",
    "xdm:isPrimary": true,
    "xdm:namespace": "ECID",
  },
  {
    "@id": "desc-rel-web-to-customer",
    "@type": "xdm:descriptorOneToOne",
    "xdm:sourceSchema": SCHEMA_WEB,
    "xdm:sourceVersion": 1,
    "xdm:sourceProperty": "/personId",
    "xdm:destinationSchema": SCHEMA_CUSTOMER,
    "xdm:destinationVersion": 1,
    "xdm:destinationProperty": "/personId",
  },
  {
    "@id": "desc-rel-email-to-customer",
    "@type": "xdm:descriptorOneToOne",
    "xdm:sourceSchema": SCHEMA_EMAIL,
    "xdm:sourceVersion": 1,
    "xdm:sourceProperty": "/recipientId",
    "xdm:destinationSchema": SCHEMA_CUSTOMER,
    "xdm:destinationVersion": 1,
    "xdm:destinationProperty": "/personId",
  },
];

export function getMockTransformInput(): TransformInput {
  return { datasets, schemas, fieldGroups, flows, connections, descriptors };
}
