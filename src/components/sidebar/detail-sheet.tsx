"use client";

import { useEffect } from "react";
import { X, Pin, PinOff, Focus, Crosshair } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCanvasStore } from "@/store/canvas-store";
import { DetailsTab } from "./details-tab";
import { FieldsTab } from "./fields-tab";
import { RelationsTab } from "./relations-tab";
import type { Node, Edge } from "@xyflow/react";
import type { ErdNodeData } from "@/lib/types";

interface DetailSheetProps {
  selectedNode: Node | null;
  nodes: Node[];
  edges: Edge[];
}

const ENTITY_COLORS: Record<string, string> = {
  dataset: "bg-dataset",
  schema: "bg-schema",
  fieldGroup: "bg-fieldgroup",
  flow: "bg-flow",
  identity: "bg-identity",
};

const ENTITY_LABELS: Record<string, string> = {
  dataset: "Dataset",
  schema: "Schema",
  fieldGroup: "Field Group",
  flow: "Dataflow",
  identity: "Identity",
};

export function DetailSheet({ selectedNode, nodes, edges }: DetailSheetProps) {
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);
  const focusNodeId = useCanvasStore((s) => s.focusNodeId);
  const setFocusNode = useCanvasStore((s) => s.setFocusNode);
  const detailPanelPinned = useCanvasStore((s) => s.detailPanelPinned);
  const toggleDetailPanelPinned = useCanvasStore((s) => s.toggleDetailPanelPinned);

  const isOpen = Boolean(selectedNode);
  const data = selectedNode?.data as unknown as ErdNodeData | undefined;
  const entityType = data?.entityType;
  const isSummary = selectedNode?.type === "summaryNode";
  const hasFields = entityType && ["dataset", "schema", "fieldGroup"].includes(entityType);

  // Close sheet when Escape is pressed (unless pinned)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !detailPanelPinned) {
        setSelectedNode(null);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, detailPanelPinned, setSelectedNode]);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !detailPanelPinned) setSelectedNode(null);
      }}
      modal={false}
    >
      <SheetContent
        side="right"
        className="w-80 p-0 border-l shadow-lg [&>button]:hidden"
        onInteractOutside={(e) => {
          if (detailPanelPinned) e.preventDefault();
        }}
      >
        {data && selectedNode && (
          <>
            <SheetHeader className="px-4 pt-4 pb-3 space-y-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded ${ENTITY_COLORS[entityType ?? ""] ?? "bg-gray-400"}`} />
                  <Badge variant="secondary" className="text-[10px]">
                    {ENTITY_LABELS[entityType ?? ""] ?? entityType}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={toggleDetailPanelPinned}
                      >
                        {detailPanelPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{detailPanelPinned ? "Unpin panel" : "Pin panel open"}</TooltipContent>
                  </Tooltip>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSelectedNode(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <SheetTitle className="text-sm font-semibold mt-2 truncate">
                {data.label}
              </SheetTitle>
              {!isSummary && (
                <div className="flex items-center gap-2 mt-2">
                  {focusNodeId === selectedNode.id ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setFocusNode(null)}
                    >
                      <Crosshair className="mr-1 h-3 w-3" />
                      Exit focus
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setFocusNode(selectedNode.id)}
                    >
                      <Focus className="mr-1 h-3 w-3" />
                      Focus on node
                    </Button>
                  )}
                </div>
              )}
            </SheetHeader>

            <Separator />

            {isSummary ? (
              <div className="p-4 text-sm text-muted-foreground">
                Click to expand this group on the canvas.
              </div>
            ) : (
              <Tabs defaultValue="details" className="flex flex-col h-[calc(100%-140px)]">
                <TabsList className="mx-4 mt-2 grid w-auto grid-cols-3">
                  <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
                  {hasFields ? (
                    <TabsTrigger value="fields" className="text-xs">Fields</TabsTrigger>
                  ) : (
                    <TabsTrigger value="fields" className="text-xs" disabled>Fields</TabsTrigger>
                  )}
                  <TabsTrigger value="relations" className="text-xs">Relations</TabsTrigger>
                </TabsList>
                <ScrollArea className="flex-1">
                  <TabsContent value="details" className="px-4 pb-4 mt-0">
                    <DetailsTab data={data} />
                  </TabsContent>
                  <TabsContent value="fields" className="px-4 pb-4 mt-0">
                    {hasFields && <FieldsTab data={data} />}
                  </TabsContent>
                  <TabsContent value="relations" className="px-4 pb-4 mt-0">
                    <RelationsTab
                      selectedNode={selectedNode}
                      nodes={nodes}
                      edges={edges}
                    />
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
