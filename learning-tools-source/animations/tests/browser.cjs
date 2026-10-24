const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.CODEX_NODE_MODULES ? path.join(process.env.CODEX_NODE_MODULES, 'playwright') : 'C:/Users/darsh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.mp4': 'video/mp4', '.vtt': 'text/vtt' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  if (pathname === '/host.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><iframe id="module" src="/index.html?subject=physics" style="width:1100px;height:900px"></iframe>'); return; }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, bytes) => { res.writeHead(error ? 404 : 200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(error ? 'Missing' : bytes); });
});
const checks = [], errors = [], external = [];
let browser;
function passed(name, detail) { checks.push({ name, status: 'passed', ...(detail ? { detail } : {}) }); }
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  async function context(options = {}) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
    await ctx.route('**/*', route => {
      if (route.request().url().startsWith(base) || /^(blob:|data:)/.test(route.request().url())) return route.continue();
      external.push(route.request().url()); return route.abort();
    });
    await ctx.addInitScript(() => {
      window.__blobs = { made: [], revoked: [] };
      const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = value => { const url = create(value); window.__blobs.made.push(url); return url; };
      URL.revokeObjectURL = value => { window.__blobs.revoked.push(value); return revoke(value); };
    });
    return ctx;
  }
  for (const subject of ['physics', 'biology']) {
    const ctx = await context(); const page = await ctx.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const movies = [];
    page.on('request', req => { if (req.url().endsWith('.mp4')) movies.push(req.url()); });
    await page.goto(`${base}/index.html?subject=${subject}`);
    await page.locator('#lesson-poster').evaluate(img => img.decode());
    assert.equal(movies.length, 0);
    assert.equal(await page.locator('#lesson-video').getAttribute('src'), null);
    assert.equal(await page.locator('#lesson-video').evaluate(v => v.paused), true);
    passed(`${subject}: poster only before explicit play`);
    await page.locator('#play-button').focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => { const v = document.querySelector('video'); return v.videoWidth === 1280 && v.currentTime > .3 && !v.paused; });
    assert.equal(movies.length, 1);
    await page.locator('#play-button').click();
    assert.equal(await page.locator('video').evaluate(v => v.paused), true);
    passed(`${subject}: real H.264 playback and keyboard play/pause`);
    await page.locator('#chapters button[data-time="5"]').click();
    await page.waitForFunction(() => { const v = document.querySelector('video'); return Math.abs(v.currentTime - 5) < .1 && v.paused && !v.seeking && v.readyState >= 2; });
    assert.match(await page.locator('#caption-text').textContent(), subject === 'physics' ? /head of A/ : /complex, ES/);
    await page.locator('video').evaluate(v => { v.textTracks[0].mode = 'hidden'; });
    await page.waitForFunction(() => document.querySelector('video').textTracks[0].cues?.length === 4);
    await page.selectOption('#playback-speed', '0.75');
    assert.equal(await page.locator('video').evaluate(v => v.playbackRate), .75);
    passed(`${subject}: paused chapter seeks, synchronized caption, native VTT and playback speed`);
    await page.locator('#chapters button[data-time="16"]').click();
    await page.waitForFunction(() => { const v = document.querySelector('video'); return Math.abs(v.currentTime - 16) < .1 && !v.seeking && v.readyState >= 2; });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: path.join(root, `qa/${subject}-desktop.png`), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#transcript summary').click();
    await page.locator('#still-alternative summary').click();
    await page.locator('#still-grid img').first().scrollIntoViewIfNeeded();
    await page.locator('#still-grid img').first().evaluate(img => img.decode());
    const stillDimensions = await page.locator('#still-grid img').first().evaluate(img => ({ width: img.clientWidth, height: img.clientHeight }));
    assert.ok(Math.abs(stillDimensions.width / stillDimensions.height - 16 / 9) < .01);
    assert.equal(await page.locator('#transcript-list li').count(), 4);
    assert.equal(await page.locator('#still-grid img').count(), 4);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(root, `qa/${subject}-mobile.png`), fullPage: true });
    passed(`${subject}: mobile without overflow, full transcript and four actual still alternatives`);
    const disposal = await page.evaluate(() => { window.EntelloqAnimations.destroy(); return { paused: document.querySelector('video').paused, src: document.querySelector('video').getAttribute('src'), ...window.__blobs }; });
    assert.equal(disposal.paused, true); assert.equal(disposal.src, null); assert.deepEqual(disposal.revoked.sort(), disposal.made.sort());
    passed(`${subject}: synchronous host teardown pauses and revokes every media Blob URL`);
    await ctx.close();
  }
  {
    const ctx = await context({ reducedMotion: 'reduce' }); const page = await ctx.newPage();
    await page.goto(`${base}/index.html?subject=biology&theme=dark`);
    assert.equal(await page.locator('#transcript').evaluate(e => e.open), true);
    assert.equal(await page.locator('video').evaluate(v => v.paused), true);
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    passed('reduced motion opens transcript and never autoplays; initial dark theme works');
    await ctx.close();
  }
  {
    const ctx = await context(); const page = await ctx.newPage();
    await page.goto(`${base}/host.html`); const frame = page.frames().find(f => f.url().includes('index.html'));
    await frame.waitForSelector('#animation-app');
    await page.evaluate(() => document.querySelector('iframe').contentWindow.postMessage({ type: 'entelloq-learning:theme', theme: 'dark', tokens: { accent: '#00aabb', surface: '#123456' } }, location.origin));
    await frame.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    assert.equal(await frame.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--surface')), '#123456');
    await frame.evaluate(() => {
      dispatchEvent(new MessageEvent('message', { source: parent, origin: 'https://invalid.example', data: { type: 'entelloq:theme', theme: 'light' } }));
      dispatchEvent(new MessageEvent('message', { source: window, origin: location.origin, data: { type: 'entelloq:theme', theme: 'light' } }));
    });
    assert.equal(await frame.locator('html').getAttribute('data-theme'), 'dark');
    passed('host theme tokens accepted only from same-origin parent; forged origin/source rejected');
    await ctx.close();
  }
  {
    const ctx = await context(); const page = await ctx.newPage();
    await page.route('**/media/physics.mp4', route => route.fulfill({ status: 503, body: 'Unavailable' }));
    await page.goto(`${base}/index.html?subject=physics`);
    await page.locator('#play-button').click();
    await page.waitForFunction(() => document.querySelector('#player-status').textContent.includes('still read'));
    await page.locator('#transcript summary').click(); assert.equal(await page.locator('#transcript-list li').count(), 4);
    assert.equal(await page.locator('#play-button').isEnabled(), true);
    passed('failed video fetch leaves readable transcript/stills and an enabled retry');
    await ctx.close();
  }
  for (const pendingAsset of ['.mp4', '.vtt']) {
    const ctx = await context();
    await ctx.addInitScript(extension => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        if (String(args[0]).endsWith(extension)) {
          const read = response.arrayBuffer.bind(response);
          response.arrayBuffer = async () => {
            const bytes = await read();
            window.__pendingAsset = extension;
            await new Promise(resolve => { window.__releaseAsset = resolve; });
            return bytes;
          };
        }
        return response;
      };
    }, pendingAsset);
    const page = await ctx.newPage(); page.on('pageerror', error => errors.push(error.message));
    const captions = []; page.on('request', request => { if (request.url().endsWith('.vtt')) captions.push(request.url()); });
    await page.goto(`${base}/index.html?subject=physics`);
    await page.locator('#play-button').click();
    await page.waitForFunction(() => Boolean(window.__pendingAsset));
    const createdBeforeDestroy = await page.evaluate(() => {
      const created = window.__blobs.made.length;
      window.EntelloqAnimations.destroy();
      // The body is already buffered; release it after abort to emulate a queued
      // fetch continuation or a portable bridge that cannot cancel buffered bytes.
      window.__releaseAsset();
      return created;
    });
    await page.waitForFunction(() => !document.querySelector('#play-button').disabled);
    const disposal = await page.evaluate(() => ({ paused: document.querySelector('video').paused, src: document.querySelector('video').getAttribute('src'), tracks: document.querySelectorAll('video track').length, ...window.__blobs }));
    assert.equal(disposal.made.length, createdBeforeDestroy, 'no media URL may be created after destroy');
    assert.deepEqual(disposal.revoked.sort(), disposal.made.sort());
    assert.equal(disposal.paused, true); assert.equal(disposal.src, null); assert.equal(disposal.tracks, 0);
    if (pendingAsset === '.mp4') assert.equal(captions.length, 0, 'destroyed movie fetch must not start a captions fetch');
    passed(`destroy during buffered ${pendingAsset} load prevents late Blob URLs and media attachment`);
    await ctx.close();
  }
  {
    const ctx = await context();
    await ctx.addInitScript(() => {
      const originalFetch = window.fetch.bind(window), originalPlay = HTMLMediaElement.prototype.play;
      window.__playCalls = 0;
      HTMLMediaElement.prototype.play = function () { window.__playCalls += 1; return originalPlay.call(this); };
      window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        if (String(args[0]).endsWith('.mp4')) {
          const read = response.arrayBuffer.bind(response);
          response.arrayBuffer = async () => {
            const bytes = await read();
            window.__pendingMovie = true;
            await new Promise(resolve => { window.__releaseMovie = resolve; });
            return bytes;
          };
        }
        return response;
      };
    });
    const page = await ctx.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/index.html?subject=biology`);
    await page.locator('#play-button').click();
    await page.waitForFunction(() => Boolean(window.__pendingMovie));
    await page.evaluate(() => { window.EntelloqAnimations.pause(); window.__releaseMovie(); });
    await page.waitForFunction(() => !document.querySelector('#play-button').disabled && document.querySelector('video').readyState >= 1);
    assert.equal(await page.evaluate(() => window.__playCalls), 0);
    assert.equal(await page.locator('video').evaluate(video => video.paused), true);
    assert.ok(await page.locator('video').getAttribute('src'));
    await page.locator('#play-button').click();
    await page.waitForFunction(() => !document.querySelector('video').paused && document.querySelector('video').currentTime > .1);
    await page.evaluate(() => window.EntelloqAnimations.pause());
    assert.equal(await page.locator('video').evaluate(video => video.paused), true);
    passed('host pause cancels pending Play without discarding media; explicit later Play resumes normally');
    await ctx.close();
  }
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  passed('all runtime requests local; zero page errors');
  fs.writeFileSync(path.join(root, 'qa/browser-checks.json'), JSON.stringify({ checks, errors, externalRequests: external }, null, 2) + '\n');
  console.log(JSON.stringify({ passed: checks.length, errors, externalRequests: external }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); await new Promise(resolve => server.close(resolve)); });
