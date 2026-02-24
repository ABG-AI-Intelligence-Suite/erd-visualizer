"use client";

import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { EntityFilterKey, FilterState } from "@/lib/types";

const FILTER_CONFIG: {
  key: EntityFilterKey;
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
  collapsed: Record<EntityFilterKey, boolean>;
  onToggleCollapse: (type: EntityFilterKey) => void;
}

export function FilterControls({ filters, onToggle, collapsed, onToggleCollapse }: FilterControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Show</span>
      <Separator orientation="vertical" className="h-5" />

      {FILTER_CONFIG.map(({ key, label, color }) => (
        <div key={key} className="flex items-center">
          <Toggle
            pressed={filters[key]}
            onPressedChange={() => onToggle(key)}
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-[11px] data-[state=off]:line-through data-[state=off]:opacity-50"
          >
            <span className={`w-2 h-2 rounded-full ${color}`} />
            {label}
          </Toggle>
          {filters[key] && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={collapsed[key] ? "default" : "ghost"}
                  size="icon"
                  className="h-7 w-6 ml-0.5"
                  onClick={() => onToggleCollapse(key)}
                >
                  {collapsed[key] ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronUp className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {collapsed[key] ? "Expand all" : "Collapse into summary"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      ))}

      <Separator orientation="vertical" className="h-5" />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Filter</span>

      {filters.datasets && (
        <Toggle
          pressed={filters.profileOnly}
          onPressedChange={() => onToggle("profileOnly")}
          size="sm"
          className="h-7 text-[11px] px-2.5"
        >
          Profile Only
        </Toggle>
      )}

      {filters.flows && (
        <Toggle
          pressed={filters.connectedFlowsOnly}
          onPressedChange={() => onToggle("connectedFlowsOnly")}
          size="sm"
          className="h-7 text-[11px] px-2.5"
        >
          Connected Flows
        </Toggle>
      )}

      {filters.schemas && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Toggle
                pressed={filters.identityLinks}
                onPressedChange={() => onToggle("identityLinks")}
                size="sm"
                className="h-7 text-[11px] px-2.5"
              >
                Identity Links
              </Toggle>
            </span>
          </TooltipTrigger>
          <TooltipContent>Show edges between schemas sharing the same primary identity namespace</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
