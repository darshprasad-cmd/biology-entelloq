/* Scoped automated accessibility evidence, not device or educator certification. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),runtime=createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES||path.resolve(root,'../biology-entelloq/node_modules'),'__cbse_a11y.cjs'));
const {chromium}=runtime('playwright'),html=fs.readFileSync(path.join(root,'dist/index.html'));
(async()=>{const browser=await chromium.launch({headless:true});try{
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route('**/*',route=>route.request().isNavigationRequest()?route.fulfill({contentType:'text/html',body:html}):route.abort());
  const page=await context.newPage();await page.goto('http://cbse-accessibility.test/',{waitUntil:'domcontentloaded'});
  await page.addScriptTag({path:runtime.resolve('axe-core/axe.min.js')});
  for(const view of ['questionnaire','dashboard']){
   if(view==='dashboard')await page.getByRole('button',{name:'Build my study space'}).click();
   const violations=await page.evaluate(async()=>(await axe.run('#bio-cbse',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
   assert.deepEqual(violations,[],width+'px '+view);
  }
  await context.close();console.log('PASS '+width+'px questionnaire and dashboard automated accessibility');
 }
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
