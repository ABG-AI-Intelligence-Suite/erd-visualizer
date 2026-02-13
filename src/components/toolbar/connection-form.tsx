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
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-xs text-gray-600">Connected</span>
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-blue-600 hover:underline"
        >
          Edit
        </button>
        <button
          onClick={onDisconnect}
          className="text-xs text-red-500 hover:underline"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 flex-wrap">
      <div className="flex flex-col">
        <label className="text-[10px] text-gray-500 uppercase font-medium mb-0.5">
          Bearer Token
        </label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ey..."
          className="border border-gray-300 rounded px-2 py-1 text-xs w-40 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        />
      </div>
      <div className="flex flex-col">
        <label className="text-[10px] text-gray-500 uppercase font-medium mb-0.5">
          Org ID
        </label>
        <input
          type="text"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          placeholder="ABC123@AdobeOrg"
          className="border border-gray-300 rounded px-2 py-1 text-xs w-40 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        />
      </div>
      <div className="flex flex-col">
        <label className="text-[10px] text-gray-500 uppercase font-medium mb-0.5">
          Sandbox
        </label>
        <input
          type="text"
          value={sandbox}
          onChange={(e) => setSandbox(e.target.value)}
          placeholder="prod"
          className="border border-gray-300 rounded px-2 py-1 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-[10px] text-gray-500 uppercase font-medium mb-0.5">
          API Key
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="your-api-key"
          className="border border-gray-300 rounded px-2 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || !token || !orgId || !apiKey}
        className="bg-blue-600 text-white text-xs px-4 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? "Connecting..." : "Connect"}
      </button>
      {isConnected && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-gray-500 hover:underline"
        >
          Cancel
        </button>
      )}
    </form>
  );
}
