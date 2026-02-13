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

export function buildAepUrl(pathSegments: string[], query: string): string {
  const [service, ...rest] = pathSegments;
  const base = SERVICE_MAP[service];
  if (!base) {
    throw new Error(`Unknown AEP service: ${service}`);
  }
  const path = rest.join("/");
  const qs = query ? `?${query}` : "";
  return `${base}/${path}${qs}`;
}

export function buildAepHeaders(headers: ProxyHeaders): Record<string, string> {
  return {
    Authorization: `Bearer ${headers.token}`,
    "x-api-key": headers.apiKey,
    "x-gw-ims-org-id": headers.orgId,
    "x-sandbox-name": headers.sandbox,
    Accept: "application/vnd.adobe.xed-full+json; version=1",
    "Content-Type": "application/json",
  };
}
