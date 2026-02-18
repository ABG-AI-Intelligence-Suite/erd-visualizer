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

  if (!token || !orgId || !apiKey) {
    return NextResponse.json(
      { error: "Missing required headers: x-aep-token, x-aep-org-id, x-aep-api-key" },
      { status: 400 }
    );
  }

  try {
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const acceptOverride = searchParams.get("_accept");
    if (acceptOverride) {
      searchParams.delete("_accept");
    }
    const resourceId = searchParams.get("_resourceId");
    if (resourceId) {
      searchParams.delete("_resourceId");
    }
    const query = searchParams.toString();
    const service = path[0];
    const restPath = path.slice(1).join("/");
    const url = buildAepUrl(path, query, resourceId ?? undefined);
    const headers = buildAepHeaders({ token, orgId, sandbox, apiKey }, service, restPath, acceptOverride ?? undefined);

    const response = await fetch(url, { headers });
    const responseText = await response.text();

    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch {
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
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
