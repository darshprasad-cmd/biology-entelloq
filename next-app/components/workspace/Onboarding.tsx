"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand, MousePointer2, PanelsTopLeft, Sparkles, Check } from "lucide-react";
import { useLab } from "@/lib/engine/store";

export function Onboarding() {
  const phase = useLab((s) => s.onboarding);
  const setOnboarding = useLab((s) => s.setOnboarding);
  const setInputMode = useLab((s) => s.setInputMode);
  const setPractical = useLab((s) => s.setPractical);
  const setMode = useLab((s) => s.setMode);
  const setViewerMode = useLab((s) => s.setViewerMode);
  const status = useLab((s) => s.trackingStatus);
  const grabbed = useLab((s) => s.grabbed);
  const pushMessage = useLab((s) => s.pushMessage);
  const awardXp = useLab((s) => s.awardXp);

  // Calibrating → once the camera + model are live, invite the pinch.
  useEffect(() => {
    if (phase !== "calibrating") return;
    if (status === "error") {
      pushMessage({
        kind: "warn",
        text: "No camera available — I've switched you to mouse controls. Everything still works: drag to rotate, scroll to zoom, click to identify.",
      });
      setInputMode("mouse");
      const t = setTimeout(() => setOnboarding("complete"), 400);
      return () => clearTimeout(t);
    }
    if (status === "tracking" || status === "no-hands") {
      const t = setTimeout(() => setOnboarding("pinch-heart"), 1400);
      return () => clearTimeout(t);
    }
  }, [phase, status, setOnboarding, setInputMode, pushMessage]);

  // Pinch-heart → completes the moment the heart is grabbed.
  useEffect(() => {
    if (phase !== "pinch-heart") return;
    if (grabbed) {
      awardXp(30);
      pushMessage({
        kind: "praise",
        text: "That's it — you're holding a human heart. Turn your wrist to rotate it, point at any structure to identify it, and open your palm to let go.",
      });
      setOnboarding("complete");
    }
  }, [phase, grabbed, setOnboarding, pushMessage, awardXp]);

  const enableHands = () => {
    setPractical("heart");
    setMode("explore");
    setInputMode("hand");
    setOnboarding("calibrating");
  };
  const useMouse = () => {
    setInputMode("mouse");
    setOnboarding("complete");
  };
  const useAtlas = () => {
    setInputMode("mouse");
    setViewerMode("2d");
    setOnboarding("complete");
  };

  return (
    <AnimatePresence>
      {phase === "ask" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-lg p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hand-controls-title"
        >
          <motion.div
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            className="w-full max-w-md rounded-3xl glass-strong p-7 text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 animate-float-slow items-center justify-center rounded-2xl bg-gradient-to-br from-bio-500 to-cyan-accent text-3xl">
              ✋
            </div>
            <h2 id="hand-controls-title" className="text-xl font-semibold">Enable Natural Hand Controls?</h2>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-foreground/70">
              Use your webcam to hold and manipulate specimens with your bare
              hands. Nothing is recorded — tracking runs entirely on your device.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={enableHands}
                className="flex items-center justify-center gap-2 rounded-full bg-bio-500 py-3 text-sm font-semibold text-ink-950 transition-colors hover:bg-bio-400 bio-glow"
              >
                <Hand size={17} /> Enable hand tracking
              </button>
              <button
                onClick={useMouse}
                className="flex items-center justify-center gap-2 rounded-full py-2.5 text-sm text-foreground/70 hover:text-foreground"
              >
                <MousePointer2 size={15} /> Continue with mouse
              </button>
              <button
                onClick={useAtlas}
                className="flex items-center justify-center gap-2 rounded-full py-2.5 text-sm text-foreground/70 hover:text-foreground"
              >
                <PanelsTopLeft size={15} /> Use accessible 2D atlas
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {phase === "calibrating" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 backdrop-blur-lg p-4"
        >
          <div className="flex flex-col items-center text-center">
            <div className="relative flex h-40 w-40 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-bio-400/40 animate-bio-pulse" />
              <div className="absolute inset-4 rounded-full border border-cyan-accent/40 animate-bio-pulse [animation-delay:0.4s]" />
              <Sparkles size={34} className="text-bio-300" />
            </div>
            <h2 className="mt-6 text-lg font-semibold">Calibrating your hands</h2>
            <p className="mt-1 text-[13px] text-foreground/70">
              {status === "loading-model"
                ? "Loading the tracking model…"
                : status === "starting-camera"
                  ? "Waking up your camera…"
                  : "Hold both hands up in view of the camera."}
            </p>
          </div>
        </motion.div>
      )}

      {phase === "pinch-heart" && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="pointer-events-none fixed left-1/2 top-24 z-[80] -translate-x-1/2"
        >
          <div className="flex items-center gap-3 rounded-full glass-strong px-5 py-3 shadow-2xl">
            <span className="text-2xl animate-float-slow">🤏</span>
            <div className="text-left">
              <div className="text-sm font-semibold">Pinch the heart</div>
              <div className="text-[12px] text-foreground/70">
                Bring your thumb and index finger together to pick it up
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {phase === "complete" && <CompleteFlash key="flash" />}
    </AnimatePresence>
  );
}

function CompleteFlash() {
  const setOnboarding = useLab((s) => s.setOnboarding);
  useEffect(() => {
    const t = setTimeout(() => setOnboarding("hidden"), 1600);
    return () => clearTimeout(t);
  }, [setOnboarding]);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none fixed left-1/2 top-24 z-[80] -translate-x-1/2"
      role="status"
    >
      <div className="flex items-center gap-2 rounded-full bg-bio-500 px-5 py-2.5 text-sm font-semibold text-ink-950 shadow-2xl">
        <Check size={16} /> You&apos;re in control
      </div>
    </motion.div>
  );
}
