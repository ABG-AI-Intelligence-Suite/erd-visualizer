"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCanvasStore } from "@/store/canvas-store";
import { useExport, type ExportFormat } from "@/hooks/use-export";

export function ExportDialog() {
  const open = useCanvasStore((s) => s.exportDialogOpen);
  const setOpen = useCanvasStore((s) => s.setExportDialogOpen);
  const { exportImage } = useExport();

  const [format, setFormat] = useState<ExportFormat>("png");
  const [scale, setScale] = useState("2");
  const [background, setBackground] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      await exportImage(format, Number(scale), background);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Image
          </DialogTitle>
          <DialogDescription>
            Export the current canvas view as an image file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export {format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
