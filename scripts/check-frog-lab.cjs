#!/usr/bin/env node
/* One read-only local gate. Browser evidence is an explicit, serial opt-in. */
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const python = process.env.FROG_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const args = process.argv.slice(2);
const help = `Usage: node scripts/check-frog-lab.cjs [--browser] [--help]

Default: run unit, builder, static-site, generated-output, ecosystem, tutorial,
and lab JavaScript syntax checks in parallel. Nothing is rebuilt or published.

--browser  After all default checks pass, run journeys and then polish serially.
           Requires an already-running server and existing Playwright packages.
           Updates the existing browser reports/screenshots in docs/frog-lab.

Environment: FROG_PYTHON (Python executable), FROG_BASE_URL (browser server URL),
             FROG_NODE_MODULES (existing browser-check dependencies directory).
`;

function run(command, commandArgs, live = false) {
  return new Promise(resolve => {
    let output = '', settled = false;
    const child = spawn(command, commandArgs, {
      cwd: root,
      shell: false,
      windowsHide: true,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONUNBUFFERED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const collect = chunk => {
      output += chunk.toString();
      if (live) process.stdout.write(chunk);
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    const finish = (code, error) => {
      if (settled) return;
      settled = true;
      resolve({ ok: code === 0 && !error, output: output + (error ? error.message + '\n' : '') });
    };
    child.on('error', error => finish(null, error));
    child.on('close', (code, signal) => finish(code, signal ? new Error(`Terminated by ${signal}`) : null));
  });
}

async function checkSyntax() {
  // Checking every top-level lab module is a deterministic superset of changed
  // sources, even in a clean clone, detached checkout, or a directory without Git.
  // Third-party vendor code is not rewritten or recursively scanned.
  const files = fs.readdirSync(path.join(root, 'src/lab'))
    .filter(name => name.endsWith('.js'))
    .sort()
    .map(name => path.join('src/lab', name));
  files.push(path.relative(root, __filename));
  // Node's module parser checks each file separately in one child process. It
  // neither links imports nor evaluates code, and avoids dozens of slow Windows
  // process launches. The VM module API is available in Node 20+ behind this flag.
  const parser = `
    const fs = require('node:fs'), vm = require('node:vm');
    for (const file of process.argv.slice(1)) {
      try {
        const source = fs.readFileSync(file, 'utf8');
        if (file.endsWith('.cjs')) new vm.Script(source, { filename: file });
        else new vm.SourceTextModule(source, { identifier: file });
      } catch (error) {
        console.error(file + '\\n' + error.stack);
        process.exitCode = 1;
      }
    }
  `;
  return run(process.execPath, ['--experimental-vm-modules', '-e', parser, ...files]);
}

async function check(name, work) {
  const started = Date.now();
  try {
    return { name, ...await work(), seconds: (Date.now() - started) / 1000 };
  } catch (error) {
    return { name, ok: false, output: error.stack || error.message, seconds: (Date.now() - started) / 1000 };
  }
}

function report(result) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name} (${result.seconds.toFixed(2)}s)`);
  if (!result.ok && result.output.trim()) console.error(result.output.trim());
}

async function main() {
  if (args.includes('--help')) { console.log(help); return; }
  const unknown = args.filter(arg => arg !== '--browser');
  if (unknown.length) throw new Error(`Unknown option: ${unknown.join(', ')}\n${help}`);
  const started = Date.now();
  // Enumerate explicitly: Windows does not expand shell globs for node --test.
  const nodeTests = fs.readdirSync(path.join(root, 'tests'))
    .filter(name => name.endsWith('.test.mjs')).sort().map(name => path.join('tests', name));
  if (!nodeTests.length) throw new Error('No Node regression tests found; refusing an empty validation run.');
  console.log('Running seven independent, read-only checks in parallel...');
  const results = await Promise.all([
    check('Node regression tests', () => run(process.execPath, ['--test', ...nodeTests])),
    check('Builder safety tests', () => run(python, ['-m', 'unittest', 'discover', '-s', 'scripts/frog-lab', '-p', 'test_*.py'])),
    check('Static-site tests', () => run(python, ['-m', 'unittest', 'discover', '-s', 'tests'])),
    check('Generated lab is current', () => run(python, ['scripts/build-frog-lab.py', '--check'])),
    check('Ecosystem network contracts', () => run(process.execPath, ['scripts/check-network.cjs'])),
    check('Feature tutorial contracts', () => run(process.execPath, ['tests/check-feature-tutorials.cjs'])),
    check('Lab JavaScript syntax', checkSyntax),
  ]);
  results.forEach(report);
  if (results.some(result => !result.ok)) {
    console.error('Validation failed. No files were rebuilt; browser checks were not started.');
    process.exitCode = 1;
    return;
  }
  if (args.includes('--browser')) {
    for (const [name, script] of [
      ['Browser journeys', 'scripts/frog-lab/check-journeys.cjs'],
      ['Browser polish', 'scripts/frog-lab/check-polish.cjs'],
    ]) {
      console.log(`Starting ${name.toLowerCase()} (serial rendering workload)...`);
      const result = await check(name, () => run(process.execPath, [script], true));
      results.push(result);
      report({ ...result, output: '' }); // Browser output was already streamed.
      if (!result.ok) { process.exitCode = 1; return; }
    }
  }
  console.log(`${results.length}/${results.length} check groups passed in ${((Date.now() - started) / 1000).toFixed(2)}s.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
