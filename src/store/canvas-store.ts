import { create } from "zustand";
import type { Node, Edge } from "@xyflow/react";
import type {
  AepConnectionConfig,
  EntityFilterKey,
  FilterState,
  ViewMode,
} from "@/lib/types";

interface CanvasStore {
  connection: AepConnectionConfig | null;
  setConnection: (config: AepConnectionConfig) => void;
  clearConnection: () => void;

  filters: FilterState;
  toggleFilter: (type: keyof FilterState) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  selectedNodeId: string | null;
  setSelectedNode: (id: string | null) => void;

  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  error: string | null;
  setError: (error: string | null) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  focusNodeId: string | null;
  setFocusNode: (id: string | null) => void;
  focusExpansionStep: number;
  loadMoreFocusResults: () => void;

  collapsed: Record<EntityFilterKey, boolean>;
  toggleCollapse: (type: EntityFilterKey) => void;

  expandedNodes: Record<string, boolean>;
  toggleNodeExpanded: (nodeId: string) => void;

  rawNodes: Node[];
  rawEdges: Edge[];
  setGraph: (nodes: Node[], edges: Edge[]) => void;
  mergeGraph: (nodes: Node[], edges: Edge[]) => void;
  removeEntityTypes: (entityTypes: string[]) => void;

  // UI panels
  detailPanelPinned: boolean;
  toggleDetailPanelPinned: () => void;

  hoveredNodeId: string | null;
  setHoveredNode: (id: string | null) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  connectionDialogOpen: boolean;
  setConnectionDialogOpen: (open: boolean) => void;

  exportDialogOpen: boolean;
  setExportDialogOpen: (open: boolean) => void;

  shortcutsDialogOpen: boolean;
  setShortcutsDialogOpen: (open: boolean) => void;

  activeSnapshotLabel: string | null;
  setActiveSnapshotLabel: (label: string | null) => void;

  miroExportList: string[];
  addToMiroExport: (id: string) => void;
  removeFromMiroExport: (id: string) => void;
  clearMiroExport: () => void;

  miroToast: string | null;
  setMiroToast: (msg: string | null) => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  connection: null,
  setConnection: (config) => set({ connection: config, error: null }),
  clearConnection: () => set({ connection: null }),

  filters: {
    datasets: true,
    schemas: true,
    fieldGroups: true,
    flows: false,
    profileOnly: false,
    showSystem: true,
    showCustom: true,
    connectedFlowsOnly: true,
    identityLinks: true,
  },
  toggleFilter: (type) =>
    set((state) => ({
      filters: { ...state.filters, [type]: !state.filters[type] },
    })),
  viewMode: "full",
  setViewMode: (mode) => set({ viewMode: mode }),

  selectedNodeId: null,
  setSelectedNode: (id) => set({ selectedNodeId: id }),

  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  error: null,
  setError: (error) => set({ error }),

  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),

  focusNodeId: null,
  setFocusNode: (id) => set({
    focusNodeId: id,
    selectedNodeId: id,
    focusExpansionStep: id ? 1 : 0,
  }),
  focusExpansionStep: 0,
  loadMoreFocusResults: () =>
    set((state) => ({
      focusExpansionStep: state.focusNodeId ? state.focusExpansionStep + 1 : 0,
    })),

  collapsed: {
    datasets: false,
    schemas: false,
    fieldGroups: false,
    flows: false,
  },
  toggleCollapse: (type) =>
    set((state) => ({
      collapsed: { ...state.collapsed, [type]: !state.collapsed[type] },
    })),

  expandedNodes: {},
  toggleNodeExpanded: (nodeId) =>
    set((state) => ({
      expandedNodes: {
        ...state.expandedNodes,
        [nodeId]: !state.expandedNodes[nodeId],
      },
    })),

  rawNodes: [],
  rawEdges: [],
  setGraph: (nodes, edges) => set({ rawNodes: nodes, rawEdges: edges }),
  mergeGraph: (nodes, edges) =>
    set((state) => {
      const existingNodeIds = new Set(state.rawNodes.map((n) => n.id));
      const existingEdgeIds = new Set(state.rawEdges.map((e) => e.id));
      return {
        rawNodes: [...state.rawNodes, ...nodes.filter((n) => !existingNodeIds.has(n.id))],
        rawEdges: [...state.rawEdges, ...edges.filter((e) => !existingEdgeIds.has(e.id))],
      };
    }),
  removeEntityTypes: (entityTypes) =>
    set((state) => {
      const typeSet = new Set(entityTypes);
      // Identity nodes are schema-derived — remove them when schemas are removed
      if (typeSet.has("schema")) typeSet.add("identity");
      const removedIds = new Set(
        state.rawNodes
          .filter((n) => typeSet.has((n.data as { entityType?: string })?.entityType ?? ""))
          .map((n) => n.id)
      );
      return {
        rawNodes: state.rawNodes.filter((n) => !removedIds.has(n.id)),
        rawEdges: state.rawEdges.filter((e) => !removedIds.has(e.source) && !removedIds.has(e.target)),
      };
    }),

  detailPanelPinned: false,
  toggleDetailPanelPinned: () =>
    set((state) => ({ detailPanelPinned: !state.detailPanelPinned })),

  hoveredNodeId: null,
  setHoveredNode: (id) => set({ hoveredNodeId: id }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  connectionDialogOpen: false,
  setConnectionDialogOpen: (open) => set({ connectionDialogOpen: open }),

  exportDialogOpen: false,
  setExportDialogOpen: (open) => set({ exportDialogOpen: open }),

  shortcutsDialogOpen: false,
  setShortcutsDialogOpen: (open) => set({ shortcutsDialogOpen: open }),

  activeSnapshotLabel: null,
  setActiveSnapshotLabel: (label) => set({ activeSnapshotLabel: label }),

  miroExportList: [],
  addToMiroExport: (id) =>
    set((s) => ({
      miroExportList: s.miroExportList.includes(id)
        ? s.miroExportList
        : [...s.miroExportList, id],
    })),
  removeFromMiroExport: (id) =>
    set((s) => ({ miroExportList: s.miroExportList.filter((i) => i !== id) })),
  clearMiroExport: () => set({ miroExportList: [] }),

  miroToast: null,
  setMiroToast: (msg) => set({ miroToast: msg }),
}));
