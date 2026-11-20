/* Check the actual selected Explore diagrams, including browser-parsed SVG
 * curves. These are conceptual illustrations, not scientific model outputs. */
'use strict';
const assert = require('node:assert/strict');

async function checkReferenceGeometry(page, world, capture) {
  const results = [];
  assert.equal(await world.locator('#sysList .br-reference-thumb svg').count(), 10);
  assert.equal(await world.locator('#tlTrack .br-reference-thumb svg').count(), 12);
  for (const [type, list, detail, count] of [
    ['atlas', '#sysList', '#atlasDetail', 10],
    ['timeline', '#tlTrack', '#tlDetail', 12]
  ]) {
    for (let index = 0; index < count; index++) {
      const button = world.locator(list + ' [data-i="' + index + '"]');
      await button.click();
      const figure = world.locator(detail + ' .br-reference-figure[data-reference-index="' + index + '"]');
      await figure.waitFor();
      assert.equal(await button.getAttribute('aria-selected'), 'true');
      const paths = await figure.locator('path').evaluateAll(nodes => nodes.map(node => {
        const length = node.getTotalLength(), end = node.getPointAtLength(length), style = getComputedStyle(node);
        return { d: node.getAttribute('d'), length, end: { x: end.x, y: end.y }, stroke: style.stroke, width: parseFloat(style.strokeWidth) };
      }));
      const thumbnail = await button.locator('.br-reference-thumb path').evaluateAll(nodes => nodes.map(node => ({ d: node.getAttribute('d'), length: node.getTotalLength() })));
      assert.deepEqual(thumbnail.map(p => p.d), paths.map(p => p.d), 'Thumbnail and selected figure retain the same complete paths');
      assert.ok(thumbnail.every(p => Number.isFinite(p.length) && p.length > 0), 'Every thumbnail path also parses and draws');
      assert.ok(paths.length > 0, type + index + ' has real diagram paths');
      for (const p of paths) {
        assert.ok(Number.isFinite(p.length) && p.length > 0, type + index + ' parses and draws: ' + p.d);
        assert.ok(p.stroke !== 'none' && p.width > 0, 'Conceptual strokes remain visible');
      }
      // Independent endpoint/count oracles catch truncated paths as well as
      // entirely missing curves. A Q segment needs two distinct point pairs.
      let affected, expectedCount, endX, endY, minimumLength;
      if (type === 'atlas' && index === 4) { affected = paths.filter(p => /^M298 /.test(p.d)); expectedCount = 5; endX = 343; endY = i => 120 + i * 11; minimumLength = 80; }
      if (type === 'timeline' && index === 0) { affected = paths.filter(p => /^M69 /.test(p.d)); expectedCount = 3; endX = 530; endY = i => 223 + i * 13; minimumLength = 400; }
      if (type === 'timeline' && index === 1) { affected = paths.filter(p => /^M113 /.test(p.d)); expectedCount = 6; endX = 486; endY = i => 249 - i * 20; minimumLength = 380; }
      if (type === 'timeline' && index === 5) { affected = paths.filter(p => /^M116 /.test(p.d)); expectedCount = 6; endX = 211; endY = i => 103 + i * 21; minimumLength = 95; }
      if (affected) {
        assert.equal(paths.length, type === 'atlas' ? 6 : index === 0 ? 3 : index === 1 ? 8 : 11, 'The complete conceptual diagram remains present');
        assert.equal(affected.length, expectedCount, type + index + ' preserves every repeated curve');
        affected.forEach((p, i) => {
          assert.ok(p.length > minimumLength, 'The complete curve is rendered');
          assert.ok(Math.abs(p.end.x - endX) < .01 && Math.abs(p.end.y - endY(i)) < .01, 'The curve reaches its intended endpoint');
        });
        if (capture) { await figure.scrollIntoViewIfNeeded(); await capture(type, index); }
      }
      results.push({ type, index, paths: paths.length, minimumLength: Math.min(...paths.map(p => p.length)), affected: affected || [] });
    }
  }
  await world.locator('#sysList [data-i="4"]').focus();
  await page.keyboard.press('ArrowRight');
  await world.locator('#atlasDetail [data-reference-index="5"]').waitFor();
  assert.equal(await world.locator('#sysList [data-i="5"]').evaluate(el => el === document.activeElement), true);
  assert.ok(await world.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Explore stays within the viewport');
  return results;
}
module.exports = { checkReferenceGeometry };
