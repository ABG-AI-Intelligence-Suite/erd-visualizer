import { useCanvasStore } from "@/store/canvas-store";

export function useMiroExport() {
  const rawNodes = useCanvasStore((s) => s.rawNodes);
  const rawEdges = useCanvasStore((s) => s.rawEdges);

  async function exportToMiro(
    miroToken: string,
    boardId?: string,
    boardName?: string
  ): Promise<{ boardId: string; boardUrl: string }> {
    const res = await fetch("/api/miro/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ miroToken, boardId: boardId || undefined, boardName, nodes: rawNodes, edges: rawEdges }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Miro export failed");
    }
    return data as { boardId: string; boardUrl: string };
  }

  return { exportToMiro, nodeCount: rawNodes.length, edgeCount: rawEdges.length };
}
