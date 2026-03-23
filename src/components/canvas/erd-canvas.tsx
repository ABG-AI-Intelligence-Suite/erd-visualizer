"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Map } from "lucide-react";
import {
  applyNodeChanges,
  ReactFlow,
  MiniMap,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type NodeChange,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { DatasetNode } from "@/components/nodes/dataset-node";
import { SchemaNode } from "@/components/nodes/schema-node";
import { FieldGroupNode } from "@/components/nodes/field-group-node";
import { FlowNode } from "@/components/nodes/flow-node";
import { SummaryNode } from "@/components/nodes/summary-node";
import { IdentityNode } from "@/components/nodes/identity-node";
import { RelationshipEdge } from "@/components/edges/relationship-edge";
import { ControlsPanel } from "./controls-panel";
import { LegendOverlay } from "./legend-overlay";
import { useCanvasStore } from "@/store/canvas-store";

const nodeTypes: NodeTypes = {
  datasetNode: DatasetNode,
  schemaNode: SchemaNode,
  fieldGroupNode: FieldGroupNode,
  flowNode: FlowNode,
  summaryNode: SummaryNode,
  identityNode: IdentityNode,
};

const edgeTypes: EdgeTypes = {
  relationshipEdge: RelationshipEdge,
};

const proOptions = { hideAttribution: true };
const fitViewOptions = { padding: 0.2 };
const MIN_ZOOM = 0.5;

interface ErdCanvasProps {
  nodes: Node[];
  edges: Edge[];
}

export function ErdCanvas({ nodes: externalNodes, edges: externalEdges }: ErdCanvasProps) {
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);
  const focusNodeId = useCanvasStore((s) => s.focusNodeId);
  const setFocusNode = useCanvasStore((s) => s.setFocusNode);
  const scrollToNodeId = useCanvasStore((s) => s.scrollToNodeId);
  const setScrollToNode = useCanvasStore((s) => s.setScrollToNode);
  const { setCenter, fitView } = useReactFlow();
  const [nodes, setNodes] = useState<Node[]>(externalNodes);
  const [minimapVisible, setMinimapVisible] = useState(true);

  const prevFocusNodeIdRef = useRef<string | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    setNodes(externalNodes);

    if (focusNodeId) {
      prevFocusNodeIdRef.current = focusNodeId;
      return;
    }

    cancelAnimationFrame(rafRef.current);

    if (prevFocusNodeIdRef.current) {
      const lastNode = externalNodes.find((n) => n.id === prevFocusNodeIdRef.current);
      prevFocusNodeIdRef.current = null;
      if (lastNode) {
        rafRef.current = requestAnimationFrame(() =>
          setCenter(lastNode.position.x + 132, lastNode.position.y + 40, { zoom: 0.85, duration: 300 })
        );
        return () => cancelAnimationFrame(rafRef.current);
      }
    }

    if (externalNodes.length > 0) {
      rafRef.current = requestAnimationFrame(() => fitView({ padding: 0.15, duration: 400 }));
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [externalNodes, focusNodeId, fitView, setCenter]);

  useEffect(() => {
    if (!focusNodeId) return;
    const focused = externalNodes.find((n) => n.id === focusNodeId);
    if (!focused) return;
    const x = focused.position.x + 132;
    const y = focused.position.y + 40;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() =>
      setCenter(x, y, { zoom: 1.15, duration: 250 })
    );
    return () => cancelAnimationFrame(rafRef.current);
  }, [focusNodeId, externalNodes, setCenter]);

  // Navigate to a node without entering focus mode (used by command palette search)
  useEffect(() => {
    if (!scrollToNodeId) return;
    const target = externalNodes.find((n) => n.id === scrollToNodeId);
    if (!target) return;
    const x = target.position.x + 132;
    const y = target.position.y + 40;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setCenter(x, y, { zoom: 1.2, duration: 500 });
      setScrollToNode(null);
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [scrollToNodeId, externalNodes, setCenter, setScrollToNode]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const detailPanelPinned = useCanvasStore((s) => s.detailPanelPinned);

  const onPaneClick = useCallback(() => {
    if (!detailPanelPinned) setSelectedNode(null);
    if (focusNodeId) setFocusNode(null);
  }, [setSelectedNode, setFocusNode, focusNodeId, detailPanelPinned]);

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setFocusNode(focusNodeId === node.id ? null : node.id);
    },
    [focusNodeId, setFocusNode],
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }, []);

  const hiddenNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].hidden) ids.add(nodes[i].id);
    }
    return ids;
  }, [nodes]);

  const edges = useMemo(
    () =>
      externalEdges.map((edge) => ({
        ...edge,
        hidden: hiddenNodeIds.has(edge.source) || hiddenNodeIds.has(edge.target),
      })),
    [externalEdges, hiddenNodeIds]
  );

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitViewOptions={fitViewOptions}
        minZoom={MIN_ZOOM}
        maxZoom={3}
        elevateEdgesOnSelect={true}
        nodesConnectable={false}
        edgesReconnectable={false}
        deleteKeyCode={null}
        proOptions={proOptions}
        nodesDraggable={true}
        elementsSelectable={true}
        panOnScroll
        panOnDrag={true}
        nodesFocusable={true}
        edgesFocusable={false}

      >
        <ControlsPanel />
        {minimapVisible && (
          <MiniMap
            style={{ width: 400, height: 300 }}
            nodeColor={(node) => {
              const colorMap: Record<string, string> = {
                datasetNode: "#3b82f6",
                schemaNode: "#8b5cf6",
                fieldGroupNode: "#22c55e",
                flowNode: "#f97316",
                summaryNode: "#94a3b8",
                identityNode: "#0ea5e9",
              };
              return colorMap[node.type ?? ""] ?? "#94a3b8";
            }}
            nodeStrokeWidth={4}
            maskColor="rgba(0,0,0,0.08)"
            className="!bg-card/90 !border !rounded-lg !shadow-sm"
            pannable
            zoomable
          />
        )}
      </ReactFlow>
      {/* Minimap toggle button — sits above/beside the minimap in the bottom-right */}
      <button
        onClick={() => setMinimapVisible((v) => !v)}
        className="absolute z-20 flex items-center gap-1 rounded-md border bg-card/90 px-2 py-1 text-[11px] font-medium shadow-sm hover:bg-accent transition-colors"
        style={{ bottom: minimapVisible ? 316 : 12, right: 12 }}
        title={minimapVisible ? "Collapse minimap" : "Expand minimap"}
      >
        <Map className="h-3 w-3" />
        <span>Map</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${minimapVisible ? "" : "rotate-180"}`}
        />
      </button>
      <LegendOverlay />
    </div>
  );
}
