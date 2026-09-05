import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/_lessons.js', import.meta.url), 'utf8');
const marker = '  // ── shell chrome';
assert.ok(source.includes(marker), 'Lesson catalogue boundary must remain explicit');
const context = vm.createContext({ document: {}, matchMedia: () => ({ matches: true }) });
// Exercise the actual catalogue and pure filter; do not duplicate its implementation.
vm.runInContext(source.slice(0, source.indexOf(marker)) +
  'globalThis.catalogueAPI = { LESSONS, LENSES, LESSON_AIMS, matchingLessons }; })();', context);
const { LESSONS, LENSES, LESSON_AIMS, matchingLessons } = context.catalogueAPI;
const ids = (filters = {}) => Array.from(matchingLessons(filters), lesson => lesson.id);

test('all nine original lessons retain the same six lenses and an orientation', () => {
  assert.deepEqual(ids(), ['diffusion', 'enzyme', 'population', 'photosynthesis', 'respiration',
    'replication', 'selection', 'actionpotential', 'cardiac']);
  for (const lesson of LESSONS) {
    assert.equal(Object.keys(lesson.lenses).length, 6);
    for (const lens of LENSES) assert.ok(lesson.lenses[lens.k], `${lesson.id}: ${lens.k}`);
    assert.ok(LESSON_AIMS[lesson.id]?.length > 20, `Missing aim for ${lesson.id}`);
    assert.ok(lesson.lenses.experience.mount, 'Existing interactive remains available');
    assert.ok(lesson.lenses.math.mount, 'Existing quantitative interactive remains available');
  }
});

test('search matches title, concept chips, connected topics, and case-insensitive text', () => {
  assert.deepEqual(ids({ query: '  OSMOSIS  ' }), ['diffusion', 'actionpotential']);
  assert.deepEqual(ids({ query: 'Induced fit' }), ['enzyme']);
  assert.deepEqual(ids({ query: 'Biotechnology' }), ['replication']);
});

test('search combines terms rather than returning a match for any one word', () => {
  assert.deepEqual(ids({ query: 'pressure valves' }), ['cardiac']);
  assert.deepEqual(ids({ query: 'pressure osmosis' }), []);
});

test('domain and level filters intersect with search', () => {
  assert.deepEqual(ids({ domain: 'Cell Biology' }), ['diffusion', 'respiration']);
  assert.deepEqual(ids({ domain: 'Cell Biology', level: 'Core' }), ['respiration']);
  assert.deepEqual(ids({ query: 'oxygen', domain: 'Cell Biology', level: 'Foundation' }), []);
  assert.deepEqual(ids({ level: 'Advanced' }), ['actionpotential']);
});

test('accented typing normalises and whitespace-only search keeps the collection', () => {
  assert.deepEqual(ids({ query: 'ÉNZYME', domain: 'Molecular Biology' }), ['enzyme']);
  assert.equal(ids({ query: '   \t ' }).length, 9);
});

test('unknown filters and markup-like search are safely empty and reset restores all lessons', () => {
  assert.deepEqual(ids({ domain: 'Unknown area' }), []);
  assert.deepEqual(ids({ query: '<img src=x onerror=alert(1)>' }), []);
  assert.equal(ids({ query: '', domain: '', level: '' }).length, 9);
});

test('filtering is repeatable and does not mutate catalogue or lesson content', () => {
  const before = JSON.stringify(LESSONS);
  const filter = Object.freeze({ query: 'sodium', domain: 'Neuroscience', level: 'Advanced' });
  assert.deepEqual(ids(filter), ['actionpotential']);
  assert.deepEqual(ids(filter), ['actionpotential']);
  assert.equal(JSON.stringify(LESSONS), before);
});
