"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  type NodeTypes,
  type EdgeTypes,
  useReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { DatasetNode } from "@/components/nodes/dataset-node";
import { SchemaNode } from "@/components/nodes/schema-node";
import { FieldGroupNode } from "@/components/nodes/field-group-node";
import { FlowNode } from "@/components/nodes/flow-node";
import { SummaryNode } from "@/components/nodes/summary-node";
import { RelationshipEdge } from "@/components/edges/relationship-edge";
import { ControlsPanel } from "./controls-panel";
import { useCanvasStore } from "@/store/canvas-store";

const nodeTypes: NodeTypes = {
  datasetNode: DatasetNode,
  schemaNode: SchemaNode,
  fieldGroupNode: FieldGroupNode,
  flowNode: FlowNode,
  summaryNode: SummaryNode,
};

const edgeTypes: EdgeTypes = {
  relationshipEdge: RelationshipEdge,
};

const proOptions = { hideAttribution: true };
const fitViewOptions = { padding: 0.2 };
const MIN_ZOOM = 0.25;

interface ErdCanvasProps {
  nodes: Node[];
  edges: Edge[];
}

function layoutKey(focusNodeId: string | null, collapsed: Record<string, boolean>): string {
  const c = Object.keys(collapsed)
    .sort()
    .map((k) => `${k}:${collapsed[k]}`)
    .join(",");
  return `${focusNodeId ?? ""}|${c}`;
}

export function ErdCanvas({ nodes: externalNodes, edges: externalEdges }: ErdCanvasProps) {
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);
  const focusNodeId = useCanvasStore((s) => s.focusNodeId);
  const collapsed = useCanvasStore((s) => s.collapsed);
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(externalNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(externalEdges);
  const lastSyncedKeyRef = useRef("");
  const lastNodeSetRef = useRef("");
  useEffect(() => {
    const nodeIdList = externalNodes.map((n) => n.id).join(",");
    const layout = layoutKey(focusNodeId, collapsed);
    const newKey = `${nodeIdList}|${layout}`;
    if (newKey === lastSyncedKeyRef.current) return;
    lastSyncedKeyRef.current = newKey;
    const nodeSetChanged = nodeIdList !== lastNodeSetRef.current;
    lastNodeSetRef.current = nodeIdList;
    setNodes(externalNodes);
    setEdges(externalEdges);
    if (externalNodes.length > 0 && nodeSetChanged) {
      const timer = setTimeout(() => {
        fitView({ duration: 300, padding: 0.2, minZoom: MIN_ZOOM, maxZoom: 1 });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [externalNodes, externalEdges, focusNodeId, collapsed, setNodes, setEdges, fitView]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => setSelectedNode(node.id),
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => setSelectedNode(null), [setSelectedNode]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
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
        onlyRenderVisibleElements
        nodesDraggable={false}
        elementsSelectable={true}
        panOnScroll
        panOnDrag={true}
      >
        <ControlsPanel />
      </ReactFlow>
    </div>
  );
}
