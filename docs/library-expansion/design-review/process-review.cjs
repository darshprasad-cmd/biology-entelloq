/* Focused local render evidence. Does not validate scientific efficacy or camera hardware. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/darsh/biology-entelloq/node_modules/playwright');
const report = { complete: false, errors: [], cameraRequests: 0, views: [], bounds: [] };
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await page.exposeFunction('recordCameraRequest', () => { report.cameraRequests++; });
    await page.addInitScript(() => {
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => { window.recordCameraRequest(); return Promise.reject(new Error('Camera forbidden in this diagnostic')); };
    });
    page.on('pageerror', error => report.errors.push(error.message));
    for (const width of [390, 1440]) for (const theme of ['dark', 'light']) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
      for (const id of ['nephron', 'pedigrees']) {
        await page.goto('http://127.0.0.1:3027/learn.html#topic/' + id + '/visual', { waitUntil: 'domcontentloaded' });
        await page.locator('.bl-diagram [data-process-sequence]').waitFor();
        await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
        await page.waitForTimeout(400);
        const diagram = page.locator('.bl-diagram');
        await diagram.scrollIntoViewIfNeeded();
        assert.equal(await page.locator('.bl-vis-top span').last().innerText(), 'Conceptual sequence');
        const count = await diagram.locator('[data-process-stage]').count();
        const selected = [];
        for (let stage = 0; stage < count; stage++) {
          assert.equal(await diagram.locator('[data-process-stage][data-active="true"]').getAttribute('data-process-stage'), String(stage));
          selected.push(await page.locator('.bl-stepdetail strong').innerText());
          const bounds = await page.locator('.bl-diagram svg').evaluate(svg => {
            const errors = [];
            for (const text of svg.querySelectorAll('text')) {
              const b = text.getBBox();
              if (b.x < -0.5 || b.x + b.width > 600.5 || b.y < -0.5 || b.y + b.height > 330.5) errors.push({ text: text.textContent, x: b.x, y: b.y, width: b.width, height: b.height });
            }
            for (const row of svg.querySelectorAll('[data-process-stage]')) {
              const rect = row.querySelector('rect').getBBox();
              for (const text of row.querySelectorAll(':scope > g text')) {
                const b = text.getBBox();
                if (b.x < rect.x || b.x + b.width > rect.x + rect.width || b.y < rect.y - 1 || b.y + b.height > rect.y + rect.height + 1) errors.push({ row: row.dataset.processStage, text: text.textContent, outsideStage: true });
              }
            }
            return errors;
          });
          assert.deepEqual(bounds, [], id + ' ' + width + ' ' + theme + ' stage ' + stage);
          if (stage === count - 1) await diagram.screenshot({ path: path.join(__dirname, `sequence-${id}-${width}-${theme}.png`) });
          await page.locator('[data-visual-action="next"]').click();
          assert.equal(await page.locator('[data-visual-action="next"]').evaluate(el => el === document.activeElement), true, 'Next preserves keyboard focus');
        }
        assert.equal(await diagram.locator('[data-process-stage][data-active="true"]').getAttribute('data-process-stage'), '0');
        await page.locator('[data-visual-action="next"]').click();
        await page.locator('[data-visual-action="back"]').click();
        assert.equal(await diagram.locator('[data-process-stage][data-active="true"]').getAttribute('data-process-stage'), '0');
        assert.equal(await page.locator('[data-visual-action="back"]').isDisabled(), true);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        report.views.push({ width, theme, topic: id, stageCount: count, selected });
      }
      report.bounds.push(await page.evaluate(({ width, theme }) => {
        const host = document.createElement('div');
        host.className = 'bl-diagram';
        host.style.width = Math.min(width - 44, 600) + 'px';
        document.querySelector('.bl-diagram').parentElement.append(host);
        const tested = [], errors = [];
        for (const topic of window.BIO_LIBRARY.topics) {
          const html = window.BioLibraryVisuals.preview(topic, { topics: window.BIO_LIBRARY.topics });
          if (!html.includes('data-process-sequence="true"')) continue;
          host.innerHTML = html;
          const svg = host.querySelector('svg');
          for (const text of svg.querySelectorAll('text')) {
            const b = text.getBBox();
            if (b.x < -0.5 || b.x + b.width > 600.5 || b.y < -0.5 || b.y + b.height > 330.5) errors.push({ id: topic.id, text: text.textContent, x: b.x, y: b.y, width: b.width, height: b.height });
          }
          for (const row of svg.querySelectorAll('[data-process-stage]')) {
            const rect = row.querySelector('rect').getBBox();
            for (const text of row.querySelectorAll(':scope > g text')) {
              const b = text.getBBox();
              if (b.x < rect.x || b.x + b.width > rect.x + rect.width || b.y < rect.y - 1 || b.y + b.height > rect.y + rect.height + 1) errors.push({ id: topic.id, text: text.textContent, outsideStage: true });
            }
          }
          tested.push(topic.id);
        }
        host.remove();
        return { width, theme, tested, errors };
      }, { width, theme }));
      assert.equal(report.bounds.at(-1).tested.length, 36);
      assert.deepEqual(report.bounds.at(-1).errors, [], 'Complete authored title render bounds');
    }
    assert.deepEqual(report.errors, []);
    assert.equal(report.cameraRequests, 0);
    report.complete = true;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(__dirname, 'process-review.json'), JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
