"use client";

import { ConnectionForm } from "./connection-form";
import { FilterControls } from "./filter-controls";
import { useCanvasStore } from "@/store/canvas-store";
import type { AepConnectionConfig } from "@/lib/types";

interface ToolbarProps {
  onConnect: (config: AepConnectionConfig) => void;
}

export function Toolbar({ onConnect }: ToolbarProps) {
  const connection = useCanvasStore((s) => s.connection);
  const isLoading = useCanvasStore((s) => s.isLoading);
  const filters = useCanvasStore((s) => s.filters);
  const toggleFilter = useCanvasStore((s) => s.toggleFilter);
  const clearConnection = useCanvasStore((s) => s.clearConnection);
  const error = useCanvasStore((s) => s.error);

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
        {connection && <FilterControls filters={filters} onToggle={toggleFilter} />}
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded px-3 py-1.5 text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
