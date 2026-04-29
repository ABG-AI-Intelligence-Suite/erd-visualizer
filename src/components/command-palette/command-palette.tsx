"use client";

import { useCallback, useMemo, useState } from "react";
import { Search, FileText, Hash, Type, Focus, Download, Keyboard } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useCanvasStore } from "@/store/canvas-store";
import { useSearchIndex, type SearchResult } from "@/hooks/use-search-index";

const TYPE_COLORS: Record<string, string> = {
  dataset: "bg-dataset",
  schema: "bg-schema",
  fieldGroup: "bg-fieldgroup",
  flow: "bg-flow",
  identity: "bg-identity",
};

const MATCH_ICONS: Record<string, typeof Search> = {
  name: Type,
  field: FileText,
  id: Hash,
  description: Search,
};

export function CommandPalette() {
  const open = useCanvasStore((s) => s.commandPaletteOpen);
  const setOpen = useCanvasStore((s) => s.setCommandPaletteOpen);
  const rawNodes = useCanvasStore((s) => s.rawNodes);
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);
  const setFocusNode = useCanvasStore((s) => s.setFocusNode);
  const setScrollToNode = useCanvasStore((s) => s.setScrollToNode);
  const setExportDialogOpen = useCanvasStore((s) => s.setExportDialogOpen);
  const setShortcutsDialogOpen = useCanvasStore((s) => s.setShortcutsDialogOpen);

  const [query, setQuery] = useState("");
  const { search } = useSearchIndex(rawNodes);

  const results = useMemo(() => search(query), [search, query]);

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const r of results) {
      const key = r.matchType;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    return groups;
  }, [results]);

  const navigateToNode = useCallback(
    (nodeId: string) => {
      setSelectedNode(nodeId);
      setScrollToNode(nodeId);
      setOpen(false);
      setQuery("");
    },
    [setSelectedNode, setScrollToNode, setOpen]
  );

  const focusOnNode = useCallback(
    (nodeId: string) => {
      setFocusNode(nodeId);
      setOpen(false);
      setQuery("");
    },
    [setFocusNode, setOpen]
  );

  const groupLabels: Record<string, string> = {
    name: "Nodes",
    field: "Fields",
    id: "IDs",
    description: "Descriptions",
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQuery("");
      }}
    >
      <CommandInput
        placeholder="Search nodes, fields, IDs..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {Object.entries(grouped).map(([matchType, items]) => {
          const Icon = MATCH_ICONS[matchType] ?? Search;
          return (
            <CommandGroup key={matchType} heading={groupLabels[matchType] ?? matchType}>
              {items.map((r) => (
                <CommandItem
                  key={`${r.node.id}-${r.matchType}`}
                  value={`${r.label} ${r.matchDetail} ${r.entityType}`}
                  onSelect={() => navigateToNode(r.node.id)}
                  className="flex items-center gap-2"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_COLORS[r.entityType] ?? "bg-gray-400"}`} />
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{r.label}</span>
                  {r.matchType !== "name" && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                      {r.matchDetail}
                    </span>
                  )}
                  <Badge variant="outline" className="text-[9px] shrink-0 ml-auto">
                    {r.entityType}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}

        {query.length < 2 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem
                onSelect={() => {
                  setExportDialogOpen(true);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export as image
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setShortcutsDialogOpen(true);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <Keyboard className="mr-2 h-4 w-4" />
                Keyboard shortcuts
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
