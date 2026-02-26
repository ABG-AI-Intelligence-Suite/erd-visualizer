"use client";

import { memo, type ReactNode } from "react";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvas-store";

const BORDER_COLORS: Record<string, string> = {
  dataset: "border-l-dataset",
  schema: "border-l-schema",
  fieldgroup: "border-l-fieldgroup",
  flow: "border-l-flow",
  identity: "border-l-identity",
};

const HEADER_COLORS: Record<string, string> = {
  dataset: "bg-dataset",
  schema: "bg-schema",
  fieldgroup: "bg-fieldgroup",
  flow: "bg-flow",
  identity: "bg-identity",
};

// Separate memo'd component so only this button re-renders when the export list changes
const AddToExportButton = memo(function AddToExportButton({ nodeId }: { nodeId: string }) {
  const isQueued        = useCanvasStore((s) => s.miroExportList.includes(nodeId));
  const addToMiroExport = useCanvasStore((s) => s.addToMiroExport);
  const removeFromMiroExport = useCanvasStore((s) => s.removeFromMiroExport);
  const setMiroToast    = useCanvasStore((s) => s.setMiroToast);

  const handleClick = () => {
    if (isQueued) {
      removeFromMiroExport(nodeId);
      setMiroToast("Removed from export list");
    } else {
      addToMiroExport(nodeId);
      setMiroToast("Added to export list");
    }
  };

  return (
    <button
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); handleClick(); }}
      className={cn(
        "rounded p-0.5 transition-colors hover:bg-white/30",
        isQueued ? "text-green-200" : "text-white/50 hover:text-white"
      )}
      title={isQueued ? "Remove from Miro export" : "Add to Miro export"}
    >
      {isQueued ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
    </button>
  );
});

interface NodeCardProps {
  nodeId: string;
  entityType: string;
  headerLabel: string;
  headerBadges?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export const NodeCard = memo(function NodeCard({
  nodeId,
  entityType,
  headerLabel,
  headerBadges,
  children,
  footer,
  width = "w-72",
}: NodeCardProps) {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const isSelected = selectedNodeId === nodeId;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card shadow-sm overflow-hidden transition-all border-l-4",
        width,
        BORDER_COLORS[entityType] ?? "border-l-gray-400",
        isSelected && "ring-2 ring-primary/50 shadow-md",
        "hover:shadow-md"
      )}
    >
      <div
        className={cn(
          "px-3 py-1.5 text-white text-xs font-semibold uppercase tracking-wide flex items-center justify-between",
          HEADER_COLORS[entityType] ?? "bg-gray-400"
        )}
      >
        <span>{headerLabel}</span>
        <span className="flex items-center gap-1">
          {headerBadges}
          <AddToExportButton nodeId={nodeId} />
        </span>
      </div>
      <div className="p-3 space-y-1">{children}</div>
      {footer}
    </div>
  );
});
