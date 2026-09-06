/* Fast, non-mutating validation: each independent check gets its own process.
   No runtime dependencies, browser launches, downloads, Git writes or builders
   that can touch the dissection artifact. Run from any working directory. */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const python = process.env.BIOLOGY_PYTHON || 'python';
const pages = ['index.html', 'app.html', 'learn.html', 'lessons.html', 'reason.html', 'labs.html', 'solve.html', 'explore.html', 'me.html', 'about.html'];

if (process.argv.includes('--syntax-only')) {
  let count = 0;
  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    // Consume styles and HTML comments too: their documentation may literally
    // contain a <script> example that is not an executable script element.
    const blocks = /<!--[\s\S]*?-->|<style\b[^>]*>[\s\S]*?<\/style>|<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    for (const match of html.matchAll(blocks)) {
      if (match[1] === undefined) continue;
      if (/\bsrc\s*=|\btype\s*=\s*["'](?:module|application\/|importmap)/i.test(match[1]) || !match[2].trim()) continue;
      new vm.Script(match[2], { filename: file + ':inline-' + count++ });
    }
  }
  console.log(count + ' inline scripts parse across ' + pages.length + ' non-lab pages.');
  process.exit(0);
}

const unitFiles = fs.readdirSync(path.join(root, 'tests')).filter(name => /\.test\.(?:mjs|cjs)$/.test(name)).map(name => 'tests/' + name);
const checks = [
  ['Python contracts', python, ['-m', 'unittest', 'discover', '-s', 'tests']],
  ['Dissection boundaries', python, ['-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_lab_unchanged.py']],
  ['Shared navigation', process.execPath, ['scripts/check-network.cjs']],
  ['Tutorial contract', process.execPath, ['tests/check-feature-tutorials.cjs']],
  ['Non-lab syntax', process.execPath, ['scripts/check-learning.cjs', '--syntax-only']],
  ['Diff hygiene', 'git', ['diff', '--check']],
];
if (unitFiles.length) checks.push(['Learning unit tests', process.execPath, ['--test', ...unitFiles]]);
if (fs.existsSync(path.join(root, 'scripts/build-learning.py'))) checks.push(['Targeted build drift', python, ['scripts/build-learning.py', '--check']]);
checks.push(['Physics shell style drift', python, ['scripts/sync-physics-shell.py', '--check']]);
checks.push(['Physics pillar style drift', python, ['scripts/sync-physics-pillars.py', '--check']]);

const started = Date.now();
Promise.all(checks.map(([name, command, args]) => new Promise(resolve => {
  const start = Date.now();
  const child = spawn(command, args, { cwd: root, shell: false, windowsHide: true });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const timeout = setTimeout(() => child.kill(), 30000);
  child.on('error', error => { output += error.message; });
  child.on('close', code => {
    clearTimeout(timeout);
    resolve({ name, code, durationMs: Date.now() - start, output: output.trim() });
  });
}))).then(results => {
  for (const result of results) {
    console.log(`${result.code === 0 ? 'PASS' : 'FAIL'} ${result.name} (${result.durationMs} ms)`);
    if (result.code !== 0) console.log(result.output);
  }
  const passed = results.filter(result => result.code === 0).length;
  console.log(`${passed}/${results.length} groups passed in ${Date.now() - started} ms.`);
  if (passed !== results.length) process.exitCode = 1;
});
