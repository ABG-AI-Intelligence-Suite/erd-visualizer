"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DatasetNodeData } from "@/lib/types";

function DatasetNodeComponent({ data }: NodeProps) {
  const d = data as unknown as DatasetNodeData;
  return (
    <div className="rounded-lg border-2 border-dataset bg-dataset-light shadow-md w-64 overflow-hidden">
      <div className="bg-dataset px-3 py-1.5 text-white text-xs font-semibold uppercase tracking-wide flex items-center justify-between">
        <span>Dataset</span>
        {d.profileEnabled && (
          <span className="bg-white/20 rounded px-1.5 py-0.5 text-[10px]">
            Profile
          </span>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="font-semibold text-sm text-gray-900 truncate">{d.label}</p>
        {d.description && (
          <p className="text-xs text-gray-500 truncate">{d.description}</p>
        )}
        {d.schemaRefId && (
          <p className="text-xs text-gray-600">
            <span className="font-medium">Schema:</span>{" "}
            <span className="text-dataset-dark truncate inline-block max-w-[180px] align-bottom">
              {d.schemaRefId.split("/").pop()}
            </span>
          </p>
        )}
        {d.identityField && (
          <p className="text-xs">
            <span className="bg-dataset-dark text-white rounded px-1 py-0.5 text-[10px] font-mono">
              PK
            </span>{" "}
            <span className="text-gray-700 font-mono text-[11px]">{d.identityField}</span>
          </p>
        )}
        {d.format && (
          <p className="text-[10px] text-gray-400 uppercase">{d.format}</p>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-dataset !w-2.5 !h-2.5" />
      <Handle type="target" position={Position.Left} className="!bg-dataset !w-2.5 !h-2.5" />
    </div>
  );
}

export const DatasetNode = memo(DatasetNodeComponent);
