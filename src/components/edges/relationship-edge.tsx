"use client";

import { memo } from "react";
import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { useCanvasStore } from "@/store/canvas-store";
import type { RelationshipEdgeData } from "@/lib/types";

const STYLE_MAP: Record<string, { strokeDasharray: string; stroke: string }> = {
  "dataset-schema": { strokeDasharray: "0", stroke: "#6366f1" },
  "schema-fieldgroup": { strokeDasharray: "6 3", stroke: "#22c55e" },
  "schema-schema": { strokeDasharray: "0", stroke: "#a855f7" },
  "schema-identity": { strokeDasharray: "4 4", stroke: "#0ea5e9" },
  "flow-dataset": { strokeDasharray: "3 3", stroke: "#f97316" },
  "flow-source": { strokeDasharray: "3 3", stroke: "#f97316" },
};

const LABEL_INSET = 32;

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
    id,
    source,
    target,
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

  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const d = data as unknown as RelationshipEdgeData | undefined;
  const relType = d?.relationshipType ?? "dataset-schema";
  const lineStyle = STYLE_MAP[relType] ?? STYLE_MAP["dataset-schema"];

  // Determine if this edge is connected to the selected node
  const isConnected = selectedNodeId ? (source === selectedNodeId || target === selectedNodeId) : false;
  const haSelection = Boolean(selectedNodeId);
  const opacity = haSelection ? (isConnected ? 1 : 0.15) : 1;
  const strokeWidth = haSelection && isConnected ? 2.5 : 1.5;

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
    <g style={{ opacity, transition: "opacity 0.2s ease" }}>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: lineStyle.stroke,
          strokeDasharray: lineStyle.strokeDasharray,
          strokeWidth,
          transition: "stroke-width 0.2s ease",
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
