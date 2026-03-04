"use client";

import { FilterControls } from "./filter-controls";
import { useCanvasStore } from "@/store/canvas-store";
import type { Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, Layers } from "lucide-react";

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
  const futureStateNodes = useCanvasStore((s) => s.futureStateNodes);
  const futureStateVisible = useCanvasStore((s) => s.futureStateVisible);
  const toggleFutureStateVisible = useCanvasStore((s) => s.toggleFutureStateVisible);
  const hasFutureState = futureStateNodes.length > 0;

  if (!isConnected && !hasGraph) return null;

  return (
    <div className="border-b bg-card/50">
      {/* Filter bar — full view */}
      {viewMode === "full" && (
        <div className="flex items-center gap-2 px-4 py-1.5">
          <FilterControls
            filters={filters}
            onToggle={toggleFilter}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
          />
          {hasFutureState && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Toggle
                      pressed={futureStateVisible}
                      onPressedChange={toggleFutureStateVisible}
                      size="sm"
                      className="h-7 text-[11px] px-2.5 data-[state=on]:bg-teal-100 data-[state=on]:text-teal-800 data-[state=on]:border-teal-300"
                    >
                      <Layers className="h-3 w-3 mr-1" />
                      Future State ({futureStateNodes.length})
                    </Toggle>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Show or hide the imported future state schema layer</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      )}

      {/* Filter bar — schema view */}
      {viewMode === "schema" && (
        <div className="flex items-center gap-2 px-4 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Filter</span>
          <Separator orientation="vertical" className="h-5" />
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Toggle
                  pressed={filters.identityLinks}
                  onPressedChange={() => toggleFilter("identityLinks")}
                  size="sm"
                  className="h-7 text-[11px] px-2.5"
                >
                  Identity Links
                </Toggle>
              </span>
            </TooltipTrigger>
            <TooltipContent>Show edges between schemas sharing the same primary identity namespace</TooltipContent>
          </Tooltip>
          {hasFutureState && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Toggle
                      pressed={futureStateVisible}
                      onPressedChange={toggleFutureStateVisible}
                      size="sm"
                      className="h-7 text-[11px] px-2.5 data-[state=on]:bg-teal-100 data-[state=on]:text-teal-800 data-[state=on]:border-teal-300"
                    >
                      <Layers className="h-3 w-3 mr-1" />
                      Future State ({futureStateNodes.length})
                    </Toggle>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Show or hide the imported future state schema layer</TooltipContent>
              </Tooltip>
            </>
          )}
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
