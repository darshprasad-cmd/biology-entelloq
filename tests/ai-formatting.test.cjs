const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/ai/biology-ai.js'), 'utf8'), { window });
const plain = window.BIOQ_AI.toPlainText;

test('accidental TeX becomes readable biological equations and units', () => {
  assert.equal(plain(String.raw`\[p^2 + 2pq + q^2 = 1\]`), 'p² + 2pq + q² = 1');
  assert.equal(plain(String.raw`$CO_{2} + H_{2}O \rightarrow glucose$`), 'CO₂ + H₂O → glucose');
  assert.equal(plain(String.raw`\(\Delta G = \Delta H - T\Delta S\)`), 'Δ G = Δ H - TΔ S');
  assert.equal(plain(String.raw`\mathrm{mmol\,L^{-1}}`), 'mmol L⁻¹');
  assert.equal(plain(String.raw`v = \frac{V_{max}[S]}{K_m + [S]}`), 'v = Vₘₐₓ[S] / (Kₘ + [S])');
  assert.equal(plain('Ca^2+ and 10^-3 mol L^-1'), 'Ca²⁺ and 10⁻³ mol L⁻¹');
});

test('nested fractions and roots preserve grouping instead of flattening mathematical meaning', () => {
  assert.equal(plain(String.raw`\frac{a + b}{\frac{c}{d}}`), '(a + b) / (c / d)');
  assert.equal(plain(String.raw`\sqrt{p^2 + q^2}`), '√(p² + q²)');
  assert.equal(plain(String.raw`\text{water potential} = \Psi_s + \Psi_p`), 'water potential = Ψₛ + Ψₚ');
});

test('unbraced powers and subscripts preserve adjacent arithmetic operators', () => {
  assert.equal(plain('p^2+2pq+q^2=1'), 'p²+2pq+q²=1');
  assert.equal(plain('x^2-y^2'), 'x²-y²');
  assert.equal(plain('H_2+O_2'), 'H₂+O₂');
  assert.equal(plain('Ca^2+ and Fe^{3+}'), 'Ca²⁺ and Fe³⁺');
});

test('malformed or unsupported TeX stays readable without silently inventing a value', () => {
  assert.equal(plain(String.raw`\frac{ATP}`), 'ATP / [denominator missing]');
  assert.equal(plain(String.raw`\unknown{important result}`), 'unknown(important result)');
  assert.equal(plain(String.raw`\sqrt{a + b`), '√(a + b)');
  assert.doesNotMatch(plain(String.raw`$$\frac{a}{b} \approx \mu$$`), /\\|\$|\{|\}/);
});

test('paragraphs, headings and ordered answers retain a readable hierarchy in plain text', () => {
  assert.equal(plain('## Answer\n\n**B is correct.** The gradient drives movement.\n\n### Why\n1. A membrane separates the solutions.\n2. Water moves down its water-potential gradient.'),
    'Answer\n\nB is correct. The gradient drives movement.\n\nWhy\n\n1. A membrane separates the solutions.\n2. Water moves down its water-potential gradient.');
  assert.equal(plain('A *clear* and _natural_ explanation.\n\n**Unclosed emphasis'), 'A clear and natural explanation.\n\nUnclosed emphasis');
});

test('tables remain understandable without raw Markdown separators', () => {
  assert.equal(plain('| Process | Energy |\n| --- | --- |\n| Diffusion | No direct ATP use |\n| Active transport | Energy required |'),
    'Process: Diffusion; Energy: No direct ATP use\nProcess: Active transport; Energy: Energy required');
});

test('fences, blockquotes, and Markdown link syntax do not leak into the readable fallback', () => {
  assert.equal(plain('```text\nCO₂ + H₂O → carbohydrate\n```\n\n> Explain the mechanism.\n\nRead [the label](javascript:unsafe).'),
    'CO₂ + H₂O → carbohydrate\n\nExplain the mechanism.\n\nRead the label.');
});

test('formatting is bounded for malformed and deeply nested provider output', () => {
  const value = plain('\\frac{' + '{'.repeat(1000) + 'a'.repeat(20000));
  assert.ok(value.length < 17000);
  assert.doesNotMatch(value, /undefined|NaN/);
  assert.equal(plain(null), '');
  const wideTable = Array.from({ length:80 }, (_, i) => 'column ' + i).join('|') + '\n' + Array(80).fill('---').join('|') + '\nfirst|last';
  assert.match(plain(wideTable), /column 79/);
  assert.match(plain(wideTable), /first; last/);
});
