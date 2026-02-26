"use client";

import { useState } from "react";
import { Download, Loader2, ExternalLink } from "lucide-react";
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

export function ExportDialog() {
  const open    = useCanvasStore((s) => s.exportDialogOpen);
  const setOpen = useCanvasStore((s) => s.setExportDialogOpen);

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
  const { exportToMiro, nodeCount, edgeCount } = useMiroExport();
  const [miroToken,     setMiroToken]     = useState("");
  const [miroBoardId,   setMiroBoardId]   = useState("");
  const [miroBoardName, setMiroBoardName] = useState("");
  const [miroLoading,   setMiroLoading]   = useState(false);
  const [miroError,     setMiroError]     = useState<string | null>(null);
  const [miroResult,    setMiroResult]    = useState<{ boardId: string; boardUrl: string } | null>(null);
  const [miroLog,       setMiroLog]       = useState<string>("");
  const [miroProgress,  setMiroProgress]  = useState<{ current: number; total: number } | null>(null);

  const totalItems = nodeCount + edgeCount;

  const handleExportMiro = async () => {
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
            setMiroProgress({ current: event.current, total: event.total + edgeCount });
          } else if (event.type === "connectors") {
            setMiroLog(`Creating connectors… ${event.current}/${event.total}`);
            setMiroProgress({ current: nodeCount + event.current, total: totalItems });
          }
        }
      );
      setMiroResult(result);
      setMiroProgress({ current: totalItems, total: totalItems });
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
            <TabsTrigger value="miro"  className="flex-1 text-xs">Miro Board</TabsTrigger>
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

            <p className="text-[10px] text-muted-foreground">
              {nodeCount} nodes · {edgeCount} edges
            </p>

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

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {miroResult ? "Close" : "Cancel"}
              </Button>
              <Button
                onClick={handleExportMiro}
                disabled={miroLoading || !miroToken.trim() || !nodeCount}
              >
                {miroLoading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Exporting…</>
                  : "Export to Miro"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
