"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { SchemaNodeData } from "@/lib/types";

function SchemaNodeComponent({ data }: NodeProps) {
  const d = data as unknown as SchemaNodeData;
  const className = d.className?.split("/").pop() ?? "Unknown Class";
  return (
    <div className="rounded-lg border-2 border-schema bg-schema-light shadow-md w-64 overflow-hidden">
      <div className="bg-schema px-3 py-1.5 text-white text-xs font-semibold uppercase tracking-wide">
        Schema
      </div>
      <div className="p-3 space-y-1">
        <p className="font-semibold text-sm text-gray-900 truncate">{d.label}</p>
        {d.description && (
          <p className="text-xs text-gray-500 truncate">{d.description}</p>
        )}
        <p className="text-xs text-gray-600">
          <span className="font-medium">Class:</span> {className}
        </p>
        <p className="text-xs text-gray-600">
          <span className="font-medium">Fields:</span> {d.fieldCount}
        </p>
        {d.primaryIdentityField && (
          <p className="text-xs">
            <span className="bg-schema-dark text-white rounded px-1 py-0.5 text-[10px] font-mono">
              PK
            </span>{" "}
            <span className="text-gray-700 font-mono text-[11px]">
              {d.primaryIdentityField}
            </span>
          </p>
        )}
        {d.extends.length > 0 && (
          <p className="text-[10px] text-gray-400">
            Extends: {d.extends.length} field group{d.extends.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-schema !w-2.5 !h-2.5" />
      <Handle type="target" position={Position.Left} className="!bg-schema !w-2.5 !h-2.5" />
    </div>
  );
}

export const SchemaNode = memo(SchemaNodeComponent);
