import type { ComponentType } from "react";
import type * as THREE from "three";

export type LearningMode = "explore" | "guided" | "practice" | "assessment";

export type ToolId =
  | "hand"
  | "scalpel"
  | "forceps"
  | "microscope"
  | "measure"
  | "pipette";

export interface Citation {
  label: string;
  source: string;
  url?: string;
}

export interface AssetLicence {
  asset: string;
  author: string;
  licence: string;
  source: string;
}

export interface AnatomyLayer {
  id: string;
  name: string;
  description: string;
  structureIds: string[];
}

/** A named, selectable/identifiable part of a specimen. */
export interface Structure {
  id: string;
  name: string;
  /** Local-space anchor for the label leader line and point-to-identify. */
  position: [number, number, number];
  /** Short scientific explanation surfaced by the AI instructor on select. */
  description: string;
  functionText?: string;
  system?: string;
  alternateNames?: string[];
  relationships?: string;
  significance?: string;
  accessibilityDescription?: string;
  misconception?: string;
  accent?: string;
  group?: string;
}

export interface VivaQuestion {
  id: string;
  prompt: string;
  expectedConcepts: string[];
  idealAnswer: string;
  structureId?: string;
}

export type GuidedAdvance =
  | { type: "select"; structureId: string }
  | { type: "dissect"; min: number }
  | { type: "labels" }
  | { type: "next" };

export interface GuidedStep {
  id: string;
  title: string;
  narration: string;
  focusStructureId?: string;
  action?: string;
  checkpoint?: {
    prompt: string;
    answer: string;
  };
  advanceOn: GuidedAdvance;
}

export type AssessmentRequire =
  | { type: "identify"; structureId: string }
  | { type: "dissect"; min: number }
  | { type: "labelAll" };

export interface AssessmentStep {
  id: string;
  instruction: string;
  requires: AssessmentRequire;
  hint: string;
  successNote: string;
}

/** Props the engine passes to every procedural specimen model. */
export interface ModelProps {
  dissection: number; // 0..1 incision progress
  hoveredId: string | null;
  selectedId: string | null;
  isolatedGroup: string | null;
  exploded: number; // 0..1
  transparency: number; // 0..1 (0 = opaque)
  crossSection: number; // 0..1 (0 = off)
  labelsVisible: boolean;
  hiddenIds: string[];
  fadedIds: string[];
  /** Meshes call this to become hoverable / identifiable by id. */
  registerHit: (mesh: THREE.Object3D | null, structureId: string) => void;
}

export interface Practical {
  id: string;
  title: string;
  tagline: string;
  emoji: string;
  discipline: string;
  difficulty: "Foundation" | "Intermediate" | "Advanced";
  durationMin: number;
  objectives: string[];
  priorKnowledge?: string[];
  orientation?: string;
  safetyAndEthics?: string;
  revisionSummary?: string[];
  comparison?: string;
  layers?: AnatomyLayer[];
  permittedTools?: ToolId[];
  accessibilityDescription?: string;
  citations?: Citation[];
  assets?: AssetLicence[];
  structures: Structure[];
  guided: GuidedStep[];
  assessment: AssessmentStep[];
  viva: VivaQuestion[];
  supportsDissection: boolean;
  camera?: {
    position: [number, number, number];
    target?: [number, number, number];
  };
  Model: ComponentType<ModelProps>;
  /** Grounding context describing the specimen for the AI instructor. */
  aiContext: string;
}

export const structureById = (p: Practical, id: string | null) =>
  id ? p.structures.find((s) => s.id === id) ?? null : null;
