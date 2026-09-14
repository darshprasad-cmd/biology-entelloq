/* A reusable, local scientific notebook. Bench state is sampled only on request. */
(function () {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fields = { hypothesis:'Hypothesis', variables:'Independent, dependent and controlled variables', method:'Method', observations:'Observations', conclusion:'Conclusion', limitations:'Errors / limitations' };
  const memory = new Map();
  const plain = x => x && typeof x === 'object' && !Array.isArray(x);
  function cleanMap(x) {
    if (!plain(x)) return {};
    return Object.fromEntries(Object.entries(x).slice(0,40).filter(([k,v])=>k.length<150 && (typeof v==='string'||typeof v==='number') && (typeof v!=='number'||Number.isFinite(v))).map(([k,v])=>[k,typeof v==='string'?v.slice(0,1500):v]));
  }
  function clean(value) {
    const v = plain(value) ? value : {};
    const note={version:1,mode:['guided','challenge','sandbox'].includes(v.mode)?v.mode:'guided',trials:[],question:typeof v.question==='string'?v.question.slice(0,2000):''};
    for(const key of Object.keys(fields)) note[key]=typeof v[key]==='string'?v[key].slice(0,12000):'';
    if(Array.isArray(v.trials)) note.trials=v.trials.slice(-80).filter(plain).map((t,i)=>({index:i+1,at:typeof t.at==='string'?t.at:'',variables:cleanMap(t.variables),measurements:cleanMap(t.measurements),stage:String(t.stage||'').slice(0,300),observation:String(t.observation||'').slice(0,2000)}));
    return note;
  }
  function csvCell(value) {
    let s=String(value??'');
    if (/^[\s]*[=+@-]/.test(s) && !(typeof value==='number')) s="'"+s;
    return '"'+s.replace(/"/g,'""')+'"';
  }
  function csv(trials) {
    const vars=[...new Set(trials.flatMap(t=>Object.keys(t.variables)))],ms=[...new Set(trials.flatMap(t=>Object.keys(t.measurements)))];
    const rows=[['Trial','Recorded at',...vars.map(k=>'Variable: '+k),...ms.map(k=>'Measurement: '+k),'Stage','Observation']];
    for(const t of trials) rows.push([t.index,t.at,...vars.map(k=>t.variables[k]??''),...ms.map(k=>t.measurements[k]??''),t.stage,t.observation]);
    return rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
  }
  function download(data,type,name) { const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500); }
  function fallback(host) {
    const variables={},measurements={};
    host.querySelectorAll('input,select').forEach((e,i)=>{
      if(e.type==='button'||e.type==='hidden')return;
      const label=e.labels?.[0]?.textContent.trim()||e.getAttribute('aria-label')||e.closest('.bx-grp')?.querySelector('label,.bx-lbl')?.textContent||e.id||'Control '+(i+1);
      variables[label]=e.type==='range'||e.type==='number'?Number(e.value):e.type==='checkbox'?String(e.checked):e.value;
    });
    host.querySelectorAll('.bx-chips').forEach((g,i)=>{const selected=[...g.querySelectorAll('.on,[aria-pressed=true]')].map(e=>e.textContent.trim()).join(', ');if(selected)variables[g.closest('.bx-grp')?.querySelector('label,.bx-lbl')?.textContent||'Selection '+(i+1)]=selected;});
    const reads=host.querySelectorAll('.bx-read,.ns-cap,.pg-readout,.hm-read');
    reads.forEach((el,i)=>{const value=el.textContent.trim();if(value)measurements['Observation '+(i+1)]=value;});
    return {variables,measurements,stage:'Observation'};
  }
  function mount(lab,host,live,workflow,target) {
    const key='bioq.lab-notebook.v1.'+lab.id;
    const cached=memory.get(key);
    let note=clean(cached?.note),baselineRaw=cached?.baselineRaw??null,savedView=cached?.savedView??'',conflict=!!cached?.conflict,saveOk=!cached?.unsaved,xKey='Trial',yKey='',graphType='scatter',disposed=false;
    const hasDraft=cached && JSON.stringify(note)!==savedView;
    try {
      const raw=localStorage.getItem(key);
      if(!hasDraft){baselineRaw=raw;note=clean(raw?JSON.parse(raw):null);conflict=false;saveOk=true;}
      else if(raw!==baselineRaw){conflict=true;saveOk=false;}
    }catch(_){saveOk=false;}
    if(!note.question)note.question=lab.question||'How does changing one condition affect this biological system?';
    if(!hasDraft)savedView=JSON.stringify(note);
    workflow.className='ln-workspace';target.className='ln-workspace';
    workflow.innerHTML=`<div class="ln-question"><div><h2>${esc(note.question)}</h2><p>${esc((lab.learningObjectives||[]).join(' · '))}</p></div><div class="ln-modes" role="group" aria-label="Experiment mode">${['guided','challenge','sandbox'].map(m=>`<button class="bx-btn" data-lab-mode="${m}" aria-pressed="${m===note.mode}">${m[0].toUpperCase()+m.slice(1)}</button>`).join('')}</div></div><p class="ln-workflow-hint" id="lab-hint"></p><label>My hypothesis<input id="lab-hypothesis" maxlength="2000" placeholder="If I change… then… because…" value="${esc(note.hypothesis)}"></label>`;
    target.innerHTML=`<div class="ln-notebook-top"><h2>Lab notebook</h2><div class="ln-theory"><span>Understand the theory</span>${(lab.relatedTopics||[]).map(id=>`<a href="./learn.html#topic/${esc(id)}/intuition">${esc(id.replace(/-/g,' '))} ↗</a>`).join('')}</div></div><p class="ln-save" id="lab-save-state" role="status"></p><div class="ln-actions"><button class="bx-btn pri" id="lab-record">Record trial</button><button class="bx-btn" id="lab-coach">Ask the learning guide</button><button class="bx-btn" id="lab-capture">Capture view</button><button class="bx-btn" id="lab-csv">Export data CSV</button><button class="bx-btn" id="lab-export">Export notebook</button></div><div class="ln-record-summary" id="lab-record-summary"></div><div id="lab-trials"></div><div class="ln-graph"><div class="ln-graph-controls"><label>Horizontal axis<select id="lab-x"></select></label><label>Vertical axis<select id="lab-y"></select></label><label>Graph type<select id="lab-graph-type"><option value="scatter">Scatter</option><option value="line">Line</option><option value="bar">Bar</option></select></label></div><div id="lab-plot"></div></div><div class="ln-fields"><label>Research question<input data-note="question" maxlength="2000" value="${esc(note.question)}"></label>${Object.entries(fields).filter(([k])=>k!=='hypothesis').map(([k,label])=>`<label>${label}<textarea data-note="${k}" maxlength="12000" rows="3" placeholder="${k==='conclusion'?'Use evidence from your recorded trials.':k==='limitations'?'Which assumptions might differ in a living system?':'Write your '+label.toLowerCase()+'.'}">${esc(note[k])}</textarea></label>`).join('')}</div>`;
    const $=s=>target.querySelector(s);
    const resetPanel=document.createElement('div');
    resetPanel.className='ln-record-summary';resetPanel.id='lab-reset-panel';resetPanel.hidden=true;
    resetPanel.setAttribute('role','group');resetPanel.setAttribute('aria-labelledby','lab-reset-title');
    resetPanel.innerHTML='<h3 id="lab-reset-title">Start a new investigation?</h3><p>Export your notebook first if you want to keep it. Starting again clears this lab’s notes and recorded trials on this device. Your current experiment controls stay in place.</p><p id="lab-reset-message" role="status"></p><div class="ln-actions"><button class="bx-btn" id="lab-reset-cancel">Cancel</button><button class="bx-btn" id="lab-reset-confirm">Start new investigation</button></div>';
    const newButton=document.createElement('button');newButton.className='bx-btn';newButton.id='lab-new';newButton.textContent='New investigation';newButton.setAttribute('aria-controls','lab-reset-panel');newButton.setAttribute('aria-expanded','false');
    $('.ln-actions').append(newButton);$('.ln-actions').after(resetPanel);
    const conflictMessage='Another tab changed this notebook. Your work remains in this tab for export. Export it, then reload to use the latest saved notebook.';
    function remember(){memory.set(key,{note:clean(note),baselineRaw,savedView,conflict,unsaved:!saveOk});}
    function status(){if(!disposed)$('#lab-save-state').textContent=conflict?conflictMessage:saveOk?'Saved on this device · up to 80 trials per experiment.':'Device storage is unavailable. This session stays usable; export your notebook before leaving.';}
    function persist(next,force=false){
      const serialized=JSON.stringify(next);
      if(!force && serialized===savedView){status();return !conflict;}
      try{
        // Compare with the exact revision read by this view, including before a reset.
        // A stale view keeps its local draft; it never blindly replaces newer records.
        if(localStorage.getItem(key)!==baselineRaw){conflict=true;saveOk=false;status();return false;}
        localStorage.setItem(key,serialized);baselineRaw=serialized;savedView=serialized;conflict=false;saveOk=true;
      }catch(_){saveOk=false;}
      status();return true;
    }
    function save(){persist(note);remember();}
    function storageChanged(e){if((e.key===key||e.key===null)&&e.newValue!==baselineRaw){conflict=true;saveOk=false;status();remember();}}
    window.addEventListener('storage',storageChanged);
    function snapshot() {try{const s=live.snapshot?live.snapshot():fallback(host);return {variables:cleanMap(s.variables),measurements:cleanMap(s.measurements),stage:String(s.stage||'Observation'),actions:Array.isArray(s.actions)?s.actions.slice(-12).map(x=>String(x).slice(0,180)):[]};}catch(_){return fallback(host);}}
    function publish() { const s=snapshot();window.BioContext?.publish({kind:'lab',lab:lab.id,title:lab.title,mode:note.mode,hypothesis:note.hypothesis,stage:s.stage,variables:s.variables,measurements:s.measurements,actions:[...actions,...(s.actions||[])].slice(-12),trials:note.trials.slice(-2)}); }
    const actions=[];
    function action(e){const t=e.target.closest('button,input,select');if(t){actions.push((t.getAttribute('aria-label')||t.textContent||t.id||'Changed control').trim().slice(0,120));if(actions.length>50)actions.shift();}publish();}
    host.addEventListener('change',action);host.addEventListener('click',action);
    function mode() {
      workflow.querySelectorAll('[data-lab-mode]').forEach(b=>{b.classList.toggle('on',b.dataset.labMode===note.mode);b.setAttribute('aria-pressed',String(b.dataset.labMode===note.mode));});
      workflow.querySelector('#lab-hint').textContent=note.mode==='guided'?(lab.steps||['Predict the result. Record a baseline. Change one variable and record another trial. Compare evidence, then explain the pattern.']).join(' → '):note.mode==='challenge'?(lab.challenge||'Design a fair test of the research question. Choose your own controls and collect enough evidence to justify your conclusion.'):'Choose your own question, explore the controls, and record any observation worth investigating.';
      save();publish();
    }
    workflow.querySelectorAll('[data-lab-mode]').forEach(b=>b.addEventListener('click',()=>{note.mode=b.dataset.labMode;mode();}));
    workflow.querySelector('#lab-hypothesis').addEventListener('input',e=>{note.hypothesis=e.target.value;save();publish();});
    target.querySelectorAll('[data-note]').forEach(e=>e.addEventListener('input',()=>{note[e.dataset.note]=e.value;if(e.dataset.note==='question')workflow.querySelector('h2').textContent=e.value;save();}));
    function graph() {
      const vars=[...new Set(note.trials.flatMap(t=>Object.keys(t.variables).filter(k=>typeof t.variables[k]==='number')))];
      const measures=[...new Set(note.trials.flatMap(t=>Object.keys(t.measurements).filter(k=>typeof t.measurements[k]==='number')))];
      if(xKey!=='Trial'&&!vars.includes(xKey))xKey='Trial';if(!measures.includes(yKey))yKey=measures[0]||'';
      $('#lab-x').innerHTML=['Trial',...vars].map(k=>`<option ${k===xKey?'selected':''}>${esc(k)}</option>`).join('');
      $('#lab-y').innerHTML=measures.length?measures.map(k=>`<option ${k===yKey?'selected':''}>${esc(k)}</option>`).join(''):'<option>No numeric measurements yet</option>';
      const points=note.trials.map(t=>({x:xKey==='Trial'?t.index:t.variables[xKey],y:t.measurements[yKey],index:t.index})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
      if(!points.length){$('#lab-plot').innerHTML='<p>Record a trial with a numeric measurement to plot it. Structural observations remain available in the table and notebook.</p>';return;}
      let xmin=Math.min(...points.map(p=>p.x)),xmax=Math.max(...points.map(p=>p.x)),ymin=Math.min(0,...points.map(p=>p.y)),ymax=Math.max(0,...points.map(p=>p.y));
      if(xmin===xmax){xmin-=1;xmax+=1;}if(ymin===ymax)ymax=ymin+1;
      const xp=x=>70+(x-xmin)/(xmax-xmin)*580,yp=y=>255-(y-ymin)/(ymax-ymin)*210;
      const sorted=[...points].sort((a,b)=>a.x-b.x);
      let series=graphType==='line'?`<polyline points="${sorted.map(p=>xp(p.x)+','+yp(p.y)).join(' ')}" fill="none" stroke="var(--em)" stroke-width="2"/>`:'';
      series+=points.map(p=>graphType==='bar'?`<rect x="${xp(p.x)-Math.min(15,230/points.length)}" y="${Math.min(yp(p.y),yp(0))}" width="${Math.min(30,460/points.length)}" height="${Math.max(1,Math.abs(yp(p.y)-yp(0)))}" fill="var(--em)"><title>Trial ${p.index}: ${esc(p.x)}, ${esc(p.y)}</title></rect>`:`<circle cx="${xp(p.x)}" cy="${yp(p.y)}" r="4" fill="var(--em)"><title>Trial ${p.index}: ${esc(p.x)}, ${esc(p.y)}</title></circle>`).join('');
      const ticks=Array.from({length:5},(_,i)=>{const y=ymin+(ymax-ymin)*i/4;return `<line x1="70" x2="650" y1="${yp(y)}" y2="${yp(y)}" stroke="var(--line)"/><text x="60" y="${yp(y)+4}" text-anchor="end">${Number(y.toPrecision(3))}</text>`;}).join('');
      $('#lab-plot').innerHTML=`<svg viewBox="0 0 710 335" role="img" aria-label="${esc(yKey)} against ${esc(xKey)} from ${points.length} recorded trials"><g fill="var(--dim)" font-family="system-ui" font-size="11">${ticks}<text x="70" y="285">${Number(xmin.toPrecision(3))}</text><text x="650" y="285" text-anchor="end">${Number(xmax.toPrecision(3))}</text><text x="350" y="318" text-anchor="middle">${esc(xKey)}</text><text x="70" y="24">${esc(yKey)}</text></g><path d="M70 40V255H650" fill="none" stroke="var(--hair)"/>${series}</svg><p>${points.length} recorded observations. ${graphType==='line'?'Connecting points shows a trend; it does not establish causation.':graphType==='bar'?'Repeated horizontal values share a position; use Trial on the horizontal axis to compare every repeat.':'Hover a point for its recorded values.'}</p>`;
    }
    function paint() {
      const kv=m=>Object.entries(m).map(([k,v])=>`<span>${esc(k)}: <strong>${esc(v)}</strong></span>`).join('');
      $('#lab-trials').innerHTML=note.trials.length?`<div class="ln-table-wrap"><table class="ln-table"><caption class="ln-count">Recorded trial history</caption><thead><tr><th>Trial</th><th>Variables</th><th>Measurements</th><th>Observation</th></tr></thead><tbody>${note.trials.map(t=>`<tr><td>${t.index}</td><td>${kv(t.variables)}</td><td>${kv(t.measurements)}</td><td>${esc(t.observation||t.stage)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="ln-count">No trials recorded. Set your conditions, then record a baseline.</p>';
      const s=note.trials.at(-1);$('#lab-record-summary').innerHTML=s?`Last recorded: trial ${s.index} · ${esc(s.stage)}<br>${kv(s.measurements)}`:'Your next trial will capture the current controls and measurements.';
      graph();$('#lab-csv').disabled=!note.trials.length;
    }
    $('#lab-record').onclick=()=>{if(note.trials.length>=80){$('#lab-save-state').textContent='This notebook contains 80 trials. Export your records, then choose New investigation.';return;}const s=snapshot();note.trials.push({index:note.trials.length+1,at:new Date().toISOString(),...s,observation:note.observations.slice(0,2000)});save();paint();publish();};
    newButton.onclick=()=>{resetPanel.hidden=false;newButton.setAttribute('aria-expanded','true');$('#lab-reset-message').textContent=conflict?conflictMessage:'';$('#lab-reset-cancel').focus();};
    function closeReset(){resetPanel.hidden=true;newButton.setAttribute('aria-expanded','false');newButton.focus();}
    $('#lab-reset-cancel').onclick=closeReset;
    $('#lab-reset-confirm').onclick=()=>{
      const fresh=clean({question:lab.question||'How does changing one condition affect this biological system?'});
      if(!persist(fresh,true)){$('#lab-reset-message').textContent=conflictMessage;remember();return;}
      note=fresh;actions.length=0;xKey='Trial';yKey='';graphType='scatter';remember();
      workflow.querySelector('#lab-hypothesis').value='';workflow.querySelector('h2').textContent=note.question;
      target.querySelectorAll('[data-note]').forEach(e=>{e.value=note[e.dataset.note]||'';});
      $('#lab-graph-type').value='scatter';mode();paint();closeReset();
    };
    $('#lab-coach').onclick=()=>{publish();window.BioContext?.ask('Help me reason from my experiment.');};
    $('#lab-x').onchange=e=>{xKey=e.target.value;graph();};$('#lab-y').onchange=e=>{yKey=e.target.value;graph();};$('#lab-graph-type').onchange=e=>{graphType=e.target.value;graph();};
    $('#lab-csv').onclick=()=>download(csv(note.trials),'text/csv;charset=utf-8',lab.id+'-trials.csv');
    $('#lab-export').onclick=()=>{const text=['# '+lab.title,'', 'Question: '+note.question,'Mode: '+note.mode,...Object.entries(fields).flatMap(([k,label])=>['','## '+label,note[k]||'(not recorded)']),'','## Trial data',csv(note.trials)].join('\n');download(text,'text/markdown;charset=utf-8',lab.id+'-notebook.md');};
    $('#lab-capture').onclick=async()=>{
      if(live.capture){try{const blob=await live.capture();if(!blob)throw new Error('No image');download(blob,'image/png',lab.id+'-observation.png');}catch(_){$('#lab-save-state').textContent='This view is not ready for capture. Let the specimen finish loading, then try again.';}return;}
      const canvas=host.querySelector('canvas'),svg=host.querySelector('svg');
      if(canvas){try{canvas.toBlob(blob=>{if(blob)download(blob,'image/png',lab.id+'-observation.png');else $('#lab-save-state').textContent='Capture unavailable for this view. Export your observations instead.';});}catch(_){$('#lab-save-state').textContent='This view cannot be captured by the browser. Your notebook is still exportable.';}}
      else if(svg){const clone=svg.cloneNode(true),style=getComputedStyle(svg);clone.setAttribute('xmlns','http://www.w3.org/2000/svg');clone.setAttribute('style','background:'+getComputedStyle(document.documentElement).getPropertyValue('--bg-2')+';color:'+style.color+';'+['--em','--cy','--ink','--dim','--line','--hair','--rose','--amber'].map(k=>k+':'+getComputedStyle(document.documentElement).getPropertyValue(k)).join(';'));download(new XMLSerializer().serializeToString(clone),'image/svg+xml',lab.id+'-observation.svg');}
      else $('#lab-save-state').textContent='No capturable view is available. Your written observations can still be exported.';
    };
    mode();paint();publish();
    return {dispose(){if(disposed)return;remember();disposed=true;window.removeEventListener('storage',storageChanged);host.removeEventListener('change',action);host.removeEventListener('click',action);}};
  }
  window.BioNotebook={mount,clean,csv};
})();
