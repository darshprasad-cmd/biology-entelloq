import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Landing } from "@/components/landing/Landing";

describe("interactive launch-page previews", () => {
  it("keeps exactly one anatomy layer selected through keyboard interaction", async () => {
    const user = userEvent.setup();
    render(<Landing />);
    const layers = within(screen.getByRole("group", { name: "Anatomy layer" }));
    const surface = layers.getByRole("button", { name: "Surface" });
    const flow = layers.getByRole("button", { name: "Blood flow" });
    const inside = layers.getByRole("button", { name: "Inside" });

    expect(surface).toHaveAttribute("aria-pressed", "false");
    expect(flow).toHaveAttribute("aria-pressed", "false");
    expect(inside).toHaveAttribute("aria-pressed", "true");

    surface.focus();
    await user.keyboard("{Enter}");
    expect(surface).toHaveAttribute("aria-pressed", "true");
    expect(inside).toHaveAttribute("aria-pressed", "false");
    await user.tab();
    expect(flow).toHaveFocus();
    await user.keyboard(" ");
    expect(flow).toHaveAttribute("aria-pressed", "true");
    expect(surface).toHaveAttribute("aria-pressed", "false");

    await user.tab();
    expect(inside).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(inside).toHaveAttribute("aria-pressed", "true");
    expect(flow).toHaveAttribute("aria-pressed", "false");
  });

  it("gives specific investigation feedback and lets a learner retry", async () => {
    const user = userEvent.setup();
    render(<Landing />);
    const investigation = within(screen.getByRole("region", { name: "Try a heart investigation" }));
    expect(investigation.getByText("Why is the left ventricular wall thicker?")).toBeVisible();
    expect(investigation.queryByText(/Not quite/)).not.toBeInTheDocument();
    expect(investigation.queryByText(/Exactly/)).not.toBeInTheDocument();

    await user.click(investigation.getByRole("button", { name: /It holds more blood$/ }));
    expect(investigation.getByText(/Not quite/)).toBeVisible();
    await user.click(investigation.getByRole("button", { name: "Try again" }));
    expect(investigation.queryByText(/Not quite/)).not.toBeInTheDocument();
    expect(investigation.getByRole("button", { name: /It holds more blood$/ })).toBeEnabled();
    expect(investigation.getByRole("button", { name: /It holds more blood$/ })).toHaveAttribute("aria-pressed", "false");

    const correctAnswer = investigation.getByRole("button", { name: /It pumps blood around the whole body$/ });
    correctAnswer.focus();
    await user.keyboard("{Enter}");
    expect(investigation.getByText(/Exactly/)).toBeVisible();
    await user.click(investigation.getByRole("button", { name: "Try again" }));
    expect(investigation.queryByText(/Exactly/)).not.toBeInTheDocument();
    expect(correctAnswer).toBeEnabled();
    expect(correctAnswer).toHaveAttribute("aria-pressed", "false");
  });

  it("switches tutor examples without presenting them as live AI", async () => {
    const user = userEvent.setup();
    render(<Landing />);
    const modes = within(screen.getByRole("group", { name: "Tutor thinking mode" }));
    const example = screen.getByTestId("tutor-example");
    const simplifiedExample = example.textContent;

    expect(screen.getByText("Illustrative example — not live AI")).toBeVisible();
    expect(example).toHaveAttribute("role", "status");
    expect(modes.getByRole("button", { name: "Simplify" })).toHaveAttribute("aria-pressed", "true");
    await user.click(modes.getByRole("button", { name: "Connect" }));
    const connectedExample = example.textContent;
    expect(connectedExample).not.toBe(simplifiedExample);
    expect(modes.getByRole("button", { name: "Connect" })).toHaveAttribute("aria-pressed", "true");
    expect(modes.getByRole("button", { name: "Simplify" })).toHaveAttribute("aria-pressed", "false");

    const testMode = modes.getByRole("button", { name: "Test me" });
    testMode.focus();
    await user.keyboard(" ");
    expect(example.textContent).not.toBe(connectedExample);
    expect(example.textContent).not.toBe(simplifiedExample);
    expect(testMode).toHaveAttribute("aria-pressed", "true");
    expect(modes.getByRole("button", { name: "Connect" })).toHaveAttribute("aria-pressed", "false");

    await user.click(modes.getByRole("button", { name: "Simplify" }));
    expect(example.textContent).toBe(simplifiedExample);
    expect(screen.getByText("Illustrative example — not live AI")).toBeVisible();
  });

  it("uses native expandable questions with available answers", async () => {
    const user = userEvent.setup();
    const { container } = render(<Landing />);
    const questions = Array.from(container.querySelectorAll("details"));
    expect(questions.length).toBeGreaterThan(0);
    for (const question of questions) {
      expect(question.querySelector("summary")).not.toBeNull();
      expect(question.querySelector("p")).toHaveTextContent(/\S/);
    }

    const firstQuestion = questions[0];
    const summary = firstQuestion.querySelector("summary")!;
    expect(firstQuestion.open).toBe(false);
    await user.click(summary);
    expect(firstQuestion.open).toBe(true);
    await user.click(summary);
    expect(firstQuestion.open).toBe(false);
  });
});
