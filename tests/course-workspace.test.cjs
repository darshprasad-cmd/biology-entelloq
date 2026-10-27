const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function workspace(record){
  const saved=new Map([['bio.entelloq.library.progress.v1',record]]),context={localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)}};
  context.window=context;context.parent=context;
  vm.createContext(context);
  for(const file of ['src/library/topics.js','src/library/extended-core.js','src/library/extended-systems.js','src/courses/data.js','src/courses/workspace.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
  const exportButton={},host={innerHTML:'',scrollTop:12,querySelector:()=>exportButton};
  return {context,host,saved};
}
test('malformed old concept progress cannot break the new Progress view or invent activity',()=>{
  for(const record of ['null','[]','true','"text"','{bad','{"topics":null}','{"topics":[]}','{"topics":{"osmosis":{"modes":"visual"}}}','{"topics":{"unknown":{"modes":["visual"]}}}']){
    const {context,host,saved}=workspace(record);
    assert.doesNotThrow(()=>context.BioCourses.render(host,null,'progress'));
    assert.match(host.innerHTML,/<b>0<\/b><span>concepts explored/);
    assert.equal(saved.get('bio.entelloq.library.progress.v1'),record,'Old records are read without being replaced');
  }
});
test('Progress counts only canonical concepts with actual supported explanation modes',()=>{
  const {context,host}=workspace(JSON.stringify({topics:{osmosis:{modes:['visual']},enzymes:{modes:['made-up-mode']},unknown:{modes:['scientific']}}}));
  context.BioCourses.render(host,null,'progress');assert.match(host.innerHTML,/<b>1<\/b><span>concepts explored/);
});
