'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'app.html'),'utf8'),css=fs.readFileSync(path.join(root,'src/physics-layout/app.css'),'utf8');
test('the visible header search has a stable accessible dialog relationship',()=>{
 const button=html.match(/<button\b[^>]*id="topSearch"[^>]*>[\s\S]*?<\/button>/)?.[0];assert(button);
 for(const attribute of ['aria-label="Search Biology Entelloq"','aria-haspopup="dialog"','aria-controls="cmdk"'])assert(button.includes(attribute));
 assert.match(button,/class="top-search-label">Search topics/);assert.match(button,/<svg[^>]*aria-hidden="true"/);
 assert.match(html,/<button class="cmdk-close" id="cmdkClose" aria-label="Close search">Close<\/button>/);
});
test('the last phone search styles restore a44px control after the old hide rule',()=>{
 const hidden=css.indexOf('.top-search{display:none}'),visible=css.lastIndexOf('.top-search{display:inline-flex');assert(visible>hidden);
 const rule=css.slice(visible,css.indexOf('}',visible)+1);assert.match(rule,/width:44px;height:44px/);assert.match(rule,/flex:none/);
 assert.match(css.slice(visible),/\.top-search \.top-search-label,\.top-search kbd\{display:none\}/);
});
