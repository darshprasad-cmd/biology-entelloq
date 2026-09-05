/* Renderer allocation counts across specimen replacement, not a heap leak proof. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const runtime = process.env.FROG_NODE_MODULES || path.resolve(__dirname, "../../../biology-entelloq/node_modules");
const { chromium } = require(path.join(runtime, "playwright"));
const baseUrl = process.env.FROG_BASE_URL || "http://127.0.0.1:3001";
const output = path.resolve(__dirname, "../../docs/frog-lab/resources.json");

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--enable-precise-memory-info"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const report = {
    capturedAt: new Date().toISOString(),
    route: `${baseUrl}/lab.html?instant=1`,
    methodology: "One Chromium context, default quality. Initial specimen plus five loadSpecimen('frog') replacements. Two animation frames after each replacement. Geometry/texture counts are renderer allocations, not bytes. JS heap is unforced-GC observation, not retained-memory proof.",
    samples: [],
    errors,
  };
  try {
    await page.goto(report.route, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__LAB?.rendererInfo && window.__LAB.dissection?.pinning?.enabled);
    for (let cycle = 0; cycle <= 5; cycle++) {
      const sample = await page.evaluate(async (cycle) => {
        if (cycle) window.__LAB.loadSpecimen("frog");
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const lab = window.__LAB;
        const specimen = lab.parts[0].mesh.parent;
        let specimenMeshes = 0;
        specimen.traverse((object) => { if (object.isMesh) specimenMeshes++; });
        return {
          cycle,
          renderer: lab.rendererInfo(),
          specimenMeshes,
          workspaceCount: document.querySelectorAll("#frog-workspace").length,
          heapUsed: performance.memory?.usedJSHeapSize ?? null,
        };
      }, cycle);
      report.samples.push(sample);
      fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
      console.log(`Cycle ${cycle}: ${sample.renderer.memory.geometries} geometries, ${sample.renderer.memory.textures} textures, ${sample.workspaceCount} workspace`);
      assert.equal(sample.workspaceCount, 1, "Restart must not accumulate UI instances");
      if (cycle > 1) {
        const warm = report.samples[1];
        assert.equal(sample.renderer.memory.geometries, warm.renderer.memory.geometries, "Restart must not accumulate renderer geometry allocations");
        assert.equal(sample.renderer.memory.textures, warm.renderer.memory.textures, "Restart must not accumulate renderer texture allocations");
        assert.equal(sample.specimenMeshes, warm.specimenMeshes, "Restart must preserve specimen inventory");
      }
    }
    assert.deepEqual(errors, [], "Specimen replacement must not throw");
    report.passed = true;
  } catch (error) {
    report.passed = false;
    report.error = error.stack;
    throw error;
  } finally {
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
