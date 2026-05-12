import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: files, error } = await supabase.storage
    .from("snapshots")
    .list(user.id, { sortBy: { column: "created_at", order: "desc" } });

  if (error) return NextResponse.json([], { status: 200 });

  const metas = await Promise.all(
    (files ?? [])
      .filter((f) => f.name.endsWith(".json"))
      .map(async (file) => {
        const { data } = await supabase.storage
          .from("snapshots")
          .download(`${user.id}/${file.name}`);
        if (!data) return null;
        try {
          const text = await data.text();
          const parsed = JSON.parse(text);
          return { filename: file.name, ...parsed.meta };
        } catch {
          return null;
        }
      })
  );

  return NextResponse.json(metas.filter(Boolean));
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { config, nodes, edges, label } = await req.json();
  const { orgId, sandbox, token: _token, apiKey: _apiKey } = config;

  const sandboxHash = crypto
    .createHash("sha256")
    .update(`${orgId}::${sandbox}`)
    .digest("hex")
    .slice(0, 8);

  const typeCounts: Record<string, number> = {};
  for (const node of nodes) {
    const entityType: string = node.data?.entityType ?? "unknown";
    typeCounts[entityType] = (typeCounts[entityType] ?? 0) + 1;
  }

  const timestamp = Date.now();
  const filename = `${sandboxHash}-${timestamp}.json`;

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

  const { error } = await supabase.storage
    .from("snapshots")
    .upload(`${user.id}/${filename}`, JSON.stringify(snapshot), {
      contentType: "application/json",
    });

  if (error) return NextResponse.json({ error: "Failed to save snapshot" }, { status: 500 });

  return NextResponse.json({ filename, sandboxHash, timestamp });
}
