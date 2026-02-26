import { useCanvasStore } from "@/store/canvas-store";
import type { Node, Edge } from "@xyflow/react";
import type { MiroProgressEvent } from "@/app/api/miro/export/route";

export type { MiroProgressEvent };

export function useMiroExport() {
  const rawNodes = useCanvasStore((s) => s.rawNodes);
  const rawEdges = useCanvasStore((s) => s.rawEdges);

  async function exportToMiro(
    miroToken: string,
    boardId?: string,
    boardName?: string,
    onProgress?: (event: MiroProgressEvent) => void,
    options?: { nodes?: Node[]; edges?: Edge[] }
  ): Promise<{ boardId: string; boardUrl: string }> {
    const nodes = options?.nodes ?? rawNodes;
    const edges = options?.edges ?? rawEdges;

    const res = await fetch("/api/miro/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        miroToken,
        boardId: boardId || undefined,
        boardName,
        nodes,
        edges,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? "Miro export failed");
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: { boardId: string; boardUrl: string } | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as MiroProgressEvent;
        onProgress?.(event);

        if (event.type === "done") {
          result = { boardId: event.boardId, boardUrl: event.boardUrl };
        }
        if (event.type === "error") {
          throw new Error(event.message);
        }
      }
    }

    if (!result) throw new Error("Export completed but no board URL received");
    return result;
  }

  return { exportToMiro, rawNodes, rawEdges };
}
