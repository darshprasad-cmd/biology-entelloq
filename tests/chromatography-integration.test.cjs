'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
// Combined-release preservation baseline: product runtime 8a765df, before PR53.
// Three reviewed differences from released 8062791 are intentional: the Science
// flag prelude, guest entry and the 33f6f3c packaged navigation ownership fix.
// Exact hashes still guard these sources; unchanged released hashes stay below.
test('chromatography has exactly two additive guide slots; all previous guide code remains byte-identical',()=>{
  let source=read('src/cbse/practicals-ui.js');
  for(const name of ['CUE','MOUNT']){
    const pattern=new RegExp('      // BEGIN CBSE CHROMATOGRAPHY '+name+'\\n[\\s\\S]*?      // END CBSE CHROMATOGRAPHY '+name+'\\n','g');
    assert.equal([...source.matchAll(pattern)].length,1);source=source.replace(pattern,'');
  }
  assert.equal(hash(source),'748960c25a6b4e6d8138adb106427a8f57d86545af400d41d1ceb9d692be3ae2');
});
test('portable builder adds only three CBSE filenames, retaining previous module order',()=>{
  let source=read('scripts/build-single-file.py');
  for(const slot of [', "chromatography-ui.css"','"chromatography-model.js", "chromatography-ui.js", ']){
    assert.equal(source.split(slot).length,2);source=source.replace(slot,'');
  }
  assert.equal(hash(source),'a9f4e11c1a9b57b6d4fcbf7bf5b8b3f52be4e42801a7c21079d5a39d99b36884');
});
test('questionnaire, guide content, host and shell stay at the reviewed integration baseline',()=>{
  for(const [file,expected] of Object.entries({
    'src/cbse/entry.js':'5fb1e0cd2f97513002cb5b63146f57334dccd02a25848328cf327acee27b3e3c',
    'src/cbse/entry.css':'ebccfd4fd228026352329f86f8240d0e4b543c230df66ed645c41cb0701f531b',
    'src/cbse/practicals-data.js':'c358761bd05d9a69258ac826cc96526b7a615c38dbea7f26fd632f11943fb5ad',
    'src/single-file/host.js':'b256a6325d0df21f1e3527e0418693e246b4418efcb565d9983c3f91dab97e35',
    'src/single-file/shell.html':'c3574fdbccc4a9261b27087f88885009d23179c45caecae291ca4aebeeadfb08'
  }))assert.equal(hash(read(file)),expected,file);
});
