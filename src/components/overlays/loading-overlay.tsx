"use client";

import { useEffect, useRef, useState } from "react";
import type { ProgressStep } from "@/lib/types";

function StepIcon({ status }: { status: ProgressStep["status"] }) {
  if (status === "done") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
      <span className="h-2 w-2 rounded-full bg-slate-200" />
    </span>
  );
}

export function LoadingOverlay({ loading, progress }: { loading: boolean; progress: ProgressStep[] }) {
  const [visible, setVisible] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const prevLoading = useRef(false);

  useEffect(() => {
    if (loading && !prevLoading.current) {
      setVisible(true);
      setShowSuccess(false);
    } else if (!loading && prevLoading.current && visible) {
      setShowSuccess(true);
      const t = setTimeout(() => {
        setVisible(false);
        setShowSuccess(false);
      }, 2000);
      return () => clearTimeout(t);
    }
    prevLoading.current = loading;
  }, [loading, visible]);

  if (!visible) return null;

  const doneCount = progress.filter((s) => s.status === "done").length;
  const pct = Math.round((doneCount / progress.length) * 100);

  if (showSuccess) {
    const totalNodes = progress.find((s) => s.id === "transform")?.count;
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center gap-3 animate-[fadeIn_0.3s_ease]">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50 animate-[scaleIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)]">
            <svg className="h-8 w-8 text-emerald-500" viewBox="0 0 24 24" fill="none">
              <path d="M4 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="text-lg font-semibold text-foreground">Graph ready</p>
          {totalNodes != null && (
            <p className="text-sm text-muted-foreground">{totalNodes.toLocaleString()} nodes loaded</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm z-50">
      <div className="w-full max-w-sm rounded-2xl border bg-card shadow-2xl shadow-slate-200/60 p-6 mx-4">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white text-base font-bold shadow-sm">
            &#x2B21;
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Loading your AEP org</p>
            <p className="text-xs text-muted-foreground">Fetching & assembling graph data&hellip;</p>
          </div>
        </div>

        <ul className="space-y-2.5 mb-5">
          {progress.map((step) => (
            <li key={step.id} className="flex items-center gap-2.5">
              <StepIcon status={step.status} />
              <span
                className={`flex-1 text-sm ${
                  step.status === "active"
                    ? "font-medium text-foreground"
                    : step.status === "done"
                      ? "text-muted-foreground"
                      : "text-muted-foreground/50"
                }`}
              >
                {step.label}
              </span>
              {step.status === "active" && step.count != null && step.total != null && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-indigo-500">
                  {step.count.toLocaleString()} / {step.total.toLocaleString()}
                  {step.unit ? ` ${step.unit}` : ""}
                </span>
              )}
              {step.status === "done" && step.count != null && step.count > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {step.count.toLocaleString()}
                  {step.unit ? ` ${step.unit}` : ""}
                </span>
              )}
              {step.status === "done" && step.count === 0 && (
                <span className="text-[10px] text-muted-foreground/50">&mdash;</span>
              )}
            </li>
          ))}
        </ul>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{doneCount} of {progress.length} steps</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
