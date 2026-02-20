import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    token: process.env.AEP_BEARER_TOKEN ?? "",
    orgId: process.env.AEP_ORG_ID ?? "",
    sandbox: process.env.AEP_SANDBOX ?? "prod",
    apiKey: process.env.AEP_API_KEY ?? "",
  });
}
