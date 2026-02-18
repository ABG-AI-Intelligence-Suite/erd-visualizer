"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { SchemaNodeData } from "@/lib/types";
import { FieldList } from "./field-list";

function SchemaNodeComponent({ id, data }: NodeProps) {
  const d = data as unknown as SchemaNodeData;
  const className = d.className?.split("/").pop() ?? "Unknown Class";
  const shortId = d.altId ?? d.schemaId;
  return (
    <div className="rounded-lg border-2 border-schema bg-schema-light w-72 overflow-hidden">
      <div className="bg-schema px-3 py-1.5 text-white text-xs font-semibold uppercase tracking-wide flex items-center justify-between">
        <span>Schema</span>
        {d.isSystem && (
          <span className="bg-white/20 rounded px-1.5 py-0.5 text-[10px]">
            System
          </span>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="font-semibold text-sm text-gray-900 truncate" title={d.label}>{d.label}</p>
        <p className="text-[10px] text-schema-dark font-mono truncate" title={d.schemaId}>
          {shortId}
        </p>
        {d.description && (
          <p className="text-xs text-gray-500 truncate">{d.description}</p>
        )}
        <p className="text-xs text-gray-600">
          <span className="font-medium">Class:</span> {className}
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
      <FieldList nodeId={id} fields={d.fields ?? []} accentColor="schema" />
      <Handle type="source" position={Position.Right} className="!bg-schema !w-2.5 !h-2.5" />
      <Handle type="target" position={Position.Left} className="!bg-schema !w-2.5 !h-2.5" />
    </div>
  );
}

export const SchemaNode = memo(SchemaNodeComponent);
