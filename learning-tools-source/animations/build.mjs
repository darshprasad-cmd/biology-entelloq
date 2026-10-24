import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'catalog.js'),'utf8'),context);
const stamp=n=>`00:00:${String(n).padStart(2,'0')}.000`;
for(const [subject,lesson] of Object.entries(context.window.EntelloqAnimationCatalog)){
  const vtt='WEBVTT\n\n'+lesson.steps.map((s,i)=>`${i+1}\n${stamp(s.time)} --> ${stamp(lesson.steps[i+1]?.time??22)}\n${s.caption}\n`).join('\n');
  fs.writeFileSync(path.join(root,'media',`${subject}.vtt`),vtt);
}
const files=['index.html','main.js','catalog.js','styles.css',...fs.readdirSync(path.join(root,'media')).sort().map(x=>`media/${x}`)];
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.mp4':'video/mp4','.vtt':'text/vtt'};
const assets=files.map(file=>{const bytes=fs.readFileSync(path.join(root,file));return{path:file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),mime:types[path.extname(file)]};});
fs.writeFileSync(path.join(root,'asset-manifest.json'),JSON.stringify({schemaVersion:1,module:'animations',generator:'Manim Community 0.22.0',assets},null,2)+'\n');
console.log(`${assets.length} runtime assets, ${assets.reduce((n,a)=>n+a.bytes,0)} bytes`);
