const AEP_BASE = "https://platform.adobe.io/data/foundation";

const SERVICE_MAP: Record<string, string> = {
  catalog: `${AEP_BASE}/catalog`,
  schemaregistry: `${AEP_BASE}/schemaregistry`,
  flowservice: `${AEP_BASE}/flowservice`,
};

interface ProxyHeaders {
  token: string;
  orgId: string;
  sandbox: string;
  apiKey: string;
}

export function buildAepUrl(
  pathSegments: string[],
  query: string,
  resourceId?: string
): string {
  const [service, ...rest] = pathSegments;
  const base = SERVICE_MAP[service];
  if (!base) {
    throw new Error(`Unknown AEP service: ${service}`);
  }
  let path = rest.join("/");
  if (resourceId) {
    path += "/" + encodeURIComponent(resourceId);
  }
  const qs = query ? `?${query}` : "";
  return `${base}/${path}${qs}`;
}

const SCHEMA_REGISTRY_ACCEPT: Record<string, string> = {
  schemas: "application/vnd.adobe.xed+json",
  fieldgroups: "application/vnd.adobe.xed+json",
  descriptors: "application/vnd.adobe.xdm-v2+json",
};

export function buildAepHeaders(
  headers: ProxyHeaders,
  service: string,
  path: string,
  acceptOverride?: string
): Record<string, string> {
  let accept = "application/json";

  if (acceptOverride === "full") {
    accept = "application/vnd.adobe.xed-full+json; version=1";
  } else if (service === "schemaregistry") {
    const resource = Object.keys(SCHEMA_REGISTRY_ACCEPT).find((key) =>
      path.includes(key)
    );
    accept = resource ? SCHEMA_REGISTRY_ACCEPT[resource] : "application/json";
  }

  return {
    Authorization: `Bearer ${headers.token}`,
    "x-api-key": headers.apiKey,
    "x-gw-ims-org-id": headers.orgId,
    "x-sandbox-name": headers.sandbox,
    Accept: accept,
    "Content-Type": "application/json",
  };
}
