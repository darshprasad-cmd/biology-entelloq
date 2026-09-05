import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("landing page communicates value and navigates to the lab", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Understand living systems");
  await expect(page.getByRole("link", { name: /Explore a dissection/i }).first()).toBeVisible();
  if (testInfo.project.name === "desktop-chromium") {
    await page.screenshot({ path: "docs/screenshots/landing-desktop.png", fullPage: true });
  } else {
    await page.screenshot({ path: "docs/screenshots/landing-mobile.png", fullPage: true });
  }
  await page.getByRole("link", { name: /Explore a dissection/i }).first().click();
  await expect(page).toHaveURL(/\/lab$/);
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
  const duration = await page.locator(".preview-heart__flow--one").evaluate((element) => getComputedStyle(element).animationDuration);
  expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.001);
});
