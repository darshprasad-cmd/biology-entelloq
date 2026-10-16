/* Original topology evidence: independently traverse graphs and preserve the
 * accepted content/private-study contracts outside this one bounded upgrade. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const baseline = require('./fixtures/phylogeny-evidence-e34914e.json');
const root = path.resolve(__dirname, '..');
const files = ['topics', 'learning-cards', 'depth-foundations', 'depth-processes', 'extended-core', 'extended-systems', 'depth-study'];
const id = 'phylogenetic-trees', prefix = 'bioq.depth-study.v1.';
const approvedSource = {id:'extended-core-phylogenyPrimer', title:'UC Museum of Paleontology: Understanding phylogenies', url:'https://evolution.berkeley.edu/evolution-101/the-history-of-life-looking-at-the-patterns/understanding-phylogenies/'};
const plain = value => JSON.parse(JSON.stringify(value));
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const signature = task => JSON.stringify([task.question, task.answer, task.rows || []]);

function setup(records = new Map()) {
  const window = {localStorage:{getItem:key => records.has(key) ? records.get(key) : null, setItem:(key, value) => records.set(key, value)}};
  const context = vm.createContext({window, setInterval(){ throw Error('Rendering a static tree must not start a timer'); }});
  for (const name of files) vm.runInContext(fs.readFileSync(path.join(root, 'src/library', name + '.js'), 'utf8'), context, {filename:name});
  return {window, context, records, api:window.BioDepth, topic:window.BIO_LIBRARY.topics.find(item => item.id === id), unit:window.BIO_DEPTH[id]};
}

// Parse the evidence's parenthesized topology independently from visual.groups.
// This deliberately supports the stated binary four-tip model, not dates or
// branch lengths that the lesson does not supply.
function parseGrouping(text) {
  let cursor = 0;
  function read() {
    if (text[cursor] !== '(') {
      const tip = text[cursor++];
      assert.match(tip || '', /^[A-D]$/);
      return tip;
    }
    cursor++;
    const left = read();
    assert.equal(text[cursor++], ',');
    const right = read();
    assert.equal(text[cursor++], ')');
    return [left, right];
  }
  const tree = read();
  assert.equal(cursor, text.length, 'All input belongs to the topology, with no hidden scale or dates');
  return tree;
}

function graphFromGrouping(grouping) {
  const children = new Map(), parents = new Map(), tips = new Map();
  let sequence = 0;
  function visit(group) {
    const node = 'node-' + sequence++;
    if (typeof group === 'string') {
      assert.match(group, /^[A-D]$/);
      assert.equal(tips.has(group), false, 'Each lineage is represented once');
      tips.set(group, node); children.set(node, []);
    } else {
      assert.ok(Array.isArray(group) && group.length === 2, 'Every internal node bifurcates in this model');
      const descendants = group.map(visit);
      children.set(node, descendants);
      descendants.forEach(child => parents.set(child, node));
    }
    return node;
  }
  const rootNode = visit(grouping);
  assert.deepEqual([...tips.keys()].sort(), ['A','B','C','D']);
  assert.equal(children.size, 7);
  assert.equal(parents.size, 6);
  const descendantTips = node => {
    const childNodes = children.get(node);
    return childNodes.length ? childNodes.flatMap(descendantTips).sort() : [...tips].filter(([, value]) => value === node).map(([tip]) => tip);
  };
  const ancestors = node => {
    const result = [];
    for (let current = node; current !== undefined; current = parents.get(current)) result.unshift(current);
    return result;
  };
  const mrca = (first, second) => {
    const a = ancestors(tips.get(first)), b = ancestors(tips.get(second));
    let common;
    for (let index = 0; index < Math.min(a.length, b.length) && a[index] === b[index]; index++) common = a[index];
    return common;
  };
  const clades = [...children.keys()].filter(node => node !== rootNode && children.get(node).length).map(node => descendantTips(node).join('')).sort();
  return {root:rootNode, children, parents, tips, descendantTips, mrca, clades};
}

test('the immutable one-lesson snapshot is captured from the exact accepted release', () => {
  assert.equal(baseline.provenance.commit, 'e34914e0415b2f2f2254a2bdb1fde9d2c7987427');
  assert.deepEqual(baseline.provenance.sourceFiles, files.filter(name => name !== 'depth-study').map(name => 'src/library/' + name + '.js'));
  const expected = '8c0d7942d219747f75ae5e6b0e7c747e1ba0a536f37e0901c1a5a77d02dce082';
  assert.equal(baseline.provenance.sha256, expected);
  assert.equal(digest({topic:baseline.topic, depth:baseline.depth, enrichment:baseline.enrichment}), expected);
  assert.equal(baseline.depth.investigation.title, 'Read a topology without a picture');
});

test('independent graph traversal distinguishes a node rotation from a changed ancestry hypothesis', () => {
  const {topic, unit} = setup(), drawings = plain(topic.visual.trees), evidence = plain(unit.investigation.rows);
  assert.deepEqual(drawings.map(tree => tree.id), ['T1','T2','T3']);
  assert.deepEqual(evidence.map(row => row[0]), ['T1','T2','T3']);
  const graphs = drawings.map((drawing, index) => {
    const fromEvidence = parseGrouping(evidence[index][1]);
    assert.deepEqual(drawing.groups, fromEvidence, drawing.id + ': diagram order matches the authored evidence');
    return graphFromGrouping(fromEvidence);
  });
  assert.deepEqual(graphs[0].clades, ['AB','CD']);
  assert.deepEqual(graphs[1].clades, graphs[0].clades, 'T2 preserves every non-root clade');
  assert.notDeepEqual(drawings[1].groups.flat(), drawings[0].groups.flat(), 'The equivalent drawing really changes tip order');
  assert.deepEqual(graphs[2].clades, ['AC','BD']);
  assert.notDeepEqual(graphs[2].clades, graphs[0].clades, 'T3 is not just another rotation');
  for (const graph of graphs.slice(0, 2)) {
    assert.equal(graph.mrca('A','C'), graph.mrca('A','D'), 'A has the same most recent common ancestor with C and D');
    assert.equal(graph.mrca('A','C'), graph.root);
    assert.notEqual(graph.mrca('A','B'), graph.root, 'B shares a more recent node with A');
    assert.deepEqual(graph.descendantTips(graph.mrca('A','C')), ['A','B','C','D'], 'A+C omits descendants of their MRCA and is not a clade');
  }
  assert.deepEqual(graphs[2].descendantTips(graphs[2].mrca('A','C')), ['A','C'], 'A+C is a clade only in the changed topology');
  assert.deepEqual(drawings.map(tree => Object.keys(tree).sort()), [['groups','id'],['groups','id'],['groups','id']], 'No invented numerical branch lengths, dates or confidence scores');
});

test('each actual SVG connects seven nodes with six edges and its drawn graph has the stated clades and MRCA', () => {
  const {window, context, topic} = setup();
  const source = fs.readFileSync(path.join(root, 'src/library/visuals.js'), 'utf8');
  const api = 'window.BioLibraryVisuals={mount,preview};';
  assert.equal(source.split(api).length - 1, 1);
  // Expose the production pure renderer to this VM only, not the shipped API.
  vm.runInContext(source.replace(api, 'window.BioLibraryVisuals={mount,preview,phylogeny};'), context);
  const attribute = (markup, name) => markup.match(new RegExp('\\b' + name + '="([^"]*)"'))?.[1];
  for (let index = 0; index < 3; index++) {
    const drawing = topic.visual.trees[index], svg = window.BioLibraryVisuals.phylogeny(topic, index);
    assert.ok(svg.includes('data-tree-id="' + drawing.id + '"'));
    assert.match(svg, /<desc>[^<]*All four tips are living sampled lineages\. No time or change scale is supplied\.<\/desc>/);
    assert.doesNotMatch(svg, /<animate|<script|NaN|undefined|role="button"|tabindex="0"/);
    const nodes = new Map(), edges = [];
    for (const match of svg.matchAll(/<g data-phylogeny-clade="([^"]+)">([\s\S]*?)<\/g>/g)) {
      const circles = [...match[2].matchAll(/<circle\b([^>]*)\/>/g)];
      assert.equal(circles.length, 1, 'Every drawn node has one real circle');
      const x = Number(attribute(circles[0][1], 'cx')), y = Number(attribute(circles[0][1], 'cy'));
      assert.ok(Number.isFinite(x) && Number.isFinite(y));
      const position = x + ',' + y;
      assert.equal(nodes.has(position), false, 'Different graph nodes cannot overlap');
      const tip = match[2].match(/<text data-phylogeny-tip="([^"]+)"[^>]*>([^<]*)<\/text>/);
      if (tip) { assert.match(tip[2], /^[A-D]$/); assert.equal(tip[1], tip[2]); }
      nodes.set(position, {declaredClade:match[1], tip:tip?.[2], children:[]});
    }
    assert.equal(nodes.size, 7);
    for (const match of svg.matchAll(/<path\b[^>]*\bdata-phylogeny-edge\b[^>]*>/g)) {
      const coordinates = attribute(match[0], 'd')?.match(/^M(-?[\d.]+) (-?[\d.]+)L(-?[\d.]+) (-?[\d.]+)$/);
      assert.ok(coordinates, 'Each branch is an actual straight edge with explicit endpoints');
      const [,x1,y1,x2,y2] = coordinates.map(Number);
      const from = x1 + ',' + y1, to = x2 + ',' + y2;
      assert.ok(nodes.has(from) && nodes.has(to), 'Every line joins existing drawn node centers');
      assert.notEqual(from, to);
      assert.equal(nodes.get(to).parent, undefined, 'A rooted tree node has only one parent');
      nodes.get(from).children.push(to);
      nodes.get(to).parent = from;
      edges.push([from,to]);
    }
    assert.equal(edges.length, 6);
    const roots = [...nodes.keys()].filter(position => !nodes.get(position).parent);
    assert.equal(roots.length, 1);
    const seen = new Set();
    const descendants = position => {
      assert.equal(seen.has(position), false, 'The actual branch drawing has no cycle or shared child');
      seen.add(position);
      const node = nodes.get(position);
      assert.equal(node.children.length, node.tip ? 0 : 2);
      const tips = node.tip ? [node.tip] : node.children.flatMap(descendants).sort();
      assert.equal(node.declaredClade, tips.join(' '), 'Node annotation agrees with actual connected descendant tips');
      node.descendants = tips;
      return tips;
    };
    assert.deepEqual(descendants(roots[0]), ['A','B','C','D']);
    assert.equal(seen.size, 7, 'All drawn nodes belong to one connected tree');
    const expected = graphFromGrouping(plain(drawing.groups));
    assert.deepEqual([...nodes].filter(([position,node]) => position !== roots[0] && node.children.length).map(([,node]) => node.descendants.join('')).sort(), expected.clades);
    const ancestry = tip => {
      let position = [...nodes].find(([,node]) => node.tip === tip)[0];
      const chain = [];
      while (position !== undefined) { chain.unshift(position); position = nodes.get(position).parent; }
      return chain;
    };
    const mrca = (a,b) => {
      const first = ancestry(a), second = ancestry(b);
      let common;
      for (let n = 0; n < Math.min(first.length,second.length) && first[n] === second[n]; n++) common = first[n];
      return common;
    };
    if (index < 2) {
      assert.equal(mrca('A','C'), roots[0]);
      assert.equal(mrca('A','D'), roots[0]);
      assert.notEqual(mrca('A','B'), roots[0]);
    } else {
      assert.notEqual(mrca('A','C'), roots[0]);
      assert.equal(mrca('A','B'), roots[0]);
    }
  }
  const preview = window.BioLibraryVisuals.preview(topic, {topics:window.BIO_LIBRARY.topics});
  assert.match(preview, /<svg[^>]*role="img"[^>]*aria-label="Phylogenetic Trees — model preview"[^>]*focusable="false"/);
  assert.match(preview, /data-tree-id="T1"/);
  assert.doesNotMatch(preview, /data-process-sequence/);
});

test('interpretation states equal relatedness, inclusive clades, unscaled branches and hypothetical evidence', () => {
  const {topic, unit} = setup(), task = unit.investigation;
  assert.equal(task.title, 'Same ancestry, different drawing');
  assert.deepEqual(plain(task.columns), ['Drawing','Nested grouping']);
  assert.match(task.context, /invented rooted trees.*four living tip lineages/i);
  assert.match(task.context, /not successive stages of evolution/);
  assert.match(task.answer, /T2 preserves T1’s clades AB and CD/);
  assert.match(task.answer, /T3 instead groups AC and BD/);
  assert.match(task.answer, /A is equally related to C and D/);
  assert.match(task.answer, /A\+C alone is not a clade/);
  assert.match(task.answer, /no split can be dated/);
  assert.match(task.limitation, /not measured evolutionary evidence/);
  assert.match(task.limitation, /No sequence data, character analysis or statistical support/);
  assert.match(task.limitation, /does not establish which hypothesis describes a real lineage/);
  assert.match(task.limitation, /Branch lengths are unscaled/);
  const explanation = task.reasoning.join(' ');
  assert.match(explanation, /rotat/i);
  assert.match(explanation, /all four tips.*A\+C alone excludes descendants/);
  assert.match(explanation, /no time scale|unscaled/i);
  assert.match(explanation, /more evolved/);
  assert.equal(topic.visual.kind, 'process', 'Keep the existing visual-kind contract');
  assert.deepEqual(Array.from(topic.visual.steps, step => step.title), ['T1 · trace common ancestry','T2 · rotate, retain connections','T3 · change a relationship']);
});

test('canonical references, Learn evidence and the derived Reason example share the same revised task', () => {
  const {window, api, topic, unit} = setup();
  assert.deepEqual(plain(window.BIO_LIBRARY.sources.filter(source => source.id === approvedSource.id)), [approvedSource]);
  assert.deepEqual(plain(topic.sources), [...baseline.topic.sources, approvedSource.id]);
  assert.deepEqual(plain(unit.sources), [...baseline.depth.sources, approvedSource]);
  assert.deepEqual(plain(topic.sources.map(sourceId => window.BIO_LIBRARY.sources.find(source => source.id === sourceId))), plain(unit.sources));
  assert.deepEqual(plain(window.BIO_ENRICHMENT[id].workedExample), {question:unit.investigation.question, steps:plain(unit.investigation.reasoning), answer:unit.investigation.answer});
  for (const view of ['learn','reason']) {
    const markup = api.markup(topic, view);
    assert.ok(markup.includes('<caption>' + unit.investigation.title + '</caption>'));
    for (const [drawing, grouping] of unit.investigation.rows) assert.ok(markup.includes('<th scope="row">' + drawing + '</th><td>' + grouping + '</td>'));
    assert.ok(markup.includes('href="' + approvedSource.url + '"'));
    assert.doesNotMatch(markup, /Read a topology without a picture/);
  }
});

test('six modes, all three MCQs, transfer, mechanisms, objectives and curiosity remain exactly accepted', () => {
  const {window, topic, unit} = setup();
  const retainedTopic = plain(topic), retainedDepth = plain(unit), retainedCards = plain(window.BIO_ENRICHMENT[id]);
  retainedTopic.visual = plain(baseline.topic.visual);
  retainedTopic.sources = plain(baseline.topic.sources);
  retainedDepth.investigation = plain(baseline.depth.investigation);
  retainedDepth.sources = plain(baseline.depth.sources);
  retainedCards.workedExample = plain(baseline.enrichment.workedExample);
  assert.deepEqual(retainedTopic, baseline.topic);
  assert.deepEqual(retainedDepth, baseline.depth);
  assert.deepEqual(retainedCards, baseline.enrichment);
});

for (const oldState of [{revealed:true, compared:true, rating:'revisit'}, {revealed:false, compared:true, rating:'explained'}]) {
  test('old ' + oldState.rating + ' evidence keeps its private draft without falsely reviewing the new comparison', () => {
    const records = new Map([['bioq_lessons_v1','Unrelated private lesson journal']]);
    const {api, window, topic, unit} = setup(records), oldTask = baseline.depth.investigation;
    const draft = 'My original reasoning about a single tree and its common ancestral root.';
    assert.equal(api.write(id, 'investigation', oldTask, {...oldState, draft}), true);
    const old = api.read(id, 'investigation', oldTask).value;
    assert.equal(old.signature, signature(oldTask));
    assert.equal(old.compared, true);
    assert.equal(old.rating, oldState.rating);
    assert.notEqual(old.signature, signature(unit.investigation));
    const oldStored = records.get(prefix + id + '.investigation');
    assert.deepEqual(plain(unit.transfer), baseline.depth.transfer);
    const transferDraft = 'My separate reviewed explanation about analogous wings.';
    api.write(id, 'transfer', baseline.depth.transfer, {draft:transferDraft, revealed:false, compared:true, rating:'explained'});
    const transferStored = records.get(prefix + id + '.transfer');
    const other = window.BIO_LIBRARY.topics.find(item => item.id === 'recombinant-dna');
    api.write(other.id, 'investigation', api.unitFor(other.id).investigation, {draft:'Independent plasmid reasoning.', revealed:true, compared:true, rating:'revisit'});
    const otherStored = records.get(prefix + other.id + '.investigation'), otherNotes = api.notes(other);
    const migrated = api.read(id, 'investigation', unit.investigation);
    assert.equal(migrated.saved, true);
    assert.equal(migrated.value.draft, draft);
    assert.equal(migrated.value.signature, signature(unit.investigation));
    assert.equal(migrated.value.revealed, false);
    assert.equal(migrated.value.compared, false);
    assert.equal(migrated.value.rating, '');
    assert.equal(records.get(prefix + id + '.investigation'), oldStored, 'Reading does not destructively rewrite the prior draft');
    assert.deepEqual(Array.from(api.reviewItems([topic, other]), item => item.id), [other.id]);
    const notes = api.notes(topic), investigationNotes = notes.split('## Transfer the idea')[0];
    assert.ok(investigationNotes.includes(draft));
    assert.match(investigationNotes, /Self-review: Not reviewed/);
    assert.doesNotMatch(investigationNotes, /Worked explanation:/);
    for (const row of unit.investigation.rows) assert.ok(investigationNotes.includes('| ' + row.join(' | ') + ' |'));
    assert.ok(investigationNotes.includes(unit.investigation.limitation));
    assert.ok(notes.includes(transferDraft) && notes.includes(unit.transfer.answer));
    assert.ok(notes.includes(approvedSource.title + ': ' + approvedSource.url));
    api.write(id, 'investigation', unit.investigation, migrated.value);
    const remounted = setup(records).api;
    assert.equal(remounted.read(id, 'investigation', unit.investigation).value.draft, draft);
    assert.equal(remounted.read(id, 'investigation', unit.investigation).value.compared, false);
    assert.equal(remounted.read(id, 'investigation', unit.investigation).value.rating, '');
    remounted.write(id, 'investigation', unit.investigation, {...migrated.value, compared:true, revealed:true, rating:'explained'});
    assert.ok(remounted.notes(topic).includes(unit.investigation.answer), 'Only a new comparison exports the revised worked answer');
    assert.equal(records.get(prefix + id + '.transfer'), transferStored);
    assert.equal(records.get(prefix + other.id + '.investigation'), otherStored);
    assert.equal(remounted.notes(other), otherNotes);
    assert.equal(records.get('bioq_lessons_v1'), 'Unrelated private lesson journal');
  });
}

test('the complete accepted library is preserved outside this visual/evidence change and exact source addition', () => {
  const {window} = setup();
  const retained = {library:plain(window.BIO_LIBRARY), depth:plain(window.BIO_DEPTH), enrichment:plain(window.BIO_ENRICHMENT)};
  assert.equal(retained.library.topics.length, 109);
  assert.deepEqual(retained.library.sources.filter(source => source.id === approvedSource.id), [approvedSource]);
  const topic = retained.library.topics.find(item => item.id === id);
  assert.deepEqual(topic.sources, [...baseline.topic.sources, approvedSource.id]);
  assert.deepEqual(retained.depth[id].sources, [...baseline.depth.sources, approvedSource]);
  retained.library.sources = retained.library.sources.filter(source => source.id !== approvedSource.id);
  topic.sources = topic.sources.filter(sourceId => sourceId !== approvedSource.id);
  retained.depth[id].sources = retained.depth[id].sources.filter(source => source.id !== approvedSource.id);
  delete topic.visual;
  delete retained.depth[id].investigation;
  delete retained.enrichment[id].workedExample;
  assert.equal(digest(retained), '520ca4e60b288a7e9bcfdb22aadc0463c567dd659dd74842c1542c61a0188642',
    'Independently derived from accepted e34914e: every other lesson, source, MCQ, roadmap, objective and transfer remains intact');
});
