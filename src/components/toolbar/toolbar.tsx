"use client";

import { FilterControls } from "./filter-controls";
import { useCanvasStore } from "@/store/canvas-store";
import type { Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface ToolbarProps {
  nodes: Node[];
  focusSchemaShown: number;
  focusSchemaTotal: number;
  canLoadMoreFocusResults: boolean;
  onLoadMoreFocusResults: () => void;
  focusPageSizeSchemas: number;
  focusPageSizeNodes: number;
}

export function Toolbar({
  nodes,
  focusSchemaShown,
  focusSchemaTotal,
  canLoadMoreFocusResults,
  onLoadMoreFocusResults,
  focusPageSizeSchemas,
  focusPageSizeNodes,
}: ToolbarProps) {
  const connection = useCanvasStore((s) => s.connection);
  const isConnected = Boolean(connection);
  const filters = useCanvasStore((s) => s.filters);
  const toggleFilter = useCanvasStore((s) => s.toggleFilter);
  const focusNodeId = useCanvasStore((s) => s.focusNodeId);
  const setFocusNode = useCanvasStore((s) => s.setFocusNode);
  const collapsed = useCanvasStore((s) => s.collapsed);
  const toggleCollapse = useCanvasStore((s) => s.toggleCollapse);
  const viewMode = useCanvasStore((s) => s.viewMode);
  const hasGraph = nodes.length > 0;

  if (!isConnected && !hasGraph) return null;

  return (
    <div className="border-b bg-card/50">
      {/* Filter bar */}
      {viewMode === "full" && (
        <div className="flex items-center gap-2 px-4 py-1.5">
          <FilterControls
            filters={filters}
            onToggle={toggleFilter}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
          />
        </div>
      )}

      {/* Focus mode bar */}
      {focusNodeId && (
        <div className="flex items-center justify-between gap-2 border-t bg-blue-50 px-4 py-1.5">
          <div className="flex items-center gap-2">
            <ChevronRight className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-[11px] font-semibold text-blue-700">
              Focus mode
            </span>
            {focusSchemaTotal > 0 && (
              <span className="text-[11px] text-blue-600">
                {focusSchemaShown}/{focusSchemaTotal} schemas
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {canLoadMoreFocusResults && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={onLoadMoreFocusResults}
              >
                Load +{focusPageSizeSchemas} schemas (~+{focusPageSizeNodes} nodes)
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] border-blue-300 text-blue-700 hover:bg-blue-100"
              onClick={() => setFocusNode(null)}
            >
              Exit focus
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
