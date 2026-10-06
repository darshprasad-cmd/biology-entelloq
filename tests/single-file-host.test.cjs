/* Exercise the actual host's async asset helpers with controlled arrival and
 * decoding promises. Browser coverage separately verifies streaming HTML. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname,'../src/single-file/host.js'),'utf8');
const helpers = source.slice(source.indexOf('  function waitFor('),source.indexOf('  async function inBatches('));
function setup(unpack, delay = value => value) {
  let removed = 0;
  const context = vm.createContext({window:{DOMException},DOMException,unpack,clearTimeout,
    setTimeout:(callback,ms)=>setTimeout(callback,delay(ms)),
    document:{getElementById:()=>({textContent:'encoded-model',remove:()=>removed++})}});
  vm.runInContext(helpers + ';globalThis.api={waitFor,assetBytes};',context);
  return {api:context.api,removed:()=>removed};
}
const tick = () => new Promise(resolve=>setImmediate(resolve));
test('cancellation between arrival and continuation prevents specimen decoding',async()=>{
  let decodes = 0;
  const {api} = setup(async()=>{decodes++;throw new Error('corrupt payload');});
  const controller = new AbortController();
  const asset = {available:Promise.resolve(),elementId:'model'};
  const request = api.assetBytes(asset,controller.signal);
  queueMicrotask(()=>controller.abort());
  await assert.rejects(request,error=>error.name==='AbortError');
  await tick();
  assert.equal(decodes,0);
  assert.equal(asset.decoding,undefined);
});
test('one cancelled request does not discard shared decoding or a later retry',async()=>{
  let complete,decodes = 0;
  const {api,removed} = setup(()=>{decodes++;return new Promise(resolve=>{complete=resolve;});});
  const controller = new AbortController(), asset = {available:Promise.resolve(),elementId:'model'};
  const cancelled = api.assetBytes(asset,controller.signal);
  await tick();
  const surviving = api.assetBytes(asset);
  controller.abort();
  await assert.rejects(cancelled,error=>error.name==='AbortError');
  const bytes = new Uint8Array([0x67,0x6c,0x54,0x46]);
  complete(bytes);
  assert.equal(await surviving,bytes);
  assert.equal(await api.assetBytes(asset),bytes);
  assert.equal(decodes,1); assert.equal(removed(),1);
});
test('a shared corrupt decode is handled after its caller has cancelled',async()=>{
  let fail;
  const {api} = setup(()=>new Promise((_,reject)=>{fail=reject;}));
  const controller = new AbortController(), asset = {available:Promise.resolve(),elementId:'model'};
  const request = api.assetBytes(asset,controller.signal);
  await tick(); controller.abort();
  await assert.rejects(request,error=>error.name==='AbortError');
  fail(new Error('invalid gzip')); await tick();
  await assert.rejects(api.assetBytes(asset),/could not be read.*reload/i);
});
test('a stalled arrival rejects within the host deadline instead of waiting forever',async()=>{
  const {api} = setup(()=>{throw new Error('must not decode');},()=>5);
  await assert.rejects(api.assetBytes({available:new Promise(()=>{}),elementId:'model'}),/taking too long.*try again/i);
});
