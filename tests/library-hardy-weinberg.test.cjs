/* Bounded evidence upgrade: derive population arithmetic independently, and
 * exercise the real private-study API against an actually obsolete signature. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const files = ['topics', 'learning-cards', 'depth-foundations', 'depth-processes', 'extended-core', 'extended-systems', 'depth-study'];
const id = 'hardy-weinberg';
const prefix = 'bioq.depth-study.v1.';
const plain = value => JSON.parse(JSON.stringify(value));
const signature = task => JSON.stringify([task.question, task.answer, task.rows || []]);
const closeTo = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-10, label + ': ' + actual + ' ≠ ' + expected);

// Captured from the accepted add81f2 release, not reconstructed from the new
// prompt. These exact strings and rows formed the prior saved-task signature.
const legacyInvestigation = {
  question: 'What are p and q, and how many heterozygotes does Hardy–Weinberg predict in a sample of this size?',
  answer: 'p = 0.70 and q = 0.30; the expected heterozygote count is 2 × 0.70 × 0.30 × 100 = 42.',
  rows: [['AA', '49', '98'], ['Aa', '42', '42'], ['aa', '9', '0']]
};
const legacyTransfer = {
  question: 'Can nonrandom mating alter genotype frequencies while leaving allele frequencies unchanged in one generation?',
  hint: 'Compare allele copies with the combinations in which they occur.',
  answer: 'Yes. Changing which individuals mate can redistribute existing alleles among homozygous and heterozygous combinations without changing the total counts of those alleles, although associated selection or other processes may also act.'
};

function setup(records = new Map()) {
  const window = {localStorage: {
    getItem: key => records.has(key) ? records.get(key) : null,
    setItem: (key, value) => records.set(key, value)
  }};
  const context = vm.createContext({window});
  for (const name of files) vm.runInContext(fs.readFileSync(path.join(root, 'src/library', name + '.js'), 'utf8'), context, {filename: name});
  return {window, records, api: window.BioDepth, topic: window.BIO_LIBRARY.topics.find(t => t.id === id), unit: window.BIO_DEPTH[id]};
}

test('synthetic counts retain p = 0.7 while independently producing a heterozygote deficit', () => {
  const {unit} = setup();
  const rows = plain(unit.investigation.rows);
  assert.deepEqual(rows.map(row => row[0]), ['AA', 'Aa', 'aa']);
  assert.deepEqual(rows.map(row => Number(row[1])), [58, 24, 18]);
  const observed = Object.fromEntries(rows.map(([genotype, count]) => [genotype, Number(count)]));
  let population = 0, alleleCopies = 0, aCopies = 0;
  for (const [genotype, countText, copiesText] of rows) {
    const count = Number(countText);
    assert.ok(Number.isInteger(count) && count >= 0);
    assert.equal(genotype.length, 2, 'Each sampled genotype is diploid');
    const copies = [...genotype].filter(allele => allele === 'A').length * count;
    assert.equal(Number(copiesText), copies, genotype + ': contributed A copies follow genotype dosage');
    population += count;
    alleleCopies += genotype.length * count;
    aCopies += copies;
  }
  assert.equal(population, 100);
  assert.equal(alleleCopies, 200);
  assert.equal(aCopies, 140);
  const p = aCopies / alleleCopies, q = (alleleCopies - aCopies) / alleleCopies;
  closeTo(p, 0.7, 'A allele frequency');
  closeTo(q, 0.3, 'a allele frequency');
  closeTo(p + q, 1, 'Allele frequencies sum to one');
  // Sum the two ordered unlike-allele pairings, rather than reading the answer.
  const expected = {AA: population * p * p, Aa: population * (p * q + q * p), aa: population * q * q};
  for (const [genotype, count] of Object.entries({AA:49, Aa:42, aa:9})) closeTo(expected[genotype], count, genotype + ' expectation');
  closeTo(Object.values(expected).reduce((sum, n) => sum + n, 0), population, 'Expected counts exhaust the sample');
  closeTo(expected.Aa - observed.Aa, 18, 'Heterozygote deficit is 18 individuals, not 18 observed individuals');
  closeTo(observed.AA - expected.AA, 9, 'AA excess');
  closeTo(observed.aa - expected.aa, 9, 'aa excess');
  assert.notEqual(observed.Aa, expected.Aa, 'The investigation no longer uses an exact-match construction');
  const explanation = [unit.investigation.answer, ...unit.investigation.reasoning].join(' ');
  for (const count of [...Object.values(expected).map(Math.round), observed.Aa, Math.round(expected.Aa - observed.Aa)]) {
    assert.match(explanation, new RegExp('\\b' + count + '\\b'), 'Authored reasoning includes independently derived count ' + count);
  }
  assert.match(unit.investigation.answer, /24 observed heterozygotes/);
  assert.match(unit.investigation.answer, /18 fewer than expected/);
});

test('the numerical comparison states its model, provenance and causal/statistical/time limits', () => {
  const {window, unit, topic} = setup();
  const task = unit.investigation;
  assert.match(task.context, /synthetic/i);
  assert.match(task.context, /100 diploid.*two-allele autosomal locus/);
  assert.match(task.context, /single time/);
  assert.match(task.context, /random mating.*hypothesis.*not a given/i);
  assert.ok(unit.objectives.some(value => /deviation.*proof.*cause/i.test(value)));
  assert.match(task.answer, /does not establish natural selection/i);
  assert.match(task.limitation, /not a statistical significance claim/i);
  assert.match(task.limitation, /no significance test is performed/i);
  assert.match(task.limitation, /single-time sample cannot establish a cause or a change in allele frequencies over time/i);
  assert.match(task.reasoning.join(' '), /nonrandom mating/);
  assert.match(task.reasoning.join(' '), /population structure|pooling groups.*different allele frequencies/);
  assert.match(task.reasoning.join(' '), /sampling variation/);
  assert.match(task.reasoning.join(' '), /sampling locations.*groups separately/);
  assert.match(task.reasoning.join(' '), /repeated samples over time|single-time sample cannot show allele-frequency change/i);
  const sourceUrl = 'https://openstax.org/books/biology-2e/pages/19-2-population-genetics';
  assert.ok(unit.sources.some(source => source.url === sourceUrl), 'Depth includes OpenStax 19.2');
  assert.ok(topic.sources.some(sourceId => window.BIO_LIBRARY.sources.find(source => source.id === sourceId)?.url === sourceUrl),
    'The same reference is discoverable from the canonical lesson');
});

test('Reason uses the revised investigation and Learn displays the new evidence table', () => {
  const {window, api, topic, unit} = setup();
  const example = window.BIO_ENRICHMENT[id].workedExample;
  assert.equal(example.question, unit.investigation.question);
  assert.equal(example.answer, unit.investigation.answer);
  assert.deepEqual(plain(example.steps), plain(unit.investigation.reasoning));
  const markup = api.markup(topic);
  assert.match(markup, /<th scope="row">AA<\/th><td>58<\/td><td>116<\/td>/);
  assert.match(markup, /<th scope="row">Aa<\/th><td>24<\/td><td>24<\/td>/);
  assert.match(markup, /<th scope="row">aa<\/th><td>18<\/td><td>0<\/td>/);
  assert.doesNotMatch(markup, /<th scope="row">AA<\/th><td>49<\/td><td>98<\/td>/);
});

test('every study view keeps its export and references in a labeled non-footer group', () => {
  const {window, api} = setup();
  const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
  assert.equal(window.BIO_LIBRARY.topics.length, 109);
  let views = 0;
  for (const topic of window.BIO_LIBRARY.topics) {
    const sources = api.unitFor(topic.id).sources.filter(source => new URL(source.url).protocol === 'https:');
    for (const view of ['learn', 'reason', 'solve']) {
      views++;
      const label = topic.id + ' / ' + view;
      const markup = api.markup(topic, view);
      // The existing embedded-app rule hides every footer element. Changing
      // only an aria label or the footer's class would not repair that bug.
      assert.doesNotMatch(markup, /<\/?footer\b/i, label + ': study controls must not inherit hidden shell-footer styling');
      const groups = [...markup.matchAll(/<([a-z]+)\b([^>]*\bclass="[^"]*\bbd-footer\b[^"]*"[^>]*)>([\s\S]*?)<\/\1>/g)];
      assert.equal(groups.length, 1, label + ': one notes/reference group');
      const [, tag, attributes, contents] = groups[0];
      assert.equal(tag, 'div', label + ': controls remain outside the footer-element selector');
      assert.match(attributes, /\brole="group"/, label + ': related controls have group semantics');
      assert.match(attributes, /\baria-label="Study notes and reference reading"/, label + ': group has an accessible name');
      assert.doesNotMatch(attributes, /\b(?:hidden|inert)(?:\s|=|$)/, label + ': group is not explicitly hidden or inert');
      const controls = [...contents.matchAll(/<button\b([^>]*\bdata-depth-export\b[^>]*)>([\s\S]*?)<\/button>/g)];
      assert.equal(controls.length, 1, label + ': export control is retained inside the group');
      assert.match(controls[0][1], /\btype="button"/, label + ': exporting cannot submit a surrounding form');
      assert.equal(controls[0][2], 'Download my study notes');
      const links = [...contents.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
      assert.equal(links.length, sources.length, label + ': no source is lost or invented');
      links.forEach((link, index) => {
        assert.equal(link[1].match(/\bhref="([^"]*)"/)?.[1], escape(sources[index].url), label + ': exact reference destination');
        assert.match(link[1], /\btarget="_blank"/);
        assert.match(link[1], /\brel="noopener noreferrer"/);
        assert.equal(link[2], escape(sources[index].title) + ' ↗', label + ': meaningful reference label');
      });
    }
  }
  assert.equal(views, 327, 'Learn, Reason and Solve are checked for every published concept');
});

for (const oldState of [{revealed:true, compared:true, rating:'revisit'}, {revealed:false, compared:true, rating:'explained'}]) {
  test('old exact-match ' + oldState.rating + ' state preserves its draft but resets comparison through the real API', () => {
    const records = new Map([['bioq_lessons_v1', 'An unrelated private lesson journal']]);
    const {api, topic, unit, window} = setup(records);
    const draft = 'My private explanation written for the previous exact-match table.';
    assert.equal(api.write(id, 'investigation', legacyInvestigation, {...oldState, draft}), true);
    const legacy = api.read(id, 'investigation', legacyInvestigation).value;
    assert.equal(legacy.compared, true, 'Fixture genuinely represents a compared old task');
    assert.equal(legacy.rating, oldState.rating);
    assert.equal(legacy.signature, signature(legacyInvestigation));
    assert.notEqual(signature(unit.investigation), legacy.signature, 'New evidence invalidates the old task signature');
    const oldStored = records.get(prefix + id + '.investigation');

    assert.deepEqual(plain(unit.transfer), legacyTransfer, 'The transfer task itself is unchanged');
    const transferDraft = 'My separate transfer prediction is already reviewed.';
    api.write(id, 'transfer', legacyTransfer, {draft:transferDraft, revealed:false, compared:true, rating:'explained'});
    const transferStored = records.get(prefix + id + '.transfer');
    const other = window.BIO_LIBRARY.topics.find(t => t.id === 'photosynthesis');
    const otherTask = api.unitFor(other.id).investigation;
    api.write(other.id, 'investigation', otherTask, {draft:'A separate photosynthesis explanation.', revealed:true, compared:true, rating:'revisit'});
    const otherStored = records.get(prefix + other.id + '.investigation');
    const otherNotes = api.notes(other);

    const migrated = api.read(id, 'investigation', unit.investigation);
    assert.equal(migrated.saved, true);
    assert.equal(migrated.value.draft, draft);
    assert.equal(migrated.value.revealed, false);
    assert.equal(migrated.value.compared, false);
    assert.equal(migrated.value.rating, '');
    assert.equal(migrated.value.signature, signature(unit.investigation));
    assert.equal(records.get(prefix + id + '.investigation'), oldStored, 'Reading does not destructively rewrite the stored private draft');
    assert.deepEqual(Array.from(api.reviewItems([topic, other]), t => t.id), [other.id], 'Stale investigation review does not leak into the revisit list');
    const notes = api.notes(topic);
    const investigationNotes = notes.split('## Transfer the idea')[0];
    assert.ok(investigationNotes.includes(draft));
    assert.match(investigationNotes, /Self-review: Not reviewed/);
    assert.doesNotMatch(investigationNotes, /Worked explanation:/, 'Old comparison does not falsely reveal a new worked answer');
    assert.ok(notes.includes(transferDraft));
    assert.ok(notes.includes(legacyTransfer.answer), 'The independently compared transfer answer remains exportable');
    assert.equal(api.read(id, 'transfer', unit.transfer).value.rating, 'explained');

    api.write(id, 'investigation', unit.investigation, migrated.value);
    const remounted = setup(records).api;
    assert.equal(remounted.read(id, 'investigation', unit.investigation).value.draft, draft);
    assert.equal(remounted.read(id, 'investigation', unit.investigation).value.compared, false);
    assert.equal(remounted.read(id, 'investigation', unit.investigation).value.rating, '');
    assert.equal(records.get(prefix + id + '.transfer'), transferStored);
    assert.equal(records.get(prefix + other.id + '.investigation'), otherStored);
    assert.equal(remounted.notes(other), otherNotes);
    assert.equal(records.get('bioq_lessons_v1'), 'An unrelated private lesson journal');
  });
}

test('all other authored lessons and all MCQs remain identical to the accepted release', () => {
  const {window} = setup();
  const retained = {topics:plain(window.BIO_LIBRARY.topics), depth:plain(window.BIO_DEPTH), enrichment:plain(window.BIO_ENRICHMENT)};
  assert.equal(retained.topics.length, 109);
  // Only the named investigation, its derived Reason example and the same
  // lesson's references are permitted to change; objectives remain protected.
  delete retained.topics.find(topic => topic.id === id).sources;
  delete retained.depth[id].investigation;
  delete retained.depth[id].sources;
  delete retained.enrichment[id].workedExample;
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(retained)).digest('hex'),
    '3d47d087f6308c959f50387bd5be2a101899560fffaa0d7a474763e4697922c1',
    'Independently derived from add81f2a4b3bb151258cc03935f4bbbf9e4e4bb7, including every MCQ and the unchanged transfer');
});
