/* Real DOM formatting/security and responsive checks; no provider, camera or WebGL. */
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '../biology-entelloq/node_modules');
const { chromium } = createRequire(path.join(modules, '__ai_formatting__.cjs'))('playwright');
const answer = String.raw`## Answer

**B is correct.** Water moves through a selectively permeable membrane from higher to lower water potential. The membrane allows water to cross but restricts some solutes.

### Why the other options fail
1. **A:** Osmosis does not require ATP; it is passive movement.
2. **C:** The direction depends on water potential, not simply the amount of water.

### Calculation
\[\Psi = \Psi_s + \Psi_p\]
The ratio is \(\frac{a + b}{c + d}\). A concentration can be written as 10^{-3} mol L^{-1}.

| Process | Driving factor | Energy |
| --- | --- | --- |
| Osmosis | Water-potential difference | No direct ATP use |
| Active transport | Transport-protein activity | Energy required |

Use *precise terms* and explain the cause. [An untrusted link](javascript:alert).
<img src=x onerror=window.answerAttack=true><script>window.answerAttack=true</script>`;
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  const errors = [], requests = [], pictures = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => { requests.push(route.request().url()); return route.abort(); });
    await page.setContent('<style>body{margin:0;background:#081016;color:#eaf2f5;font:16px/1.6 system-ui}main{padding:20px;max-width:740px;box-sizing:border-box}iframe{width:100%;border:0;height:260px}</style><main><div id="answer"></div><iframe title="Embedded answer" srcdoc="<div id=child-answer></div>"></iframe></main>');
    await page.addScriptTag({ content: fs.readFileSync(path.join(root, 'src/ai/biology-ai.js'), 'utf8') });
    await page.evaluate(value => {
      BIOQ_AI.renderAnswer(document.querySelector('#answer'), value);
      window.requestBodies = [];
      window.fetch = async (_url, options) => { requestBodies.push(JSON.parse(options.body)); return { ok:true, json:async () => ({ choices:[{ finish_reason:'stop', message:{ content:value } }] }) }; };
      BIOQ_AI.mount('app');
    }, answer);
    assert.equal(await page.locator('#answer h3').count(), 3);
    assert.equal(await page.locator('#answer ol li').count(), 2);
    assert.equal(await page.locator('#answer table tbody tr').count(), 2);
    assert.equal(await page.locator('#answer strong').count(), 3);
    assert.equal(await page.locator('#answer em').textContent(), 'precise terms');
    assert.equal(await page.locator('#answer img,#answer script,#answer a').count(), 0);
    assert.equal(await page.evaluate(() => window.answerAttack), undefined);
    assert.match(await page.locator('#answer').textContent(), /Ψ = Ψₛ \+ Ψₚ/);
    assert.doesNotMatch(await page.locator('#answer').textContent(), /\\(?:frac|Psi)|\$\$|\*\*|\| ---/);
    // A client owned by the app must style and render in the child's document.
    const child = await (await page.locator('iframe').elementHandle()).contentFrame();
    await child.locator('#child-answer').waitFor({ state:'attached' });
    await page.evaluate(() => BIOQ_AI.renderAnswer(document.querySelector('iframe').contentDocument.getElementById('child-answer'), '**Cell membrane**\n\n- Selectively permeable\n- Maintains gradients'));
    assert.equal(await child.locator('#bioq-ai-answer-style').count(), 1);
    assert.equal(await child.locator('#child-answer li').count(), 2);
    // Exercise the actual completed-answer path, rather than just the formatter.
    await page.locator('#bioq-ai-launch').click();
    await page.locator('#bioq-ai-question').fill('Explain osmosis for a four-mark exam answer.');
    await page.locator('#bioq-ai-send').click();
    await page.locator('#bioq-ai-log .bioq-ai-answer table').waitFor();
    assert.equal(await page.evaluate(() => requestBodies.length), 1);
    assert.equal(await page.locator('#bioq-ai-send').textContent(), 'Ask');
    assert.equal(await page.locator('#bioq-ai-status').textContent(), 'AI explanation');
    for (const viewport of [{ width:1440, height:1000 }, { width:768, height:1024 }, { width:390, height:844 }, { width:320, height:640 }]) {
      await page.setViewportSize(viewport);
      const dimensions = await page.evaluate(() => ({ width:innerWidth, scroll:document.documentElement.scrollWidth,
        panel:document.getElementById('bioq-ai-panel').getBoundingClientRect().toJSON() }));
      assert.ok(dimensions.scroll <= dimensions.width + 1, JSON.stringify(dimensions));
      assert.ok(dimensions.panel.left >= 0 && dimensions.panel.right <= viewport.width + 1, JSON.stringify(dimensions));
      const screenshot = path.join(os.tmpdir(), `biology-ai-formatting-${viewport.width}.png`);
      await page.screenshot({ path:screenshot }); pictures.push(screenshot);
    }
    await page.locator('#bioq-ai-close').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'bioq-ai-launch');
    await page.locator('#answer .bioq-ai-table').focus();
    assert.equal(await page.locator('#answer .bioq-ai-table').evaluate(node => node === document.activeElement), true);
    const malformed = await page.evaluate(() => {
      const output = document.createElement('div');
      const headings = Array.from({ length:80 }, (_, i) => 'column ' + i).join('|');
      BIOQ_AI.renderAnswer(output, headings + '\n' + Array(80).fill('---').join('|') + '\nfirst|last\n\n***Important***');
      return { nodes:output.querySelectorAll('*').length, text:output.textContent, strong:output.querySelector('strong')?.textContent };
    });
    assert.ok(malformed.nodes < 20); assert.match(malformed.text, /column 79/); assert.match(malformed.text, /first; last/);
    assert.equal(malformed.strong, 'Important'); assert.doesNotMatch(malformed.text, /\*\*|\|---/);
    assert.deepEqual(errors, []); assert.deepEqual(requests, []);
    console.log(JSON.stringify({ complete:true, viewports:4, unsafeNodes:0, externalRequests:requests.length, errors, pictures }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
