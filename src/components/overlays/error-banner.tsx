"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/store/canvas-store";

const URL_REGEX = /(https?:\/\/[^\s]+|\/api\/[^\s]+)/g;

function getErrorTitle(message: string): string {
  if (message.includes("401")) return "Authentication Error";
  if (message.includes("403")) return "Permission Error";
  return "Connection Error";
}

function renderErrorWithLinks(text: string) {
  const parts = text.split(URL_REGEX);
  return parts.map((part, idx) => {
    if (/^(https?:\/\/[^\s]+|\/api\/[^\s]+)$/.test(part)) {
      return (
        <a
          key={`${part}-${idx}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-red-300 hover:decoration-red-600 text-red-800"
        >
          {part}
        </a>
      );
    }
    return <span key={`${part}-${idx}`}>{part}</span>;
  });
}

export function ErrorBanner({ fetchError }: { fetchError: string | null }) {
  const storeError = useCanvasStore((s) => s.error);
  const setError = useCanvasStore((s) => s.setError);
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  const displayError = storeError || fetchError;
  useEffect(() => {
    if (!displayError) {
      setDismissedError(null);
    }
  }, [displayError]);
  if (!displayError || dismissedError === displayError) return null;
  const title = getErrorTitle(displayError);
  const details = displayError
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const isAuthError = displayError.includes("401");

  return (
    <div className="absolute left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4" style={{ top: 60 }}>
      <div className="bg-card border border-red-200 rounded-xl p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-sm font-bold">
              !
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-red-800">{title}</h3>
              <p className="text-xs text-red-600 mt-0.5">
                The request could not complete. Review details below.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-red-400 hover:text-red-600"
            onClick={() => {
              setDismissedError(displayError);
              setError(null);
            }}
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 space-y-2 max-h-44 overflow-auto rounded-md border border-red-100 bg-red-50/60 p-2">
          {details.map((line, idx) => (
            <p key={`${line}-${idx}`} className="text-xs text-red-800 break-words font-mono">
              {renderErrorWithLinks(line)}
            </p>
          ))}
        </div>

        {isAuthError && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2.5">
            <p className="text-xs font-medium text-amber-800">Quick auth checks</p>
            <ul className="text-xs text-amber-800 mt-1 space-y-0.5 list-disc pl-4">
              <li>Use a fresh bearer token (tokens expire quickly).</li>
              <li>Confirm token org matches the entered org ID.</li>
              <li>Verify API key and sandbox name are correct.</li>
            </ul>
          </div>
        )}

        <div className="mt-3 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => {
              void navigator.clipboard.writeText(displayError);
            }}
          >
            Copy details
          </Button>
          <p className="text-xs text-muted-foreground">
            Check browser console and terminal for full request traces.
          </p>
        </div>
      </div>
    </div>
  );
}
