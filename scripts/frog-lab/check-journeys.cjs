const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const runtime = process.env.FROG_NODE_MODULES || path.resolve(__dirname, "../../../biology-entelloq/node_modules");
const { chromium, expect } = require(path.join(runtime, "@playwright/test"));
const AxeBuilder = require(path.join(runtime, "@axe-core/playwright")).default;
const baseUrl = process.env.FROG_BASE_URL || "http://127.0.0.1:3001";
const output = path.resolve(__dirname, "../../docs/frog-lab");
const results = [];
const filter = process.argv.find((argument) => argument.startsWith("--filter="))?.slice(9);
const reportName = filter ? `journeys-${filter.replace(/[^a-z0-9-]+/gi, "-")}.json` : "journeys.json";

async function run(name, work) {
  if (filter && !name.includes(filter)) return;
  const started = Date.now();
  console.log(`RUN ${name}`);
  try {
    const details = await work();
    results.push({ name, ok: true, durationMs: Date.now() - started, details });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, ok: false, durationMs: Date.now() - started, error: error.stack, diagnostics: error.diagnostics });
    console.error(`FAIL ${name}: ${error.message}`);
  }
  fs.writeFileSync(path.join(output, reportName), JSON.stringify(results, null, 2) + "\n");
}

async function launchFrog(browser, viewport, options = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: options.touch || false, isMobile: options.touch || false, reducedMotion: options.reducedMotion || "no-preference" });
  context.setDefaultTimeout(30000);
  if (options.noCamera) await context.addInitScript(() => {
    window.__frogTestCameraRequests = 0;
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => {
      window.__frogTestCameraRequests++;
      return Promise.reject(new DOMException("Camera disabled by regression scenario", "NotAllowedError"));
    };
  });
  if (options.noStorage) await context.addInitScript(() => {
    for (const method of ["getItem", "setItem", "removeItem"]) {
      Storage.prototype[method] = () => { throw new DOMException("Storage unavailable in regression scenario", "SecurityError"); };
    }
  });
  if (options.noWebGL) await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      return /^(webgl2?|experimental-webgl)$/.test(type) ? null : original.call(this, type, ...args);
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseUrl}/app.html#lab`, { waitUntil: "domcontentloaded" });
  const iframe = page.locator("#launchFrame");
  await iframe.waitFor({ state: "visible" });
  const frame = await (await iframe.elementHandle()).contentFrame();
  await frame.waitForFunction(() => window.__LAB?.ok && window.__LAB.dissection?.pinning?.enabled);
  await frame.locator("#frog-workspace").waitFor({ state: "visible" });
  await frame.evaluate(() => {
    window.__frogTestEvents = [];
    for (const type of ["pointerdown", "pointerup", "pointercancel"]) addEventListener(type, (event) => {
      window.__frogTestEvents.push({ type, pointerType: event.pointerType, x: event.clientX, y: event.clientY, target: event.target.id || event.target.tagName, tool: window.__LAB.tool });
    }, true);
  });
  console.log(`  Ready ${viewport.width}x${viewport.height}`);
  return { context, page, frame, iframe, errors };
}

const snapshot = (frame) => frame.evaluate(() => window.__LAB.dissection.pinning);
const pinCount = (frame, count) => expect.poll(async () => (await snapshot(frame)).count).toBe(count);
async function click(locator) {
  const label = locator.toString();
  console.log(`    Click ${label}`);
  await performClick(locator, label);
}
async function bounded(promise, label) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Browser operation exceeded 30 seconds: ${label}`)), 30000); })]); }
  finally { clearTimeout(timer); }
}
async function performClick(locator, label) {
  let bounds;
  // Combine layout/visibility/enabled/hit checks into one browser read instead
  // of four round trips. This keeps the same safety checks on software GPUs.
  await bounded(expect.poll(async () => {
    bounds = await locator.evaluate((element) => {
    element.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    const rect = element.getBoundingClientRect();
    const enabled = !element.matches(":disabled") && element.getAttribute("aria-disabled") !== "true";
    const visible = rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden";
    const ownHit = element.ownerDocument.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    let centerClear = !!ownHit && (ownHit === element || element.contains(ownHit));
    let x = rect.x, y = rect.y, current = element.ownerDocument.defaultView;
    while (current.frameElement) {
      const frameElement = current.frameElement;
      const outer = frameElement.getBoundingClientRect(); x += outer.x; y += outer.y; current = current.parent;
      centerClear = centerClear && current.document.elementFromPoint(x + rect.width / 2, y + rect.height / 2) === frameElement;
    }
    return { x, y, width: rect.width, height: rect.height, centerClear, enabled, visible };
    });
    return bounds.enabled && bounds.visible;
  }, { timeout: 30000 }).toBe(true), `${label} layout`);
  assert(bounds && bounds.width > 0 && bounds.height > 0, "The control must have a visible pointer target");
  assert(bounds.centerClear, "The control center must not be covered in either its own document or its host");
  // Real pointer events without Playwright's iframe navigation/scroll wait;
  // successful state transitions are asserted separately after every action.
  await bounded(locator.page().mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2), `${label} pointer dispatch`);
}

async function screenPoint(session, targetId, localPoint) {
  const position = await session.frame.evaluate(({ targetId, localPoint }) => {
    const lab = window.__LAB, specimen = lab.parts[0].mesh.parent;
    const center = localPoint || lab.dissection.pinning.targets.find((target) => target.id === targetId).center;
    specimen.updateMatrixWorld(true); lab.camera.updateMatrixWorld(true);
    const point = new lab.THREE.Vector3(...center).applyMatrix4(specimen.matrixWorld).project(lab.camera);
    const screen = { x: (point.x + 1) * innerWidth / 2, y: (1 - point.y) * innerHeight / 2, depth: point.z };
    const covering = document.elementFromPoint(screen.x, screen.y);
    window.__frogTestProjection = { targetId, localPoint: center, screen,
      covering: { tag: covering?.tagName, id: covering?.id, className: covering?.className?.toString() },
      projectedPin: lab.dissection.projectPin(screen.x / innerWidth, screen.y / innerHeight) };
    return { ...screen, coveringTag: covering?.tagName };
  }, { targetId, localPoint });
  const bounds = await session.page.evaluate(() => { const rect = document.getElementById("launchFrame").getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; });
  assert(bounds, "The immersive iframe must have a layout box");
  assert(position.depth >= -1 && position.depth <= 1, "Pin target must be within camera clipping range");
  assert(position.x > 0 && position.x < bounds.width && position.y > 0 && position.y < bounds.height, "Pin target must remain visible within viewport");
  assert.equal(position.coveringTag, "CANVAS", "The authored pin target must not be covered by interface chrome");
  return { x: bounds.x + position.x, y: bounds.y + position.y };
}

async function pointInput(session, point, touch) {
  if (touch) await session.page.touchscreen.tap(point.x, point.y);
  else {
    await session.page.mouse.click(point.x, point.y);
  }
}

async function pointerJourney(browser, name, viewport, touch) {
  const session = await launchFrog(browser, viewport, { touch });
  const { context, page } = session;
  let frame = session.frame;
  try {
    await expect(frame.locator("#frog-continue")).toBeDisabled();
    await expect(frame.locator('#dock [data-tool="scalpel"]')).toHaveAttribute("aria-disabled", "true");
    await expect(frame.getByRole("button", { name: "Console", exact: true })).toBeHidden();
    await click(frame.locator('#dock [data-tool="pins"]'));
    console.log(`  ${name}: pin tool selected`);
    const targets = (await snapshot(frame)).targets;
    const invalidPoint = await screenPoint(session, targets[0].id, [0, targets[0].center[1], 0]);
    await pointInput(session, invalidPoint, touch);
    console.log(`  ${name}: unsafe placement attempted`);
    await pinCount(frame, 0);
    await expect(frame.locator("#frog-feedback")).toContainText(/distal|joint|torso|region/i);
    await page.screenshot({ path: path.join(output, `invalid-${name}.png`) });
    for (let index = 0; index < targets.length; index++) {
      const point = await screenPoint(session, targets[index].id);
      await pointInput(session, point, touch);
      await pinCount(frame, index + 1);
      console.log(`  ${name}: ${index + 1}/4 pinned`);
      await expect(frame.locator("#frog-pin-count")).toContainText(`${index + 1} / 4`);
    }
    await expect(frame.locator("#frog-continue")).toBeEnabled();
    if (viewport.width <= 760) await click(frame.locator(".fw-mobile-toggle"));
    await click(frame.locator("#frog-undo"));
    await pinCount(frame, 3);
    await expect(frame.locator("#frog-continue")).toBeDisabled();
    if (viewport.width <= 760) await click(frame.locator(".fw-mobile-toggle"));
    await pointInput(session, await screenPoint(session, targets[3].id), touch);
    await pinCount(frame, 4);
    const saved = (await snapshot(frame)).anchors;
    await page.screenshot({ path: path.join(output, `pinned-${name}.png`) });
    await page.reload({ waitUntil: "domcontentloaded" });
    session.frame = frame = await (await session.iframe.elementHandle()).contentFrame();
    await frame.waitForFunction(() => window.__LAB?.dissection?.pinning?.count === 4);
    assert.deepEqual((await snapshot(frame)).anchors, saved, "Reload must restore exact valid anchors");
    await click(frame.locator("#frog-continue"));
    await expect.poll(async () => (await snapshot(frame)).confirmed).toBe(true);
    assert.equal(await frame.evaluate(() => window.__LAB.dissection.canUseTool("scalpel")), true);
    await click(frame.locator('#dock [data-tool="probe"]'));
    await expect.poll(() => frame.evaluate(() => window.__LAB.tool)).toBe("probe");
    await click(frame.locator('#dock [data-tool="scalpel"]'));
    await expect.poll(() => frame.evaluate(() => window.__LAB.tool)).toBe("scalpel");
    assert.deepEqual(session.errors, [], "The complete practical must not produce uncaught errors");
    return { pinned: 4, exactAnchorsRestored: true, errors: session.errors };
  } catch (error) {
    error.diagnostics = await frame.evaluate(() => ({
      pointerEvents: window.__frogTestEvents,
      projection: window.__frogTestProjection,
      pinning: window.__LAB.dissection.pinning,
      tool: window.__LAB.tool,
      input: window.__LAB.input,
    })).catch(() => null);
    await page.screenshot({ path: path.join(output, `failure-${name}.png`) }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    await run("desktop pointer pinning, rejection, undo and resume", () => pointerJourney(browser, "desktop", { width: 1440, height: 1000 }, false));
    await run("tablet touch pinning, rejection, undo and resume", () => pointerJourney(browser, "tablet", { width: 834, height: 1112 }, true));
    await run("phone touch pinning, rejection, undo and resume", () => pointerJourney(browser, "mobile", { width: 390, height: 844 }, true));

    await run("keyboard anchor adjustment, confirmation and reset", async () => {
      const session = await launchFrog(browser, { width: 1440, height: 1000 });
      try {
        const targets = (await snapshot(session.frame)).targets;
        for (const target of targets) {
          const button = session.frame.locator(`[data-pin-target="${target.id}"]`);
          await button.focus();
          await session.page.keyboard.press("Space");
          await session.page.keyboard.press("ArrowRight");
          await session.page.keyboard.press("ArrowRight");
          await session.page.keyboard.press("ArrowRight");
          await session.page.keyboard.press("Enter");
          const anchor = (await snapshot(session.frame)).anchors[target.id];
          assert(anchor, "Enter must place the selected valid pin");
          assert(Math.abs(anchor[0] - target.center[0] - 0.12) < 0.00001, "Repeated arrow moves and Enter must preserve the proposed anchor");
        }
        await pinCount(session.frame, 4);
        await click(session.frame.locator("#frog-reset"));
        await pinCount(session.frame, 0);
        await expect(session.frame.locator("#frog-continue")).toBeDisabled();
        assert.deepEqual(session.errors, []);
      } finally { await session.context.close(); }
    });

    await run("accessible 2D practical and exploration prerequisites", async () => {
      const session = await launchFrog(browser, { width: 1440, height: 1000 });
      try {
        await click(session.frame.locator("#frog-atlas-toggle"));
        await expect(session.frame.getByRole("region", { name: "Accessible two-dimensional frog diagram" })).toBeVisible();
        for (let index = 0; index < 4; index++) {
          const mapTarget = session.frame.locator("#frog-map-pins [role=button]").nth(index);
          await mapTarget.focus();
          await session.page.keyboard.press("Enter");
          await pinCount(session.frame, index + 1);
          await expect(session.frame.locator("#frog-map-pins [role=button]").nth(index)).toBeFocused();
        }
        await click(session.frame.locator('[data-fw-drawer="anatomy"]'));
        await session.frame.locator("#frog-mode").selectOption("explore");
        assert.equal((await snapshot(session.frame)).mode, "explore");
        assert.equal((await snapshot(session.frame)).confirmed, false);
        await expect(session.frame.locator("#frog-continue")).toBeDisabled();
        await click(session.frame.locator("#frog-structures").getByRole("button", { name: "Heart", exact: true }));
        assert.equal(await session.frame.evaluate(() => window.__LAB.parts.find((part) => part.id === "frog-heart").mesh.visible), true);
        await session.frame.locator("#frog-mode").selectOption("guided");
        assert.equal(await session.frame.evaluate(() => window.__LAB.parts.find((part) => part.id === "skin").mesh.visible), true, "Guided mode must restore the intact surface");
        assert.equal(await session.frame.evaluate(() => window.__LAB.parts.find((part) => part.id === "frog-heart").mesh.visible), false, "Guided mode must hide unearned internal layers");
        await click(session.frame.locator("#frog-anatomy .fw-close"));
        await expect(session.frame.locator("#frog-continue")).toBeEnabled();
        await session.frame.locator("#frog-atlas-toggle").focus();
        await session.page.keyboard.press("\\");
        await expect(session.frame.getByRole("button", { name: "Console", exact: true })).toBeHidden();
        await expect(session.frame.locator("#drawer")).toBeHidden();
        await expect(session.frame.locator("#drawer")).not.toHaveClass(/\bopen\b/);
        assert.deepEqual(session.errors, []);
      } finally { await session.context.close(); }
    });

    await run("WebGL failure recovers to usable 2D pinning", async () => {
      const session = await launchFrog(browser, { width: 834, height: 1112 }, { noWebGL: true });
      try {
        assert.equal(await session.frame.evaluate(() => window.__LAB.fallback), true);
        await expect(session.frame.locator("#frog-atlas")).toBeVisible();
        for (let index = 0; index < 4; index++) {
          await click(session.frame.locator("#frog-map-pins [role=button]").nth(index));
          await pinCount(session.frame, index + 1);
        }
        await click(session.frame.locator("#frog-continue"));
        assert.equal((await snapshot(session.frame)).confirmed, true);
        assert.deepEqual(session.errors, []);
      } finally { await session.context.close(); }
    });

    await run("unavailable storage remains honest and session-usable", async () => {
      const session = await launchFrog(browser, { width: 834, height: 1112 }, { noWebGL: true, noStorage: true });
      try {
        assert.equal((await snapshot(session.frame)).saveAvailable, false);
        await expect(session.frame.locator("#frog-saved")).toContainText("this session only");
        for (let index = 0; index < 4; index++) {
          await click(session.frame.locator("#frog-guide"));
          await pinCount(session.frame, index + 1);
        }
        await expect(session.frame.locator("#frog-guide")).toBeDisabled();
        await expect(session.frame.locator("#frog-continue")).toBeEnabled();
        await click(session.frame.locator("#frog-reset"));
        await pinCount(session.frame, 0);
        assert.deepEqual(session.errors, []);
      } finally { await session.context.close(); }
    });

    await run("reduced motion, settings and workspace accessibility", async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      try {
        await page.goto(`${baseUrl}/lab.html?instant=1`);
        await page.waitForFunction(() => window.__LAB?.dissection?.pinning?.enabled);
        const infiniteAnimations = await page.locator("#frog-workspace").evaluate((element) => element.getAnimations({ subtree: true }).filter((animation) => animation.effect?.getTiming().iterations === Infinity).length);
        assert.equal(infiniteAnimations, 0);
        await click(page.locator('[data-fw-drawer="settings"]'));
        await click(page.locator('[data-presentation="minimal"]'));
        await expect(page.locator('[data-presentation="minimal"]')).toHaveAttribute("aria-pressed", "true");
        await page.locator("#frog-quality").selectOption("0");
        await click(page.locator("#frog-settings .fw-close"));
        const audit = await new AxeBuilder({ page }).analyze();
        fs.writeFileSync(path.join(output, "accessibility.json"), JSON.stringify(audit.violations, null, 2) + "\n");
        assert.deepEqual(audit.violations, [], "The direct lab page must pass automatic accessibility checks");
        return { violations: audit.violations.length };
      } finally { await context.close(); }
    });
  } finally { await browser.close(); }
  console.log(`${results.filter((result) => result.ok).length}/${results.length} frog journeys passed`);
  if (results.some((result) => !result.ok)) process.exitCode = 1;
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = { launchFrog, click, snapshot, pinCount, output, baseUrl, chromium, expect, AxeBuilder };
