"use client";

import { useState } from "react";
import type { AepConnectionConfig } from "@/lib/types";

interface ConnectionFormProps {
  onConnect: (config: AepConnectionConfig) => void;
  isConnected: boolean;
  isLoading: boolean;
  onDisconnect: () => void;
}

export function ConnectionForm({
  onConnect,
  isConnected,
  isLoading,
  onDisconnect,
}: ConnectionFormProps) {
  const [token, setToken] = useState("");
  const [orgId, setOrgId] = useState("");
  const [sandbox, setSandbox] = useState("prod");
  const [apiKey, setApiKey] = useState("");
  const [expanded, setExpanded] = useState(!isConnected);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !orgId || !apiKey) return;
    onConnect({ token, orgId, sandbox, apiKey });
    setExpanded(false);
  };

  if (isConnected && !expanded) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="text-[11px] font-medium text-emerald-700">Connected</span>
        <button
          onClick={() => setExpanded(true)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          Edit
        </button>
        <button
          onClick={onDisconnect}
          className="rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-medium text-rose-600 transition-colors hover:bg-rose-50"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2"
    >
      <div className="flex min-w-[160px] flex-col gap-1">
        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
          Bearer Token
        </label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ey..."
          className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
          required
        />
      </div>
      <div className="flex min-w-[160px] flex-col gap-1">
        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
          Org ID
        </label>
        <input
          type="text"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          placeholder="ABC123@AdobeOrg"
          className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
          required
        />
      </div>
      <div className="flex min-w-[110px] flex-col gap-1">
        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
          Sandbox
        </label>
        <input
          type="text"
          value={sandbox}
          onChange={(e) => setSandbox(e.target.value)}
          placeholder="prod"
          className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
        />
      </div>
      <div className="flex min-w-[130px] flex-col gap-1">
        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
          API Key
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="your-api-key"
          className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
          required
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || !token || !orgId || !apiKey}
        className="inline-flex h-8 items-center justify-center rounded-md bg-blue-600 px-3 text-[11px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {isLoading ? "Connecting..." : "Connect"}
      </button>
      {isConnected && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          Cancel
        </button>
      )}
    </form>
  );
}
