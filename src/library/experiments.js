/* Biology Entelloq — reusable, inspectable school models. No clinical predictions.
 * Mechanisms: OpenStax Biology 2e §§5.2, 7.4, 8.2, 10.3, 12.3;
 * standard genetic code: https://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi
 * diffusion: https://www.ncbi.nlm.nih.gov/books/NBK54112/
 * cardiac output: https://www.ncbi.nlm.nih.gov/books/NBK470455/
 * Numerical constants below are teaching assumptions, not empirical fits.
 */
(function () {
  'use strict';
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const round = (n, p = 2) => Number(n.toFixed(p));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const M = window.BIO_MODELS = window.BIO_MODELS || {};
  M.osmosis = (volume, external, plant) => {
    const internal = 300 / Math.max(0.2, volume);
    const pressure = plant ? Math.max(0, volume - 1) * 2.5 : 0;
    return { internal, pressure, flow: 0.035 * (0.002478 * (internal - external) - pressure) };
  };
  M.photosynthesis = v => {
    const light = v.light / (v.light + 180), carbon = v.co2 / (v.co2 + 220);
    const thermal = Math.exp(-Math.pow((v.temp - 27) / 13, 2));
    const color = ({white:1,red:0.95,blue:0.9,green:0.35})[v.color] || 1;
    const gross = 30 * light * carbon * thermal * color;
    const respiration = 0.8 * Math.pow(2, (v.temp - 25) / 10);
    return {gross, respiration, net:gross - respiration};
  };
  M.respiration = v => {
    const glucose = 1.8 * v.glucose / (v.glucose + 3) * Math.exp(-Math.pow((v.temp - 35) / 18, 2));
    const aerobic = v.oxygen / (v.oxygen + 2);
    return {glucose, oxygen:glucose * aerobic * 6,
      co2:glucose * (6 * aerobic + (v.organism === 'yeast' ? 2 * (1 - aerobic) : 0)),
      atp:glucose * (30 * aerobic + 2 * (1 - aerobic)),
      fermentation:glucose * (1 - aerobic), aerobic};
  };
  M.heart = v => {
    const output = v.hr * v.sv / 1000;
    const resistance = v.resistance / Math.pow(v.diameter / 100, 4);
    return {output, resistance, pressure:output * resistance + 5};
  };
  M.gasExchange = v => {
    const ventilation = v.breaths * Math.max(0, v.tidal - 0.15);
    const diffusion = 250 * (v.area / 70) * (0.5 / v.thickness) * (v.gradient / 60);
    const supply = ventilation * 60;
    const uptake = Math.min(diffusion, supply);
    return {ventilation, diffusion, uptake, co2:uptake * 0.8};
  };
  M.gametes = genotype => {
    if (genotype.startsWith('X')) return genotype.match(/X[Aa]|Y/g);
    let out = [''];
    for (let i = 0; i < genotype.length; i += 2) out = out.flatMap(g => [g + genotype[i], g + genotype[i + 1]]);
    return out;
  };
  M.zygote = (a,b) => {
    if(a.startsWith('X')||b.startsWith('X'))return[a,b].sort().join('');
    let child='';for(let i=0;i<a.length;i++)child+=[a[i],b[i]].sort().join('');return child;
  };
  M.cross = (a, b) => {
    const ag = M.gametes(a), bg = M.gametes(b), counts = {};
    ag.forEach(x => bg.forEach(y => {
      const child = M.zygote(x,y);
      counts[child] = (counts[child] || 0) + 1 / (ag.length * bg.length);
    }));
    return counts;
  };
  const aaNames = {F:'Phe',L:'Leu',S:'Ser',Y:'Tyr','*':'Stop',C:'Cys',W:'Trp',P:'Pro',H:'His',Q:'Gln',R:'Arg',I:'Ile',M:'Met',T:'Thr',N:'Asn',K:'Lys',V:'Val',A:'Ala',D:'Asp',E:'Glu',G:'Gly'};
  const code = {}, bases = 'UCAG', amino = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
  let codeIndex = 0;
  for (const a of bases) for (const b of bases) for (const c of bases) code[a+b+c] = aaNames[amino[codeIndex++]];
  M.codons = code;
  M.translate = dna => {
    const rna = dna.toUpperCase().replace(/T/g, 'U');
    const peptide = [], codons = [];
    for (let i = 0; i + 2 < rna.length; i += 3) {
      const c = rna.slice(i, i + 3), aa = code[c] || '?';
      codons.push({codon:c, amino:aa});
      if (aa === 'Stop') break;
      peptide.push(aa);
    }
    return {rna, peptide, codons, started:rna.startsWith('AUG'), trailing:rna.length % 3};
  };
  M.mutation = (original, changed) => {
    if (original === changed) return 'Unchanged';
    if ((changed.length - original.length) % 3 !== 0) return 'Frameshift';
    const a = M.translate(original), b = M.translate(changed);
    if (!b.started) return 'Start codon changed';
    if (b.peptide.length < a.peptide.length && b.codons.at(-1)?.amino === 'Stop') return 'Nonsense / earlier stop';
    if (a.peptide.join() === b.peptide.join()) return 'Silent';
    if (changed.length !== original.length) return 'In-frame insertion / deletion';
    if (a.codons.at(-1)?.amino === 'Stop' && b.codons.at(-1)?.amino !== 'Stop') return 'Stop-loss';
    return 'Missense';
  };
  M.mitosisCanAdvance = (stage, spindle, checkpoint) => stage !== 2 || spindle === 100 || !checkpoint;
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function color(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#67bd9c'; }
  const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 3v7L4 19q-1 2 2 2h12q3 0 2-2l-5-9V3M8 3h8M7 15h10"/></svg>';
  function text(ctx, str, x, y, size = 15, col = '--ink') { size=Math.max(size,Math.min(24,6400/Math.max(240,ctx.canvas.clientWidth)));ctx.fillStyle = color(col); ctx.font = `500 ${size}px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(str, x, y); }
  function circle(ctx,x,y,r,fill,stroke) { ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();} }
  function line(ctx,x,y,a,b,col='--em',width=3) {ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(a,b);ctx.strokeStyle=color(col);ctx.lineWidth=width;ctx.stroke();}
  function arrow(ctx,x,y,a,b,col='--cy') {line(ctx,x,y,a,b,col,3); const ang=Math.atan2(b-y,a-x); line(ctx,a,b,a-11*Math.cos(ang-.5),b-11*Math.sin(ang-.5),col,3);line(ctx,a,b,a-11*Math.cos(ang+.5),b-11*Math.sin(ang+.5),col,3);}
  function range(key,label,min,max,value,step=1) { return {key,label,min,max,value,step}; }
  function select(key,label,value,options) { return {key,label,value,options}; }
  function register(spec) {
    LABS.register(spec.id, {title:spec.title,tag:spec.tag,category:spec.tag,blurb:spec.blurb,color:'var(--em)',icon,
      relatedTopics:spec.topics,difficulty:'school',duration:'10–20 min',
      build(host) { return build(host,spec); }
    });
  }
  function build(host,spec) {
    const wrap=el('div','bx ex-bench'), view=el('div','bx-view ex-view'), side=el('div','bx-side ex-side');
    wrap.append(view,side); host.append(wrap);
    const canvas=el('canvas','ex-canvas'); canvas.width=1280;canvas.height=780;
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label',spec.title+' interactive diagram; live values are listed beside it.');view.append(canvas);
    const ctx=canvas.getContext('2d');ctx.scale(2,2);
    const status=el('p','ex-status');status.setAttribute('aria-live','polite');view.append(status);
    const extra=el('div','ex-extra');view.append(extra);
    const b={v:{},s:spec.state?spec.state():{},time:0,history:[],actions:[],running:false,extra,side,view,host,controls:{},ctx};
    const readings=el('dl','ex-readings');
    function action(s) {b.actions.push(s);if(b.actions.length>30)b.actions.shift();}
    b.action=action;
    (spec.vars||[]).forEach(d=>{
      b.v[d.key]=d.value;
      const label=el('label','bx-grp ex-control'), cap=el('span','ex-label',d.label), out=el('output','bx-val');label.append(cap);
      let input;
      if(d.options){input=el('select','ex-select');d.options.forEach(o=>{const n=el('option','',typeof o==='string'?o:o[1]);n.value=typeof o==='string'?o:o[0];input.append(n);});input.value=d.value;label.append(input);}
      else {const row=el('span','bx-row');input=el('input','bx-slider');input.type='range';input.min=d.min;input.max=d.max;input.step=d.step;input.value=d.value;out.textContent=d.value;row.append(input,out);label.append(row);}
      input.setAttribute('aria-label',d.label);b.controls[d.key]=input;
      input.addEventListener(d.options?'change':'input',()=>{b.v[d.key]=d.options?input.value:+input.value;out.textContent=input.value;action(`${d.label}: ${input.value}`);if(spec.change)spec.change(b,d.key);b.render();});side.append(label);
    });
    b.button=(label,fn,parent=b.controlsHost||side)=>{const button=el('button','bx-btn',label);button.type='button';button.addEventListener('click',()=>{action(label);fn();b.render();});parent.append(button);return button;};
    const row=el('div','bx-chips');side.append(row);
    let runButton, stepButton;
    if(spec.step){
      runButton=b.button('Run observation',()=>{b.running=!b.running;},row);
      stepButton=b.button('Advance 10 s',()=>{b.running=false;for(let i=0;i<20;i++)advance(.5);},row);
      side.append(el('p','ex-clock','Model clock · nominal 5× speed · 300 s per trial'));
    }
    b.reset=()=>{b.s=spec.state?spec.state():{};b.time=0;b.history=[];b.running=false;if(spec.reset)spec.reset(b);};
    b.button(spec.resetLabel||'Reset experiment',b.reset,row);
    b.controlsHost=el('div','ex-actions');side.append(b.controlsHost);
    side.append(readings);
    const note=el('p','bx-note ex-assumption',spec.assumption);side.append(note);
    if(spec.source){const a=el('a','ex-source','Model reference ↗');a.href=spec.source;a.target='_blank';a.rel='noopener';side.append(a);}
    const graph=el('div','ex-graph');view.append(graph);
    b.measure=()=>spec.measure(b);
    b.render=()=>{
      const measures=b.measure();
      readings.replaceChildren(...Object.entries(measures).flatMap(([k,v])=>[el('dt','',k),el('dd','',typeof v==='number'?String(round(v)):v)]));
      status.textContent=(spec.story?spec.story(b):'')+(spec.step&&b.time>=300?' Observation complete at 300 s. Reset the experiment for a fresh trial.':'');
      if(runButton){runButton.textContent=b.running?'Pause observation':'Run observation';runButton.disabled=b.time>=300;stepButton.disabled=b.time>=300;}
      ctx.clearRect(0,0,640,390);spec.draw(b,ctx);
      if(spec.detail)spec.detail(b);
      if(spec.chart && b.history.length){
        const key=spec.chart, values=b.history.map(h=>h.y), min=Math.min(0,...values), max=Math.max(1,...values), span=max-min;
        const path=b.history.map((p,i)=>`${i?'L':'M'}${45+(p.x/Math.max(10,b.time))*550},${142-(p.y-min)/span*110}`).join(' ');
        graph.innerHTML=`<svg viewBox="0 0 640 180" role="img" aria-label="${esc(key)} plotted against elapsed seconds"><path class="ex-axis" d="M45 22V142H610"/><path class="ex-trace" d="${path}"/><text x="45" y="15">${esc(key)}</text><text x="45" y="160">0 s</text><text x="557" y="160">${round(b.time)} s</text><text x="4" y="32">${round(max,1)}</text><text x="4" y="142">${round(min,1)}</text></svg>`;
      } else graph.replaceChildren();
    };
    function advance(dt){if(b.time>=300){b.running=false;return;}dt=Math.min(dt,300-b.time);spec.step(b,dt);b.time+=dt;const m=b.measure();if(spec.chart){b.history.push({x:b.time,y:Number(m[spec.chart])||0});if(b.history.length>600)b.history.shift();}if(b.time>=300)b.running=false;}
    if(spec.controls)spec.controls(b);
    b.render();
    const resizeObserver=new ResizeObserver(()=>b.render());resizeObserver.observe(canvas);
    // Observation time is independent of screen refresh rate. No animation runs
    // until the student asks; the manual step is available with reduced motion.
    const timer=spec.step?setInterval(()=>{if(!b.running||document.hidden||(window.frameElement&&!window.frameElement.getClientRects().length))return;advance(.5);b.render();},100):null;
    return {dispose(){if(timer)clearInterval(timer);resizeObserver.disconnect();b.running=false;},snapshot(){return {
      variables:Object.fromEntries((spec.vars||[]).map(d=>[d.label,b.v[d.key]])),
      measurements:b.measure(),stage:spec.story?spec.story(b):'Observing',actions:b.actions.slice()
    };}};
  }

  register({id:'osmosis',title:'Osmosis Lab',tag:'Cell Biology',topics:['cell-membrane','osmosis'],
    blurb:'Place a cell in a new solution. Follow water movement, measure the changing volume and discover what a cell wall changes.',
    vars:[select('type','Cell type','plant',[['plant','Plant cell'],['animal','Animal cell']]),range('external','External nonpenetrating solute (mOsm/L)',0,600,150,10)],
    state:()=>({volume:1,lysed:false}),change(b,k){if(k==='type')b.reset();},
    step(b,dt){if(b.s.lysed)return;const m=M.osmosis(b.s.volume,b.v.external,b.v.type==='plant');b.s.volume=clamp(b.s.volume+m.flow*dt,.2,1.7);if(b.s.volume>=1.7)b.s.lysed=true;},
    measure(b){const m=M.osmosis(b.s.volume,b.v.external,b.v.type==='plant');return {'Cell volume (% initial)':round(b.s.volume*100),'Internal solute (mOsm/L)':round(m.internal),'Wall pressure (MPa)':round(m.pressure,3),'Net water flow (% volume/s)':b.s.lysed?0:round(m.flow*100,3),'Elapsed time (s)':b.time};},
    story(b){if(b.s.lysed)return 'Lysis: this animal cell exceeded the model membrane limit. Reset to test another solution.';const m=M.osmosis(b.s.volume,b.v.external,b.v.type==='plant');const tonic=b.v.external<300?'Initially hypotonic':b.v.external>300?'Initially hypertonic':'Initially isotonic';return `${tonic}. ${Math.abs(m.flow)<.0003?'Near water-potential equilibrium':m.flow>0?'Net water movement into the cell':'Net water movement out of the cell'}. ${b.v.type==='plant'?(b.s.volume>1.02?'The wall is under turgor pressure.':b.s.volume<.9?'The membrane pulls away from the wall: plasmolysis.':'The cell is flaccid.'):'Watch the cell volume as water crosses the membrane.'}`;},
    chart:'Cell volume (% initial)',
    assumption:'Teaching model at 25 °C: water crosses; solute does not. The cell starts at 300 mOsm/L, solute amount is conserved and the bath is effectively infinite. Wall stiffness and the animal-cell lysis threshold are illustrative; the diagram is not to scale.',
    source:'https://openstax.org/books/biology-2e/pages/5-2-passive-transport',
    draw(b,c){const plant=b.v.type==='plant',v=b.s.volume,r=85*Math.cbrt(v);text(c,'EXTERNAL SOLUTION',320,32,12,'--dim');text(c,b.v.external+' mOsm/L',320,58,22);if(plant){c.strokeStyle=color('--em');c.lineWidth=9;c.strokeRect(195,91,250,245);const gap=6+Math.max(0,1.02-v)*90;c.fillStyle=color('--bg-2');c.fillRect(195+gap,91+gap,250-gap*2,245-gap*2);c.strokeStyle=color('--cy');c.lineWidth=2;c.strokeRect(195+gap,91+gap,250-gap*2,245-gap*2);}else circle(c,320,207,r,color('--bg-2'),color('--cy'));if(!b.s.lysed){circle(c,304,201,20,color('--indigo'));for(let i=0;i<22;i++){const a=i*2.4,rr=Math.sqrt((i+.5)/22)*(r-12);circle(c,320+Math.cos(a)*rr,207+Math.sin(a)*rr,3,color('--amber'));}}for(let i=0;i<Math.round(b.v.external/15);i++){const x=35+(i*89)%560,y=91+(i*61)%250;if(x<182||x>458)circle(c,x,y,3,color('--amber'));}const flow=M.osmosis(v,b.v.external,plant).flow;if(!b.s.lysed&&Math.abs(flow)>.0003){for(const sign of [-1,1]){const inner=320+sign*(plant?119:r+8),outer=320+sign*173;if(flow>0)arrow(c,outer,207,inner,207);else arrow(c,inner,207,outer,207);}}text(c,b.s.lysed?'MEMBRANE RUPTURED':`${round(v*100,1)}% of initial volume`,320,365,18);}
  });
  register({id:'photosynthesis-rate',title:'Photosynthesis Rate Lab',tag:'Plant Biology',topics:['photosynthesis'],
    blurb:'Build a light-response curve, change carbon dioxide and test whether a brighter lamp always means more oxygen.',
    vars:[range('light','Light (µmol photons/m²/s)',0,1500,500,25),range('co2','Carbon dioxide (ppm)',0,1200,400,20),range('temp','Temperature (°C)',0,50,25),select('color','Lamp spectrum','white',[['white','White'],['red','Red'],['blue','Blue'],['green','Green']])],
    state:()=>({oxygen:0}),step(b,dt){b.s.oxygen+=M.photosynthesis(b.v).net*dt/60;},
    measure(b){const m=M.photosynthesis(b.v);return {'Gross O₂ production (µmol/min)':round(m.gross),'Net O₂ exchange (µmol/min)':round(m.net),'Respiratory O₂ use (µmol/min)':round(m.respiration),'Cumulative net O₂ (µmol)':round(b.s.oxygen),'Elapsed time (s)':b.time};},
    chart:'Net O₂ exchange (µmol/min)',
    story(b){const m=M.photosynthesis(b.v);return m.net<=0?'Respiration exceeds photosynthesis: net oxygen is being consumed. Increase one factor and compare.':'Oxygen accumulates. Keep three variables fixed while you test the fourth; a plateau signals diminishing response.';},
    assumption:'A fictional fixed leaf sample with saturating light and CO₂ responses, an illustrative 27 °C optimum and ongoing respiration. Spectrum multipliers are qualitative. Rates are model outputs, not measurements of a particular plant; green light still supports photosynthesis.',
    source:'https://openstax.org/books/biology-2e/pages/8-2-the-light-dependent-reactions-of-photosynthesis',
    draw(b,c){c.strokeStyle=color('--cy');c.lineWidth=3;c.strokeRect(150,82,340,252);c.globalAlpha=.12;c.fillStyle=color('--cy');c.fillRect(151,113,338,220);c.globalAlpha=1;line(c,318,306,318,161,'--em',7);for(let i=0;i<5;i++){c.fillStyle=color('--em');c.beginPath();c.ellipse(318+(i%2?1:-1)*31,275-i*24,43,15,i%2?-.5:.5,0,Math.PI*2);c.fill();}circle(c,94,61,24,color('--amber'));for(let i=0;i<4;i++){c.globalAlpha=clamp(b.v.light/1500,.12,1);arrow(c,116,67+i*6,223+i*30,145,'--amber');c.globalAlpha=1;}const m=M.photosynthesis(b.v);for(let i=0;i<Math.floor(Math.max(0,m.net));i++)circle(c,300+Math.sin(i*2)*35,145-((i*19+b.time*12)%83),3.5,null,color('--cy'));text(c,'Fixed leaf sample · gas-exchange chamber',320,364,15);text(c,`${round(m.net)} µmol O₂/min net`,320,45,20);}
  });
  register({id:'cellular-respiration',title:'Cellular Respiration Lab',tag:'Biochemistry',topics:['cellular-respiration'],
    blurb:'Control oxygen, fuel and temperature. Compare the gas exchange and energy yield of aerobic metabolism and fermentation.',
    vars:[select('organism','Fictional cell system','yeast',[['yeast','Yeast-like cells'],['muscle','Muscle-like cells']]),range('temp','Temperature (°C)',0,60,35),range('glucose','Glucose availability (mM)',0,20,8,.5),range('oxygen','Dissolved oxygen availability (relative units)',0,20,10,.5)],
    state:()=>({atp:0,co2:0}),step(b,dt){const m=M.respiration(b.v);b.s.atp+=m.atp*dt/60;b.s.co2+=m.co2*dt/60;},
    measure(b){const m=M.respiration(b.v);return {'O₂ consumption (µmol/min)':round(m.oxygen),'CO₂ production (µmol/min)':round(m.co2),'ATP output proxy (µmol/min)':round(m.atp),'Fermentative share (%)':round((1-m.aerobic)*100),'Accumulated ATP proxy (µmol)':round(b.s.atp),'Elapsed time (s)':b.time};},
    chart:'ATP output proxy (µmol/min)',
    story(b){const m=M.respiration(b.v);return b.v.glucose===0?'No fuel: neither pathway can produce ATP in this model.':`${round(m.aerobic*100)}% of glucose follows the aerobic pathway. Fermentation regenerates NAD⁺ and produces ${b.v.organism==='yeast'?'ethanol + CO₂':'lactate, with no fermentative CO₂'}.`;},
    assumption:'Fixed cell biomass and steady external fuel/oxygen. Illustrative aerobic yield: 30 ATP per glucose; fermentation: 2. Actual aerobic yields vary. Fermentation is modeled separately from anaerobic respiration using other electron acceptors. ATP is an energy-output proxy; rates are synthetic.',
    source:'https://openstax.org/books/biology-2e/pages/7-4-oxidative-phosphorylation',
    draw(b,c){const m=M.respiration(b.v);text(c,'GLUCOSE',320,40,18,'--amber');arrow(c,320,53,320,98,'--amber');c.strokeStyle=color('--hair');c.lineWidth=2;c.strokeRect(233,106,174,53);text(c,'Glycolysis · 2 ATP',320,137,16);arrow(c,266,164,175,216);arrow(c,375,164,467,216,'--indigo');circle(c,163,262,68,null,color('--em'));circle(c,478,262,68,null,color('--indigo'));text(c,'Aerobic',163,251,17);text(c,round(m.aerobic*100)+'%',163,278,25,'--em');text(c,'Fermentation',478,251,14);text(c,round((1-m.aerobic)*100)+'%',478,278,25,'--indigo');text(c,'CO₂ + H₂O · more ATP',163,362,13);text(c,b.v.organism==='yeast'?'Ethanol + CO₂':'Lactate',478,362,13);}
  });
  register({id:'heart-physiology',title:'Heart Physiology Lab',tag:'Human Physiology',topics:['heart-circulation','cardiovascular-system'],
    blurb:'Change the pump and the vessels. Relate heart rate, stroke volume and resistance to the pressure needed to sustain flow.',
    vars:[range('hr','Heart rate (beats/min)',40,180,72),range('sv','Stroke volume (mL/beat)',30,120,70),range('resistance','Baseline resistance (mmHg·min/L)',8,24,17,.5),range('diameter','Vessel diameter (% reference)',75,125,100)],
    state:()=>({beats:0}),step(b,dt){b.s.beats+=b.v.hr*dt/60;},
    measure(b){const m=M.heart(b.v);return {'Cardiac output (L/min)':round(m.output),'Effective resistance (mmHg·min/L)':round(m.resistance),'Required mean pressure (mmHg)':round(m.pressure),'Elapsed heartbeats':round(b.s.beats,1),'Elapsed time (s)':b.time};},
    chart:'Cardiac output (L/min)',story(b){const m=M.heart(b.v);return `CO = ${b.v.hr} × ${b.v.sv} ÷ 1000 = ${round(m.output)} L/min. ${m.pressure>180?'The ideal pump would require very high pressure; a living heart cannot necessarily maintain this output.':'Change vessel diameter and compare how resistance changes.'}`;},
    assumption:'Ideal fixed-output pump: CO = HR × SV. Relative resistance follows diameter⁻⁴ at fixed viscosity and length; required mean pressure = flow × resistance + 5 mmHg. Real vessels and hearts adapt. The beat is schematic and these are not clinical predictions.',
    source:'https://www.ncbi.nlm.nih.gov/books/NBK470455/',
    draw(b,c){const m=M.heart(b.v),pulse=1+.035*Math.sin(b.s.beats*Math.PI*2);c.save();c.translate(225,202);c.scale(pulse,pulse);c.beginPath();c.moveTo(0,100);c.bezierCurveTo(-170,-10,-75,-130,0,-57);c.bezierCurveTo(75,-130,170,-10,0,100);c.fillStyle=color('--rose');c.globalAlpha=.22;c.fill();c.globalAlpha=1;c.strokeStyle=color('--rose');c.lineWidth=4;c.stroke();c.restore();text(c,b.v.hr+' bpm',225,195,23);text(c,b.v.sv+' mL/beat',225,225,16);const w=25*b.v.diameter/100;line(c,348,140-w,540,140-w,'--rose',4);line(c,348,140+w,540,140+w,'--rose',4);arrow(c,382,140,505,140,'--rose');line(c,348,268-w,540,268-w,'--cy',4);line(c,348,268+w,540,268+w,'--cy',4);arrow(c,505,268,382,268,'--cy');text(c,'Arterial flow',446,90,16);text(c,'Venous return',446,326,16);text(c,round(m.output)+' L/min',320,371,25,'--em');}
  });
  register({id:'gas-exchange',title:'Lung Gas Exchange Lab',tag:'Human Physiology',topics:['gas-exchange','respiratory-system'],
    blurb:'Give an alveolus more area, a thicker barrier or a steeper oxygen gradient. Find whether ventilation or diffusion limits oxygen uptake.',
    vars:[range('breaths','Breathing rate (breaths/min)',4,40,12),range('tidal','Tidal volume (L/breath)',.2,1.2,.5,.05),range('area','Exchange area (m²)',10,100,70),range('thickness','Barrier thickness (µm)',.25,3,.5,.05),range('gradient','O₂ partial-pressure difference (mmHg)',0,100,60)],
    state:()=>({uptake:0}),step(b,dt){b.s.uptake+=M.gasExchange(b.v).uptake*dt/60;},
    measure(b){const m=M.gasExchange(b.v);return {'Alveolar ventilation (L/min)':round(m.ventilation),'Diffusion capacity proxy (mL O₂/min)':round(m.diffusion),'O₂ uptake proxy (mL/min)':round(m.uptake),'CO₂ output proxy (mL/min)':round(m.co2),'Cumulative O₂ proxy (mL)':round(b.s.uptake),'Elapsed time (s)':b.time};},
    chart:'O₂ uptake proxy (mL/min)',story(b){const m=M.gasExchange(b.v);return m.diffusion<m.ventilation*60?'Diffusion limits this model: test area, gradient or thickness while holding breathing constant.':'Ventilation limits this model: increasing exchange area alone will not increase the oxygen-uptake proxy.';},
    assumption:'Fick relationship: diffusion ∝ area × pressure difference / thickness. Alveolar ventilation subtracts a fixed 0.15 L dead space. Illustrative uptake is capped by ventilation; CO₂ proxy uses a fixed respiratory quotient of 0.8. Perfusion, hemoglobin and feedback are omitted.',
    source:'https://www.ncbi.nlm.nih.gov/books/NBK54112/',
    draw(b,c){const r=80*Math.sqrt(b.v.area/70),th=5+b.v.thickness*8;circle(c,243,190,r,null,color('--cy'));circle(c,243,190,r+th,null,color('--hair'));c.strokeStyle=color('--rose');c.lineWidth=14;c.beginPath();c.arc(243,190,r+th+27,-.75,2.5);c.stroke();text(c,'ALVEOLUS',243,179,16);text(c,'air',243,204,15,'--cy');arrow(c,243+r-20,192,243+r+th+45,192,'--cy');text(c,'O₂',243+r+th+63,181,15,'--cy');arrow(c,243+r+th+36,242,243+r-27,242,'--rose');text(c,'CO₂',243+r+th+61,264,15,'--rose');text(c,'Blood capillary',430,325,16,'--rose');text(c,`${round(M.gasExchange(b.v).uptake)} mL O₂/min`,320,365,23);}
  });
  register({id:'mitosis',title:'Mitosis & the Spindle Checkpoint',tag:'Cell Biology',topics:['mitosis','cell-cycle'],
    blurb:'Prepare a replicated cell, build its spindle and test the checkpoint. Can both daughter cells receive the same chromosomes?',
    vars:[range('spindle','Correct bipolar spindle attachments (%)',0,100,100,25),select('checkpoint','Spindle checkpoint','on',[['on','Active'],['off','Disabled (investigate errors)']])],
    state:()=>({stage:0,error:false,blocked:false}),
    measure(b){return {'Stage number':b.s.stage,'Replicated chromosomes before separation':4,'Correct bipolar attachments (%)':b.v.spindle,'Daughter A chromosomes':b.s.stage===5?(b.s.error?5:4):'Not separated','Daughter B chromosomes':b.s.stage===5?(b.s.error?3:4):'Not separated'};},
    story(b){const stages=['G₂: DNA has already replicated. Four duplicated chromosomes contain eight chromatids.','Prophase / prometaphase: chromosomes condense and the spindle gains access.','Metaphase: test bipolar attachment before separating sister chromatids.','Anaphase: sister chromatids have separated; each is now a chromosome.','Telophase: two nuclear envelopes form.','Cytokinesis: the cytoplasm divides.'];return b.s.blocked?'Checkpoint arrest: incomplete bipolar attachments. Repair the spindle before trying again.':stages[b.s.stage]+(b.s.error?' An attachment error was allowed through the checkpoint.':'');},
    assumption:'A diploid fictional cell with 2n = 4; chromosome number is counted by centromeres. DNA replication precedes mitosis. Missing attachment can trigger arrest. Disabling the checkpoint illustrates one possible unequal segregation (5:3), not a prediction of every spindle error.',
    source:'https://openstax.org/books/biology-2e/pages/10-3-control-of-the-cell-cycle',
    controls(b){b.button('Advance cell-cycle stage',()=>{if(b.s.stage===5)return;if(!M.mitosisCanAdvance(b.s.stage,b.v.spindle,b.v.checkpoint==='on')){b.s.blocked=true;return;}b.s.blocked=false;if(b.s.stage===2&&b.v.spindle<100)b.s.error=true;b.s.stage++;});b.button('Repair all attachments',()=>{b.v.spindle=100;b.controls.spindle.value=100;b.controls.spindle.closest('label').querySelector('output').textContent='100';b.s.blocked=false;});},
    draw(b,c){const stage=b.s.stage;const labels=['G₂','Prophase','Metaphase','Anaphase','Telophase','Cytokinesis'];for(let i=0;i<6;i++){circle(c,80+i*96,36,7,color(i===stage?'--em':'--hair'));text(c,labels[i],80+i*96,62,10,i===stage?'--ink':'--dim');}if(stage===5){circle(c,195,226,96,null,color('--em'));circle(c,445,226,96,null,color('--cy'));for(let j=0;j<2;j++){const n=b.s.error?(j===0?5:3):4;for(let i=0;i<n;i++)line(c,170+j*250+i*15,203,177+j*250+i*15,244,i%2?'--indigo':'--amber',5);}text(c,b.s.error?'Unequal sets: investigate the checkpoint':'Two matching chromosome sets',320,366,19);return;}c.strokeStyle=color('--hair');c.lineWidth=3;c.beginPath();c.ellipse(320,227,230,128,0,0,Math.PI*2);c.stroke();if(stage<2)circle(c,320,224,83,null,color('--indigo'));const separated=stage>=3;for(let i=0;i<4;i++){const y=151+i*46;const col=i%2?'--indigo':'--amber';if(separated){line(c,203,y-12,214,y,col,5);line(c,214,y,203,y+12,col,5);line(c,437,y-12,426,y,col,5);line(c,426,y,437,y+12,col,5);}else {const x=stage===2?320:280+(i%2)*80;line(c,x-11,y-12,x+11,y+12,col,5);line(c,x+11,y-12,x-11,y+12,col,5);if(stage===2){line(c,122,227,x,y,'--em',1);if(i<Math.round(b.v.spindle/25))line(c,518,227,x,y,'--cy',1);}}}if(stage>=1){circle(c,122,227,7,color('--em'));circle(c,518,227,7,color('--cy'));}if(stage===4){circle(c,208,224,81,null,color('--indigo'));circle(c,432,224,81,null,color('--indigo'));}text(c,b.s.blocked?'CHECKPOINT: WAIT':'2n = 4 · track the centromeres',320,377,16,b.s.blocked?'--rose':'--dim');}
  });
  register({id:'mendelian-genetics',title:'Inheritance & Virtual Breeding',tag:'Genetics',topics:['mendelian-genetics','inheritance'],
    blurb:'Choose two fictional parents, predict their offspring and breed a sample. Compare exact probabilities with what chance actually produces.',
    vars:[select('mode','Inheritance model','complete',[['complete','Complete dominance'],['incomplete','Incomplete dominance'],['codominant','Codominance'],['dihybrid','Dihybrid · independent loci'],['sexlinked','X-linked recessive']]),select('parentA','Parent 1 genotype','Aa',['AA','Aa','aa']),select('parentB','Parent 2 genotype','Aa',['AA','Aa','aa']),range('sample','Offspring per breeding trial',4,200,40,4)],
    state:()=>({offspring:{},total:0,seed:12345,generation:1}),
    change(b,k){if(k==='mode'){for(const key of ['parentA','parentB']){const gen=b.v.mode==='sexlinked'?(key==='parentA'?['XAXA','XAXa','XaXa']:['XAY','XaY']):b.v.mode==='dihybrid'?['AABB','AABb','AAbb','AaBB','AaBb','Aabb','aaBB','aaBb','aabb']:['AA','Aa','aa'];const s=b.controls[key];s.replaceChildren(...gen.map(g=>{const o=el('option','',g);o.value=g;return o;}));b.v[key]=b.v.mode==='sexlinked'?(key==='parentA'?'XAXa':'XAY'):b.v.mode==='dihybrid'?'AaBb':'Aa';s.value=b.v[key];}}if(k!=='sample'){b.s.offspring={};b.s.total=0;}},
    measure(b){const probabilities=M.cross(b.v.parentA,b.v.parentB),m={'Offspring generated':b.s.total,'Breeding generation':b.s.generation};Object.entries(probabilities).forEach(([g,p])=>{m[g+' expected (%)']=round(p*100);m[g+' observed count']=b.s.offspring[g]||0;});return m;},
    story(b){return b.s.total?'Compare expected probabilities with observed counts. An individual offspring has no obligation to complete a ratio.':'Make a prediction, then breed. A Punnett square shows probabilities, not a guaranteed family composition.';},
    assumption:'Fictional diploid organisms; equal gamete probability, random fertilization, no viability differences and no linkage in the dihybrid model. A = pigment, a = no pigment. Incomplete dominance gives a blended heterozygote; codominance expresses both patterns. The X-linked recessive model uses a fictional trait in an XX/XY chromosome system. Sampling uses a reproducible pseudorandom sequence.',
    source:'https://openstax.org/books/biology-2e/pages/12-3-laws-of-inheritance',
    controls(b){b.button('Breed offspring sample',()=>{const prob=Object.entries(M.cross(b.v.parentA,b.v.parentB));for(let i=0;i<b.v.sample;i++){b.s.seed=(1664525*b.s.seed+1013904223)>>>0;let p=b.s.seed/4294967296,g=prob.at(-1)[0];for(const [key,value]of prob){p-=value;if(p<=0){g=key;break;}}b.s.offspring[g]=(b.s.offspring[g]||0)+1;b.s.total++;}});b.button('Use two sampled offspring as parents',()=>{const keys=Object.keys(b.s.offspring).filter(g=>b.s.offspring[g]>0);if(!keys.length)return;for(const[key,index]of [['parentA',0],['parentB',keys.length-1]]){const candidates=keys.filter(g=>Array.from(b.controls[key].options).some(o=>o.value===g));if(!candidates.length)continue;b.v[key]=candidates[Math.min(index,candidates.length-1)];b.controls[key].value=b.v[key];}b.s.offspring={};b.s.total=0;b.s.generation++;});},
    detail(b){const ag=M.gametes(b.v.parentA),bg=M.gametes(b.v.parentB);b.extra.innerHTML='<div class="ex-table-wrap"><table class="ex-punnett"><caption>Gametes and possible zygotes · repeated gametes carry their probability</caption><thead><tr><th scope="col">Parent 1 ↓ / Parent 2 →</th>'+bg.map(g=>`<th scope="col">${esc(g)}</th>`).join('')+'</tr></thead><tbody>'+ag.map(a=>'<tr><th scope="row">'+esc(a)+'</th>'+bg.map(z=>{const g=M.zygote(a,z);return `<td>${esc(g)}</td>`;}).join('')+'</tr>').join('')+'</tbody></table></div>';},
    draw(b,c){const prob=M.cross(b.v.parentA,b.v.parentB);const phenotype=g=>{if(b.v.mode==='sexlinked')return(g.includes('Y')?'XY · ':'XX · ')+(!g.includes('XA')?'trait expressed':'trait absent');if(b.v.mode==='dihybrid')return(g.slice(0,2).includes('A')?'Pigmented':'Pale')+' / '+(g.slice(2).includes('B')?'Round':'Long');if(g==='AA')return'Pigmented';if(g==='aa')return'Pale';return b.v.mode==='incomplete'?'Blended':b.v.mode==='codominant'?'Both patterns':'Pigmented';};const ph={};Object.entries(prob).forEach(([g,p])=>{const k=phenotype(g);if(!ph[k])ph[k]={p:0,n:0};ph[k].p+=p;ph[k].n+=b.s.offspring[g]||0;});const entries=Object.entries(ph);text(c,b.v.parentA+' × '+b.v.parentB,320,40,29);text(c,'Expected phenotype probability / observed frequency',320,70,13,'--dim');entries.forEach(([k,val],i)=>{const y=108+i*65;text(c,k,136,y+8,14);c.fillStyle=color('--hair');c.fillRect(254,y-8,300,17);c.fillStyle=color('--em');c.fillRect(254,y-8,300*val.p,17);c.fillStyle=color('--indigo');c.fillRect(254,y+13,b.s.total?300*val.n/b.s.total:0,10);text(c,round(val.p*100,1)+'%',593,y+8,13);});text(c,'Emerald: expected · indigo: this sample',320,371,14);}
  });
  const originalDNA='ATGGCTTTTGAACCGTAA';
  register({id:'dna-protein',title:'DNA → Protein Lab',tag:'Molecular Biology',topics:['gene-expression','dna-protein','mutations'],
    blurb:'Change a fictional coding sequence one base at a time. Transcribe it, read real codons and explain why some mutations change a peptide and others do not.',
    vars:[select('mutationType','Edit operation','substitute',[['substitute','Substitute one base'],['insert','Insert one base'],['delete','Delete one base']]),range('position','Base position (1-based)',1,18,6),select('base','New base','C',['A','C','G','T'])],
    state:()=>({dna:originalDNA,revealed:0}),measure(b){const m=M.translate(b.s.dna);return {'DNA coding strand (5′→3′)':b.s.dna,'mRNA (5′→3′)':m.rna,'Peptide (N→C)':m.started?m.peptide.join('–'):'No peptide: AUG start lost','Amino acids':m.started?m.peptide.length:0,'Mutation class':M.mutation(originalDNA,b.s.dna),'Bases in sequence':b.s.dna.length};},
    story(b){const m=M.translate(b.s.dna);return !m.started?'The start codon is lost. This simplified reading frame cannot initiate translation.':`${M.mutation(originalDNA,b.s.dna)}. ${m.codons.at(-1)?.amino==='Stop'?'Translation reaches a stop codon.':'No in-frame stop appears in the displayed sequence.'} Compare the peptide with the reference; sequence alone does not tell us the full functional effect.`;},
    assumption:'A short fictional coding strand, not a real gene. mRNA matches the coding strand with U replacing T; the complementary template is read antiparallel. Standard nuclear genetic code, an AUG start and the displayed reading frame only. No introns, alternative initiation or protein-folding prediction.',
    source:'https://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi',
    controls(b){b.button('Apply DNA edit',()=>{if(b.s.dna.length>=30&&b.v.mutationType==='insert')return;const i=Math.min(b.v.position-1,b.s.dna.length-1);b.s.dna=b.s.dna.slice(0,i)+(b.v.mutationType==='delete'?'':b.v.base)+b.s.dna.slice(i+(b.v.mutationType==='insert'?0:1));b.s.revealed=0;});const r=el('div','bx-chips');b.controlsHost.append(r);[['Silent example','ATGGCCTTTGAACCGTAA'],['Missense example','ATGGATTTTGAACCGTAA'],['Nonsense example','ATGGCTTTTTAACCGTAA'],['Frameshift example','ATGGCTATTTGAACCGTAA']].forEach(([label,dna])=>b.button(label,()=>{b.s.dna=dna;b.s.revealed=0;},r));b.button('Read next codon',()=>{b.s.revealed=Math.min(M.translate(b.s.dna).codons.length,b.s.revealed+1);});},
    detail(b){const m=M.translate(b.s.dna);b.extra.innerHTML='<div class="ex-sequence"><p><b>Reference peptide</b> Met–Ala–Phe–Glu–Pro–Stop</p><p><b>Current coding DNA 5′→3′</b> <code>'+esc(b.s.dna.match(/.{1,3}/g)?.join(' ')||'')+'</code></p><p><b>Complementary template 3′→5′</b> <code>'+esc(b.s.dna.split('').map(x=>({A:'T',T:'A',C:'G',G:'C'}[x])).join('').match(/.{1,3}/g)?.join(' ')||'')+'</code></p><p><b>mRNA 5′→3′</b> <code>'+esc(m.rna.match(/.{1,3}/g)?.join(' ')||'')+'</code></p></div>';},
    draw(b,c){const m=M.translate(b.s.dna);text(c,'READ THE MESSAGE',320,35,13,'--dim');const codons=m.codons.slice(0,10),w=Math.min(80,540/Math.max(1,codons.length));codons.forEach((item,i)=>{const x=50+i*w;c.fillStyle=color(i<b.s.revealed?'--em':'--hair');c.globalAlpha=.2;c.fillRect(x,86,w-7,55);c.globalAlpha=1;text(c,item.codon,x+(w-7)/2,119,Math.min(20,w*.3));line(c,x+w/2,147,x+w/2,190,'--hair',2);circle(c,x+w/2,218,Math.min(26,w*.4),null,color(item.amino==='Stop'?'--rose':'--indigo'));text(c,i<b.s.revealed?item.amino:'?',x+w/2,224,Math.min(14,w*.22));});text(c,'mRNA codons · 5′ → 3′',320,68,16);text(c,m.started?'Peptide · N terminus → C terminus':'Start codon changed: initiation fails in this model',320,281,16);text(c,M.mutation(originalDNA,b.s.dna),320,342,23,'--em');}
  });
})();
