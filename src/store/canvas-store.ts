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
}));
