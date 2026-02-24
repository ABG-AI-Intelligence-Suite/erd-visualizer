"use client";

import { useCallback } from "react";
import { toPng, toSvg } from "html-to-image";

function getViewportElement(): HTMLElement | null {
  return document.querySelector(".react-flow__viewport") as HTMLElement | null;
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  URL.revokeObjectURL(url);
}

export type ExportFormat = "png" | "svg";

export function useExport() {
  const exportImage = useCallback(
    async (format: ExportFormat, scale: number = 2, includeBackground: boolean = true) => {
      const viewport = getViewportElement();
      if (!viewport) throw new Error("Canvas viewport not found");

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
      const filename = `aep-erd-${timestamp}.${format}`;

      const options = {
        backgroundColor: includeBackground ? "#ffffff" : undefined,
        pixelRatio: scale,
        filter: (node: HTMLElement) => {
          // Exclude minimap and controls from export
          const className = node.className;
          if (typeof className === "string") {
            if (className.includes("react-flow__minimap")) return false;
            if (className.includes("react-flow__controls")) return false;
          }
          return true;
        },
      };

      if (format === "svg") {
        const dataUrl = await toSvg(viewport, options);
        const svgContent = decodeURIComponent(dataUrl.split(",")[1]);
        const blob = new Blob([svgContent], { type: "image/svg+xml" });
        downloadBlob(blob, filename);
      } else {
        const dataUrl = await toPng(viewport, options);
        downloadDataUrl(dataUrl, filename);
      }
    },
    []
  );

  return { exportImage };
}
