"use client";

import { memo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import type { RelationshipEdgeData } from "@/lib/types";

const STYLE_MAP: Record<string, { strokeDasharray: string; stroke: string }> = {
  "dataset-schema": { strokeDasharray: "0", stroke: "#6366f1" },
  "schema-fieldgroup": { strokeDasharray: "6 3", stroke: "#22c55e" },
  "schema-schema": { strokeDasharray: "0", stroke: "#a855f7" },
  "flow-dataset": { strokeDasharray: "3 3", stroke: "#f97316" },
  "flow-source": { strokeDasharray: "3 3", stroke: "#f97316" },
};

function RelationshipEdgeComponent(props: EdgeProps) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
  } = props;

  const d = data as unknown as RelationshipEdgeData | undefined;
  const [hovered, setHovered] = useState(false);

  const relType = d?.relationshipType ?? "dataset-schema";
  const lineStyle = STYLE_MAP[relType] ?? STYLE_MAP["dataset-schema"];

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <>
      {/* Invisible wider path for hover target */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: hovered ? "#1e293b" : lineStyle.stroke,
          strokeDasharray: lineStyle.strokeDasharray,
          strokeWidth: hovered ? 2.5 : 1.5,
          transition: "stroke 0.15s, stroke-width 0.15s",
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Main label badge */}
          <div className="flex items-center gap-1 text-[10px]">
            {d?.fkLabel && (
              <span className="border border-gray-400 text-gray-600 rounded-full px-1.5 py-0.5 bg-white whitespace-nowrap">
                {d.fkLabel}
              </span>
            )}
            {d?.pkLabel && (
              <span className="bg-gray-800 text-white rounded-full px-1.5 py-0.5 whitespace-nowrap">
                {d.pkLabel}
              </span>
            )}
          </div>

          {/* Tooltip on hover */}
          {hovered && d && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-50 shadow-lg">
              <p className="font-semibold">{d.label}</p>
              {d.sourceField && <p>Source: {d.sourceField}</p>}
              {d.targetField && <p>Target: {d.targetField}</p>}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const RelationshipEdge = memo(RelationshipEdgeComponent);
