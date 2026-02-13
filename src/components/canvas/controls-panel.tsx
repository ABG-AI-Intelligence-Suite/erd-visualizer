"use client";

import { useReactFlow } from "@xyflow/react";

export function ControlsPanel() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

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
    </div>
  );
}
