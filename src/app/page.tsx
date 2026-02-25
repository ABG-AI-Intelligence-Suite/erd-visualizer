"use client";

import { useCallback, useMemo, memo } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import { AppHeader } from "@/components/layout/app-header";
import { Toolbar } from "@/components/toolbar/toolbar";
import { ErdCanvas } from "@/components/canvas/erd-canvas";
import { DetailSheet } from "@/components/sidebar/detail-sheet";
import { EmptyState } from "@/components/overlays/empty-state";
import { LoadingOverlay } from "@/components/overlays/loading-overlay";
import { ErrorBanner } from "@/components/overlays/error-banner";
import { ConnectionDialog } from "@/components/toolbar/connection-form";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { ExportDialog } from "@/components/export/export-dialog";
import { ShortcutsDialog } from "@/components/keyboard-shortcuts/shortcuts-dialog";
import { useCanvasStore } from "@/store/canvas-store";
import { useAepData } from "@/hooks/use-aep-data";
import { useEnvAutoConnect } from "@/hooks/use-env-auto-connect";
import { useSnapshots } from "@/hooks/use-snapshots";
import { useFilteredGraph } from "@/hooks/use-filtered-graph";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { getMockTransformInput } from "@/lib/mock-data";
import type { AepConnectionConfig, FetchOptions } from "@/lib/types";

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
    <div className="flex-1 relative overflow-hidden">
      <ErdCanvas nodes={nodes} edges={edges} />
      <DetailSheet selectedNode={selectedNode} nodes={nodes} edges={edges} />
    </div>
  );
});

const ToolbarArea = memo(function ToolbarArea({
  nodes,
  focusSchemaShown,
  focusSchemaTotal,
  canLoadMoreFocusResults,
  onLoadMoreFocusResults,
  focusPageSizeSchemas,
  focusPageSizeNodes,
}: {
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
  hasEnvCredentials,
  envConfig,
}: {
  onConnect: (config: AepConnectionConfig, fetchOpts?: FetchOptions) => void;
  hasEnvCredentials: boolean;
  envConfig: AepConnectionConfig | null;
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
  const setCommandPaletteOpen = useCanvasStore((s) => s.setCommandPaletteOpen);
  const setConnectionDialogOpen = useCanvasStore((s) => s.setConnectionDialogOpen);
  const setExportDialogOpen = useCanvasStore((s) => s.setExportDialogOpen);
  const setShortcutsDialogOpen = useCanvasStore((s) => s.setShortcutsDialogOpen);

  useHotkeys();

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
      <AppHeader
        onOpenConnectionDialog={() => setConnectionDialogOpen(true)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenExportDialog={() => setExportDialogOpen(true)}
        onOpenShortcutsDialog={() => setShortcutsDialogOpen(true)}
        hasEnvCredentials={hasEnvCredentials}
        envConfig={envConfig}
        onConnect={onConnect}
      />
      <ToolbarArea
        nodes={nodes}
        focusSchemaShown={focusSchemaShown}
        focusSchemaTotal={focusSchemaTotal}
        canLoadMoreFocusResults={canLoadMoreFocusResults}
        onLoadMoreFocusResults={loadMoreFocusResults}
        focusPageSizeSchemas={focusPageSizeSchemas}
        focusPageSizeNodes={focusPageSizeNodes}
      />
      <CanvasArea nodes={nodes} edges={edges} selectedNode={selectedNode} />
      <CommandPalette />
      <ExportDialog />
      <ShortcutsDialog />
    </>
  );
}

export default function Home() {
  const setConnection = useCanvasStore((s) => s.setConnection);
  const setIsLoading = useCanvasStore((s) => s.setIsLoading);
  const setError = useCanvasStore((s) => s.setError);

  const { fetchAll, fetchUpdate, loading, error: fetchError, progress, loadMockData } = useAepData();
  const { envConfig, hasCredentials } = useEnvAutoConnect();
  const { saveSnapshot } = useSnapshots();

  const handleConnect = useCallback(
    async (config: AepConnectionConfig, fetchOpts?: FetchOptions) => {
      setIsLoading(true);
      setError(null);
      try {
        await fetchAll(config, fetchOpts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Connection failed");
      } finally {
        setIsLoading(false);
        const currentNodes = useCanvasStore.getState().rawNodes;
        if (currentNodes.length > 0) {
          setConnection(config);
          const currentEdges = useCanvasStore.getState().rawEdges;
          saveSnapshot(config, currentNodes, currentEdges, fetchOpts).catch(console.error);
        }
      }
    },
    [fetchAll, setConnection, setIsLoading, setError, saveSnapshot]
  );

  const handleUpdate = useCallback(
    async (config: AepConnectionConfig, fetchOpts: FetchOptions) => {
      setIsLoading(true);
      setError(null);
      try {
        await fetchUpdate(config, fetchOpts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
      } finally {
        setIsLoading(false);
        // Update connection config (token may have been refreshed)
        const currentNodes = useCanvasStore.getState().rawNodes;
        if (currentNodes.length > 0) {
          setConnection(config);
          const currentEdges = useCanvasStore.getState().rawEdges;
          saveSnapshot(config, currentNodes, currentEdges, fetchOpts).catch(console.error);
        }
      }
    },
    [fetchUpdate, setConnection, setIsLoading, setError, saveSnapshot]
  );

  const handleLoadSample = useCallback(() => {
    loadMockData(getMockTransformInput());
  }, [loadMockData]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <ReactFlowProvider>
        <FlowContent
          onConnect={handleConnect}
          hasEnvCredentials={hasCredentials}
          envConfig={envConfig}
        />
      </ReactFlowProvider>
      <ConnectionDialog onConnect={handleConnect} onUpdate={handleUpdate} />
      <EmptyState onLoadSample={handleLoadSample} />
      <LoadingOverlay loading={loading} progress={progress} />
      <ErrorBanner fetchError={fetchError} />
    </div>
  );
}
