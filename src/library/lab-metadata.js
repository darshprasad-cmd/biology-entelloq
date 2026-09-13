/* Reviewed metadata stays separate from experiment rendering. Durations are estimates. */
(function(){
  'use strict';
  const rows=[
    ['microscope','Microscopy','foundation',10,'microscope',['cell-structure'],['onion','blood','stomata','slide','cell','protein factory'],'How does magnification change field of view and visible detail?',['Choose a slide','Focus at low power','Compare two objectives','Use the scale to estimate size']],
    ['osmosis','Cell Biology','foundation',10,'simulation',['membrane-transport'],['water','turgor','hypotonic','hypertonic','cell swelling'],'How does the surrounding solution change a cell’s volume?',['Predict water movement','Record the starting condition','Change external solute','Compare plant and animal cells']],
    ['enzyme-kinetics','Biochemistry','school',15,'simulation',['enzymes'],['enzymes','temperature','pH','inhibition','substrate'],'Which conditions limit the activity of this model enzyme?',['Record a baseline','Vary one condition','Take a fresh sample after denaturation','Compare reaction rates']],
    ['photosynthesis-rate','Plant Biology','school',15,'simulation',['photosynthesis'],['plant food','light','oxygen','chloroplast'],'When does adding more light stop increasing photosynthesis?',['Predict a limiting factor','Keep temperature and carbon dioxide fixed','Change light intensity','Test the plateau']],
    ['cellular-respiration','Cell Biology','school',15,'simulation',['cellular-respiration'],['ATP','mitochondria','energy','fermentation'],'How do oxygen and glucose availability change the energy yield?',['Record an oxygen-rich baseline','Change oxygen supply','Compare carbon dioxide and ATP proxies','Explain the pathway change']],
    ['mitosis','Cell Biology','school',10,'simulation',['mitosis','meiosis'],['chromosomes','division','spindle','cell cycle'],'Why must the spindle checkpoint be satisfied before sister chromatids separate?',['Observe chromosome replication','Advance to metaphase','Disrupt the spindle','Restore attachment and follow separation']],
    ['mendelian-genetics','Genetics','school',15,'genetics',['mendelian-genetics'],['Punnett','offspring','alleles','inheritance','cross'],'Do small families always match the predicted inheritance ratio?',['Choose parents','Predict gametes','Compare expected proportions','Sample offspring and compare repeats']],
    ['dna-protein','Molecular Biology','school',15,'genetics',['dna','protein-synthesis'],['mutation','transcription','translation','codons','ribosome'],'How can a DNA change alter a protein, or leave it unchanged?',['Read the coding strand','Transcribe and translate','Change one base or shift the frame','Compare the peptide']],
    ['heart-physiology','Human Physiology','school',15,'simulation',['heart-circulation'],['heart','blood flow','cardiac output','resistance','vessel diameter'],'How are heart rate, stroke volume, resistance and pressure connected?',['Record resting values','Change one control','Compare flow with pressure','State the model assumptions']],
    ['heart-rate','Human Physiology','school',15,'simulation',['heart-circulation'],['heart','ECG','electrocardiogram','P wave','QRS','T wave'],'How does pacing change the model cardiac cycle?',['Observe one cycle','Change the rate','Identify electrical and mechanical events','Compare recorded values']],
    ['gas-exchange','Human Physiology','school',15,'simulation',['gas-exchange'],['lung','alveolus','alveoli','breathing','oxygen'],'What limits diffusion across an alveolar membrane?',['Record a baseline','Change the gradient','Compare surface area and thickness','Relate diffusion to ventilation']],
    ['natural-selection','Evolution','school',20,'simulation',['natural-selection'],['beetle','adaptation','allele','evolution'],'How does a changing environment shift an inherited trait over generations?',['Record initial variation','Advance several generations','Change the environment','Compare allele frequencies']],
    ['predator-prey','Ecology','school',15,'simulation',['ecology'],['food web','population','predator','prey','oscillation'],'Why can a predator population peak after its prey population?',['Record starting populations','Advance equal time intervals','Change predation or food supply','Explain the lag']],
    ['gel-electrophoresis','Biotechnology','school',15,'data',['dna'],['DNA bands','forensic','gel','fragments','ladder'],'Which fictional DNA sample matches the observed band pattern?',['Load samples and a ladder','Run the model gel','Compare fragment migration','Justify the match']],
    ['dna-extraction','Biotechnology','foundation',15,'simulation',['dna'],['DNA','cell','membrane','extraction'],'Which cell structures must be separated to reveal DNA?',['Inspect the starting material','Follow the virtual separation stages','Observe where DNA appears','Explain each separation']],
    ['pcr','Biotechnology','advanced',20,'simulation',['dna'],['amplification','DNA copies','polymerase'],'How does repeated copying change the amount of a target DNA segment?',['Inspect the model target','Advance a cycle','Compare successive copy numbers','Explain ideal versus limited amplification']],
    ['plant-investigation','Open Investigation','school',20,'investigation',['plant-transport','photosynthesis'],['yellow leaves','growth','minerals','plant food'],'Why have the plants in this virtual greenhouse stopped growing?',['Inspect observations','Choose a diagnostic comparison','Collect several pieces of evidence','Write a supported conclusion']],
    ['ecosystem-investigation','Open Investigation','school',20,'investigation',['ecology','natural-selection'],['biodiversity','river','food web','ecosystem'],'What best explains a sudden loss of biodiversity in a virtual pond?',['Inspect the food web','Choose environmental tests','Compare upstream and downstream evidence','Evaluate competing explanations']]
  ];
  const meta={};
  rows.forEach(([id,category,difficulty,minutes,type,relatedTopics,aliases,question,steps])=>{meta[id]={category,difficulty,minutes,type,relatedTopics,aliases,question,steps,learningObjectives:[],challenge:'Investigate: '+question+' Choose your procedure and controls, then defend your conclusion with recorded evidence.'};});
  const dissections=[['heart','Mammalian Heart','Human Physiology',['heart-circulation']],['frog','Frog','Dissection',['heart-circulation','gas-exchange']],['fish','Bony Fish','Dissection',['gas-exchange','heart-circulation']],['earthworm','Earthworm','Dissection',['gas-exchange','ecology']],['cockroach','Cockroach','Dissection',['gas-exchange','nervous-system']]];
  dissections.forEach(([specimen,title,category,relatedTopics])=>{
    const id=specimen+'-dissection';
    meta[id]={category:'Dissection',difficulty:'school',minutes:30,type:'dissection',relatedTopics,aliases:[specimen,title,'anatomy','auto dissection','organs',category],question:'How do the structures of the '+title.toLowerCase()+' support their functions?',steps:['Inspect the external anatomy','Use the guided access sequence','Identify an internal structure','Connect its form to its function'],learningObjectives:['Recognize anatomical layers','Compare organs and systems','Record structural evidence']};
    LABS.register(id,{title:title+' Dissection',tag:'Dissection',blurb:'Explore the existing 3D '+title.toLowerCase()+' with manual instruments, guided access, clickable anatomy and optional hand tracking.',build(host){
      const help=document.createElement('p');help.className='ln-dissection-help';help.textContent='Use the theatre’s instruments to open access layers, select a structure, and inspect its function. The theatre includes its own guided tutor and camera controls. Record observations in the notebook below.';host.append(help);
      const iframe=document.createElement('iframe');iframe.className='ln-stage-iframe';iframe.title=title+' virtual dissection';iframe.allow='camera; fullscreen; xr-spatial-tracking';iframe.src='./lab.html?instant=1';host.append(iframe);
      let stopped=false,attempt=0,timer=null,ready=false,failed=false;
      function connect(){
        if(stopped)return;
        try{
          const api=iframe.contentWindow.__LAB;
          if(api?.ok===false){failed=true;help.textContent='The 3D theatre could not start in this browser. '+(api.error||'Try reloading the bench or opening the Dissection Theatre directly.');return;}
          if(api?.ok&&api.loadSpecimen){
            // startApp has finished its default frog setup before ok becomes true.
            if(specimen!=='frog')api.loadSpecimen(specimen);
            if(Array.isArray(api.parts)&&api.parts.length){ready=true;return;}
          }
        }catch(_){}
        if(attempt++<150)timer=setTimeout(connect,200);
        else{failed=true;help.textContent='The 3D theatre did not finish loading. Reload this bench, or open the Dissection Theatre from the app navigation.';}
      }
      iframe.addEventListener('load',connect,{once:true});
      return {
        snapshot(){
          if(!ready)return{variables:{'Requested specimen':title},measurements:{'Theatre status':failed?'Unavailable':'Loading'},stage:failed?'Theatre unavailable':'Theatre loading'};
          try{
            const api=iframe.contentWindow.__LAB,parts=Array.isArray(api.parts)?api.parts:[],state=api.dissection?.state;
            const actual=iframe.contentDocument.querySelector('#specbtn .specname')?.textContent.trim()||title;
            const selected=parts.find(p=>p.id===api.dissection?.hovered);
            return{variables:{Specimen:actual,Instrument:api.tool||'probe'},measurements:{'Available anatomical structures':parts.length,'Pinned structures':state?.pinned?.size||0,'Incisions':state?.incisions?.size||0,'Opened structures':state?.opened?.size||0,'Removed structures':state?.removed?.size||0,'Deepest revealed layer':state?.maxLayerRevealed||0,'Selected structure':selected?.name||'None'},stage:selected?'Inspecting '+selected.name:'Explore anatomy',actions:selected?['Inspect '+selected.name+': '+(selected.note||'')]:[]};
          }catch(_){return{variables:{'Requested specimen':title},measurements:{'Theatre status':'Unavailable'},stage:'Theatre unavailable'};}
        },
        capture(){
          return new Promise((resolve,reject)=>{
            if(!ready||stopped){reject(new Error('Wait for the 3D theatre to finish loading before capturing.'));return;}
            try{
              const api=iframe.contentWindow.__LAB,canvas=iframe.contentDocument.querySelector('#stage canvas');
              if(!canvas){reject(new Error('No specimen canvas is available to capture.'));return;}
              // WebGL does not preserve its buffer: draw once immediately before
              // requesting the browser-native bitmap, without changing the scene.
              api.environment()?.render();
              canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('The browser could not capture this 3D view.')),'image/png');
            }catch(_){reject(new Error('The browser could not capture this 3D view. Export your written observations instead.'));}
          });
        },
        dispose(){stopped=true;clearTimeout(timer);iframe.src='about:blank';iframe.remove();}
      };
    }});
  });
  window.BIO_LAB_META=meta;
})();
