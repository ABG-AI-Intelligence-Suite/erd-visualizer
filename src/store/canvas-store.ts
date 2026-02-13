import { create } from "zustand";
import type { AepConnectionConfig, FilterState } from "@/lib/types";

interface CanvasStore {
  connection: AepConnectionConfig | null;
  setConnection: (config: AepConnectionConfig) => void;
  clearConnection: () => void;

  filters: FilterState;
  toggleFilter: (type: keyof FilterState) => void;

  selectedNodeId: string | null;
  setSelectedNode: (id: string | null) => void;

  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  error: string | null;
  setError: (error: string | null) => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  connection: null,
  setConnection: (config) => set({ connection: config, error: null }),
  clearConnection: () => set({ connection: null }),

  filters: {
    datasets: true,
    schemas: true,
    fieldGroups: true,
    flows: true,
  },
  toggleFilter: (type) =>
    set((state) => ({
      filters: { ...state.filters, [type]: !state.filters[type] },
    })),

  selectedNodeId: null,
  setSelectedNode: (id) => set({ selectedNodeId: id }),

  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  error: null,
  setError: (error) => set({ error }),
}));
