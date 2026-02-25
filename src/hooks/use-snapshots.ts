import type { Node, Edge } from "@xyflow/react";
import { useCanvasStore } from "@/store/canvas-store";
import type { AepConnectionConfig, FetchOptions } from "@/lib/types";

export interface SnapshotMeta {
  filename: string;
  version: number;
  sandboxName: string;
  orgId: string;
  capturedAt: string;
  sandboxHash: string;
  label: string | null;
  typeCounts: Record<string, number>;
  counts: { nodes: number; edges: number };
}

export function useSnapshots() {
  const setGraph = useCanvasStore((s) => s.setGraph);
  const setConnection = useCanvasStore((s) => s.setConnection);
  const setActiveSnapshotLabel = useCanvasStore((s) => s.setActiveSnapshotLabel);

  async function listSnapshots(): Promise<SnapshotMeta[]> {
    const res = await fetch("/api/snapshots");
    if (!res.ok) return [];
    return res.json();
  }

  async function saveSnapshot(
    config: AepConnectionConfig,
    nodes: Node[],
    edges: Edge[],
    fetchOpts?: FetchOptions
  ): Promise<void> {
    await fetch("/api/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config,
        nodes,
        edges,
        label: fetchOpts?.snapshotLabel ?? null,
      }),
    });
  }

  async function loadSnapshot(
    filename: string,
    orgId: string,
    sandboxName: string,
    label: string | null
  ): Promise<void> {
    const res = await fetch(`/api/snapshots/${encodeURIComponent(filename)}`);
    if (!res.ok) throw new Error("Failed to load snapshot");
    const data = await res.json();
    setGraph(data.nodes, data.edges);
    setConnection({ orgId, sandbox: sandboxName, token: "", apiKey: "" });
    setActiveSnapshotLabel(label);
  }

  return { listSnapshots, saveSnapshot, loadSnapshot };
}
