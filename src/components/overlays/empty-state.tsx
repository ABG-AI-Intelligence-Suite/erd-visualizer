"use client";

import { useCanvasStore } from "@/store/canvas-store";
import { Button } from "@/components/ui/button";

export function EmptyState({ onLoadSample }: { onLoadSample: () => void }) {
  const connection = useCanvasStore((s) => s.connection);
  const hasNodes = useCanvasStore((s) => s.rawNodes.length > 0);

  if (connection || hasNodes) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
          <svg className="h-8 w-8 text-primary/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-muted-foreground">
          Enter your AEP credentials to get started
        </p>
        <p className="text-sm text-muted-foreground/60 mt-1">
          Your credentials are only sent to the Next.js proxy and never stored
        </p>
        <Button
          variant="outline"
          onClick={onLoadSample}
          className="mt-4 pointer-events-auto"
        >
          Load Sample Data
        </Button>
        <p className="text-xs text-muted-foreground/50 mt-2">
          Preview the visualizer with a sample retail/CRM dataset
        </p>
      </div>
    </div>
  );
}
