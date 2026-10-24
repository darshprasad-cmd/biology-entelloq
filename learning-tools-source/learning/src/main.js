import { catalog, lexicalSearch, subjectName, assertSubject } from './catalog.js';
import { ReviewSession } from './review.js';
import { Notebook } from './notebook.js';
const ownScript = document.currentScript?.src || location.href;
let base;
try { base = new URL('.', ownScript); } catch { base = new URL('/', location.origin === 'null' ? 'http://localhost' : location.origin); }
const defaults = { worker:new URL('semantic-worker.js',base).href, mjs:new URL('runtime/ort-wasm-simd-threaded.jsep.mjs',base).href, wasm:new URL('runtime/ort-wasm-simd-threaded.jsep.wasm',base).href };
function el(tag, attrs={}, ...children) {
  const node=document.createElement(tag);
  for (const [key,value] of Object.entries(attrs)) {
    if (key==='class') node.className=value;
    else if (key==='text') node.textContent=value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(),value);
    else if (value!==undefined && value!==false) node.setAttribute(key,value===true?'':value);
  }
  node.append(...children.filter(x=>x!=null)); return node;
}
const button=(text,action,attrs={})=>el('button',{type:'button',text,onclick:action,...attrs});
function storage() { try { return localStorage; } catch { return null; } }
function download(name,data,type='application/json') { const blob=new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type}); const url=URL.createObjectURL(blob); const a=el('a',{href:url,download:name}); a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
function filePicker(onFile,onError) { const input=el('input',{type:'file',accept:'.json,application/json','aria-label':'Import JSON file'}); input.addEventListener('change',async()=>{ try { const f=input.files[0]; if(!f)return; if(f.size>2800000)throw new Error('File is too large. Choose an exported learning file under 2.8 MB.'); await onFile(JSON.parse(await f.text())); } catch(e){ onError(e.message); } finally{input.value='';} }); return input; }
function notice(text='') { return el('p',{class:'learning-status',role:'status','aria-live':'polite',text}); }
function setTheme(shell,theme,tokens={}) {
  if(['dark','light'].includes(theme))shell.dataset.theme=theme;
  for(const key of ['accent','surface','text','muted','border','background']) if(typeof tokens[key]==='string' && CSS.supports('color',tokens[key])) shell.style.setProperty(`--learning-${key}`,tokens[key]);
}
function mountReview(container,subject) {
  const session=new ReviewSession(subject,{storage:storage()});
  const count=el('span',{class:'learning-badge'}), stage=el('div',{class:'learning-review-stage'}), status=notice(session.warning);
  const history=el('p',{class:'learning-small'});
  let saving=false;
  async function save(action,message) {
    if(saving)return;
    saving=true;container.querySelectorAll('button,input[type=file]').forEach(control=>control.disabled=true);status.textContent='Saving this review change…';
    try{const result=await action();status.textContent=session.warning||message(result);}
    catch(error){status.textContent=error.message;}
    finally{saving=false;refresh(true);container.querySelectorAll('button,input[type=file]').forEach(control=>control.disabled=false);}
  }
  function refresh(focus=false) {
    const due=session.queue(); count.textContent=`${due.length} due · ${session.events.length} attempts`;
    history.textContent='Scheduling uses FSRS with a 90% target retention. These are self-reported retrieval attempts, not a mastery score.';
    const item=due[0]; stage.replaceChildren();
    if(!item){stage.append(el('h3',{text:'You have finished the prompts due now.'}),el('p',{text:`Next review: ${new Date(session.nextDue()).toLocaleString()}. You can return then; extra clicks do not improve the schedule.`}));return;}
    const answer=el('div',{class:'learning-answer',hidden:true},el('h4',{text:'Explanation'}),el('p',{text:item.answer}),el('a',{href:item.source,target:'_blank',rel:'noopener noreferrer',text:'Read the source textbook'}));
    const ratings=el('div',{class:'learning-ratings',hidden:true});
    const meanings=['Again — could not recall','Hard — recalled with effort','Good — recalled correctly','Easy — recalled readily'];
    meanings.forEach((label,i)=>ratings.append(button(label,()=>save(()=>session.rate(item.id,i+1),next=>`Attempt saved. ${item.title} is next due ${next.due.toLocaleString()}.`),{class:'learning-secondary'})));
    const reveal=button('Reveal explanation',()=>{try{session.reveal(item.id);answer.hidden=false;ratings.hidden=false;reveal.disabled=true;ratings.querySelector('button').focus();}catch(e){status.textContent=e.message;}});
    const heading=el('h3',{text:item.title,tabindex:'-1'});
    stage.append(heading,el('p',{class:'learning-question',text:item.question}),el('p',{class:'learning-small',text:'Explain your answer aloud or write it down before revealing.'}),reveal,answer,ratings);
    if(focus)heading.focus();
  }
  const importer=filePicker(data=>save(()=>session.import(data),()=>'History merged. Existing attempts were retained; duplicate IDs were counted once.'),error=>{status.textContent=error;});
  const details=el('details',{},el('summary',{text:'Keep or restore your history'}),el('div',{class:'learning-actions'},button('Export review history',()=>download(`${subject}-review-history.json`,session.snapshot()),{class:'learning-secondary'}),el('label',{class:'learning-file'},'Import and merge history',importer)),el('p',{class:'learning-small',text:'Imports are subject-specific and checked for valid dates. Keep your device clock correct. Files contain learning history; share only if intended.'}));
  container.append(el('div',{class:'learning-heading'},el('h2',{text:'Recall, then revisit'}),count),stage,status,history,details);refresh();
  const timer=setInterval(()=>{if(!saving&&(!session.queue().length || !stage.querySelector('button'))) refresh();},30000);
  return ()=>clearInterval(timer);
}
function mountNotebook(container,subject) {
  const status=notice(); let notebook,unsubscribe; let relativeSelection;
  const nameId=`notebook-name-${crypto.randomUUID()}`, notesId=`notebook-notes-${crypto.randomUUID()}`;
  const name=el('input',{id:nameId,type:'text',value:'experiment',maxlength:'48',pattern:'[a-z0-9-]+',autocomplete:'off',spellcheck:'false'});
  const editor=el('textarea',{id:notesId,rows:'13',maxlength:'50000',placeholder:'Question\nPrediction\nMethod and controlled variables\nObservations and units\nExplanation\nUncertainty and next test'});
  const label=el('label',{for:notesId,text:'Experiment notes'}); const connection=el('p',{class:'learning-small'});
  function connect(){
    try {
      const next=new Notebook(subject,name.value.trim(),{storage:storage()});
      unsubscribe?.();notebook?.destroy();notebook=next;editor.value=notebook.text.toString();
      connection.textContent=notebook.channel?'Live sync with tabs on this device, browser profile and site using this subject and notebook name. No internet room or teacher connection is active.':'Local notebook. Live tab sync is unavailable in this browser. Use export/import to exchange updates.';
      status.textContent=notebook.warning||`Opened “${notebook.id}”. Changes are stored in this browser.`;
      notebook.doc.on('beforeTransaction',()=>{relativeSelection=notebook.selection(editor.selectionStart,editor.selectionEnd);});
      unsubscribe=notebook.subscribe((text,origin)=>{if(origin!=='editor'){editor.value=text;if(relativeSelection){const [a,b]=notebook.resolveSelection(relativeSelection);editor.setSelectionRange(a,b);}} status.textContent=notebook.warning||(origin==='remote'?'Merged an update from another local tab.':'Saved in this browser.');});
    }catch(e){status.textContent=e.message;}
  }
  editor.addEventListener('input',()=>{try{notebook.setText(editor.value);}catch(e){status.textContent=e.message;editor.value=notebook.text.toString();}});
  const importer=filePicker(data=>{notebook.import(data);status.textContent=notebook.warning||'Notebook update merged. Re-importing the same file does not duplicate it.';},error=>{status.textContent=error;});
  container.append(el('h2',{text:'Keep the reasoning with the experiment'}),el('div',{class:'learning-notebook-name'},el('label',{for:nameId,text:'Notebook name'}),name,button('Open notebook',connect,{class:'learning-secondary'})),connection,label,editor,el('div',{class:'learning-actions'},button('Undo my edit',()=>notebook.undo.undo(),{class:'learning-secondary'}),button('Redo my edit',()=>notebook.undo.redo(),{class:'learning-secondary'}),button('Export mergeable notebook',()=>download(`${subject}-${notebook.id}.json`,notebook.export()),{class:'learning-secondary'}),button('Export plain text',()=>download(`${subject}-${notebook.id}.txt`,notebook.text.toString(),'text/plain'),{class:'learning-secondary'})),status,el('details',{},el('summary',{text:'Share a notebook by file'}),el('p',{text:'Send an exported JSON file yourself. The recipient opens the same subject and notebook name, then imports it. Both people can edit and exchange files again; Yjs merges their changes. Files include notes and editing history, so share only with intended recipients.'}),el('label',{class:'learning-file'},'Import and merge notebook',importer)));
  connect();return ()=>{unsubscribe?.();notebook?.destroy();};
}
function mountSearch(container,subject,options) {
  let worker,ready=false,requestId=0,generation=0,assetController;const status=notice('Keyword search is ready. Semantic search is off.');const results=el('div',{class:'learning-search-results'});
  const queryId=`learning-query-${crypto.randomUUID()}`;const query=el('input',{id:queryId,type:'search',maxlength:'500',placeholder:subject==='physics'?'Why does a turning object accelerate?':'How do cells control reaction speed?'});
  const mode=el('span',{class:'learning-badge',text:'Keyword mode'}); const progress=el('progress',{max:'100',value:'0',hidden:true,'aria-label':'Semantic model download progress'});
  function stop(message){generation++;assetController?.abort();assetController=null;worker?.terminate();worker=null;ready=false;requestId++;enable.disabled=false;cancel.hidden=true;progress.hidden=true;search.disabled=false;mode.textContent='Keyword mode';if(message)status.textContent=message;}
  function show(items,semantic){results.replaceChildren();if(!items.length){results.append(el('p',{text:'No keyword match. Try a concept, such as momentum, enzymes or membranes.'}));return;}
    for(const item of items){const entry=el('article',{class:'learning-result'},el('h3',{text:item.title}),el('p',{text:item.answer}));
      if(semantic)entry.append(el('p',{class:'learning-small',text:`Semantic similarity ${item.score.toFixed(2)} · a ranking signal, not factual confidence.`}));
      entry.append(el('div',{class:'learning-actions'},el('a',{href:item.source,target:'_blank',rel:'noopener noreferrer',text:'Source textbook'})));
      if(options.onOpenLesson)entry.lastChild.append(button('Explore this concept',()=>options.onOpenLesson({subject,id:item.id,title:item.title,query:item.title}),{class:'learning-secondary'}));
      results.append(entry);
    }
  }
  const search=button('Search concepts',()=>{const text=query.value.trim();if(!text){status.textContent='Enter a question or concept first.';query.focus();return;}
    if(ready&&worker){search.disabled=true;status.textContent='Comparing meaning locally…';worker.postMessage({type:'search',query:text,requestId:++requestId});}
    else{show(lexicalSearch(subject,text),false);status.textContent='Keyword results from the curated concept collection. Semantic search is off.';}
  });
  query.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();search.click();}});
  const enable=button('Enable semantic search',async()=>{
    stop();const current=generation;assetController=new AbortController();enable.disabled=true;cancel.hidden=false;cancel.textContent='Cancel download';progress.hidden=false;progress.removeAttribute('value');status.textContent='Loading the local inference runtime and downloading the pinned MiniLM model…';
    try{const assets={...options.assets,...(options.prepareAssets?await options.prepareAssets(assetController.signal):{})};if(current!==generation)return;worker=new Worker(assets.worker);worker.onmessage=({data})=>{
      if(data.type==='progress'){const p=data.progress;status.textContent=`Preparing semantic search: ${p.file||'model'} · ${p.status||'loading'}`;if(Number.isFinite(p.progress))progress.value=p.progress;}
      else if(data.type==='ready'){ready=true;progress.hidden=true;cancel.textContent='Turn off semantic search';mode.textContent='Semantic mode';status.textContent=`Semantic search ready. ${data.count} concepts indexed locally with ${data.dimensions}-dimension MiniLM embeddings. Your query stays in this browser.`;}
      else if(data.type==='results'&&data.requestId===requestId){show(data.results.map(r=>({...catalog[subject].find(x=>x.id===r.id),score:r.score})),true);search.disabled=false;status.textContent='Ranked by local semantic similarity. Check the explanation and source; this collection is limited.';}
      else if(data.type==='error'){stop(`Semantic search could not start: ${data.message}. Keyword search is still available.`);}
    };worker.onerror=()=>stop('The semantic worker could not run in this browser. Keyword search is still available.');
    worker.postMessage({type:'load',assets,documents:catalog[subject].map(x=>({id:x.id,text:`${x.title}. ${x.question} ${x.keywords}`}))});
    }catch(e){if(current===generation)stop(`Semantic search unavailable: ${e.message}. Keyword search is still available.`);}
  });
  const cancel=button('Cancel download',()=>{stop('Semantic search stopped. The worker and its downloads were cancelled; completed files may remain in the browser cache. Keyword search is ready.');cancel.textContent='Cancel download';},{class:'learning-secondary',hidden:true});
  container.append(el('div',{class:'learning-heading'},el('h2',{text:'Find a concept by its meaning'}),mode),el('p',{text:`Search ${catalog[subject].length} curated ${subjectName(subject)} explanations. This does not search the entire app or generate new answers.`}),el('label',{for:queryId,text:'Question or concept'}),el('div',{class:'learning-search-form'},query,search),el('details',{},el('summary',{text:'Optional: semantic search on this device'}),el('p',{text:'Enabling downloads about 23 MB of model data from Hugging Face and loads about 29 MB of local runtime assets. It uses CPU memory and may be slow on small devices. Completed model files may be cached; initial setup needs internet. Queries are processed locally and are not sent to a model API.'}),el('p',{class:'learning-small',text:'Model: Xenova/all-MiniLM-L6-v2, fixed revision 751bff3, q8, Apache-2.0. Similarity can miss meaning or rank a poor match. Keyword search works without the model.'}),el('div',{class:'learning-actions'},enable,cancel),progress),status,results);
  return ()=>stop();
}
export function mount(root,{subject='physics',panel='review',theme='light',assets={},prepareAssets,onOpenLesson}={}) {
  assertSubject(subject);const shell=el('section',{class:'entelloq-learning', 'aria-label':`${subjectName(subject)} learning tools`,'data-subject':subject});setTheme(shell,theme);
  const content=el('div',{class:'learning-panel'});const nav=el('nav',{'aria-label':'Learning tool'});let cleanup=()=>{};
  const options={assets:{...defaults,...assets},prepareAssets,onOpenLesson};
  function select(next){if(!['review','notebook','search'].includes(next))next='review';cleanup();content.replaceChildren();for(const b of nav.children)b.setAttribute('aria-pressed',String(b.dataset.panel===next));cleanup=({review:mountReview,notebook:mountNotebook,search:mountSearch})[next](content,subject,options);}
  for(const [id,title] of [['review','Review'],['notebook','Notebook'],['search','Concept search']])nav.append(button(title,()=>select(id),{'data-panel':id,'aria-pressed':String(id===panel),class:'learning-tab'}));
  shell.append(el('header',{class:'learning-top'},el('div',{},el('p',{class:'learning-eyebrow',text:`${subjectName(subject)} · learning tools`}),el('h1',{text:'Make the next attempt count.'})),nav),content);root.replaceChildren(shell);select(panel);
  return {destroy(){cleanup();root.replaceChildren();},setTheme:(value,tokens)=>setTheme(shell,value,tokens),select};
}
globalThis.EntelloqLearning={mount};
const entry=document.querySelector('[data-learning-entry]');
if(entry){const params=new URLSearchParams(location.search);const subject=params.get('subject')==='biology'?'biology':'physics';const app=mount(entry,{subject,panel:params.get('panel')||'review',theme:params.get('theme')||'light',assets:globalThis.ENTELLOQ_LEARNING_ASSETS||{},prepareAssets:globalThis.ENTELLOQ_LEARNING_PREPARE_ASSETS});
  const themeListener=event=>{if(event.source!==parent||parent===window)return;if(event.data?.type==='entelloq-learning:theme')app.setTheme(event.data.theme,event.data.tokens||{});if(event.data?.type==='entelloq-learning:panel')app.select(event.data.panel);};
  const onPageHide=event=>{if(event.persisted)return;window.removeEventListener('message',themeListener);window.removeEventListener('pagehide',onPageHide);app.destroy();};
  window.addEventListener('message',themeListener);window.addEventListener('pagehide',onPageHide);
}
