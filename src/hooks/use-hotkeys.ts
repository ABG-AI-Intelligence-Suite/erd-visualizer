"use client";

import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { useCanvasStore } from "@/store/canvas-store";

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function useHotkeys() {
  const setCommandPaletteOpen = useCanvasStore((s) => s.setCommandPaletteOpen);
  const setExportDialogOpen = useCanvasStore((s) => s.setExportDialogOpen);
  const setShortcutsDialogOpen = useCanvasStore((s) => s.setShortcutsDialogOpen);
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);
  const setFocusNode = useCanvasStore((s) => s.setFocusNode);
  const focusNodeId = useCanvasStore((s) => s.focusNodeId);
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      // Cmd+K / Ctrl+K — Command palette
      if (meta && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Cmd+E — Export
      if (meta && e.key === "e") {
        e.preventDefault();
        setExportDialogOpen(true);
        return;
      }

      // Let remaining shortcuts only fire when not in an input
      if (isInputFocused()) return;

      // ? — Shortcuts help
      if (e.key === "?" && !meta) {
        e.preventDefault();
        setShortcutsDialogOpen(true);
        return;
      }

      // Escape — deselect / exit focus
      if (e.key === "Escape") {
        if (focusNodeId) {
          setFocusNode(null);
        } else {
          setSelectedNode(null);
        }
        return;
      }

      // + / = — Zoom in
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
        return;
      }

      // - — Zoom out
      if (e.key === "-") {
        e.preventDefault();
        zoomOut();
        return;
      }

      // 0 — Fit view
      if (e.key === "0") {
        e.preventDefault();
        fitView({ padding: 0.2, duration: 300 });
        return;
      }
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [
    setCommandPaletteOpen,
    setExportDialogOpen,
    setShortcutsDialogOpen,
    setSelectedNode,
    setFocusNode,
    focusNodeId,
    zoomIn,
    zoomOut,
    fitView,
  ]);
}
