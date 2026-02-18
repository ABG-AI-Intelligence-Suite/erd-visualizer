import { useDeferredValue, useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { EntityFilterKey } from "@/lib/types";
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
    let filteredNodes = rawNodes.filter(
      (n) => !n.type || deferredFilters[TYPE_MAP[n.type] ?? "datasets"]
    );

    if (deferredFilters.profileOnly) {
      filteredNodes = filteredNodes.filter((n) => {
        if (n.type !== "datasetNode") return true;
        return (n.data as Record<string, unknown>).profileEnabled === true;
      });
    }

    if (!deferredFilters.showSystem || !deferredFilters.showCustom) {
      filteredNodes = filteredNodes.filter((n) => {
        if (!n.type || !TYPE_MAP[n.type]) return true;
        const isSystem = (n.data as Record<string, unknown>).isSystem === true;
        if (isSystem && !deferredFilters.showSystem) return false;
        if (!isSystem && !deferredFilters.showCustom) return false;
        return true;
      });
    }

    if (deferredFilters.connectedFlowsOnly && deferredFilters.flows) {
      const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
      const connectedFlowIds = new Set<string>();
      rawEdges.forEach((e) => {
        if (e.source.startsWith("flow-") && visibleNodeIds.has(e.target)) {
          connectedFlowIds.add(e.source);
        }
      });
      filteredNodes = filteredNodes.filter((n) => {
        if (n.type !== "flowNode") return true;
        return connectedFlowIds.has(n.id);
      });
    }

    if (!deferredFocusNodeId) {
      const rowCounters: Record<number, number> = {};
      filteredNodes = filteredNodes.map((n) => {
        const col = n.type != null ? COL_MAP[n.type] : undefined;
        if (col == null) return n;
        const row = rowCounters[col] ?? 0;
        rowCounters[col] = row + 1;
        return {
          ...n,
          position: { x: col * COL_WIDTH + 40, y: row * ROW_HEIGHT + 40 },
        };
      });
    }

    if (deferredFocusNodeId) {
      const neighborIds = new Set<string>();
      const inboundIds = new Set<string>();
      const outboundIds = new Set<string>();
      neighborIds.add(deferredFocusNodeId);
      rawEdges.forEach((e) => {
        if (e.source === deferredFocusNodeId) {
          neighborIds.add(e.target);
          outboundIds.add(e.target);
        }
        if (e.target === deferredFocusNodeId) {
          neighborIds.add(e.source);
          inboundIds.add(e.source);
        }
      });
      filteredNodes = filteredNodes.filter((n) => neighborIds.has(n.id));

      const inbound: string[] = [];
      const outbound: string[] = [];
      filteredNodes.forEach((n) => {
        if (n.id === deferredFocusNodeId) return;
        if (inboundIds.has(n.id)) inbound.push(n.id);
        else if (outboundIds.has(n.id)) outbound.push(n.id);
      });

      const COL_GAP = 380;
      const ROW_GAP = 220;
      const posMap = new Map<string, { x: number; y: number }>();
      posMap.set(deferredFocusNodeId, { x: 0, y: 0 });
      inbound.forEach((id, i) => {
        posMap.set(id, { x: -COL_GAP, y: (i - (inbound.length - 1) / 2) * ROW_GAP });
      });
      outbound.forEach((id, i) => {
        posMap.set(id, { x: COL_GAP, y: (i - (outbound.length - 1) / 2) * ROW_GAP });
      });
      filteredNodes = filteredNodes.map((n) => {
        const pos = posMap.get(n.id);
        return pos ? { ...n, position: pos } : n;
      });
    }

    const summaryNodes: Node[] = [];
    const collapsedNodeIds = new Set<string>();

    (Object.keys(deferredCollapsed) as Array<EntityFilterKey>).forEach((type) => {
      if (!deferredCollapsed[type] || !deferredFilters[type]) return;
      const typeKey = Object.entries(TYPE_MAP).find(([, v]) => v === type)?.[0];
      if (!typeKey) return;

      const typeNodes = filteredNodes.filter((n) => n.type === typeKey);
      if (typeNodes.length === 0) return;

      typeNodes.forEach((n) => collapsedNodeIds.add(n.id));

      const avgX = typeNodes.reduce((s, n) => s + n.position.x, 0) / typeNodes.length;
      const avgY = typeNodes.reduce((s, n) => s + n.position.y, 0) / typeNodes.length;

      summaryNodes.push({
        id: `summary-${type}`,
        type: "summaryNode",
        position: { x: avgX, y: avgY },
        data: {
          entityType: COLOR_MAP[type],
          label: `${type.charAt(0).toUpperCase() + type.slice(1)} (${typeNodes.length})`,
          count: typeNodes.length,
          collapsedType: type,
        },
      });
    });

    filteredNodes = [
      ...filteredNodes.filter((n) => !collapsedNodeIds.has(n.id)),
      ...summaryNodes,
    ];

    const visibleIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = rawEdges.filter(
      (e) => visibleIds.has(e.source) && visibleIds.has(e.target)
    );

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [rawNodes, rawEdges, deferredFilters, deferredFocusNodeId, deferredCollapsed]);
}
