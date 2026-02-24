"use client";

import { memo, type ReactNode } from "react";
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
        {headerBadges && <span className="flex items-center gap-1">{headerBadges}</span>}
      </div>
      <div className="p-3 space-y-1">{children}</div>
      {footer}
    </div>
  );
});
