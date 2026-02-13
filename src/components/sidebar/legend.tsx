"use client";

const LEGEND_ITEMS = [
  { label: "Dataset", color: "bg-dataset", border: "border-dataset" },
  { label: "Schema", color: "bg-schema", border: "border-schema" },
  { label: "Field Group", color: "bg-fieldgroup", border: "border-fieldgroup" },
  { label: "Dataflow", color: "bg-flow", border: "border-flow" },
];

const EDGE_LEGEND = [
  { label: "PK/FK (solid)", style: "border-t-2 border-solid border-indigo-500" },
  { label: "Extends (dashed)", style: "border-t-2 border-dashed border-green-500" },
  { label: "Flow (dotted)", style: "border-t-2 border-dotted border-orange-500" },
];

export function Legend() {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">
          Entity Types
        </h3>
        <div className="space-y-1">
          {LEGEND_ITEMS.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded ${color}`} />
              <span className="text-xs text-gray-700">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">
          Edge Types
        </h3>
        <div className="space-y-1.5">
          {EDGE_LEGEND.map(({ label, style }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-6 ${style}`} />
              <span className="text-xs text-gray-700">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">
          Badges
        </h3>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-gray-800 text-white rounded-full px-1.5 py-0.5 text-[9px]">
              PK
            </span>
            <span className="text-xs text-gray-700">Primary Key</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="border border-gray-400 text-gray-600 rounded-full px-1.5 py-0.5 text-[9px]">
              FK
            </span>
            <span className="text-xs text-gray-700">Foreign Key</span>
          </div>
        </div>
      </div>
    </div>
  );
}
