"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useCanvasStore } from "@/store/canvas-store";

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["\u2318", "K"], description: "Open command palette" },
      { keys: ["Esc"], description: "Deselect / Exit focus mode" },
      { keys: ["+"], description: "Zoom in" },
      { keys: ["-"], description: "Zoom out" },
      { keys: ["0"], description: "Fit view" },
    ],
  },
  {
    title: "Actions",
    shortcuts: [
      { keys: ["\u2318", "E"], description: "Export as image" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ],
  },
  {
    title: "Canvas",
    shortcuts: [
      { keys: ["Click"], description: "Select node" },
      { keys: ["Double-click"], description: "Focus on node (Schema view)" },
      { keys: ["Drag"], description: "Move node" },
      { keys: ["Scroll"], description: "Zoom in/out" },
      { keys: ["Pan"], description: "Drag canvas background" },
    ],
  },
];

function ShortcutKey({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function ShortcutsDialog() {
  const open = useCanvasStore((s) => s.shortcutsDialogOpen);
  const setOpen = useCanvasStore((s) => s.setShortcutsDialogOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {SHORTCUT_GROUPS.map((group, gi) => (
            <div key={group.title}>
              {gi > 0 && <Separator className="mb-4" />}
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-foreground">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, ki) => (
                        <ShortcutKey key={ki}>{key}</ShortcutKey>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
