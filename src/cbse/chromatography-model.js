/* Original synthetic paper-chromatography readings, not calibrated plant data.
 * Distances are mm from one pencil origin; Rf is band-centre distance / front.
 * Method reference: Kew, Separating leaf pigment using chromatography:
 * https://endeavour.kew.org/sites/endeavour/files/documents/2023-05/Kew-KS5-PhotosynthesisPower-PracticalHowTo.pdf
 * Two invented mixtures share one fixed illustrative paper/solvent condition.
 * Ratios and colours are authored teaching values, not chemical identification,
 * a species model, solvent recipe, development rate or measured experiment.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.BioChromatographyModel=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';
  const constants=Object.freeze({SAMPLES:Object.freeze(['leaf-a','leaf-b']),FRONTS:Object.freeze([40,60,80]),BANDS:Object.freeze(['B1','B2','B3','B4']),MAX_RECORDS:24,MAX_INSPECTED_RECORDS:200,DISTANCE_TOLERANCE:.25,RF_TOLERANCE:.0051,
    NOTICE:'Synthetic chromatograms under one illustrative condition; not species identification, calibrated separation, growth rates or supervised-practical completion.'});
  const limits=Object.freeze([
    'Leaf A and Leaf B are invented mixtures, not named plants. B1–B4 are stable drawing labels, not identified chemicals; a colour or matching Rf alone does not establish identity.',
    'The same fixed illustrative paper/solvent condition is used throughout. Authored distances scale with front distance; they do not predict real solvent movement or separation time.',
    'Both distances begin at the pencil origin and use the same unit. Band distance is measured to the band centre, not its leading edge. Rf is dimensionless.',
    'The 0.25 mm distance and 0.0051 Rf acceptance tolerances are teaching tolerances, not instrument calibration, uncertainty estimates or experimental error bars.',
    'Changing the front revisits authored examples. A repeated configuration replaces its row; different fronts or bands are not independent biological replicates and are never averaged into a biological result.',
    'Checking a numerical observation does not certify preparation, solvent safety, pigment identification, mastery or supervised practical completion. Physical solvent work requires school supervision.'
  ]);
  const ratios={'leaf-a':[.25,.45,.65,.85],'leaf-b':[.2,.4,.7,.9]},colors=['#5e9c70','#a9ac5b','#e4c96a','#d9955c'];
  function data(value,allowed,required=allowed){
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    try{const keys=Reflect.ownKeys(value);if(keys.some(k=>typeof k!=='string'||!allowed.includes(k))||required.some(k=>!keys.includes(k)))return null;
      const result={};for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!Object.hasOwn(d,'value'))return null;result[key]=d.value;}return result;
    }catch(_){return null;}
  }
  const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>min&&v<max;
  const within=(a,b,t)=>Math.abs(a-b)<=t+1e-12;
  function defaults(){return {sample:'leaf-a',front:60,band:'B1'};}
  function normalize(input){
    const s=data(input,['sample','front','band']);
    return s&&constants.SAMPLES.includes(s.sample)&&constants.FRONTS.includes(s.front)&&constants.BANDS.includes(s.band)?{sample:s.sample,front:s.front,band:s.band}:null;
  }
  function run(input){
    const s=data(input,['sample','front']);
    if(!s||!constants.SAMPLES.includes(s.sample)||!constants.FRONTS.includes(s.front))return null;
    return constants.BANDS.map((id,i)=>({id,color:colors[i],distance:s.front*ratios[s.sample][i],rf:ratios[s.sample][i]}));
  }
  function measurements(input){
    const n=data(input,['frontDistance','bandDistance','rf']);
    return n&&finite(n.frontDistance,0,101)&&finite(n.bandDistance,0,n.frontDistance)&&finite(n.rf,0,1)?{frontDistance:n.frontDistance,bandDistance:n.bandDistance,rf:n.rf}:null;
  }
  function check(input,entered){
    const state=normalize(input);
    if(!state)return {correct:false,expected:null,feedback:'Choose a named sample, authored solvent-front distance and band.'};
    const band=run({sample:state.sample,front:state.front}).find(b=>b.id===state.band),expected={frontDistance:state.front,bandDistance:band.distance,rf:band.rf},n=measurements(entered);
    if(!n)return {correct:false,expected,feedback:'Enter finite numerical distances above zero, with the band centre below the front, and an Rf strictly between zero and one. Use the same distance unit; blanks, strings and derived claims are not measurements.'};
    const issues=[];
    if(!within(n.frontDistance,expected.frontDistance,constants.DISTANCE_TOLERANCE))issues.push('Measure the solvent front from the pencil origin, not from the bottom of the paper. The authored front is '+expected.frontDistance+' mm from the origin.');
    if(!within(n.bandDistance,expected.bandDistance,constants.DISTANCE_TOLERANCE))issues.push('Measure to the centre of '+state.band+' from the same pencil origin. Its authored distance is '+expected.bandDistance+' mm.');
    if(!within(n.rf,expected.rf,constants.RF_TOLERANCE))issues.push('This authored band has Rf '+expected.rf.toFixed(2)+'. Use band-centre distance divided by solvent-front distance, not the inverse.');
    if(!within(n.rf,n.bandDistance/n.frontDistance,constants.RF_TOLERANCE))issues.push('Your Rf must also agree with your entered band distance divided by your entered front distance. Distances in the same unit cancel; do not attach mm to Rf.');
    return {correct:issues.length===0,expected,feedback:issues.length?issues.join(' '):'Distances and dimensionless Rf agree with this synthetic chromatogram within the stated teaching tolerances. This does not identify a chemical or certify physical practical work.'};
  }
  function record(input,entered){
    const state=normalize(input),n=measurements(entered);
    return state&&n&&check(state,n).correct?{state,...n,dataKind:'synthetic_chromatogram'}:null;
  }
  function validRecord(input){
    const r=data(input,['state','frontDistance','bandDistance','rf','dataKind'],['state','frontDistance','bandDistance','rf']);
    return r?record(r.state,{frontDistance:r.frontDistance,bandDistance:r.bandDistance,rf:r.rf}):null;
  }
  function sanitizeRecords(input){
    if(!Array.isArray(input))return [];
    const seen=new Set(),rows=[];
    try{for(let i=input.length-1;i>=Math.max(0,input.length-constants.MAX_INSPECTED_RECORDS)&&rows.length<constants.MAX_RECORDS;i--){
      const d=Object.getOwnPropertyDescriptor(input,String(i));if(!d||!Object.hasOwn(d,'value'))continue;
      const r=validRecord(d.value);if(!r)continue;const key=[r.state.sample,r.state.front,r.state.band].join(':');
      if(seen.has(key))continue;seen.add(key);rows.unshift(r);
    }}catch(_){return [];}
    return rows;
  }
  function summarize(input){
    const groups=new Map();
    for(const r of sanitizeRecords(input)){const key=r.state.sample+':'+r.state.band;
      if(!groups.has(key))groups.set(key,{sample:r.state.sample,band:r.state.band,points:[]});
      groups.get(key).points.push({front:r.state.front,frontDistance:r.frontDistance,bandDistance:r.bandDistance,rf:r.rf});
    }
    return [...groups.values()].map(g=>({...g,points:g.points.sort((a,b)=>a.front-b.front),count:g.points.length,
      limitation:'Compare raw distances and ratios for this invented mixture and labelled band under one fixed illustrative condition. Front settings are authored configurations, not independent repeats; no average, chemical identification or uncertainty estimate is inferred.'}));
  }
  const questions=Object.freeze([
    {id:'origin',prompt:'The solvent front is 60 mm above the pencil origin and a band centre is 27 mm above it. Which calculation is justified?',options:['27 / 60 = 0.45.','60 / 27, because the front is farther.','Add the distance below the pencil line only to the band distance.','Measure the front from the paper edge but the band from the origin.'],answer:0,explanation:'Both distances begin at the same origin: Rf = 27 / 60 = 0.45. Mixing origins or taking the inverse changes the quantity being measured.'},
    {id:'dimensionless',prompt:'A band travels 3 cm while the front travels 6 cm. What is its Rf?',options:['0.5 cm.','2, with no unit.','0.5, with no unit.','3 mm.'],answer:2,explanation:'Rf is 3 cm / 6 cm = 0.5. Identical distance units cancel. Converting both distances to millimetres leaves 30 / 60 = 0.5.'},
    {id:'ink',prompt:'Why use a pencil baseline rather than a pen line?',options:['Ink always remains fixed on paper.','Ink can introduce extra components that travel and confuse the sample pattern.','Pencil makes solvent move at a known rate.','A pen line makes every Rf equal to one.'],answer:1,explanation:'Pen ink may itself separate and create extra bands. A pencil origin avoids deliberately adding that coloured mixture; it does not guarantee the rest of the procedure is valid.'},
    {id:'submersion',prompt:'The original sample spot is below the solvent surface. What is the concern?',options:['It proves every pigment is absent.','It automatically makes a larger Rf.','It is the required starting position.','Sample can dissolve into the reservoir instead of travelling from a defined origin.'],answer:3,explanation:'Keep the origin and dried sample spot above the solvent reservoir while the lower paper contacts solvent. A submerged spot can wash into the reservoir, so ordinary band measurement is not justified.'},
    {id:'front',prompt:'Why mark the solvent front promptly after removing the strip?',options:['The solvent can evaporate, making its furthest position difficult to locate.','The mark identifies each pigment chemically.','Waiting changes millimetres into centimetres.','The paper edge is always the final front.'],answer:0,explanation:'Rf needs the front distance reached during development. Record that position before it becomes indistinct; an unmarked dry strip does not justify reconstructing the front from the paper edge.'},
    {id:'identity',prompt:'Two coloured bands have similar Rf values. What does that establish?',options:['They are certainly the same chemical in any solvent.','They prove that both leaves are the same species.','It supports a comparison under matched conditions, but does not alone establish identity.','It certifies supervised practical completion.'],answer:2,explanation:'Rf depends on the separation conditions, and different substances can overlap. Chemical identification needs appropriate reference comparisons and further evidence; these invented band labels make no identity claim.'}
  ].map(q=>Object.freeze({...q,options:Object.freeze(q.options)})));
  function grade(id,choice){
    if(typeof id!=='string'||!Number.isInteger(choice))return null;
    const q=questions.find(q=>q.id===id);return !q||choice<0||choice>=q.options.length?null:{correct:choice===q.answer,answer:q.answer,explanation:q.explanation};
  }
  return Object.freeze({constants,limits,defaults,normalize,run,check,record,validRecord,sanitizeRecords,summarize,questions,grade});
});
