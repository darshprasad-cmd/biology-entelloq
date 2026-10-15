import type { Practical } from "./types";
import { heartPractical } from "@/lib/practicals/heart-data";
import { flowerPractical } from "@/lib/practicals/flower";
import { animalCellPractical } from "@/lib/practicals/animalCell";
import { plantCellPractical } from "@/lib/practicals/plantCell";
import { microscopePractical } from "@/lib/practicals/microscope";

/**
 * The practical registry. Adding a new practical is a one-line change here —
 * the entire engine (interaction, modes, AI, viva, model controls) picks it up
 * with no new application code, which is the whole point of the architecture.
 */
export const PRACTICALS: Practical[] = [
  heartPractical,
  flowerPractical,
  animalCellPractical,
  plantCellPractical,
  microscopePractical,
];

export function validatePractical(practical: Practical): string[] {
  const issues: string[] = [];
  if (!practical.id.trim()) issues.push("Practical id is required");
  if (!practical.title.trim()) issues.push("Practical title is required");
  if (practical.structures.length === 0) issues.push("At least one structure is required");
  const structureIds = new Set<string>();
  for (const structure of practical.structures) {
    if (structureIds.has(structure.id)) issues.push(`Duplicate structure id: ${structure.id}`);
    structureIds.add(structure.id);
    if (!structure.name.trim() || !structure.description.trim()) {
      issues.push(`Structure ${structure.id || "(missing id)"} needs a name and description`);
    }
  }
  for (const step of practical.guided) {
    const referenced = step.advanceOn.type === "select" ? step.advanceOn.structureId : step.focusStructureId;
    if (referenced && !structureIds.has(referenced)) issues.push(`Guided step ${step.id} references missing structure ${referenced}`);
  }
  for (const step of practical.assessment) {
    if (step.requires.type === "identify" && !structureIds.has(step.requires.structureId)) {
      issues.push(`Assessment step ${step.id} references missing structure ${step.requires.structureId}`);
    }
  }
  return issues;
}

export const getPractical = (id: string): Practical =>
  PRACTICALS.find((practical) => practical.id === id && validatePractical(practical).length === 0) ?? heartPractical;
