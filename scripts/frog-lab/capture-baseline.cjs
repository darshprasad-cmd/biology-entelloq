/* Run with node; Playwright is resolved from the existing local validation runtime. */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.FROG_PLAYWRIGHT_PATH || path.resolve(__dirname, "../../../biology-entelloq/node_modules/playwright"));

const baseUrl = process.env.FROG_BASE_URL || "http://127.0.0.1:3001";
const output = path.resolve(__dirname, "../../docs/frog-lab");
const phase = process.argv.includes("--after") ? "after" : "baseline";
const screenshotPrefix = phase === "baseline" ? "before" : "after";
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 },
];

async function capture() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ["--enable-precise-memory-info"] });
  const report = { capturedAt: new Date().toISOString(), phase, route: `${baseUrl}/app.html#lab`, methodology: `${phase === "baseline" ? "Unmodified shipped lab.html, no assembly." : "Updated repository-built lab.html."} Fresh context per viewport; DPR 1; three-second requestAnimationFrame sample. Headless Chromium is a repeatable local comparison, not school-device GPU certification.`, viewports: [] };
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: viewport.name === "mobile", hasTouch: viewport.name !== "desktop" });
      const page = await context.newPage();
      const consoleMessages = [], errors = [], requestsFailed = [], responses = [];
      page.on("console", (message) => { if (["warning", "error"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text() }); });
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("requestfailed", (request) => requestsFailed.push({ url: request.url(), error: request.failure()?.errorText }));
      page.on("response", (response) => responses.push({ url: response.url(), status: response.status(), bytes: Number(response.headers()["content-length"] || 0) }));
      await page.goto(report.route, { waitUntil: "domcontentloaded" });
      const frameElement = page.locator("#launchFrame");
      await frameElement.waitFor({ state: "visible" });
      const frame = await (await frameElement.elementHandle()).contentFrame();
      await frame.waitForFunction(() => window.__LAB?.ok && window.__LAB.parts?.length > 0);
      await frame.locator("#stage canvas").waitFor({ state: "visible" });
      const measurements = await frame.evaluate(async () => {
        const lab = window.__LAB;
        const THREE = lab.THREE;
        const specimen = lab.parts[0].mesh.parent;
        specimen.updateMatrixWorld(true);
        const scene = specimen.parent;
        const materials = new Map(), textures = new Map(), geometries = new Set(), bones = [], meshData = [];
        specimen.traverse((object) => {
          if (object.isBone) bones.push(object.name);
          if (!object.isMesh) return;
          const geometry = object.geometry;
          geometries.add(geometry.uuid);
          const bbox = new THREE.Box3().setFromObject(object);
          const materialArray = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materialArray) {
            materials.set(material.uuid, { name: material.name, type: material.type });
            for (const [slot, texture] of Object.entries(material)) {
              if (texture?.isTexture) textures.set(texture.uuid, { slot, width: texture.image?.width || 0, height: texture.image?.height || 0 });
            }
          }
          let visible = object.visible;
          for (let parent = object.parent; parent; parent = parent.parent) visible = visible && parent.visible;
          meshData.push({ name: object.name || "(unnamed)", partId: object.userData.partId || null, parentName: object.parent?.name || "(unnamed)", parentPartId: object.parent?.userData.partId || null, type: object.type, geometry: geometry.type, triangles: (geometry.index?.count || geometry.attributes.position?.count || 0) / 3, visible, position: object.position.toArray(), rotation: [object.rotation.x, object.rotation.y, object.rotation.z], scale: object.scale.toArray(), bounds: { min: bbox.min.toArray(), max: bbox.max.toArray() }, materialCount: materialArray.length, bones: object.skeleton?.bones?.map((bone) => bone.name) || [] });
        });
        let sceneMeshes = 0;
        scene?.traverse((object) => { if (object.isMesh) sceneMeshes++; });
        const frameTimes = await new Promise((resolve) => {
          const samples = [];
          let start = 0, previous = 0;
          function sample(now) {
            if (!start) start = previous = now;
            else { samples.push(now - previous); previous = now; }
            if (now - start >= 3000) resolve(samples);
            else requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        });
        const sorted = [...frameTimes].sort((a, b) => a - b);
        const heap = performance.memory ? { usedJSHeapSize: performance.memory.usedJSHeapSize, totalJSHeapSize: performance.memory.totalJSHeapSize } : null;
        const canvas = document.querySelector("#stage canvas");
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        const gpuDetails = gl?.getExtension("WEBGL_debug_renderer_info");
        const rendererIdentity = gl ? { vendor: gl.getParameter(gpuDetails ? gpuDetails.UNMASKED_VENDOR_WEBGL : gl.VENDOR), renderer: gl.getParameter(gpuDetails ? gpuDetails.UNMASKED_RENDERER_WEBGL : gl.RENDERER) } : null;
        const interfaceTargets = Array.from(document.querySelectorAll("#dock [data-tool], .fw-header [data-fw-drawer]")).map((element) => {
          const rect = element.getBoundingClientRect(), label = element.querySelector(".tname");
          const styles = getComputedStyle(label || element), outer = window.frameElement.getBoundingClientRect();
          const ownHit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
          const hostHit = parent.document.elementFromPoint(outer.x + rect.x + rect.width / 2, outer.y + rect.y + rect.height / 2);
          const exit = parent.document.getElementById("launchX")?.getBoundingClientRect();
          const overlapX = exit ? Math.max(0, Math.min(outer.x + rect.right, exit.right) - Math.max(outer.x + rect.left, exit.left)) : 0;
          const overlapY = exit ? Math.max(0, Math.min(outer.y + rect.bottom, exit.bottom) - Math.max(outer.y + rect.top, exit.top)) : 0;
          return { name: element.getAttribute("aria-label") || element.textContent.trim(), width: rect.width, height: rect.height,
            display: getComputedStyle(element).display, ownCenterClear: !!ownHit && (ownHit === element || element.contains(ownHit)),
            hostCenterClear: hostHit === window.frameElement, exitOverlapArea: overlapX * overlapY,
            label: label ? { fontSize: styles.fontSize, textTransform: styles.textTransform, clientWidth: label.clientWidth, scrollWidth: label.scrollWidth, clipped: label.scrollWidth > label.clientWidth } : null };
        });
        return {
          labReady: lab.ok, tool: lab.tool, pinned: Array.from(lab.dissection.state.pinned),
          camera: { position: lab.camera.position.toArray(), fov: lab.camera.fov },
          specimenTransform: { position: specimen.position.toArray(), rotation: [specimen.rotation.x, specimen.rotation.y, specimen.rotation.z], scale: specimen.scale.toArray() },
          parts: lab.parts.map((part) => ({ id: part.id, name: part.name, layer: part.layer, system: part.system, cuttable: part.cuttable, detachable: part.detachable })),
          meshData, bones, materialCount: materials.size, geometryCount: geometries.size, textures: Array.from(textures.values()), sceneMeshes,
          triangles: meshData.reduce((sum, mesh) => sum + mesh.triangles, 0), visibleTriangles: meshData.filter((mesh) => mesh.visible).reduce((sum, mesh) => sum + mesh.triangles, 0),
          frameSample: { durationMs: frameTimes.reduce((a, b) => a + b, 0), frames: frameTimes.length, meanFPS: 1000 * frameTimes.length / frameTimes.reduce((a, b) => a + b, 0), p50FrameMs: sorted[Math.floor(sorted.length * 0.5)], p95FrameMs: sorted[Math.floor(sorted.length * 0.95)] },
          heap, rendererIdentity, rendererInfo: lab.rendererInfo?.() || null, htmlNavigation: performance.getEntriesByType("navigation").map((entry) => ({ transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize, decodedBodySize: entry.decodedBodySize })),
          overflow: document.documentElement.scrollWidth - innerWidth, interfaceTargets,
          uiText: document.body.innerText,
        };
      });
      await page.screenshot({ path: path.join(output, `${screenshotPrefix}-${viewport.name}.png`) });
      // Page-level clipping avoids iframe screenshot stability waits while a
      // render loop remains active; it does not alter the visible scene.
      const stageBounds = await frame.evaluate(() => {
        const stage = document.querySelector("#stage").getBoundingClientRect();
        const outer = window.frameElement.getBoundingClientRect();
        return { x: stage.x + outer.x, y: stage.y + outer.y, width: stage.width, height: stage.height };
      });
      await page.screenshot({ path: path.join(output, `${screenshotPrefix}-${viewport.name}-scene.png`), clip: stageBounds });
      report.viewports.push({ ...viewport, measurements, consoleMessages, errors, requestsFailed, responses, requestedBytes: responses.reduce((sum, response) => sum + response.bytes, 0) });
      fs.writeFileSync(path.join(output, `${phase}.json`), JSON.stringify(report, null, 2) + "\n");
      console.log(`${viewport.name}: ${measurements.meshData.length} meshes, ${measurements.triangles} triangles, ${measurements.frameSample.meanFPS.toFixed(1)} sampled FPS, ${errors.length} page errors`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

capture().catch((error) => { console.error(error); process.exitCode = 1; });
