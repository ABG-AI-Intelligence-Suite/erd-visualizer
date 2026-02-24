"use client";

import { useState, useEffect } from "react";
import { Plug, Loader2 } from "lucide-react";
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
import type { AepConnectionConfig, FetchOptions } from "@/lib/types";

interface ConnectionDialogProps {
  onConnect: (config: AepConnectionConfig, fetchOpts?: FetchOptions) => void;
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

  // Fetch options — what entity types to load
  const [fetchDatasets, setFetchDatasets] = useState(true);
  const [fetchSchemas, setFetchSchemas] = useState(true);
  const [fetchFieldGroups, setFetchFieldGroups] = useState(true);
  const [fetchFlows, setFetchFlows] = useState(false);

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
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !orgId || !apiKey) return;
    const fetchOpts: FetchOptions = {
      datasets: fetchDatasets,
      schemas: fetchSchemas,
      fieldGroups: fetchFieldGroups,
      flows: fetchFlows,
    };
    onConnect({ token, orgId, sandbox, apiKey }, fetchOpts);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
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
                { label: "Datasets", checked: fetchDatasets, set: setFetchDatasets, color: "bg-dataset" },
                { label: "Schemas", checked: fetchSchemas, set: setFetchSchemas, color: "bg-schema" },
                { label: "Field Groups", checked: fetchFieldGroups, set: setFetchFieldGroups, color: "bg-fieldgroup" },
                { label: "Flows", checked: fetchFlows, set: setFetchFlows, color: "bg-flow" },
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
      </DialogContent>
    </Dialog>
  );
}
