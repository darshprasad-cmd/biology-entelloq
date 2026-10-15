/**
 * AI Laboratory Instructor.
 *
 * A context-aware engine — not a chatbot. It knows the current practical,
 * the selected/hovered structure, the active tool and gesture, progress and
 * mistakes, and proactively narrates. The local rule engine makes it feel
 * instant and works fully offline; `askInstructor` optionally upgrades free-
 * form questions to an LLM when a server key is configured.
 */

import type { Practical, Structure } from "@/lib/engine/types";
import { structureById } from "@/lib/engine/types";
import type { VivaQuestion } from "@/lib/engine/types";

export interface InstructorContext {
  practical: Practical;
  mode: string;
  tool: string;
  gesture: string;
  selectedId: string | null;
  hoveredId: string | null;
  completedSteps: string[];
  mistakes: number;
  dissection: number;
}

/** Rich explanation for a selected/identified structure. */
export function explainStructure(s: Structure): string {
  const fn = s.functionText ? ` ${s.functionText}` : "";
  return `${s.name} — ${s.description}${fn}`;
}

/** A short proactive line when a structure is first identified by pointing. */
export function identifyLine(s: Structure): string {
  return `That's the ${s.name}. ${s.description}`;
}

/** Opening narration when a practical loads. */
export function welcomeLine(p: Practical): string {
  return `Welcome to the ${p.title} practical. ${p.tagline} Pinch the specimen to pick it up, point at any structure to identify it, or open your palm to let go.`;
}

/** Encouragement / warning based on dissection progress with the scalpel. */
export function dissectionFeedback(progress: number, prev: number): string | null {
  if (prev < 0.15 && progress >= 0.15)
    return "Good — begin your incision slowly along the anterior wall. Keep the cut shallow.";
  if (prev < 0.6 && progress >= 0.6)
    return "You're through the wall. The internal chambers are becoming visible — notice the difference in wall thickness.";
  if (prev < 1 && progress >= 1)
    return "Beautifully done. The specimen is fully opened. Take a moment to compare the chambers, then point at each to review it.";
  return null;
}

// ── Local viva grading ───────────────────────────────────────────────────────

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an|of|to|and|is|are|it|that|this|for|in|on|with)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Concept-overlap grader: how many expected concepts the answer touches. */
export function gradeViva(
  q: VivaQuestion,
  answer: string,
): { score: number; feedback: string } {
  const norm = normalise(answer);
  if (norm.length < 3) {
    return {
      score: 0,
      feedback: `Try to answer in your own words. Model answer: ${q.idealAnswer}`,
    };
  }
  const hits: string[] = [];
  const missed: string[] = [];
  for (const concept of q.expectedConcepts) {
    const words = normalise(concept)
      .split(" ")
      .filter((w) => w.length > 2);
    const present =
      words.length > 0 && words.some((w) => norm.includes(w));
    (present ? hits : missed).push(concept);
  }
  const score = q.expectedConcepts.length
    ? hits.length / q.expectedConcepts.length
    : 0;

  let feedback: string;
  if (score >= 0.8) {
    feedback = `Excellent — you covered ${hits.join(", ")}. That's a strong, complete answer.`;
  } else if (score >= 0.45) {
    feedback = `Good start. You mentioned ${hits.join(", ") || "some points"}, but also consider: ${missed.join(", ")}.`;
  } else {
    feedback = `Not quite. Key ideas to include: ${missed.join(", ")}. Model answer: ${q.idealAnswer}`;
  }
  return { score, feedback };
}

/** Final mastery summary after the viva. */
export function masterySummary(
  p: Practical,
  avg: number,
  mistakes: number,
): string {
  const grade =
    avg >= 0.85 ? "Distinction" : avg >= 0.6 ? "Merit" : avg >= 0.4 ? "Pass" : "Keep practising";
  return `Viva complete — ${grade}. You explored the ${p.title}, identified its structures, and answered on the underlying physiology${mistakes > 0 ? `, with ${mistakes} misstep${mistakes === 1 ? "" : "s"} along the way` : " cleanly"}. ${
    avg >= 0.6
      ? "You've demonstrated a real understanding of this specimen."
      : "Revisit the structures you missed in Explore mode, then try the viva again."
  }`;
}

// ── Optional LLM upgrade for free-form questions ─────────────────────────────

/**
 * Ask the instructor a free-form question. Tries the server route (which uses
 * an LLM if a key is configured) and falls back to a grounded local answer so
 * the feature always works.
 */
export async function askInstructor(
  question: string,
  ctx: InstructorContext,
): Promise<string> {
  try {
    const res = await fetch("/api/instructor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question,
        practical: ctx.practical.aiContext,
        selected: structureById(ctx.practical, ctx.selectedId)?.name ?? null,
        mode: ctx.mode,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { answer?: string; fallback?: boolean };
      if (data.answer && !data.fallback) return data.answer;
    }
  } catch {
    /* offline — use local grounding */
  }
  return localAnswer(question, ctx);
}

function localAnswer(question: string, ctx: InstructorContext): string {
  const q = normalise(question);
  // Match against structure names/descriptions in the current practical.
  const match = ctx.practical.structures.find((s) =>
    normalise(s.name)
      .split(" ")
      .some((w) => w.length > 3 && q.includes(w)),
  );
  if (match) return answerForIntent(q, match);
  const sel = structureById(ctx.practical, ctx.selectedId);
  if (sel) return answerForIntent(q, sel);
  return `In this practical we're studying the ${ctx.practical.title}. ${ctx.practical.tagline} Point at any structure and I'll explain it.`;
}

function answerForIntent(question: string, structure: Structure): string {
  if (question.includes("test")) {
    return `Retrieval check: without looking back, explain the main function of the ${structure.name} and name one structure it connects or relates to.`;
  }
  if (question.includes("analogy")) {
    return `Think of the ${structure.name} as one specialist station in a living transport network. Its local job is ${structure.functionText?.toLowerCase() ?? structure.description.toLowerCase()}, but it only works because connected structures pass material or force in the correct direction.`;
  }
  if (question.includes("connect")) {
    return structure.relationships
      ? `${structure.name} in context: ${structure.relationships}`
      : `${structure.name} belongs to the ${structure.system ?? structure.group ?? "same functional system as the surrounding structures"}. Follow what enters it, what leaves it, and how that changes the next structure's job.`;
  }
  if (question.includes("depth") || question.includes("deeper")) {
    return `${explainStructure(structure)} ${structure.significance ?? "Its form is closely matched to the mechanical and physiological demands placed on it."}${structure.misconception ? ` Common misconception: ${structure.misconception}` : ""}`;
  }
  if (question.includes("simple") || question.includes("simplify")) {
    return `${structure.name}: ${structure.functionText ?? structure.description.split(".")[0] + "."}`;
  }
  return explainStructure(structure);
}
