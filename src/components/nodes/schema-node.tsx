"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SchemaNodeData } from "@/lib/types";
import { NodeCard } from "./node-card";
import { FieldList } from "./field-list";

function SchemaNodeComponent({ id, data }: NodeProps) {
  const d = data as unknown as SchemaNodeData & {
    isFutureState?: boolean;
    isConflict?: boolean;
  };
  const className = d.className?.split("/").pop() ?? "Unknown Class";
  const shortId = d.altId ?? d.schemaId;
  const isFutureState = Boolean(d.isFutureState);
  const isConflict = Boolean(d.isConflict);

  const headerBadges = (
    <>
      {isFutureState && (
        <Badge className="bg-teal-600 text-white text-[9px] px-1 py-0 h-4 border-0 shrink-0">
          FUTURE STATE
        </Badge>
      )}
      {isConflict && (
        <Badge className="bg-amber-500 text-white text-[9px] px-1 py-0 h-4 border-0 shrink-0">
          CONFLICT
        </Badge>
      )}
      {d.isSystem && (
        <Badge variant="secondary" className="bg-white/20 text-white text-[9px] px-1 py-0 h-4 border-0">
          System
        </Badge>
      )}
    </>
  );

  return (
    <NodeCard
      nodeId={id}
      entityType="schema"
      headerLabel="Schema"
      headerBadges={headerBadges}
      isFutureState={isFutureState}
      isConflict={isConflict}
      footer={<FieldList nodeId={id} fields={d.fields ?? []} accentColor="schema" />}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="font-semibold text-sm text-foreground truncate">{d.label}</p>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p>{d.label}</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="text-[10px] text-schema-dark font-mono truncate">{shortId}</p>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md">
          <p className="font-mono text-xs">{d.schemaId}</p>
        </TooltipContent>
      </Tooltip>
      {d.description && (
        <p className="text-xs text-muted-foreground truncate">{d.description}</p>
      )}
      <p className="text-xs text-muted-foreground">
        <span className="font-medium">Class:</span> {className}
      </p>
      {d.primaryIdentityField && (
        <p className="text-xs flex items-center gap-1">
          <Badge className="bg-schema-dark text-white text-[9px] px-1 py-0 h-4">PK</Badge>
          <span className="text-foreground font-mono text-[11px]">{d.primaryIdentityField}</span>
        </p>
      )}
      {d.extends.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Extends: {d.extends.length} field group{d.extends.length !== 1 ? "s" : ""}
        </p>
      )}
      <Handle id="top" type="target" position={Position.Top} className="!bg-schema !w-2.5 !h-2.5" />
      <Handle id="right" type="source" position={Position.Right} className="!bg-schema !w-2.5 !h-2.5" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="!bg-schema !w-2.5 !h-2.5" />
      <Handle id="left" type="target" position={Position.Left} className="!bg-schema !w-2.5 !h-2.5" />
    </NodeCard>
  );
}

export const SchemaNode = memo(SchemaNodeComponent);
