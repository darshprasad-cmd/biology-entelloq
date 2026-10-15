/* Native evidence tables retain authored relationships while their visual
 * presentation adapts. Real scroll geometry belongs to the browser checks. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const files = ['topics', 'learning-cards', 'depth-foundations', 'depth-processes', 'extended-core', 'extended-systems', 'depth-study'];
const plain = value => JSON.parse(JSON.stringify(value));
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));

function setup() {
  const records = new Map([['bioq_lessons_v1', 'Unrelated private lesson journal']]), writes = [];
  const window = {localStorage:{
    getItem:key => records.has(key) ? records.get(key) : null,
    setItem:(key, value) => { records.set(key, value); writes.push([key, value]); }
  }};
  const context = vm.createContext({window});
  for (const name of files) vm.runInContext(fs.readFileSync(path.join(root, 'src/library', name + '.js'), 'utf8'), context, {filename:name});
  return {window, records, writes, api:window.BioDepth, topics:window.BIO_LIBRARY.topics};
}

function attributes(source) {
  const result = new Map();
  for (const match of source.matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    assert.ok(!result.has(match[1]), 'Markup cannot repeat an attribute');
    result.set(match[1], match[2] ?? match[3] ?? match[4] ?? '');
  }
  return result;
}

function elements(markup, tag) {
  return [...markup.matchAll(new RegExp('<' + tag + '\\b([^>]*)>([\\s\\S]*?)<\\/' + tag + '>', 'g'))]
    .map(match => ({attributes:attributes(match[1]), body:match[2], outer:match[0]}));
}

function assertNotHidden(element, label) {
  const attrs = element.attributes;
  assert.equal(attrs.has('hidden'), false, label + ': not a hidden alternate layout');
  assert.equal(attrs.has('inert'), false, label + ': not inert');
  assert.notEqual(attrs.get('aria-hidden'), 'true', label + ': retained in the accessibility tree');
  assert.ok(!['none', 'presentation'].includes(attrs.get('role')), label + ': native semantics are not suppressed');
  assert.doesNotMatch(attrs.get('style') || '', /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i, label + ': no inline hiding');
}

function assertNative(element, label) {
  assertNotHidden(element, label);
  assert.equal(element.attributes.has('role'), false, label + ': implicit native role is not overridden');
}

function assertEvidenceTable(markup, task, label) {
  const wrappers = [...markup.matchAll(/<div\b([^>]*\bclass="[^"]*\bbd-table-wrap\b[^"]*"[^>]*)>([\s\S]*?)<\/div>/g)];
  assert.equal(wrappers.length, 1, label + ': exactly one evidence scroll region');
  const region = {attributes:attributes(wrappers[0][1]), body:wrappers[0][2]};
  assertNotHidden(region, label + ' region');
  assert.equal(region.attributes.get('role'), 'region');
  assert.equal(region.attributes.get('aria-label'), 'Evidence table');
  assert.equal(region.attributes.get('tabindex'), '0', label + ': native keyboard scroll target remains reachable');
  assert.equal(elements(markup, 'table').length, 1, label + ': no cloned table, including hidden mobile alternatives');
  assert.doesNotMatch(markup, /\brole=["'](?:table|grid)["']/i, label + ': no parallel ARIA-only table replacing or duplicating native structure');
  const tables = elements(region.body, 'table');
  assert.equal(tables.length, 1);
  const table = tables[0];
  assertNative(table, label + ' table');
  assert.equal(region.body.trim(), table.outer,
    label + ': scroll region contains only the single native table, not a duplicate card layout');
  const captions = elements(table.body, 'caption'), heads = elements(table.body, 'thead'), bodies = elements(table.body, 'tbody');
  assert.equal(captions.length, 1, label + ': one native caption');
  assert.equal(captions[0].body, escape(task.title), label + ': exact authored caption');
  assert.equal(heads.length, 1);
  assert.equal(bodies.length, 1);
  for (const [name, element] of [['caption', captions[0]], ['thead', heads[0]], ['tbody', bodies[0]]]) assertNative(element, label + ' ' + name);
  assert.equal(table.body.replace(captions[0].outer, '').replace(heads[0].outer, '').replace(bodies[0].outer, '').trim(), '',
    label + ': only caption, heading section and data section, not an extra hidden layout');
  assert.equal(elements(heads[0].body, 'tr').length, 1, label + ': one column-heading row');
  const headers = elements(heads[0].body, 'th');
  assert.equal(headers.length, task.columns.length);
  assert.equal(elements(heads[0].body, 'td').length, 0, label + ': column headers remain header cells');
  headers.forEach((header, column) => {
    assertNative(header, label + ' column ' + column);
    assert.equal(header.attributes.get('scope'), 'col');
    assert.equal(header.attributes.get('rowspan') ?? '1', '1');
    assert.equal(header.attributes.get('colspan') ?? '1', '1');
    assert.equal(header.body, escape(task.columns[column]), label + ': exact authored column heading');
  });
  const rows = elements(bodies[0].body, 'tr');
  assert.equal(rows.length, task.rows.length, label + ': no omitted or duplicated evidence rows');
  rows.forEach((row, rowIndex) => {
    assertNative(row, label + ' row ' + rowIndex);
    const cells = [...row.body.matchAll(/<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/g)];
    assert.equal(cells.length, task.columns.length, label + ': no omitted or duplicated cells');
    cells.forEach((cell, column) => {
      const element = {attributes:attributes(cell[2]), body:cell[3]};
      assertNative(element, label + ' cell ' + rowIndex + ',' + column);
      assert.equal(cell[1], column === 0 ? 'th' : 'td', label + ': row labels and data retain native cell types');
      assert.equal(element.attributes.get('scope'), column === 0 ? 'row' : undefined);
      assert.equal(element.attributes.get('rowspan') ?? '1', '1');
      assert.equal(element.attributes.get('colspan') ?? '1', '1');
      assert.equal(element.body, escape(task.rows[rowIndex][column]), label + ': exact authored row/column intersection');
    });
  });
}

test('all 109 Learn and Reason tables preserve one caption, scoped native headers and every exact authored cell', () => {
  const {api, topics} = setup();
  assert.equal(topics.length, 109);
  let checked = 0;
  for (const topic of topics) for (const view of ['learn', 'reason']) {
    assertEvidenceTable(api.markup(topic, view), api.unitFor(topic.id).investigation, topic.id + ' / ' + view);
    checked++;
  }
  assert.equal(checked, 218);
});

test('caption, column heading, row label and data-cell text are escaped, never treated as HTML', () => {
  const {api, topics} = setup(), topic = topics.find(item => item.id === 'recombinant-dna');
  const task = api.unitFor(topic.id).investigation;
  task.title = '<img src=x onerror="alert(1)"> & "caption"';
  task.columns = ['<script>alert(2)</script>', 'A & B', '"quoted" and \'single\''];
  task.rows = [['<svg onload="alert(3)">', '<b>not bold</b>', 'x < y & y > z'], ['"row label"', 0, "'quoted value'"]];
  for (const view of ['learn', 'reason']) {
    const markup = api.markup(topic, view);
    assertEvidenceTable(markup, task, 'escaped synthetic table / ' + view);
    assert.doesNotMatch(markup, /<(?:img|script|svg|b)\b/i, 'Injected cell content creates no executable or formatting element');
    assert.ok(markup.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
    assert.ok(markup.includes('<td>0</td>'), 'A zero value must not disappear as a falsy cell');
  }
});

test('rendering either evidence view leaves authored content, saved comparisons, review choices and exported notes unchanged', () => {
  const {api, topics, window, records, writes} = setup();
  for (const [index, topic] of topics.entries()) for (const kind of ['investigation', 'transfer']) {
    assert.equal(api.write(topic.id, kind, api.unitFor(topic.id)[kind], {
      draft:'Private ' + kind + ' reasoning for ' + topic.id,
      revealed:index % 2 === 0, compared:true, rating:kind === 'investigation' && index % 2 === 0 ? 'revisit' : 'explained'
    }), true);
  }
  const content = () => plain({library:window.BIO_LIBRARY, depth:window.BIO_DEPTH, enrichment:window.BIO_ENRICHMENT});
  const contentBefore = content(), recordsBefore = [...records], writesBefore = writes.length;
  const notesBefore = topics.map(topic => api.notes(topic));
  const reviewsBefore = Array.from(api.reviewItems(topics), topic => topic.id);
  const statesBefore = topics.map(topic => ['investigation', 'transfer'].map(kind => plain(api.read(topic.id, kind, api.unitFor(topic.id)[kind]))));
  for (const topic of topics) for (const view of ['learn', 'reason']) api.markup(topic, view);
  assert.deepEqual(content(), contentBefore, 'The responsive presentation must not rewrite authored content or task signatures');
  assert.deepEqual([...records], recordsBefore, 'Every persisted record remains byte-identical');
  assert.equal(writes.length, writesBefore, 'Rendering performs no storage writes');
  assert.deepEqual(topics.map(topic => api.notes(topic)), notesBefore, 'Export text retains exact data, drafts, limits and reviewed explanations');
  assert.deepEqual(Array.from(api.reviewItems(topics), topic => topic.id), reviewsBefore);
  assert.deepEqual(topics.map(topic => ['investigation', 'transfer'].map(kind => plain(api.read(topic.id, kind, api.unitFor(topic.id)[kind])))), statesBefore);
  assert.equal(records.get('bioq_lessons_v1'), 'Unrelated private lesson journal');
});
