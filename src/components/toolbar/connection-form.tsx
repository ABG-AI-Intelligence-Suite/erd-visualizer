"use client";

import { useState, useEffect } from "react";
import { Plug, Loader2, History, ChevronDown, ChevronRight, BookUser, Trash2, Check } from "lucide-react";
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
import { useCredentialProfiles } from "@/hooks/use-credential-profiles";
import type { AepConnectionConfig, FetchOptions } from "@/lib/types";

interface ConnectionDialogProps {
  onConnect: (config: AepConnectionConfig, fetchOpts?: FetchOptions) => void;
  onUpdate: (config: AepConnectionConfig, fetchOpts: FetchOptions) => void;
}

const TYPE_BADGES: Array<{ key: string; label: string; className: string }> = [
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
        <span key={b.key} className={`inline-flex items-center gap-1 rounded border px-1.5 py-0 text-[10px] font-medium ${b.className}`}>
          {b.label} <span className="opacity-70">{typeCounts[b.key]}</span>
        </span>
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch { return iso; }
}

function groupByHash(snapshots: SnapshotMeta[]) {
  const groups = new Map<string, SnapshotMeta[]>();
  for (const s of snapshots) {
    const list = groups.get(s.sandboxHash) ?? [];
    list.push(s);
    groups.set(s.sandboxHash, list);
  }
  for (const list of Array.from(groups.values())) {
    list.sort((a: SnapshotMeta, b: SnapshotMeta) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
  }
  return groups;
}

// Maps FetchOptions keys to the entityType values stored on graph nodes
const ENTITY_TYPE_MAP: Record<string, string> = {
  datasets:    "dataset",
  schemas:     "schema",
  fieldGroups: "fieldGroup",
  flows:       "flow",
};

export function ConnectionDialog({ onConnect, onUpdate }: ConnectionDialogProps) {
  const open                  = useCanvasStore((s) => s.connectionDialogOpen);
  const setOpen               = useCanvasStore((s) => s.setConnectionDialogOpen);
  const connection            = useCanvasStore((s) => s.connection);
  const clearConnection       = useCanvasStore((s) => s.clearConnection);
  const isLoading             = useCanvasStore((s) => s.isLoading);
  const rawNodes              = useCanvasStore((s) => s.rawNodes);
  const removeEntityTypes     = useCanvasStore((s) => s.removeEntityTypes);
  const activeSnapshotLabel   = useCanvasStore((s) => s.activeSnapshotLabel);
  const isConnected           = Boolean(connection);

  // Which entity types currently exist in the graph
  const loadedTypes = {
    datasets:    rawNodes.some((n) => (n.data as { entityType?: string })?.entityType === "dataset"),
    schemas:     rawNodes.some((n) => (n.data as { entityType?: string })?.entityType === "schema"),
    fieldGroups: rawNodes.some((n) => (n.data as { entityType?: string })?.entityType === "fieldGroup"),
    flows:       rawNodes.some((n) => (n.data as { entityType?: string })?.entityType === "flow"),
  };

  const [token,         setToken]         = useState("");
  const [orgId,         setOrgId]         = useState("");
  const [sandbox,       setSandbox]       = useState("prod");
  const [apiKey,        setApiKey]        = useState("");
  const [snapshotLabel, setSnapshotLabel] = useState("");

  // Token generation
  const [clientSecret,    setClientSecret]    = useState("");
  const [generatingToken, setGeneratingToken] = useState(false);
  const [tokenError,      setTokenError]      = useState<string | null>(null);

  // Profiles
  const { profiles, addProfile, deleteProfile } = useCredentialProfiles();
  const [profilesOpen,  setProfilesOpen]  = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileName,   setProfileName]   = useState("");

  const [fetchDatasets,    setFetchDatasets]    = useState(true);
  const [fetchSchemas,     setFetchSchemas]     = useState(true);
  const [fetchFieldGroups, setFetchFieldGroups] = useState(true);
  const [fetchFlows,       setFetchFlows]       = useState(false);

  const { listSnapshots, loadSnapshot } = useSnapshots();
  const [snapshots,       setSnapshots]       = useState<SnapshotMeta[]>([]);
  const [snapshotsOpen,   setSnapshotsOpen]   = useState(false);
  const [loadingSnapshot, setLoadingSnapshot] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    // Reset ephemeral state on open
    setClientSecret("");
    setTokenError(null);
    setSavingProfile(false);
    setProfileName("");

    // Initialise checkboxes to match what's already in the graph
    setFetchDatasets(loadedTypes.datasets    || !isConnected);
    setFetchSchemas(loadedTypes.schemas      || !isConnected);
    setFetchFieldGroups(loadedTypes.fieldGroups);
    setFetchFlows(loadedTypes.flows);

    // Pre-fill snapshot label from whatever was last loaded
    setSnapshotLabel(activeSnapshotLabel ?? "");

    if (isConnected && connection) {
      if (connection.token)   setToken(connection.token);
      if (connection.orgId)   setOrgId(connection.orgId);
      if (connection.sandbox) setSandbox(connection.sandbox);
      if (connection.apiKey)  setApiKey(connection.apiKey);
    } else {
      fetch("/api/config")
        .then((r) => r.json())
        .then((cfg: AepConnectionConfig) => {
          if (cfg.token)   setToken(cfg.token);
          if (cfg.orgId)   setOrgId(cfg.orgId);
          if (cfg.sandbox) setSandbox(cfg.sandbox);
          if (cfg.apiKey)  setApiKey(cfg.apiKey);
        })
        .catch(() => {});
    }

    listSnapshots().then(setSnapshots).catch(() => setSnapshots([]));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Generate token from client secret ────────────────────────────────────────

  const handleGenerateToken = async () => {
    if (!clientSecret || !apiKey) return;
    setGeneratingToken(true);
    setTokenError(null);
    try {
      const res = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: apiKey, clientSecret }),
      });
      const data = await res.json() as { access_token?: string; error?: string };
      if (!res.ok || !data.access_token) {
        setTokenError(data.error ?? "Token generation failed");
      } else {
        setToken(data.access_token);
        setClientSecret("");
      }
    } catch {
      setTokenError("Could not reach token endpoint");
    } finally {
      setGeneratingToken(false);
    }
  };

  // ── Profile actions ───────────────────────────────────────────────────────────

  const handleLoadProfile = (profile: { orgId: string; apiKey: string; sandbox: string }) => {
    setOrgId(profile.orgId);
    setApiKey(profile.apiKey);
    setSandbox(profile.sandbox);
    setProfilesOpen(false);
  };

  const handleSaveProfile = () => {
    const name = profileName.trim();
    if (!name || !orgId || !apiKey) return;
    addProfile(name, orgId, apiKey, sandbox);
    setProfileName("");
    setSavingProfile(false);
  };

  // ── Compute what the user intends to change ─────────────────────────────────

  const typesToRemove: string[] = isConnected ? (
    Object.entries({
      datasets:    { loaded: loadedTypes.datasets,    checked: fetchDatasets },
      schemas:     { loaded: loadedTypes.schemas,     checked: fetchSchemas },
      fieldGroups: { loaded: loadedTypes.fieldGroups, checked: fetchFieldGroups },
      flows:       { loaded: loadedTypes.flows,       checked: fetchFlows },
    })
      .filter(([, { loaded, checked }]) => loaded && !checked)
      .map(([key]) => ENTITY_TYPE_MAP[key])
  ) : [];

  const addOpts: FetchOptions | null = isConnected ? {
    datasets:    !loadedTypes.datasets    && fetchDatasets,
    schemas:     !loadedTypes.schemas     && fetchSchemas,
    fieldGroups: !loadedTypes.fieldGroups && fetchFieldGroups,
    flows:       !loadedTypes.flows       && fetchFlows,
  } : null;

  const hasRemovals  = typesToRemove.length > 0;
  const hasAdditions = addOpts ? Object.values(addOpts).some(Boolean) : false;

  const credentialsRequired = !isConnected || hasAdditions;
  const credentialsPresent  = Boolean(token && orgId && apiKey);

  const submitDisabled =
    isLoading ||
    (credentialsRequired && !credentialsPresent) ||
    (isConnected && !hasAdditions && !hasRemovals);

  const buttonLabel = isLoading
    ? (hasAdditions || !isConnected ? "Updating…" : "Applying…")
    : isConnected
      ? (hasAdditions ? "Update" : "Apply")
      : "Connect";

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const label = snapshotLabel.trim() || undefined;

    if (isConnected) {
      if (hasRemovals) {
        removeEntityTypes(typesToRemove);
      }
      if (hasAdditions && addOpts) {
        onUpdate({ token, orgId, sandbox, apiKey }, { ...addOpts, snapshotLabel: label });
      }
    } else {
      onConnect({ token, orgId, sandbox, apiKey }, {
        datasets:    fetchDatasets,
        schemas:     fetchSchemas,
        fieldGroups: fetchFieldGroups,
        flows:       fetchFlows,
        snapshotLabel: label,
      });
    }
    setOpen(false);
  };

  const handleLoadSnapshot = async (snapshot: SnapshotMeta) => {
    setLoadingSnapshot(snapshot.filename);
    try {
      await loadSnapshot(snapshot.filename, snapshot.orgId, snapshot.sandboxName, snapshot.label);
      setOpen(false);
    } catch (err) {
      console.error("Failed to load snapshot:", err);
    } finally {
      setLoadingSnapshot(null);
    }
  };

  const grouped = groupByHash(snapshots);

  const ENTITY_ROWS = [
    { label: "Datasets",     loaded: loadedTypes.datasets,    checked: fetchDatasets,    set: setFetchDatasets,    color: "bg-dataset" },
    { label: "Schemas",      loaded: loadedTypes.schemas,     checked: fetchSchemas,     set: setFetchSchemas,     color: "bg-schema" },
    { label: "Field Groups", loaded: loadedTypes.fieldGroups, checked: fetchFieldGroups, set: setFetchFieldGroups, color: "bg-fieldgroup" },
    { label: "Flows",        loaded: loadedTypes.flows,       checked: fetchFlows,       set: setFetchFlows,       color: "bg-flow" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            {isConnected ? "Connection Settings" : "Connect to AEP"}
          </DialogTitle>
          <DialogDescription>
            {isConnected
              ? "Check types to fetch and add them, or uncheck loaded types to remove them from the graph. Removing requires no credentials."
              : "Enter your Adobe Experience Platform credentials. They are only sent to the local proxy and never stored."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Profiles section */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setProfilesOpen((v) => !v)}
              className="flex w-full items-center gap-2 text-left"
            >
              <BookUser className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-semibold flex-1">Saved Profiles</span>
              {profiles.length > 0 && (
                <span className="text-[10px] text-muted-foreground mr-1">{profiles.length}</span>
              )}
              {profilesOpen
                ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </button>

            {profilesOpen && (
              <div className="space-y-2 pl-6">
                {profiles.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    No profiles yet. Fill in your credentials below and save them as a profile.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {profiles.map((profile) => (
                      <div key={profile.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium text-foreground truncate">{profile.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {profile.sandbox} · {profile.orgId}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px] px-2"
                            onClick={() => handleLoadProfile(profile)}
                          >
                            Load
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteProfile(profile.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Save current as profile */}
                {!savingProfile ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 text-[11px] w-full"
                    disabled={!orgId || !apiKey}
                    onClick={() => setSavingProfile(true)}
                  >
                    Save current as profile
                  </Button>
                ) : (
                  <div className="flex gap-1.5">
                    <Input
                      autoFocus
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveProfile(); } if (e.key === "Escape") setSavingProfile(false); }}
                      placeholder="Profile name (e.g. Prod, Dev)"
                      className="h-7 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0"
                      disabled={!profileName.trim()}
                      onClick={handleSaveProfile}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Credentials */}
          <div className={`space-y-3 ${isConnected && !hasAdditions ? "opacity-50" : ""}`}>
            <div className="space-y-2">
              <Label htmlFor="token" className="text-xs">
                Bearer Token
                {isConnected && !hasAdditions && (
                  <span className="ml-1 font-normal text-muted-foreground">(not needed for removal)</span>
                )}
              </Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ey…"
              />
            </div>

            {/* Client Secret + Generate Token */}
            <div className="space-y-1.5">
              <Label htmlFor="clientSecret" className="text-xs">
                Client Secret
                <span className="ml-1 font-normal text-muted-foreground">(to generate a token)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="clientSecret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => { setClientSecret(e.target.value); setTokenError(null); }}
                  placeholder="p8e-…"
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!clientSecret || !apiKey || generatingToken}
                  onClick={handleGenerateToken}
                  className="shrink-0"
                >
                  {generatingToken
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : "Generate"}
                </Button>
              </div>
              {tokenError && (
                <p className="text-[11px] text-destructive">{tokenError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgId" className="text-xs">Org ID</Label>
              <Input
                id="orgId"
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="ABC123@AdobeOrg"
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
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Data in Graph</Label>
            <p className="text-[11px] text-muted-foreground">
              {isConnected
                ? "Checked types are in the graph. Uncheck to remove; check new types to fetch and add."
                : "Select which entity types to load."}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {ENTITY_ROWS.map(({ label, loaded, checked, set, color }) => {
                const willAdd    = isConnected && !loaded && checked;
                const willRemove = isConnected && loaded && !checked;
                return (
                  <label key={label} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => set(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className={`w-2 h-2 rounded-full ${color}`} />
                    <span className={`text-xs ${willRemove ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {label}
                    </span>
                    {willAdd    && <span className="text-[10px] text-blue-500 ml-auto">+add</span>}
                    {willRemove && <span className="text-[10px] text-destructive ml-auto">−remove</span>}
                    {loaded && !willRemove && isConnected && (
                      <span className="text-[10px] text-muted-foreground ml-auto">loaded</span>
                    )}
                  </label>
                );
              })}
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
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {isConnected && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => { clearConnection(); useCanvasStore.getState().setActiveSnapshotLabel(null); setOpen(false); }}
              >
                Disconnect
              </Button>
            )}
            <Button type="submit" disabled={submitDisabled}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{buttonLabel}</>
              ) : buttonLabel}
            </Button>
          </DialogFooter>
        </form>

        <Separator />

        {/* Saved Snapshots */}
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
            {snapshotsOpen
              ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
              : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
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
                        <span className="text-muted-foreground font-normal ml-1">— {first.orgId}</span>
                      </p>
                      <div className="space-y-1.5 pl-6">
                        {group.map((snap) => (
                          <div key={snap.filename} className="flex items-start justify-between gap-2 rounded-md border px-2 py-1.5">
                            <div className="min-w-0 flex-1">
                              {snap.label ? (
                                <>
                                  <p className="text-[12px] font-medium text-foreground truncate">{snap.label}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatDate(snap.capturedAt)} · {snap.counts.nodes} nodes
                                  </p>
                                </>
                              ) : (
                                <p className="text-[11px] text-foreground">
                                  {formatDate(snap.capturedAt)}
                                  <span className="text-muted-foreground ml-1">· {snap.counts.nodes} nodes</span>
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
                              {loadingSnapshot === snap.filename
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : "Load"}
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
