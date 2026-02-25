import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const SNAPSHOTS_DIR = path.join(process.cwd(), "snapshots");
const VALID_FILENAME = /^[a-f0-9]{8}-\d+\.local\.json$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!VALID_FILENAME.test(filename)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  try {
    const filePath = path.join(SNAPSHOTS_DIR, filename);
    const raw = await fs.readFile(filePath, "utf-8");
    return new NextResponse(raw, {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }
}
