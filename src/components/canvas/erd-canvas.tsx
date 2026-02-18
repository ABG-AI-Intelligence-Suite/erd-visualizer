"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyNodeChanges,
  ReactFlow,
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
const MIN_ZOOM = 0.25;

interface ErdCanvasProps {
  nodes: Node[];
  edges: Edge[];
}

function buildChildMap(edges: Edge[]): Map<string, string[]> {
  const children = new Map<string, string[]>();
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const relType = (edge.data as { relationshipType?: string } | undefined)?.relationshipType;
    // Only make schema -> field group relationships collapsible via node click.
    if (relType !== "schema-fieldgroup") continue;
    const list = children.get(edge.source);
    if (list) list.push(edge.target);
    else children.set(edge.source, [edge.target]);
  }
  return children;
}

function initializeCanvasNodes(
  sourceNodes: Node[],
  sourceEdges: Edge[],
  collapseFieldGroupsByDefault: boolean
): Node[] {
  const childMap = buildChildMap(sourceEdges);
  const initialized: Node[] = [];
  for (let i = 0; i < sourceNodes.length; i++) {
    const node = sourceNodes[i];
    const children = childMap.get(node.id) ?? [];
    const nextData = { ...(node.data as Record<string, unknown>), children };
    const shouldHide = collapseFieldGroupsByDefault && node.type === "fieldGroupNode";
    initialized.push({
      ...node,
      data: nextData,
      hidden: shouldHide,
    });
  }
  return initialized;
}

export function ErdCanvas({ nodes: externalNodes, edges: externalEdges }: ErdCanvasProps) {
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);
  const focusNodeId = useCanvasStore((s) => s.focusNodeId);
  const { setCenter } = useReactFlow();
  const [nodes, setNodes] = useState<Node[]>(
    initializeCanvasNodes(externalNodes, externalEdges, !focusNodeId)
  );

  useEffect(() => {
    setNodes(initializeCanvasNodes(externalNodes, externalEdges, !focusNodeId));
  }, [externalNodes, externalEdges, focusNodeId]);

  useEffect(() => {
    if (!focusNodeId) return;
    const focused = externalNodes.find((n) => n.id === focusNodeId);
    if (!focused) return;
    const x = focused.position.x + 132;
    const y = focused.position.y + 40;
    // Zooming in during focus mode reduces on-screen node count and DOM work.
    setCenter(x, y, { zoom: 1.15, duration: 250 });
  }, [focusNodeId, externalNodes, setCenter]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
      const children = (node.data as { children?: unknown }).children;
      if (!Array.isArray(children) || children.length === 0) return;

      const childIdSet = new Set<string>();
      for (let i = 0; i < children.length; i++) {
        if (typeof children[i] === "string") childIdSet.add(children[i]);
      }
      if (childIdSet.size === 0) return;

      setNodes((currentNodes) => {
        let anyVisibleChild = false;
        for (let i = 0; i < currentNodes.length; i++) {
          const candidate = currentNodes[i];
          if (childIdSet.has(candidate.id) && !candidate.hidden) {
            anyVisibleChild = true;
            break;
          }
        }
        const nextHidden = anyVisibleChild;
        return currentNodes.map((candidate) =>
          childIdSet.has(candidate.id) ? { ...candidate, hidden: nextHidden } : candidate
        );
      });
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => setSelectedNode(null), [setSelectedNode]);

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
      </ReactFlow>
    </div>
  );
}
