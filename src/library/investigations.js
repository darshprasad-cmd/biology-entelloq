/* Fictional evidence investigations: students choose tests before evaluating causes. */
(function(){
  'use strict';
  const cases=[{
    id:'plant-investigation',title:'The Greenhouse Mystery',tag:'Open Investigation',
    blurb:'Young plants have pale older leaves and slow growth. Choose comparisons, gather evidence and distinguish light, water and mineral explanations.',
    opening:'Four trays grew normally for two weeks, then their older leaves became pale. The plants are upright, with no visible pests. These are fictional observations, designed for a controlled investigation.',
    labels:['Low light','Water shortage','Nitrogen limitation','Blocked phloem'],correct:2,
    tests:[
      {name:'Compare light exposure',unit:'µmol photons m⁻² s⁻¹',a:480,b:490,note:'Affected and reference trays receive comparable light. A very small difference alone is weak evidence of a light shortage.'},
      {name:'Compare soil moisture',unit:'relative water content (%)',a:68,b:70,note:'Moisture is similar and the leaves are not wilting. Consider which cause could explain older leaves becoming pale.'},
      {name:'Compare leaf nitrogen',unit:'leaf dry mass (%)',a:1.1,b:3.2,note:'The affected tray has lower nitrogen content. Nitrogen is needed for amino acids and chlorophyll-associated metabolism.'},
      {name:'Test nitrogen addition',unit:'new biomass over 7 days (g)',a:2.8,b:0.9,note:'A matched affected tray receiving nitrogen grew more than an affected tray receiving water only; other conditions were held constant.'},
      {name:'Test extra light',unit:'new biomass over 7 days (g)',a:1.0,b:0.9,note:'An affected tray under extra light grew about as much as the unchanged affected tray. Added light did not resolve the main limitation.'}
    ],conclusion:'Nitrogen limitation best fits the combination of low leaf nitrogen and improvement after nitrogen addition. One rescue comparison supports causation more strongly than the leaf colour alone. Replicate the experiment and test whether other minerals also limit growth.',
    diagram:'plant'
  },{
    id:'ecosystem-investigation',title:'The Silent Pond',tag:'Open Investigation',
    blurb:'A virtual pond has lost fish and aquatic insect diversity. Compare water conditions and food-web evidence before explaining what changed.',
    opening:'After heavy rain, one pond became green and cloudy. Fish abundance fell over the next week. An upstream reference pond remained clear. The data are fictional; several causes could produce the first observation.',
    labels:['Predators introduced','Nutrient enrichment and oxygen depletion','Water became too cold','Reduced sunlight alone'],correct:1,
    tests:[
      {name:'Compare dissolved oxygen at dawn',unit:'dissolved O₂ (mg/L)',a:2.1,b:7.4,note:'The affected pond has much less dissolved oxygen at dawn, after a night of community respiration.'},
      {name:'Compare nitrate',unit:'nitrate nitrogen (mg/L)',a:5.4,b:0.4,note:'Nutrient availability rose after runoff. This is consistent with, but alone does not prove, nutrient-driven algal growth.'},
      {name:'Compare temperature',unit:'water temperature (°C)',a:23,b:22,note:'The temperature difference is small. It does not fit a large sudden cooling event.'},
      {name:'Survey predator numbers',unit:'predators per survey',a:6,b:7,note:'Survey effort is equal and there is no observed predator increase. Detection is imperfect, so a repeat survey would help.'},
      {name:'Measure algal biomass',unit:'chlorophyll proxy (relative units)',a:85,b:12,note:'Algal biomass is much higher. Decomposition and respiration can consume oxygen; daytime photosynthesis can temporarily raise it.'}
    ],conclusion:'Nutrient enrichment followed by increased algae and oxygen depletion best fits the combined evidence. Oxygen demand from respiration and decomposition can stress aquatic animals. Compare day/night oxygen measurements and replicated sites before making a stronger causal claim.',diagram:'pond'
  }];
  cases.forEach(c=>LABS.register(c.id,{...c,build(host){
    let evidence=[],selected=null,choice=null;
    const wrap=document.createElement('div');wrap.className='bx';host.append(wrap);
    const view=document.createElement('div');view.className='bx-view';view.style.padding='24px';wrap.append(view);
    const side=document.createElement('div');side.className='bx-side';wrap.append(side);
    const opening=document.createElement('p');opening.className='bx-note';opening.textContent=c.opening;view.append(opening);
    const drawing=document.createElement('div');view.append(drawing);
    drawing.innerHTML=c.diagram==='plant'?'<svg viewBox="0 0 520 260" role="img" aria-label="Affected pale-leaved plant and healthy reference plant"><g stroke="var(--em)" stroke-width="6" fill="none"><path d="M150 225V85M150 165L110 126M150 125L185 85M365 225V70M365 160L330 110M365 115L400 73"/></g><g fill="var(--amber)"><ellipse cx="105" cy="120" rx="36" ry="17" transform="rotate(30 105 120)"/><ellipse cx="185" cy="84" rx="36" ry="17" transform="rotate(-30 185 84)"/></g><g fill="var(--em)"><ellipse cx="326" cy="104" rx="36" ry="19" transform="rotate(35 326 104)"/><ellipse cx="402" cy="72" rx="36" ry="19" transform="rotate(-35 402 72)"/></g><path d="M105 195h90l-15 55h-60zM320 195h90l-15 55h-60z" fill="var(--raise)" stroke="var(--hair)"/><g fill="var(--dim)" font-size="13" text-anchor="middle"><text x="150" y="25">Affected tray</text><text x="365" y="25">Reference tray</text></g></svg>':'<svg viewBox="0 0 520 260" role="img" aria-label="Pond food web: nutrients support algae; consumers and decomposers use oxygen"><g fill="var(--raise)" stroke="var(--hair)"><rect x="15" y="95" width="100" height="60" rx="8"/><rect x="185" y="30" width="130" height="60" rx="8"/><rect x="375" y="95" width="130" height="60" rx="8"/><rect x="180" y="185" width="150" height="60" rx="8"/></g><g stroke="var(--em)" fill="none" stroke-width="2"><path d="M115 115L185 60M315 60L395 95M440 155L330 208M250 90V185"/></g><g fill="var(--ink)" text-anchor="middle" font-size="14"><text x="65" y="130">Nutrients</text><text x="250" y="66">Algae</text><text x="440" y="130">Consumers</text><text x="255" y="220">Decomposers</text></g></svg>';
    const result=document.createElement('div');result.className='bx-read';result.setAttribute('role','status');result.textContent='Choose a test to collect the first piece of evidence.';view.append(result);
    const label=document.createElement('div');label.className='bx-lbl';label.textContent='Choose what to investigate';side.append(label);
    c.tests.forEach((t,i)=>{const b=document.createElement('button');b.className='bx-btn';b.textContent=t.name;b.onclick=()=>{selected=i;if(!evidence.includes(i))evidence.push(i);b.classList.add('on');b.setAttribute('aria-pressed','true');result.textContent=t.name+': '+t.a+' vs '+t.b+' '+t.unit+'. '+t.note;drawBars(t);update();};side.append(b);});
    const chart=document.createElement('div');view.append(chart);
    function drawBars(t){const max=Math.max(t.a,t.b)*1.2;chart.innerHTML=`<svg viewBox="0 0 520 190" role="img" aria-label="${t.name}: ${t.a} compared with ${t.b} ${t.unit}"><g fill="var(--dim)" font-size="12"><text x="10" y="25">${t.unit}</text><text x="10" y="77">${selected===3&&c.diagram==='plant'?'Added nitrogen':selected===4&&c.diagram==='plant'?'Added light':'Affected'}</text><text x="10" y="137">${selected>=3&&c.diagram==='plant'?'Unchanged':'Reference'}</text></g><rect x="125" y="48" width="${300*t.a/max}" height="38" rx="4" fill="var(--amber)"/><rect x="125" y="108" width="${300*t.b/max}" height="38" rx="4" fill="var(--em)"/><g fill="var(--ink)" font-size="12"><text x="${134+300*t.a/max}" y="73">${t.a}</text><text x="${134+300*t.b/max}" y="133">${t.b}</text></g></svg>`;}
    const conclusion=document.createElement('div');conclusion.className='bx-grp';conclusion.innerHTML='<label for="investigation-cause">Working explanation</label>';side.append(conclusion);
    const select=document.createElement('select');select.id='investigation-cause';select.className='bx-btn';select.innerHTML='<option value="">Choose a possible cause</option>'+c.labels.map((l,i)=>'<option value="'+i+'">'+l+'</option>').join('');conclusion.append(select);select.onchange=()=>{choice=select.value===''?null:Number(select.value);update();};
    const evaluate=document.createElement('button');evaluate.className='bx-btn pri';evaluate.textContent='Evaluate my explanation';side.append(evaluate);
    const feedback=document.createElement('p');feedback.className='bx-note';feedback.setAttribute('role','status');side.append(feedback);
    function update(){evaluate.disabled=evidence.length<3||choice===null;feedback.textContent=evidence.length<3?'Collect at least three different pieces of evidence before evaluating a cause.':'Use your notebook to connect the selected explanation to the evidence.';}
    evaluate.onclick=()=>{feedback.textContent=choice===c.correct?c.conclusion:'That explanation does not account for all the evidence. Which measurement would be surprising if your explanation were correct? Try another comparison before revising.';};update();
    return{snapshot(){const t=selected===null?null:c.tests[selected];return{variables:{'Selected test':t?.name||'None','Working explanation':choice===null?'Not selected':c.labels[choice]},measurements:{'Tests collected':evidence.length,...(t?{['Affected ('+t.unit+')']:t.a,['Comparison ('+t.unit+')']:t.b}:{})},stage:evidence.length>=3?'Analyze evidence':'Collect evidence'};},dispose(){host.innerHTML='';}};
  }}));
})();
