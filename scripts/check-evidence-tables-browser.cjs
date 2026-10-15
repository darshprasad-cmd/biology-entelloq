/* Real table/layout checks. These do not validate screen-reader speech or
 * physical touch hardware. Authored lesson data and application code are never
 * replaced. The optional negative control restores the exact accepted CSS in
 * one disposable page, then reloads before testing the current implementation. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { checkEvidenceTable, evidenceTableMetrics, scrollEvidenceTableEdge } = require('../tests/evidence-tables-browser.cjs');
const root = path.resolve(__dirname, '..');
const { chromium } = createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES || 'C:/Users/darsh/biology-entelloq/node_modules', '__evidence__.cjs'))('playwright');
const base = (process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3045').replace(/\/$/, '');
const packaged = process.env.BIOLOGY_EVIDENCE_TABLES_PACKAGED === '1';
const baseline = process.env.BIOLOGY_EVIDENCE_TABLES_BASELINE === '1';
const negativeControl = process.env.BIOLOGY_EVIDENCE_TABLES_NEGATIVE === '1';
const focused = process.env.BIOLOGY_EVIDENCE_TABLES_FOCUSED === '1';
const output = path.resolve(process.env.BIOLOGY_EVIDENCE_TABLES_OUTPUT || path.join(root, 'docs/evidence-tables/browser'));
const cases = focused ? ['recombinant-dna', 'plant-transport', 'active-transport'] : ['recombinant-dna', 'hardy-weinberg', 'active-transport', 'plant-transport', 'rough-er', 'plant-tissues', 'gene-regulation', 'phylogenetic-trees', 'meiosis'];
const report = { base, packaged, baseline, focused, complete: false, catalog: null, cases: [], mobileCatalog: [], errors: [], cameraRequests: 0 };
const tableSelector = '[data-depth-task="investigation"] .bd-table-wrap';
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 320, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
    await context.exposeBinding('__evidenceCameraRequest', () => { report.cameraRequests++; });
    await context.addInitScript(() => {
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => {
        await window.__evidenceCameraRequest();
        throw new Error('No camera request is allowed in evidence-table checks');
      };
    });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.setDefaultNavigationTimeout(360000);
    page.on('pageerror', error => report.errors.push(error.message));
    async function open(id, section = 'learn') {
      const route = (section === 'learn' ? 'topic/' : 'learn/') + id + '/advanced';
      await page.goto(packaged ? base + '/#' + section + '/' + route : base + '/' + section + '.html#' + route, { waitUntil: 'domcontentloaded' });
      let world = page;
      if (packaged) {
        await page.locator('#bioq-workspace').waitFor();
        const shell = await (await page.locator('#bioq-workspace').elementHandle()).contentFrame();
        await shell.locator('#viewFrame.on').waitFor();
        world = await (await shell.locator('#viewFrame').elementHandle()).contentFrame();
      }
      await world.locator('[data-depth-topic="' + id + '"]').waitFor();
      return world;
    }
    async function theme(world, value) {
      const owner = packaged ? world.parentFrame() : world;
      if (await owner.locator('html').getAttribute('data-theme') !== value) {
        if (await owner.locator('#themeBtn').isVisible()) await owner.locator('#themeBtn').click();
        else {
          assert.ok(packaged);
          await owner.locator('#exploreBtn').click();
          await owner.locator('#exploreTheme').click();
          await owner.locator('#exploreClose').click();
        }
      }
      await owner.waitForFunction(value => document.documentElement.dataset.theme === value, value);
      await world.waitForFunction(value => document.documentElement.dataset.theme === value, value);
      await page.waitForTimeout(350);
    }
    async function edges(table, direction) {
      return scrollEvidenceTableEdge(page, table, direction);
    }
    const measure = evidenceTableMetrics;
    if (packaged) {
      const response = await page.request.get(base + '/', { timeout: 360000, headers: { 'Cache-Control': 'no-cache' } });
      assert.equal(response.status(), 200);
      const served = await response.body();
      assert.ok(served.equals(fs.readFileSync(path.resolve(process.env.BIOLOGY_DEPLOYED_ARTIFACT || path.join(root, 'dist/index.html')))), 'Served artifact equals the specified package byte-for-byte');
      report.artifactSha256 = crypto.createHash('sha256').update(served).digest('hex');
    }
    let world = await open(cases[0]);
    if (negativeControl) {
      assert.equal(packaged, false, 'The optional original-CSS control runs only on source');
      const revision = 'cb3014820cdb72aa27eefab07da75f3bfef6a9ca';
      const normalize = css => css.replace(/\r\n/g, '\n').trimEnd() + '\n';
      const original = normalize(require('node:child_process').execFileSync('git', ['show', revision + ':src/library/depth-study.css'], { cwd: root, encoding: 'utf8' }));
      const current = normalize(fs.readFileSync(path.join(root, 'src/library/depth-study.css'), 'utf8'));
      await theme(world, 'dark');
      assert.equal(await world.evaluate(({ current, original }) => {
        const matches = [...document.querySelectorAll('style')].filter(style => style.textContent.includes(current));
        for (const style of matches) style.textContent = style.textContent.replace(current, original);
        return matches.length;
      }, { current, original }), 1, 'Restore only the exact existing evidence stylesheet for the negative control');
      let rejected;
      try { await checkEvidenceTable(page, world); } catch (error) { rejected = error.message; }
      assert.match(rejected || '', /complete labels and column/, 'Original CSS must fail the same pinned-label contract');
      report.negativeControl = { revision, cssSha256: crypto.createHash('sha256').update(original).digest('hex'), expectedFailure: rejected };
      await page.screenshot({ path: path.join(output, 'original-css-negative-control.png') });
      await page.reload({ waitUntil: 'domcontentloaded' });
      world = await open(cases[0]);
      await world.addStyleTag({ content: '.bd-table-wrap thead th:first-child,.bd-table-wrap tbody th[scope="row"]{background:transparent!important}' });
      rejected = null;
      try { await checkEvidenceTable(page, world); } catch (error) { rejected = error.message; }
      assert.match(rejected || '', /opaque background/, 'Transparent pinned labels must fail the independent opacity contract');
      report.transparentNegativeControl = { expectedFailure: rejected };
      await page.screenshot({ path: path.join(output, 'transparent-label-negative-control.png') });
      fs.writeFileSync(path.join(output, 'negative-controls.json'), JSON.stringify({ originalCss: report.negativeControl, transparentLabels: report.transparentNegativeControl }, null, 2) + '\n');
      console.log('Both negative controls passed: original CSS rejects missing pinned labels; transparent pinned labels reject non-opaque backgrounds.');
      await page.reload({ waitUntil: 'domcontentloaded' });
      world = await open(cases[0]);
    }
    report.catalog = await world.evaluate(() => {
      const tables = Object.entries(BIO_DEPTH).map(([id, unit]) => {
        const task = unit.investigation;
        return { id, title: task.title, columns: task.columns, rows: task.rows,
          longestLabel: Math.max(...task.rows.map(row => String(row[0]).length)),
          longestValue: Math.max(...task.rows.flatMap(row => row.slice(1)).map(value => String(value).length)),
          longestHeading: Math.max(...task.columns.map(value => value.length)) };
      });
      return { count: tables.length, columnCounts: tables.reduce((counts, task) => { counts[task.columns.length] = (counts[task.columns.length] || 0) + 1; return counts; }, {}), tables };
    });
    assert.equal(report.catalog.count, 109);
    for (const width of (baseline ? [320, 390] : [320, 390, 768, 1440])) {
      await page.setViewportSize({ width, height: 1000 });
      for (const id of cases) for (const section of (baseline ? ['learn'] : ['learn', 'reason'])) {
        world = await open(id, section);
        const authored = report.catalog.tables.find(table => table.id === id);
        for (const selectedTheme of ['dark', 'light']) {
          await theme(world, selectedTheme);
          const table = world.locator(tableSelector);
          assert.equal(await table.getAttribute('role'), 'region');
          assert.equal(await table.getAttribute('tabindex'), '0');
          assert.equal(await table.getAttribute('aria-label'), 'Evidence table');
          assert.equal(await table.locator('caption').innerText(), authored.title);
          assert.deepEqual(await table.locator('thead th[scope="col"]').allTextContents(), authored.columns);
          assert.equal(await table.locator('tbody th[scope="row"]').count(), authored.rows.length);
          assert.deepEqual(await table.locator('tbody tr').evaluateAll(rows => rows.map(row => [...row.cells].map(cell => cell.textContent.trim()))), authored.rows);
          await table.scrollIntoViewIfNeeded();
          await edges(table, 'left');
          const before = await measure(table);
          assert.ok(before.allLabelsVisible, 'Row labels are initially visible');
          const stem = id + '-' + section + '-' + width + '-' + selectedTheme;
          await page.screenshot({ path: path.join(output, stem + '-left.png') });
          await edges(table, 'right');
          const after = await measure(table);
          assert.ok(after.lastColumnVisible, 'The last header/value column can be read');
          assert.equal(await table.evaluate(el => el === document.activeElement && el.matches(':focus-visible')), true, 'The table keeps native visible keyboard focus');
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No outer page overflow');
          assert.ok(await world.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No lesson overflow');
          await page.screenshot({ path: path.join(output, stem + '-right.png') });
          report.cases.push({ id, section, width, theme: selectedTheme, before, after });
          if (!baseline) {
            assert.ok(after.allLabelsVisible, 'Every complete row label remains visible at the right edge');
            assert.ok(after.labelsAndLastColumnSeparate, 'Labels do not cover the complete final value column');
            assert.equal(after.hasCellOverflow, false, 'Long labels, headings and values wrap without internal clipping');
            await checkEvidenceTable(page, world);
          }
        }
      }
    }
    if (!baseline && !focused) {
      for (const [width, selectedTheme] of [[320, 'dark'], [390, 'light']]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const authored of report.catalog.tables) {
          world = await open(authored.id);
          await theme(world, selectedTheme);
          const table = world.locator(tableSelector);
          assert.deepEqual(await table.locator('thead th[scope="col"]').allTextContents(), authored.columns);
          assert.deepEqual(await table.locator('tbody tr').evaluateAll(rows => rows.map(row => [...row.cells].map(cell => cell.textContent.trim()))), authored.rows);
          await table.scrollIntoViewIfNeeded();
          const checked = await checkEvidenceTable(page, world);
          assert.ok(await world.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          report.mobileCatalog.push({ id: authored.id, width, theme: selectedTheme, columns: checked.columns });
          if (report.mobileCatalog.length % 25 === 0) console.log('Evidence-table catalog: ' + report.mobileCatalog.length + '/218 passed');
        }
      }
      assert.equal(report.mobileCatalog.length, 218);
    }
    assert.deepEqual(report.errors, []);
    assert.equal(report.cameraRequests, 0);
    report.complete = true;
  } catch (error) { report.failure = error.stack; throw error; }
  finally { fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close(); }
  console.log(JSON.stringify({ complete: report.complete, baseline, focused, cases: report.cases.length, mobileCatalog: report.mobileCatalog.length, rowLabelsLostAtRight: report.cases.filter(row => !row.after.allLabelsVisible).length, errors: report.errors, cameraRequests: report.cameraRequests, artifactSha256: report.artifactSha256 }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
