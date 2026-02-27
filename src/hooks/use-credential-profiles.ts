"use client";

import { useState, useCallback } from "react";
import type { CredentialProfile } from "@/lib/types";

const STORAGE_KEY = "aep-erd-profiles";

function readFromStorage(): CredentialProfile[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeToStorage(profiles: CredentialProfile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function useCredentialProfiles() {
  const [profiles, setProfiles] = useState<CredentialProfile[]>(() => readFromStorage());

  const addProfile = useCallback((name: string, orgId: string, apiKey: string, sandbox: string) => {
    const newProfile: CredentialProfile = {
      id: crypto.randomUUID(),
      name,
      orgId,
      apiKey,
      sandbox,
      createdAt: new Date().toISOString(),
    };
    setProfiles((prev) => {
      const updated = [...prev, newProfile];
      writeToStorage(updated);
      return updated;
    });
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setProfiles((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      writeToStorage(updated);
      return updated;
    });
  }, []);

  return { profiles, addProfile, deleteProfile };
}
