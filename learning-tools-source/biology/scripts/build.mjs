import { build } from 'esbuild';
import { mkdir, copyFile, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
await mkdir('dist',{recursive:true});
const packages=new Set();
for (const name of ['main','volume']) {
  const result=await build({entryPoints:[`src/${name}.js`], outfile:`dist/${name}.js`, bundle:true, format:'iife', metafile:true,
    globalName:name==='main'?'EntelloqBiologyNext':'EntelloqBiologyVolume', minify:true,
    legalComments:'eof', target:['es2020'], loader:{'.css':'text'}});
  for(const input of Object.keys(result.metafile.inputs)){
    const match=input.match(/^node_modules\/((?:@[^/]+\/)?[^/]+)\//);if(match)packages.add(match[1]);
  }
  // vtk embeds GLSL source strings; normalize insignificant trailing shader whitespace.
  const built=await readFile(`dist/${name}.js`,'utf8');
  await writeFile(`dist/${name}.js`,built.replace(/[\t ]+$/gm,'').trimEnd()+'\n');
}
await copyFile('node_modules/@kitware/vtk.js/Copyright.txt', 'dist/VTK-Copyright.txt');
let notices='Third-party packages included in the microscopy browser bundle\n\n';
for(const name of [...packages].sort()){
  const folder=join('node_modules',name),pkg=JSON.parse(await readFile(join(folder,'package.json'),'utf8'));
  notices+=`\n=== ${name} ${pkg.version} (${pkg.license}) ===\n`;
  const files=(await readdir(folder)).filter(x=>/^(license|licence|copyright|notice)(\.|$)/i.test(x));
  if(!files.length && name==='seedrandom'){
    const source=await readFile(join(folder,'seedrandom.js'),'utf8');
    notices+='\n'+source.slice(0,source.indexOf('*/')+2)+'\n';
  } else if(!files.length)throw Error(`No license notice found for bundled ${name}`);
  for(const file of files)notices+=`\n${file}\n${await readFile(join(folder,file),'utf8')}\n`;
}
await writeFile('dist/THIRD-PARTY.txt',notices.trimEnd()+'\n');
