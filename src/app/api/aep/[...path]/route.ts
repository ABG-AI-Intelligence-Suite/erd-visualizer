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
    const query = request.nextUrl.searchParams.toString();
    const url = buildAepUrl(path, query);
    const headers = buildAepHeaders({ token, orgId, sandbox, apiKey });

    const response = await fetch(url, { headers });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown proxy error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
