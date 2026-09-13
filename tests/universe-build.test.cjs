const { test } = require('node:test');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const modules = ['kit.js', 'core.js', 'stage_cosmic.js', 'stage_molecular.js', 'ui.js'];
const digest = text => crypto.createHash('sha256').update(text).digest('hex');

test('Universe modified slots match source; original import map, launcher and other modules retain fingerprint', () => {
  const original = fs.readFileSync(path.join(root, 'universe.html'), 'utf8');
  let masked = original;
  for (const name of modules) {
    const re = new RegExp('(^/\\* ===== ' + name.replaceAll('.', '\\.') + ' =+ \\*/\\r?\\n)([\\s\\S]*?)(?=^/\\* ===== [\\w.-]+ =+ \\*/|^</script>)', 'gm');
    const matches = [...original.matchAll(re)]; assert.equal(matches.length, 1, name);
    assert.equal(matches[0][2].replaceAll('\r\n', '\n').trim(), fs.readFileSync(path.join(root, 'src/universe', name), 'utf8').replaceAll('\r\n', '\n').trim(), name + ' synchronized');
    masked = masked.replace(re, '$1APPROVED UNIVERSE SOURCE SLOT\n');
    new vm.Script(matches[0][2], { filename: name });
  }
  assert.equal(digest(masked.replaceAll('\r\n', '\n')), fs.readFileSync(path.join(root, 'tests/fixtures/universe-shell.sha256'), 'utf8').trim());
  assert.match(original, /"three"\s*:\s*"data:text\/javascript;base64,/);
  const before = digest(original);
  execFileSync(process.env.BIOLOGY_PYTHON || 'python', ['scripts/build-universe.py', '--check'], { cwd: root, windowsHide: true });
  assert.equal(digest(fs.readFileSync(path.join(root, 'universe.html'), 'utf8')), before, '--check is read-only');
});

test('the illustrative scale stays qualified and keyboard/motion controls remain accessible', () => {
  const ui = fs.readFileSync(path.join(root, 'src/universe/ui.js'), 'utf8');
  assert.match(ui, /uSize\.textContent = d\.size/);
  assert.match(ui, /zoom transitions are not to scale/);
  assert.match(ui, /const LAB_URL = '\.\/lab\.html'/);
  assert.match(ui, /prefers-reduced-motion:reduce/);
  assert.match(ui, /aria-current/);
  assert.match(ui, /e\.detail === 0/);
});
