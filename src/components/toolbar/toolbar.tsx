"use client";

import { ConnectionForm } from "./connection-form";
import { FilterControls } from "./filter-controls";
import { SearchBar } from "./search-bar";
import { useCanvasStore } from "@/store/canvas-store";
import type { AepConnectionConfig } from "@/lib/types";
import type { Node } from "@xyflow/react";

interface ToolbarProps {
  onConnect: (config: AepConnectionConfig) => void;
  onLoadCache: () => void | Promise<void>;
  nodes: Node[];
  focusSchemaShown: number;
  focusSchemaTotal: number;
  canLoadMoreFocusResults: boolean;
  onLoadMoreFocusResults: () => void;
  focusPageSizeSchemas: number;
  focusPageSizeNodes: number;
}

export function Toolbar({
  onConnect,
  onLoadCache,
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
  const isLoading = useCanvasStore((s) => s.isLoading);
  const filters = useCanvasStore((s) => s.filters);
  const toggleFilter = useCanvasStore((s) => s.toggleFilter);
  const clearConnection = useCanvasStore((s) => s.clearConnection);
  const error = useCanvasStore((s) => s.error);
  const focusNodeId = useCanvasStore((s) => s.focusNodeId);
  const setFocusNode = useCanvasStore((s) => s.setFocusNode);
  const collapsed = useCanvasStore((s) => s.collapsed);
  const toggleCollapse = useCanvasStore((s) => s.toggleCollapse);
  const viewMode = useCanvasStore((s) => s.viewMode);
  const setViewMode = useCanvasStore((s) => s.setViewMode);
  const hasGraph = nodes.length > 0;

  return (
    <div className="border-b border-slate-200 bg-white px-3 py-2">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-xs font-semibold uppercase tracking-wide text-slate-700">
              AEP ERD Visualizer
            </h1>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                isConnected
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : hasGraph
                    ? "border-slate-200 bg-slate-100 text-slate-600"
                    : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {isConnected ? "Connected" : hasGraph ? "Cached" : "Offline"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(isConnected || hasGraph) && (
              <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5">
                <button
                  onClick={() => setViewMode("full")}
                  className={`rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                    viewMode === "full"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Full
                </button>
                <button
                  onClick={() => setViewMode("schema")}
                  className={`rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                    viewMode === "schema"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Schema
                </button>
              </div>
            )}
            <button
              onClick={() => {
                void onLoadCache();
              }}
              className="inline-flex h-7 items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Load Cache
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-slate-50/60 px-2.5 py-2">
          <div className="flex min-w-[320px] flex-1 items-end gap-2">
            <div className="min-w-[72px] pb-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Connection
            </div>
            <ConnectionForm
              onConnect={onConnect}
              isConnected={isConnected}
              isLoading={isLoading}
              onDisconnect={clearConnection}
            />
          </div>

          {(isConnected || hasGraph) && (
            <>
              <div className="hidden h-6 w-px bg-slate-200 xl:block" />
              <div className="flex min-w-[320px] flex-1 items-end gap-2">
                <div className="min-w-[56px] pb-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                  Explore
                </div>
                <SearchBar nodes={nodes} />
              </div>
            </>
          )}
        </div>

        {(isConnected || hasGraph) && viewMode === "full" && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Graph</span>
            <div className="h-4 w-px bg-slate-200" />
            <div className="min-w-0 flex-1">
              <FilterControls
                filters={filters}
                onToggle={toggleFilter}
                collapsed={collapsed}
                onToggleCollapse={toggleCollapse}
              />
            </div>
          </div>
        )}
      </div>

      {focusNodeId && (
        <div className="mx-auto mt-2 flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-blue-700">
              Focus mode active
            </span>
            <span className="text-[11px] text-blue-700">
              Showing connected path for selected node.
            </span>
            {focusSchemaTotal > 0 && (
              <span className="text-[11px] text-blue-700">
                Schemas {focusSchemaShown}/{focusSchemaTotal}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {canLoadMoreFocusResults && (
              <button
                onClick={onLoadMoreFocusResults}
                className="rounded border border-blue-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700 transition-colors hover:bg-blue-100"
              >
                Load +{focusPageSizeSchemas} schemas (~+{focusPageSizeNodes} nodes)
              </button>
            )}
            <button
              onClick={() => setFocusNode(null)}
              className="rounded border border-blue-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700 transition-colors hover:bg-blue-100"
            >
              Exit focus mode
            </button>
          </div>
        </div>
      )}
      {error && (
        <div className="mx-auto mt-2 w-full max-w-[1600px] rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
