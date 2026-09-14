"use client";

import { useEffect } from "react";
import { PROGRESS_STORAGE_KEY, progressFromState, useLab } from "@/lib/engine/store";
import { useLabLogic } from "./useLabLogic";
import { TopBar } from "./TopBar";
import { ToolDock } from "./ToolDock";
import { Viewport } from "./Viewport";
import { ViewportControls } from "./ViewportControls";
import { InstructorPanel } from "./InstructorPanel";
import { Onboarding } from "./Onboarding";
import { Viva } from "./Viva";

export function Workspace() {
  useLabLogic();

  const setOnboarding = useLab((s) => s.setOnboarding);
  const onboarding = useLab((s) => s.onboarding);
  const toggleLabels = useLab((s) => s.toggleLabels);
  const resetView = useLab((s) => s.resetView);
  const undo = useLab((s) => s.undo);
  const restoreProgress = useLab((s) => s.restoreProgress);

  // First-launch onboarding (once per browser session).
  useEffect(() => {
    if (typeof window === "undefined") return;
    restoreProgress();
    const unsubscribe = useLab.subscribe((state) => {
      if (!state.progressRestored) return;
      try {
        window.localStorage.setItem(
          PROGRESS_STORAGE_KEY,
          JSON.stringify(progressFromState(state)),
        );
      } catch {
        // Storage can be unavailable in private or restricted browser contexts.
      }
    });
    return unsubscribe;
  }, [restoreProgress]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionStorage.getItem("bio_onboarded")) {
      setOnboarding("ask");
    }
  }, [setOnboarding]);

  useEffect(() => {
    // Only mark the session onboarded once the flow actually completes — not
    // on the initial "hidden" state, which would suppress the first-run modal.
    if (onboarding === "complete") {
      try {
        sessionStorage.setItem("bio_onboarded", "1");
      } catch {
        /* ignore */
      }
    }
  }, [onboarding]);

  // Keyboard shortcuts (accessibility — the app never needs hands or a mouse).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "l" || e.key === "L") toggleLabels();
      if (e.key === "r" || e.key === "R") resetView();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleLabels, resetView, undo]);

  return (
    <div className="grain lab-shell relative flex min-h-[100dvh] flex-col overflow-x-clip p-2 sm:p-3 lg:h-[100dvh] lg:overflow-hidden">
      <a href="#lab-workspace" className="skip-link">Skip to laboratory workspace</a>
      <header className="shrink-0 py-1.5 sm:py-2" aria-label="Laboratory navigation">
        <h1 className="sr-only">Biology Entelloq virtual practical laboratory</h1>
        <TopBar />
      </header>

      <main
        id="lab-workspace"
        className="flex flex-col gap-2.5 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[72px_minmax(0,1fr)_minmax(320px,370px)] lg:gap-3"
      >
        <aside className="order-2 min-h-0 lg:order-1" aria-label="Dissection tools">
          <ToolDock />
        </aside>

        <section className="relative order-1 min-h-[58dvh] lg:order-2 lg:min-h-0" aria-label="Specimen viewer">
          <Viewport />
          <ViewportControls />
        </section>

        <aside className="order-3 overflow-visible rounded-[1.5rem] border border-white/8 bg-white/[0.02] p-3 lg:min-h-0 lg:overflow-hidden lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0" aria-label="Learning guide">
          <InstructorPanel />
        </aside>
      </main>

      <Onboarding />
      <Viva />
    </div>
  );
}
