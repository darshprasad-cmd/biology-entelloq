import { create } from "zustand";
import type { Gesture } from "@/lib/hands/classifier";
import type { TrackingStatus } from "@/lib/hands/controller";
import type { LearningMode, ToolId } from "./types";

export type InputMode = "hand" | "mouse";
export type ViewerMode = "3d" | "2d";
export type CameraPreset = "anterior" | "posterior" | "left";

export type OnboardingPhase =
  | "hidden"
  | "ask"
  | "calibrating"
  | "pinch-heart"
  | "complete";

export interface InstructorMessage {
  id: string;
  kind: "explain" | "hint" | "warn" | "praise" | "system" | "viva" | "user";
  text: string;
  ts: number;
}

export interface VivaState {
  open: boolean;
  index: number;
  answers: { question: string; answer: string; score: number; feedback: string }[];
  finished: boolean;
}

export interface LabHistorySnapshot {
  tool: ToolId;
  cameraPreset: CameraPreset;
  selectedId: string | null;
  identified: string[];
  labelsVisible: boolean;
  transparency: number;
  exploded: number;
  crossSection: number;
  isolatedGroup: string | null;
  hiddenIds: string[];
  fadedIds: string[];
  dissection: number;
  guidedIndex: number;
  completedSteps: string[];
  mastery: Record<string, number>;
}

export interface TimelineEntry {
  id: string;
  label: string;
  at: number;
}

export interface SavedLabProgress {
  version: 1;
  practicalId: string;
  mode: LearningMode;
  viewerMode: ViewerMode;
  cameraPreset: CameraPreset;
  identified: string[];
  completedSteps: string[];
  guidedIndex: number;
  mastery: Record<string, number>;
  mistakes: number;
  xp: number;
  updatedAt: number;
}

export const PROGRESS_STORAGE_KEY = "biology-entelloq-progress-v1";

export interface LabState {
  practicalId: string;
  mode: LearningMode;
  tool: ToolId;
  inputMode: InputMode;
  viewerMode: ViewerMode;
  cameraPreset: CameraPreset;
  progressRestored: boolean;
  trackingStatus: TrackingStatus;
  handCount: number;
  primaryGesture: Gesture;
  trackingError?: string;
  hoveredId: string | null;
  selectedId: string | null;
  grabbed: boolean;
  identified: string[];
  labelsVisible: boolean;
  transparency: number;
  exploded: number;
  crossSection: number;
  isolatedGroup: string | null;
  hiddenIds: string[];
  fadedIds: string[];
  dissection: number;
  guidedIndex: number;
  completedSteps: string[];
  mistakes: number;
  xp: number;
  mastery: Record<string, number>;
  history: LabHistorySnapshot[];
  timeline: TimelineEntry[];
  messages: InstructorMessage[];
  onboarding: OnboardingPhase;
  viva: VivaState;
  setPractical: (id: string) => void;
  setMode: (m: LearningMode) => void;
  setTool: (t: ToolId) => void;
  setInputMode: (m: InputMode) => void;
  setViewerMode: (m: ViewerMode) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  setTracking: (p: { status: TrackingStatus; handCount: number; primaryGesture: Gesture; error?: string }) => void;
  setHovered: (id: string | null) => void;
  select: (id: string | null) => void;
  setGrabbed: (v: boolean) => void;
  toggleLabels: () => void;
  setLabels: (v: boolean) => void;
  setTransparency: (v: number) => void;
  setExploded: (v: number) => void;
  setCrossSection: (v: number) => void;
  isolate: (group: string | null) => void;
  hideStructure: (id: string) => void;
  fadeStructure: (id: string) => void;
  restoreStructures: () => void;
  setDissection: (v: number) => void;
  addDissection: (delta: number) => void;
  advanceGuided: () => void;
  setGuidedIndex: (i: number) => void;
  completeStep: (id: string) => void;
  addMistake: () => void;
  awardXp: (n: number) => void;
  recordMastery: (structureId: string, score: number) => void;
  pushMessage: (m: Omit<InstructorMessage, "id" | "ts">) => void;
  clearMessages: () => void;
  setOnboarding: (p: OnboardingPhase) => void;
  openViva: () => void;
  closeViva: () => void;
  recordViva: (a: VivaState["answers"][number]) => void;
  nextViva: () => void;
  finishViva: () => void;
  undo: () => void;
  resetView: () => void;
  restoreProgress: () => void;
}

export type LabStateSnapshot = LabState;

let msgSeq = 0;
let timelineSeq = 0;

const initialViva: VivaState = { open: false, index: 0, answers: [], finished: false };

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function snapshot(state: LabState): LabHistorySnapshot {
  return {
    tool: state.tool,
    cameraPreset: state.cameraPreset,
    selectedId: state.selectedId,
    identified: state.identified,
    labelsVisible: state.labelsVisible,
    transparency: state.transparency,
    exploded: state.exploded,
    crossSection: state.crossSection,
    isolatedGroup: state.isolatedGroup,
    hiddenIds: state.hiddenIds,
    fadedIds: state.fadedIds,
    dissection: state.dissection,
    guidedIndex: state.guidedIndex,
    completedSteps: state.completedSteps,
    mastery: state.mastery,
  };
}

function withHistory(state: LabState, label: string, patch: Partial<LabState>): Partial<LabState> {
  const now = Date.now();
  const last = state.timeline.at(-1);
  const coalesce = last?.label === label && now - last.at < 700;
  const nextEntry: TimelineEntry = { id: `t${++timelineSeq}`, label, at: now };
  return {
    ...patch,
    history: coalesce ? state.history : [...state.history.slice(-29), snapshot(state)],
    timeline: coalesce
      ? [...state.timeline.slice(0, -1), nextEntry]
      : [...state.timeline.slice(-11), nextEntry],
  };
}

export function decodeSavedProgress(raw: string | null): SavedLabProgress | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<SavedLabProgress>;
    if (
      candidate.version !== 1 ||
      typeof candidate.practicalId !== "string" ||
      !["explore", "guided", "practice", "assessment"].includes(candidate.mode ?? "") ||
      !["3d", "2d"].includes(candidate.viewerMode ?? "") ||
      !["anterior", "posterior", "left"].includes(candidate.cameraPreset ?? "") ||
      !Array.isArray(candidate.identified) ||
      !Array.isArray(candidate.completedSteps) ||
      typeof candidate.guidedIndex !== "number" ||
      typeof candidate.mastery !== "object" ||
      candidate.mastery === null ||
      typeof candidate.mistakes !== "number" ||
      typeof candidate.xp !== "number" ||
      typeof candidate.updatedAt !== "number"
    ) return null;
    return candidate as SavedLabProgress;
  } catch {
    return null;
  }
}

export function progressFromState(state: LabState): SavedLabProgress {
  return {
    version: 1,
    practicalId: state.practicalId,
    mode: state.mode,
    viewerMode: state.viewerMode,
    cameraPreset: state.cameraPreset,
    identified: state.identified,
    completedSteps: state.completedSteps,
    guidedIndex: state.guidedIndex,
    mastery: state.mastery,
    mistakes: state.mistakes,
    xp: state.xp,
    updatedAt: Date.now(),
  };
}

export const useLab = create<LabState>((set, get) => ({
  practicalId: "heart",
  mode: "explore",
  tool: "hand",
  inputMode: "mouse",
  viewerMode: "3d",
  cameraPreset: "anterior",
  progressRestored: false,
  trackingStatus: "idle",
  handCount: 0,
  primaryGesture: "none",
  hoveredId: null,
  selectedId: null,
  grabbed: false,
  identified: [],
  labelsVisible: false,
  transparency: 0,
  exploded: 0,
  crossSection: 0,
  isolatedGroup: null,
  hiddenIds: [],
  fadedIds: [],
  dissection: 0,
  guidedIndex: 0,
  completedSteps: [],
  mistakes: 0,
  xp: 0,
  mastery: {},
  history: [],
  timeline: [],
  messages: [],
  onboarding: "hidden",
  viva: initialViva,

  setPractical: (id) => set({
    practicalId: id,
    cameraPreset: "anterior",
    selectedId: null,
    hoveredId: null,
    identified: [],
    dissection: 0,
    exploded: 0,
    transparency: 0,
    crossSection: 0,
    isolatedGroup: null,
    hiddenIds: [],
    fadedIds: [],
    guidedIndex: 0,
    completedSteps: [],
    mistakes: 0,
    mastery: {},
    history: [],
    timeline: [],
    viva: initialViva,
    messages: [],
  }),
  setMode: (mode) => set({ mode }),
  setTool: (tool) => set({ tool }),
  setInputMode: (inputMode) => set({ inputMode }),
  setViewerMode: (viewerMode) => set({ viewerMode }),
  setCameraPreset: (cameraPreset) => set((state) => withHistory(state, `View ${cameraPreset} surface`, { cameraPreset })),
  setTracking: ({ status, handCount, primaryGesture, error }) =>
    set({ trackingStatus: status, handCount, primaryGesture, trackingError: error }),
  setHovered: (id) => { if (get().hoveredId !== id) set({ hoveredId: id }); },
  select: (id) => {
    if (get().selectedId !== id) {
      set((state) => ({
        selectedId: id,
        identified: id && !state.identified.includes(id) ? [...state.identified, id] : state.identified,
      }));
    }
  },
  setGrabbed: (grabbed) => { if (get().grabbed !== grabbed) set({ grabbed }); },
  toggleLabels: () => set((state) => withHistory(state, state.labelsVisible ? "Hide labels" : "Show labels", { labelsVisible: !state.labelsVisible })),
  setLabels: (labelsVisible) => set((state) => withHistory(state, labelsVisible ? "Show labels" : "Hide labels", { labelsVisible })),
  setTransparency: (transparency) => set((state) => withHistory(state, "Adjust transparency", { transparency: clamp01(transparency) })),
  setExploded: (exploded) => set((state) => withHistory(state, "Separate anatomical layers", { exploded: clamp01(exploded) })),
  setCrossSection: (crossSection) => set((state) => withHistory(state, "Move section plane", { crossSection: clamp01(crossSection) })),
  isolate: (isolatedGroup) => set((state) => withHistory(state, isolatedGroup ? `Isolate ${isolatedGroup}` : "Clear isolation", { isolatedGroup })),
  hideStructure: (id) => set((state) => withHistory(state, `Hide ${id}`, {
    hiddenIds: state.hiddenIds.includes(id) ? state.hiddenIds.filter((item) => item !== id) : [...state.hiddenIds, id],
  })),
  fadeStructure: (id) => set((state) => withHistory(state, `Fade ${id}`, {
    fadedIds: state.fadedIds.includes(id) ? state.fadedIds.filter((item) => item !== id) : [...state.fadedIds, id],
  })),
  restoreStructures: () => set((state) => withHistory(state, "Restore all structures", { hiddenIds: [], fadedIds: [], isolatedGroup: null })),
  setDissection: (dissection) => set((state) => withHistory(state, "Dissect anterior wall", { dissection: clamp01(dissection) })),
  addDissection: (delta) => set((state) => withHistory(state, "Dissect anterior wall", { dissection: clamp01(state.dissection + delta) })),
  advanceGuided: () => set((state) => ({ guidedIndex: state.guidedIndex + 1 })),
  setGuidedIndex: (guidedIndex) => set({ guidedIndex }),
  completeStep: (id) => set((state) => state.completedSteps.includes(id) ? state : { completedSteps: [...state.completedSteps, id], xp: state.xp + 20 }),
  addMistake: () => set((state) => ({ mistakes: state.mistakes + 1 })),
  awardXp: (amount) => set((state) => ({ xp: state.xp + amount })),
  recordMastery: (structureId, score) => set((state) => ({ mastery: { ...state.mastery, [structureId]: Math.max(state.mastery[structureId] ?? 0, clamp01(score)) } })),
  pushMessage: (message) => set((state) => ({ messages: [...state.messages.slice(-40), { ...message, id: `m${++msgSeq}`, ts: Date.now() }] })),
  clearMessages: () => set({ messages: [] }),
  setOnboarding: (onboarding) => set({ onboarding }),
  openViva: () => set({ viva: { open: true, index: 0, answers: [], finished: false } }),
  closeViva: () => set((state) => ({ viva: { ...state.viva, open: false } })),
  recordViva: (answer) => set((state) => ({ viva: { ...state.viva, answers: [...state.viva.answers, answer] } })),
  nextViva: () => set((state) => ({ viva: { ...state.viva, index: state.viva.index + 1 } })),
  finishViva: () => set((state) => ({ viva: { ...state.viva, finished: true }, xp: state.xp + 80 })),
  undo: () => set((state) => {
    const previous = state.history.at(-1);
    if (!previous) return state;
    return {
      ...previous,
      history: state.history.slice(0, -1),
      timeline: [...state.timeline.slice(-11), { id: `t${++timelineSeq}`, label: "Undo last action", at: Date.now() }],
    };
  }),
  resetView: () => set((state) => withHistory(state, "Reset investigation", {
    tool: "hand",
    cameraPreset: "anterior",
    selectedId: null,
    labelsVisible: false,
    exploded: 0,
    transparency: 0,
    crossSection: 0,
    isolatedGroup: null,
    hiddenIds: [],
    fadedIds: [],
    dissection: 0,
  })),
  restoreProgress: () => {
    if (typeof window === "undefined") return;
    const saved = decodeSavedProgress(window.localStorage.getItem(PROGRESS_STORAGE_KEY));
    if (!saved) {
      set({ progressRestored: true });
      return;
    }
    set({
      practicalId: saved.practicalId,
      mode: saved.mode,
      viewerMode: saved.viewerMode,
      cameraPreset: saved.cameraPreset,
      identified: saved.identified,
      completedSteps: saved.completedSteps,
      guidedIndex: saved.guidedIndex,
      mastery: saved.mastery,
      mistakes: saved.mistakes,
      xp: saved.xp,
      progressRestored: true,
      timeline: [{ id: `t${++timelineSeq}`, label: "Resume saved investigation", at: Date.now() }],
    });
  },
}));
