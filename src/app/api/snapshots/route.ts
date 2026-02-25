import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const SNAPSHOTS_DIR = path.join(process.cwd(), "snapshots");

async function ensureDir() {
  await fs.mkdir(SNAPSHOTS_DIR, { recursive: true });
}

export async function GET() {
  try {
    await ensureDir();
    const files = await fs.readdir(SNAPSHOTS_DIR);
    const localFiles = files.filter((f) => f.endsWith(".local.json"));

    const metas = await Promise.all(
      localFiles.map(async (filename) => {
        try {
          const filePath = path.join(SNAPSHOTS_DIR, filename);
          const raw = await fs.readFile(filePath, "utf-8");
          const parsed = JSON.parse(raw);
          return { filename, ...parsed.meta };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json(metas.filter(Boolean));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const { config, nodes, edges, label } = await req.json();
    const { orgId, sandbox, token: _token, apiKey: _apiKey } = config;

    await ensureDir();

    const sandboxHash = crypto
      .createHash("sha256")
      .update(`${orgId}::${sandbox}`)
      .digest("hex")
      .slice(0, 8);

    // Count node entity types from actual data
    const typeCounts: Record<string, number> = {};
    for (const node of nodes) {
      const entityType: string = node.data?.entityType ?? "unknown";
      typeCounts[entityType] = (typeCounts[entityType] ?? 0) + 1;
    }

    const timestamp = Date.now();
    const filename = `${sandboxHash}-${timestamp}.local.json`;
    const filePath = path.join(SNAPSHOTS_DIR, filename);

    const snapshot = {
      meta: {
        version: 1,
        sandboxName: sandbox,
        orgId,
        capturedAt: new Date().toISOString(),
        sandboxHash,
        label: label ?? null,
        typeCounts,
        counts: { nodes: nodes.length, edges: edges.length },
      },
      nodes,
      edges,
    };

    await fs.writeFile(filePath, JSON.stringify(snapshot), "utf-8");

    return NextResponse.json({ filename, sandboxHash, timestamp });
  } catch (err) {
    console.error("Failed to save snapshot:", err);
    return NextResponse.json({ error: "Failed to save snapshot" }, { status: 500 });
  }
}
