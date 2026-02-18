"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useReactFlow } from "@xyflow/react";
import { useCanvasStore } from "@/store/canvas-store";
import type { Node } from "@xyflow/react";

interface SearchBarProps {
  nodes: Node[];
}

export function SearchBar({ nodes }: SearchBarProps) {
  const searchQuery = useCanvasStore((s) => s.searchQuery);
  const setSearchQuery = useCanvasStore((s) => s.setSearchQuery);
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);
  const setFocusNode = useCanvasStore((s) => s.setFocusNode);

  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { setCenter } = useReactFlow();

  const results = useMemo(
    () =>
      searchQuery.length >= 2
        ? nodes
            .filter((n) => {
              const label = (n.data as { label?: string })?.label ?? "";
              return label.toLowerCase().includes(searchQuery.toLowerCase());
            })
            .slice(0, 20)
        : [],
    [nodes, searchQuery]
  );

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

  const typeColors: Record<string, string> = {
    datasetNode: "bg-dataset",
    schemaNode: "bg-schema",
    fieldGroupNode: "bg-fieldgroup",
    flowNode: "bg-flow",
  };

  return (
    <div className="relative">
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
        className="border border-gray-300 rounded px-2 py-1 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto"
        >
          {results.map((node, i) => {
            const label = (node.data as { label?: string })?.label ?? node.id;
            const entityType = (node.data as { entityType?: string })?.entityType ?? "";
            return (
              <div
                key={node.id}
                className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer ${
                  i === highlightIndex ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
                onMouseEnter={() => setHighlightIndex(i)}
              >
                <div
                  className="flex items-center gap-2 flex-1 min-w-0"
                  onClick={() => handleSelect(node)}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${typeColors[node.type ?? ""] ?? "bg-gray-300"}`} />
                  <span className="truncate">{label}</span>
                  <span className="text-[10px] text-gray-400 shrink-0">{entityType}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFocus(node);
                  }}
                  className="ml-2 text-[10px] text-blue-600 hover:underline shrink-0"
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
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3">
          <p className="text-xs text-gray-400">No results</p>
        </div>
      )}
    </div>
  );
}
