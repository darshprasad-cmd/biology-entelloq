"use client";

import { useState } from "react";
import {
  Tags,
  Droplets,
  Layers,
  Boxes,
  Focus,
  RotateCcw,
  Undo2,
  History,
  RefreshCw,
} from "lucide-react";
import { useLab } from "@/lib/engine/store";
import { getPractical } from "@/lib/engine/registry";
import { cn } from "@/lib/utils";

type SliderId = "transparency" | "crossSection" | "exploded" | null;

export function ViewportControls() {
  const [openSlider, setOpenSlider] = useState<SliderId>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const labelsVisible = useLab((state) => state.labelsVisible);
  const toggleLabels = useLab((state) => state.toggleLabels);
  const transparency = useLab((state) => state.transparency);
  const setTransparency = useLab((state) => state.setTransparency);
  const crossSection = useLab((state) => state.crossSection);
  const setCrossSection = useLab((state) => state.setCrossSection);
  const exploded = useLab((state) => state.exploded);
  const setExploded = useLab((state) => state.setExploded);
  const isolatedGroup = useLab((state) => state.isolatedGroup);
  const isolate = useLab((state) => state.isolate);
  const resetView = useLab((state) => state.resetView);
  const undo = useLab((state) => state.undo);
  const history = useLab((state) => state.history);
  const timeline = useLab((state) => state.timeline);
  const hiddenIds = useLab((state) => state.hiddenIds);
  const fadedIds = useLab((state) => state.fadedIds);
  const restoreStructures = useLab((state) => state.restoreStructures);
  const practicalId = useLab((state) => state.practicalId);

  const groups = Array.from(
    new Set(getPractical(practicalId).structures.map((structure) => structure.group).filter(Boolean)),
  ) as string[];

  const cycleIsolate = () => {
    if (!groups.length) return;
    const index = isolatedGroup ? groups.indexOf(isolatedGroup) : -1;
    isolate(index + 1 >= groups.length ? null : groups[index + 1]);
  };

  const sliders = [
    { id: "transparency" as const, icon: Droplets, label: "Transparency", value: transparency, set: setTransparency },
    { id: "crossSection" as const, icon: Layers, label: "Section plane", value: crossSection, set: setCrossSection },
    { id: "exploded" as const, icon: Boxes, label: "Layer separation", value: exploded, set: setExploded },
  ];

  return (
    <div className="pointer-events-auto relative z-30 mx-auto mt-2 w-fit max-w-[calc(100%-1rem)] lg:absolute lg:bottom-5 lg:left-1/2 lg:mt-0 lg:-translate-x-1/2">
      <div className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-full glass-strong p-1.5">
        <IconToggle active={labelsVisible} onClick={toggleLabels} label="Labels">
          <Tags size={17} />
        </IconToggle>

        {sliders.map((slider) => (
          <div key={slider.id} className="relative">
            <IconToggle
              active={slider.value > 0.001}
              onClick={() => setOpenSlider((open) => open === slider.id ? null : slider.id)}
              label={slider.label}
            >
              <slider.icon size={17} />
            </IconToggle>
            {openSlider === slider.id && (
              <div className="absolute bottom-full left-1/2 mb-3 w-52 -translate-x-1/2 rounded-2xl glass-strong p-3 shadow-2xl">
                <label className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-medium">{slider.label}</span>
                  <span className="text-muted">{Math.round(slider.value * 100)}%</span>
                </label>
                <input
                  aria-label={slider.label}
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={slider.value}
                  onChange={(event) => slider.set(Number(event.target.value))}
                  className="h-1.5 w-full cursor-pointer accent-[#69d1a5]"
                />
              </div>
            )}
          </div>
        ))}

        <IconToggle active={Boolean(isolatedGroup)} onClick={cycleIsolate} label="Cycle isolated system">
          <Focus size={17} />
        </IconToggle>

        {(hiddenIds.length > 0 || fadedIds.length > 0 || isolatedGroup) && (
          <IconToggle active={false} onClick={restoreStructures} label="Restore structures">
            <RefreshCw size={16} />
          </IconToggle>
        )}

        <div className="mx-0.5 h-6 w-px shrink-0 bg-white/10" />

        <IconToggle active={false} onClick={undo} label="Undo" disabled={history.length === 0}>
          <Undo2 size={16} />
        </IconToggle>

        <div className="relative">
          <IconToggle active={historyOpen} onClick={() => setHistoryOpen((value) => !value)} label="Investigation history">
            <History size={16} />
          </IconToggle>
          {historyOpen && (
            <div className="absolute bottom-full right-0 mb-3 w-64 rounded-2xl glass-strong p-3 shadow-2xl">
              <div className="mb-2 text-xs font-semibold">Investigation history</div>
              {timeline.length ? (
                <ol className="space-y-1.5">
                  {timeline.slice().reverse().map((entry, index) => (
                    <li key={entry.id} className="flex items-start gap-2 text-[11px] text-foreground/65">
                      <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", index === 0 ? "bg-bio-300" : "bg-white/20")} />
                      {entry.label}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[11px] text-muted">Reversible actions will appear here.</p>
              )}
            </div>
          )}
        </div>

        <IconToggle
          active={false}
          onClick={() => {
            resetView();
            setOpenSlider(null);
          }}
          label="Reset investigation"
        >
          <RotateCcw size={16} />
        </IconToggle>
      </div>

      {isolatedGroup && (
        <div className="mx-auto mt-2 w-fit rounded-full bg-black/45 px-2.5 py-1 text-center text-[11px] text-bio-300 backdrop-blur-md">
          Isolated: <span className="capitalize">{isolatedGroup}</span>
        </div>
      )}
    </div>
  );
}

function IconToggle({
  active,
  onClick,
  label,
  children,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={cn(
        "group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-30",
        active ? "bg-bio-500 text-ink-950" : "text-foreground/75 hover:bg-white/8 hover:text-foreground",
      )}
    >
      {children}
      <span className="pointer-events-none absolute bottom-full mb-2 hidden whitespace-nowrap rounded-md glass-strong px-2 py-1 text-[11px] group-hover:block">
        {label}
      </span>
    </button>
  );
}
