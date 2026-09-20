const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const window = {};
const context = {window};
for (const name of ['topics', 'learning-cards']) {
  vm.runInNewContext(fs.readFileSync(path.join(root, 'src/library', name + '.js'), 'utf8'), context);
}
const library = window.BIO_LIBRARY;
const cards = window.BIO_ENRICHMENT;
const words = text => text.trim().split(/\s+/).length;
const selected = (id, index) => {
  const question = cards[id].checkpoints[index];
  return question.options[question.answer];
};

test('every published topic has a complete compact enrichment; roadmap entries are not presented as finished', () => {
  assert.deepEqual(Object.keys(cards).sort(), Array.from(library.topics, topic => topic.id).sort());
  assert.equal(Object.keys(cards).length, 73);
  const sourceIds = new Set(library.sources.map(source => source.id));
  for (const [id, card] of Object.entries(cards)) {
    assert.ok(card.curiosity.title.trim(), id + ' curiosity title');
    assert.ok(words(card.curiosity.body) >= 12 && words(card.curiosity.body) <= 50, id + ' curiosity length');
    if (card.curiosity.sourceId) assert.ok(sourceIds.has(card.curiosity.sourceId), id + ' source');
    const example = card.workedExample;
    assert.ok(words(example.question) >= 8 && words(example.question) <= 50, id + ' example question');
    assert.ok(example.steps.length >= 2 && example.steps.length <= 4, id + ' reasoning steps');
    assert.equal(new Set(example.steps).size, example.steps.length, id + ' repeated reasoning');
    for (const step of example.steps) assert.ok(words(step) >= 4 && words(step) <= 35, id + ' step density');
    assert.ok(words(example.answer) >= 5 && words(example.answer) <= 50, id + ' example answer');
    assert.equal(card.checkpoints.length, 2, id + ' additional checks');
  }
  for (const topic of library.roadmap) assert.equal(cards[topic.id], undefined, topic.id);
});

test('practice receives three distinct, answerable questions for each topic with explanatory feedback', () => {
  const allQuestions = new Set();
  const answerPositions = [0, 0, 0];
  for (const topic of library.topics) {
    const questions = [...topic.quickCheck, ...cards[topic.id].checkpoints];
    assert.equal(new Set(questions.map(question => question.question)).size, 3, topic.id + ' duplicated question');
    for (const question of cards[topic.id].checkpoints) {
      assert.ok(!allQuestions.has(question.question), topic.id + ' shared generic checkpoint');
      allQuestions.add(question.question);
      assert.ok(question.options.length >= 3 && question.options.length <= 4, topic.id);
      assert.equal(new Set(question.options).size, question.options.length, topic.id + ' repeated options');
      assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length, topic.id);
      assert.ok(words(question.explanation) >= 8, topic.id + ' missing explanatory feedback');
      answerPositions[question.answer]++;
    }
  }
  assert.equal(allQuestions.size, 146);
  assert.ok(Math.max(...answerPositions) - Math.min(...answerPositions) <= 1, 'correct positions must not systematically reveal the answer');
});

test('worked examples remain topic-specific rather than repeated templates', () => {
  const values = Object.values(cards);
  assert.equal(new Set(values.map(card => card.curiosity.body)).size, values.length);
  assert.equal(new Set(values.map(card => card.workedExample.question)).size, values.length);
  assert.equal(new Set(values.map(card => card.workedExample.steps.join(' '))).size, values.length);
  for (const [id, card] of Object.entries(cards)) {
    assert.doesNotMatch(JSON.stringify(card), /\b(?:TODO|TBD|lorem ipsum|coming soon|insert example)\b/i, id);
  }
});

test('important misconceptions retain correct keyed responses after option balancing', () => {
  assert.equal(selected('photosynthesis', 0), 'Released oxygen gas');
  assert.equal(selected('enzymes', 0), 'The equilibrium ratio of reactants and products');
  assert.equal(selected('meiosis', 0), 'One member of each homologous pair, still with sister chromatids');
  assert.equal(selected('membrane-transport', 0), 'Its electrochemical gradient');
  assert.equal(selected('dna', 1), '30%');
  assert.equal(selected('mendelian-genetics', 0), 'One half');
  assert.equal(selected('translation', 1), 'A release factor');
  assert.equal(selected('electron-transport-chain', 0), 'Oxygen');
  assert.equal(selected('phloem', 1), 'No; it moves from sources toward sinks, whose locations vary');
  assert.equal(selected('gel-electrophoresis', 0), 'Toward the positive electrode');
  assert.match(cards.dna.workedExample.answer, /3′-TCAG-5′.*5′-GACT-3′/);
  assert.match(cards.transcription.workedExample.answer, /5′-AUGC-3′/);
  assert.match(cards['calvin-cycle'].workedExample.answer, /One G3P/);
  assert.match(cards.glycolysis.workedExample.answer, /two ATP/);
  assert.match(cards.pcr.workedExample.answer, /32 target copies/);
});
