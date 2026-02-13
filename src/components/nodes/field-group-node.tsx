"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FieldGroupNodeData } from "@/lib/types";

function FieldGroupNodeComponent({ data }: NodeProps) {
  const d = data as unknown as FieldGroupNodeData;
  return (
    <div className="rounded-lg border-2 border-fieldgroup bg-fieldgroup-light shadow-md w-64 overflow-hidden">
      <div className="bg-fieldgroup px-3 py-1.5 text-white text-xs font-semibold uppercase tracking-wide">
        Field Group
      </div>
      <div className="p-3 space-y-1">
        <p className="font-semibold text-sm text-gray-900 truncate">{d.label}</p>
        {d.description && (
          <p className="text-xs text-gray-500 truncate">{d.description}</p>
        )}
        <p className="text-xs text-gray-600">
          <span className="font-medium">Fields:</span> {d.fieldCount}
        </p>
        {d.keyFields.length > 0 && (
          <div className="space-y-0.5">
            <p className="text-[10px] text-gray-500 font-medium uppercase">Key Fields</p>
            {d.keyFields.map((f) => (
              <p key={f} className="text-[11px] font-mono text-fieldgroup-dark truncate">
                {f}
              </p>
            ))}
            {d.fieldCount > 5 && (
              <p className="text-[10px] text-gray-400">
                +{d.fieldCount - 5} more
              </p>
            )}
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="!bg-fieldgroup !w-2.5 !h-2.5" />
    </div>
  );
}

export const FieldGroupNode = memo(FieldGroupNodeComponent);
