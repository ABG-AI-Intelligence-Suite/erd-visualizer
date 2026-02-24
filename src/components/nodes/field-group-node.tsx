"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { FieldGroupNodeData } from "@/lib/types";
import { NodeCard } from "./node-card";
import { FieldList } from "./field-list";

function FieldGroupNodeComponent({ id, data }: NodeProps) {
  const d = data as unknown as FieldGroupNodeData;
  return (
    <NodeCard
      nodeId={id}
      entityType="fieldgroup"
      headerLabel="Field Group"
      headerBadges={
        d.isSystem ? (
          <Badge variant="secondary" className="bg-white/20 text-white text-[9px] px-1 py-0 h-4 border-0">
            System
          </Badge>
        ) : undefined
      }
      footer={<FieldList nodeId={id} fields={d.fields ?? []} accentColor="fieldgroup" />}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="font-semibold text-sm text-foreground truncate">{d.label}</p>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p>{d.label}</p>
        </TooltipContent>
      </Tooltip>
      {d.description && (
        <p className="text-xs text-muted-foreground truncate">{d.description}</p>
      )}
      <p className="text-xs text-muted-foreground">
        <span className="font-medium">Fields:</span> {d.fieldCount}
      </p>
      <Handle type="target" position={Position.Left} className="!bg-fieldgroup !w-2.5 !h-2.5" />
    </NodeCard>
  );
}

export const FieldGroupNode = memo(FieldGroupNodeComponent);
