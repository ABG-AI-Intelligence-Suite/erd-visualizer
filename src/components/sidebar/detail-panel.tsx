"use client";

import { useCanvasStore } from "@/store/canvas-store";
import { Legend } from "./legend";
import type { Node } from "@xyflow/react";
import type {
  DatasetNodeData,
  SchemaNodeData,
  FieldGroupNodeData,
  FlowNodeData,
  ErdNodeData,
  ErdField,
} from "@/lib/types";

function FieldTable({ fields }: { fields: ErdField[] }) {
  if (!fields || fields.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="font-medium text-gray-500 text-xs mb-1">Fields ({fields.length}):</p>
      <div className="max-h-[300px] overflow-y-auto border border-gray-100 rounded">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-gray-50 text-gray-500 sticky top-0">
              <th className="text-left px-1.5 py-0.5 font-medium">Path</th>
              <th className="text-left px-1.5 py-0.5 font-medium">Type</th>
              <th className="text-left px-1.5 py-0.5 font-medium w-8"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.path} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-1.5 py-0.5 font-mono text-gray-700 truncate max-w-[140px]" title={f.path}>
                  {f.path}
                </td>
                <td className="px-1.5 py-0.5 text-gray-500">{f.type}</td>
                <td className="px-1.5 py-0.5">
                  {f.isPrimaryKey && (
                    <span className="bg-blue-600 text-white rounded px-0.5 text-[9px] font-bold mr-0.5">PK</span>
                  )}
                  {f.isForeignKey && (
                    <span className="bg-amber-600 text-white rounded px-0.5 text-[9px] font-bold">FK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface DetailPanelProps {
  selectedNode: Node | null;
}

function DatasetDetail({ data }: { data: DatasetNodeData }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded bg-dataset" />
        <span className="text-[10px] font-semibold text-gray-500 uppercase">Dataset</span>
      </div>
      <h3 className="font-semibold text-sm text-gray-900">{data.label}</h3>
      {data.description && <p className="text-xs text-gray-600">{data.description}</p>}
      <div className="text-xs space-y-1">
        <p><span className="font-medium text-gray-500">ID:</span> {data.datasetId}</p>
        {data.schemaRefId && (
          <p><span className="font-medium text-gray-500">Schema Ref:</span> {data.schemaRefId}</p>
        )}
        <p>
          <span className="font-medium text-gray-500">Profile Enabled:</span>{" "}
          {data.profileEnabled ? "Yes" : "No"}
        </p>
        {data.identityField && (
          <p>
            <span className="font-medium text-gray-500">Identity (PK):</span>{" "}
            <code className="bg-gray-100 px-1 rounded text-[11px]">{data.identityField}</code>
          </p>
        )}
        {data.format && (
          <p><span className="font-medium text-gray-500">Format:</span> {data.format}</p>
        )}
      </div>
      <FieldTable fields={data.fields ?? []} />
    </div>
  );
}

function SchemaDetail({ data }: { data: SchemaNodeData }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded bg-schema" />
        <span className="text-[10px] font-semibold text-gray-500 uppercase">Schema</span>
      </div>
      <h3 className="font-semibold text-sm text-gray-900">{data.label}</h3>
      {data.description && <p className="text-xs text-gray-600">{data.description}</p>}
      <div className="text-xs space-y-1">
        <p><span className="font-medium text-gray-500">$id:</span> {data.schemaId}</p>
        {data.className && (
          <p><span className="font-medium text-gray-500">Class:</span> {data.className}</p>
        )}
        <p><span className="font-medium text-gray-500">Fields:</span> {data.fieldCount}</p>
        {data.primaryIdentityField && (
          <p>
            <span className="font-medium text-gray-500">Primary Identity (PK):</span>{" "}
            <code className="bg-gray-100 px-1 rounded text-[11px]">{data.primaryIdentityField}</code>
          </p>
        )}
        {data.extends.length > 0 && (
          <div>
            <p className="font-medium text-gray-500 mb-0.5">Extends:</p>
            {data.extends.map((ext) => (
              <p key={ext} className="text-[11px] font-mono text-gray-600 truncate pl-2">
                {ext}
              </p>
            ))}
          </div>
        )}
      </div>
      <FieldTable fields={data.fields ?? []} />
    </div>
  );
}

function FieldGroupDetail({ data }: { data: FieldGroupNodeData }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded bg-fieldgroup" />
        <span className="text-[10px] font-semibold text-gray-500 uppercase">Field Group</span>
      </div>
      <h3 className="font-semibold text-sm text-gray-900">{data.label}</h3>
      {data.description && <p className="text-xs text-gray-600">{data.description}</p>}
      <div className="text-xs space-y-1">
        <p><span className="font-medium text-gray-500">$id:</span> {data.fieldGroupId}</p>
        <p><span className="font-medium text-gray-500">Fields:</span> {data.fieldCount}</p>
      </div>
      <FieldTable fields={data.fields ?? []} />
    </div>
  );
}

function FlowDetail({ data }: { data: FlowNodeData }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded bg-flow" />
        <span className="text-[10px] font-semibold text-gray-500 uppercase">Dataflow</span>
      </div>
      <h3 className="font-semibold text-sm text-gray-900">{data.label}</h3>
      {data.description && <p className="text-xs text-gray-600">{data.description}</p>}
      <div className="text-xs space-y-1">
        <p><span className="font-medium text-gray-500">ID:</span> {data.flowId}</p>
        <p><span className="font-medium text-gray-500">State:</span> {data.state}</p>
        <p><span className="font-medium text-gray-500">Source:</span> {data.sourceSummary}</p>
        <p><span className="font-medium text-gray-500">Target:</span> {data.targetSummary}</p>
      </div>
    </div>
  );
}

function NodeDetail({ data }: { data: ErdNodeData }) {
  switch (data.entityType) {
    case "dataset":
      return <DatasetDetail data={data} />;
    case "schema":
      return <SchemaDetail data={data} />;
    case "fieldGroup":
      return <FieldGroupDetail data={data} />;
    case "flow":
      return <FlowDetail data={data} />;
  }
}

export function DetailPanel({ selectedNode }: DetailPanelProps) {
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);
  const focusNodeId = useCanvasStore((s) => s.focusNodeId);
  const setFocusNode = useCanvasStore((s) => s.setFocusNode);

  return (
    <div className="w-64 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
      <div className="p-3 border-b border-gray-200">
        <h2 className="text-xs font-bold text-gray-900 uppercase">Details</h2>
      </div>
      <div className="flex-1 p-3">
        {selectedNode ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[10px] text-blue-600 hover:underline"
              >
                Clear selection
              </button>
              {selectedNode.type !== "summaryNode" && (
                <>
                  <span className="text-gray-300">|</span>
                  {focusNodeId === selectedNode.id ? (
                    <button
                      onClick={() => setFocusNode(null)}
                      className="text-[10px] text-orange-600 hover:underline"
                    >
                      Exit focus
                    </button>
                  ) : (
                    <button
                      onClick={() => setFocusNode(selectedNode.id)}
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      Focus on this node
                    </button>
                  )}
                </>
              )}
            </div>
            <NodeDetail data={selectedNode.data as unknown as ErdNodeData} />
          </div>
        ) : (
          <p className="text-xs text-gray-400">Click a node to see details</p>
        )}
      </div>
      <div className="p-3 border-t border-gray-200">
        <Legend />
      </div>
    </div>
  );
}
