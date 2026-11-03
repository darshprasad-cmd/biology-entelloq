/* Original synthetic pollen-counting exercise, not calibrated plant physiology.
 * Field coordinates, circle diameters and tube centre-lines use drawing units.
 * The 0/10/20-minute views are separately authored snapshots, not a rate law.
 * NCERT Biology Laboratory Manual Exercise 2 uses n germinated / N total pollen
 * grains, across several fields. Recognizable ruptured grains remain in N here.
 * The strict tube-length > grain-diameter threshold is a declared operational
 * rule, not a universal CBSE rule. Published example: Sawidis et al. (2021),
 * Lilium longiflorum 'Snow Queen', Acta Agrobotanica 74:746, p.3 section 2.2:
 * https://www.journalssystem.com/agb/pdf-159845-86184?filename=Impact+of+Manganese+on.pdf
 * These circles do not claim species-specific morphology or actual viability.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.BioPollenModel=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';
  const constants=Object.freeze({
    FIELDS:Object.freeze(['A','B','C']),TIMES:Object.freeze([0,10,20]),
    WIDTH:600,HEIGHT:440,MAX_RECORDS:90,PERCENT_TOLERANCE:0.051,
    NOTICE:'Synthetic pollen snapshots, not measured germination rates, species validation or supervised-practical completion.'
  });
  const limits=Object.freeze([
    'Each field is a separate, non-overlapping synthetic counting area. Stable grain IDs identify the same drawn grain across time snapshots; these are not independent biological replicates.',
    'Snapshots labelled 0, 10 and 20 minutes are authored examples. There is no fitted germination curve, interpolation, prediction of a real species or universal growth-medium recipe.',
    'This exercise declares a strict tube-centreline length greater than the drawn reference diameter as its scoring rule. Equal or shorter tubes do not meet that threshold; they are not proved biologically nonviable.',
    'Every recognizable grain, including visibly ruptured grains, remains in the total-field denominator. Ruptured drawings are listed separately and do not qualify as germinated here; their earlier history cannot be inferred.',
    'Circle diameters, colours and tube paths are uncalibrated drawing units, not micrometres, species-specific morphology or real microscopy. Countable fields are deliberately free of overlap and edge ambiguity.',
    'Only distinct fields at the same snapshot can be pooled. Recounting one field does not increase the sample; the latest valid count replaces that field at that time. A time series is not an additional set of independent pollen grains.',
    'A checked count is model reasoning practice, not evidence that a physical experiment was performed, a viability assay was validated or a student achieved practical competence.'
  ]);
  const layouts={A:{count:9,ruptured:1},B:{count:11,ruptured:1},C:{count:14,ruptured:2}};
  const ratios={
    A:{10:[0,.55,1,1.25,1.6,1.9,.8,0,0],20:[0,1.25,1,1.7,2.05,2.25,1.4,1.15,0]},
    B:{10:[1.25,.6,0,1,1.4,0,1.7,.8,1.25,.5,0],20:[1.8,1.25,0,1.5,1.9,1,2.2,1.15,1.7,.7,0]},
    C:{10:[.45,1.15,0,1,1.25,.65,1.5,0,1.7,.9,1.25,0,0,0],20:[1.1,1.6,0,1.2,1.7,1,1.9,.8,2.1,1.3,1.7,0,0,0]}
  };
  function dataProperties(value,allowed,required=[]){
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    try{
      const names=Reflect.ownKeys(value);
      if(names.some(key=>typeof key!=='string'||!allowed.includes(key))||required.some(key=>!names.includes(key)))return null;
      const result={};
      for(const key of names){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(!descriptor||!Object.hasOwn(descriptor,'value'))return null;result[key]=descriptor.value;}
      return result;
    }catch(_){return null;}
  }
  const finite=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
  function normalize(input={}){
    const data=dataProperties(input,['field','time']);if(!data)return null;
    const field=Object.hasOwn(data,'field')?data.field:'A',time=Object.hasOwn(data,'time')?data.time:0;
    return constants.FIELDS.includes(field)&&constants.TIMES.includes(time)?{field,time:time===0?0:time}:null;
  }
  function field(input={}){
    const state=normalize(input);if(!state)return null;
    const layout=layouts[state.field];
    return Array.from({length:layout.count},(_,index)=>{
      const radius=12+index%3,x=55+(index%5)*110,y=65+Math.floor(index/5)*140;
      const ruptured=index>=layout.count-layout.ruptured,ratio=state.time===0?0:ratios[state.field][state.time][index];
      const diameter=2*radius,tubeLength=diameter*ratio,start={x:x+radius,y};
      // A horizontal first segment and two 3:4:5-direction segments produce
      // a bent centreline with the declared total length (floating-point roundoff
      // only). The length starts at the grain wall, never its centre.
      const direction=index%2?1:-1;
      const tube=tubeLength===0?[]:[start,
        {x:start.x+.5*tubeLength,y},
        {x:start.x+.7*tubeLength,y:y+direction*.15*tubeLength},
        {x:start.x+.9*tubeLength,y}];
      return {id:state.field+String(index+1).padStart(2,'0'),x,y,radius,diameter,ruptured,tube,tubeLength,ratio};
    });
  }
  function classify(input){
    const grain=dataProperties(input,['id','x','y','radius','diameter','ruptured','tube','tubeLength','ratio'],['radius','ruptured','tubeLength']);
    if(!grain||!finite(grain.radius,1,100)||!finite(grain.tubeLength,0,1000)||typeof grain.ruptured!=='boolean')return null;
    const diameter=2*grain.radius;
    if(grain.ruptured)return {status:'ruptured',scorable:true,germinated:false,reason:'Recognizable ruptured grain: include it in total N and list it as damaged, but do not score it as germinated in this snapshot. Its earlier history is unknown.'};
    const germinated=grain.tubeLength>diameter;
    return {status:germinated?'germinated':'not-germinated',scorable:true,germinated,
      reason:germinated?'The drawn tube centreline is longer than the grain diameter, meeting the declared strict greater-than rule.':grain.tubeLength===0?'No tube extension is drawn. Include this recognizable grain in total N, but not in germinated n.':grain.tubeLength===diameter?'The tube length equals the grain diameter. Equal is not greater: include it in N, but it does not meet this declared germination criterion.':'The tube is shorter than the grain diameter. Include it in N; extension alone does not meet this declared criterion.'};
  }
  function tally(input={}){
    const state=normalize(input);if(!state)return null;
    const grains=field(state),germinated=grains.filter(grain=>classify(grain).germinated).length;
    return {...state,total:grains.length,germinated,ruptured:grains.filter(grain=>grain.ruptured).length,percent:germinated/grains.length*100};
  }
  function counts(input){
    const value=dataProperties(input,['total','germinated','percent'],['total','germinated','percent']);
    if(!value||!Number.isInteger(value.total)||value.total<1||value.total>30||!Number.isInteger(value.germinated)||value.germinated<0||value.germinated>value.total||!finite(value.percent,0,100))return null;
    return {total:value.total,germinated:value.germinated,percent:value.percent===0?0:value.percent};
  }
  function check(input,entered){
    const expected=tally(input);if(!expected)return null;
    const value=counts(entered);
    if(!value)return {correct:false,expected,feedback:'Enter whole-number counts with 0 ≤ germinated ≤ total, total above zero, and a finite percentage between 0 and 100. Strings, missing values and derived claims are not accepted as raw counts.'};
    const issues=[];
    if(value.total!==expected.total)issues.push('Total N is '+expected.total+': include every recognizable grain, including the '+expected.ruptured+' ruptured grain'+(expected.ruptured===1?'':'s')+'. Short, equal-length and absent tubes stay in N.');
    if(value.germinated!==expected.germinated)issues.push('Germinated n is '+expected.germinated+'. Use tube length from the grain wall to tip along the centreline. It must be strictly greater than the reference diameter; equal is not greater. Ruptured drawings do not qualify here.');
    if(Math.abs(value.percent-expected.percent)>constants.PERCENT_TOLERANCE)issues.push('Calculate 100 × n / N = 100 × '+expected.germinated+' / '+expected.total+' = '+expected.percent.toFixed(1)+'% (rounded to one decimal place).');
    return {correct:issues.length===0,expected,feedback:issues.length?issues.join(' '):'Counts and percentage match this synthetic field under the stated scoring rule. This is not a validated biological result or practical-completion award.'};
  }
  function record(input,entered){
    const state=normalize(input),raw=counts(entered);if(!state||!raw||!check(state,raw).correct)return null;
    return {state,...raw,dataKind:'synthetic_pollen_snapshot'};
  }
  function validRecord(input){
    const value=dataProperties(input,['state','total','germinated','percent','dataKind'],['state','total','germinated','percent']);
    if(!value||!dataProperties(value.state,['field','time'],['field','time']))return null;
    return record(value.state,{total:value.total,germinated:value.germinated,percent:value.percent});
  }
  function summarize(records){
    if(!Array.isArray(records)||records.length>constants.MAX_RECORDS)return [];
    const groups=new Map();
    for(const input of records){
      const row=validRecord(input);if(!row)continue;
      if(!groups.has(row.state.time))groups.set(row.state.time,new Map());
      groups.get(row.state.time).set(row.state.field,row);
    }
    return [...groups.entries()].sort(([a],[b])=>a-b).map(([time,group])=>{
      const fields=constants.FIELDS.filter(name=>group.has(name)),rows=fields.map(name=>group.get(name));
      const total=rows.reduce((sum,row)=>sum+row.total,0),germinated=rows.reduce((sum,row)=>sum+row.germinated,0);
      return {time,fields,total,germinated,ruptured:fields.reduce((sum,name)=>sum+tally({field:name,time}).ruptured,0),percent:100*germinated/total,complete:fields.length===constants.FIELDS.length,
        limitation:'Pooled synthetic count for distinct fields at this snapshot only, not the average of percentages. Recounting replaces a field; time snapshots and fields are not independent biological experiments. No species viability, uncertainty estimate or practical completion is established.'};
    });
  }
  const questions=Object.freeze([
    {id:'boundary',prompt:'A drawn pollen tube is exactly as long as the reference grain diameter. Under this exercise’s strict greater-than rule, how is it counted?',options:['In total N but not in germinated n.','In both N and n because equal means greater.','Excluded from N because it has a short tube.','As proof that the pollen is dead.'],answer:0,explanation:'The declared rule is tube length > diameter, not ≥ diameter. An equal-length tube remains in the total pollen count but does not qualify at this snapshot. This threshold does not prove that the pollen is biologically nonviable.'},
    {id:'denominator',prompt:'A field has 11 recognizable grains, including one ruptured grain; four intact grains meet the tube criterion. What denominator belongs in this exercise’s total-field percentage?',options:['4, because only germinated grains count.','10, silently omitting the damaged grain.','11, with the ruptured grain separately described.','12, counting the rupture as another grain.'],answer:2,explanation:'Total N includes all 11 recognizable grains in this field; n is four. The ruptured grain is reported separately but stays in N. Excluding a chosen subset would change the question and must never be done silently.'},
    {id:'pooled',prompt:'At the same snapshot, field A has 6 qualifying grains out of 9 and field B has 7 out of 11. What is their pooled percentage?',options:['The unweighted mean of 66.7% and 63.6%.','65%, from 100 × (6 + 7) / (9 + 11).','130%, by adding the two percentages.','50%, because two fields were counted.'],answer:1,explanation:'Pool the raw counts: (6 + 7) / (9 + 11) × 100 = 65%. A simple average of field percentages gives unequal-sized fields equal weight and does not equal the percentage of the combined pollen count.'},
    {id:'recount',prompt:'You recount the same field at the same snapshot. How should this affect the pooled sample?',options:['Double the number of grains observed.','Create an independent biological replicate.','Replace or verify that field’s count, without counting its grains twice.','Mix it with another time to enlarge the denominator.'],answer:2,explanation:'A repeated count of the same area checks counting consistency; it does not create new grains or an independent specimen. The notebook replaces the earlier valid count for that field and time and pools only distinct fields at the same time.'},
    {id:'time',prompt:'Why must the 10-minute and 20-minute entries stay in separate summaries?',options:['All pollen must germinate at exactly ten minutes.','They revisit the same drawn grains at different authored snapshots.','Percentages cannot be calculated after twenty minutes.','More rows always imply more independent grains.'],answer:1,explanation:'These authored views revisit stable grain IDs. Combining times would count the same grains again and obscure the time-specific observation. The drawings do not establish real rates, and germination timing depends on species and experimental conditions.'},
    {id:'inference',prompt:'Some intact grains have no qualifying tube in one snapshot. Which conclusion is supported?',options:['Every such grain is permanently nonviable.','The culture medium must work identically for all species.','They have not met the stated observation criterion at that snapshot.','The student has completed the supervised school practical.'],answer:2,explanation:'Report the visible criterion and the observation time. A nonqualifying or unextended grain does not by itself prove permanent nonviability, explain its cause or validate a universal medium. These are synthetic examples, not a real viability assay.'}
  ].map(question=>Object.freeze({...question,options:Object.freeze(question.options)})));
  function grade(id,choice){
    if(typeof id!=='string'||!Number.isInteger(choice))return null;
    const q=questions.find(question=>question.id===id);
    if(!q||choice<0||choice>=q.options.length)return null;
    return {correct:choice===q.answer,answer:q.answer,explanation:q.explanation};
  }
  return Object.freeze({constants,limits,normalize,field,classify,tally,check,record,validRecord,summarize,questions,grade});
});
