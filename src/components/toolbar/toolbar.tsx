"use client";

import { ConnectionForm } from "./connection-form";
import { FilterControls } from "./filter-controls";
import { SearchBar } from "./search-bar";
import { useCanvasStore } from "@/store/canvas-store";
import type { AepConnectionConfig } from "@/lib/types";
import type { Node } from "@xyflow/react";

interface ToolbarProps {
  onConnect: (config: AepConnectionConfig) => void;
  nodes: Node[];
}

export function Toolbar({ onConnect, nodes }: ToolbarProps) {
  const connection = useCanvasStore((s) => s.connection);
  const isLoading = useCanvasStore((s) => s.isLoading);
  const filters = useCanvasStore((s) => s.filters);
  const toggleFilter = useCanvasStore((s) => s.toggleFilter);
  const clearConnection = useCanvasStore((s) => s.clearConnection);
  const error = useCanvasStore((s) => s.error);
  const focusNodeId = useCanvasStore((s) => s.focusNodeId);
  const setFocusNode = useCanvasStore((s) => s.setFocusNode);
  const collapsed = useCanvasStore((s) => s.collapsed);
  const toggleCollapse = useCanvasStore((s) => s.toggleCollapse);

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2.5 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-gray-900 whitespace-nowrap">
            AEP ERD Visualizer
          </h1>
          <ConnectionForm
            onConnect={onConnect}
            isConnected={!!connection}
            isLoading={isLoading}
            onDisconnect={clearConnection}
          />
        </div>
        {connection && (
          <div className="flex items-center gap-3">
            <SearchBar nodes={nodes} />
            <FilterControls
              filters={filters}
              onToggle={toggleFilter}
              collapsed={collapsed}
              onToggleCollapse={toggleCollapse}
            />
          </div>
        )}
      </div>
      {focusNodeId && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded px-3 py-1.5">
          <span className="text-xs text-blue-700">
            Focus mode: showing only connections for selected node
          </span>
          <button
            onClick={() => setFocusNode(null)}
            className="text-xs text-blue-600 font-medium hover:underline"
          >
            Exit focus mode
          </button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded px-3 py-1.5 text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
