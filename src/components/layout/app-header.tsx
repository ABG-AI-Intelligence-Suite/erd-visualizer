"use client";

import { Database, Search, Settings, Plug, PlugZap, Unplug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCanvasStore } from "@/store/canvas-store";
import type { AepConnectionConfig, FetchOptions, ViewMode } from "@/lib/types";

interface AppHeaderProps {
  onOpenConnectionDialog: () => void;
  onOpenCommandPalette: () => void;
  onOpenExportDialog?: () => void;
  onOpenShortcutsDialog?: () => void;
  hasEnvCredentials: boolean;
  envConfig: AepConnectionConfig | null;
  onConnect: (config: AepConnectionConfig, fetchOpts?: FetchOptions) => void;
}

export function AppHeader({
  onOpenConnectionDialog,
  onOpenCommandPalette,
  onOpenExportDialog,
  onOpenShortcutsDialog,
  hasEnvCredentials,
  envConfig,
  onConnect,
}: AppHeaderProps) {
  const connection = useCanvasStore((s) => s.connection);
  const clearConnection = useCanvasStore((s) => s.clearConnection);
  const isLoading = useCanvasStore((s) => s.isLoading);
  const hasGraph = useCanvasStore((s) => s.rawNodes.length > 0);
  const viewMode = useCanvasStore((s) => s.viewMode);
  const setViewMode = useCanvasStore((s) => s.setViewMode);

  const isConnected = Boolean(connection);
  const showViewControls = isConnected || hasGraph;

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-card px-4">
      {/* Title */}
      <div className="flex items-center gap-2.5">
        <Database className="h-4 w-4 text-primary/70" />
        <h1 className="text-sm font-semibold tracking-tight text-foreground">
          AEP ERD Visualizer
        </h1>
      </div>

      {/* Status badge */}
      <Badge
        variant={isConnected ? "default" : hasGraph ? "secondary" : "outline"}
        className={`text-[10px] ${
          isConnected
            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
            : hasGraph
              ? ""
              : "border-amber-200 text-amber-700"
        }`}
      >
        {isConnected ? "Connected" : hasGraph ? "Cached" : "Offline"}
      </Badge>

      {/* Env auto-connect button */}
      {hasEnvCredentials && !isConnected && envConfig && (
        <Button
          variant="default"
          size="sm"
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs hover:from-violet-500 hover:to-indigo-500"
          disabled={isLoading}
          onClick={() => onConnect(envConfig)}
        >
          <PlugZap className="mr-1.5 h-3.5 w-3.5" />
          .env Connect
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* View mode toggle */}
      {showViewControls && (
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => { if (v) setViewMode(v as ViewMode); }}
          size="sm"
          className="h-8"
        >
          <ToggleGroupItem value="full" className="text-xs px-3 h-7">
            Full
          </ToggleGroupItem>
          <ToggleGroupItem value="schema" className="text-xs px-3 h-7">
            Schema
          </ToggleGroupItem>
        </ToggleGroup>
      )}

      {/* Search trigger */}
      {showViewControls && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-56 justify-start text-muted-foreground gap-2"
              onClick={onOpenCommandPalette}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs">Search...</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">&#x2318;</span>K
              </kbd>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Search nodes, fields, IDs</TooltipContent>
        </Tooltip>
      )}

      {/* Connection + Settings */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={onOpenConnectionDialog}>
            {isConnected ? <Plug className="h-4 w-4 text-emerald-600" /> : <Unplug className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isConnected ? "Connection settings" : "Connect to AEP"}</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onOpenExportDialog && (
            <DropdownMenuItem onClick={onOpenExportDialog}>
              Export as image
            </DropdownMenuItem>
          )}
          {onOpenShortcutsDialog && (
            <DropdownMenuItem onClick={onOpenShortcutsDialog}>
              Keyboard shortcuts
            </DropdownMenuItem>
          )}
          {isConnected && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={clearConnection}
              >
                Disconnect
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
