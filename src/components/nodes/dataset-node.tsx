"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DatasetNodeData } from "@/lib/types";
import { NodeCard } from "./node-card";
import { FieldList } from "./field-list";

function DatasetNodeComponent({ id, data }: NodeProps) {
  const d = data as unknown as DatasetNodeData;
  return (
    <NodeCard
      nodeId={id}
      entityType="dataset"
      headerLabel="Dataset"
      headerBadges={
        <>
          {d.isSystem && (
            <Badge variant="secondary" className="bg-white/20 text-white text-[9px] px-1 py-0 h-4 border-0">
              System
            </Badge>
          )}
          {d.profileEnabled && (
            <Badge variant="secondary" className="bg-white/20 text-white text-[9px] px-1 py-0 h-4 border-0">
              Profile
            </Badge>
          )}
        </>
      }
      footer={<FieldList nodeId={id} fields={d.fields ?? []} accentColor="dataset" />}
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
      {d.schemaRefId && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Schema:</span>{" "}
          <span className="text-dataset-dark truncate inline-block max-w-[200px] align-bottom">
            {d.schemaRefId.split("/").pop()}
          </span>
        </p>
      )}
      {d.identityField && (
        <p className="text-xs flex items-center gap-1">
          <Badge className="bg-dataset-dark text-white text-[9px] px-1 py-0 h-4">PK</Badge>
          <span className="text-foreground font-mono text-[11px]">{d.identityField}</span>
        </p>
      )}
      {d.format && (
        <p className="text-[10px] text-muted-foreground uppercase">{d.format}</p>
      )}
      <Handle type="source" position={Position.Right} className="!bg-dataset !w-2.5 !h-2.5" />
      <Handle type="target" position={Position.Left} className="!bg-dataset !w-2.5 !h-2.5" />
    </NodeCard>
  );
}

export const DatasetNode = memo(DatasetNodeComponent);
