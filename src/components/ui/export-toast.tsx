"use client";

import { useEffect, useRef, useState } from "react";
import { ListPlus } from "lucide-react";
import { useCanvasStore } from "@/store/canvas-store";

export function ExportToast() {
  const miroToast    = useCanvasStore((s) => s.miroToast);
  const setMiroToast = useCanvasStore((s) => s.setMiroToast);

  const [visible, setVisible]         = useState(false);
  const [displayMsg, setDisplayMsg]   = useState("");
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!miroToast) return;

    setDisplayMsg(miroToast);
    setVisible(true);

    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setMiroToast(null), 300);
    }, 2000);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [miroToast]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="bg-foreground text-background text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 whitespace-nowrap">
        <ListPlus className="h-3.5 w-3.5 shrink-0" />
        {displayMsg}
      </div>
    </div>
  );
}
