"use client";

import type { EntityFilterKey, FilterState } from "@/lib/types";

const FILTER_CONFIG: {
  key: EntityFilterKey;
  label: string;
  color: string;
}[] = [
  { key: "datasets", label: "Datasets", color: "bg-dataset" },
  { key: "schemas", label: "Schemas", color: "bg-schema" },
  { key: "fieldGroups", label: "Field Groups", color: "bg-fieldgroup" },
  { key: "flows", label: "Flows", color: "bg-flow" },
];

interface FilterControlsProps {
  filters: FilterState;
  onToggle: (type: keyof FilterState) => void;
  collapsed: Record<EntityFilterKey, boolean>;
  onToggleCollapse: (type: EntityFilterKey) => void;
}

export function FilterControls({ filters, onToggle, collapsed, onToggleCollapse }: FilterControlsProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* Row 1: Entity type toggles */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500 uppercase font-medium">Show:</span>
        {FILTER_CONFIG.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-0.5">
            <button
              onClick={() => onToggle(key)}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-l border transition-all ${
                filters[key]
                  ? "border-gray-300 bg-white text-gray-700"
                  : "border-gray-200 bg-gray-100 text-gray-400 line-through"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${color} ${
                  !filters[key] ? "opacity-30" : ""
                }`}
              />
              {label}
            </button>
            {filters[key] && (
              <button
                onClick={() => onToggleCollapse(key)}
                title={collapsed[key] ? "Expand all" : "Collapse into summary"}
                className={`text-[10px] px-1.5 py-1 border rounded-r transition-all ${
                  collapsed[key]
                    ? "bg-gray-700 text-white border-gray-700"
                    : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {collapsed[key] ? "+" : "-"}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Row 2: Advanced filters */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500 uppercase font-medium">Filter:</span>

        {/* Profile Only — only shown when datasets are visible */}
        {filters.datasets && (
          <button
            onClick={() => onToggle("profileOnly")}
            className={`text-xs px-2 py-1 rounded border transition-all ${
              filters.profileOnly
                ? "bg-dataset text-white border-dataset"
                : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            Profile Only
          </button>
        )}

        {/* Connected Flows Only — only shown when flows are visible */}
        {filters.flows && (
          <button
            onClick={() => onToggle("connectedFlowsOnly")}
            className={`text-xs px-2 py-1 rounded border transition-all ${
              filters.connectedFlowsOnly
                ? "bg-flow text-white border-flow"
                : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            Connected Flows Only
          </button>
        )}
      </div>
    </div>
  );
}
