"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import type { FlowNodeData } from "@/lib/types";
import { NodeCard } from "./node-card";

function FlowNodeComponent({ id, data }: NodeProps) {
  const d = data as unknown as FlowNodeData;

  return (
    <NodeCard
      nodeId={id}
      entityType="flow"
      headerLabel="Dataflow"
      width="w-64"
      headerBadges={
        <Badge
          variant="secondary"
          className={`text-[9px] px-1 py-0 h-4 border-0 ${
            d.state === "enabled"
              ? "bg-green-500/20 text-white"
              : "bg-white/20 text-white"
          }`}
        >
          {d.state}
        </Badge>
      }
    >
      <p className="font-semibold text-sm text-foreground truncate">{d.label}</p>
      {d.description && (
        <p className="text-xs text-muted-foreground truncate">{d.description}</p>
      )}
      <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
        <p className="truncate">
          <span className="text-[10px] text-muted-foreground/60 uppercase font-medium">Source:</span>{" "}
          {d.sourceSummary}
        </p>
        <p className="truncate">
          <span className="text-[10px] text-muted-foreground/60 uppercase font-medium">Target:</span>{" "}
          {d.targetSummary}
        </p>
      </div>
      <Handle type="source" position={Position.Left} className="!bg-flow !w-2.5 !h-2.5" />
    </NodeCard>
  );
}

export const FlowNode = memo(FlowNodeComponent);
