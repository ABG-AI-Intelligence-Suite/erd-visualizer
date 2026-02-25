"use client";

import { useState, useEffect } from "react";
import { Plug, Loader2, History, ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCanvasStore } from "@/store/canvas-store";
import { useSnapshots, type SnapshotMeta } from "@/hooks/use-snapshots";
import type { AepConnectionConfig, FetchOptions } from "@/lib/types";

interface ConnectionDialogProps {
  onConnect: (config: AepConnectionConfig, fetchOpts?: FetchOptions) => void;
}

const TYPE_BADGES: Array<{
  key: string;
  label: string;
  className: string;
}> = [
  { key: "dataset",    label: "Datasets",     className: "bg-dataset/20 text-dataset border-dataset/30" },
  { key: "schema",     label: "Schemas",      className: "bg-schema/20 text-schema border-schema/30" },
  { key: "fieldGroup", label: "Field Groups", className: "bg-fieldgroup/20 text-fieldgroup border-fieldgroup/30" },
  { key: "flow",       label: "Flows",        className: "bg-flow/20 text-flow border-flow/30" },
];

function SnapshotTypeBadges({ typeCounts }: { typeCounts: Record<string, number> }) {
  const present = TYPE_BADGES.filter((b) => (typeCounts[b.key] ?? 0) > 0);
  if (present.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {present.map((b) => (
        <span
          key={b.key}
          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0 text-[10px] font-medium ${b.className}`}
        >
          {b.label}
          <span className="opacity-70">{typeCounts[b.key]}</span>
        </span>
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function groupByHash(snapshots: SnapshotMeta[]) {
  const groups = new Map<string, SnapshotMeta[]>();
  for (const s of snapshots) {
    const list = groups.get(s.sandboxHash) ?? [];
    list.push(s);
    groups.set(s.sandboxHash, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
  }
  return groups;
}

export function ConnectionDialog({ onConnect }: ConnectionDialogProps) {
  const open = useCanvasStore((s) => s.connectionDialogOpen);
  const setOpen = useCanvasStore((s) => s.setConnectionDialogOpen);
  const connection = useCanvasStore((s) => s.connection);
  const clearConnection = useCanvasStore((s) => s.clearConnection);
  const isLoading = useCanvasStore((s) => s.isLoading);
  const isConnected = Boolean(connection);

  const [token, setToken] = useState("");
  const [orgId, setOrgId] = useState("");
  const [sandbox, setSandbox] = useState("prod");
  const [apiKey, setApiKey] = useState("");
  const [snapshotLabel, setSnapshotLabel] = useState("");

  const [fetchDatasets, setFetchDatasets] = useState(true);
  const [fetchSchemas, setFetchSchemas] = useState(true);
  const [fetchFieldGroups, setFetchFieldGroups] = useState(true);
  const [fetchFlows, setFetchFlows] = useState(false);

  const { listSnapshots, loadSnapshot } = useSnapshots();
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [loadingSnapshot, setLoadingSnapshot] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg: AepConnectionConfig) => {
        if (cfg.token) setToken(cfg.token);
        if (cfg.orgId) setOrgId(cfg.orgId);
        if (cfg.sandbox) setSandbox(cfg.sandbox);
        if (cfg.apiKey) setApiKey(cfg.apiKey);
      })
      .catch(() => {});

    listSnapshots()
      .then(setSnapshots)
      .catch(() => setSnapshots([]));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !orgId || !apiKey) return;
    const fetchOpts: FetchOptions = {
      datasets: fetchDatasets,
      schemas: fetchSchemas,
      fieldGroups: fetchFieldGroups,
      flows: fetchFlows,
      snapshotLabel: snapshotLabel.trim() || undefined,
    };
    onConnect({ token, orgId, sandbox, apiKey }, fetchOpts);
    setOpen(false);
  };

  const handleLoadSnapshot = async (snapshot: SnapshotMeta) => {
    setLoadingSnapshot(snapshot.filename);
    try {
      await loadSnapshot(snapshot.filename, snapshot.orgId, snapshot.sandboxName);
      setOpen(false);
    } catch (err) {
      console.error("Failed to load snapshot:", err);
    } finally {
      setLoadingSnapshot(null);
    }
  };

  const grouped = groupByHash(snapshots);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            {isConnected ? "Connection Settings" : "Connect to AEP"}
          </DialogTitle>
          <DialogDescription>
            Enter your Adobe Experience Platform credentials. They are only sent to the local proxy and never stored.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token" className="text-xs">Bearer Token</Label>
            <Input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ey..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgId" className="text-xs">Org ID</Label>
            <Input
              id="orgId"
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="ABC123@AdobeOrg"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sandbox" className="text-xs">Sandbox</Label>
              <Input
                id="sandbox"
                type="text"
                value={sandbox}
                onChange={(e) => setSandbox(e.target.value)}
                placeholder="prod"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-xs">API Key</Label>
              <Input
                id="apiKey"
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="your-api-key"
                required
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Data to Fetch</Label>
            <p className="text-[11px] text-muted-foreground">
              Select which entity types to load. You can fetch additional types later.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { label: "Datasets",     checked: fetchDatasets,    set: setFetchDatasets,    color: "bg-dataset" },
                { label: "Schemas",      checked: fetchSchemas,     set: setFetchSchemas,     color: "bg-schema" },
                { label: "Field Groups", checked: fetchFieldGroups, set: setFetchFieldGroups, color: "bg-fieldgroup" },
                { label: "Flows",        checked: fetchFlows,       set: setFetchFlows,       color: "bg-flow" },
              ].map(({ label, checked, set, color }) => (
                <label key={label} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => set(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-xs text-foreground">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="snapshotLabel" className="text-xs font-semibold">
              Snapshot Label <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="snapshotLabel"
              type="text"
              value={snapshotLabel}
              onChange={(e) => setSnapshotLabel(e.target.value)}
              placeholder="e.g. pre-migration baseline, Q1 review"
              maxLength={80}
            />
            <p className="text-[11px] text-muted-foreground">
              Saved with the snapshot so you can identify it later.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {isConnected && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  clearConnection();
                  setOpen(false);
                }}
              >
                Disconnect
              </Button>
            )}
            <Button
              type="submit"
              disabled={isLoading || !token || !orgId || !apiKey || (!fetchDatasets && !fetchSchemas && !fetchFieldGroups && !fetchFlows)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        </form>

        <Separator />

        {/* Saved Snapshots section */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setSnapshotsOpen((v) => !v)}
            className="flex w-full items-center gap-2 text-left"
          >
            <History className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold flex-1">Saved Snapshots</span>
            {snapshots.length > 0 && (
              <span className="text-[10px] text-muted-foreground mr-1">{snapshots.length}</span>
            )}
            {snapshotsOpen ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </button>

          {snapshotsOpen && (
            <div className="space-y-3 pt-1">
              {snapshots.length === 0 ? (
                <p className="text-[11px] text-muted-foreground pl-6">
                  No saved snapshots yet. Connect to a sandbox to create one automatically.
                </p>
              ) : (
                Array.from(grouped.entries()).map(([hash, group]) => {
                  const first = group[0];
                  return (
                    <div key={hash} className="space-y-1">
                      <p className="text-[11px] font-medium text-foreground pl-6 truncate">
                        {first.sandboxName}
                        <span className="text-muted-foreground font-normal ml-1">
                          — {first.orgId}
                        </span>
                      </p>
                      <div className="space-y-1.5 pl-6">
                        {group.map((snap) => (
                          <div
                            key={snap.filename}
                            className="flex items-start justify-between gap-2 rounded-md border px-2 py-1.5"
                          >
                            <div className="min-w-0 flex-1">
                              {snap.label ? (
                                <>
                                  <p className="text-[12px] font-medium text-foreground truncate">
                                    {snap.label}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatDate(snap.capturedAt)} · {snap.counts.nodes} nodes
                                  </p>
                                </>
                              ) : (
                                <p className="text-[11px] text-foreground">
                                  {formatDate(snap.capturedAt)}
                                  <span className="text-muted-foreground ml-1">
                                    · {snap.counts.nodes} nodes
                                  </span>
                                </p>
                              )}
                              <SnapshotTypeBadges typeCounts={snap.typeCounts ?? {}} />
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-6 text-[11px] px-2 shrink-0 mt-0.5"
                              disabled={loadingSnapshot === snap.filename}
                              onClick={() => handleLoadSnapshot(snap)}
                            >
                              {loadingSnapshot === snap.filename ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Load"
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
