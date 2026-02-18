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
  const fkLabel = d?.fkLabel?.trim();
  const pkLabel = d?.pkLabel?.trim();
  const hasFk = Boolean(fkLabel);
  const hasPk = Boolean(pkLabel);
  const LABEL_OFFSET = 12;

  return (
    <g>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: lineStyle.stroke,
          strokeDasharray: lineStyle.strokeDasharray,
          strokeWidth: 1.5,
        }}
      />
      {hasFk ? (
        <text
          x={labelX}
          y={hasPk ? labelY - LABEL_OFFSET : labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fontWeight={600}
          fill="#111827"
          stroke="#f8fafc"
          strokeWidth={3}
          paintOrder="stroke"
          pointerEvents="none"
        >
          {fkLabel}
        </text>
      ) : null}
      {hasPk ? (
        <text
          x={labelX}
          y={hasFk ? labelY + LABEL_OFFSET : labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fontWeight={600}
          fill="#111827"
          stroke="#f8fafc"
          strokeWidth={3}
          paintOrder="stroke"
          pointerEvents="none"
        >
          {pkLabel}
        </text>
      ) : null}
    </g>
  );
}

export const RelationshipEdge = memo(RelationshipEdgeComponent);
