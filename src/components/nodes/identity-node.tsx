"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvas-store";
import type { IdentityNodeData } from "@/lib/types";

function IdentityNodeComponent({ id, data }: NodeProps) {
  const d = data as unknown as IdentityNodeData;
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const isSelected = selectedNodeId === id;

  return (
    <div className="relative flex flex-col items-center">
      <div
        className={cn(
          "rounded-2xl border-2 border-identity bg-identity-light px-5 py-3 flex flex-col items-center gap-0.5 min-w-[140px] shadow-sm transition-all",
          isSelected && "ring-2 ring-primary/50 shadow-md",
          "hover:shadow-md"
        )}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-identity" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-identity-dark">
            Identity
          </span>
        </div>
        <p className="font-bold text-base text-identity-dark leading-tight">{d.label}</p>
        <p className="text-[10px] text-identity/80 font-medium">
          {d.schemaCount} schema{d.schemaCount !== 1 ? "s" : ""}
        </p>
      </div>
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className="!bg-identity !border-identity-dark !w-2.5 !h-2.5"
      />
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        className="!bg-identity !border-identity-dark !w-2.5 !h-2.5"
      />
    </div>
  );
}

export const IdentityNode = memo(IdentityNodeComponent);
