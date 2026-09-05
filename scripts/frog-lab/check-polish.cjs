/* Focused integration checks after the renderer/pinning suite is green. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { launchFrog, click, snapshot, pinCount, output, baseUrl, chromium, expect, AxeBuilder } = require("./check-journeys.cjs");
const artifactFingerprints = Object.fromEntries(["lab.html", "app.html", "assets/feature-tutorials.js", "assets/feature-tutorials.css"].map((file) => [file, crypto.createHash("sha256").update(fs.readFileSync(path.resolve(__dirname, "../..", file))).digest("hex")]));
const report = { capturedAt: new Date().toISOString(), artifactFingerprints, localLabSha256: artifactFingerprints["lab.html"], results: [] };
const extraOnly = process.argv.includes("--extra-only");
const phoneOnly = process.argv.includes("--phone-only");
const resume = process.argv.includes("--resume");
if (resume && !extraOnly && !phoneOnly && fs.existsSync(path.join(output, "polish.json"))) {
  const previous = JSON.parse(fs.readFileSync(path.join(output, "polish.json"), "utf8"));
  assert.deepEqual(previous.artifactFingerprints, artifactFingerprints, "Resume requires identical lab, parent app and tutorial JS/CSS fingerprints; missing fingerprints cannot be resumed");
  report.results = previous.results.filter((result) => result.ok);
  report.resumedFrom = previous.capturedAt;
}

async function inspectControls(frame) {
  return frame.evaluate(() => Array.from(document.querySelectorAll("#dock [data-tool], .fw-header [data-fw-drawer]")).flatMap((element) => {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height || getComputedStyle(element).visibility === "hidden") return [];
    const label = element.querySelector(".tname"), outer = window.frameElement.getBoundingClientRect();
    const ownHit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    const hostHit = parent.document.elementFromPoint(outer.x + rect.x + rect.width / 2, outer.y + rect.y + rect.height / 2);
    const exit = parent.document.getElementById("launchX")?.getBoundingClientRect();
    const overlapX = exit ? Math.max(0, Math.min(outer.x + rect.right, exit.right) - Math.max(outer.x + rect.left, exit.left)) : 0;
    const overlapY = exit ? Math.max(0, Math.min(outer.y + rect.bottom, exit.bottom) - Math.max(outer.y + rect.top, exit.top)) : 0;
    return [{ name: element.getAttribute("aria-label") || element.textContent.trim(), width: rect.width, height: rect.height,
      ownCenterClear: !!ownHit && (ownHit === element || element.contains(ownHit)), hostCenterClear: hostHit === window.frameElement,
      exitOverlapArea: overlapX * overlapY, labelClipped: !!label && label.scrollWidth > label.clientWidth,
      labelFont: label ? getComputedStyle(label).fontSize : null }];
  }));
}

async function openHelp(session, mobile) {
  if (mobile) {
    await click(session.frame.locator('.fw-header [data-fw-drawer="settings"]'));
    await click(session.frame.locator('#frog-settings [data-fw-drawer="help"]'));
  } else await click(session.frame.locator('.fw-header [data-fw-drawer="help"]'));
  await expect(session.frame.locator("#frog-help")).toBeVisible();
}

async function checkViewport(browser, name, viewport) {
  const mobile = name === "mobile";
  const session = await launchFrog(browser, viewport, { touch: name !== "desktop", noCamera: true });
  const { page, frame, context } = session;
  const result = { name, controls: [] };
  try {
    await page.screenshot({ path: path.join(output, `final-${name}.png`) });
    result.controls = await inspectControls(frame);
    for (const control of result.controls) {
      assert(control.ownCenterClear && control.hostCenterClear, `${control.name} must have an unobstructed center in both documents`);
      assert.equal(control.exitOverlapArea, 0, `${control.name} must not overlap the host Exit`);
      assert.equal(control.labelClipped, false, `${control.name} must display its full label`);
      assert(control.width >= 44 && control.height >= 44, `${control.name} must retain a 44px target`);
    }
    assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    await click(frame.locator('.fw-header [data-fw-drawer="settings"]'));
    await expect(frame.locator("#frog-settings")).toBeVisible();
    await click(frame.locator("#frog-settings .fw-close"));
    if (name === "desktop" || mobile) {
      await openHelp(session, mobile);
      await click(frame.locator("#frog-open-record"));
      await expect(frame.locator("#rec")).toBeVisible();
      await click(frame.locator("#recclose"));
      await expect(frame.locator("#rec")).toBeHidden();
      await openHelp(session, mobile);
      await click(frame.locator("#frog-open-viva"));
      await expect(frame.locator("#viva")).toBeVisible();
      await expect(frame.locator("#vq")).toContainText("pin the specimen");
      await click(frame.locator("#vclose"));
      await expect(frame.locator("#viva")).toBeHidden();
      result.helpRecordAndReview = true;
    }
    if (mobile) {
      await click(frame.locator('#dock [data-tool="probe"]'));
      await expect.poll(() => frame.evaluate(() => window.__LAB.tool)).toBe("probe");
      await click(frame.locator(".fw-mobile-toggle"));
      for (let index = 0; index < 4; index++) {
        await click(frame.locator("#frog-guide"));
        await pinCount(frame, index + 1);
      }
      await click(frame.locator("#frog-continue"));
      await click(frame.locator(".fw-mobile-toggle"));
      await click(frame.locator('#dock [data-tool="probe"]'));
      await expect.poll(() => frame.evaluate(() => window.__LAB.tool)).toBe("probe");
      await click(frame.locator('#dock [data-tool="scalpel"]'));
      await expect.poll(() => frame.evaluate(() => window.__LAB.tool)).toBe("scalpel");
      result.probeToScalpelTransition = true;
    }
    result.cameraRequests = await frame.evaluate(() => window.__frogTestCameraRequests);
    assert.equal(result.cameraRequests, 0, "Opening settings and help must not request a camera");
    assert.deepEqual(session.errors, []);
    if (name === "tablet") {
      console.log("    Check retained Heart → Frog specimen navigation");
      await click(frame.locator('.fw-header [data-fw-drawer="settings"]'));
      await click(frame.locator("#frog-switch-specimen"));
      await click(frame.locator("#cards .card").filter({ has: frame.getByRole("heading", { name: "Mammalian heart", exact: true }) }));
      await expect(frame.locator("#frog-workspace")).toHaveCount(0);
      await expect(frame.locator("body")).not.toHaveClass(/\bfrog-lab\b/);
      await expect(frame.locator("#pick")).toHaveClass(/\bgone\b/);
      await click(frame.locator('#dock [data-tool="probe"]'));
      await expect.poll(() => frame.evaluate(() => window.__LAB.tool)).toBe("probe");
      await click(frame.locator("#specbtn"));
      await click(frame.locator("#cards .card").filter({ has: frame.getByRole("heading", { name: "Frog", exact: true }) }));
      await expect(frame.locator("#frog-workspace")).toBeVisible();
      await expect(frame.locator("body")).toHaveClass(/\bfrog-lab\b/);
      await expect(frame.locator("#pick")).toHaveClass(/\bgone\b/);
      await pinCount(frame, 0);
      result.retainedHeartNavigation = true;
      assert.deepEqual(session.errors, []);
    }
    result.ok = true;
  } catch (error) {
    result.ok = false; result.error = error.stack;
    await page.screenshot({ path: path.join(output, `polish-failure-${name}.png`) }).catch(() => {});
  } finally { await context.close(); }
  return result;
}

async function checkTutorial(browser) {
  const session = await launchFrog(browser, { width: 1440, height: 1000 }, { noCamera: true });
  const result = { name: "nine-step feature tutorial compatibility", titles: [] };
  try {
    await click(session.frame.locator("#eqx-fab"));
    await click(session.frame.locator("#feature-guide-launch"));
    for (let index = 0; index < 9; index++) {
      await expect(session.frame.locator(".ft-count")).toContainText(`${index + 1} / 9`);
      result.titles.push(await session.frame.locator("#ft-title").textContent());
      await click(session.frame.locator("#ft-next"));
    }
    await expect(session.frame.locator("#feature-guide")).toBeHidden();
    assert.equal((await snapshot(session.frame)).count, 0, "Tutorial navigation must not award procedure progress");
    assert.equal(await session.frame.evaluate(() => window.__frogTestCameraRequests), 0);
    assert.deepEqual(session.errors, []);
    result.ok = true;
  } catch (error) { result.ok = false; result.error = error.stack; }
  finally { await session.context.close(); }
  return result;
}

async function checkAxe(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const result = { name: "final direct lab axe" };
  try {
    await page.goto(`${baseUrl}/lab.html?instant=1`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__LAB?.dissection?.pinning?.enabled);
    const audit = await new AxeBuilder({ page }).analyze();
    fs.writeFileSync(path.join(output, "accessibility-final.json"), JSON.stringify(audit.violations, null, 2) + "\n");
    assert.deepEqual(audit.violations, []);
    result.ok = true; result.violations = 0;
  } catch (error) { result.ok = false; result.error = error.stack; }
  finally { await context.close(); }
  return result;
}

async function checkRecoveryIntegration(browser) {
  const session = await launchFrog(browser, { width: 834, height: 1112 }, { noWebGL: true, noCamera: true });
  const result = { name: "final 2D view and host switcher restoration" };
  try {
    await expect(session.frame.locator("#frog-atlas")).toBeVisible();
    await expect(session.page.locator("#eqx-fab")).toBeHidden();
    await expect(session.frame.locator("#eqx-fab")).toBeVisible();
    await session.page.screenshot({ path: path.join(output, "final-2d.png") });
    await click(session.page.locator("#launchX"));
    await expect(session.page.locator("#launcher")).not.toHaveClass(/\bon\b/);
    await expect(session.page.locator("body")).not.toHaveClass(/\blab-open\b/);
    await expect(session.page.locator("#eqx-fab")).toBeVisible();
    assert.deepEqual(session.errors, []);
    result.ok = true;
  } catch (error) { result.ok = false; result.error = error.stack; }
  finally { await session.context.close(); }
  return result;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const write = () => fs.writeFileSync(path.join(output, extraOnly ? "polish-extra.json" : phoneOnly ? "polish-phone.json" : "polish.json"), JSON.stringify(report, null, 2) + "\n");
  write();
  try {
    if (!extraOnly) for (const [name, viewport] of [["desktop", { width: 1440, height: 1000 }], ["tablet", { width: 834, height: 1112 }], ["mobile", { width: 390, height: 844 }]]) {
      if (phoneOnly && name !== "mobile") continue;
      if (report.results.some((result) => result.name === name && result.ok)) { console.log(`KEEP passed ${name} (identical artifact)`); continue; }
      console.log(`RUN final ${name}`);
      const result = await checkViewport(browser, name, viewport); report.results.push(result); write();
      console.log(`${result.ok ? "PASS" : "FAIL"} final ${name}${result.error ? ": " + result.error : ""}`);
    }
    for (const work of extraOnly || phoneOnly ? [checkRecoveryIntegration] : [checkTutorial, checkAxe, checkRecoveryIntegration]) {
      const name = { checkTutorial: "nine-step feature tutorial compatibility", checkAxe: "final direct lab axe", checkRecoveryIntegration: "final 2D view and host switcher restoration" }[work.name];
      if (report.results.some((result) => result.name === name && result.ok)) { console.log(`KEEP passed ${name} (identical artifact)`); continue; }
      console.log(`RUN ${name}`);
      const result = await work(browser); report.results.push(result); write();
      console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}${result.error ? ": " + result.error : ""}`);
    }
  } finally { await browser.close(); write(); }
  if (report.results.some((result) => !result.ok)) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
