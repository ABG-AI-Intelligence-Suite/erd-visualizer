"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ErdNodeData, ErdField } from "@/lib/types";

type SortKey = "name" | "type" | "pk";

function getFields(data: ErdNodeData): ErdField[] {
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.fields)) return d.fields as ErdField[];
  return [];
}

export function FieldsTab({ data }: { data: ErdNodeData }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const allFields = useMemo(() => getFields(data), [data]);

  const filtered = useMemo(() => {
    let result = allFields;
    if (query.length >= 2) {
      const q = query.toLowerCase();
      result = result.filter(
        (f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q) || f.type.toLowerCase().includes(q)
      );
    }
    const sorted = [...result].sort((a, b) => {
      if (sortKey === "pk") {
        const aVal = a.isPrimaryKey ? 0 : a.isForeignKey ? 1 : 2;
        const bVal = b.isPrimaryKey ? 0 : b.isForeignKey ? 1 : 2;
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      const aVal = sortKey === "name" ? a.name : a.type;
      const bVal = sortKey === "name" ? b.name : b.type;
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return sorted;
  }, [allFields, query, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Filter fields..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>

      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground mr-1">Sort:</span>
        {(["name", "type", "pk"] as SortKey[]).map((key) => (
          <Button
            key={key}
            variant={sortKey === key ? "secondary" : "ghost"}
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => toggleSort(key)}
          >
            {key === "pk" ? "PK/FK" : key.charAt(0).toUpperCase() + key.slice(1)}
            {sortKey === key && (
              <ArrowUpDown className="ml-1 h-2.5 w-2.5" />
            )}
          </Button>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        {filtered.length} of {allFields.length} fields
      </p>

      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="space-y-0.5">
          {filtered.map((field) => (
            <div
              key={field.path}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-1 shrink-0">
                {field.isPrimaryKey && (
                  <Badge className="bg-primary text-primary-foreground text-[8px] px-1 py-0 h-4">PK</Badge>
                )}
                {field.isForeignKey && (
                  <Badge className="bg-amber-600 text-white text-[8px] px-1 py-0 h-4">FK</Badge>
                )}
              </div>
              <span className="font-mono text-foreground truncate flex-1" title={field.path}>
                {field.name}
              </span>
              <span className="text-muted-foreground text-[10px] shrink-0">
                {field.type}
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">
              {query ? "No fields match your filter." : "No fields available."}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
