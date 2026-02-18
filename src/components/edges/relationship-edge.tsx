"use client";

import { memo } from "react";
import {
  BaseEdge,
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

  const label = d?.label ?? "";

  return (
    <g className="react-flow__edge-interaction">
      {/* Wide invisible hit area */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        style={{ cursor: "pointer" }}
      />
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: lineStyle.stroke,
          strokeDasharray: lineStyle.strokeDasharray,
          strokeWidth: 1.5,
          pointerEvents: "none",
        }}
      />
      {/* SVG label — lives in the same transform layer, zero repositioning cost */}
      {label && (
        <g transform={`translate(${labelX}, ${labelY})`} className="edge-svg-label">
          <rect
            x={-(label.length * 3.5 + 8)}
            y={-9}
            width={label.length * 7 + 16}
            height={18}
            rx={9}
            fill="white"
            stroke="#d1d5db"
            strokeWidth={1}
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fill="#4b5563"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

export const RelationshipEdge = memo(RelationshipEdgeComponent);
