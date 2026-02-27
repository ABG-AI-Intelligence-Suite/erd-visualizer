import { NextRequest, NextResponse } from "next/server";

const IMS_TOKEN_URL = "https://ims-na1.adobelogin.com/ims/token/v3";
const DEFAULT_SCOPES = "openid,AdobeID,read_organizations,additional_info.projectedProductContext,session";

export async function POST(request: NextRequest) {
  let body: { clientId?: string; clientSecret?: string; scopes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { clientId, clientSecret, scopes } = body;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Missing required fields: clientId, clientSecret" },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: scopes ?? DEFAULT_SCOPES,
  });

  try {
    const response = await fetch(IMS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      return NextResponse.json(
        { error: (data.error_description as string) ?? (data.error as string) ?? "Token request failed" },
        { status: response.status }
      );
    }

    return NextResponse.json({ access_token: data.access_token });
  } catch {
    return NextResponse.json({ error: "Failed to reach Adobe IMS" }, { status: 502 });
  }
}
