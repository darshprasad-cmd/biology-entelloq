import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const common={bundle:true,format:'iife',platform:'browser',target:['es2022'],minify:true,legalComments:'eof',metafile:true,logLevel:'warning'};
const main=await build({...common,entryPoints:['src/main.js'],outfile:'main.js'});
// Upstream source modules support Node and browser backends. This dedicated
// browser worker excludes Node filesystem/native-ONNX modules, just as a normal
// browser distribution does; their runtime availability checks see empty stubs.
const browserOnlyRuntime={name:'browser-only-runtime',setup(b){
  b.onResolve({filter:/^node:/},args=>({path:args.path,namespace:'browser-empty'}));
  b.onResolve({filter:/onnx-node\.js$/},args=>({path:args.path,namespace:'browser-empty'}));
  b.onLoad({filter:/.*/,namespace:'browser-empty'},()=>({contents:'module.exports = {};',loader:'js'}));
}};
const worker=await build({...common,minify:false,plugins:[browserOnlyRuntime],entryPoints:['src/semantic-worker.js'],outfile:'semantic-worker.js'});
if(Object.keys(worker.metafile.inputs).some(file=>/\/models\/(registry|models)\.js$/.test(file.replaceAll('\\','/')))){
  throw new Error('The fixed BERT worker unexpectedly includes the all-model registry.');
}
await fs.mkdir('runtime',{recursive:true});
const runtimeFiles=['ort-wasm-simd-threaded.jsep.mjs','ort-wasm-simd-threaded.jsep.wasm'];
for(const file of runtimeFiles)await fs.copyFile(`node_modules/onnxruntime-web/dist/${file}`,`runtime/${file}`);
const packages=new Map();
// The published Transformers browser distribution already bundles these two
// packages, so esbuild's input graph cannot discover their licences itself.
for(const name of ['@huggingface/jinja','@huggingface/tokenizers']){const directory=path.resolve('node_modules',name);packages.set(directory,JSON.parse(await fs.readFile(path.join(directory,'package.json'),'utf8')));}
for(const input of [...Object.keys(main.metafile.inputs),...Object.keys(worker.metafile.inputs),'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs']){
  if(!input.includes('node_modules/'))continue;
  let directory=path.dirname(path.resolve(input));
  while(directory.includes('node_modules')){
    try{const data=JSON.parse(await fs.readFile(path.join(directory,'package.json'),'utf8'));if(data.name&&data.version){packages.set(directory,data);break;}}catch{}
    directory=path.dirname(directory);
  }
}
let notices='# Third-party notices\n\nGenerated from the exact packages included in the browser bundles. Original Entelloq prompts and UI remain separate from these libraries.\n';
for(const [directory,pkg]of [...packages].sort((a,b)=>a[1].name.localeCompare(b[1].name))){
  notices+=`\n## ${pkg.name} ${pkg.version} (${pkg.license||'see package licence'})\n\n`;
  const names=(await fs.readdir(directory)).filter(x=>/^(licen[cs]e|copying|notice|thirdpartynotices)(\.|$)/i.test(x));
  for(const name of names){try{notices+=`### ${name}\n\n${await fs.readFile(path.join(directory,name),'utf8')}\n`;}catch{}}
}
notices+='\n## Optional remote model\n\nXenova/all-MiniLM-L6-v2, revision 751bff37182d3f1213fa05d7196b954e230abad9, q8 ONNX conversion of sentence-transformers/all-MiniLM-L6-v2. Apache-2.0 per the upstream model card. Model weights are not distributed in this package; they download from Hugging Face only after user activation.\nhttps://huggingface.co/Xenova/all-MiniLM-L6-v2\nhttps://huggingface.co/sentence-transformers/all-MiniLM-L6-v2\n\nOpenStax textbook links are references for independently authored prompts; textbook assets or text are not bundled.\n';
await fs.writeFile('THIRD-PARTY-NOTICES.md',notices);
const files=['index.html','styles.css','main.js','semantic-worker.js',...runtimeFiles.map(f=>`runtime/${f}`),'THIRD-PARTY-NOTICES.md'];
const assets=[];for(const file of files){const bytes=await fs.readFile(file);assets.push({path:file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
await fs.writeFile('asset-manifest.json',JSON.stringify({schema:1,entry:'index.html',scripts:'classic-iife',remoteModel:{id:'Xenova/all-MiniLM-L6-v2',revision:'751bff37182d3f1213fa05d7196b954e230abad9',dtype:'q8',optIn:true},assets},null,2)+'\n');
console.log(JSON.stringify({assets,packages:[...packages.values()].map(p=>`${p.name}@${p.version}`)},null,2));
