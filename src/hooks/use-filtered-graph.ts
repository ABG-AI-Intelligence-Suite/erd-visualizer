import { useDeferredValue, useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { EntityFilterKey, FilterState, RelationshipEdgeData } from "@/lib/types";
import { useCanvasStore } from "@/store/canvas-store";

const TYPE_MAP: Record<string, EntityFilterKey> = {
  datasetNode: "datasets",
  schemaNode: "schemas",
  fieldGroupNode: "fieldGroups",
  flowNode: "flows",
};

// Fixed stratum per node type for the full-mode stratified layout.
// Nodes are arranged top-to-bottom: flows → datasets → schemas/identities → fieldgroups
const TYPE_STRATUM: Record<string, number> = {
  flowNode: 0,
  datasetNode: 1,
  schemaNode: 2,
  identityNode: 2,
  fieldGroupNode: 3,
};

const FULL_LEVEL_GAP = 520;
const FULL_NODE_GAP = 380;

const COLOR_MAP: Record<string, string> = {
  datasets: "dataset",
  schemas: "schema",
  fieldGroups: "fieldgroup",
  flows: "flow",
};
const NODE_TYPE_BY_FILTER: Record<EntityFilterKey, string> = {
  datasets: "datasetNode",
  schemas: "schemaNode",
  fieldGroups: "fieldGroupNode",
  flows: "flowNode",
};
const FILTER_TYPES: EntityFilterKey[] = ["datasets", "schemas", "fieldGroups", "flows"];
const SCHEMA_LEVEL_GAP = 280;
const SCHEMA_NODE_GAP = 300;
const SCHEMA_COMPONENT_GAP = 120;
const FOCUS_SCHEMA_PAGE_SIZE = 5;
const FOCUS_NODE_PAGE_SIZE = 20;

function computeDistances(
  startId: string,
  adjacency: Map<string, string[]>
): Map<string, number> {
  const distances = new Map<string, number>();
  const queue: string[] = [startId];
  distances.set(startId, 0);

  // Index-based queue avoids O(n^2) shift cost.
  for (let q = 0; q < queue.length; q++) {
    const current = queue[q];
    const currentDistance = distances.get(current) ?? 0;
    const neighbors = adjacency.get(current) ?? [];
    for (let i = 0; i < neighbors.length; i++) {
      const next = neighbors[i];
      if (distances.has(next)) continue;
      distances.set(next, currentDistance + 1);
      queue.push(next);
    }
  }

  return distances;
}

function filterByType(nodes: Node[], filters: FilterState): Node[] {
  const out: Node[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n.type || filters[TYPE_MAP[n.type] ?? "datasets"]) out.push(n);
  }
  return out;
}

/**
 * Stratified layout for the full-mode canvas.
 *
 * Assigns each node to a fixed vertical stratum based on its type:
 *   0 → flows  1 → datasets  2 → schemas + identity hubs  3 → field groups
 *
 * Within each stratum, nodes are sorted horizontally by the average column
 * index of their connected neighbours in the stratum above them, so that
 * related nodes cluster underneath their parents.
 */
function applyStratifiedLayout(nodes: Node[], edges: Edge[], levelGap: number, nodeGap: number): Node[] {
  if (nodes.length === 0) return nodes;

  const nodeLookup = new Map<string, Node>();
  for (let i = 0; i < nodes.length; i++) nodeLookup.set(nodes[i].id, nodes[i]);

  // Build undirected adjacency (used only for sibling-ordering heuristic)
  const adjacency = new Map<string, string[]>();
  for (let i = 0; i < edges.length; i++) {
    const { source, target } = edges[i];
    if (!nodeLookup.has(source) || !nodeLookup.has(target)) continue;
    const s = adjacency.get(source) ?? [];
    s.push(target);
    adjacency.set(source, s);
    const t = adjacency.get(target) ?? [];
    t.push(source);
    adjacency.set(target, t);
  }

  const labelOf = (n: Node) => String((n.data as { label?: string } | undefined)?.label ?? n.id);

  // Group nodes by stratum
  const strata = new Map<number, Node[]>();
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const stratum = TYPE_STRATUM[n.type ?? ""] ?? 2;
    const list = strata.get(stratum);
    if (list) list.push(n);
    else strata.set(stratum, [n]);
  }

  const orderedStrata = Array.from(strata.keys()).sort((a, b) => a - b);

  // columnIndex[nodeId] = horizontal sort position within its stratum
  const columnIndex = new Map<string, number>();

  for (let si = 0; si < orderedStrata.length; si++) {
    const stratum = orderedStrata[si];
    const nodesHere = strata.get(stratum) ?? [];
    const prevStratum = orderedStrata[si - 1];

    if (si === 0 || prevStratum === undefined) {
      // Topmost stratum: sort alphabetically
      nodesHere.sort((a, b) => labelOf(a).localeCompare(labelOf(b)));
    } else {
      const prevNodes = new Set((strata.get(prevStratum) ?? []).map((n) => n.id));
      nodesHere.sort((a, b) => {
        const avgParent = (n: Node) => {
          const neighbours = adjacency.get(n.id) ?? [];
          let total = 0, count = 0;
          for (let k = 0; k < neighbours.length; k++) {
            const nbId = neighbours[k];
            if (!prevNodes.has(nbId)) continue;
            const col = columnIndex.get(nbId);
            if (col == null) continue;
            total += col;
            count++;
          }
          return count === 0 ? Number.MAX_SAFE_INTEGER : total / count;
        };
        const pa = avgParent(a);
        const pb = avgParent(b);
        if (pa !== pb) return pa - pb;
        return labelOf(a).localeCompare(labelOf(b));
      });
    }

    for (let col = 0; col < nodesHere.length; col++) {
      columnIndex.set(nodesHere[col].id, col);
    }
  }

  // Lay out: x = column * nodeGap (centred per row), y = stratum * levelGap
  const maxCols = Math.max(...orderedStrata.map((s) => (strata.get(s) ?? []).length));

  const positions = new Map<string, { x: number; y: number }>();
  for (const stratum of orderedStrata) {
    const nodesHere = strata.get(stratum) ?? [];
    const centerOffset = ((maxCols - nodesHere.length) / 2) * nodeGap;
    for (let col = 0; col < nodesHere.length; col++) {
      positions.set(nodesHere[col].id, {
        x: 40 + centerOffset + col * nodeGap,
        y: stratum * levelGap + 40,
      });
    }
  }

  return nodes.map((n) => ({ ...n, position: positions.get(n.id) ?? n.position }));
}

function applyTopologyLayout(nodes: Node[], edges: Edge[], levelGap: number, nodeGap: number): Node[] {
  if (nodes.length === 0) return nodes;

  const nodeIds = new Set<string>();
  const nodeLookup = new Map<string, Node>();
  for (let i = 0; i < nodes.length; i++) {
    nodeIds.add(nodes[i].id);
    nodeLookup.set(nodes[i].id, nodes[i]);
  }

  const adjacency = new Map<string, string[]>();
  const addNeighbor = (from: string, to: string) => {
    const neighbors = adjacency.get(from);
    if (neighbors) neighbors.push(to);
    else adjacency.set(from, [to]);
  };

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    addNeighbor(edge.source, edge.target);
    addNeighbor(edge.target, edge.source);
  }

  const components: string[][] = [];
  const seen = new Set<string>();
  const nodeIdsOrdered = nodes.map((n) => n.id);
  for (let i = 0; i < nodeIdsOrdered.length; i++) {
    const startId = nodeIdsOrdered[i];
    if (seen.has(startId)) continue;
    const component: string[] = [];
    const queue = [startId];
    seen.add(startId);
    for (let q = 0; q < queue.length; q++) {
      const current = queue[q];
      component.push(current);
      const neighbors = adjacency.get(current) ?? [];
      for (let n = 0; n < neighbors.length; n++) {
        const neighborId = neighbors[n];
        if (seen.has(neighborId)) continue;
        seen.add(neighborId);
        queue.push(neighborId);
      }
    }
    components.push(component);
  }

  const labelForNode = (id: string) => {
    const node = nodeLookup.get(id);
    return String((node?.data as { label?: string } | undefined)?.label ?? id);
  };

  components.sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return labelForNode(a[0]).localeCompare(labelForNode(b[0]));
  });

  const positions = new Map<string, { x: number; y: number }>();
  let xOffset = 40;

  for (let c = 0; c < components.length; c++) {
    const componentIds = components[c];
    const componentSet = new Set(componentIds);

    let rootId = componentIds[0];
    for (let i = 1; i < componentIds.length; i++) {
      const candidateId = componentIds[i];
      const isIdentityHub = candidateId.startsWith("identity-");
      const rootIsIdentityHub = rootId.startsWith("identity-");
      const isDataset = (nodeLookup.get(candidateId)?.type === "datasetNode");
      const rootIsDataset = (nodeLookup.get(rootId)?.type === "datasetNode");
      // Priority: identity hub > dataset > everything else
      if (isIdentityHub && !rootIsIdentityHub) {
        rootId = candidateId;
        continue;
      }
      if (!rootIsIdentityHub && isDataset && !rootIsDataset) {
        rootId = candidateId;
        continue;
      }
      if (isIdentityHub === rootIsIdentityHub && isDataset === rootIsDataset) {
        const candidateDegree = (adjacency.get(candidateId) ?? []).length;
        const rootDegree = (adjacency.get(rootId) ?? []).length;
        if (candidateDegree > rootDegree) {
          rootId = candidateId;
        } else if (candidateDegree === rootDegree) {
          rootId = labelForNode(candidateId).localeCompare(labelForNode(rootId)) < 0
            ? candidateId
            : rootId;
        }
      }
    }

    const levels = new Map<string, number>();
    const bfsQueue = [rootId];
    levels.set(rootId, 0);
    for (let q = 0; q < bfsQueue.length; q++) {
      const current = bfsQueue[q];
      const currentLevel = levels.get(current) ?? 0;
      const neighbors = adjacency.get(current) ?? [];
      for (let i = 0; i < neighbors.length; i++) {
        const next = neighbors[i];
        if (!componentSet.has(next) || levels.has(next)) continue;
        levels.set(next, currentLevel + 1);
        bfsQueue.push(next);
      }
    }

    const rows = new Map<number, string[]>();
    for (let i = 0; i < componentIds.length; i++) {
      const nodeId = componentIds[i];
      const level = levels.get(nodeId) ?? 0;
      const ids = rows.get(level);
      if (ids) ids.push(nodeId);
      else rows.set(level, [nodeId]);
    }

    const orderedLevels = Array.from(rows.keys()).sort((a, b) => a - b);
    const levelIndexes = new Map<number, Map<string, number>>();

    for (let i = 0; i < orderedLevels.length; i++) {
      const level = orderedLevels[i];
      const ids = rows.get(level) ?? [];
      const previousIndex = levelIndexes.get(level - 1);

      ids.sort((a, b) => {
        const aParents = (adjacency.get(a) ?? []).filter(
          (neighborId) => levels.get(neighborId) === level - 1
        );
        const bParents = (adjacency.get(b) ?? []).filter(
          (neighborId) => levels.get(neighborId) === level - 1
        );
        const avgParentIndex = (parents: string[]) => {
          if (parents.length === 0 || !previousIndex) return Number.MAX_SAFE_INTEGER;
          let total = 0;
          let count = 0;
          for (let p = 0; p < parents.length; p++) {
            const idx = previousIndex.get(parents[p]);
            if (idx == null) continue;
            total += idx;
            count += 1;
          }
          return count === 0 ? Number.MAX_SAFE_INTEGER : total / count;
        };

        const aAvg = avgParentIndex(aParents);
        const bAvg = avgParentIndex(bParents);
        if (aAvg !== bAvg) return aAvg - bAvg;
        return labelForNode(a).localeCompare(labelForNode(b));
      });

      const indexMap = new Map<string, number>();
      for (let col = 0; col < ids.length; col++) indexMap.set(ids[col], col);
      levelIndexes.set(level, indexMap);
    }

    const maxCols = Math.max(...orderedLevels.map((l) => (rows.get(l) ?? []).length));

    for (let i = 0; i < orderedLevels.length; i++) {
      const level = orderedLevels[i];
      const ids = rows.get(level) ?? [];
      const centerOffset = ((maxCols - ids.length) / 2) * nodeGap;
      for (let col = 0; col < ids.length; col++) {
        positions.set(ids[col], {
          x: xOffset + centerOffset + col * nodeGap,
          y: level * levelGap + 40,
        });
      }
    }

    xOffset += maxCols * nodeGap + SCHEMA_COMPONENT_GAP;
  }

  return nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  }));
}

function buildUndirectedAdjacency(nodes: Node[], edges: Edge[]): Map<string, string[]> {
  const nodeIds = new Set<string>();
  for (let i = 0; i < nodes.length; i++) nodeIds.add(nodes[i].id);
  const adjacency = new Map<string, string[]>();
  const push = (from: string, to: string) => {
    const list = adjacency.get(from);
    if (list) list.push(to);
    else adjacency.set(from, [to]);
  };
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    push(edge.source, edge.target);
    push(edge.target, edge.source);
  }
  return adjacency;
}

function limitFocusGraph(
  focusNodeId: string,
  nodes: Node[],
  edges: Edge[],
  expansionStep: number
) {
  const nodeById = new Map<string, Node>();
  for (let i = 0; i < nodes.length; i++) nodeById.set(nodes[i].id, nodes[i]);
  const adjacency = buildUndirectedAdjacency(nodes, edges);
  const distances = computeDistances(focusNodeId, adjacency);

  const schemaIds: string[] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].type === "schemaNode") schemaIds.push(nodes[i].id);
  }
  schemaIds.sort((a, b) => {
    const da = distances.get(a) ?? Number.MAX_SAFE_INTEGER;
    const db = distances.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (da !== db) return da - db;
    const labelA = String((nodeById.get(a)?.data as { label?: string } | undefined)?.label ?? a);
    const labelB = String((nodeById.get(b)?.data as { label?: string } | undefined)?.label ?? b);
    return labelA.localeCompare(labelB);
  });

  const schemaLimit = Math.max(FOCUS_SCHEMA_PAGE_SIZE, expansionStep * FOCUS_SCHEMA_PAGE_SIZE);
  const nodeLimit = Math.max(FOCUS_NODE_PAGE_SIZE, expansionStep * FOCUS_NODE_PAGE_SIZE);
  const selectedSchemas = new Set<string>(schemaIds.slice(0, schemaLimit));
  const included = new Set<string>([focusNodeId, ...Array.from(selectedSchemas)]);

  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      const sourceIncluded = included.has(edge.source);
      const targetIncluded = included.has(edge.target);
      if (sourceIncluded === targetIncluded) continue;
      const candidateId = sourceIncluded ? edge.target : edge.source;
      const candidateNode = nodeById.get(candidateId);
      if (!candidateNode) continue;
      if (
        candidateNode.type === "schemaNode" &&
        candidateId !== focusNodeId &&
        !selectedSchemas.has(candidateId)
      ) {
        continue;
      }
      included.add(candidateId);
      changed = true;
    }
    if (!changed) break;
  }

  if (included.size > nodeLimit) {
    const required = new Set<string>([focusNodeId, ...Array.from(selectedSchemas)]);
    const optional: string[] = [];
    included.forEach((id) => {
      if (!required.has(id)) optional.push(id);
    });
    optional.sort((a, b) => {
      const da = distances.get(a) ?? Number.MAX_SAFE_INTEGER;
      const db = distances.get(b) ?? Number.MAX_SAFE_INTEGER;
      if (da !== db) return da - db;
      const labelA = String((nodeById.get(a)?.data as { label?: string } | undefined)?.label ?? a);
      const labelB = String((nodeById.get(b)?.data as { label?: string } | undefined)?.label ?? b);
      return labelA.localeCompare(labelB);
    });

    const trimmed = new Set<string>(required);
    for (let i = 0; i < optional.length && trimmed.size < nodeLimit; i++) {
      trimmed.add(optional[i]);
    }
    return {
      nodeIds: trimmed,
      schemaTotal: schemaIds.length,
      schemaShown: Math.min(schemaLimit, schemaIds.length),
      hasMore: schemaIds.length > schemaLimit || included.size > nodeLimit,
    };
  }

  return {
    nodeIds: included,
    schemaTotal: schemaIds.length,
    schemaShown: Math.min(schemaLimit, schemaIds.length),
    hasMore: schemaIds.length > schemaLimit,
  };
}

export function useFilteredGraph() {
  const rawNodes = useCanvasStore((s) => s.rawNodes) as Node[];
  const rawEdges = useCanvasStore((s) => s.rawEdges) as Edge[];
  const filters = useCanvasStore((s) => s.filters);
  const focusNodeId = useCanvasStore((s) => s.focusNodeId);
  const collapsed = useCanvasStore((s) => s.collapsed);
  const viewMode = useCanvasStore((s) => s.viewMode);
  const focusExpansionStep = useCanvasStore((s) => s.focusExpansionStep);
  const loadMoreFocusResults = useCanvasStore((s) => s.loadMoreFocusResults);

  const deferredFilters = useDeferredValue(filters);
  const deferredFocusNodeId = useDeferredValue(focusNodeId);
  const deferredCollapsed = useDeferredValue(collapsed);
  const deferredViewMode = useDeferredValue(viewMode);
  const collapsedForView = deferredViewMode === "full" ? deferredCollapsed : null;

  return useMemo(() => {
    const isFocusActive = Boolean(deferredFocusNodeId);
    let focusSchemaShown = 0;
    let focusSchemaTotal = 0;
    let focusHasMore = false;
    let candidateEdges = rawEdges;
    let filteredNodes = filterByType(rawNodes, deferredFilters);

    if (deferredViewMode === "schema") {
      const schemaViewNodes: Node[] = [];
      const schemaViewIds = new Set<string>();
      for (let i = 0; i < filteredNodes.length; i++) {
        const node = filteredNodes[i];
        const isSchema = node.type === "schemaNode";
        const isIdentityHub = node.type === "identityNode" && deferredFilters.identityLinks;
        if (!isSchema && !isIdentityHub) continue;
        schemaViewNodes.push(node);
        schemaViewIds.add(node.id);
      }
      filteredNodes = schemaViewNodes;

      const schemaEdges: Edge[] = [];
      for (let i = 0; i < rawEdges.length; i++) {
        const edge = rawEdges[i];
        const relType = (edge.data as RelationshipEdgeData | undefined)?.relationshipType;
        if (relType !== "schema-schema" && relType !== "schema-identity") continue;
        if (relType === "schema-identity" && !deferredFilters.identityLinks) continue;
        if (schemaViewIds.has(edge.source) && schemaViewIds.has(edge.target)) schemaEdges.push(edge);
      }
      candidateEdges = schemaEdges;
    } else {
      if (!deferredFilters.identityLinks) {
        candidateEdges = rawEdges.filter(
          (e) => (e.data as RelationshipEdgeData | undefined)?.relationshipType !== "schema-identity"
        );
      }
      if (!deferredFilters.identityLinks) {
        filteredNodes = filteredNodes.filter((n) => n.type !== "identityNode");
      }
    }

    if (!isFocusActive && deferredFilters.profileOnly) {
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

    if (!isFocusActive && (!deferredFilters.showSystem || !deferredFilters.showCustom)) {
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

    if (!isFocusActive && deferredViewMode === "full" && deferredFilters.connectedFlowsOnly && deferredFilters.flows) {
      const visibleNodeIds = new Set<string>();
      for (let i = 0; i < filteredNodes.length; i++) visibleNodeIds.add(filteredNodes[i].id);
      const connectedFlowIds = new Set<string>();
      for (let i = 0; i < candidateEdges.length; i++) {
        const e = candidateEdges[i];
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

    if (!deferredFocusNodeId || !filteredNodes.some((n) => n.id === deferredFocusNodeId)) {
      filteredNodes = deferredViewMode === "schema"
        ? applyTopologyLayout(filteredNodes, candidateEdges, SCHEMA_LEVEL_GAP, SCHEMA_NODE_GAP)
        : applyStratifiedLayout(filteredNodes, candidateEdges, FULL_LEVEL_GAP, FULL_NODE_GAP);
    } else {
      const visibleNodeIds = new Set<string>();
      for (let i = 0; i < filteredNodes.length; i++) {
        visibleNodeIds.add(filteredNodes[i].id);
      }

      const outboundAdjacency = new Map<string, string[]>();
      const inboundAdjacency = new Map<string, string[]>();
      const pushAdj = (map: Map<string, string[]>, from: string, to: string) => {
        const list = map.get(from);
        if (list) list.push(to);
        else map.set(from, [to]);
      };

      for (let i = 0; i < candidateEdges.length; i++) {
        const e = candidateEdges[i];
        if (!visibleNodeIds.has(e.source) || !visibleNodeIds.has(e.target)) continue;
        pushAdj(outboundAdjacency, e.source, e.target);
        pushAdj(inboundAdjacency, e.target, e.source);
      }

      const outboundDistances = computeDistances(deferredFocusNodeId, outboundAdjacency);
      const inboundDistances = computeDistances(deferredFocusNodeId, inboundAdjacency);
      const connectedIds = new Set<string>();
      outboundDistances.forEach((_, id) => connectedIds.add(id));
      inboundDistances.forEach((_, id) => connectedIds.add(id));

      const next: Node[] = [];
      for (let i = 0; i < filteredNodes.length; i++) {
        const n = filteredNodes[i];
        if (!connectedIds.has(n.id)) continue;
        next.push(n);
      }
      filteredNodes = next;

      const connectedEdges: Edge[] = [];
      for (let i = 0; i < candidateEdges.length; i++) {
        const e = candidateEdges[i];
        if (connectedIds.has(e.source) && connectedIds.has(e.target)) connectedEdges.push(e);
      }

      const focusLimit = limitFocusGraph(
        deferredFocusNodeId,
        filteredNodes,
        connectedEdges,
        focusExpansionStep
      );
      focusSchemaShown = focusLimit.schemaShown;
      focusSchemaTotal = focusLimit.schemaTotal;
      focusHasMore = focusLimit.hasMore;
      const focusNodeIds = focusLimit.nodeIds;

      const limitedNodes: Node[] = [];
      for (let i = 0; i < filteredNodes.length; i++) {
        if (focusNodeIds.has(filteredNodes[i].id)) limitedNodes.push(filteredNodes[i]);
      }
      filteredNodes = limitedNodes;

      const isSchemaFocus = deferredViewMode === "schema";
      const LEVEL_GAP = isSchemaFocus ? SCHEMA_LEVEL_GAP : 360;
      const NODE_GAP  = isSchemaFocus ? SCHEMA_NODE_GAP  : 180;

      const levels = new Map<number, string[]>();
      const putInLevel = (level: number, id: string) => {
        const list = levels.get(level);
        if (list) list.push(id);
        else levels.set(level, [id]);
      };

      for (let i = 0; i < filteredNodes.length; i++) {
        const id = filteredNodes[i].id;
        if (id === deferredFocusNodeId) {
          putInLevel(0, id);
          continue;
        }
        const outbound = outboundDistances.get(id);
        const inbound  = inboundDistances.get(id);
        if (outbound != null && inbound != null) {
          putInLevel(outbound <= inbound ? outbound : -inbound, id);
        } else if (outbound != null) {
          putInLevel(outbound, id);
        } else if (inbound != null) {
          putInLevel(-inbound, id);
        }
      }

      const posMap = new Map<string, { x: number; y: number }>();
      if (isSchemaFocus) {
        // Top-down: level index → y, siblings centered on x axis.
        const maxSiblings = Math.max(...Array.from(levels.values()).map((l) => l.length));
        levels.forEach((ids, level) => {
          const centerOffset = ((maxSiblings - ids.length) / 2) * NODE_GAP;
          for (let i = 0; i < ids.length; i++) {
            posMap.set(ids[i], {
              x: centerOffset + i * NODE_GAP,
              y: level * LEVEL_GAP,
            });
          }
        });
      } else {
        // Left-right: level index → x, siblings centered on y axis.
        levels.forEach((ids, level) => {
          for (let i = 0; i < ids.length; i++) {
            posMap.set(ids[i], {
              x: level * LEVEL_GAP,
              y: (i - (ids.length - 1) / 2) * NODE_GAP,
            });
          }
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

    if (!isFocusActive && collapsedForView) {
      const collapsedNodeIds = new Set<string>();
      const summaryNodes: Node[] = [];
      for (let t = 0; t < FILTER_TYPES.length; t++) {
        const type = FILTER_TYPES[t];
        if (!collapsedForView[type] || !deferredFilters[type]) continue;
        const typeKey = NODE_TYPE_BY_FILTER[type];
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
    }

    const visibleIds = new Set<string>();
    for (let i = 0; i < filteredNodes.length; i++) visibleIds.add(filteredNodes[i].id);
    const filteredEdges: Edge[] = [];
    for (let i = 0; i < candidateEdges.length; i++) {
      const e = candidateEdges[i];
      if (visibleIds.has(e.source) && visibleIds.has(e.target)) filteredEdges.push(e);
    }

    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      focusSchemaShown,
      focusSchemaTotal,
      canLoadMoreFocusResults: focusHasMore,
      loadMoreFocusResults,
      focusPageSizeSchemas: FOCUS_SCHEMA_PAGE_SIZE,
      focusPageSizeNodes: FOCUS_NODE_PAGE_SIZE,
    };
  }, [
    rawNodes,
    rawEdges,
    deferredFilters,
    deferredFocusNodeId,
    collapsedForView,
    deferredViewMode,
    focusExpansionStep,
    loadMoreFocusResults,
  ]);
}
