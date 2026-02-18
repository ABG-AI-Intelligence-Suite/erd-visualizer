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
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Show</span>
      <div className="mx-1 h-4 w-px bg-slate-200" />
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTER_CONFIG.map(({ key, label, color }) => (
          <div key={key} className="flex items-center">
            <button
              onClick={() => onToggle(key)}
              className={`inline-flex h-7 items-center gap-1 rounded-l-md border px-2 text-[11px] font-medium transition-all ${
                filters[key]
                  ? "border-slate-300 bg-white text-slate-700 shadow-sm"
                  : "border-slate-200 bg-slate-100 text-slate-400 line-through"
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
                className={`inline-flex h-7 items-center rounded-r-md border border-l-0 px-1.5 text-[10px] font-semibold transition-all ${
                  collapsed[key]
                    ? "border-slate-700 bg-slate-700 text-white"
                    : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {collapsed[key] ? "+" : "-"}
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mx-1 h-4 w-px bg-slate-200" />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Filter</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {filters.datasets && (
          <button
            onClick={() => onToggle("profileOnly")}
            className={`inline-flex h-7 items-center rounded-md border px-2 text-[11px] font-medium transition-all ${
              filters.profileOnly
                ? "bg-dataset text-white border-dataset"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Profile Only
          </button>
        )}

        {filters.flows && (
          <button
            onClick={() => onToggle("connectedFlowsOnly")}
            className={`inline-flex h-7 items-center rounded-md border px-2 text-[11px] font-medium transition-all ${
              filters.connectedFlowsOnly
                ? "bg-flow text-white border-flow"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Connected Flows Only
          </button>
        )}

        {filters.schemas && (
          <button
            onClick={() => onToggle("identityLinks")}
            title="Show edges between schemas that share the same primary identity namespace"
            className={`inline-flex h-7 items-center rounded-md border px-2 text-[11px] font-medium transition-all ${
              filters.identityLinks
                ? "bg-schema text-white border-schema"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Identity Links
          </button>
        )}
      </div>
    </div>
  );
}
