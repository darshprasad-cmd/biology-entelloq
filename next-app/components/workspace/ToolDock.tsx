"use client";

import { ScanSearch, Scissors, Focus, Microscope, Ruler } from "lucide-react";
import { useLab } from "@/lib/engine/store";
import type { ToolId } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

const TOOLS: {
  id: ToolId;
  icon: typeof ScanSearch;
  label: string;
  hint: string;
}[] = [
  { id: "hand", icon: ScanSearch, label: "Inspect", hint: "Rotate, zoom and identify" },
  { id: "scalpel", icon: Scissors, label: "Dissect", hint: "Open tissue step by step" },
  { id: "forceps", icon: Focus, label: "Isolate", hint: "Select a structure to isolate its system" },
  { id: "microscope", icon: Microscope, label: "Loupe", hint: "Focus on fine anatomy" },
  { id: "measure", icon: Ruler, label: "Measure", hint: "Compare anatomical proportions" },
];

export function ToolDock() {
  const tool = useLab((s) => s.tool);
  const setTool = useLab((s) => s.setTool);

  return (
    <div className="flex items-center justify-center py-1 lg:h-full lg:flex-col lg:gap-3 lg:py-4">
      <div className="flex items-center gap-1 rounded-full glass-strong p-1.5 lg:flex-col lg:gap-2 lg:p-2">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={cn(
                "group relative flex h-11 min-w-11 items-center justify-center rounded-full transition-[background-color,color,transform,box-shadow] duration-150 active:scale-[0.96]",
                active
                  ? "bg-bio-500 text-ink-950 shadow-[0_6px_24px_-6px_rgba(16,185,129,0.8)]"
                  : "text-foreground/70 hover:bg-white/8 hover:text-foreground",
              )}
              aria-label={t.label}
              aria-pressed={active}
            >
              <Icon size={19} strokeWidth={2} />
              {/* Tooltip */}
              <span className="pointer-events-none absolute bottom-full z-50 mb-3 hidden whitespace-nowrap rounded-lg glass-strong px-2.5 py-1.5 text-xs text-foreground/90 group-hover:block lg:bottom-auto lg:left-full lg:mb-0 lg:ml-3">
                <span className="font-medium">{t.label}</span>
                <span className="ml-1.5 text-muted">{t.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
