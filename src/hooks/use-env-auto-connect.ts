"use client";

import { useEffect, useState } from "react";
import type { AepConnectionConfig } from "@/lib/types";

function isValidConfig(cfg: AepConnectionConfig): boolean {
  return Boolean(
    cfg.token?.trim() &&
      cfg.orgId?.trim() &&
      cfg.apiKey?.trim()
  );
}

export function useEnvAutoConnect() {
  const [envConfig, setEnvConfig] = useState<AepConnectionConfig | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg: AepConnectionConfig) => {
        if (cancelled) return;
        const normalized: AepConnectionConfig = {
          token: cfg.token ?? "",
          orgId: cfg.orgId ?? "",
          sandbox: cfg.sandbox?.trim() || "prod",
          apiKey: cfg.apiKey ?? "",
        };
        setEnvConfig(isValidConfig(normalized) ? normalized : null);
      })
      .catch(() => {
        if (!cancelled) setEnvConfig(null);
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });
    return () => { cancelled = true; };
  }, []);

  return { envConfig, isReady, hasCredentials: envConfig !== null };
}
