const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/_lessons.js'), 'utf8');
const boundary = source.indexOf('  // ── shell chrome');
assert.ok(boundary > 0, 'The lesson catalogue must remain independently readable');
const context = vm.createContext({document: {}, matchMedia: () => ({matches: true})});
vm.runInContext(source.slice(0, boundary) +
  'globalThis.lessonAPI = {LESSONS, LESSON_TOPICS, depthLinks}; })();', context);
const libraryContext = {window: {}};
for (const file of ['topics.js', 'learning-cards.js', 'practice-bridge.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(root, 'src/library', file), 'utf8'), libraryContext);
}
const {LESSONS, LESSON_TOPICS, depthLinks} = context.lessonAPI;
const {BIO_LIBRARY, BIO_ENRICHMENT, BioPractice} = libraryContext.window;

test('all nine six-lens lessons link to complete Learn topics and available practice', () => {
  assert.equal(LESSONS.length, 9);
  assert.equal(Object.keys(LESSON_TOPICS).length, LESSONS.length);
  for (const lesson of LESSONS) {
    const id = LESSON_TOPICS[lesson.id];
    const topic = BIO_LIBRARY.topics.find(item => item.id === id);
    assert.ok(topic, lesson.id + ': topic must exist');
    assert.equal(topic.status, 'complete', lesson.id + ': avoid roadmap destinations');
    assert.ok(topic.explanations.advanced, lesson.id + ': advanced explanation is available');
    assert.ok(BIO_ENRICHMENT[id]?.workedExample?.steps?.length, lesson.id + ': Reason has a worked explanation');
    assert.ok(BioPractice.questionsFor(topic).length > 0, lesson.id + ': Solve has questions');
    const markup = depthLinks(lesson);
    const hrefs = Array.from(markup.matchAll(/href="([^"]+)"/g), match => match[1]);
    assert.equal(hrefs.length, 3);
    for (const section of ['learn', 'reason', 'solve']) {
      assert.ok(hrefs.includes(BioPractice.href(section, id, 'advanced')),
        lesson.id + ': ' + section + ' uses the live route contract');
    }
    for (const href of hrefs.filter(href => !href.startsWith('./learn.'))) {
      assert.equal(BioPractice.parseRoute(href.slice(href.indexOf('#'))).topic.id, id);
    }
  }
});

test('navigation does not alter the original six lenses or lesson state', () => {
  const original = JSON.stringify(LESSONS);
  for (const lesson of LESSONS) {
    assert.equal(Object.keys(lesson.lenses).length, 6);
    assert.ok(depthLinks(lesson).includes('<nav aria-label='));
  }
  assert.equal(JSON.stringify(LESSONS), original);
  assert.equal(depthLinks({id: 'unknown'}), '');
});

test('quantitative lenses state the scope of logistic growth and Michaelis-Menten kinetics', () => {
  const population = LESSONS.find(lesson => lesson.id === 'population');
  assert.equal(population.lenses.math.equation, 'dN/dt = rN(1 − N/K)');
  assert.equal(population.lenses.math.mount, 'logistic');
  assert.match(population.lenses.math.blurb, /fixed positive r and K/);
  assert.match(population.lenses.math.blurb, /separate discrete-time logistic map/);
  assert.match(population.lenses.frontier.experiment, /distinct from the continuous logistic equation/);
  const enzyme = LESSONS.find(lesson => lesson.id === 'enzyme');
  assert.equal(enzyme.lenses.math.mount, 'michaelis');
  assert.match(enzyme.lenses.math.blurb, /half-max rate/);
  assert.match(enzyme.lenses.math.blurb, /does not universally mean tighter substrate binding/);
});
