/* Bounded evidence upgrade: derive circular digest lengths independently and
 * preserve the accepted lesson, private drafts and every unrelated concept. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const baseline = require('./fixtures/recombinant-evidence-0aea0f3.json');
const phylogenyBaseline = require('./fixtures/phylogeny-evidence-e34914e.json');
const root = path.resolve(__dirname, '..');
const files = ['topics', 'learning-cards', 'depth-foundations', 'depth-processes', 'extended-core', 'extended-systems', 'depth-study'];
const id = 'recombinant-dna', prefix = 'bioq.depth-study.v1.';
const approvedSource = {id:'extended-core-diagnosticDigest', title:'Addgene: Diagnostic Restriction Digest', url:'https://www.addgene.org/protocols/diagnostic-digest/'};
const plain = value => JSON.parse(JSON.stringify(value));
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const signature = task => JSON.stringify([task.question, task.answer, task.rows || []]);
const closeTo = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-10, label + ': ' + actual + ' ≠ ' + expected);

function setup(records = new Map()) {
  const window = {localStorage:{getItem:key => records.has(key) ? records.get(key) : null, setItem:(key, value) => records.set(key, value)}};
  const context = vm.createContext({window});
  for (const name of files) vm.runInContext(fs.readFileSync(path.join(root, 'src/library', name + '.js'), 'utf8'), context, {filename:name});
  return {window, records, api:window.BioDepth, topic:window.BIO_LIBRARY.topics.find(topic => topic.id === id), unit:window.BIO_DEPTH[id]};
}

function circularFragments(length, cuts) {
  assert.ok(length > 0 && cuts.length >= 1);
  const positions = [...cuts].sort((a, b) => a - b);
  assert.equal(new Set(positions).size, positions.length, 'Each specified cut occurs at a different position');
  assert.ok(positions.every(position => position >= 0 && position < length));
  return positions.map((position, index) =>
    index + 1 < positions.length ? positions[index + 1] - position : length - position + positions[0]
  ).sort((a, b) => a - b);
}

function checkFragments(text, expected, total, label) {
  const fragments = text.split(/\s+and\s+/).map(Number).sort((a, b) => a - b);
  assert.equal(fragments.length, expected.length, label + ': number of fragments');
  assert.ok(fragments.every(fragment => Number.isFinite(fragment) && fragment > 0), label + ': positive numerical lengths');
  fragments.forEach((fragment, index) => closeTo(fragment, expected[index], label + ': fragment ' + index));
  closeTo(fragments.reduce((sum, fragment) => sum + fragment, 0), total, label + ': DNA length is conserved');
}

test('the immutable accepted snapshot retains its independent provenance and original task signature', () => {
  assert.equal(baseline.provenance.commit, '0aea0f3f60ee10627a8160698cccdc099a73cff1');
  assert.deepEqual(baseline.provenance.sourceFiles, files.filter(name => name !== 'depth-study').map(name => 'src/library/' + name + '.js'));
  const expected = 'f0c6bbd0ad96bdeba9ceaca4fb83f66cc0230f9db5c2ccd9717347b66b136cce';
  assert.equal(baseline.provenance.sha256, expected);
  assert.equal(digest({topic:baseline.topic, depth:baseline.depth, enrichment:baseline.enrichment}), expected,
    'Never rewrite accepted lesson content to make a new preservation comparison pass');
  assert.equal(baseline.depth.investigation.title, 'Check more than survival');
  assert.deepEqual(baseline.depth.investigation.rows, [['A','Yes','3 and 1'], ['B','Yes','3'], ['C','No','No recoverable plasmid']]);
});

test('two separate circular digests conserve length but distinguish intended and reversed inserts', () => {
  const {unit} = setup(), task = unit.investigation;
  const backbone = 3, insert = 1, total = backbone + insert;
  const junctionJ = 0, otherJunction = insert;
  const backboneCut = total - 0.5;
  const intendedInsertCut = junctionJ + 0.2;
  const reversedInsertCut = insert - intendedInsertCut;
  assert.equal(backboneCut, 3.5, 'The backbone cut lies across the circular origin from the insert');
  closeTo(reversedInsertCut, 0.8, 'Reversing the 1 kb insert mirrors its internal site');
  const flanking = circularFragments(total, [junctionJ, otherJunction]);
  const intended = circularFragments(total, [backboneCut, intendedInsertCut]);
  const reversed = circularFragments(total, [backboneCut, reversedInsertCut]);
  // Expected values come from ordered circular intervals, not from the prose
  // answer or a second copy of the table. A linear subtraction would be wrong.
  closeTo(intended[0], 0.7, 'Intended junction-spanning fragment');
  closeTo(intended[1], 3.3, 'Other intended fragment');
  closeTo(reversed[0], 1.3, 'Reversed junction-spanning fragment');
  closeTo(reversed[1], 2.7, 'Other reversed fragment');
  const rows = plain(task.rows);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(row => row[0]), ['Design prediction (not a measurement)', 'Candidate A (synthetic)', 'Candidate B (synthetic)']);
  rows.forEach(row => checkFragments(row[1], flanking, total, row[0] + ' flanking digest'));
  checkFragments(rows[0][2], intended, total, 'Design prediction offset digest');
  checkFragments(rows[1][2], reversed, total, 'Candidate A offset digest');
  checkFragments(rows[2][2], intended, total, 'Candidate B offset digest');
  assert.equal(rows[1][1], rows[2][1], 'Size-only screening cannot discriminate these candidates');
  assert.notEqual(rows[1][2], rows[2][2], 'The offset map supplies new discriminatory evidence');
  assert.match(task.answer, /Candidate B matches the intended/);
  assert.match(task.answer, /A fits the reversed arrangement in this model/);
  for (const value of ['0.7', '3.3', '1.3', '2.7']) assert.ok(task.reasoning.join(' ').includes(value), 'Reasoning includes derived length ' + value);
});

test('the model distinguishes predicted from synthetic observed evidence and states its verification limits', () => {
  const {unit} = setup(), task = unit.investigation;
  assert.match(task.context, /Invented predictions and observations/);
  assert.match(task.context, /4 kb circle.*3 kb backbone.*1 kb insert/);
  assert.match(task.context, /A and B both pass marker selection/);
  assert.match(task.context, /two digests are separate/);
  assert.match(task.context, /0\.5 kb back into the backbone.*junction J.*0\.2 kb into the insert/);
  assert.match(task.context, /Reversal moves the insert cut to 0\.8 kb/);
  assert.match(task.context, /complete cutting with no additional cuts/);
  assert.deepEqual(plain(task.columns), ['Construct','Flanking fragments (kb)','Offset fragments (kb)']);
  assert.match(task.limitation, /known map, complete cutting and distinguishable fragments/);
  assert.match(task.limitation, /Partial cutting, unresolved bands or unexpected sites/);
  assert.match(task.limitation, /do not establish exact sequence identity, error-free junctions, expression or function/);
  assert.match(task.limitation, /not a laboratory protocol or a measured experiment/);
  assert.match(task.reasoning.join(' '), /Sequencing checks nucleotide order and junctions/);
  assert.match(task.reasoning.join(' '), /protein expression and function need separate evidence/);
});

test('exact approved references and the derived Reason example remain synchronized with the canonical lesson', () => {
  const {window, api, topic, unit} = setup();
  const newRefs = window.BIO_LIBRARY.sources.filter(source => source.id === approvedSource.id);
  assert.deepEqual(plain(newRefs), [approvedSource], 'Exactly one correctly labeled Addgene reference');
  assert.deepEqual(plain(topic.sources), [...baseline.topic.sources, approvedSource.id]);
  assert.deepEqual(plain(unit.sources), [...baseline.depth.sources, approvedSource]);
  assert.deepEqual(plain(topic.sources.map(sourceId => window.BIO_LIBRARY.sources.find(source => source.id === sourceId))), plain(unit.sources));
  const example = window.BIO_ENRICHMENT[id].workedExample;
  assert.deepEqual(plain(example), {question:unit.investigation.question, steps:plain(unit.investigation.reasoning), answer:unit.investigation.answer});
  for (const view of ['learn', 'reason']) {
    const markup = api.markup(topic, view);
    assert.ok(markup.includes('<caption>' + unit.investigation.title + '</caption>'), view + ': current evidence title');
    for (const row of unit.investigation.rows) assert.ok(markup.includes('<th scope="row">' + row[0] + '</th><td>' + row[1] + '</td><td>' + row[2] + '</td>'), view + ': current evidence row');
    assert.ok(markup.includes('href="' + approvedSource.url + '"'), view + ': source is discoverable');
    assert.doesNotMatch(markup, /No recoverable plasmid/);
  }
});

test('six modes, every MCQ, mechanisms, objectives, transfer and curiosity stay exactly as accepted', () => {
  const {window, topic, unit} = setup();
  const retainedTopic = plain(topic), retainedDepth = plain(unit), retainedCards = plain(window.BIO_ENRICHMENT[id]);
  retainedTopic.sources = plain(baseline.topic.sources);
  retainedDepth.investigation = plain(baseline.depth.investigation);
  retainedDepth.sources = plain(baseline.depth.sources);
  retainedCards.workedExample = plain(baseline.enrichment.workedExample);
  assert.deepEqual(retainedTopic, baseline.topic);
  assert.deepEqual(retainedDepth, baseline.depth);
  assert.deepEqual(retainedCards, baseline.enrichment);
});

for (const oldState of [{revealed:true, compared:true, rating:'revisit'}, {revealed:false, compared:true, rating:'explained'}]) {
  test('obsolete ' + oldState.rating + ' study state retains the private draft but resets review through the real API', () => {
    const records = new Map([['bioq_lessons_v1','Unrelated private lesson journal']]);
    const {api, window, topic, unit} = setup(records), oldTask = baseline.depth.investigation;
    const draft = 'My original explanation about candidate A and the old size-only table.';
    assert.equal(api.write(id, 'investigation', oldTask, {...oldState, draft}), true);
    const old = api.read(id, 'investigation', oldTask).value;
    assert.equal(old.signature, signature(oldTask));
    assert.equal(old.compared, true);
    assert.equal(old.rating, oldState.rating);
    assert.notEqual(old.signature, signature(unit.investigation), 'This is a genuinely obsolete saved task');
    const oldStored = records.get(prefix + id + '.investigation');
    assert.deepEqual(plain(unit.transfer), baseline.depth.transfer);
    const transferDraft = 'My separate prediction about promoter recognition is already compared.';
    api.write(id, 'transfer', baseline.depth.transfer, {draft:transferDraft, revealed:false, compared:true, rating:'explained'});
    const transferStored = records.get(prefix + id + '.transfer');
    const other = window.BIO_LIBRARY.topics.find(item => item.id === 'hardy-weinberg');
    const otherTask = api.unitFor(other.id).investigation;
    api.write(other.id, 'investigation', otherTask, {draft:'My separate genotype comparison.', revealed:true, compared:true, rating:'revisit'});
    const otherStored = records.get(prefix + other.id + '.investigation'), otherNotes = api.notes(other);

    const migrated = api.read(id, 'investigation', unit.investigation);
    assert.equal(migrated.saved, true);
    assert.equal(migrated.value.draft, draft);
    assert.equal(migrated.value.signature, signature(unit.investigation));
    assert.equal(migrated.value.revealed, false);
    assert.equal(migrated.value.compared, false);
    assert.equal(migrated.value.rating, '');
    assert.equal(records.get(prefix + id + '.investigation'), oldStored, 'Read never rewrites the old draft');
    assert.deepEqual(Array.from(api.reviewItems([topic, other]), item => item.id), [other.id], 'Old self-review cannot count as reviewing the new task');
    const notes = api.notes(topic), investigationNotes = notes.split('## Transfer the idea')[0];
    assert.ok(investigationNotes.includes(draft));
    assert.match(investigationNotes, /Self-review: Not reviewed/);
    assert.doesNotMatch(investigationNotes, /Worked explanation:/);
    assert.ok(investigationNotes.includes('| Candidate A (synthetic) | 3 and 1 | 1.3 and 2.7 |'));
    assert.ok(investigationNotes.includes('| Candidate B (synthetic) | 3 and 1 | 0.7 and 3.3 |'));
    assert.ok(investigationNotes.includes(unit.investigation.limitation));
    assert.ok(notes.includes(transferDraft) && notes.includes(unit.transfer.answer), 'Independently reviewed transfer remains exportable');
    assert.ok(notes.includes(approvedSource.title + ': ' + approvedSource.url));

    api.write(id, 'investigation', unit.investigation, migrated.value);
    const remounted = setup(records).api;
    assert.equal(remounted.read(id, 'investigation', unit.investigation).value.draft, draft);
    assert.equal(remounted.read(id, 'investigation', unit.investigation).value.compared, false);
    assert.equal(remounted.read(id, 'investigation', unit.investigation).value.rating, '');
    // Only an explicit new comparison may include the revised worked answer.
    remounted.write(id, 'investigation', unit.investigation, {...migrated.value, compared:true, revealed:true, rating:'explained'});
    assert.ok(remounted.notes(topic).includes(unit.investigation.answer));
    assert.equal(records.get(prefix + id + '.transfer'), transferStored);
    assert.equal(records.get(prefix + other.id + '.investigation'), otherStored);
    assert.equal(remounted.notes(other), otherNotes);
    assert.equal(records.get('bioq_lessons_v1'), 'Unrelated private lesson journal');
  });
}

test('the entire accepted library changes only the named investigation, derived example and one exact reference addition', () => {
  const {window} = setup();
  const retained = {library:plain(window.BIO_LIBRARY), depth:plain(window.BIO_DEPTH), enrichment:plain(window.BIO_ENRICHMENT)};
  assert.equal(retained.library.topics.length, 109);
  const references = retained.library.sources.filter(source => source.id === approvedSource.id);
  assert.deepEqual(references, [approvedSource]);
  const topic = retained.library.topics.find(item => item.id === id);
  assert.deepEqual(topic.sources, [...baseline.topic.sources, approvedSource.id]);
  assert.deepEqual(retained.depth[id].sources, [...baseline.depth.sources, approvedSource]);
  // Normalize the one approved addition, not an entire sources collection.
  retained.library.sources = retained.library.sources.filter(source => source.id !== approvedSource.id);
  topic.sources = topic.sources.filter(sourceId => sourceId !== approvedSource.id);
  retained.depth[id].sources = retained.depth[id].sources.filter(source => source.id !== approvedSource.id);
  delete retained.depth[id].investigation;
  delete retained.enrichment[id].workedExample;
  // Keep this historical checksum intact. The later phylogeny release has an
  // independent full-library baseline and normalizes only its exact new ref.
  const phylogenyId = 'phylogenetic-trees', phylogenySource = 'extended-core-phylogenyPrimer';
  retained.library.sources = retained.library.sources.filter(source => source.id !== phylogenySource);
  retained.library.topics.find(item => item.id === phylogenyId).visual = plain(phylogenyBaseline.topic.visual);
  retained.library.topics.find(item => item.id === phylogenyId).sources = plain(phylogenyBaseline.topic.sources);
  retained.depth[phylogenyId].investigation = plain(phylogenyBaseline.depth.investigation);
  retained.depth[phylogenyId].sources = plain(phylogenyBaseline.depth.sources);
  retained.enrichment[phylogenyId].workedExample = plain(phylogenyBaseline.enrichment.workedExample);
  assert.equal(digest(retained), '89c1fbe0b85cf2f4d9872ea7b9f8fe566d640200e34f74b52fb7052707fa6266',
    'Independently derived from accepted 0aea0f3: includes complete HW upgrade, all references, roadmap, six-mode lessons, MCQs and transfer tasks');
});
