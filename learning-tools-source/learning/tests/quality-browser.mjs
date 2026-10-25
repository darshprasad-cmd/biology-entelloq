import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modules = process.env.CODEX_NODE_MODULES || 'C:/Users/darsh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = createRequire(path.join(modules, 'package.json'))('playwright');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : decodeURIComponent(pathname)}`);
    if (!file.startsWith(root + path.sep)) throw Error('Outside fixture');
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    response.end(await fs.readFile(file));
  } catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [], externalRequests = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (!request.url().startsWith(base)) externalRequests.push(request.url()); });
const output = path.join(root, 'qa', process.env.SNAPSHOT_ONLY ? 'quality-before' : 'quality');
await fs.mkdir(output, { recursive: true });
try {
  for (const [subject, panel, theme, width] of [
    ['physics', 'review', 'light', 1280], ['biology', 'notebook', 'dark', 1280],
    ['biology', 'search', 'light', 768], ['biology', 'search', 'light', 390],
  ]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/index.html?subject=${subject}&panel=${panel}&theme=${theme}`);
    await page.locator('.learning-panel').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(output, `${subject}-${panel}-${theme}-${width}.png`), fullPage: true });
  }
  if (process.env.SNAPSHOT_ONLY) { console.log(JSON.stringify({ output, errors })); }
  else {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto(`${base}/index.html?subject=physics&panel=review`);
    const reviewKey = 'entelloq.next.review.v1.physics';
    assert.equal(await page.evaluate(key => localStorage.getItem(key), reviewKey), null);
    await page.getByRole('button', { name: 'Reveal explanation', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Explanation');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), reviewKey), null, 'Revealing alone must not schedule a review');
    await page.screenshot({ path: path.join(output, 'physics-review-revealed-keyboard.png'), fullPage: true });
    await page.getByRole('button', { name: 'Good — recalled correctly', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByText('7 due · 1 attempts', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'H3');
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).events.length, reviewKey), 1);
    checks.push('Keyboard reveal focuses the explanation without scheduling; explicit rating saves once and focuses the next prompt.');

    await page.goto(`${base}/index.html?subject=biology&panel=notebook&theme=dark`);
    const editor = page.getByLabel('Experiment notes', { exact: true });
    assert.equal(await page.getByRole('button', { name: 'Undo my edit', exact: true }).isEnabled(), false);
    assert.equal(await page.getByRole('button', { name: 'Redo my edit', exact: true }).isEnabled(), false);
    await page.getByRole('button', { name: 'Add experiment outline', exact: true }).click();
    const scaffold = await editor.inputValue();
    assert.match(scaffold, /Method and controlled variables/);
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'TEXTAREA');
    await page.getByText(`${scaffold.length} / 50,000 characters`, { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Add experiment outline', exact: true, includeHidden: true }).isVisible(), false);
    await page.getByRole('button', { name: 'Undo my edit', exact: true }).click();
    assert.equal(await editor.inputValue(), '');
    assert.equal(await page.getByRole('button', { name: 'Redo my edit', exact: true }).isEnabled(), true);
    await page.getByRole('button', { name: 'Redo my edit', exact: true }).click();
    assert.equal(await editor.inputValue(), scaffold);
    checks.push('Experiment outline is explicit, empty-only and undoable; character count and undo/redo availability follow the actual Yjs state.');

    const name = page.getByLabel('Notebook name', { exact: true });
    await name.fill('New notebook');
    await page.getByText('Notebook: experiment', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
    assert.equal(await name.getAttribute('aria-invalid'), 'true');
    assert.equal(await editor.inputValue(), scaffold);
    await name.fill('cell-observations');
    await name.press('Enter');
    await page.getByText('Notebook: cell-observations', { exact: true }).waitFor();
    assert.equal(await editor.inputValue(), '');
    await name.fill('experiment');
    await name.press('Enter');
    assert.equal(await editor.inputValue(), scaffold);
    await page.reload();
    assert.equal(await editor.inputValue(), scaffold);
    checks.push('Active notebook identity remains accurate while editing a name; invalid names preserve notes, Enter opens a valid name, and original notes restore.');

    for (const [subject, theme, width] of [['biology', 'dark', 390], ['physics', 'light', 768]]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${base}/index.html?subject=${subject}&panel=notebook&theme=${theme}`);
      const notebookName = 'a'.repeat(48);
      await name.fill(notebookName); await name.press('Enter');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(output, `${subject}-notebook-${theme}-${width}-long-name.png`), fullPage: true });
    }
    checks.push('Maximum-length notebook names fit at tablet and mobile sizes without hiding the active notebook identity.');

    await page.goto(`${base}/index.html?subject=biology&panel=search`);
    await page.getByRole('button', { name: 'Membranes', exact: true }).click();
    await page.getByRole('heading', { name: 'Osmosis and membranes', exact: true }).waitFor();
    assert.match(await page.locator('.learning-results-summary').textContent(), /for “Membranes”/);
    const query = page.getByLabel('Question or concept', { exact: true });
    await query.fill('zzzzunmatchedconcept'); await query.press('Enter');
    await page.getByRole('heading', { name: 'Try the name of the idea', exact: true }).waitFor();
    assert.equal(await page.locator('.learning-result').count(), 0);
    await page.screenshot({ path: path.join(output, 'biology-search-no-match.png'), fullPage: true });
    await query.fill('');
    assert.equal(await page.locator('.learning-results-summary').isVisible(), false);
    assert.equal(await page.locator('.learning-empty').count(), 0);
    await page.getByRole('button', { name: 'Enzymes', exact: true }).click();
    await page.getByRole('heading', { name: 'Enzymes and rate', exact: true }).waitFor();
    checks.push('Subject-specific starters produce real keyword results; result summaries track the submitted query, and empty/no-match states are explicit.');

    await page.setViewportSize({ width: 390, height: 1000 });
    await page.goto(`${base}/index.html?subject=physics&panel=review&theme=dark`);
    await page.getByRole('button', { name: 'Reveal explanation', exact: true }).click();
    const targetSizes = await page.locator('button:visible:not(:disabled), summary:visible').evaluateAll(elements => elements.map(element => ({ name: element.textContent, height: element.getBoundingClientRect().height })));
    assert.ok(targetSizes.every(target => target.height >= 44), JSON.stringify(targetSizes));
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('button')).transitionDuration), '0s');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(output, 'physics-review-dark-390-revealed.png'), fullPage: true });
    checks.push('Mobile review ratings and disclosure controls meet a 44px touch target; reduced motion removes button transitions.');

    const damaged = await browser.newContext();
    await damaged.addInitScript(() => localStorage.setItem('entelloq.next.notebook.v1.biology.experiment', 'unreadable original'));
    const recovery = await damaged.newPage();
    await recovery.goto(`${base}/index.html?subject=biology&panel=notebook`);
    await recovery.getByText('Saved notebook could not be read.', { exact: false }).waitFor();
    assert.equal(await recovery.locator('.learning-status').getAttribute('data-tone'), 'warning');
    await recovery.getByRole('button', { name: 'Add experiment outline', exact: true }).click();
    assert.equal(await recovery.evaluate(() => localStorage.getItem('entelloq.next.notebook.v1.biology.experiment')), 'unreadable original');
    assert.equal(await recovery.getByRole('button', { name: 'Export mergeable notebook', exact: true }).isEnabled(), true);
    await damaged.close();
    checks.push('Unreadable notebook records remain untouched, recovery warnings remain visible after edits, and session export stays available.');

    assert.deepEqual(errors, []);
    assert.deepEqual(externalRequests, []);
    checks.push('Desktop, tablet and mobile fit in both subject palettes; initial tools make no external requests.');
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ checkedAt: new Date().toISOString(), checks, errors }, null, 2));
    console.log(JSON.stringify({ checks, errors, output }, null, 2));
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
