import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("landing page communicates value and navigates to the lab", async ({ page }, testInfo) => {
  const labRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/lab") labRequests.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Don’t just study life.");
  await expect(page.getByRole("link", { name: /Explore a dissection/i }).first()).toBeVisible();
  const workspaceImage = page.locator(".workspace-preview img");
  await workspaceImage.scrollIntoViewIfNeeded();
  await expect.poll(() => workspaceImage.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  if (testInfo.project.name === "desktop-chromium") {
    await page.screenshot({ path: "docs/screenshots/landing-desktop.png", fullPage: true });
  } else {
    await page.screenshot({ path: "docs/screenshots/landing-mobile.png", fullPage: true });
  }
  expect(labRequests, "The landing page must not prefetch the heavier lab route").toEqual([]);
  await page.getByRole("link", { name: /Explore a dissection/i }).first().click();
  await expect(page).toHaveURL(/\/lab$/);
});

test("launch-page anatomy layers and investigation work with the keyboard", async ({ page }) => {
  await page.goto("/");
  const layers = page.getByRole("group", { name: "Anatomy layer" });
  const surface = layers.getByRole("button", { name: "Surface", exact: true });
  const flow = layers.getByRole("button", { name: "Blood flow", exact: true });
  const inside = layers.getByRole("button", { name: "Inside", exact: true });
  await expect(inside).toHaveAttribute("aria-pressed", "true");
  await surface.focus();
  await page.keyboard.press("Enter");
  await expect(surface).toHaveAttribute("aria-pressed", "true");
  await expect(inside).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Tab");
  await expect(flow).toBeFocused();
  await page.keyboard.press("Space");
  await expect(flow).toHaveAttribute("aria-pressed", "true");
  await expect(surface).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Tab");
  await expect(inside).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(inside).toHaveAttribute("aria-pressed", "true");
  await expect(flow).toHaveAttribute("aria-pressed", "false");

  const investigation = page.getByRole("region", { name: "Try a heart investigation" });
  await investigation.getByRole("button", { name: /It holds more blood$/ }).focus();
  await page.keyboard.press("Space");
  await expect(investigation.getByText(/Not quite/)).toBeVisible();
  await investigation.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(investigation.getByText(/Not quite/)).toHaveCount(0);
  await investigation.getByRole("button", { name: /It pumps blood around the whole body$/ }).focus();
  await page.keyboard.press("Enter");
  await expect(investigation.getByText(/Exactly/)).toBeVisible();
});

test("tutor previews and native FAQs work without a pointer", async ({ page }) => {
  await page.goto("/");
  const modes = page.getByRole("group", { name: "Tutor thinking mode" });
  const example = page.getByTestId("tutor-example");
  const simplifiedExample = await example.textContent();
  await expect(page.getByText("Illustrative example — not live AI")).toBeVisible();
  await modes.getByRole("button", { name: "Simplify", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(modes.getByRole("button", { name: "Connect", exact: true })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(example).not.toHaveText(simplifiedExample!);
  const connectedExample = await example.textContent();
  await page.keyboard.press("Tab");
  await expect(modes.getByRole("button", { name: "Test me", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(example).not.toHaveText(connectedExample!);

  const question = page.locator("details").first();
  await question.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(question).toHaveAttribute("open", "");
  await expect(question.locator("p")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(question).not.toHaveAttribute("open", "");
});

test("launch page fits phone, tablet, and desktop widths", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The viewport matrix runs once; other journeys also run on mobile.");
  for (const viewport of [{ width: 390, height: 844 }, { width: 834, height: 1112 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `Horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
    await expect(page.getByRole("link", { name: /Explore a dissection/i }).first()).toBeVisible();
  }
});

test("accessible atlas supports onboarding, selection, and saved progress", async ({ page }, testInfo) => {
  await page.goto("/lab");
  await page.getByRole("button", { name: /Use accessible 2D atlas/i }).click();
  await expect(page.getByRole("region", { name: /two-dimensional accessible atlas/i })).toBeVisible();
  await page.getByTestId("atlas-aorta").click();
  await expect(page.getByText("Reviewed content", { exact: true })).toBeVisible();
  await expect(page.getByText("Aorta", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("You're in control")).toBeHidden({ timeout: 5_000 });
  if (testInfo.project.name === "desktop-chromium") {
    await page.screenshot({ path: "docs/screenshots/lab-desktop.png", fullPage: true });
  } else {
    await page.screenshot({ path: "docs/screenshots/lab-mobile.png", fullPage: true });
  }
  await page.reload();
  await expect(page.getByRole("button", { name: "Accessible 2D atlas" })).toHaveAttribute("aria-pressed", "true");
});

test("three-dimensional dissection loads for desktop learners", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The mobile proof uses the accessible atlas.");
  await page.goto("/lab");
  await page.getByRole("button", { name: /Continue with mouse/i }).click();
  await expect(page.locator('canvas[data-engine="three.js r185"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Preparing laboratory…")).toBeHidden({ timeout: 30_000 });
  await expect(page.getByText("You're in control")).toBeHidden({ timeout: 5_000 });
  await page.screenshot({ path: "docs/screenshots/lab-3d-desktop.png", fullPage: true });
});

test("primary pages have no automatically detectable accessibility violations", async ({ page }) => {
  await page.goto("/");
  const landing = await new AxeBuilder({ page }).analyze();
  expect(landing.violations).toEqual([]);

  await page.goto("/lab");
  await page.getByRole("button", { name: /Use accessible 2D atlas/i }).click();
  const lab = await new AxeBuilder({ page }).analyze();
  expect(lab.violations).toEqual([]);
});

test("reduced motion preference disables long-running decorative motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const motion = await page.locator(".landing-page").evaluate((element) => ({
    scrollBehavior: getComputedStyle(element).scrollBehavior,
    continuousAnimations: element.getAnimations({ subtree: true }).filter((animation) => animation.effect?.getTiming().iterations === Infinity).length,
  }));
  expect(motion.scrollBehavior).toBe("auto");
  expect(motion.continuousAnimations).toBe(0);
});
