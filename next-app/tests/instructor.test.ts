import { describe, expect, it } from "vitest";
import { gradeViva } from "@/lib/ai/instructor";

const question = {
  id: "flow",
  prompt: "Trace pulmonary flow",
  expectedConcepts: ["right ventricle", "pulmonary artery", "lungs"],
  idealAnswer: "Right ventricle to pulmonary artery to lungs.",
};

describe("explanatory assessment feedback", () => {
  it("recognises the expected biological concepts", () => {
    const result = gradeViva(question, "Blood leaves the right ventricle through the pulmonary artery and travels to the lungs.");
    expect(result.score).toBe(1);
    expect(result.feedback).toMatch(/strong, complete answer/i);
  });

  it("explains what a partial answer is missing", () => {
    const result = gradeViva(question, "It leaves the right ventricle.");
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(0.8);
    expect(result.feedback).toMatch(/consider|include/i);
  });
});
