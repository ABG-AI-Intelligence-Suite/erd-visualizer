"use client";

import { useMemo } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCanvasStore } from "@/store/canvas-store";
import type { Node, Edge } from "@xyflow/react";
import type { RelationshipEdgeData } from "@/lib/types";

const TYPE_COLORS: Record<string, string> = {
  datasetNode: "bg-dataset",
  schemaNode: "bg-schema",
  fieldGroupNode: "bg-fieldgroup",
  flowNode: "bg-flow",
  identityNode: "bg-identity",
};

interface ConnectedItem {
  nodeId: string;
  label: string;
  nodeType: string;
  relationshipType: string;
  direction: "outgoing" | "incoming";
  edgeLabel?: string;
}

interface RelationsTabProps {
  selectedNode: Node;
  nodes: Node[];
  edges: Edge[];
}

export function RelationsTab({ selectedNode, nodes, edges }: RelationsTabProps) {
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);

  const nodeMap = useMemo(() => {
    const map = new Map<string, Node>();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  const connected = useMemo(() => {
    const items: ConnectedItem[] = [];
    for (const edge of edges) {
      const edgeData = edge.data as unknown as RelationshipEdgeData | undefined;
      const relType = edgeData?.relationshipType ?? "unknown";

      if (edge.source === selectedNode.id) {
        const target = nodeMap.get(edge.target);
        if (target) {
          items.push({
            nodeId: target.id,
            label: (target.data as { label?: string })?.label ?? target.id,
            nodeType: target.type ?? "",
            relationshipType: relType,
            direction: "outgoing",
            edgeLabel: edgeData?.label,
          });
        }
      }
      if (edge.target === selectedNode.id) {
        const source = nodeMap.get(edge.source);
        if (source) {
          items.push({
            nodeId: source.id,
            label: (source.data as { label?: string })?.label ?? source.id,
            nodeType: source.type ?? "",
            relationshipType: relType,
            direction: "incoming",
            edgeLabel: edgeData?.label,
          });
        }
      }
    }
    return items;
  }, [selectedNode.id, edges, nodeMap]);

  const grouped = useMemo(() => {
    const groups = new Map<string, ConnectedItem[]>();
    for (const item of connected) {
      const key = item.relationshipType;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return groups;
  }, [connected]);

  if (connected.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        No connected nodes found.
      </p>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-340px)]">
      <div className="space-y-4 pt-2">
        {Array.from(grouped.entries()).map(([relType, items]) => (
          <div key={relType}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              {relType.replace("-", " \u2194 ")} ({items.length})
            </p>
            <div className="space-y-0.5">
              {items.map((item) => (
                <button
                  key={`${item.nodeId}-${item.direction}`}
                  className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs hover:bg-accent transition-colors text-left"
                  onClick={() => setSelectedNode(item.nodeId)}
                >
                  {item.direction === "outgoing" ? (
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  ) : (
                    <ArrowLeft className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                  <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_COLORS[item.nodeType] ?? "bg-gray-400"}`} />
                  <span className="truncate text-foreground flex-1">{item.label}</span>
                  <Badge variant="outline" className="text-[9px] shrink-0">
                    {item.direction === "outgoing" ? "out" : "in"}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
