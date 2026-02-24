"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const LEGEND_ITEMS = [
  { label: "Dataset", color: "bg-dataset" },
  { label: "Schema", color: "bg-schema" },
  { label: "Field Group", color: "bg-fieldgroup" },
  { label: "Dataflow", color: "bg-flow" },
  { label: "Identity", color: "bg-identity" },
];

const EDGE_LEGEND = [
  { label: "PK/FK (solid)", style: "border-t-2 border-solid border-indigo-500" },
  { label: "Extends (dashed)", style: "border-t-2 border-dashed border-green-500" },
  { label: "Flow (dotted)", style: "border-t-2 border-dotted border-orange-500" },
];

export function LegendOverlay() {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="absolute bottom-4 right-4 z-10">
      <div className="bg-card/95 backdrop-blur-sm border rounded-lg shadow-lg overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between h-8 px-3 text-xs font-semibold"
          onClick={() => setCollapsed(!collapsed)}
        >
          Legend
          {collapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>

        {!collapsed && (
          <div className="px-3 pb-3 space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">
                Entity Types
              </p>
              <div className="space-y-1">
                {LEGEND_ITEMS.map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded ${color}`} />
                    <span className="text-xs text-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">
                Edge Types
              </p>
              <div className="space-y-1.5">
                {EDGE_LEGEND.map(({ label, style }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`w-5 ${style}`} />
                    <span className="text-xs text-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">
                Badges
              </p>
              <div className="flex items-center gap-2">
                <Badge className="text-[9px] px-1.5 py-0">PK</Badge>
                <span className="text-xs text-foreground">Primary Key</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">FK</Badge>
                <span className="text-xs text-foreground">Foreign Key</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
