/* Real source / portable / copied-file / live catalogue navigation checks.
 * No scientific model assertions, camera access, AI requests or student records.
 * --portable uses dist/index.html; --file opens that portable HTML directly.
 * BIOLOGY_LAB_NAV_URL overrides the local server for an actual served artifact.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{createRequire}=require('node:module');
const {dismissCBSE}=require('../tests/cbse-browser-helper.cjs');
const {checkLabCatalogNavigation}=require('../tests/lab-catalog-navigation-browser.cjs');
const root=path.resolve(__dirname,'..'),portable=process.argv.includes('--portable')||process.argv.includes('--file'),file=process.argv.includes('--file');
const {chromium}=createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES||path.resolve(root,'../biology-entelloq/node_modules'),'__lab_nav.cjs'))('playwright');
const output=path.resolve(process.env.BIOLOGY_LAB_NAV_OUTPUT||path.join(root,'docs/polish-20261028/lab-catalog-'+(file?'file':portable?'portable':'source')));
const report={portable,file,complete:false,checks:[],errors:[],cameraRequests:0,limitations:'Chromium CSS viewports and DOM focus; not screen-reader speech, physical-phone, camera or scientific validation.'};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
fs.mkdirSync(output,{recursive:true});
(async()=>{
 let server,base=process.env.BIOLOGY_LAB_NAV_URL?.replace(/\/$/,'');
 if(!base&&!file){server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);const dest=path.resolve(root,pathname==='/'?(portable?'dist/index.html':'labs.html'):'.'+pathname);if(!dest.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(dest,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(dest)]||'application/octet-stream');res.end(data);});});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;}
 if(file)base=pathToFileURL(path.resolve(process.env.BIOLOGY_LAB_NAV_FILE||path.join(root,'dist/index.html'))).href;
 report.base=base;
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader']});
 try{for(const width of [320,390,768,1440])for(const theme of ['dark','light']){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.exposeBinding('__labNavCamera',()=>{report.cameraRequests++;});
  await context.addInitScript(()=>{if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=async()=>{await window.__labNavCamera();throw new Error('No camera in catalogue checks');};});
  const origin=file?'file://':new URL(base).origin;
  await context.route('**/*',route=>{const url=route.request().url();return url.startsWith(origin)||url.startsWith('data:')||url.startsWith('blob:')?route.continue():route.abort();});
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(portable?base+(file?'':'/')+'#labs':base+'/labs.html',{waitUntil:'domcontentloaded',timeout:120000});
  let world=page;
  if(portable){await dismissCBSE(page);const shell=await(await page.locator('#bioq-workspace').elementHandle()).contentFrame();await shell.locator('#viewFrame.on').waitFor();world=await(await shell.locator('#viewFrame').elementHandle()).contentFrame();}
  report.checks.push({width,theme,behavior:await checkLabCatalogNavigation(page,world,{theme,capture:name=>page.screenshot({path:path.join(output,name+'-'+width+'-'+theme+'.png')})})});await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.equal(report.cameraRequests,0);report.complete=true;
 }catch(error){report.failure=error.stack;throw error;}finally{fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
 console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
