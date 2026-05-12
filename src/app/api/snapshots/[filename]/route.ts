import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_FILENAME = /^[a-f0-9]{8}-\d+\.json$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!VALID_FILENAME.test(filename)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.storage
    .from("snapshots")
    .download(`${user.id}/${filename}`);

  if (error || !data) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  const text = await data.text();
  return new NextResponse(text, { headers: { "Content-Type": "application/json" } });
}
