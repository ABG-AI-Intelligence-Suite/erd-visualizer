"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { useCanvasStore } from "@/store/canvas-store";
import type { EntityFilterKey } from "@/lib/types";
import { NodeCard } from "./node-card";

interface SummaryNodeData {
  entityType: string;
  label: string;
  count: number;
  collapsedType: EntityFilterKey;
}

function SummaryNodeComponent({ id, data }: NodeProps) {
  const d = data as unknown as SummaryNodeData;
  const toggleCollapse = useCanvasStore((s) => s.toggleCollapse);

  return (
    <div onClick={() => toggleCollapse(d.collapsedType)} className="cursor-pointer">
      <NodeCard
        nodeId={id}
        entityType={d.entityType}
        headerLabel="Collapsed"
        width="w-64"
        headerBadges={
          <Badge variant="secondary" className="bg-white/20 text-white text-[9px] px-1.5 py-0 h-4 border-0">
            {d.count}
          </Badge>
        }
      >
        <p className="font-semibold text-sm text-foreground text-center">{d.label}</p>
        <p className="text-xs text-muted-foreground text-center mt-1">Click to expand</p>
        <Handle type="source" position={Position.Right} className="!bg-muted-foreground !w-2.5 !h-2.5" />
        <Handle type="target" position={Position.Left} className="!bg-muted-foreground !w-2.5 !h-2.5" />
      </NodeCard>
    </div>
  );
}

export const SummaryNode = memo(SummaryNodeComponent);
