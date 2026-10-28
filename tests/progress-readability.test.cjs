const assert=require('node:assert/strict'),test=require('node:test');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const html=fs.readFileSync(path.join(__dirname,'../me.html'),'utf8').replace(/\r\n/g,'\n');
test('the small-screen progress layout is restricted to Me mastery cards',()=>{
 const css=html.split('<style id="page-css">')[1].split('</style>')[0];
 const patch=css.slice(css.indexOf('/* Give topic names'),css.indexOf('/* recommended next'));
 assert.match(patch,/@media \(max-width:850px\)/);
 assert.match(patch,/grid-template-columns:40px minmax\(0,1fr\)/);
 assert.match(patch,/\.notyet\{white-space:normal\}/);
 const selectors=[...patch.matchAll(/([^{}]+)\{/g)].map(match=>match[1].trim()).filter(s=>!s.includes('@media'));
 assert.equal(selectors.length,4);
 for(const selector of selectors)assert(selector.startsWith('[data-page="me"] #masterySlot '),'No global or other-card override: '+selector);
});
test('progress data, text, accessibility labels and ring rendering are unchanged',()=>{
 const start=html.indexOf('function renderMastery(d){'),end=html.indexOf('\nfunction buildRecs(d){',start);
 assert(start>0&&end>start);
 assert.equal(crypto.createHash('sha256').update(html.slice(start,end)).digest('hex'),'8cd94af77b4be05983ed03593c42206e4715396f9718c659c82e3f7e37fa9347');
});
