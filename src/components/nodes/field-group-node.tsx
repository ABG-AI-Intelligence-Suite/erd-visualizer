"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FieldGroupNodeData } from "@/lib/types";
import { FieldList } from "./field-list";

function FieldGroupNodeComponent({ id, data }: NodeProps) {
  const d = data as unknown as FieldGroupNodeData;
  return (
    <div className="rounded-lg border-2 border-fieldgroup bg-fieldgroup-light w-72 overflow-hidden">
      <div className="bg-fieldgroup px-3 py-1.5 text-white text-xs font-semibold uppercase tracking-wide flex items-center justify-between">
        <span>Field Group</span>
        {d.isSystem && (
          <span className="bg-white/20 rounded px-1.5 py-0.5 text-[10px]">
            System
          </span>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="font-semibold text-sm text-gray-900 truncate">{d.label}</p>
        {d.description && (
          <p className="text-xs text-gray-500 truncate">{d.description}</p>
        )}
        <p className="text-xs text-gray-600">
          <span className="font-medium">Fields:</span> {d.fieldCount}
        </p>
      </div>
      <FieldList nodeId={id} fields={d.fields ?? []} accentColor="fieldgroup" />
      <Handle type="target" position={Position.Left} className="!bg-fieldgroup !w-2.5 !h-2.5" />
    </div>
  );
}

export const FieldGroupNode = memo(FieldGroupNodeComponent);
