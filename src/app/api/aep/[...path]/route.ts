import { NextRequest, NextResponse } from "next/server";
import { buildAepUrl, buildAepHeaders } from "@/lib/aep-proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const { path } = params;

  const token = request.headers.get("x-aep-token");
  const orgId = request.headers.get("x-aep-org-id");
  const sandbox = request.headers.get("x-aep-sandbox") || "prod";
  const apiKey = request.headers.get("x-aep-api-key");

  console.log(`[AEP Proxy] Incoming request: /${path.join("/")}`);
  console.log(`[AEP Proxy] Org ID: ${orgId}`);
  console.log(`[AEP Proxy] Sandbox: ${sandbox}`);
  console.log(`[AEP Proxy] API Key: ${apiKey ? apiKey.substring(0, 8) + "..." : "MISSING"}`);
  console.log(`[AEP Proxy] Token: ${token ? token.substring(0, 20) + "..." : "MISSING"}`);

  if (!token || !orgId || !apiKey) {
    console.error("[AEP Proxy] Missing required headers");
    return NextResponse.json(
      { error: "Missing required headers: x-aep-token, x-aep-org-id, x-aep-api-key" },
      { status: 400 }
    );
  }

  try {
    const query = request.nextUrl.searchParams.toString();
    const service = path[0];
    const restPath = path.slice(1).join("/");
    const url = buildAepUrl(path, query);
    const headers = buildAepHeaders({ token, orgId, sandbox, apiKey }, service, restPath);

    console.log(`[AEP Proxy] → GET ${url}`);

    const response = await fetch(url, { headers });
    const responseText = await response.text();

    console.log(`[AEP Proxy] ← ${response.status} ${response.statusText} (${responseText.length} bytes)`);

    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error(`[AEP Proxy] Failed to parse response as JSON. Raw response:`);
      console.error(`[AEP Proxy] ${responseText.substring(0, 1000)}`);
      return NextResponse.json(
        {
          error: "Non-JSON response from Adobe API",
          status: response.status,
          statusText: response.statusText,
          url,
          body: responseText.substring(0, 500),
        },
        { status: response.status }
      );
    }

    if (!response.ok) {
      console.error(`[AEP Proxy] API error ${response.status} for ${url}:`);
      console.error(JSON.stringify(data, null, 2));
      return NextResponse.json(
        {
          error: "Adobe API returned an error",
          status: response.status,
          statusText: response.statusText,
          url,
          detail: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown proxy error";
    console.error(`[AEP Proxy] Proxy exception: ${message}`);
    if (error instanceof Error && error.stack) {
      console.error(`[AEP Proxy] Stack: ${error.stack}`);
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
