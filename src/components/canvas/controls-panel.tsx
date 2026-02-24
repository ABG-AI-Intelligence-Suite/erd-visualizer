"use client";

import { Plus, Minus, Maximize, Lock, Unlock, Eye, EyeOff } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useCanvasStore } from "@/store/canvas-store";

export function ControlsPanel() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const filters = useCanvasStore((s) => s.filters);
  const toggleFilter = useCanvasStore((s) => s.toggleFilter);

  return (
    <div className="absolute bottom-4 left-4 flex flex-col bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border overflow-hidden z-10">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none" onClick={() => zoomIn()}>
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Zoom in</TooltipContent>
      </Tooltip>

      <Separator />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none" onClick={() => zoomOut()}>
            <Minus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Zoom out</TooltipContent>
      </Tooltip>

      <Separator />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-none"
            onClick={() => fitView({ padding: 0.2, duration: 300 })}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Fit view (0)</TooltipContent>
      </Tooltip>

      <Separator />

      <div className="px-1.5 py-1.5 flex flex-col gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={filters.showSystem ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-[10px] justify-start px-2"
              onClick={() => toggleFilter("showSystem")}
            >
              {filters.showSystem ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
              System
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{filters.showSystem ? "Hide system entities" : "Show system entities"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={filters.showCustom ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-[10px] justify-start px-2"
              onClick={() => toggleFilter("showCustom")}
            >
              {filters.showCustom ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
              Custom
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{filters.showCustom ? "Hide custom entities" : "Show custom entities"}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
