import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const digest = text => crypto.createHash('sha256').update(text).digest('hex');
const skipStart = '  /* A keyboard skip transfers focus';
const skipEnd = '  /* ── nav, scroll progress, spotlight';
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const skip = script.slice(script.indexOf(skipStart), script.indexOf(skipEnd));

test('one main landmark wraps the original content, with a focusable keyboard skip target', () => {
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.equal((html.match(/<\/main>/g) || []).length, 1);
  assert.match(html, /<a class="landing-skip" id="landingSkip" href="#main-content">Skip to content<\/a>/);
  assert.match(html, /<main id="main-content" tabindex="-1">/);
  assert.ok(html.indexOf('<main ') < html.indexOf('<header class="hero wrap"'));
  assert.ok(html.indexOf('</main>') < html.indexOf('<footer class="wrap">'));
  assert.match(html, /\.landing-skip:focus\{transform:none\}/);
});

test('skip activation focuses main instantly and restores the previous scroll preference', () => {
  for (const preexisting of [false, true]) {
    const classes = new Set(preexisting ? ['no-smooth'] : []);
    const callbacks = [];
    let handler, focused = false, scrolled = false, prevented = false;
    const main = {
      focus(options) {
        assert.equal(options.preventScroll, true);
        assert.ok(classes.has('no-smooth'));
        focused = true;
      },
      scrollIntoView(options) {
        assert.equal(options.behavior, 'auto');
        assert.equal(options.block, 'start');
        assert.ok(classes.has('no-smooth'));
        scrolled = true;
      },
    };
    const context = vm.createContext({
      $: selector => selector === '#main-content' ? main : { addEventListener(name, fn) { assert.equal(name, 'click'); handler = fn; } },
      document: { documentElement: { classList: {
        contains: name => classes.has(name), add: name => classes.add(name), remove: name => classes.delete(name),
      } } },
      raf: callback => callbacks.push(callback),
    });
    vm.runInContext(skip, context);
    handler({ preventDefault() { prevented = true; } });
    assert.ok(prevented && focused && scrolled);
    callbacks.forEach(callback => callback());
    assert.equal(classes.has('no-smooth'), preexisting);
  }
});

test('FAQ styles target the six native disclosures and answers without replacing their interaction', () => {
  assert.equal((html.match(/<details class="q reveal"/g) || []).length, 6);
  assert.match(html, /\.faq>\.q>summary\{min-height:44px;/);
  assert.match(html, /\.faq>\.q>summary::marker\{color:var\(--blue-2\)\}/);
  assert.match(html, /\.faq>\.q>p\{padding:/);
});

test('mobile app entry stays a readable single-line action without changing authentication', () => {
  assert.match(html, /\.nav-cta>\.btn\{white-space:nowrap;[^}]*min-height:44px/);
  assert.match(html, /\.nav-inner\{gap:8px;padding:12px 10px\}/);
  assert.match(html, /<div data-bioq-account><\/div>/);
});

test('the static dashboard is explicitly a preview with a route to actual activity', () => {
  const analytics = html.slice(html.indexOf('<section id="analytics"'), html.indexOf('<section id="principles"'));
  assert.match(analytics, /Example · not your activity/);
  assert.match(analytics, /href="\.\/app.html#me"[^>]*>Open your actual activity/);
  assert.doesNotMatch(analytics, /your_record · on this device/);
});

test('original hero, feature cards, demos, tutorial and FAQ answer markup remain byte-identical', () => {
  // Frozen from the deployed PR6 main tree (50bcfb0), normalising only checkout newlines.
  const regions = [
    ['<header class="hero wrap" id="top">', '</header>', '64a968d9c36b2250ca521a6070c6ec0ffb74bd2e677dc04ddea3bd189e27298c'],
    ['<section id="features" class="wrap">', '<section id="demos"', 'e51acdf574878a3940c3bf964aafb5bb34ab21c5580a565ccf3129412ebccb8b'],
    ['<section id="demos" class="wrap">', '<section id="success"', 'b1539065f42f4666c06f253357c02711906975e7255564831d9716c4f7ba987b'],
    ['<section class="wrap" id="tutorials">', '<section id="founder"', 'f08fa4dbbc039f9a72a136c3494f1fefed8e8dda1f9d8c2fe38140f1521c7392'],
    ['<section id="faq"', '<section class="final wrap">', '9e5458c8a9c97deb6ca67b8c765a465d525c845e7ad9dc27a0c16315d8642d86'],
  ];
  for (const [start, end, expected] of regions) {
    const a = html.indexOf(start), b = html.indexOf(end, a + start.length);
    assert.ok(a > 0 && b > a, start);
    assert.equal(digest(html.slice(a, b)), expected, start);
  }
});

test('existing landing interactions and all demo scientific models are unchanged', () => {
  assert.ok(skip.length > 100);
  const original = script.slice(0, script.indexOf(skipStart)) + script.slice(script.indexOf(skipEnd));
  assert.equal(digest(original), '2009824c4c53449e525bdb6d584ae29dc87ebdcc5bd8b7b6180559303c2c3579');
});
