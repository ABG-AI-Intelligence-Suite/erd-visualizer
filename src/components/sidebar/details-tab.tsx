"use client";

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  ErdNodeData,
  DatasetNodeData,
  SchemaNodeData,
  FieldGroupNodeData,
  FlowNodeData,
} from "@/lib/types";

function CopyableId({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1">
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-xs font-mono text-foreground break-all mt-0.5">{value}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 mt-1"
        onClick={() => void navigator.clipboard.writeText(value)}
      >
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-1">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="text-xs text-foreground mt-0.5">{value}</div>
    </div>
  );
}

function DatasetDetails({ data }: { data: DatasetNodeData }) {
  return (
    <div className="space-y-1">
      <CopyableId label="Dataset ID" value={data.datasetId} />
      {data.description && <MetaRow label="Description" value={data.description} />}
      {data.schemaRefId && <CopyableId label="Schema Ref" value={data.schemaRefId} />}
      <MetaRow
        label="Profile Enabled"
        value={
          <Badge variant={data.profileEnabled ? "default" : "secondary"} className="text-[10px]">
            {data.profileEnabled ? "Yes" : "No"}
          </Badge>
        }
      />
      {data.identityField && (
        <MetaRow
          label="Primary Identity"
          value={
            <span className="flex items-center gap-1.5">
              <Badge className="bg-dataset-dark text-white text-[9px]">PK</Badge>
              <code className="text-[11px] font-mono">{data.identityField}</code>
            </span>
          }
        />
      )}
      {data.format && <MetaRow label="Format" value={data.format} />}
      <MetaRow
        label="Type"
        value={
          <Badge variant={data.isSystem ? "outline" : "secondary"} className="text-[10px]">
            {data.isSystem ? "System" : "Custom"}
          </Badge>
        }
      />
    </div>
  );
}

function SchemaDetails({ data }: { data: SchemaNodeData }) {
  const className = data.className?.split("/").pop() ?? "Unknown Class";
  return (
    <div className="space-y-1">
      <CopyableId label="Schema $id" value={data.schemaId} />
      {data.altId && <CopyableId label="Alt ID" value={data.altId} />}
      {data.description && <MetaRow label="Description" value={data.description} />}
      <MetaRow label="Class" value={className} />
      <MetaRow label="Field Count" value={String(data.fieldCount)} />
      {data.primaryIdentityField && (
        <MetaRow
          label="Primary Identity"
          value={
            <span className="flex items-center gap-1.5">
              <Badge className="bg-schema-dark text-white text-[9px]">PK</Badge>
              <code className="text-[11px] font-mono">{data.primaryIdentityField}</code>
            </span>
          }
        />
      )}
      {data.extends.length > 0 && (
        <MetaRow
          label={`Extends (${data.extends.length})`}
          value={
            <div className="space-y-0.5">
              {data.extends.map((ext) => (
                <p key={ext} className="text-[11px] font-mono text-muted-foreground truncate">{ext}</p>
              ))}
            </div>
          }
        />
      )}
      <MetaRow
        label="Type"
        value={
          <Badge variant={data.isSystem ? "outline" : "secondary"} className="text-[10px]">
            {data.isSystem ? "System" : "Custom"}
          </Badge>
        }
      />
    </div>
  );
}

function FieldGroupDetails({ data }: { data: FieldGroupNodeData }) {
  return (
    <div className="space-y-1">
      <CopyableId label="Field Group $id" value={data.fieldGroupId} />
      {data.description && <MetaRow label="Description" value={data.description} />}
      <MetaRow label="Field Count" value={String(data.fieldCount)} />
      <MetaRow
        label="Type"
        value={
          <Badge variant={data.isSystem ? "outline" : "secondary"} className="text-[10px]">
            {data.isSystem ? "System" : "Custom"}
          </Badge>
        }
      />
    </div>
  );
}

function FlowDetails({ data }: { data: FlowNodeData }) {
  return (
    <div className="space-y-1">
      <CopyableId label="Flow ID" value={data.flowId} />
      {data.description && <MetaRow label="Description" value={data.description} />}
      <MetaRow
        label="State"
        value={
          <Badge
            variant={data.state === "enabled" ? "default" : "secondary"}
            className={`text-[10px] ${data.state === "enabled" ? "bg-emerald-100 text-emerald-700" : ""}`}
          >
            {data.state}
          </Badge>
        }
      />
      <MetaRow label="Source" value={data.sourceSummary} />
      <MetaRow label="Target" value={data.targetSummary} />
    </div>
  );
}

export function DetailsTab({ data }: { data: ErdNodeData }) {
  switch (data.entityType) {
    case "dataset":
      return <DatasetDetails data={data} />;
    case "schema":
      return <SchemaDetails data={data} />;
    case "fieldGroup":
      return <FieldGroupDetails data={data} />;
    case "flow":
      return <FlowDetails data={data} />;
    default:
      return <p className="text-xs text-muted-foreground">No details available.</p>;
  }
}
