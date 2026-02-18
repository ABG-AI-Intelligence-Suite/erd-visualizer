"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useCanvasStore } from "@/store/canvas-store";
import type { EntityFilterKey } from "@/lib/types";

interface SummaryNodeData {
  entityType: string;
  label: string;
  count: number;
  collapsedType: EntityFilterKey;
}

function SummaryNodeComponent({ data }: NodeProps) {
  const d = data as unknown as SummaryNodeData;
  const toggleCollapse = useCanvasStore((s) => s.toggleCollapse);

  const bgMap: Record<string, string> = {
    dataset: "bg-dataset",
    schema: "bg-schema",
    fieldgroup: "bg-fieldgroup",
    flow: "bg-flow",
  };

  const borderMap: Record<string, string> = {
    dataset: "border-dataset",
    schema: "border-schema",
    fieldgroup: "border-fieldgroup",
    flow: "border-flow",
  };

  return (
    <div
      className={`rounded-lg border-2 ${borderMap[d.entityType] ?? "border-gray-300"} bg-white w-64 overflow-hidden cursor-pointer`}
      onClick={() => toggleCollapse(d.collapsedType)}
    >
      <div
        className={`${bgMap[d.entityType] ?? "bg-gray-400"} px-3 py-1.5 text-white text-xs font-semibold uppercase tracking-wide flex items-center justify-between`}
      >
        <span>Collapsed</span>
        <span className="bg-white/20 rounded px-1.5 py-0.5 text-[10px]">
          {d.count}
        </span>
      </div>
      <div className="p-3 text-center">
        <p className="font-semibold text-sm text-gray-900">{d.label}</p>
        <p className="text-xs text-gray-500 mt-1">Click to expand</p>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-gray-400 !w-2.5 !h-2.5" />
      <Handle type="target" position={Position.Left} className="!bg-gray-400 !w-2.5 !h-2.5" />
    </div>
  );
}

export const SummaryNode = memo(SummaryNodeComponent);
