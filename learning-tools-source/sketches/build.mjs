import {build} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
const upstream='node_modules/@excalidraw/excalidraw';
const pkg=JSON.parse(await fs.readFile(`${upstream}/package.json`,'utf8'));
if(pkg.version!=='0.18.1')throw new Error('Review the pinned Excalidraw adapter before upgrading.');
const dev=`${upstream}/dist/dev`,prod=`${upstream}/dist/prod`;
const sources=new Map();let sourceFile,source;
for(const f of (await fs.readdir(dev)).filter(x=>x.endsWith('.js'))){const body=await fs.readFile(`${dev}/${f}`,'utf8');if(body.includes('var ExcalifontFontFaces =')){sourceFile=path.resolve(dev,f);source=body;break;}}
if(!source)throw new Error('Cannot find the pinned upstream font declarations.');
const selected=['ComicShanns','Excalifont','Lilita','Nunito'];
const fontMeta=[];
for(const family of selected)for(const name of await fs.readdir(`${prod}/fonts/${family}`)){if(!name.endsWith('.woff2'))continue;const asset=`fonts/${family}/${name}`,bytes=await fs.readFile(`${prod}/${asset}`);sources.set(`./${asset}`,`data:font/woff2;base64,${bytes.toString('base64')}`);fontMeta.push({path:asset,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
// Read only the package's static array declarations to produce full local font
// CSS for SVG export. No remote font loader, worker or glyph-subsetting WASM.
const ranges=source.match(/var GOOGLE_FONTS_RANGES = (\{[\s\S]*?\n\});/)[0];
const fontVars=ranges+'\n'+[...source.matchAll(/var (\w+) = "(\.\/fonts\/[^"\n]+\.woff2)";/g)].filter(m=>sources.has(m[2])).map(m=>`var ${m[1]}=${JSON.stringify(sources.get(m[2]))};`).join('\n');
const familyNames={Cascadia:'Cascadia',ComicShanns:'Comic Shanns',Excalifont:'Excalifont',Liberation:'Liberation Sans',Lilita:'Lilita One',Nunito:'Nunito',Virgil:'Virgil'};
let fontCSS='';
for(const name of selected){const decl=source.match(new RegExp(`var ${name}FontFaces = (\\[[\\s\\S]*?\\n\\]);`));if(!decl)throw new Error(`Missing font definition ${name}`);const faces=vm.runInNewContext(`${fontVars}\n(${decl[1]})`,{},{timeout:1000});for(const face of faces){fontCSS+=`@font-face{font-family:${JSON.stringify(familyNames[name])};src:url(${JSON.stringify(face.uri)});font-style:normal;font-weight:400;${face.descriptors?.unicodeRange?`unicode-range:${face.descriptors.unicodeRange};`:''}}\n`;}}
await fs.writeFile('font-css.json',JSON.stringify(fontCSS));
let css=await fs.readFile(`${prod}/index.css`,'utf8');
for(const match of [...css.matchAll(/url\("(\.\/fonts\/Assistant\/[^"\n]+)"\)/g)]){const bytes=await fs.readFile(`${prod}/${match[1]}`);css=css.replaceAll(match[1],`data:font/woff2;base64,${bytes.toString('base64')}`);fontMeta.push({path:match[1].slice(2),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
await fs.writeFile('editor.css',css);
const reduced={name:'entelloq-local-editor',setup(b){
 b.onResolve({filter:/^@excalidraw\/excalidraw$/},()=>({path:path.resolve(dev,'index.js')}));
 b.onResolve({filter:/^@excalidraw\/mermaid-to-excalidraw$/},()=>({path:'mermaid',namespace:'excluded-feature'}));
 b.onResolve({filter:/subset-(shared|worker)\.chunk\.js$/},()=>({path:'subset',namespace:'excluded-feature'}));
 b.onResolve({filter:/locales\/[^/]+\.js$/},args=>({path:'locale',namespace:'excluded-feature'}));
 b.onLoad({filter:/.*/,namespace:'excluded-feature'},args=>({contents:args.path==='mermaid'?'export function parseMermaidToExcalidraw(){throw new Error("Text-to-diagram is not included in Scientific sketch.")}':args.path==='locale'?'export default {};':'export const Commands={}; export const WorkerUrl=null; export function toBase64(){throw new Error("Use the local SVG exporter.")} export const subsetToBase64=toBase64; export const subsetToBinary=toBase64;',loader:'js'}));
 b.onLoad({filter:/\.js$/},async args=>{
  if(path.resolve(args.path)!==sourceFile)return;
  let body=source;
  const cut='    init(CJK_HAND_DRAWN_FALLBACK_FONT, ...XiaolaiFontFaces);';
  if(body.split(cut).length!==2)throw new Error('Pinned CJK fallback patch no longer matches.');
  body=body.replace(cut,'    // Entelloq: system CJK fallback; omit the 12.7 MB handwriting font.');
  for(const [family,faces] of [['Cascadia','Cascadia'],['Liberation Sans','Liberation'],['Virgil','Virgil']]){const line=`    init("${family}", ...${faces}FontFaces);`;if(!body.includes(line))throw new Error('Pinned legacy font patch no longer matches.');body=body.replace(line,'');}
  for(const [uri,data]of sources)body=body.replaceAll(JSON.stringify(uri),JSON.stringify(data));
  return {contents:body,loader:'js'};
 });
}};
const result=await build({entryPoints:['src/main.jsx'],outfile:'main.js',bundle:true,platform:'browser',format:'iife',target:['es2022'],minify:true,legalComments:'eof',metafile:true,define:{'process.env.NODE_ENV':'"production"','import.meta.env.DEV':'false','import.meta.env.PROD':'true'},plugins:[reduced],logLevel:'warning'});
const packages=new Map();
for(const input of Object.keys(result.metafile.inputs)){if(!input.includes('node_modules'))continue;let dir=path.dirname(path.resolve(input));while(dir.includes('node_modules')){try{const p=JSON.parse(await fs.readFile(path.join(dir,'package.json'),'utf8'));if(p.name&&p.version){packages.set(dir,p);break;}}catch{}dir=path.dirname(dir);}}
let notices='# Third-party notices\n\nThis package bundles the real Excalidraw editor and its dependencies. Original starter drawings and Entelloq UI are separately authored.\n';
for(const [dir,p] of [...packages].sort((a,b)=>a[1].name.localeCompare(b[1].name))){notices+=`\n## ${p.name} ${p.version} (${p.license||'see below'})\n\n`;const names=(await fs.readdir(dir)).filter(f=>/^(licen[cs]e|copying|notice)(\.|$)/i.test(f));for(const name of names)try{notices+=await fs.readFile(path.join(dir,name),'utf8')+'\n';}catch{}}
// npm omits some upstream licence files, so checked-in upstream originals are
// retained explicitly. build must not silently omit these redistribution terms.
for(const f of (await fs.readdir('licenses')).sort()){notices+=`\n## ${f}\n\n${await fs.readFile(`licenses/${f}`,'utf8')}\n`;}
await fs.writeFile('THIRD-PARTY-NOTICES.md',notices);
const files=['index.html','styles.css','editor.css','main.js','THIRD-PARTY-NOTICES.md'];
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.md':'text/markdown'};
const assets=[];for(const p of files){const bytes=await fs.readFile(p);assets.push({path:p,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),mime:mime[path.extname(p)]});}
await fs.writeFile('asset-manifest.json',JSON.stringify({schema:1,entry:'index.html',scripts:'classic-iife',upstream:{name:pkg.name,version:pkg.version,repository:'https://github.com/excalidraw/excalidraw',license:'MIT'},fonts:'Embedded local WOFF2 data; system fallback for unsupported glyphs.',assets},null,2)+'\n');
await fs.writeFile('build-manifest.json',JSON.stringify({schema:1,packages:[...packages.values()].map(p=>({name:p.name,version:p.version,license:p.license})).sort((a,b)=>a.name.localeCompare(b.name)),fontSources:fontMeta,excluded:['Mermaid conversion and related parsers','Non-English UI locales','Font-subsetting workers/WASM (SVG uses full local font CSS)','Xiaolai handwriting fallback (system CJK font fallback)'],bundledInputs:Object.keys(result.metafile.inputs).map(x=>x.replaceAll('\\','/')).sort()},null,2)+'\n');
console.log(JSON.stringify({assets,totalBytes:assets.reduce((n,a)=>n+a.bytes,0),packages:packages.size},null,2));
