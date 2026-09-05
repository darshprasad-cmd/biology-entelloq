import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/_lessons.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const dataEnd = source.indexOf('  // ── shell chrome');
const factory = source.slice(source.indexOf('  function createLessonProgress('), source.indexOf('  const lessonProgress ='));
const context = vm.createContext({ document: {}, matchMedia: () => ({ matches: true }) });
vm.runInContext(source.slice(0, dataEnd) + factory +
  'globalThis.api = { LESSONS, LENSES, createLessonProgress }; })();', context);
const { LESSONS, LENSES, createLessonProgress } = context.api;
const key = 'bioq_lessons_v1';
const plain = (value) => JSON.parse(JSON.stringify(value));

function storage(initial = {}) {
  const entries = new Map(Object.entries(initial));
  let blockedRead = false, blockedWrite = false;
  return {
    entries,
    getItem(name) { if (blockedRead) throw new Error('SecurityError'); return entries.get(name) ?? null; },
    setItem(name, value) { if (blockedWrite) throw new Error('QuotaExceededError'); entries.set(name, value); },
    blockRead(value = true) { blockedRead = value; },
    blockWrite(value = true) { blockedWrite = value; },
  };
}
const make = (store) => createLessonProgress(LESSONS, LENSES, () => store);

test('all original science, questions, answers and simulation builders remain identical', () => {
  // Approved main 50bcfb0: this release may change presentation/state only.
  const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
  assert.equal(sha(JSON.stringify({ LESSONS, LENSES })), '0adcab025e30928170c6ad1f334834c65ce42018822ae8e863d9f4fc56e8dd9d');
  assert.equal(sha(source.slice(source.indexOf('  // ── interactive builders'))), '50a8e790a9e58d4b05ca68d2656f661660e1cfe82e26553bf21590bfc52c7c06');
});

test('fresh records expose no invented prediction and restore the last lens per lesson', () => {
  const store = storage();
  const progress = make(store);
  assert.equal(progress.read('diffusion').lens, 'experience');
  assert.equal(progress.read('diffusion').prediction, null);
  assert.equal(progress.setLens('diffusion', 'math'), true);
  assert.equal(progress.setLens('enzyme', 'frontier'), true);
  const reloaded = make(store);
  assert.equal(reloaded.read('diffusion').lens, 'math');
  assert.equal(reloaded.read('enzyme').lens, 'frontier');
  assert.equal(reloaded.read('cardiac').lens, 'experience');
  assert.match(reloaded.status, /Saved on this device/);
  assert.match(reloaded.status, /Simulations restart/);
  assert.match(reloaded.status, /not a mastery score/);
});

test('first prediction survives lens switches and reload without implicit regrading', () => {
  const store = storage(), progress = make(store);
  assert.equal(progress.answer('diffusion', 0), true);
  assert.equal(progress.answer('diffusion', 1), false);
  progress.setLens('diffusion', 'math');
  progress.setLens('diffusion', 'predict');
  const reloaded = make(store);
  assert.equal(reloaded.read('diffusion').prediction, 0);
  assert.equal(reloaded.read('diffusion').lens, 'predict');
  assert.equal(reloaded.answer('diffusion', 1), false);
  assert.equal(reloaded.read('diffusion').prediction, 0);
});

test('an explicit retake clears only this prediction and preserves lens and other lessons', () => {
  const store = storage(), progress = make(store);
  progress.setLens('diffusion', 'predict'); progress.answer('diffusion', 0);
  progress.setLens('enzyme', 'math'); progress.answer('enzyme', 1);
  const other = plain(progress.read('enzyme'));
  assert.equal(progress.resetPrediction('unknown'), false);
  assert.equal(progress.resetPrediction('cardiac'), false);
  assert.equal(progress.resetPrediction('diffusion'), true);
  assert.equal(progress.read('diffusion').prediction, null);
  assert.equal(progress.read('diffusion').lens, 'predict');
  assert.deepEqual(plain(progress.read('enzyme')), other);
  assert.equal(make(store).read('diffusion').prediction, null);
  assert.equal(progress.answer('diffusion', 2), true);
  assert.equal(progress.answer('diffusion', 0), false);
  assert.equal(make(store).read('diffusion').prediction, 2);
});

test('unknown IDs, lens values, out-of-bounds predictions and fractional or string answers are rejected', () => {
  const store = storage(), progress = make(store);
  assert.equal(progress.read('__proto__'), null);
  assert.equal(progress.setLens('constructor', 'math'), false);
  assert.equal(progress.setLens('diffusion', '<script>'), false);
  assert.equal(progress.answer('unknown', 1), false);
  for (const invalid of [-1, 4, 999, 0.5, '1', null, undefined, NaN, Infinity]) {
    assert.equal(progress.answer('diffusion', invalid), false, String(invalid));
  }
  assert.equal(store.entries.has(key), false);
});

test('malformed JSON, wrong versions and wrong collection shapes recover to safe defaults', () => {
  for (const raw of ['{broken', 'null', '[]', 'true', '1', '{"version":2,"lessons":{}}', '{"version":1,"lessons":[]}']) {
    const progress = make(storage({ [key]: raw }));
    assert.equal(progress.read('diffusion').lens, 'experience', raw);
    assert.equal(progress.read('diffusion').prediction, null, raw);
    assert.doesNotMatch(progress.status, /unavailable/, raw);
  }
});

test('stale question signatures discard old grading but retain a valid reading lens', () => {
  const store = storage(); const progress = make(store);
  progress.setLens('diffusion', 'predict'); progress.answer('diffusion', 2);
  const saved = JSON.parse(store.getItem(key));
  saved.lessons.diffusion.signature = 'earlier question content';
  store.setItem(key, JSON.stringify(saved));
  const restored = make(store);
  assert.equal(restored.read('diffusion').lens, 'predict');
  assert.equal(restored.read('diffusion').prediction, null);
  assert.equal(restored.answer('diffusion', 0), true);
});

test('malformed individual records cannot inject UI or add unrecognised lessons', () => {
  const store = storage(); const progress = make(store);
  progress.answer('diffusion', 1);
  const saved = JSON.parse(store.getItem(key));
  saved.lessons.diffusion.lens = '<img onerror=alert(1)>';
  saved.lessons.diffusion.prediction = '1';
  saved.lessons.diffusion.html = '<script>bad</script>';
  saved.lessons.unknown = { lens: 'math', prediction: 1 };
  saved.lessons.enzyme = [];
  store.setItem(key, JSON.stringify(saved));
  const restored = make(store);
  assert.equal(restored.read('diffusion').lens, 'experience');
  assert.equal(restored.read('diffusion').prediction, null);
  assert.equal(restored.read('unknown'), null);
  assert.equal(restored.read('enzyme').prediction, null);
  restored.setLens('diffusion', 'visual');
  const cleaned = JSON.parse(store.getItem(key));
  assert.equal(Object.hasOwn(cleaned.lessons, 'unknown'), false);
  assert.equal(Object.hasOwn(cleaned.lessons.diffusion, 'html'), false);
});

test('blocked storage access retains this visit and reports the actual limitation', () => {
  const progress = createLessonProgress(LESSONS, LENSES, () => { throw new Error('SecurityError'); });
  assert.match(progress.status, /This visit only/);
  assert.equal(progress.setLens('diffusion', 'predict'), true);
  assert.equal(progress.answer('diffusion', 0), true);
  assert.equal(progress.read('diffusion').prediction, 0);
  assert.match(progress.status, /browser storage is unavailable/);
  assert.doesNotMatch(progress.status, /Saved on this device/);
  assert.equal(progress.resetPrediction('diffusion'), true);
  assert.equal(progress.read('diffusion').prediction, null);
  assert.match(progress.status, /This visit only/);
});

test('quota failures preserve current memory, never overwrite other keys, and can recover', () => {
  const store = storage({ bioq_solve_history: '[{"marks":4}]', bioq_activity: '{"counts":{"lab":2}}' });
  const progress = make(store);
  progress.setLens('diffusion', 'math');
  const before = store.getItem(key);
  store.blockWrite();
  progress.answer('diffusion', 0);
  assert.equal(progress.read('diffusion').prediction, 0);
  assert.equal(store.getItem(key), before);
  assert.match(progress.status, /This visit only/);
  store.blockWrite(false); progress.setLens('diffusion', 'predict');
  assert.equal(make(store).read('diffusion').prediction, 0);
  assert.match(progress.status, /Saved on this device/);
  assert.equal(store.getItem('bioq_solve_history'), '[{"marks":4}]');
  assert.equal(store.getItem('bioq_activity'), '{"counts":{"lab":2}}');
});

test('records returned to the UI are copies, not mutation or regrading handles', () => {
  const store = storage(), progress = make(store);
  progress.answer('diffusion', 0);
  const record = progress.read('diffusion'); record.prediction = 3; record.lens = 'math';
  assert.equal(progress.read('diffusion').prediction, 0);
  assert.equal(progress.read('diffusion').lens, 'experience');
  assert.deepEqual(plain(make(store).read('diffusion')), plain(progress.read('diffusion')));
});

test('two tabs changing different lessons merge instead of overwriting a stale snapshot', () => {
  const store = storage(), tabA = make(store), tabB = make(store);
  tabA.answer('diffusion', 0);
  tabB.setLens('enzyme', 'math');
  let reloaded = make(store);
  assert.equal(reloaded.read('diffusion').prediction, 0);
  assert.equal(reloaded.read('enzyme').lens, 'math');
  tabB.answer('enzyme', 1);
  tabA.setLens('diffusion', 'visual');
  reloaded = make(store);
  assert.equal(reloaded.read('diffusion').prediction, 0);
  assert.equal(reloaded.read('diffusion').lens, 'visual');
  assert.equal(reloaded.read('enzyme').prediction, 1);
  assert.equal(reloaded.read('enzyme').lens, 'math');
});

test('a stale same-lesson lens change preserves another tab first prediction', () => {
  const store = storage(), tabA = make(store), tabB = make(store);
  tabA.answer('population', 0);
  tabB.setLens('population', 'math');
  const reloaded = make(store);
  assert.equal(reloaded.read('population').prediction, 0);
  assert.equal(reloaded.read('population').lens, 'math');
  assert.equal(tabB.read('population').prediction, 0);
});

test('a stale tab cannot replace an already-persisted prediction with another answer', () => {
  const store = storage(), tabA = make(store), tabB = make(store);
  assert.equal(tabA.answer('diffusion', 0), true);
  assert.equal(tabB.answer('diffusion', 1), false);
  assert.equal(tabB.read('diffusion').prediction, 0);
  assert.equal(make(store).read('diffusion').prediction, 0);
});

test('an explicit cross-tab retake clears only its answer without resurrecting a stale choice', () => {
  const store = storage(), tabA = make(store), tabB = make(store);
  tabA.setLens('diffusion', 'predict'); tabA.answer('diffusion', 0);
  tabB.setLens('enzyme', 'math'); tabB.answer('enzyme', 1);
  tabB.setLens('diffusion', 'visual');
  assert.equal(tabA.resetPrediction('diffusion'), true);
  let reloaded = make(store);
  assert.equal(reloaded.read('diffusion').prediction, null);
  assert.equal(reloaded.read('diffusion').lens, 'visual');
  assert.equal(reloaded.read('enzyme').prediction, 1);
  tabB.setLens('diffusion', 'predict');
  assert.equal(make(store).read('diffusion').prediction, null);
  assert.equal(tabB.answer('diffusion', 2), true);
  reloaded = make(store);
  assert.equal(reloaded.read('diffusion').prediction, 2);
  assert.equal(reloaded.read('enzyme').lens, 'math');
});

test('quota recovery merges pending fields with newer external lessons and preserves explicit retakes', () => {
  const store = storage(), tabA = make(store), tabB = make(store);
  tabA.answer('diffusion', 0);
  store.blockWrite();
  tabA.resetPrediction('diffusion');
  tabA.answer('diffusion', 2);
  tabA.setLens('diffusion', 'predict');
  assert.equal(tabA.read('diffusion').prediction, 2);
  assert.match(tabA.status, /This visit only/);
  assert.equal(make(store).read('diffusion').prediction, 0);
  store.blockWrite(false);
  tabB.answer('enzyme', 1); tabB.setLens('enzyme', 'math');
  tabA.setLens('diffusion', 'visual');
  const restored = make(store);
  assert.equal(restored.read('diffusion').prediction, 2);
  assert.equal(restored.read('diffusion').lens, 'visual');
  assert.equal(restored.read('enzyme').prediction, 1);
  assert.equal(restored.read('enzyme').lens, 'math');
  assert.match(tabA.status, /Saved on this device/);
});

test('an unreadable store is not overwritten; local changes merge after reads recover', () => {
  const store = storage(), tabA = make(store), tabB = make(store);
  tabA.answer('diffusion', 0);
  const original = store.getItem(key);
  store.blockRead();
  tabB.setLens('enzyme', 'frontier'); tabB.answer('enzyme', 1);
  assert.equal(store.entries.get(key), original);
  assert.equal(tabB.read('enzyme').prediction, 1);
  assert.match(tabB.status, /This visit only/);
  store.blockRead(false); tabB.setLens('enzyme', 'predict');
  const restored = make(store);
  assert.equal(restored.read('enzyme').prediction, 1);
  assert.equal(restored.read('enzyme').lens, 'predict');
  assert.equal(restored.read('diffusion').prediction, 0);
});

test('a conflicting unsaved first answer yields to the already-persisted choice on recovery', () => {
  const store = storage(), tabA = make(store), tabB = make(store);
  store.blockWrite(); tabB.answer('diffusion', 2);
  assert.equal(tabB.read('diffusion').prediction, 2);
  store.blockWrite(false); tabA.answer('diffusion', 0);
  tabB.setLens('diffusion', 'math');
  assert.equal(tabB.read('diffusion').prediction, 0);
  assert.equal(make(store).read('diffusion').prediction, 0);
  assert.equal(make(store).read('diffusion').lens, 'math');
});

test('prediction restoration uses current trusted data and explicit feedback labels/focus', () => {
  assert.match(source, /if \(done\) showAnswer\(previous\)/);
  assert.match(source, /Correct answer/);
  assert.match(source, /Your choice · Review the explanation/);
  assert.match(source, /why\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /why\.scrollIntoView\(\{ block: "nearest", behavior: "instant" \}\)/);
  assert.match(source, /lesson-save-status" role="status" aria-live="polite"/);
  assert.match(source, /let active = lessonProgress\.read\(l.id\)\.lens/);
  assert.match(source, /class="btn ghost les-retry" type="button">Try prediction again/);
  assert.match(source, /opts\[0\]\.focus\(\{ preventScroll: true \}\)/);
});
