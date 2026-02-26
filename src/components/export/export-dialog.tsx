"use client";

import { useState, useMemo } from "react";
import { Download, Loader2, ExternalLink, X, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCanvasStore } from "@/store/canvas-store";
import { useExport, type ExportFormat } from "@/hooks/use-export";
import { useMiroExport, type MiroProgressEvent } from "@/hooks/use-miro-export";
import type { Node, Edge } from "@xyflow/react";

const ENTITY_COLORS: Record<string, string> = {
  dataset:    "bg-blue-100 text-blue-700",
  schema:     "bg-violet-100 text-violet-700",
  fieldGroup: "bg-green-100 text-green-700",
  flow:       "bg-orange-100 text-orange-700",
  identity:   "bg-sky-100 text-sky-700",
};

const ENTITY_LABELS: Record<string, string> = {
  dataset:    "Dataset",
  schema:     "Schema",
  fieldGroup: "Field Group",
  flow:       "Flow",
  identity:   "Identity",
};

// BFS from seed node IDs, following edges in both directions
function expandConnectedGraph(nodeIds: string[], rawNodes: Node[], rawEdges: Edge[]) {
  const visited = new Set<string>(nodeIds);
  const queue   = [...nodeIds];

  while (queue.length) {
    const id = queue.shift()!;
    for (const edge of rawEdges) {
      if (edge.source === id && !visited.has(edge.target)) {
        visited.add(edge.target);
        queue.push(edge.target);
      }
      if (edge.target === id && !visited.has(edge.source)) {
        visited.add(edge.source);
        queue.push(edge.source);
      }
    }
  }

  return {
    nodes: rawNodes.filter((n) => visited.has(n.id)),
    edges: rawEdges.filter((e) => visited.has(e.source) && visited.has(e.target)),
  };
}

export function ExportDialog() {
  const open    = useCanvasStore((s) => s.exportDialogOpen);
  const setOpen = useCanvasStore((s) => s.setExportDialogOpen);

  const miroExportList      = useCanvasStore((s) => s.miroExportList);
  const removeFromMiroExport = useCanvasStore((s) => s.removeFromMiroExport);
  const clearMiroExport     = useCanvasStore((s) => s.clearMiroExport);

  // ── Image tab ──────────────────────────────────────────────────────────────
  const { exportImage } = useExport();
  const [format,     setFormat]     = useState<ExportFormat>("png");
  const [scale,      setScale]      = useState("2");
  const [background, setBackground] = useState(true);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError,   setImgError]   = useState<string | null>(null);

  const handleExportImage = async () => {
    setImgLoading(true);
    setImgError(null);
    try {
      await exportImage(format, Number(scale), background);
      setOpen(false);
    } catch (err) {
      setImgError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setImgLoading(false);
    }
  };

  // ── Miro tab ───────────────────────────────────────────────────────────────
  const { exportToMiro, rawNodes, rawEdges } = useMiroExport();
  const [miroToken,     setMiroToken]     = useState("");
  const [miroBoardId,   setMiroBoardId]   = useState("");
  const [miroBoardName, setMiroBoardName] = useState("");
  const [miroLoading,   setMiroLoading]   = useState(false);
  const [miroError,     setMiroError]     = useState<string | null>(null);
  const [miroResult,    setMiroResult]    = useState<{ boardId: string; boardUrl: string } | null>(null);
  const [miroLog,       setMiroLog]       = useState<string>("");
  const [miroProgress,  setMiroProgress]  = useState<{ current: number; total: number } | null>(null);

  // Node lookup for displaying queued items
  const nodeMap = useMemo(
    () => new Map(rawNodes.map((n) => [n.id, n])),
    [rawNodes]
  );

  // Full connected subgraph from all queued nodes
  const { nodes: queuedExportNodes, edges: queuedExportEdges } = useMemo(
    () =>
      miroExportList.length > 0
        ? expandConnectedGraph(miroExportList, rawNodes, rawEdges)
        : { nodes: [], edges: [] },
    [miroExportList, rawNodes, rawEdges]
  );

  const handleExportMiro = async (nodes: Node[], edges: Edge[]) => {
    const nCount = nodes.length;
    const eCount = edges.length;
    setMiroLoading(true);
    setMiroError(null);
    setMiroResult(null);
    setMiroLog("");
    setMiroProgress(null);

    try {
      const result = await exportToMiro(
        miroToken.trim(),
        miroBoardId.trim() || undefined,
        miroBoardName.trim() || undefined,
        (event: MiroProgressEvent) => {
          if (event.type === "step") {
            setMiroLog(event.message);
          } else if (event.type === "shapes") {
            setMiroLog(`Creating shapes… ${event.current}/${event.total}`);
            setMiroProgress({ current: event.current, total: event.total + eCount });
          } else if (event.type === "connectors") {
            setMiroLog(`Creating connectors… ${event.current}/${event.total}`);
            setMiroProgress({ current: nCount + event.current, total: nCount + eCount });
          }
        },
        { nodes, edges }
      );
      setMiroResult(result);
      setMiroProgress({ current: nCount + eCount, total: nCount + eCount });
      setMiroLog("Done!");
    } catch (err) {
      setMiroError(err instanceof Error ? err.message : "Miro export failed");
    } finally {
      setMiroLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </DialogTitle>
          <DialogDescription>
            Export the graph as an image or push it directly to a Miro board.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="image">
          <TabsList className="w-full">
            <TabsTrigger value="image" className="flex-1 text-xs">Image</TabsTrigger>
            <TabsTrigger value="miro"  className="flex-1 text-xs">
              Miro Board
              {miroExportList.length > 0 && (
                <span className="ml-1.5 bg-primary text-primary-foreground text-[9px] rounded-full px-1.5 py-0.5 font-medium">
                  {miroExportList.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Image ──────────────────────────────────────────────────────── */}
          <TabsContent value="image" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs">Format</Label>
              <ToggleGroup
                type="single"
                value={format}
                onValueChange={(v) => { if (v) setFormat(v as ExportFormat); }}
                className="justify-start"
              >
                <ToggleGroupItem value="png" className="text-xs">PNG</ToggleGroupItem>
                <ToggleGroupItem value="svg" className="text-xs">SVG</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Scale</Label>
              <ToggleGroup
                type="single"
                value={scale}
                onValueChange={(v) => { if (v) setScale(v); }}
                className="justify-start"
              >
                <ToggleGroupItem value="1" className="text-xs">1x</ToggleGroupItem>
                <ToggleGroupItem value="2" className="text-xs">2x</ToggleGroupItem>
                <ToggleGroupItem value="3" className="text-xs">3x</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="bg"
                type="checkbox"
                checked={background}
                onChange={(e) => setBackground(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="bg" className="text-xs">Include white background</Label>
            </div>

            {imgError && <p className="text-xs text-destructive">{imgError}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleExportImage} disabled={imgLoading}>
                {imgLoading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Exporting…</>
                  : <><Download className="mr-2 h-4 w-4" />Export {format.toUpperCase()}</>}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* ── Miro ───────────────────────────────────────────────────────── */}
          <TabsContent value="miro" className="space-y-4 pt-2">
            <p className="text-[11px] text-muted-foreground">
              Creates colour-coded shapes and connectors on a Miro board — one frame per entity type.
              Requires a Miro access token from your{" "}
              <a
                href="https://miro.com/app/settings/user-profile/apps"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Miro developer app
              </a>.
            </p>

            <div className="space-y-2">
              <Label htmlFor="miroToken" className="text-xs">
                Miro Access Token <span className="text-destructive">*</span>
              </Label>
              <Input
                id="miroToken"
                type="password"
                value={miroToken}
                onChange={(e) => setMiroToken(e.target.value)}
                placeholder="eyJh..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="miroBoardId" className="text-xs">
                Board ID <span className="font-normal text-muted-foreground">(leave blank to create new)</span>
              </Label>
              <Input
                id="miroBoardId"
                type="text"
                value={miroBoardId}
                onChange={(e) => setMiroBoardId(e.target.value)}
                placeholder="uXjVK..."
              />
            </div>

            {!miroBoardId.trim() && (
              <div className="space-y-2">
                <Label htmlFor="miroBoardName" className="text-xs">New Board Name</Label>
                <Input
                  id="miroBoardName"
                  type="text"
                  value={miroBoardName}
                  onChange={(e) => setMiroBoardName(e.target.value)}
                  placeholder="AEP ERD Export"
                />
              </div>
            )}

            {/* ── Export queue ────────────────────────────────────────────── */}
            {miroExportList.length === 0 ? (
              <div className="rounded-md border border-dashed px-4 py-5 text-center">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Click{" "}
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-muted mx-0.5 align-middle">
                    <Plus className="h-2.5 w-2.5" />
                  </span>{" "}
                  on any node to add it to the export queue.
                  <br />
                  The full connected graph is exported automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">
                    {miroExportList.length} node{miroExportList.length !== 1 ? "s" : ""} queued
                  </Label>
                  <button
                    type="button"
                    onClick={clearMiroExport}
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Clear all
                  </button>
                </div>

                <div className="overflow-y-auto max-h-32 rounded-md border divide-y">
                  {miroExportList.map((nodeId) => {
                    const node = nodeMap.get(nodeId);
                    const d = (node?.data ?? {}) as { label?: string; entityType?: string };
                    const entityType = d.entityType ?? "unknown";
                    return (
                      <div key={nodeId} className="flex items-center gap-2 px-2.5 py-1.5 text-xs">
                        <span
                          className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded font-medium ${
                            ENTITY_COLORS[entityType] ?? "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {ENTITY_LABELS[entityType] ?? entityType}
                        </span>
                        <span className="truncate flex-1 text-foreground">{d.label ?? nodeId}</span>
                        <button
                          type="button"
                          onClick={() => removeFromMiroExport(nodeId)}
                          className="shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Expands to {queuedExportNodes.length} nodes · {queuedExportEdges.length} edges
                </p>
              </div>
            )}

            {(miroLoading || miroProgress) && (
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{
                      width: miroProgress
                        ? `${Math.round((miroProgress.current / miroProgress.total) * 100)}%`
                        : "4%",
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">{miroLog}</p>
              </div>
            )}

            {miroError && (
              <p className="text-xs text-destructive break-words">{miroError}</p>
            )}

            {miroResult && (
              <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[11px] text-green-800">
                Board ready.{" "}
                <a
                  href={miroResult.boardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium underline"
                >
                  Open in Miro <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            <DialogFooter className="sm:justify-between gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                {miroResult ? "Close" : "Cancel"}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportMiro(rawNodes, rawEdges)}
                  disabled={miroLoading || !miroToken.trim() || !rawNodes.length}
                >
                  Full Canvas
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleExportMiro(queuedExportNodes, queuedExportEdges)}
                  disabled={miroLoading || !miroToken.trim() || miroExportList.length === 0}
                >
                  Export Queued ({miroExportList.length})
                </Button>
              </div>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
