"use client";

import { useState, useRef, useEffect, useCallback, useMemo, useDeferredValue } from "react";
import { useReactFlow } from "@xyflow/react";
import { useCanvasStore } from "@/store/canvas-store";
import type { Node } from "@xyflow/react";

const MAX_SEARCH_RESULTS = 20;
const TYPE_COLORS: Record<string, string> = {
  datasetNode: "bg-dataset",
  schemaNode: "bg-schema",
  fieldGroupNode: "bg-fieldgroup",
  flowNode: "bg-flow",
};

interface SearchBarProps {
  nodes: Node[];
}

export function SearchBar({ nodes }: SearchBarProps) {
  const searchQuery = useCanvasStore((s) => s.searchQuery);
  const deferredQuery = useDeferredValue(searchQuery);
  const setSearchQuery = useCanvasStore((s) => s.setSearchQuery);
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);
  const setFocusNode = useCanvasStore((s) => s.setFocusNode);

  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { setCenter } = useReactFlow();

  const searchIndex = useMemo(() => {
    const list: { node: Node; labelLower: string }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const label = (node.data as { label?: string })?.label ?? "";
      list.push({ node, labelLower: label.toLowerCase() });
    }
    return list;
  }, [nodes]);

  const results = useMemo(() => {
    if (deferredQuery.length < 2) return [];
    const q = deferredQuery.toLowerCase();
    const out: Node[] = [];
    for (let i = 0; i < searchIndex.length && out.length < MAX_SEARCH_RESULTS; i++) {
      if (searchIndex[i].labelLower.includes(q)) out.push(searchIndex[i].node);
    }
    return out;
  }, [searchIndex, deferredQuery]);

  const handleSelect = useCallback(
    (node: Node) => {
      setSelectedNode(node.id);
      setSearchQuery("");
      setIsOpen(false);
      const x = node.position.x + 132;
      const y = node.position.y + 40;
      setCenter(x, y, { zoom: 1.2, duration: 500 });
    },
    [setSelectedNode, setSearchQuery, setCenter]
  );

  const handleFocus = useCallback(
    (node: Node) => {
      setFocusNode(node.id);
      setSearchQuery("");
      setIsOpen(false);
      const x = node.position.x + 132;
      const y = node.position.y + 40;
      setCenter(x, y, { zoom: 0.8, duration: 500 });
    },
    [setFocusNode, setSearchQuery, setCenter]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[highlightIndex]) {
        handleSelect(results[highlightIndex]);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setSearchQuery("");
        inputRef.current?.blur();
      }
    },
    [results, highlightIndex, handleSelect, setSearchQuery]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as HTMLElement) &&
        !inputRef.current?.contains(e.target as HTMLElement)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlightIndex(0);
  }, [searchQuery]);

  return (
    <div className="relative w-full max-w-[360px]">
      <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-3.5 w-3.5"
          aria-hidden
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search nodes..."
        className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-16 text-[11px] text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-medium uppercase tracking-wide text-slate-400">
        Enter
      </span>
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full z-50 mt-1.5 max-h-80 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
        >
          {results.map((node, i) => {
            const label = (node.data as { label?: string })?.label ?? node.id;
            const entityType = (node.data as { entityType?: string })?.entityType ?? "";
            return (
              <div
                key={node.id}
                className={`group flex items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors ${
                  i === highlightIndex ? "bg-blue-50" : "hover:bg-slate-50"
                }`}
                onMouseEnter={() => setHighlightIndex(i)}
              >
                <div
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
                  onClick={() => handleSelect(node)}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_COLORS[node.type ?? ""] ?? "bg-gray-300"}`} />
                  <span className="truncate text-slate-700">{label}</span>
                  <span className="shrink-0 rounded bg-slate-100 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-500">
                    {entityType}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFocus(node);
                  }}
                  className="ml-2 shrink-0 rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-blue-600 transition-colors hover:bg-blue-50"
                  title="Focus on this node and its connections"
                >
                  Focus
                </button>
              </div>
            );
          })}
        </div>
      )}
      {isOpen && searchQuery.length >= 2 && results.length === 0 && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg">
          <p className="text-[11px] text-slate-500">No matching nodes found.</p>
        </div>
      )}
    </div>
  );
}
