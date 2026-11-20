/* Actual Explore source/portable diagrams; no fixture substitutes or engines. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { checkReferenceGeometry } = require('../tests/reference-geometry-browser.cjs');
const root = path.resolve(__dirname, '..'), portable = process.argv.includes('--portable');
const { chromium } = require(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES || 'C:/Users/darsh/biology-entelloq/node_modules', 'playwright'));
const output = path.resolve(process.env.BIOLOGY_REFERENCE_OUTPUT || path.join(root, 'docs/product-excellence/reference-svg-20261120/after-' + (portable ? 'portable' : 'source')));
const report = { complete: false, portable, cases: [], errors: [], svgErrors: [], cameraCalls: 0 };
fs.mkdirSync(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://local').pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, data) => { if (error) return res.writeHead(404).end(); res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(data); });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port, browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 960 }, reducedMotion: 'reduce' });
      try {
        await context.exposeBinding('__referenceCamera', () => { report.cameraCalls++; });
        await context.addInitScript(() => { if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => { await window.__referenceCamera(); throw Error('No camera requested by reference diagrams'); }; });
        await context.route('**/*', route => route.request().url().startsWith(base + '/') || /^(data|blob):/.test(route.request().url()) ? route.continue() : route.abort());
        const page = await context.newPage();
        page.on('pageerror', error => report.errors.push(error.message));
        page.on('console', message => { if (/<path> attribute d:/.test(message.text())) report.svgErrors.push(message.text()); });
        await page.goto(base + (portable ? '/dist/index.html?excellence=1#explore' : '/explore.html?excellence=1'), { waitUntil: 'domcontentloaded' });
        let world = page;
        if (portable) {
          await page.locator('#bioq-workspace').waitFor();
          const shell = await (await page.locator('#bioq-workspace').elementHandle()).contentFrame();
          await shell.locator('#viewFrame.on').waitFor();
          world = await (await shell.locator('#viewFrame').elementHandle()).contentFrame();
        }
        await world.locator('.br-reference-thumb').first().waitFor();
        const diagrams = await checkReferenceGeometry(page, world, (type, index) => page.screenshot({ path: path.join(output, width + '-' + type + '-' + index + '.png') }));
        report.cases.push({ width, diagrams });
        assert.deepEqual(report.errors, []); assert.deepEqual(report.svgErrors, []); assert.equal(report.cameraCalls, 0);
      } finally { await context.close(); }
    }
    report.complete = true;
    console.log(JSON.stringify({ complete: true, portable, widths: report.cases.map(c => c.width), diagramsPerWidth: 22, svgErrors: report.svgErrors.length, cameraCalls: report.cameraCalls }));
  } finally {
    await browser.close(); await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  }
})().catch(error => { console.error(error); process.exitCode = 1; if (server.listening) server.close(); });
