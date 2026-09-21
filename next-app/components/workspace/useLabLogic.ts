"use client";

import { useEffect } from "react";
import { useLab, type LabStateSnapshot } from "@/lib/engine/store";
import { getPractical } from "@/lib/engine/registry";
import { structureById } from "@/lib/engine/types";
import { currentAssessmentStep } from "@/lib/engine/progression";
import {
  identifyLine,
  welcomeLine,
  dissectionFeedback,
} from "@/lib/ai/instructor";

/**
 * The instructor's reactive intelligence. Subscribes to the lab store and
 * turns raw interaction into proactive teaching: explanations on identify,
 * grading in assessment, step advancement in guided mode, and hints when the
 * student hesitates. Prev-trackers are updated *before* side effects so the
 * store writes this makes never re-trigger it.
 */
export function useLabLogic() {
  const practicalId = useLab((s) => s.practicalId);

  // Welcome narration whenever a practical loads.
  useEffect(() => {
    const p = getPractical(practicalId);
    const state = useLab.getState();
    const welcome = welcomeLine(p);
    if (state.messages.at(-1)?.text !== welcome) {
      state.pushMessage({ kind: "system", text: welcome });
    }
  }, [practicalId]);

  useEffect(() => {
    let prevSelected: string | null = useLab.getState().selectedId;
    let prevDissection = useLab.getState().dissection;
    let prevLabels = useLab.getState().labelsVisible;
    let prevGuided = -1;
    let prevMode = useLab.getState().mode;
    let lastInteraction = Date.now();
    let hintedStep = -99;

    const handle = (s: LabStateSnapshot) => {
      const p = getPractical(s.practicalId);

      // Mode change → reset guided narration + note the switch.
      if (s.mode !== prevMode) {
        prevMode = s.mode;
        if (s.mode === "guided") prevGuided = -1;
        lastInteraction = Date.now();
      }

      // Selection changed.
      if (s.selectedId !== prevSelected) {
        prevSelected = s.selectedId; // update FIRST (prevents re-entrancy)
        const struct = structureById(p, s.selectedId);
        if (struct) {
          lastInteraction = Date.now();
          if (s.mode === "assessment") {
            const step = currentAssessmentStep(p, s.completedSteps);
            if (step && step.requires.type === "identify") {
              if (step.requires.structureId === struct.id) {
                s.completeStep(step.id);
                s.recordMastery(struct.id, 1);
                s.pushMessage({ kind: "praise", text: step.successNote });
              } else {
                s.addMistake();
                s.pushMessage({
                  kind: "warn",
                  text: `Not quite — that's the ${struct.name}. ${step.hint}`,
                });
              }
            } else {
              s.pushMessage({ kind: "explain", text: identifyLine(struct) });
            }
          } else {
            s.recordMastery(struct.id, s.mode === "practice" ? 0.55 : 0.35);
            s.pushMessage({ kind: "explain", text: identifyLine(struct) });
          }
          if (s.tool === "forceps" && struct.group) {
            s.isolate(struct.group);
            s.pushMessage({
              kind: "system",
              text: `${struct.name} isolated with the ${struct.group} system. Restore all structures from the anatomy controls when you are ready.`,
            });
          }
          if (s.tool === "measure") {
            s.pushMessage({
              kind: "hint",
              text: `Measurement checkpoint: compare the size and wall thickness of the ${struct.name} with its nearest related structure before moving on.`,
            });
          }
          if (s.mode === "guided") {
            const gs = p.guided[s.guidedIndex];
            if (
              gs &&
              gs.advanceOn.type === "select" &&
              gs.advanceOn.structureId === struct.id
            ) {
              s.advanceGuided();
            }
          }
        }
      }

      // Dissection changed.
      if (Math.abs(s.dissection - prevDissection) > 0.0015) {
        const from = prevDissection;
        prevDissection = s.dissection;
        lastInteraction = Date.now();
        const fb = dissectionFeedback(s.dissection, from);
        if (fb)
          s.pushMessage({
            kind: s.dissection >= 1 ? "praise" : "explain",
            text: fb,
          });
        if (s.mode === "guided") {
          const gs = p.guided[s.guidedIndex];
          if (
            gs &&
            gs.advanceOn.type === "dissect" &&
            s.dissection >= gs.advanceOn.min
          )
            s.advanceGuided();
        }
        if (s.mode === "assessment") {
          const step = currentAssessmentStep(p, s.completedSteps);
          if (
            step &&
            step.requires.type === "dissect" &&
            s.dissection >= step.requires.min
          ) {
            s.completeStep(step.id);
            s.pushMessage({ kind: "praise", text: step.successNote });
          }
        }
      }

      // Labels toggled on.
      if (s.labelsVisible && !prevLabels) {
        prevLabels = true;
        lastInteraction = Date.now();
        if (s.mode === "guided") {
          const gs = p.guided[s.guidedIndex];
          if (gs && gs.advanceOn.type === "labels") s.advanceGuided();
        }
      } else if (!s.labelsVisible && prevLabels) {
        prevLabels = false;
      }

      // Guided step advanced → narrate the new step.
      if (s.mode === "guided" && s.guidedIndex !== prevGuided) {
        prevGuided = s.guidedIndex;
        hintedStep = -99;
        lastInteraction = Date.now();
        const gs = p.guided[s.guidedIndex];
        if (gs) s.pushMessage({ kind: "system", text: gs.narration });
      }

      if (s.hoveredId) lastInteraction = Date.now();
    };

    const unsub = useLab.subscribe(handle);

    // Hesitation → offer a hint.
    const timer = setInterval(() => {
      const s = useLab.getState();
      if (
        (s.mode === "guided" || s.mode === "assessment") &&
        Date.now() - lastInteraction > 13000
      ) {
        if (s.mode === "guided") {
          const gs = getPractical(s.practicalId).guided[s.guidedIndex];
          if (gs?.action && hintedStep !== s.guidedIndex) {
            s.pushMessage({ kind: "hint", text: `Hint: ${gs.action}` });
            hintedStep = s.guidedIndex;
            lastInteraction = Date.now();
          }
        } else {
          const step = currentAssessmentStep(
            getPractical(s.practicalId),
            s.completedSteps,
          );
          if (step && hintedStep !== -2) {
            s.pushMessage({ kind: "hint", text: `Hint: ${step.hint}` });
            hintedStep = -2;
            lastInteraction = Date.now();
          }
        }
      }
    }, 4000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);
}
