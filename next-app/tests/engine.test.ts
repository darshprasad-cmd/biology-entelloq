import { beforeEach, describe, expect, it } from "vitest";
import { heartPractical } from "@/lib/practicals/heart";
import { currentAssessmentStep, masteryAverage } from "@/lib/engine/progression";
import { decodeSavedProgress, progressFromState, useLab } from "@/lib/engine/store";
import { validatePractical } from "@/lib/engine/registry";

const initialState = useLab.getInitialState();

describe("investigation engine", () => {
  beforeEach(() => {
    useLab.setState(initialState, true);
    window.localStorage.clear();
  });

  it("keeps assessment steps ordered", () => {
    expect(currentAssessmentStep(heartPractical, [])?.id).toBe("a1");
    expect(currentAssessmentStep(heartPractical, ["a1"])?.id).toBe("a2");
    expect(currentAssessmentStep(heartPractical, ["a1", "a2", "a3", "a4"])).toBeNull();
  });

  it("undoes a reversible dissection action", () => {
    useLab.getState().setDissection(0.72);
    expect(useLab.getState().dissection).toBe(0.72);
    expect(useLab.getState().history).toHaveLength(1);
    useLab.getState().undo();
    expect(useLab.getState().dissection).toBe(0);
  });

  it("hides, fades, and restores structures", () => {
    useLab.getState().hideStructure("aorta");
    useLab.getState().fadeStructure("leftVentricle");
    expect(useLab.getState().hiddenIds).toContain("aorta");
    expect(useLab.getState().fadedIds).toContain("leftVentricle");
    useLab.getState().restoreStructures();
    expect(useLab.getState().hiddenIds).toEqual([]);
    expect(useLab.getState().fadedIds).toEqual([]);
  });

  it("round-trips validated saved progress and rejects corrupted data", () => {
    useLab.getState().select("aorta");
    useLab.getState().recordMastery("aorta", 0.7);
    const encoded = JSON.stringify(progressFromState(useLab.getState()));
    expect(decodeSavedProgress(encoded)?.mastery.aorta).toBe(0.7);
    expect(decodeSavedProgress("{bad json")).toBeNull();
    expect(decodeSavedProgress(JSON.stringify({ version: 1 }))).toBeNull();
  });

  it("validates structure references in practical content", () => {
    expect(validatePractical(heartPractical)).toEqual([]);
    expect(validatePractical({
      ...heartPractical,
      guided: [{ ...heartPractical.guided[0], advanceOn: { type: "select", structureId: "missing" } }],
    })).toContain("Guided step g1 references missing structure missing");
  });

  it("calculates mastery by concept rather than completion points", () => {
    expect(masteryAverage({ aorta: 1, valve: 0.5 })).toBe(0.75);
    expect(masteryAverage({})).toBe(0);
  });
});
