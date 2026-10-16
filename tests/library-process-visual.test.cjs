/* Sequence diagrams are conceptual teaching aids, not fabricated anatomical models. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/library/visuals.js'), 'utf8').replace(/\r\n/g, '\n');
const context = vm.createContext({ window: {}, setInterval() { throw new Error('A static schematic must not start a timer'); } });
for (const name of ['topics', 'extended-core', 'extended-systems']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'src/library', name + '.js'), 'utf8'), context);
}
// Test-only access to the pure renderer; the shipped public API stays mount/preview.
vm.runInContext(source.replace('window.BioLibraryVisuals={mount,preview};', 'window.BioLibraryVisuals={mount,preview,process};'), context);
const { preview, process: sequence } = context.window.BioLibraryVisuals;
const topics = context.window.BIO_LIBRARY.topics;
// Normalize only the separately verified phylogeny additions back to accepted
// e34914e source. Historical hashes remain unchanged; no renderer is excluded.
function withoutPhylogeny(input) {
  const slot = /  function phylogeny\(topic,step\) \{[\s\S]*?\n  \}\n(?=  \/\/ These diagrams)/;
  assert.equal((input.match(new RegExp(slot.source, 'g')) || []).length, 1);
  let result = input.replace(slot, '');
  const replaceExactly = (before, after, count) => {
    assert.equal(result.split(before).length - 1, count, 'Precise phylogeny-only source boundary: ' + before);
    result = result.replaceAll(before, after);
  };
  replaceExactly("    if(id==='phylogenetic-trees') return phylogeny(topic,step);\n", '', 1);
  replaceExactly("    const isPhylogeny=topic.id==='phylogenetic-trees';\n", '', 1);
  replaceExactly("isPhylogeny?'Alternative tree drawings':", '', 1);
  replaceExactly("isPhylogeny?'annotation':", '', 2);
  replaceExactly("isPhylogeny?'Invented rooted trees, not observations or successive evolutionary stages. Branch lengths encode neither time nor amount of change.':", '', 1);
  replaceExactly("${isPhylogeny&&action==='back'&&step===0?'next':action}", '${action}', 1);
  return result;
}
const decode = value => value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const rows = svg => [...svg.matchAll(/<g data-process-stage="(\d+)" data-active="(true|false)">([\s\S]*?)<\/g><\/g>/g)].map(match => ({
  index: Number(match[1]), active: match[2] === 'true',
  title: [...match[3].matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].slice(1).map(item => decode(item[1])).join(' ')
}));

test('all 35 generic additions retain complete authored stage titles while phylogeny has its own topology view', () => {
  const generic = topics.map(topic => ({ topic, svg: preview(topic, { topics }) })).filter(item => item.svg.includes('data-process-sequence="true"'));
  assert.equal(generic.length, 35);
  assert.ok(generic.every(item => item.topic.id !== 'phylogenetic-trees'));
  assert.match(preview(topics.find(topic => topic.id === 'phylogenetic-trees'), {topics}), /data-phylogeny-view="0"/);
  for (const { topic, svg } of generic) {
    const stages = rows(svg);
    assert.equal(stages.length, topic.visual.steps.length, topic.id);
    assert.deepEqual(stages.map(row => row.title), Array.from(topic.visual.steps, stage => stage.title), topic.id + ' visible titles');
    assert.equal(stages.filter(row => row.active).length, 1, topic.id);
    assert.equal((svg.match(/marker-end=/g) || []).length, stages.length - 1, topic.id + ' directional links');
    assert.match(svg, /role="img"/);
    assert.match(svg, /<desc>Conceptual sequence; not an anatomical image or a timing model\./);
    assert.match(svg, /Order of ideas · not anatomy or elapsed time/);
    assert.doesNotMatch(svg, /<animate|<script|tabindex="0"|role="button"/);
    assert.ok(svg.includes('url(#bl-preview-' + topic.id + '-arrow)'), topic.id + ' unique marker');
  }
});

test('the complete sequence stays visible and the active highlight follows every authored stage', () => {
  for (const topic of topics.filter(topic => preview(topic, { topics }).includes('data-process-sequence="true"'))) {
    topic.visual.steps.forEach((stage, index) => {
      const svg = sequence(topic.visual.steps, index), stages = rows(svg);
      assert.deepEqual(stages.map(row => row.title), Array.from(topic.visual.steps, item => item.title), topic.id);
      assert.deepEqual(stages.filter(row => row.active).map(row => row.index), [index]);
      assert.ok(svg.includes('Current stage ' + (index + 1) + ' of ' + stages.length + ': '), topic.id);
      assert.ok(svg.includes('STEP ' + String(index + 1).padStart(2, '0') + ' / ' + String(stages.length).padStart(2, '0')));
    });
  }
});

test('wrapping preserves authored words and SVG markup is escaped', () => {
  const stages = [{ title: 'Condition probabilities on known information & <evidence>' }, { title: 'Read "A" versus \'B\'' }];
  const svg = sequence(stages, 1);
  assert.deepEqual(rows(svg).map(row => row.title), stages.map(stage => stage.title));
  assert.match(svg, /&amp; &lt;evidence&gt;/);
  assert.match(svg, /&quot;A&quot;/);
  assert.doesNotMatch(svg, /<evidence>/);
});

test('stage bounds and an empty sequence never produce missing text or invalid geometry', () => {
  const stages = [{ title: 'Observe' }, { title: 'Explain' }];
  for (const [input, active] of [[-2, 0], [100, 1], [NaN, 0], [1.9, 1]]) {
    const svg = sequence(stages, input);
    assert.deepEqual(rows(svg).filter(row => row.active).map(row => row.index), [active]);
    assert.doesNotMatch(svg, /NaN|undefined|height="-/);
  }
  assert.deepEqual(rows(sequence([], 0)).map(row => row.title), ['Follow the mechanism']);
});

test('specialized diagrams and pre-existing controls remain byte-preserved outside the two approved slots', () => {
  const processSlot = /  function process\(steps,step\) \{[\s\S]*?(?=  \/\/ These diagrams)/;
  assert.match(source, processSlot);
  const badge = ":kind==='process'?'Conceptual sequence':'Interactive model'";
  assert.equal(source.split(badge).length - 1, 1);
  const preserved = withoutPhylogeny(source).replace(processSlot, '').replace(badge, ":'Interactive model'");
  assert.equal(crypto.createHash('sha256').update(preserved).digest('hex'),
    '52a355b963739829713890f8cf398074e5ca90ff066d2b01c6f5237da33623bb',
    'Captured from pre-change HEAD; all specialized renderers, helpers, preview API and existing interactions are unchanged');
  for (const id of ['photosynthesis', 'cell-structure', 'mitosis', 'heart-circulation', 'homeostasis', 'atp', 'synapses']) {
    const topic = topics.find(item => item.id === id);
    assert.ok(topic, id);
    assert.doesNotMatch(preview(topic, { topics }), /data-process-sequence/, id + ' retains its specialized diagram');
  }
});

test('the full accepted visual source and all other 108 previews are unchanged outside precise phylogeny additions', () => {
  const accepted = withoutPhylogeny(source);
  assert.equal(crypto.createHash('sha256').update(accepted).digest('hex'),
    '6a011aa5204deaff64eb98c61cac329d41a45aeea36276adc839d4e822c33edd',
    'Independently captured from e34914e0415b2f2f2254a2bdb1fde9d2c7987427, including the complete process renderer and existing control behavior');
  const reference = vm.createContext({window:{}, setInterval(){throw Error('A preview must not start a timer');}});
  vm.runInContext(accepted, reference);
  let checked = 0;
  for (const topic of topics.filter(item => item.id !== 'phylogenetic-trees')) {
    assert.equal(preview(topic, {topics}), reference.window.BioLibraryVisuals.preview(topic, {topics}), topic.id + ': exact accepted SVG preview');
    checked++;
  }
  assert.equal(checked, 108);
});
