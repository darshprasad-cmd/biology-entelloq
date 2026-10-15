"use client";

import { Check, HeartPulse } from "lucide-react";
import { getPractical } from "@/lib/engine/registry";
import { useLab } from "@/lib/engine/store";
import { cn } from "@/lib/utils";

export function StructureAtlas2D() {
  const practicalId = useLab((state) => state.practicalId);
  const selectedId = useLab((state) => state.selectedId);
  const identified = useLab((state) => state.identified);
  const select = useLab((state) => state.select);
  const practical = getPractical(practicalId);

  return (
    <div
      className="grid min-h-0 gap-4 p-4 sm:h-full sm:grid-cols-[minmax(220px,0.9fr)_minmax(260px,1.1fr)] sm:overflow-y-auto sm:p-6"
      role="region"
      aria-label={`${practical.title} two-dimensional accessible atlas`}
    >
      <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#08110f] p-6">
        <div className="absolute inset-0 opacity-50 [background:radial-gradient(circle_at_50%_42%,rgba(67,130,104,.28),transparent_42%),linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:auto,28px_28px,28px_28px]" />
        {practicalId === "heart" ? (
          <div className="heart-atlas" aria-hidden="true">
            <span className="heart-atlas__aorta" />
            <span className="heart-atlas__artery" />
            <span className="heart-atlas__body" />
            <span className="heart-atlas__septum" />
            <span className="heart-atlas__flow heart-atlas__flow--one">1</span>
            <span className="heart-atlas__flow heart-atlas__flow--two">2</span>
            <span className="heart-atlas__flow heart-atlas__flow--three">3</span>
          </div>
        ) : (
          <div className="relative flex h-44 w-44 items-center justify-center rounded-[42%] border border-bio-300/20 bg-bio-500/10 text-7xl shadow-[0_0_90px_rgba(47,139,102,.18)]">
            {practical.emoji}
          </div>
        )}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-[11px] text-white/65 backdrop-blur-md">
          <span className="flex items-center gap-1.5"><HeartPulse size={13} /> Accessible atlas</span>
          <span>{identified.length}/{practical.structures.length} examined</span>
        </div>
      </div>

      <div className="min-h-0">
        <div className="mb-3">
          <p className="eyebrow">Structure index</p>
          <h2 className="mt-1 text-lg font-semibold">Examine without spatial controls</h2>
          <p className="mt-1 text-xs leading-relaxed text-foreground/60">
            Each control exposes the same reviewed content as the 3D model. No colour-only or pointer-only task is required.
          </p>
        </div>
        <div className="grid gap-2 sm:max-h-[calc(100%-5.5rem)] sm:overflow-y-auto sm:pr-1">
          {practical.structures.map((structure, index) => {
            const active = selectedId === structure.id;
            const seen = identified.includes(structure.id);
            return (
              <button
                key={structure.id}
                type="button"
                data-testid={`atlas-${structure.id}`}
                onClick={() => select(structure.id)}
                aria-pressed={active}
                className={cn(
                  "group flex min-h-12 items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-[background-color,border-color,transform] duration-150 active:scale-[0.985]",
                  active
                    ? "border-bio-300/55 bg-bio-500/12"
                    : "border-white/8 bg-white/[0.035] hover:border-white/16 hover:bg-white/[0.06]",
                )}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold"
                  style={{ borderColor: structure.accent ?? "#69d1a5", color: structure.accent ?? "#69d1a5" }}
                >
                  {seen ? <Check size={13} /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{structure.name}</span>
                  <span className="block truncate text-[11px] text-foreground/50">
                    {structure.system ?? structure.group ?? practical.discipline}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
