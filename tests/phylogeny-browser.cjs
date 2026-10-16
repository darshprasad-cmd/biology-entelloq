/* Real SVG geometry and keyboard checks, not a biological inference engine or
 * screen-reader-speech validation. The caller supplies an actual Learn Page or
 * Frame and its owning Playwright Page; no CSS, lesson data or responses change. */
'use strict';
const assert = require('node:assert/strict');
const expected = [
  { tree: 'T1', tips: ['A', 'B', 'C', 'D'], clades: ['A B', 'C D'], notation: '((A,B),(C,D))' },
  { tree: 'T2', tips: ['D', 'C', 'B', 'A'], clades: ['A B', 'C D'], notation: '((D,C),(B,A))' },
  { tree: 'T3', tips: ['A', 'C', 'B', 'D'], clades: ['A C', 'B D'], notation: '((A,C),(B,D))' }
];

async function visibleTree(world, view) {
  const model = world.locator('.bl-diagram svg');
  assert.equal(await model.count(), 1);
  assert.equal(await model.getAttribute('role'), 'img');
  const drawing = model.locator('[data-phylogeny-view]');
  assert.equal(await drawing.count(), 1, 'Only one readable tree is drawn at a time');
  assert.equal(await drawing.getAttribute('data-phylogeny-view'), String(view));
  const geometry = await drawing.evaluate(group => {
    const svg = group.ownerSVGElement, svgBox = svg.getBoundingClientRect();
    const point = (element, x, y) => new DOMPoint(x, y).matrixTransform(element.getScreenCTM());
    const nodes = [...group.querySelectorAll('[data-phylogeny-clade]')].map(node => {
      const circle = node.querySelector('circle');
      if (!circle) throw new Error('Every graph node needs a visible circle');
      const p = point(circle, circle.cx.baseVal.value, circle.cy.baseVal.value);
      const label = node.querySelector('[data-phylogeny-tip]');
      return { declaredClade: node.dataset.phylogenyClade, x: p.x, y: p.y,
        tip: label?.textContent.trim() || null, declaredTip: label?.dataset.phylogenyTip || null,
        radius: circle.r.baseVal.value, visible: getComputedStyle(circle).display !== 'none' && Number(getComputedStyle(circle).opacity) > 0 };
    });
    const edges = [...group.querySelectorAll('[data-phylogeny-edge]')].map(edge => {
      const length = edge.getTotalLength(), first = edge.getPointAtLength(0), last = edge.getPointAtLength(length);
      const a = point(edge, first.x, first.y), b = point(edge, last.x, last.y), style = getComputedStyle(edge);
      return { start: { x: a.x, y: a.y }, end: { x: b.x, y: b.y }, length, stroke: style.stroke, strokeWidth: parseFloat(style.strokeWidth), opacity: Number(style.opacity) * Number(style.strokeOpacity) };
    });
    const texts = [...group.querySelectorAll('text')].map(text => {
      const b = text.getBoundingClientRect(), m = text.getScreenCTM(), style = getComputedStyle(text);
      return { text: text.textContent.trim(), isTip: text.hasAttribute('data-phylogeny-tip'), x: b.x, y: b.y, width: b.width, height: b.height,
        fontSize: parseFloat(style.fontSize) * Math.hypot(m.a, m.b),
        inside: b.left >= svgBox.left - 1 && b.right <= svgBox.right + 1 && b.top >= svgBox.top - 1 && b.bottom <= svgBox.bottom + 1 };
    });
    return { treeId: group.dataset.treeId, nodes, edges, texts, description: group.querySelector('desc')?.textContent || svg.querySelector('desc')?.textContent || '', visibleText: [...group.querySelectorAll('text')].map(text => text.textContent.trim()).join(' '), svgWidth: svgBox.width };
  });
  assert.equal(geometry.treeId, expected[view].tree);
  assert.equal(geometry.nodes.length, 7, 'Four tips and three visible ancestral nodes');
  assert.equal(geometry.edges.length, 6, 'Six actual drawn branches connect the seven nodes');
  assert.ok(geometry.nodes.every(node => node.visible && node.radius > 0));
  assert.ok(geometry.edges.every(edge => edge.length > 0 && edge.stroke !== 'none' && edge.strokeWidth > 0 && edge.opacity > 0));
  const nearest = endpoint => {
    const distances = geometry.nodes.map((node, index) => ({ index, distance: Math.hypot(node.x - endpoint.x, node.y - endpoint.y) })).sort((a, b) => a.distance - b.distance);
    assert.ok(distances[0].distance <= 1.5, 'A visible branch endpoint lands on a node');
    assert.ok(distances[1].distance > distances[0].distance + 1, 'The endpoint identifies only one node');
    return distances[0].index;
  };
  // Build adjacency only from actual drawn branch endpoints, not clade metadata.
  const children = geometry.nodes.map(() => []), incoming = geometry.nodes.map(() => 0);
  for (const edge of geometry.edges) {
    const from = nearest(edge.start), to = nearest(edge.end);
    assert.notEqual(from, to);
    assert.ok(geometry.nodes[to].x > geometry.nodes[from].x, 'Branches run from ancestral nodes toward the right-hand tips');
    children[from].push(to); incoming[to]++;
  }
  const roots = incoming.map((count, index) => count === 0 ? index : -1).filter(index => index >= 0);
  assert.equal(roots.length, 1, 'There is one actual graph root');
  assert.ok(incoming.every((count, index) => index === roots[0] ? count === 0 : count === 1));
  const visited = new Set(), derived = new Map();
  function descendants(index) {
    assert.ok(!visited.has(index), 'The graph contains no cycle or reused descendant');
    visited.add(index);
    const node = geometry.nodes[index];
    let tips;
    if (children[index].length) {
      assert.equal(children[index].length, 2, 'The authored model is bifurcating');
      assert.equal(node.tip, null, 'An ancestor is not mislabeled as a sampled tip');
      tips = children[index].flatMap(descendants).sort();
    } else {
      assert.match(node.tip || '', /^[ABCD]$/, 'Each terminal node has a visible sampled-tip label');
      assert.equal(node.declaredTip, node.tip);
      tips = [node.tip];
    }
    derived.set(index, tips.join(' '));
    return tips;
  }
  assert.deepEqual(descendants(roots[0]), ['A', 'B', 'C', 'D']);
  assert.equal(visited.size, 7, 'Every node is connected to the root');
  for (const [index, actual] of derived) assert.equal(geometry.nodes[index].declaredClade, actual, 'Metadata agrees with graph-derived ancestry');
  const clades = [...derived.values()].filter(clade => clade.split(' ').length === 2).sort();
  assert.deepEqual(clades, expected[view].clades);
  const tips = geometry.nodes.filter(node => node.tip).sort((a, b) => a.y - b.y).map(node => node.tip);
  assert.deepEqual(tips, expected[view].tips, 'The visible top-to-bottom ordering is correct');
  assert.ok(geometry.visibleText.replace(/\s+/g, '').includes(expected[view].notation));
  assert.match(geometry.visibleText, /No time scale/i);
  assert.ok(geometry.description.length > 60, 'The graph has a meaningful text description');
  assert.ok(geometry.texts.every(text => text.inside), 'All SVG text fits the actual viewport');
  assert.ok(geometry.texts.every(text => text.fontSize >= 9.5), 'SVG captions and node labels remain readable at this size');
  const tipBoxes = geometry.texts.filter(text => text.isTip);
  assert.equal(tipBoxes.length, 4);
  assert.ok(tipBoxes.every(text => text.fontSize >= 12), 'Tip labels remain at least12 rendered CSS pixels');
  for (let i = 0; i < tipBoxes.length; i++) for (let j = i + 1; j < tipBoxes.length; j++) {
    const a = tipBoxes[i], b = tipBoxes[j];
    assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, 'Tip labels never overlap');
  }
  return { view, treeId: geometry.treeId, clades, tips, smallestRenderedFont: Math.min(...geometry.texts.map(text => text.fontSize)), svgWidth: geometry.svgWidth, graphVerifiedFromEndpoints: true };
}

async function checkPhylogeny(page, world, options = {}) {
  assert.equal(await world.locator('[data-depth-topic="phylogenetic-trees"]').count(), 1);
  assert.equal(await world.locator('.bl-modes [role="tab"]').count(), 6);
  const diagram = world.locator('.bl-diagram');
  await diagram.waitFor();
  assert.equal(await diagram.locator('[data-visual-action="play"]').count(), 0, 'An uncalibrated conceptual tree has no animation play button');
  const snapshot = async () => world.evaluate(() => {
    try { return Object.fromEntries(Object.keys(localStorage).filter(key => key.startsWith('bioq.depth-study.v1.')).sort().map(key => [key, localStorage.getItem(key)])); }
    catch (_) { return null; }
  });
  const before = await snapshot(), url = page.url();
  const next = world.getByRole('button', { name: 'Next annotation', exact: true });
  const back = world.getByRole('button', { name: 'Previous annotation', exact: true });
  const current = async () => Number(await diagram.locator('[data-phylogeny-view]').getAttribute('data-phylogeny-view'));
  for (let attempt = 0; await current() !== 0 && attempt < 3; attempt++) await next.click();
  assert.equal(await current(), 0);
  assert.equal(await back.isDisabled(), true);
  const views = [];
  for (let index = 0; index < 3; index++) {
    await diagram.scrollIntoViewIfNeeded();
    views.push(await visibleTree(world, index));
    assert.equal(await diagram.locator('.bl-stepdetail strong').innerText(), ['T1 · trace common ancestry', 'T2 · rotate, retain connections', 'T3 · change a relationship'][index]);
    if (options.captureView) await options.captureView(index);
    if (index < 2) {
      await next.focus();
      await page.keyboard.press(index === 0 ? 'Enter' : 'Space');
      assert.equal(await current(), index + 1);
      assert.equal(await next.evaluate(el => el === document.activeElement), true);
    }
  }
  await back.focus(); await page.keyboard.press('Enter');
  assert.equal(await current(), 1);
  assert.equal(await back.evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('Space');
  assert.equal(await current(), 0);
  assert.equal(await back.isDisabled(), true);
  assert.equal(await next.evaluate(el => el === document.activeElement && el.matches(':focus-visible')), true, 'Returning to the first view keeps keyboard focus on the enabled Next control');
  for (let index = 0; index < 3; index++) await page.keyboard.press('Enter');
  assert.equal(await current(), 0, 'The existing annotation sequence wraps without claiming a time animation');
  assert.equal(await next.evaluate(el => el === document.activeElement), true);
  assert.deepEqual(await snapshot(), before, 'Inspecting trees does not alter private study drafts or review');
  assert.equal(page.url(), url, 'Diagram controls do not navigate away');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  assert.ok(await world.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  return { views, keyboardBoundaries: true, privateNotesUnchanged: true };
}

module.exports = { checkPhylogeny };
