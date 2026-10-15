"use client";

import dynamic from "next/dynamic";
import { Box, Compass, PanelsTopLeft } from "lucide-react";
import { HandLayer } from "./HandLayer";
import { SceneErrorBoundary } from "./SceneErrorBoundary";
import { StructureAtlas2D } from "./StructureAtlas2D";
import { useLab } from "@/lib/engine/store";
import { cn } from "@/lib/utils";

const Scene = dynamic(() => import("@/components/engine/Scene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-bio-400" />
        <span className="text-xs text-muted">Preparing laboratory…</span>
      </div>
    </div>
  ),
});

export function Viewport() {
  const viewerMode = useLab((state) => state.viewerMode);
  const setViewerMode = useLab((state) => state.setViewerMode);
  const cameraPreset = useLab((state) => state.cameraPreset);
  const setCameraPreset = useLab((state) => state.setCameraPreset);
  const onboarding = useLab((state) => state.onboarding);
  const progressRestored = useLab((state) => state.progressRestored);
  const threeDimensionalReady =
    viewerMode === "3d" && progressRestored && onboarding !== "ask";

  return (
    <div className="relative min-h-[58dvh] w-full overflow-hidden rounded-[1.75rem] glass lg:h-full lg:min-h-0" data-testid="lab-viewport">
      <div className="absolute left-3 top-3 z-40 flex items-center gap-1 rounded-full border border-white/10 bg-black/45 p-1 backdrop-blur-xl">
        <ViewerButton active={viewerMode === "3d"} onClick={() => setViewerMode("3d")} label="Interactive 3D">
          <Box size={13} /> 3D
        </ViewerButton>
        <ViewerButton active={viewerMode === "2d"} onClick={() => setViewerMode("2d")} label="Accessible 2D atlas">
          <PanelsTopLeft size={13} /> 2D
        </ViewerButton>
      </div>
      {viewerMode === "3d" && (
        <div className="absolute right-3 top-3 z-40 flex items-center gap-1 rounded-full border border-white/10 bg-black/45 p-1 backdrop-blur-xl" aria-label="Camera presets">
          <span className="flex h-7 w-7 items-center justify-center text-bio-300" aria-hidden="true"><Compass size={14} /></span>
          {(["anterior", "posterior", "left"] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setCameraPreset(preset)}
              aria-pressed={cameraPreset === preset}
              className={cn(
                "h-7 rounded-full px-2 text-[10px] font-semibold capitalize transition-colors",
                cameraPreset === preset ? "bg-white/12 text-white" : "text-white/50 hover:text-white",
              )}
            >
              {preset === "anterior" ? "Front" : preset === "posterior" ? "Back" : "Left"}
            </button>
          ))}
        </div>
      )}

      {viewerMode === "3d" && threeDimensionalReady ? (
        <SceneErrorBoundary
          onError={() => setViewerMode("2d")}
          fallback={<StructureAtlas2D />}
        >
          <Scene />
          <HandLayer />
        </SceneErrorBoundary>
      ) : viewerMode === "2d" ? (
        <StructureAtlas2D />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <div className="heart-atlas opacity-60">
            <span className="heart-atlas__aorta" />
            <span className="heart-atlas__artery" />
            <span className="heart-atlas__body" />
            <span className="heart-atlas__septum" />
          </div>
        </div>
      )}
      {/* Cinematic vignette */}
      {viewerMode === "3d" && threeDimensionalReady && (
        <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] [box-shadow:inset_0_0_180px_50px_rgba(0,0,0,0.45)]" />
      )}
    </div>
  );
}

function ViewerButton({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold transition-colors",
        active ? "bg-bio-400 text-ink-950" : "text-white/60 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
