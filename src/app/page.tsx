"use client";

import { useCallback } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Toolbar } from "@/components/toolbar/toolbar";
import { ErdCanvas } from "@/components/canvas/erd-canvas";
import { DetailPanel } from "@/components/sidebar/detail-panel";
import { useCanvasStore } from "@/store/canvas-store";
import { useAepData } from "@/hooks/use-aep-data";
import { getMockTransformInput } from "@/lib/mock-data";
import type { AepConnectionConfig } from "@/lib/types";

export default function Home() {
  const setConnection = useCanvasStore((s) => s.setConnection);
  const setIsLoading = useCanvasStore((s) => s.setIsLoading);
  const setError = useCanvasStore((s) => s.setError);
  const filters = useCanvasStore((s) => s.filters);
  const connection = useCanvasStore((s) => s.connection);

  const error = useCanvasStore((s) => s.error);
  const { fetchAll, getFilteredGraph, loading, error: fetchError, loadMockData } = useAepData();

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

  const displayError = error || fetchError;

  const handleLoadSample = useCallback(() => {
    loadMockData(getMockTransformInput());
  }, [loadMockData]);

  const { nodes, edges } = getFilteredGraph(filters);

  return (
    <div className="h-screen flex flex-col">
      <Toolbar onConnect={handleConnect} />
      <div className="flex-1 flex overflow-hidden">
        <ReactFlowProvider>
          <div className="flex-1">
            <ErdCanvas nodes={nodes} edges={edges} />
          </div>
          <DetailPanel nodes={nodes} />
        </ReactFlowProvider>
      </div>
      {!connection && nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: 60 }}>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-400">
              Enter your AEP credentials to get started
            </p>
            <p className="text-sm text-gray-300 mt-1">
              Your credentials are only sent to the Next.js proxy and never stored
            </p>
            <button
              onClick={handleLoadSample}
              className="mt-4 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors pointer-events-auto"
            >
              Load Sample Data
            </button>
            <p className="text-xs text-gray-300 mt-2">
              Preview the visualizer with a sample retail/CRM dataset
            </p>
          </div>
        </div>
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60" style={{ top: 60 }}>
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-600 mt-2">Fetching AEP data...</p>
          </div>
        </div>
      )}
      {displayError && !loading && (
        <div className="absolute left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4" style={{ top: 72 }}>
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-red-500 text-xl leading-none mt-0.5">!</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-red-800">Connection Error</h3>
                <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap break-words font-mono">
                  {displayError}
                </p>
                <p className="text-xs text-red-500 mt-2">
                  Check the browser console (F12) and the terminal for more details.
                </p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
