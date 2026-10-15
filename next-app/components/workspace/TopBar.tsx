"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Hand, MousePointer2, Check, Dna } from "lucide-react";
import { useLab } from "@/lib/engine/store";
import { PRACTICALS } from "@/lib/engine/registry";
import type { LearningMode } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

const MODES: { id: LearningMode; label: string }[] = [
  { id: "explore", label: "Explore" },
  { id: "guided", label: "Guided" },
  { id: "practice", label: "Practice" },
  { id: "assessment", label: "Assessment" },
];

const STATUS_META: Record<string, { label: string; dot: string }> = {
  idle: { label: "Hands off", dot: "bg-white/30" },
  "loading-model": { label: "Loading model…", dot: "bg-amber-accent animate-pulse" },
  "starting-camera": { label: "Starting camera…", dot: "bg-amber-accent animate-pulse" },
  tracking: { label: "Tracking", dot: "bg-bio-400" },
  "no-hands": { label: "Show your hands", dot: "bg-cyan-accent" },
  error: { label: "Camera unavailable", dot: "bg-rose-accent" },
};

export function TopBar() {
  const practicalId = useLab((s) => s.practicalId);
  const setPractical = useLab((s) => s.setPractical);
  const mode = useLab((s) => s.mode);
  const setMode = useLab((s) => s.setMode);
  const inputMode = useLab((s) => s.inputMode);
  const setInputMode = useLab((s) => s.setInputMode);
  const status = useLab((s) => s.trackingStatus);
  const gesture = useLab((s) => s.primaryGesture);
  const [open, setOpen] = useState(false);

  const current = PRACTICALS.find((p) => p.id === practicalId) ?? PRACTICALS[0];
  const st = STATUS_META[status] ?? STATUS_META.idle;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 sm:px-2 lg:flex-nowrap lg:gap-4">
      {/* Practical switcher */}
      <div className="relative flex items-center gap-2">
        <Link
          href="/"
          aria-label="Biology Entelloq home"
          className="hidden h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-bio-300 transition-colors hover:bg-white/[0.08] sm:flex"
        >
          <Dna size={17} />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex min-h-11 items-center gap-2 rounded-full glass-strong px-3 py-1.5 text-sm transition-colors hover:border-white/20"
        >
          <span className="text-lg leading-none">{current.emoji}</span>
          <span className="max-w-32 truncate font-medium sm:max-w-none">{current.title}</span>
          <ChevronDown size={15} className="text-muted" />
        </button>
        {open && (
          <div role="menu" className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl glass-strong p-1.5 shadow-2xl">
            {PRACTICALS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="menuitemradio"
                aria-checked={p.id === practicalId}
                onClick={() => {
                  setPractical(p.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-colors",
                  p.id === practicalId ? "bg-white/8" : "hover:bg-white/5",
                )}
              >
                <span className="text-lg">{p.emoji}</span>
                <span className="flex-1">
                  <span className="block font-medium">{p.title}</span>
                  <span className="block text-[11px] text-muted">
                    {p.discipline}
                  </span>
                </span>
                {p.id === practicalId && (
                  <Check size={15} className="text-bio-400" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mode switcher */}
      <div className="order-3 flex w-full items-center gap-1 overflow-x-auto rounded-full glass p-1 sm:order-none sm:w-auto" aria-label="Learning mode">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            aria-pressed={mode === m.id}
            className={cn(
              "min-h-9 flex-1 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors sm:flex-none",
              mode === m.id
                ? "bg-bio-500 text-ink-950"
                : "text-foreground/70 hover:text-foreground",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Input mode + tracking */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full glass p-1" aria-label="Input method">
          <button
            type="button"
            aria-label="Use mouse controls"
            aria-pressed={inputMode === "mouse"}
            onClick={() => setInputMode("mouse")}
            className={cn(
              "flex min-h-9 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs transition-colors",
              inputMode === "mouse"
                ? "bg-white/12 text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            <MousePointer2 size={14} /> Mouse
          </button>
          <button
            type="button"
            aria-label="Use hand controls"
            aria-pressed={inputMode === "hand"}
            onClick={() => setInputMode("hand")}
            className={cn(
              "flex min-h-9 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs transition-colors",
              inputMode === "hand"
                ? "bg-bio-500 text-ink-950"
                : "text-muted hover:text-foreground",
            )}
          >
            <Hand size={14} /> <span className="hidden sm:inline">Hands</span>
          </button>
        </div>
        {inputMode === "hand" && (
          <div className="flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs">
            <span className={cn("h-2 w-2 rounded-full", st.dot)} />
            <span className="text-foreground/80">{st.label}</span>
            {status === "tracking" && (
              <span className="text-bio-300 capitalize">· {gesture}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
