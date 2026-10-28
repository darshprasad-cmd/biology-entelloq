/* Real packaged flows: courses, persistent reasoning, clean addresses and mobile. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..');
const modules=process.env.BIOLOGY_PLAYWRIGHT_MODULES||path.resolve(root,'../biology-entelloq/node_modules');
const {chromium}=createRequire(path.join(modules,'__course_check__.cjs'))('playwright');
const {dismissCBSE}=require('../tests/cbse-browser-helper.cjs');
const {waitForPortableRoute}=require('../tests/portable-route-browser-helper.cjs');
const evidence=path.join(root,'docs/courses');fs.mkdirSync(evidence,{recursive:true});
const report={complete:false,checks:[],errors:[],unexpectedRequests:[]};
const bytes=fs.readFileSync(path.join(root,'dist/index.html'));
const server=http.createServer((req,res)=>{if(new URL(req.url,'http://local').pathname!=='/'){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(bytes);});
let browser;
async function child(owner,selector){return (await owner.locator(selector).elementHandle()).contentFrame();}
async function shell(page){const app=await child(page,'#bioq-workspace');await app.locator('#courseView.on').waitFor();return app;}
async function open(page,url){await page.goto(url,{waitUntil:'domcontentloaded'});await dismissCBSE(page);return shell(page);}
async function overflow(page,app,label){
  for(const [name,frame] of [['outer',page],['workspace',app]]){
    const size=await frame.evaluate(()=>({width:innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
    assert.ok(Math.max(size.html,size.body)<=size.width+2,label+' '+name+' overflow '+JSON.stringify(size));
  }
}
async function image(page,name){await page.screenshot({path:path.join(evidence,name+'.png')});}
async function configure(context,base){
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base&&url.pathname==='/')return route.continue();if(['http:','https:'].includes(url.protocol)){if(!['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname))report.unexpectedRequests.push(url.href);return route.abort('blockedbyclient');}return route.continue();});
  context.on('page',page=>page.on('pageerror',error=>report.errors.push(error.message)));
}
async function main(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true});await configure(context,base);
  await context.addInitScript(()=>{try{localStorage.setItem('bioq.cbse.skip.v1','1');if(!localStorage.getItem('course-preservation-fixture')){localStorage.setItem('bio.entelloq.library.progress.v1',JSON.stringify({topics:{osmosis:{modes:['visual']}},last:'osmosis'}));localStorage.setItem('course-preservation-fixture','1');}}catch(_){}});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  let app=await open(page,base+'/#courses/11');await waitForPortableRoute(page,/#courses\/11$/);
  assert.equal(await app.locator('#courseView .cw-classes a').count(),4);
  assert.equal(await app.locator('#courseView .cw-class[aria-current=page]').textContent(),'CLASS11');
  const info=await app.evaluate(()=>({counts:BioCourses.counts(),first:BIO_COURSES.classes.find(c=>c.id==='11').units[0].chapters[0],second:BIO_COURSES.classes.find(c=>c.id==='11').units[0].chapters[1],saved:localStorage.getItem('bio.entelloq.library.progress.v1')}));
  assert.ok(info.counts.chapters>=40);assert.equal(info.counts.concepts,109);
  await overflow(page,app,'desktop catalogue');await image(page,'courses-desktop');
  const search=app.getByRole('searchbox',{name:'Find a chapter in this class'});await search.fill('zxznoresult');await app.locator('.cw-no-results').waitFor({state:'visible'});assert.equal(await app.locator('.cw-chapter-row:visible').count(),0);await search.fill('');
  await app.locator('.cw-chapter-link').first().click();await app.locator('.cw-reading').waitFor();await waitForPortableRoute(page,new RegExp('#courses/11/'+info.first.id+'$'));
  const reflection='A useful comparison holds starting conditions constant and distinguishes observations from the proposed mechanism.';
  await app.locator('#cw-reflection-input').fill(reflection);await app.getByRole('button',{name:'Save for review',exact:true}).click();
  const answer=app.locator('.cw-answer summary');await answer.focus();await page.keyboard.press('Enter');assert.equal(await app.locator('.cw-answer').getAttribute('open'),'');
  await image(page,'chapter-desktop');
  const downloadWait=page.waitForEvent('download');await app.locator('[data-export]').click();const download=await downloadWait;const downloaded=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(downloaded.records[0].reflection,reflection);
  await page.reload({waitUntil:'domcontentloaded'});app=await shell(page);assert.equal(await app.locator('#cw-reflection-input').inputValue(),reflection);assert.equal(await app.locator('.cw-revisit').getAttribute('aria-pressed'),'true');
  assert.equal(await app.evaluate(()=>localStorage.getItem('bio.entelloq.library.progress.v1')),info.saved,'Existing concept history must remain unchanged by course notes');
  await app.locator('.cw-concept').first().click();await app.locator('#viewFrame.on').waitFor();let concept=await child(app,'#viewFrame');await concept.locator('.bl-modes').waitFor();await concept.locator('.cw-back-context a').waitFor();
  assert.equal(await concept.locator('.lrn-hero').isVisible(),false,'Old competing catalogue is hidden in concept flow');
  await concept.locator('.cw-back-context a').click();await app.locator('.cw-reading').waitFor();assert.equal(await app.locator('#cw-reflection-input').inputValue(),reflection);
  await app.locator('#nav [data-go=progress]').click();await app.locator('.cw-review-row').first().waitFor();assert.equal(await app.locator('.cw-stat-row b').nth(0).textContent(),'1');assert.equal(await app.locator('.cw-stat-row b').nth(2).textContent(),'1');
  await page.goBack();await app.locator('.cw-reading').waitFor();
  const share=await page.evaluate(()=>BioPortable.getShareURL());assert.ok(share.includes('?route=courses%2F11%2F'));assert.equal(new URL(page.url()).hash,'');
  const sharedPage=await context.newPage();const sharedApp=await open(sharedPage,share);await sharedApp.locator('.cw-reading').waitFor();await waitForPortableRoute(sharedPage,new RegExp('#courses/11/'+info.first.id+'$'));await sharedPage.close();
  await page.evaluate(id=>BioPortable.navigate('#courses/11/'+id),info.second.id);await app.locator('.cw-reading').waitFor();
  await app.locator('.cw-concept').first().click();concept=await child(app,'#viewFrame');await concept.locator('.cw-back-context a').filter({hasText:info.second.title}).waitFor();
  await concept.locator('.cw-back-context a').click();await app.locator('.cw-reading').waitFor();
  await app.locator('#nav [data-go=lab]').click();await app.locator('#launcher.on').waitFor();await app.locator('#launchX').click();await app.locator('#launcher.on').waitFor({state:'hidden'});
  await waitForPortableRoute(page,new RegExp('#courses/11/'+info.second.id+'$'));
  await page.reload({waitUntil:'domcontentloaded'});app=await shell(page);await app.getByRole('heading',{name:info.second.title,exact:true}).waitFor();
  report.checks.push('Four class paths and 40+ authored guides; catalogue search/empty state; chapter keyboard reveal; notes and review flags survive reload; exported notes match; old concept records survive; concept-to-chapter return; browser Back and clean share URL restore the chapter.');
  report.checks.push('Reused concept documents refresh the chapter return link; closing Dissection preserves the exact chapter across reload.');
  for(const [name,width,height] of [['tablet',820,1180],['mobile',390,844]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>BioPortable.navigate('#courses/12'));app=await shell(page);await overflow(page,app,name+' catalogue');await image(page,'courses-'+name);
    await app.locator('.cw-chapter-link').first().click();await app.locator('.cw-reading').waitFor();await overflow(page,app,name+' chapter');await image(page,'chapter-'+name);
    assert.equal(await app.locator('#mtabs [data-go=labs]').count(),1);
  }
  await page.evaluate(()=>BioPortable.navigate('#labs'));app=await child(page,'#bioq-workspace');await app.locator('#viewFrame.on').waitFor();let labs=await child(app,'#viewFrame');await labs.locator('#lab-search').waitFor();
  await labs.locator('#lab-class').selectOption('9');assert.equal(await labs.locator('.lc-card[href="#osmosis"]').count(),1);
  await labs.locator('#lab-class').selectOption('12');assert.equal(await labs.locator('.lc-card[href="#quadrat-sampling"]').count(),1);
  await labs.locator('#lab-class').selectOption('');assert.equal(await labs.locator('.lc-card').count(),25);
  const fieldIds=['stomatal-transpiration','quadrat-sampling'];
  for(const id of fieldIds){
    await page.evaluate(id=>BioPortable.navigate('#labs/'+id),id);labs=await child(app,'#viewFrame');await labs.waitForFunction(id=>typeof LABS!=='undefined'&&!!LABS.get(id),id);await labs.locator('.fl-stage').waitFor();await overflow(page,labs,'mobile '+id);await image(page,id+'-mobile');
  }
  report.checks.push('Tablet and mobile catalogues/chapters have no horizontal overflow; mobile Labs opens the catalogue; both field investigations mount from the packaged registry.');
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>BioPortable.navigate('#home'));app=await child(page,'#bioq-workspace');await app.locator('.cw-home').waitFor();await image(page,'home-desktop');
  await app.locator('#themeBtn').click();await image(page,'home-theme-alternate');
  await context.close();
  const blocked=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await configure(blocked,base);
  await blocked.addInitScript(()=>{for(const method of ['getItem','setItem','removeItem'])Storage.prototype[method]=()=>{throw new DOMException('Storage unavailable','SecurityError');};});
  const blockedPage=await blocked.newPage();app=await open(blockedPage,base+'/#courses/9');await app.locator('.cw-chapter-link').first().click();await app.locator('#cw-reflection-input').fill('A session-only draft should survive navigation.');await app.locator('.cw-save-state').filter({hasText:'Session draft only'}).waitFor();await app.locator('#mtabs [data-go=progress]').click();await app.locator('.cw-review-row').last().click();assert.equal(await app.locator('#cw-reflection-input').inputValue(),'A session-only draft should survive navigation.');await blocked.close();
  report.checks.push('Blocked browser storage retains chapter reasoning during the session and clearly offers export.');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.unexpectedRequests,[]);report.complete=true;
}
main().catch(error=>{report.failure=error.stack;process.exitCode=1;}).finally(async()=>{fs.writeFileSync(path.join(evidence,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser?.close();server.close();});
