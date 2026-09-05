import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Landing } from "@/components/landing/Landing";
import { StructureAtlas2D } from "@/components/workspace/StructureAtlas2D";
import { useLab } from "@/lib/engine/store";

const initialState = useLab.getInitialState();

describe("primary product journeys", () => {
  beforeEach(() => useLab.setState(initialState, true));

  it("presents a clear launch-page value proposition and primary action", () => {
    render(<Landing />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Understand living systems");
    expect(screen.getAllByRole("link", { name: /Explore a dissection/i })[0]).toHaveAttribute("href", "/lab");
    expect(screen.getByText("Reviewed content stays reviewed.")).toBeVisible();
  });

  it("lets keyboard and pointer users select a structure in the 2D fallback", async () => {
    const user = userEvent.setup();
    render(<StructureAtlas2D />);
    const aorta = screen.getByTestId("atlas-aorta");
    await user.click(aorta);
    expect(aorta).toHaveAttribute("aria-pressed", "true");
    expect(useLab.getState().identified).toContain("aorta");
  });
});
