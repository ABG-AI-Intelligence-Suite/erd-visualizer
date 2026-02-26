import { NextRequest, NextResponse } from "next/server";
import type { Node, Edge } from "@xyflow/react";

export const maxDuration = 60;

const MIRO_BASE = "https://api.miro.com/v2";

const ENTITY_STYLES: Record<string, { fill: string; stroke: string }> = {
  dataset:    { fill: "#dbeafe", stroke: "#3b82f6" },
  schema:     { fill: "#ede9fe", stroke: "#8b5cf6" },
  fieldGroup: { fill: "#dcfce7", stroke: "#22c55e" },
  flow:       { fill: "#ffedd5", stroke: "#f97316" },
  identity:   { fill: "#e0f2fe", stroke: "#0ea5e9" },
};

const EDGE_COLORS: Record<string, string> = {
  "dataset-schema":    "#8b5cf6",
  "schema-fieldgroup": "#22c55e",
  "schema-schema":     "#8b5cf6",
  "schema-identity":   "#0ea5e9",
  "flow-dataset":      "#f97316",
  "flow-source":       "#f97316",
};

const DASHED_EDGE_TYPES = new Set(["schema-schema", "flow-source"]);

const NODE_W        = 280;
const NODE_H        = 90;
const GAP           = 20;
const COLS          = 4;
const FRAME_PAD     = 30;
const FRAME_TITLE_H = 44;
const FRAME_GAP     = 100;

const ENTITY_ORDER = ["dataset", "schema", "fieldGroup", "flow", "identity"] as const;

export type MiroProgressEvent =
  | { type: "step";   message: string }
  | { type: "shapes"; current: number; total: number }
  | { type: "connectors"; current: number; total: number }
  | { type: "done";   boardId: string; boardUrl: string }
  | { type: "error";  message: string };

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function miroReq(token: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${MIRO_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Miro API ${res.status}: ${text}`);
  }
  return res.json();
}

const RATE_DELAY = 72;
function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  let body: {
    miroToken: string;
    boardId?: string;
    boardName?: string;
    nodes: Node[];
    edges: Edge[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { miroToken, boardId: existingBoardId, boardName, nodes, edges } = body;

  if (!miroToken) return NextResponse.json({ error: "Missing miroToken" }, { status: 400 });
  if (!nodes?.length) return NextResponse.json({ error: "No nodes to export" }, { status: 400 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: MiroProgressEvent) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      try {
        // ── 1. Board ───────────────────────────────────────────────────────────
        send({ type: "step", message: existingBoardId ? "Loading board…" : "Creating board…" });

        let boardId = existingBoardId;
        let boardUrl: string;

        if (!boardId) {
          const board = await miroReq(miroToken, "POST", "/boards", {
            name: boardName?.trim() || "AEP ERD Export",
            description: "Exported from AEP ERD Visualizer",
          });
          boardId = board.id;
          boardUrl = board.viewLink;
        } else {
          const board = await miroReq(miroToken, "GET", `/boards/${encodeURIComponent(boardId)}`);
          boardUrl = board.viewLink;
        }

        await sleep(RATE_DELAY);

        // ── 2. Group nodes ─────────────────────────────────────────────────────
        const groups = new Map<string, Node[]>();
        for (const node of nodes) {
          const type = (node.data as { entityType?: string })?.entityType ?? "unknown";
          if (!groups.has(type)) groups.set(type, []);
          groups.get(type)!.push(node);
        }

        const miroIdMap = new Map<string, string>();
        let frameOffsetX = 0;
        let shapesCreated = 0;
        const shapesTotal = nodes.length;

        // ── 3. Frames + shapes ─────────────────────────────────────────────────
        for (const entityType of ENTITY_ORDER) {
          const groupNodes = groups.get(entityType);
          if (!groupNodes?.length) continue;

          const rows   = Math.ceil(groupNodes.length / COLS);
          const frameW = 2 * FRAME_PAD + COLS * NODE_W + (COLS - 1) * GAP;
          const frameH = FRAME_TITLE_H + FRAME_PAD + rows * NODE_H + (rows - 1) * GAP + FRAME_PAD;
          const style  = ENTITY_STYLES[entityType] ?? { fill: "#f5f5f5", stroke: "#aaaaaa" };
          const title  = entityType === "fieldGroup" ? "Field Groups"
                       : entityType.charAt(0).toUpperCase() + entityType.slice(1) + "s";

          send({ type: "step", message: `Creating ${title} frame (${groupNodes.length} items)…` });

          await miroReq(miroToken, "POST", `/boards/${boardId}/frames`, {
            data: { title, format: "custom", type: "freeform" },
            position: { x: frameOffsetX + frameW / 2, y: frameH / 2, origin: "center" },
            geometry: { width: frameW, height: frameH },
            style: { fillColor: "#fafafa" },
          });
          await sleep(RATE_DELAY);

          for (let i = 0; i < groupNodes.length; i++) {
            const node = groupNodes[i];
            const col  = i % COLS;
            const row  = Math.floor(i / COLS);

            const nx = frameOffsetX + FRAME_PAD + col * (NODE_W + GAP) + NODE_W / 2;
            const ny = FRAME_TITLE_H + FRAME_PAD + row * (NODE_H + GAP) + NODE_H / 2;

            const nodeLabel = escapeHtml((node.data as { label?: string })?.label ?? node.id);
            const typeLabel = escapeHtml(
              entityType === "fieldGroup" ? "Field Group"
              : entityType.charAt(0).toUpperCase() + entityType.slice(1)
            );

            const shape = await miroReq(miroToken, "POST", `/boards/${boardId}/shapes`, {
              data: {
                shape: "rectangle",
                content: `<p><strong>${nodeLabel}</strong></p><p style="color:#666;font-size:11px">${typeLabel}</p>`,
              },
              position: { x: nx, y: ny, origin: "center" },
              geometry: { width: NODE_W, height: NODE_H },
              style: {
                fillColor: style.fill,
                borderColor: style.stroke,
                borderWidth: "2",
              },
            });

            miroIdMap.set(node.id, shape.id);
            shapesCreated++;
            send({ type: "shapes", current: shapesCreated, total: shapesTotal });
            await sleep(RATE_DELAY);
          }

          frameOffsetX += frameW + FRAME_GAP;
        }

        // ── 4. Connectors ──────────────────────────────────────────────────────
        const connectorsTotal = edges.filter((e) => miroIdMap.has(e.source) && miroIdMap.has(e.target)).length;
        let connectorsCreated = 0;

        send({ type: "step", message: `Creating ${connectorsTotal} connectors…` });

        for (const edge of edges) {
          const startId = miroIdMap.get(edge.source);
          const endId   = miroIdMap.get(edge.target);
          if (!startId || !endId) continue;

          const relType    = (edge.data as { relationshipType?: string })?.relationshipType ?? "";
          const edgeColor  = EDGE_COLORS[relType] ?? "#aaaaaa";
          const isDashed   = DASHED_EDGE_TYPES.has(relType);

          await miroReq(miroToken, "POST", `/boards/${boardId}/connectors`, {
            startItem: { id: startId, snapTo: "auto" },
            endItem:   { id: endId,   snapTo: "auto" },
            shape: "elbowed",
            style: {
              color: edgeColor,
              strokeWidth: "1",
              startStrokeCap: "none",
              endStrokeCap: "arrow",
              ...(isDashed ? { strokeStyle: "dashed" } : {}),
            },
          });

          connectorsCreated++;
          send({ type: "connectors", current: connectorsCreated, total: connectorsTotal });
          await sleep(RATE_DELAY);
        }

        send({ type: "done", boardId: boardId!, boardUrl: boardUrl! });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Miro export failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
