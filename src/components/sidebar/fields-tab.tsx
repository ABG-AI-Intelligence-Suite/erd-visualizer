"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, Search, ChevronRight, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ErdNodeData, ErdField } from "@/lib/types";

type SortKey = "name" | "type" | "pk";

interface FieldTreeNode {
  field: ErdField;
  children: FieldTreeNode[];
}

function getFields(data: ErdNodeData): ErdField[] {
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.fields)) return d.fields as ErdField[];
  return [];
}

function buildTree(fields: ErdField[]): FieldTreeNode[] {
  const nodeMap = new Map<string, FieldTreeNode>();
  const roots: FieldTreeNode[] = [];

  for (const field of fields) {
    nodeMap.set(field.path, { field, children: [] });
  }

  for (const field of fields) {
    const node = nodeMap.get(field.path)!;
    const lastDot = field.path.lastIndexOf(".");
    const parentPath = lastDot !== -1 ? field.path.slice(0, lastDot) : null;

    if (parentPath && nodeMap.has(parentPath)) {
      nodeMap.get(parentPath)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// Returns all paths that contain a descendant matching the query
function matchingPaths(nodes: FieldTreeNode[], q: string): Set<string> {
  const matched = new Set<string>();

  function walk(node: FieldTreeNode): boolean {
    const selfMatch =
      node.field.name.toLowerCase().includes(q) ||
      node.field.path.toLowerCase().includes(q) ||
      node.field.type.toLowerCase().includes(q);
    const childMatch = node.children.some((c) => walk(c));
    if (selfMatch || childMatch) matched.add(node.field.path);
    return selfMatch || childMatch;
  }

  nodes.forEach((n) => walk(n));
  return matched;
}

function FieldRow({
  node,
  depth,
  expandedPaths,
  toggleExpanded,
  visiblePaths,
  isFiltering,
}: {
  node: FieldTreeNode;
  depth: number;
  expandedPaths: Set<string>;
  toggleExpanded: (path: string) => void;
  visiblePaths: Set<string> | null;
  isFiltering: boolean;
}) {
  const { field, children } = node;

  if (visiblePaths && !visiblePaths.has(field.path)) return null;

  const hasChildren = children.length > 0;
  const isExpanded = isFiltering
    ? true // auto-expand when filtering so matched children are visible
    : expandedPaths.has(field.path);

  return (
    <>
      <div
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-accent transition-colors ${
          hasChildren ? "cursor-pointer" : ""
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => hasChildren && !isFiltering && toggleExpanded(field.path)}
      >
        {/* Expand/collapse toggle */}
        <span className="shrink-0 w-3.5">
          {hasChildren && !isFiltering ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )
          ) : null}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {field.isPrimaryKey && (
            <Badge className="bg-primary text-primary-foreground text-[8px] px-1 py-0 h-4">PK</Badge>
          )}
          {field.isForeignKey && (
            <Badge className="bg-amber-600 text-white text-[8px] px-1 py-0 h-4">FK</Badge>
          )}
        </div>

        <span
          className={`font-mono truncate flex-1 ${
            hasChildren ? "font-medium text-foreground" : "text-foreground"
          }`}
          title={field.path}
        >
          {field.name}
        </span>

        <span className={`text-[10px] shrink-0 ${hasChildren ? "text-primary/70 font-medium" : "text-muted-foreground"}`}>
          {field.type}
          {hasChildren && !isFiltering && (
            <span className="ml-1 text-muted-foreground font-normal">
              ({children.length})
            </span>
          )}
        </span>
      </div>

      {isExpanded &&
        children.map((child) => (
          <FieldRow
            key={child.field.path}
            node={child}
            depth={depth + 1}
            expandedPaths={expandedPaths}
            toggleExpanded={toggleExpanded}
            visiblePaths={visiblePaths}
            isFiltering={isFiltering}
          />
        ))}
    </>
  );
}

export function FieldsTab({ data }: { data: ErdNodeData }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const allFields = useMemo(() => getFields(data), [data]);
  const isFiltering = query.length >= 2;

  const sortedTopLevelFields = useMemo(() => {
    const sorted = [...allFields].sort((a, b) => {
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
  }, [allFields, sortKey, sortAsc]);

  const tree = useMemo(() => buildTree(sortedTopLevelFields), [sortedTopLevelFields]);

  const visiblePaths = useMemo(() => {
    if (!isFiltering) return null;
    return matchingPaths(tree, query.toLowerCase());
  }, [tree, query, isFiltering]);

  const toggleExpanded = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const visibleCount = visiblePaths ? visiblePaths.size : allFields.length;

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
            {sortKey === key && <ArrowUpDown className="ml-1 h-2.5 w-2.5" />}
          </Button>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        {isFiltering ? `${visibleCount} of ${allFields.length} fields` : `${allFields.length} fields`}
        {!isFiltering && (
          <span className="ml-1 opacity-60">· click objects to expand</span>
        )}
      </p>

      <ScrollArea className="h-[calc(100vh-400px)]">
        <div className="space-y-0.5">
          {tree.map((node) => (
            <FieldRow
              key={node.field.path}
              node={node}
              depth={0}
              expandedPaths={expandedPaths}
              toggleExpanded={toggleExpanded}
              visiblePaths={visiblePaths}
              isFiltering={isFiltering}
            />
          ))}
          {tree.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">
              {query ? "No fields match your filter." : "No fields available."}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
