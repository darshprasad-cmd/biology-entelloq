/* Original CBSE apparatus rehearsal. Synthetic readings, not a wet-lab record. */
(function(root){
  'use strict';
  const M=root.BioPotatoOsmosisModel, KEY='bioq.cbse.potato-osmosis.v1';
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let session=null;
  function load(){
    if(session)return session;
    try{const value=JSON.parse(root.localStorage.getItem(KEY));
      if(value?.version===1&&Array.isArray(value.records)&&value.records.length<=90){
        session=value.records.map(M.validRecord).filter(row=>{
          if(!row)return false;
          const expected=M.compare({concentration:row.concentration,setup:row.setup,direction:row.direction,repeat:row.repeat},row.timeMinutes);
          return Math.abs(row.testLevel-Number(expected.testLevel.toFixed(1)))<.051&&Math.abs(row.controlLevel-Number(expected.controlLevel.toFixed(1)))<.051;
        });return session;
      }
    }catch(_){}
    return session=[];
  }
  function persist(records){session=records;try{root.localStorage.setItem(KEY,JSON.stringify({version:1,records}));return true;}catch(_){return false;}}
  const fixed=n=>Number(n).toFixed(1);
  const condition=s=>({intact:'Intact cup',leaking:'Punctured base',flooded:'Flooded rim'}[s]);
  function mount(host){
    let options={concentration:20,setup:'intact',repeat:1,direction:'inward'},minutes=0,started=false;
    host.innerHTML=`<section class="poto" aria-labelledby="poto-title">
      <div class="poto-heading"><div><p class="cbsep-eyebrow">Interactive apparatus rehearsal · Class 11</p><h2 id="poto-title">Two cups. One controlled comparison.</h2></div><span class="poto-badge">Simulated readings</span></div>
      <p>Change the solution arrangement, inspect the apparatus, then compare its level with a matched water-only control. This is a schematic, not a biological specimen or a calibrated prediction.</p>
      <details class="poto-method"><summary>Before you start: what stays the same?</summary><p>Keep cup dimensions, starting level, temperature and elapsed time alike. Change only the solution arrangement or investigate one apparatus fault. The selected fault affects the test cup only; the control remains intact with water inside and outside. In real work, a teacher prepares and inspects the cups. Never use a blade unsupervised or eat experimental material.</p><p>This bench defines concentration as % w/v: 20 g sucrose made up to 100 mL of solution, not added to 100 mL of water. NCERT specifies 20% without defining that convention; 10% is an additional comparison. Repeat numbers illustrate model variation; they are not independent measurements from real potatoes.</p></details>
      <div class="poto-controls">
        <label>Sucrose solution (% w/v)<select id="poto-concentration"><option value="0">0% · water-only comparison</option><option value="10">10% · comparison</option><option value="20" selected>20% · sucrose solution</option></select></label>
        <label>Solution arrangement<select id="poto-direction"><option value="inward">Sucrose inside · water bath</option><option value="outward">Water inside · sucrose bath</option></select></label>
        <label>Test-cup condition<select id="poto-setup"><option value="intact">Intact cup · rim above bath</option><option value="leaking">Punctured base · leakage</option><option value="flooded">Rim below bath · flooding</option></select></label>
        <label>Illustrative repeat<select id="poto-repeat"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>
      </div>
      <div class="poto-actions"><button type="button" class="cbse-primary" data-poto="start">Start paired run</button><button type="button" data-poto="advance" disabled>Advance 10 model minutes</button><button type="button" data-poto="new" disabled>New setup</button><span class="poto-time" role="status">Not started</span></div>
      <p class="poto-run-note">Start to mark the initial levels. Changing a setup never deletes your saved observations.</p>
      <p class="poto-geometry">Scaled rehearsal geometry: the cavity starts at 8 of 24 mm; immersion is schematic. For supervised work, NCERT uses a half-filled cavity and about two-thirds potato immersion. At time zero the selected flooding fault has not yet been applied.</p>
      <div class="poto-apparatus"></div>
      <p class="poto-inference" role="status"></p>
      <form class="poto-record"><fieldset disabled><legend>Read, subtract, record</legend><p>Read the displayed levels to 0.1 mm. Net change = (test level − its 8.0 mm start) − (control level − its 8.0 mm start). The ruler is schematic; the numeric readouts provide equivalent access.</p><div class="poto-fields">
        <label>Test-cup level (mm)<input name="testLevel" type="number" min="0" max="30" step="0.1" required inputmode="decimal"></label>
        <label>Control level (mm)<input name="controlLevel" type="number" min="0" max="30" step="0.1" required inputmode="decimal"></label>
        <label>Net change (mm)<input name="netChange" type="number" min="-30" max="30" step="0.1" required inputmode="decimal"></label>
      </div><button type="submit">Check and save observation</button></fieldset><p class="poto-feedback" role="status"></p></form>
      <details class="poto-notebook"><summary>Observation notebook <span data-poto-count></span></summary><p>The latest 90 checked simulated readings are stored here, separately from your preparation notes. Repeating the same arrangement, concentration, setup, repeat and time replaces that observation. No practical-completion or mastery score is awarded.</p><div class="poto-table" tabindex="0" role="region" aria-label="Simulated observations, scroll horizontally"><table><caption>Model observations · levels in mm above cavity floor</caption><thead><tr><th scope="col">Setup</th><th scope="col">Repeat</th><th scope="col">Time (min)</th><th scope="col">Test (mm)</th><th scope="col">Control (mm)</th><th scope="col">Net (mm)</th><th scope="col">Interpretation</th></tr></thead><tbody></tbody></table></div><p class="poto-empty">No observations yet. Start a run and record its starting level.</p><button type="button" data-poto="export">Download simulated observations (CSV)</button><p class="poto-storage" role="status"></p></details>
      <details class="poto-reason"><summary>Explain the evidence</summary><form><fieldset><legend>A sucrose cup rises, but the water-only control barely changes. Which explanation is justified?</legend>${[
        'The comparison supports net water entry associated with the sucrose gradient, if the cups are intact and conditions matched.',
        'The sugar actively pumps water through an impermeable potato wall.',
        'Every rise, including a flooded cup, proves osmosis.'
      ].map((text,i)=>`<label><input type="radio" name="reason" value="${i}" required><span>${text}</span></label>`).join('')}</fieldset><button type="submit">Check explanation</button><p role="status"></p></form></details>
      <details class="poto-limits"><summary>Model limits and primary references</summary><p>Living tissue is not a perfect membrane. This model treats an intact cup as an ideal selectively permeable barrier and uses an illustrative response law. It omits tissue solutes, pressure effects, evaporation, membrane damage and changing bath composition. A real water-only control may change too. Do not infer actual rates, water potentials, statistical confidence or tissue viability from these numbers.</p><p>Time is advanced manually; “model minutes” are not a prediction of school-lab timing. Flooding and punctures introduce bulk mixing or leakage and invalidate an osmosis-only interpretation. Equal dimensions, no leakage and a matched control strengthen the inference but do not eliminate every confounder.</p><p>Try reversing the inner/outer liquids, as NCERT asks: the signed level change should reverse under this model’s assumptions. Required supervised practical work, accessible apparatus arrangements and educator review remain separate.</p><ul><li><a href="https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Biology_SecP2_2026-27.pdf#page=6" target="_blank" rel="noopener">CBSE 2026–27 Biology · p.6, experiment A3</a></li><li><a href="https://ncert.nic.in/pdf/publication/sciencelaboratorymanuals/classXI/biology/kelm312.pdf#page=1" target="_blank" rel="noopener">NCERT laboratory manual · potato osmometer, printed pp.81–82</a></li></ul></details>
    </section>`;
    const $=s=>host.querySelector(s), feedback=$('.poto-feedback'), controls=[...host.querySelectorAll('.poto-controls select')];
    const fields=$('.poto-record fieldset');
    function cup(label,level,bath,fault){
      const y=160-level*4, bathY=160-bath*4;
      const ticks=[0,4,8,12,16,20,24].map(n=>`<path d="M193 ${160-n*4}h${n%8===0?12:7}"/><text x="212" y="${164-n*4}">${n}</text>`).join('');
      return `<figure><figcaption>${label}</figcaption><svg viewBox="0 0 260 220" role="img" aria-label="${esc(label)}: ${fixed(level)} mm above cavity floor. ${fault==='flooded'?'Bath is above the rim.':fault==='leaking'?'A hole in the base bypasses tissue.':'Rim above water; base intact.'}"><defs><pattern id="poto-${label.startsWith('Test')?'test':'control'}" width="11" height="11" patternUnits="userSpaceOnUse"><path d="M1 3l2 1m4 3l1 1" stroke="#b49e5c" stroke-width="1.2"/></pattern></defs><path d="M25 25v161h163V25" fill="#102c29" stroke="#8aaea5" stroke-width="2"/><path d="M27 ${bathY}H186V184H27Z" fill="#347b87" fill-opacity=".55"/><path d="M54 64H79V160H136V64H162V181H54Z" fill="#d4bc77" stroke="#eece86" stroke-width="2"/><path d="M54 64H79V160H136V64H162V181H54Z" fill="url(#poto-${label.startsWith('Test')?'test':'control'})"/><path d="M80 ${y}H135V159H80Z" fill="#9bd6c5" fill-opacity=".8"/><path d="M74 128h68" stroke="#ffe9af" stroke-dasharray="4 3"/><path d="M79 ${y}h57" stroke="#e8fff6" stroke-width="2"/>${fault==='leaking'?'<path d="M101 160h13v23h-13z" fill="#142c29"/><path d="M106 165v27m-4-5l4 5 4-5" fill="none" stroke="#ffb8a4" stroke-width="2"/>':''}<g fill="none" stroke="#b9c9bf">${ticks}</g><text x="195" y="48" fill="#e1f0e7">mm</text><text x="30" y="208" fill="#b9cfc4">Dashed mark: initial level</text></svg><p class="poto-readout">${fixed(level)} <span>mm above cavity floor</span></p></figure>`;
    }
    function update(){
      const r=M.compare(options,minutes);
      $('.poto-time').textContent=started?minutes+' / 60 model min':'Not started';
      const label=options.direction==='inward'?'Test · '+options.concentration+'% inside / water outside':'Test · water inside / '+options.concentration+'% outside';
      const appliedSetup=options.setup==='flooded'&&(!started||minutes===0)?'intact':options.setup;
      $('.poto-apparatus').innerHTML=cup(label,r.testLevel,appliedSetup==='flooded'?26:5,appliedSetup)+cup('Control · water only',r.controlLevel,5,'intact');
      $('.poto-inference').textContent=started?r.reason:'Inspect both cups before starting. A liquid level is not enough to identify the mechanism.';
      $('[data-poto=advance]').disabled=!started||minutes===60;
      fields.disabled=!started;
    }
    function notebook(){
      const records=load();$('[data-poto-count]').textContent='('+records.length+')';
      $('.poto-empty').hidden=records.length>0;
      $('tbody').innerHTML=records.map(r=>`<tr><td>${r.concentration}% ${r.direction==='outward'?'outside':'inside'} · ${condition(r.setup)}</td><td>${r.repeat}</td><td>${r.timeMinutes}</td><td>${fixed(r.testLevel)}</td><td>${fixed(r.controlLevel)}</td><td>${fixed(r.testLevel-r.controlLevel)}</td><td>${r.timeMinutes===0?'Starting reference':r.setup==='intact'?'Controlled comparison':'Confounded: not osmosis-only'}</td></tr>`).join('');
      $('[data-poto=export]').disabled=!records.length;
    }
    controls.forEach(select=>select.onchange=()=>{options={concentration:Number($('#poto-concentration').value),setup:$('#poto-setup').value,repeat:Number($('#poto-repeat').value),direction:$('#poto-direction').value};update();});
    $('[data-poto=start]').onclick=()=>{started=true;minutes=0;controls.forEach(s=>s.disabled=true);$('[data-poto=start]').disabled=true;$('[data-poto=new]').disabled=false;$('.poto-run-note').textContent='Record the starting levels, then advance in equal time steps. Settings stay fixed within a run.';feedback.textContent='';update();};
    $('[data-poto=advance]').onclick=()=>{minutes=Math.min(60,minutes+10);$('.poto-record').reset();feedback.textContent='';update();};
    $('[data-poto=new]').onclick=()=>{started=false;minutes=0;controls.forEach(s=>s.disabled=false);$('[data-poto=start]').disabled=false;$('[data-poto=new]').disabled=true;$('.poto-record').reset();feedback.textContent='New setup ready. Your notebook is unchanged.';$('.poto-run-note').textContent='Choose a new comparison. This does not erase saved observations.';update();$('#poto-concentration').focus();};
    $('.poto-record').onsubmit=event=>{
      event.preventDefault();if(!started)return;
      const form=new root.FormData(event.currentTarget),testLevel=Number(form.get('testLevel')),controlLevel=Number(form.get('controlLevel')),netChange=Number(form.get('netChange')),r=M.compare(options,minutes);
      if([testLevel,controlLevel,netChange].some(n=>!Number.isFinite(n)))return;
      if(Math.abs(testLevel-Number(fixed(r.testLevel)))>.051||Math.abs(controlLevel-Number(fixed(r.controlLevel)))>.051){feedback.textContent='Recheck the readouts: record levels in millimetres above the cavity floor, not the bath height or the amount of change.';return;}
      if(Math.abs(netChange-(testLevel-controlLevel))>.051){feedback.textContent='Subtract both starting levels: (test − 8.0) − (control − 8.0). Here that equals test − control. Keep the sign.';return;}
      const record=M.validRecord({...options,timeMinutes:minutes,testLevel,controlLevel});if(!record){feedback.textContent='This observation is outside the supported model range.';return;}
      const rows=load().filter(x=>!(x.concentration===record.concentration&&x.direction===record.direction&&x.setup===record.setup&&x.repeat===record.repeat&&x.timeMinutes===record.timeMinutes));rows.push(record);
      const saved=persist(rows.slice(-90));feedback.textContent='Reading and subtraction checked. '+(minutes===0?'Starting reference saved. Now advance and compare.':r.validInference?'Retain the control when interpreting the pattern.':'Saved as a confounded observation; it does not demonstrate osmosis alone.');
      $('.poto-storage').textContent=saved?'Saved only in this browser. Preparation and lesson notes are unchanged.':'Storage unavailable: retained for this session only. Download your observations before closing.';notebook();
    };
    $('[data-poto=export]').onclick=()=>{const text=M.csv(load()),url=root.URL.createObjectURL(new root.Blob([text],{type:'text/csv;charset=utf-8'})),a=root.document.createElement('a');a.href=url;a.download='potato-osmometer-simulated.csv';a.click();root.setTimeout(()=>root.URL.revokeObjectURL(url),1000);$('.poto-storage').textContent='Downloaded simulated observations, not a completed school practical record.';};
    $('.poto-reason form').onsubmit=event=>{event.preventDefault();const answer=new root.FormData(event.currentTarget).get('reason');event.currentTarget.querySelector('[role=status]').textContent=answer==='0'?'Supported, with limits: water moves down a water-potential gradient across selectively permeable membranes. The tissue, control and intact apparatus matter; sucrose is not a pump.':'Reconsider: a puncture or flooded rim lets liquid bypass tissue. Compare intact matched cups before attributing a rise to osmosis; sucrose does not actively pump water.';};
    update();notebook();
  }
  root.BioPotatoOsmosis={mount,load,persist,KEY};
})(typeof window==='undefined'?globalThis:window);
