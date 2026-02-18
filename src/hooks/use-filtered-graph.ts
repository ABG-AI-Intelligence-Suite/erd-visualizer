import { useDeferredValue, useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { EntityFilterKey, FilterState } from "@/lib/types";
import { useCanvasStore } from "@/store/canvas-store";

const TYPE_MAP: Record<string, EntityFilterKey> = {
  datasetNode: "datasets",
  schemaNode: "schemas",
  fieldGroupNode: "fieldGroups",
  flowNode: "flows",
};

const COL_WIDTH = 320;
const ROW_HEIGHT = 280;
const COL_MAP: Record<string, number> = {
  flowNode: 0,
  datasetNode: 1,
  schemaNode: 2,
  fieldGroupNode: 3,
};

const COLOR_MAP: Record<string, string> = {
  datasets: "dataset",
  schemas: "schema",
  fieldGroups: "fieldgroup",
  flows: "flow",
};

function filterByType(nodes: Node[], filters: FilterState): Node[] {
  const out: Node[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n.type || filters[TYPE_MAP[n.type] ?? "datasets"]) out.push(n);
  }
  return out;
}

function applyGridLayout(nodes: Node[]): Node[] {
  const rowCounters: Record<number, number> = {};
  const result: Node[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const col = n.type != null ? COL_MAP[n.type] : undefined;
    if (col == null) {
      result.push(n);
      continue;
    }
    const row = rowCounters[col] ?? 0;
    rowCounters[col] = row + 1;
    result.push({
      ...n,
      position: { x: col * COL_WIDTH + 40, y: row * ROW_HEIGHT + 40 },
    });
  }
  return result;
}

export function useFilteredGraph() {
  const rawNodes = useCanvasStore((s) => s.rawNodes) as Node[];
  const rawEdges = useCanvasStore((s) => s.rawEdges) as Edge[];
  const filters = useCanvasStore((s) => s.filters);
  const focusNodeId = useCanvasStore((s) => s.focusNodeId);
  const collapsed = useCanvasStore((s) => s.collapsed);

  const deferredFilters = useDeferredValue(filters);
  const deferredFocusNodeId = useDeferredValue(focusNodeId);
  const deferredCollapsed = useDeferredValue(collapsed);

  return useMemo(() => {
    let filteredNodes = filterByType(rawNodes, deferredFilters);

    if (deferredFilters.profileOnly) {
      const next: Node[] = [];
      for (let i = 0; i < filteredNodes.length; i++) {
        const n = filteredNodes[i];
        if (n.type !== "datasetNode") {
          next.push(n);
        } else if ((n.data as Record<string, unknown>).profileEnabled === true) {
          next.push(n);
        }
      }
      filteredNodes = next;
    }

    if (!deferredFilters.showSystem || !deferredFilters.showCustom) {
      const next: Node[] = [];
      for (let i = 0; i < filteredNodes.length; i++) {
        const n = filteredNodes[i];
        if (!n.type || !TYPE_MAP[n.type]) {
          next.push(n);
          continue;
        }
        const isSystem = (n.data as Record<string, unknown>).isSystem === true;
        if (isSystem && !deferredFilters.showSystem) continue;
        if (!isSystem && !deferredFilters.showCustom) continue;
        next.push(n);
      }
      filteredNodes = next;
    }

    if (deferredFilters.connectedFlowsOnly && deferredFilters.flows) {
      const visibleNodeIds = new Set<string>();
      for (let i = 0; i < filteredNodes.length; i++) visibleNodeIds.add(filteredNodes[i].id);
      const connectedFlowIds = new Set<string>();
      for (let i = 0; i < rawEdges.length; i++) {
        const e = rawEdges[i];
        if (e.source.startsWith("flow-") && visibleNodeIds.has(e.target)) {
          connectedFlowIds.add(e.source);
        }
      }
      const next: Node[] = [];
      for (let i = 0; i < filteredNodes.length; i++) {
        const n = filteredNodes[i];
        if (n.type !== "flowNode" || connectedFlowIds.has(n.id)) next.push(n);
      }
      filteredNodes = next;
    }

    if (!deferredFocusNodeId) {
      filteredNodes = applyGridLayout(filteredNodes);
    } else {
      const neighborIds = new Set<string>([deferredFocusNodeId]);
      const inboundIds = new Set<string>();
      const outboundIds = new Set<string>();
      for (let i = 0; i < rawEdges.length; i++) {
        const e = rawEdges[i];
        if (e.source === deferredFocusNodeId) {
          neighborIds.add(e.target);
          outboundIds.add(e.target);
        } else if (e.target === deferredFocusNodeId) {
          neighborIds.add(e.source);
          inboundIds.add(e.source);
        }
      }
      const next: Node[] = [];
      const inbound: string[] = [];
      const outbound: string[] = [];
      for (let i = 0; i < filteredNodes.length; i++) {
        const n = filteredNodes[i];
        if (!neighborIds.has(n.id)) continue;
        next.push(n);
        if (n.id === deferredFocusNodeId) continue;
        if (inboundIds.has(n.id)) inbound.push(n.id);
        else if (outboundIds.has(n.id)) outbound.push(n.id);
      }
      filteredNodes = next;
      const COL_GAP = 380;
      const ROW_GAP = 220;
      const posMap = new Map<string, { x: number; y: number }>();
      posMap.set(deferredFocusNodeId, { x: 0, y: 0 });
      for (let i = 0; i < inbound.length; i++) {
        posMap.set(inbound[i], {
          x: -COL_GAP,
          y: (i - (inbound.length - 1) / 2) * ROW_GAP,
        });
      }
      for (let i = 0; i < outbound.length; i++) {
        posMap.set(outbound[i], {
          x: COL_GAP,
          y: (i - (outbound.length - 1) / 2) * ROW_GAP,
        });
      }
      const withPos: Node[] = [];
      for (let i = 0; i < filteredNodes.length; i++) {
        const n = filteredNodes[i];
        const pos = posMap.get(n.id);
        withPos.push(pos ? { ...n, position: pos } : n);
      }
      filteredNodes = withPos;
    }

    const collapsedNodeIds = new Set<string>();
    const summaryNodes: Node[] = [];
    const types = Object.keys(deferredCollapsed) as EntityFilterKey[];

    for (let t = 0; t < types.length; t++) {
      const type = types[t];
      if (!deferredCollapsed[type] || !deferredFilters[type]) continue;
      const typeKey = Object.entries(TYPE_MAP).find(([, v]) => v === type)?.[0];
      if (!typeKey) continue;
      const typeNodes: Node[] = [];
      for (let i = 0; i < filteredNodes.length; i++) {
        if (filteredNodes[i].type === typeKey) {
          typeNodes.push(filteredNodes[i]);
          collapsedNodeIds.add(filteredNodes[i].id);
        }
      }
      if (typeNodes.length === 0) continue;
      let sumX = 0;
      let sumY = 0;
      for (let i = 0; i < typeNodes.length; i++) {
        sumX += typeNodes[i].position.x;
        sumY += typeNodes[i].position.y;
      }
      summaryNodes.push({
        id: `summary-${type}`,
        type: "summaryNode",
        position: { x: sumX / typeNodes.length, y: sumY / typeNodes.length },
        data: {
          entityType: COLOR_MAP[type],
          label: `${type.charAt(0).toUpperCase() + type.slice(1)} (${typeNodes.length})`,
          count: typeNodes.length,
          collapsedType: type,
        },
      });
    }

    const visible: Node[] = [];
    for (let i = 0; i < filteredNodes.length; i++) {
      if (!collapsedNodeIds.has(filteredNodes[i].id)) visible.push(filteredNodes[i]);
    }
    for (let i = 0; i < summaryNodes.length; i++) visible.push(summaryNodes[i]);
    filteredNodes = visible;

    const visibleIds = new Set<string>();
    for (let i = 0; i < filteredNodes.length; i++) visibleIds.add(filteredNodes[i].id);
    const filteredEdges: Edge[] = [];
    for (let i = 0; i < rawEdges.length; i++) {
      const e = rawEdges[i];
      if (visibleIds.has(e.source) && visibleIds.has(e.target)) filteredEdges.push(e);
    }

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [rawNodes, rawEdges, deferredFilters, deferredFocusNodeId, deferredCollapsed]);
}
