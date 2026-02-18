"use client";

import { useCallback, useMemo, memo, useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import { Toolbar } from "@/components/toolbar/toolbar";
import { ErdCanvas } from "@/components/canvas/erd-canvas";
import { DetailPanel } from "@/components/sidebar/detail-panel";
import { useCanvasStore } from "@/store/canvas-store";
import { useAepData } from "@/hooks/use-aep-data";
import { useFilteredGraph } from "@/hooks/use-filtered-graph";
import { getMockTransformInput } from "@/lib/mock-data";
import type { AepConnectionConfig } from "@/lib/types";

const URL_REGEX = /(https?:\/\/[^\s]+|\/api\/[^\s]+)/g;

function getErrorTitle(message: string): string {
  if (message.includes("401")) return "Authentication Error";
  if (message.includes("403")) return "Permission Error";
  return "Connection Error";
}

function renderErrorWithLinks(text: string) {
  const parts = text.split(URL_REGEX);
  return parts.map((part, idx) => {
    if (/^(https?:\/\/[^\s]+|\/api\/[^\s]+)$/.test(part)) {
      return (
        <a
          key={`${part}-${idx}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-red-300 hover:decoration-red-600 text-red-800"
        >
          {part}
        </a>
      );
    }
    return <span key={`${part}-${idx}`}>{part}</span>;
  });
}

function EmptyState({ onLoadSample }: { onLoadSample: () => void }) {
  const connection = useCanvasStore((s) => s.connection);
  const hasNodes = useCanvasStore((s) => s.rawNodes.length > 0);

  if (connection || hasNodes) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: 60 }}>
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-400">
          Enter your AEP credentials to get started
        </p>
        <p className="text-sm text-gray-300 mt-1">
          Your credentials are only sent to the Next.js proxy and never stored
        </p>
        <button
          onClick={onLoadSample}
          className="mt-4 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors pointer-events-auto"
        >
          Load Sample Data
        </button>
        <p className="text-xs text-gray-300 mt-2">
          Preview the visualizer with a sample retail/CRM dataset
        </p>
      </div>
    </div>
  );
}

function LoadingOverlay({ loading }: { loading: boolean }) {
  if (!loading) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/60" style={{ top: 60 }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-600 mt-2">Fetching AEP data...</p>
      </div>
    </div>
  );
}

function ErrorBanner({ fetchError }: { fetchError: string | null }) {
  const storeError = useCanvasStore((s) => s.error);
  const setError = useCanvasStore((s) => s.setError);
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  const displayError = storeError || fetchError;
  useEffect(() => {
    if (!displayError) {
      setDismissedError(null);
    }
  }, [displayError]);
  if (!displayError || dismissedError === displayError) return null;
  const title = getErrorTitle(displayError);
  const details = displayError
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const isAuthError = displayError.includes("401");

  return (
    <div className="absolute left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4" style={{ top: 72 }}>
      <div className="bg-white border border-red-200 rounded-xl p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-sm font-bold">
              !
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-red-800">{title}</h3>
              <p className="text-xs text-red-600 mt-0.5">
                The request could not complete. Review details below.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setDismissedError(displayError);
              setError(null);
            }}
            className="text-red-400 hover:text-red-600 text-lg leading-none"
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>

        <div className="mt-3 space-y-2 max-h-44 overflow-auto rounded-md border border-red-100 bg-red-50/60 p-2">
          {details.map((line, idx) => (
            <p key={`${line}-${idx}`} className="text-xs text-red-800 break-words font-mono">
              {renderErrorWithLinks(line)}
            </p>
          ))}
        </div>

        {isAuthError && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2.5">
            <p className="text-xs font-medium text-amber-800">Quick auth checks</p>
            <ul className="text-xs text-amber-800 mt-1 space-y-0.5 list-disc pl-4">
              <li>Use a fresh bearer token (tokens expire quickly).</li>
              <li>Confirm token org matches the entered org ID.</li>
              <li>Verify API key and sandbox name are correct.</li>
            </ul>
          </div>
        )}

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => {
              void navigator.clipboard.writeText(displayError);
            }}
            className="text-xs px-2.5 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50"
          >
            Copy details
          </button>
          <p className="text-xs text-gray-500">
            Check browser console and terminal for full request traces.
          </p>
        </div>
      </div>
    </div>
  );
}

const CanvasArea = memo(function CanvasArea({
  nodes,
  edges,
  selectedNode,
}: {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
}) {
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1">
        <ErdCanvas nodes={nodes} edges={edges} />
      </div>
      <DetailPanel selectedNode={selectedNode} />
    </div>
  );
});

const ToolbarArea = memo(function ToolbarArea({
  onConnect,
  onLoadCache,
  nodes,
  focusSchemaShown,
  focusSchemaTotal,
  canLoadMoreFocusResults,
  onLoadMoreFocusResults,
  focusPageSizeSchemas,
  focusPageSizeNodes,
}: {
  onConnect: (config: AepConnectionConfig) => void;
  onLoadCache: () => void | Promise<void>;
  nodes: Node[];
  focusSchemaShown: number;
  focusSchemaTotal: number;
  canLoadMoreFocusResults: boolean;
  onLoadMoreFocusResults: () => void;
  focusPageSizeSchemas: number;
  focusPageSizeNodes: number;
}) {
  return (
    <Toolbar
      onConnect={onConnect}
      onLoadCache={onLoadCache}
      nodes={nodes}
      focusSchemaShown={focusSchemaShown}
      focusSchemaTotal={focusSchemaTotal}
      canLoadMoreFocusResults={canLoadMoreFocusResults}
      onLoadMoreFocusResults={onLoadMoreFocusResults}
      focusPageSizeSchemas={focusPageSizeSchemas}
      focusPageSizeNodes={focusPageSizeNodes}
    />
  );
});

function FlowContent({
  onConnect,
  onLoadCache,
}: {
  onConnect: (config: AepConnectionConfig) => void;
  onLoadCache: () => void | Promise<void>;
}) {
  const {
    nodes,
    edges,
    focusSchemaShown,
    focusSchemaTotal,
    canLoadMoreFocusResults,
    loadMoreFocusResults,
    focusPageSizeSchemas,
    focusPageSizeNodes,
  } = useFilteredGraph();
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const nodeById = useMemo(() => {
    const map = new Map<string, Node>();
    for (let i = 0; i < nodes.length; i++) {
      map.set(nodes[i].id, nodes[i]);
    }
    return map;
  }, [nodes]);
  const selectedNode = useMemo(
    () => (selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null),
    [nodeById, selectedNodeId]
  );
  return (
    <>
      <ToolbarArea
        onConnect={onConnect}
        onLoadCache={onLoadCache}
        nodes={nodes}
        focusSchemaShown={focusSchemaShown}
        focusSchemaTotal={focusSchemaTotal}
        canLoadMoreFocusResults={canLoadMoreFocusResults}
        onLoadMoreFocusResults={loadMoreFocusResults}
        focusPageSizeSchemas={focusPageSizeSchemas}
        focusPageSizeNodes={focusPageSizeNodes}
      />
      <CanvasArea nodes={nodes} edges={edges} selectedNode={selectedNode} />
    </>
  );
}

export default function Home() {
  const setConnection = useCanvasStore((s) => s.setConnection);
  const setIsLoading = useCanvasStore((s) => s.setIsLoading);
  const setError = useCanvasStore((s) => s.setError);

  const { fetchAll, loading, error: fetchError, loadMockData, restoreCachedGraph } = useAepData();

  const handleConnect = useCallback(
    async (config: AepConnectionConfig) => {
      setConnection(config);
      setIsLoading(true);
      setError(null);
      try {
        await fetchAll(config);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Connection failed");
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAll, setConnection, setIsLoading, setError]
  );

  const handleLoadSample = useCallback(() => {
    loadMockData(getMockTransformInput());
  }, [loadMockData]);

  const handleLoadCache = useCallback(async () => {
    const cached = await restoreCachedGraph();
    if (!cached) {
      setError("No cached graph found on this browser.");
      return;
    }
    setError(null);
  }, [restoreCachedGraph, setError]);

  return (
    <div className="h-screen flex flex-col">
      <ReactFlowProvider>
        <FlowContent onConnect={handleConnect} onLoadCache={handleLoadCache} />
      </ReactFlowProvider>
      <EmptyState onLoadSample={handleLoadSample} />
      <LoadingOverlay loading={loading} />
      <ErrorBanner fetchError={fetchError} />
    </div>
  );
}
