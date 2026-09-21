import type { AssessmentStep, Practical } from "./types";

export function currentAssessmentStep(
  practical: Practical,
  completedStepIds: string[],
): AssessmentStep | null {
  return practical.assessment.find((step) => !completedStepIds.includes(step.id)) ?? null;
}

export function assessmentIsComplete(
  practical: Practical,
  completedStepIds: string[],
): boolean {
  return practical.assessment.every((step) => completedStepIds.includes(step.id));
}

export function masteryAverage(mastery: Record<string, number>): number {
  const scores = Object.values(mastery);
  return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
}
