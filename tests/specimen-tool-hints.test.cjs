const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'src/lab', name + '.js'), 'utf8');

test('all authored numeric tool hints agree with the live keyboard and gesture tool order', () => {
  const main = read('main');
  const order = vm.runInNewContext(main.match(/const TOOL_ORDER\s*=\s*(\[[^;]+\]);/)[1]);
  const keys = vm.runInNewContext('(' + main.match(/const tools\s*=\s*(\{[^;]+\});/)[1] + ')');
  assert.equal(order.length, 6);
  order.forEach((id, index) => assert.equal(keys[index + 1], id));
  let checked = 0;
  for (const name of ['anatomy', 'frog', 'cockroach', 'fish', 'earthworm', 'heart', 'shell', 'main']) {
    for (const match of read(name).matchAll(/\b(Probe|Scalpel|Forceps|Pins|Retractor|Swab)\s*\((\d+)\)/g)) {
      assert.equal(Number(match[2]), order.indexOf(match[1].toLowerCase()) + 1, name + ': ' + match[0]); checked++;
    }
  }
  assert.ok(checked >= 20, 'cover species guides, shell objectives and camera instruction together');
});
