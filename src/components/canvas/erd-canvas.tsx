"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const viewMode = useCanvasStore((s) => s.viewMode);
  const { setCenter, fitView } = useReactFlow();
  const [nodes, setNodes] = useState<Node[]>(externalNodes);

  const prevFocusNodeIdRef = useRef<string | null>(null);

  useEffect(() => {
    setNodes(externalNodes);

    if (focusNodeId) {
      prevFocusNodeIdRef.current = focusNodeId;
      return;
    }

    if (prevFocusNodeIdRef.current) {
      const lastNode = externalNodes.find((n) => n.id === prevFocusNodeIdRef.current);
      prevFocusNodeIdRef.current = null;
      if (lastNode) {
        const id = requestAnimationFrame(() =>
          setCenter(lastNode.position.x + 132, lastNode.position.y + 40, { zoom: 0.85, duration: 300 })
        );
        return () => cancelAnimationFrame(id);
      }
    }

    if (externalNodes.length > 0) {
      const id = requestAnimationFrame(() => fitView({ padding: 0.15, duration: 400 }));
      return () => cancelAnimationFrame(id);
    }
  }, [externalNodes, focusNodeId, fitView, setCenter]);

  useEffect(() => {
    if (!focusNodeId) return;
    const focused = externalNodes.find((n) => n.id === focusNodeId);
    if (!focused) return;
    const x = focused.position.x + 132;
    const y = focused.position.y + 40;
    setCenter(x, y, { zoom: 1.15, duration: 250 });
  }, [focusNodeId, externalNodes, setCenter]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    if (viewMode === "schema" && focusNodeId) setFocusNode(null);
  }, [setSelectedNode, setFocusNode, viewMode, focusNodeId]);

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (viewMode !== "schema") return;
      setFocusNode(focusNodeId === node.id ? null : node.id);
    },
    [viewMode, focusNodeId, setFocusNode],
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
        elevateEdgesOnSelect={false}
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
        onlyRenderVisibleElements
      >
        <ControlsPanel />
        <MiniMap
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
          maskColor="rgba(0,0,0,0.08)"
          className="!bg-card/90 !border !rounded-lg !shadow-sm"
          pannable
          zoomable
        />
      </ReactFlow>
      <LegendOverlay />
    </div>
  );
}
