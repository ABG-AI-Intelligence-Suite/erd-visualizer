"use client";

import { memo } from "react";
import type { ErdField } from "@/lib/types";
import { useCanvasStore } from "@/store/canvas-store";

interface FieldListProps {
  nodeId: string;
  fields: ErdField[];
  accentColor: string;
}

const MAX_VISIBLE = 20;

export const FieldList = memo(function FieldList({ nodeId, fields, accentColor }: FieldListProps) {
  const expanded = useCanvasStore((s) => s.expandedNodes[nodeId] ?? false);
  const toggle = useCanvasStore((s) => s.toggleNodeExpanded);

  if (fields.length === 0) {
    return (
      <div className="px-3 py-1.5 text-[10px] text-gray-400 italic">
        No fields resolved
      </div>
    );
  }

  const visibleFields = expanded ? fields.slice(0, MAX_VISIBLE) : [];
  const hasMore = fields.length > MAX_VISIBLE;

  return (
    <div className="border-t border-gray-200">
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggle(nodeId);
        }}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 transition-colors"
      >
        <span className="text-[11px] font-medium text-gray-600">
          Fields ({fields.length})
        </span>
        <span className="text-[10px] text-gray-400">
          {expanded ? "\u25B2" : "\u25BC"}
        </span>
      </button>
      {expanded && (
        <div className="max-h-[300px] overflow-y-auto">
          {visibleFields.map((field) => (
            <div
              key={field.path}
              className="flex items-center gap-1.5 px-3 py-0.5 text-[11px] hover:bg-gray-50"
            >
              {field.isPrimaryKey && (
                <span className={`bg-${accentColor}-dark text-white rounded px-1 py-0 text-[9px] font-bold shrink-0`}>
                  PK
                </span>
              )}
              {field.isForeignKey && (
                <span className="bg-amber-600 text-white rounded px-1 py-0 text-[9px] font-bold shrink-0">
                  FK
                </span>
              )}
              <span className="font-mono text-gray-800 truncate" title={field.path}>
                {field.name}
              </span>
              <span className="text-gray-400 ml-auto shrink-0 text-[10px]">
                {field.type}
              </span>
            </div>
          ))}
          {hasMore && (
            <div className="px-3 py-1 text-[10px] text-gray-400 italic">
              +{fields.length - MAX_VISIBLE} more fields
            </div>
          )}
        </div>
      )}
    </div>
  );
});
