'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/library/labs.js'), 'utf8');

// A minimal DOM adapter runs the actual registry/controller. Browser checks
// separately cover native form submission, tab order and viewport geometry.
function fixture(initialHash = '') {
  const elements = new Map(), events = new Map();
  const document = { readyState:'loading', activeElement:null, getElementById:id=>elements.get(id)||null };
  let cards = [], disposals = 0, html = '';
  const node = (id, tagName='DIV') => ({
    id, tagName, value:'', dataset:{}, textContent:'', listeners:{},
    addEventListener(type, fn){ this.listeners[type]=fn; },
    emit(type){ const event={type,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};this.listeners[type]?.(event);return event; },
    focus(options){document.activeElement=this;this.focusOptions=options;},
    scrollIntoView(options){this.scrollOptions=options;},
    querySelector(){return null;}
  });
  const body = node('', 'BODY');document.activeElement=body;
  const app = node('labsApp');elements.set('labsApp',app);
  function parse(markup){
    for(const match of markup.matchAll(/<([a-z0-9]+)\b[^>]*\bid="([^"]+)"/g)) elements.set(match[2],node(match[2],match[1].toUpperCase()));
  }
  Object.defineProperty(app,'innerHTML',{get:()=>html,set(value){
    html=value;elements.clear();elements.set('labsApp',app);parse(value);cards=[];
    const heading=node('', 'H1');app.querySelector=selector=>selector==='h1'?heading:null;
    const result=elements.get('lab-cards');if(result)Object.defineProperty(result,'innerHTML',{get:()=>result.markup,set(value){
      result.markup=value;elements.delete('lab-clear');parse(value);cards=[...value.matchAll(/data-lab-id="([^"]+)"/g)].map(match=>{const item=node('', 'A');item.dataset.labId=match[1];return item;});
    }});
  }});
  app.querySelectorAll=selector=>selector==='[data-lab-id]'?cards:[];
  const location={hash:initialHash};
  const context={document,location,console,queueMicrotask:fn=>fn(),matchMedia:()=>({matches:true}),addEventListener(type,fn){events.set(type,fn);}};
  context.window=context;
  vm.createContext(context);vm.runInContext(source,context);
  context.build=()=>({dispose(){disposals++;}});
  vm.runInContext(`LABS.register('photosynthesis-rate',{title:'Photosynthesis Rate Lab',category:'Plant biology',difficulty:'school',minutes:15,type:'simulation',build});LABS.register('osmosis',{title:'Osmosis Lab',category:'Cell biology',difficulty:'school',minutes:10,type:'simulation',build});`,context);
  events.get('DOMContentLoaded')();
  return {document,e:id=>elements.get(id),app,get cards(){return cards;},get disposals(){return disposals;},location,
    input(id,value,type='input'){const item=elements.get(id);item.focus();item.value=value;item.emit(type);},
    navigate(hash){location.hash=hash;events.get('hashchange')({type:'hashchange'});}
  };
}

test('fresh catalogue does not steal focus and uses one persistent results target/status',()=>{
  const f=fixture();assert.equal(f.document.activeElement.tagName,'BODY');
  assert.match(f.app.innerHTML,/<form id="lab-filters" role="search"/);
  assert.match(f.app.innerHTML, /id="lab-show-results" type="submit"/);
  assert.match(f.app.innerHTML, /id="lab-results-title" tabindex="-1" aria-describedby="lab-count"/);
  assert.match(f.app.innerHTML, /id="lab-count"[^>]*role="status" aria-live="polite" aria-atomic="true"/);
});

test('typing and filters preserve controls and status; submit focuses results without navigating',()=>{
  const f=fixture(), heading=f.e('lab-results-title'), status=f.e('lab-count'), search=f.e('lab-search');
  f.input('lab-search','photo');assert.equal(f.document.activeElement,search);assert.equal(f.cards.length,1);
  f.input('lab-category','Plant biology','change');assert.equal(f.document.activeElement,f.e('lab-category'));
  assert.equal(f.e('lab-results-title'),heading);assert.equal(f.e('lab-count'),status);assert.match(status.textContent,/1 of 2 investigations · Plant biology/);
  const event=f.e('lab-filters').emit('submit');assert.equal(event.defaultPrevented,true);assert.equal(f.document.activeElement,heading);assert.equal(heading.scrollOptions.behavior,'instant');assert.equal(f.location.hash,'');
});

test('empty reset restores every filter and input focus without replacing the status',()=>{
  const f=fixture(), heading=f.e('lab-results-title'), status=f.e('lab-count'), search=f.e('lab-search');
  f.input('lab-category','Plant biology','change');f.input('lab-difficulty','school','change');f.input('lab-duration','20','change');f.input('lab-type','simulation','change');f.input('lab-search','no-match');
  assert.equal(f.cards.length,0);f.e('lab-clear').emit('click');assert.equal(f.cards.length,2);assert.equal(f.document.activeElement,search);assert.equal(f.e('lab-results-title'),heading);assert.equal(f.e('lab-count'),status);
  for(const id of ['lab-search','lab-category','lab-difficulty','lab-duration','lab-type'])assert.equal(f.e(id).value,'');
});

test('return from a bench preserves filters, disposes the bench and restores its card',()=>{
  const f=fixture();f.input('lab-search','photo');f.navigate('#photosynthesis-rate');assert.equal(f.document.activeElement.tagName,'H1');f.navigate('');
  assert.equal(f.disposals,1);assert.equal(f.e('lab-search').value,'photo');assert.equal(f.cards.length,1);assert.equal(f.document.activeElement,f.cards[0]);assert.equal(f.cards[0].dataset.labId,'photosynthesis-rate');assert.equal(f.cards[0].scrollOptions.behavior,'instant');
});

test('return falls back to results if the outgoing deep-linked bench is excluded by retained filters',()=>{
  const f=fixture();f.input('lab-search','photo');f.navigate('#osmosis');f.navigate('');assert.equal(f.document.activeElement,f.e('lab-results-title'));assert.equal(f.e('lab-search').value,'photo');assert.equal(f.cards.length,1);
});

test('fresh bench deep link focuses its title and returns to its own catalogue card',()=>{
  const f=fixture('#osmosis');assert.equal(f.document.activeElement.tagName,'H1');f.navigate('');assert.equal(f.document.activeElement.dataset.labId,'osmosis');assert.equal(f.cards.length,2);
});

test('unknown hash navigation offers recovery and a stable focus target',()=>{
  const f=fixture();f.navigate('#not-a-real-bench');assert.match(f.app.innerHTML,/That bench could not be found/);assert.equal(f.document.activeElement,f.e('lab-results-title'));assert.equal(f.cards.length,2);
});
