"use client";

import { useMemo } from "react";
import type { Node } from "@xyflow/react";
import type { ErdNodeData, ErdField } from "@/lib/types";

export type MatchType = "name" | "field" | "id" | "description";

export interface SearchResult {
  node: Node;
  label: string;
  entityType: string;
  nodeType: string;
  matchType: MatchType;
  matchDetail: string;
  score: number;
}

interface IndexEntry {
  node: Node;
  label: string;
  labelLower: string;
  entityType: string;
  nodeType: string;
  ids: string[];
  idsLower: string[];
  fieldPaths: string[];
  fieldPathsLower: string[];
  description: string;
  descriptionLower: string;
}

function getIds(data: ErdNodeData): string[] {
  const ids: string[] = [];
  const d = data as Record<string, unknown>;
  if (typeof d.datasetId === "string") ids.push(d.datasetId);
  if (typeof d.schemaId === "string") ids.push(d.schemaId);
  if (typeof d.altId === "string") ids.push(d.altId);
  if (typeof d.fieldGroupId === "string") ids.push(d.fieldGroupId);
  if (typeof d.flowId === "string") ids.push(d.flowId);
  if (typeof d.namespace === "string") ids.push(d.namespace);
  return ids;
}

function getFields(data: ErdNodeData): ErdField[] {
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.fields)) return d.fields as ErdField[];
  return [];
}

export function useSearchIndex(rawNodes: Node[]) {
  const index = useMemo(() => {
    const entries: IndexEntry[] = [];
    for (const node of rawNodes) {
      if (node.type === "summaryNode") continue;
      const data = node.data as unknown as ErdNodeData;
      const label = data.label ?? "";
      const ids = getIds(data);
      const fields = getFields(data);
      const fieldPaths = fields.map((f) => f.path);
      const description = ("description" in data && typeof data.description === "string") ? data.description : "";

      entries.push({
        node,
        label,
        labelLower: label.toLowerCase(),
        entityType: data.entityType ?? "",
        nodeType: node.type ?? "",
        ids,
        idsLower: ids.map((id) => id.toLowerCase()),
        fieldPaths,
        fieldPathsLower: fieldPaths.map((p) => p.toLowerCase()),
        description,
        descriptionLower: description.toLowerCase(),
      });
    }
    return entries;
  }, [rawNodes]);

  const search = useMemo(() => {
    return (query: string, maxResults = 30): SearchResult[] => {
      if (query.length < 2) return [];
      const q = query.toLowerCase();
      const results: SearchResult[] = [];

      for (const entry of index) {
        // Name match (highest priority)
        if (entry.labelLower.includes(q)) {
          const score = entry.labelLower === q ? 100 : entry.labelLower.startsWith(q) ? 90 : 80;
          results.push({
            node: entry.node,
            label: entry.label,
            entityType: entry.entityType,
            nodeType: entry.nodeType,
            matchType: "name",
            matchDetail: entry.label,
            score,
          });
          continue;
        }

        // ID match
        let matched = false;
        for (let i = 0; i < entry.idsLower.length; i++) {
          if (entry.idsLower[i].includes(q)) {
            results.push({
              node: entry.node,
              label: entry.label,
              entityType: entry.entityType,
              nodeType: entry.nodeType,
              matchType: "id",
              matchDetail: entry.ids[i],
              score: 70,
            });
            matched = true;
            break;
          }
        }
        if (matched) continue;

        // Field match
        for (let i = 0; i < entry.fieldPathsLower.length; i++) {
          if (entry.fieldPathsLower[i].includes(q)) {
            results.push({
              node: entry.node,
              label: entry.label,
              entityType: entry.entityType,
              nodeType: entry.nodeType,
              matchType: "field",
              matchDetail: entry.fieldPaths[i],
              score: 60,
            });
            matched = true;
            break;
          }
        }
        if (matched) continue;

        // Description match
        if (entry.descriptionLower.includes(q)) {
          results.push({
            node: entry.node,
            label: entry.label,
            entityType: entry.entityType,
            nodeType: entry.nodeType,
            matchType: "description",
            matchDetail: entry.description,
            score: 50,
          });
        }

        if (results.length >= maxResults) break;
      }

      results.sort((a, b) => b.score - a.score);
      return results.slice(0, maxResults);
    };
  }, [index]);

  return { search };
}
