/* These checks bind feedback to the question and displayed option text. The
 * question bank rotates answers, so an index-only explanation can mislead. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const window = {};
for (const file of ['topics.js', 'learning-cards.js', 'exam-topic-rationales.js',
  'exam-checkpoint-foundations.js', 'exam-checkpoint-processes.js', 'exam-answers.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/library', file), 'utf8'), { window });
}

function checkCoverage(questions, rationales) {
  const seen = new Set();
  for (const q of questions) {
    assert.ok(!seen.has(q.question), 'Question keys must be unambiguous: ' + q.question);
    seen.add(q.question);
    const reasons = rationales[q.question];
    assert.ok(reasons, 'Missing question: ' + q.question);
    assert.deepEqual(Object.keys(reasons).sort(), Array.from(q.options).sort(), 'Stale option in ' + q.question);
    for (const option of q.options) {
      assert.ok(typeof reasons[option] === 'string' && reasons[option].trim(), 'Missing explanation: ' + option);
    }
    assert.equal(new Set(Object.values(reasons)).size, q.options.length, 'Options must have distinct rationales');
  }
  assert.deepEqual(Object.keys(rationales).sort(), [...seen].sort(), 'Remove stale question feedback or update its key');
}

test('every core question retains exact question and option rationale coverage', () => {
  checkCoverage(window.BIO_LIBRARY.topics.flatMap(topic => topic.quickCheck || []), window.BIO_EXAM_TOPIC_RATIONALES);
});

test('every enrichment checkpoint retains exact question and option rationale coverage', () => {
  checkCoverage(Object.values(window.BIO_ENRICHMENT).flatMap(topic => topic.checkpoints), window.BIO_EXAM_CHECKPOINT_RATIONALES);
});

test('rotating displayed options preserves the correct text and its own explanation', () => {
  for (const concept of window.BIO_LIBRARY.topics) {
    for (const q of [...concept.quickCheck, ...window.BIO_ENRICHMENT[concept.id].checkpoints]) {
      const reasons = window.BIO_EXAM_TOPIC_RATIONALES[q.question] || window.BIO_EXAM_CHECKPOINT_RATIONALES[q.question];
      for (let offset = 0; offset < q.options.length; offset++) {
        const rotated = {...q, options:q.options.slice(offset).concat(q.options.slice(0,offset)),
          answer:(q.answer - offset + q.options.length) % q.options.length};
        const html = window.BioExamAnswers.topic(rotated, concept);
        const normalize = text => text.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        const rows = [...html.matchAll(/<dt><span>[A-Z]<\/span>([\s\S]*?)<\/dt><dd>([\s\S]*?)<\/dd>/g)];
        assert.equal(rows.length, q.options.length, q.question);
        rows.forEach((row, index) => {
          const text = normalize(row[1].replace(/<small>Correct answer<\/small>/, ''));
          assert.equal(text, rotated.options[index]);
          assert.equal(normalize(row[2]), reasons[text]);
          assert.equal(row[1].includes('<small>Correct answer</small>'), index === rotated.answer);
        });
      }
    }
  }
});
