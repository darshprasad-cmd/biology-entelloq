const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),guide=fs.readFileSync(path.join(root,'assets/feature-tutorials.js'),'utf8');
const pages=["app.html","lab.html"];
for(const name of pages){const html=fs.readFileSync(path.join(root,name),'utf8');assert.ok(html.includes('assets/feature-tutorials.js'));assert.ok(html.includes('assets/feature-tutorials.css'));}
new Function(guide);assert.ok(guide.includes("clearInterval(timer)"));assert.ok(guide.includes("e.key==='Escape'"));
assert.ok(!guide.includes('getUserMedia('),'Tutorial must not request a camera');assert.ok(!guide.includes('.loadPreset('),'Tutorial must not reset experiments');
const source=fs.readFileSync(path.join(root,"lab.html"),'utf8');
for(const id of ["handbtn","dock","obj","specbtn"])assert.ok(source.includes('id="'+id+'"'),id+' tutorial target no longer exists');
console.log('Tutorial assets, real control targets, exit cleanup and no-camera/no-reset contracts passed.');
