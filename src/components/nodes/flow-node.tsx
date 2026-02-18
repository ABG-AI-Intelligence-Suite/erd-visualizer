"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FlowNodeData } from "@/lib/types";

function FlowNodeComponent({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  const stateColor =
    d.state === "enabled"
      ? "bg-green-500"
      : d.state === "disabled"
        ? "bg-red-400"
        : "bg-gray-400";

  return (
    <div className="rounded-lg border-2 border-flow bg-flow-light w-64 overflow-hidden">
      <div className="bg-flow px-3 py-1.5 text-white text-xs font-semibold uppercase tracking-wide flex items-center gap-2">
        <span>Dataflow</span>
        <span className={`${stateColor} w-2 h-2 rounded-full`} />
      </div>
      <div className="p-3 space-y-1">
        <p className="font-semibold text-sm text-gray-900 truncate">{d.label}</p>
        {d.description && (
          <p className="text-xs text-gray-500 truncate">{d.description}</p>
        )}
        <p className="text-xs text-gray-600">
          <span className="font-medium">State:</span> {d.state}
        </p>
        <div className="text-xs text-gray-600 space-y-0.5 pt-1">
          <p className="truncate">
            <span className="text-[10px] text-gray-400 uppercase font-medium">Source:</span>{" "}
            {d.sourceSummary}
          </p>
          <p className="truncate">
            <span className="text-[10px] text-gray-400 uppercase font-medium">Target:</span>{" "}
            {d.targetSummary}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Left} className="!bg-flow !w-2.5 !h-2.5" />
    </div>
  );
}

export const FlowNode = memo(FlowNodeComponent);
