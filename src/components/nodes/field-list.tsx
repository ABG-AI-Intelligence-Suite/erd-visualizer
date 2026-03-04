"use client";

import { memo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      <div className="px-3 py-1.5 text-[10px] text-muted-foreground italic border-t">
        No fields resolved
      </div>
    );
  }

  const visibleFields = expanded ? fields.slice(0, MAX_VISIBLE) : [];
  const hasMore = fields.length > MAX_VISIBLE;

  return (
    <div className="border-t">
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggle(nodeId);
        }}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent transition-colors"
      >
        <span className="text-[11px] font-medium text-muted-foreground">
          Fields ({fields.length})
        </span>
        {expanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <ScrollArea className="max-h-[300px]">
          {visibleFields.map((field) => (
            <div
              key={field.path}
              className="flex items-center gap-1.5 px-3 py-0.5 text-[11px] hover:bg-accent transition-colors"
            >
              {field.isPrimaryKey && (
                <Badge className={`bg-${accentColor}-dark text-white text-[8px] px-1 py-0 h-3.5 shrink-0`}>
                  PK
                </Badge>
              )}
              {field.isForeignKey && (
                <Badge className="bg-amber-600 text-white text-[8px] px-1 py-0 h-3.5 shrink-0">
                  FK
                </Badge>
              )}
              {field.isFacCandidate && (
                <Badge className="bg-rose-500 text-white text-[8px] px-1 py-0 h-3.5 shrink-0">
                  FAC
                </Badge>
              )}
              <span className="font-mono text-foreground truncate" title={field.path}>
                {field.name}
              </span>
              <span className="text-muted-foreground ml-auto shrink-0 text-[10px]">
                {field.type}
              </span>
            </div>
          ))}
          {hasMore && (
            <div className="px-3 py-1 text-[10px] text-muted-foreground italic">
              +{fields.length - MAX_VISIBLE} more fields
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
});
