import css from './style.css';
const SERVICE='http://127.0.0.1:8932';
const KEY='entelloq.biology.mechanisms.v1';
const FIELD={substrate:[0,20,.5,10,'Substrate','µM'],enzyme:[0,2,.05,.5,'Enzyme','µM'],kcat:[0,2,.05,.3,'Catalytic rate','s⁻¹'],duration:[1,120,1,30,'Observation time','s']};
const currentScript=document.currentScript;
const volumeURL=document.getElementById('volume-library')?.getAttribute('src') || new URL('volume.js',currentScript?.src||location.href).href;
let libraryPromise;
function library(signal){
  if(window.EntelloqBiologyVolume)return Promise.resolve(window.EntelloqBiologyVolume);
  if(!libraryPromise)libraryPromise=(async()=>{
    // fetch is intentionally used here: the host's portable bridge resolves deferred bytes.
    const response=await fetch(volumeURL,{signal});
    if(!response.ok)throw Error('The microscopy renderer is not available in this app package.');
    const blob=await response.blob();signal?.throwIfAborted();
    const url=URL.createObjectURL(new Blob([blob],{type:'text/javascript'}));
    try{return await new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=url;
      const cleanup=()=>{script.remove();signal?.removeEventListener('abort',abort);};
      const abort=()=>{cleanup();reject(new DOMException('Renderer loading cancelled','AbortError'));};
      signal?.addEventListener('abort',abort,{once:true});
      script.onload=()=>{cleanup();resolve(window.EntelloqBiologyVolume);};
      script.onerror=()=>{cleanup();reject(Error('The microscopy renderer could not start. Check browser script permissions, then retry.'));};
      document.head.append(script);
    });}finally{URL.revokeObjectURL(url);}
  })().catch(error=>{libraryPromise=null;throw error;});
  return libraryPromise;
}
function saveFile(name,data,type='application/json'){
  const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function loadSettings(){
  function read(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
  const legacy=read(KEY),saved=legacy&&typeof legacy==='object'&&!Array.isArray(legacy)?legacy:{};
  const parameters={...saved.parameters};
  for(const [key,[min,max]] of Object.entries(FIELD)){
    const value=read(`${KEY}.parameter.${key}`);
    if(Number.isFinite(value)&&value>=min&&value<=max)parameters[key]=value;
  }
  const view=read(`${KEY}.volume`);
  const volume=view&&typeof view==='object'&&!Array.isArray(view)?view:saved.volume;
  return {...saved,parameters,volume};
}
export function mount(element,options={}) {
  if(!element)throw Error('A mount element is required');
  const saved=loadSettings();let disposed=false,request=null,volume=null,result=null,volumeLoading=false;
  const events=new AbortController();
  const root=document.createElement('section');root.className='bn';root.dataset.theme=options.theme==='light'?'light':'dark';
  const style=document.createElement('style');style.textContent=css;
  root.innerHTML=`<header><p class="kicker">Biology · Observe & explain</p><h1>From mechanism to evidence.</h1><p class="intro">Change an enzyme system, then look inside a real fluorescence stack. Models explain possible mechanisms; images record what a microscope measured.</p><div class="tabs" aria-label="Biology tools"><button data-panel="kinetics" aria-pressed="true">Enzyme kinetics</button><button data-panel="volume" aria-pressed="false">Microscopy volume</button></div></header>
  <section class="layout" data-view="kinetics" aria-label="Enzyme kinetics">
    <div class="card"><div class="pad"><p class="kicker">A closed enzyme system</p><h2>Where does the substrate go?</h2><p class="muted">Predict how doubling enzyme changes product formation. Run the same mechanism to test your prediction.</p></div><div class="reaction" aria-label="Enzyme plus substrate reversibly form a complex; the complex produces enzyme and product">E + S ⇌ ES → E + P</div><div data-chart class="empty"><h3>Make a prediction first.</h3><p>Connect the local companion and run an experiment to see calculated concentrations.</p></div><p class="result-summary" data-summary></p><div class="legend"><span><i></i>Substrate S</span><span><i class="product"></i>Product P</span><span><i class="complex"></i>Complex ES</span></div><div class="status" data-status="kinetics" role="status" aria-live="polite">Local companion has not been contacted.</div></div>
    <aside class="card pad"><h3>Set the experiment</h3><div class="fields">${Object.entries(FIELD).map(([key,[min,max,step,value,label,unit]])=>`<label><span>${label}<output data-output="${key}">${value} ${unit}</output></span><input aria-label="${label}" type="range" name="${key}" min="${min}" max="${max}" step="${step}" value="${value}"></label>`).join('')}</div><small>Concentrations in µM; time in seconds. Binding = 2 µM⁻¹ s⁻¹, unbinding = 1 s⁻¹.</small><div class="row"><button class="primary" data-run>Run experiment</button><button data-cancel disabled>Cancel</button></div><div class="row"><button data-export="csv" disabled>CSV</button><button data-export="sbml" disabled>SBML</button><button data-export="json" disabled>Record</button></div><details><summary>Connect the companion</summary><p>Start the Biology companion on this computer, then run the experiment. This tool connects only to <code>127.0.0.1:8932</code>. Your browser may ask for local network access.</p><p>The companion runs Tellurium / libRoadRunner. Without it, no numerical result is generated.</p></details></aside>
    <div class="card pad full"><h3>What this model can establish</h3><p class="muted">This is a generic, well-mixed system at fixed volume and temperature. It tracks enzyme and substrate moieties using mass-action kinetics. It does not include diffusion, inhibitors, growth or cellular regulation, and its rates are educational choices rather than measurements from an organism.</p><details><summary>Inspect the conservation check and data</summary><p data-conservation>Conservation is checked after each computed run: S + ES + P = initial S; E + ES = initial E.</p><div class="table-scroll" data-table></div></details></div>
  </section>
  <section class="layout" data-view="volume" aria-label="Microscopy volume" hidden>
    <div class="card"><div class="pad"><p class="kicker">Real microscopy · CC0</p><h2>One stack. Two signals.</h2><p class="muted">Explore membrane and nuclear fluorescence through the depth of a cell monolayer.</p></div><div class="toolbar"><button data-mode="slice" aria-pressed="true">Orthogonal slices</button><button data-mode="volume" aria-pressed="false">3D volume</button><button data-reset>Reset view</button></div><div class="stage"><div class="vtk-host" data-vtk role="img" aria-label="Fluorescence microscopy slice, controlled with the labelled controls"></div><div class="empty" data-volume-cover><h3>Look inside the stack.</h3><p>The viewer loads only when opened.</p><button class="primary" data-open-volume>Open microscopy</button></div></div><p class="scale-info" data-location>Dataset X/Y/Z axes · no anatomical orientation implied.</p><div class="status" data-status="volume" role="status" aria-live="polite">Renderer not loaded.</div></div>
    <aside class="card pad"><h3>Navigate the sample</h3><div class="fields"><label>Fluorescence channel<select data-channel><option value="0">Cell membrane stain</option><option value="1">Nuclear stain</option></select></label><label>Slice plane<select data-axis><option value="2">XY · move through Z</option><option value="1">XZ · move through Y</option><option value="0">YZ · move through X</option></select></label><label><span>Slice index <output data-slice-output>30 / 59</output></span><input aria-label="Slice index" data-slice type="range" min="0" max="59" step="1" value="30"></label><label><span>3D opacity threshold <output data-threshold-output>35 / 255</output></span><input aria-label="3D opacity threshold" data-threshold type="range" min="0" max="200" step="1" value="35"></label></div><button data-volume-export disabled>Save observation</button><div class="facts"><div><strong>64 × 64 × 60 voxels</strong>XY block-averaged for a compact browser sample.</div><div><strong>1.04 × 1.04 × 0.29 µm</strong>Physical voxel spacing in X, Y, Z.</div><div><strong>Fluorescence intensity</strong>Brightness is display-scaled separately for each channel; it is not molecular concentration.</div></div><small>3D view: drag to rotate; wheel or pinch to zoom. Slice views are fixed to dataset axes for consistent orientation. Use the slice slider with arrow keys.</small></aside>
    <div class="card pad full"><h3>Where the evidence comes from</h3><p class="muted">Allen Institute for Cell Science, distributed as the CC0 <a href="https://gitlab.com/scikit-image/data/-/blob/master/README.md" target="_blank" rel="noopener">scikit-image cells3d sample</a>. The source is a 60-plane fluorescence stack with two channels. No cell type, organism, segmentation, or anatomical orientation is inferred here.</p><details><summary>Processing and interpretation</summary><p>Source voxels: 0.26 × 0.26 × 0.29 µm. The display averages each 4 × 4 block in XY, keeps every Z plane, and maps each channel’s 99.7th percentile to 255. Higher values are clipped. The first averaged XY voxel centre is at 0.39 µm in the source coordinate system.</p><p>Rendering uses vtk.js. A bright structure is stain signal, not proof of its biological role. Appearance depends on channel, threshold and sampling.</p></details></div>
  </section><footer>Educational scientific tools · Tellurium 2.2.13.1 · vtk.js 37.4.6 · No analytics or third-party inference.</footer>`;
  element.replaceChildren(style,root);
  const q=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)];
  const listen=(el,event,fn)=>el.addEventListener(event,fn,{signal:events.signal});
  function status(which,text,error=false){const el=q(`[data-status="${which}"]`);el.textContent=text;el.dataset.error=String(error);}
  function persist(field,value,which){try{
    // Independent records avoid a cross-tab read/modify/write race. Updating
    // one parameter or the view cannot overwrite a peer's unrelated settings.
    // The previous combined record remains untouched as a legacy fallback.
    localStorage.setItem(`${KEY}.${field}`,JSON.stringify(value));return true;
  }catch{status(which,'These settings could not be saved. They remain available until this tool closes.',true);return false;}}
  function parameters(){return Object.fromEntries(Object.keys(FIELD).map(k=>[k,Number(q(`[name="${k}"]`).value)]));}
  for(const [key,[min,max,step,value,label,unit]] of Object.entries(FIELD)){
    const input=q(`[name="${key}"]`),v=saved.parameters?.[key];
    if(Number.isFinite(v)&&v>=min&&v<=max)input.value=String(v);
    const update=()=>{q(`[data-output="${key}"]`).textContent=`${input.value} ${unit}`;if(result)q('[data-summary]').textContent='Parameters changed. The plotted record belongs to the previous run; run again to compare.';};
    update();listen(input,'input',()=>{update();persist(`parameter.${key}`,Number(input.value),'kinetics');});
  }
  function cancel(){if(!request)return;request.abort();request=null;q('[data-run]').disabled=false;q('[data-cancel]').disabled=true;status('kinetics','Request cancelled. A short calculation already started in the companion may finish; its result will not be displayed.');}
  async function run(){
    cancel();const controller=new AbortController();request=controller;
    q('[data-run]').disabled=true;q('[data-cancel]').disabled=false;status('kinetics','Connecting to the local Tellurium companion…');
    const timeout=setTimeout(()=>controller.abort('timeout'),20000);
    try{
      const health=await fetch(`${SERVICE}/api/health`,{signal:controller.signal,cache:'no-store'});
      if(!health.ok)throw Error('Companion connection was refused.');const ready=await health.json();
      if(ready.engine!=='Tellurium'||typeof ready.token!=='string')throw Error('The local service is not the Biology companion.');
      status('kinetics','Computing the mass-action model and checking conservation…');
      const response=await fetch(`${SERVICE}/api/simulate`,{method:'POST',headers:{'Content-Type':'application/json','X-Entelloq-Token':ready.token},body:JSON.stringify(parameters()),signal:controller.signal});
      const data=await response.json();if(!response.ok)throw Error(data.error||'Calculation failed.');
      if(!Array.isArray(data.rows)||data.rows.length!==201||!data.rows.every(r=>r.length===5&&r.every(Number.isFinite)))throw Error('The companion returned invalid numerical data.');
      if(disposed||request!==controller)return;
      result=data;draw(data);all('[data-export]').forEach(b=>b.disabled=false);status('kinetics',`Computed with ${data.engine} · ${data.rows.length} samples · conservation passed.`);
    }catch(error){if(!disposed&&request===controller)status('kinetics',controller.signal.aborted?'The companion did not respond in time. Check it is running, then retry.':`${error.message} Start the local companion and allow this app’s local-network connection, then retry.`,true);}
    finally{clearTimeout(timeout);if(request===controller){request=null;q('[data-run]').disabled=false;q('[data-cancel]').disabled=true;}}
  }
  function draw(data){
    const max=Math.max(.1,...data.rows.flatMap(r=>[r[1],r[3],r[4]])),t=data.parameters.duration;
    const x=v=>55+v/t*550,y=v=>235-v/max*195;
    const path=col=>data.rows.map((r,i)=>`${i?'L':'M'}${x(r[0]).toFixed(2)},${y(r[col]).toFixed(2)}`).join(' ');
    q('[data-chart]').className='';q('[data-chart]').innerHTML=`<svg class="chart" viewBox="0 0 640 290" role="img" aria-label="Calculated concentration versus time. Exact numerical values are available in the data table and CSV."><text x="55" y="20">Concentration (µM)</text>${[0,.25,.5,.75,1].map(f=>`<path class="grid" d="M55 ${y(max*f)}H605"/><text x="48" y="${y(max*f)+4}" text-anchor="end">${(max*f).toFixed(1)}</text>`).join('')}${[0,.25,.5,.75,1].map(f=>`<text x="${x(t*f)}" y="255" text-anchor="middle">${(t*f).toFixed(1)}</text>`).join('')}<text x="330" y="280" text-anchor="middle">Time (s)</text><path fill="none" stroke-width="2.5" class="substrate" d="${path(1)}"/><path fill="none" stroke-width="2.5" class="product" d="${path(4)}"/><path fill="none" stroke-width="2.5" stroke-dasharray="5 3" class="complex" d="${path(3)}"/></svg>`;
    const end=data.rows.at(-1);q('[data-summary]').textContent=`At ${t} s: substrate ${end[1].toFixed(3)} µM, product ${end[4].toFixed(3)} µM, bound complex ${end[3].toFixed(3)} µM. Initial enzyme ${data.parameters.enzyme} µM; catalytic rate ${data.parameters.kcat} s⁻¹.`;
    const c=data.conservation;q('[data-conservation]').textContent=`Maximum drift: substrate moiety ${c.substrateMoietyMaxError_uM.toExponential(2)} µM; enzyme moiety ${c.enzymeMoietyMaxError_uM.toExponential(2)} µM. Tolerance: 1×10⁻⁷ µM. Numeric conservation is not experimental validation.`;
    q('[data-table]').innerHTML=`<table><caption>Selected samples; all 201 in CSV</caption><thead><tr><th>Time (s)</th><th>S (µM)</th><th>E (µM)</th><th>ES (µM)</th><th>P (µM)</th></tr></thead><tbody>${data.rows.filter((_,i)=>i%20===0).map(r=>`<tr>${r.map(v=>`<td>${v.toFixed(4)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  listen(q('[data-run]'),'click',run);listen(q('[data-cancel]'),'click',cancel);
  for(const button of all('[data-export]'))listen(button,'click',()=>{
    if(!result)return;const format=button.dataset.export;
    if(format==='csv')saveFile('enzyme-kinetics.csv',[result.columns.join(','),...result.rows.map(r=>r.join(','))].join('\n'),'text/csv');
    else if(format==='sbml')saveFile('enzyme-model.xml',result.sbml,'application/sbml+xml');
    else saveFile('enzyme-experiment.json',JSON.stringify(result,null,2));
  });
  async function openVolume(){
    if(volume||volumeLoading)return;volumeLoading=true;q('[data-open-volume]').disabled=true;status('volume','Loading the local microscopy renderer and CC0 sample…');
    try{const lib=await library(events.signal);if(disposed)return;
      q('[data-volume-cover]').hidden=true;
      volume=lib.create(q('[data-vtk]'));
      const previous=loadSettings().volume;
      if(previous){const s=previous;const valid={};if([0,1,2].includes(s.axis))valid.axis=s.axis;if([0,1].includes(s.channel))valid.channel=s.channel;if(['slice','volume'].includes(s.mode))valid.mode=s.mode;if(Number.isFinite(s.slice))valid.slice=s.slice;if(Number.isFinite(s.threshold))valid.threshold=s.threshold;volume.set(valid,true);}
      const savedView=updateVolume();q('[data-volume-export]').disabled=false;if(savedView!==false)status('volume','Real cells3d fluorescence data · rendered locally with vtk.js.');
    }catch(error){q('[data-volume-cover]').hidden=false;status('volume',error.message,true);}
    finally{volumeLoading=false;q('[data-open-volume]').disabled=false;}
  }
  function updateVolume(next={}){
    if(!volume)return;const s=volume.set(next);q('[data-axis]').value=s.axis;q('[data-channel]').value=s.channel;q('[data-slice]').max=s.dimensions[s.axis]-1;q('[data-slice]').value=s.slice;q('[data-slice-output]').textContent=`${s.slice} / ${s.dimensions[s.axis]-1}`;q('[data-threshold]').value=s.threshold;q('[data-threshold-output]').textContent=`${s.threshold} / 255`;
    q('[data-axis]').disabled=q('[data-slice]').disabled=s.mode==='volume';q('[data-threshold]').disabled=s.mode!=='volume';all('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===s.mode)));
    q('[data-location]').textContent=s.mode==='slice'?`${s.axisName} = ${s.location.toFixed(2)} µm · ${s.directions} · dataset axes`:'3D fluorescence volume · X/Y/Z extent 65.52 / 65.52 / 17.11 µm between voxel centres';
    q('[data-vtk]').setAttribute('aria-label',`${q('[data-channel]').selectedOptions[0].textContent}; ${q('[data-location]').textContent}`);return persist('volume',volume.getState(),'volume');
  }
  listen(q('[data-open-volume]'),'click',openVolume);
  listen(q('[data-axis]'),'change',e=>updateVolume({axis:Number(e.target.value),slice:30}));
  listen(q('[data-channel]'),'change',e=>updateVolume({channel:Number(e.target.value)}));
  listen(q('[data-slice]'),'input',e=>updateVolume({slice:Number(e.target.value)}));
  listen(q('[data-threshold]'),'input',e=>updateVolume({threshold:Number(e.target.value)}));
  all('[data-mode]').forEach(b=>listen(b,'click',()=>updateVolume({mode:b.dataset.mode})));
  listen(q('[data-reset]'),'click',()=>volume?.reset());
  listen(q('[data-volume-export]'),'click',()=>{if(volume)saveFile('microscopy-observation.json',JSON.stringify({view:volume.getState(),provenance:window.EntelloqBiologyVolume.metadata,meaning:'View settings and source provenance; not a segmentation or clinical measurement'},null,2));});
  function panel(name){if(!['kinetics','volume'].includes(name))return;all('[data-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.panel===name)));all('[data-view]').forEach(v=>v.hidden=v.dataset.view!==name);if(name!=='kinetics')cancel();}
  all('[data-panel]').forEach(b=>listen(b,'click',()=>panel(b.dataset.panel)));
  panel(options.panel||new URLSearchParams(location.search).get('panel')||'kinetics');
  function setTheme(theme){if(['light','dark'].includes(theme))root.dataset.theme=theme;}
  let parentOrigin;try{parentOrigin=document.referrer?new URL(document.referrer).origin:location.origin;}catch{parentOrigin=location.origin;}
  listen(window,'message',event=>{if(event.source!==parent||event.origin!==parentOrigin)return;if(event.data?.type==='entelloq:theme')setTheme(event.data.theme);});
  return {setTheme,panel,unmount(){disposed=true;cancel();events.abort();volume?.dispose();element.replaceChildren();}};
}
if(document.getElementById('biology-next'))window.biologyNext=mount(document.getElementById('biology-next'),{theme:document.documentElement.dataset.theme});
