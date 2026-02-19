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

const LABEL_INSET = 32;

/**
 * Returns a label position inset along the edge from a handle.
 * "inset" moves the label away from the node and along the edge path,
 * keeping it readable and clearly associated with that end of the edge.
 */
function getEndLabelPos(
  x: number,
  y: number,
  position: string,
  inset: number
): { lx: number; ly: number; anchor: "start" | "end" | "middle" } {
  switch (position) {
    case "right":  return { lx: x + inset, ly: y - 8, anchor: "start" };
    case "left":   return { lx: x - inset, ly: y - 8, anchor: "end" };
    case "bottom": return { lx: x + 4,     ly: y + inset, anchor: "start" };
    case "top":    return { lx: x + 4,     ly: y - inset, anchor: "start" };
    default:       return { lx: x + inset, ly: y - 8, anchor: "start" };
  }
}

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
  const [edgePath] = getSmoothStepPath({
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

  const { lx: fkX, ly: fkY, anchor: fkAnchor } = getEndLabelPos(sourceX, sourceY, sourcePosition, LABEL_INSET);
  const { lx: pkX, ly: pkY, anchor: pkAnchor } = getEndLabelPos(targetX, targetY, targetPosition, LABEL_INSET);

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
          x={fkX}
          y={fkY}
          textAnchor={fkAnchor}
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
          x={pkX}
          y={pkY}
          textAnchor={pkAnchor}
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
