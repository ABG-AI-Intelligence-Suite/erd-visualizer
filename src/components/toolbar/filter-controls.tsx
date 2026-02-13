"use client";

import type { FilterState } from "@/lib/types";

const FILTER_CONFIG: {
  key: keyof FilterState;
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
}

export function FilterControls({ filters, onToggle }: FilterControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 uppercase font-medium">Show:</span>
      {FILTER_CONFIG.map(({ key, label, color }) => (
        <button
          key={key}
          onClick={() => onToggle(key)}
          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-all ${
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
      ))}
    </div>
  );
}
