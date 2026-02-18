"use client";

import { useReactFlow } from "@xyflow/react";
import { useCanvasStore } from "@/store/canvas-store";

export function ControlsPanel() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const filters = useCanvasStore((s) => s.filters);
  const toggleFilter = useCanvasStore((s) => s.toggleFilter);

  return (
    <div className="absolute bottom-4 left-4 flex flex-col gap-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10">
      <button
        onClick={() => zoomIn()}
        className="px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
        title="Zoom In"
      >
        +
      </button>
      <div className="border-t border-gray-200" />
      <button
        onClick={() => zoomOut()}
        className="px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
        title="Zoom Out"
      >
        &minus;
      </button>
      <div className="border-t border-gray-200" />
      <button
        onClick={() => fitView({ padding: 0.2, duration: 300 })}
        className="px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
        title="Fit View"
      >
        Fit
      </button>
      <div className="border-t border-gray-200" />
      <div className="px-2 py-1.5 flex flex-col gap-1">
        <button
          onClick={() => toggleFilter("showSystem")}
          className={`text-xs px-2 py-1 rounded border transition-all text-left ${
            filters.showSystem
              ? "border-gray-300 bg-white text-gray-700"
              : "border-gray-200 bg-gray-100 text-gray-400"
          }`}
          title={filters.showSystem ? "Hide system entities" : "Show system entities"}
        >
          System
        </button>
        <button
          onClick={() => toggleFilter("showCustom")}
          className={`text-xs px-2 py-1 rounded border transition-all text-left ${
            filters.showCustom
              ? "border-gray-300 bg-white text-gray-700"
              : "border-gray-200 bg-gray-100 text-gray-400"
          }`}
          title={filters.showCustom ? "Hide custom entities" : "Show custom entities"}
        >
          Custom
        </button>
      </div>
    </div>
  );
}
