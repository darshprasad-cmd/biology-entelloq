/* Biology Explore: real, lazy Mol* rendering of a small allowlist of PDB entries. */
(function () {
  'use strict';
  const section = document.getElementById('proteins');
  if (!section) return;
  const $ = id => document.getElementById('pa-' + id);
  const structures = {
    '1CRN': {name:'Crambin',resolution:'1.50 Å',organism:'Crambe hispanica',local:true,
      notes:'A compact 46-residue plant protein. Look for helices, a small sheet and the turns that connect them.',
      question:'Compare the ribbon and atom views. The ribbon makes the backbone fold easier to follow; the atom view shows the recorded positions that the ribbon summarizes.'},
    '1STP': {name:'Streptavidin + biotin',resolution:'2.60 Å',organism:'Streptomyces avidinii',ligand:'BTN',
      notes:'The deposited biotin ligand sits in a pocket of streptavidin. This view shows the first deposited model, not an automatically generated biological assembly.',
      question:'Focus the BTN ligand, then switch to atoms. Which parts of the surrounding protein enclose it? A pocket suggests how a molecule fits; the image alone does not measure how tightly it binds.'},
    '1HHO': {name:'Oxyhaemoglobin',resolution:'2.10 Å',organism:'Homo sapiens',ligand:'HEM',
      notes:'An experimental human oxyhaemoglobin structure containing heme groups. The deposited model includes an alpha and a beta chain; a full biological tetramer is not generated here.',
      question:'Focus HEM to inspect the heme groups. In the atom view, hover a position to read its identity. Distinguish the small heme cofactor from the much larger folded protein chain.'}
  };
  let selected = '1CRN', viewer = null, controller = null, serial = 0, engine = null;
  let loaded = false, busy = false, currentMode = 'polymer-and-ligand';
  const choices = [...section.querySelectorAll('[data-pa-protein]')];
  const modes = [...section.querySelectorAll('[data-pa-mode]')];
  function controls() {
    modes.forEach(button => {button.disabled = busy || !loaded;button.setAttribute('aria-pressed',String(button.dataset.paMode === currentMode));});
    $('reset').disabled = busy || !loaded;
    $('ligand').disabled = busy || !loaded;
    $('load').disabled = busy;
    section.setAttribute('aria-busy', String(busy));
  }
  function status(text) {$('status').textContent = text;}
  function remember() {try {parent.BioAppContext?.remember('explore','proteins');} catch (_) {}}
  function cover(title,note,retry=false) {
    $('cover').hidden = false;$('cover').dataset.error = String(retry);
    $('cover-title').textContent = title;$('cover-note').textContent = note;
    $('load').hidden = !retry;$('load').textContent = 'Retry this structure';
  }
  function loadEngine() {
    if (engine) return engine;
    engine = new Promise((resolve,reject) => {
      if (window.molstar) {resolve(window.molstar);return;}
      if (!document.querySelector('[data-protein-css]')) {
        const css = document.createElement('link');css.rel='stylesheet';css.href='./assets/protein/vendor/molstar.css';css.dataset.proteinCss='true';document.head.append(css);
      }
      // Fetch through the package's existing deferred-asset boundary. A direct
      // script URL would bypass the portable file while its payload is waiting.
      const script = document.createElement('script');script.async=true;
      const request = new AbortController();let scriptUrl=null,settled=false;
      const timer = setTimeout(() => fail(),30000);
      function cleanup() {clearTimeout(timer);if(scriptUrl)URL.revokeObjectURL(scriptUrl);}
      function fail() {if(settled)return;settled=true;request.abort();cleanup();script.remove();engine=null;reject(new Error('The included 3D engine could not load. Retry, or reopen Biology Entelloq.'));}
      script.onerror=fail;script.onload=() => {if(!window.molstar){fail();return;}settled=true;cleanup();resolve(window.molstar);};
      fetch('./assets/protein/vendor/molstar.js',{signal:request.signal}).then(response=>{
        if(!response.ok)throw new Error('Renderer unavailable');return response.blob();
      }).then(blob=>{if(settled)return;scriptUrl=URL.createObjectURL(blob);script.src=scriptUrl;document.head.append(script);}).catch(fail);
    });
    return engine;
  }
  function stop() {serial++;controller?.abort();controller=null;viewer?.dispose();viewer=null;loaded=false;$('stage').dataset.loaded='false';}
  function theme() {
    const light = document.documentElement.dataset.theme === 'light';
    viewer?.plugin.canvas3d?.setProps({renderer:{backgroundColor:light ? 0xebece3 : 0x0e1413}});
  }
  async function open(id) {
    if (!Object.hasOwn(structures,id)) return;
    stop();const run=serial;selected=id;busy=true;currentMode='polymer-and-ligand';
    const data=structures[id];
    $('id').textContent='PDB '+id;$('name').textContent=data.name;$('resolution').textContent=data.resolution;$('organism').textContent=data.organism;
    $('notes').textContent=data.notes;$('question').textContent=data.question;$('origin').textContent=data.local?'Included offline':'From RCSB PDB';
    $('source').href='https://www.rcsb.org/structure/'+id;$('ligand').hidden=!data.ligand;$('ligand').textContent='Focus '+(data.ligand||'')+' ligand';
    $('key').hidden=false;choices.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.paProtein===id)));
    cover('Opening '+data.name+'…',data.local?'Reading coordinates included in Biology Entelloq.':'Fetching experimental coordinates from RCSB PDB.');
    status('Loading the 3D viewer…');controls();remember();
    try {
      const molstar=await loadEngine();if(run!==serial)return;
      const instance=await molstar.Viewer.create($('host'),{
        layoutIsExpanded:false,layoutShowControls:false,layoutShowRemoteState:false,layoutShowSequence:false,layoutShowLog:false,layoutShowLeftPanel:false,
        viewportShowExpand:false,viewportShowControls:false,viewportShowSettings:false,viewportShowSelectionMode:false,viewportShowAnimation:false,viewportShowScreenshotControls:false,
        viewportBackgroundColor:document.documentElement.dataset.theme==='light'?'#ebece3':'#0e1413',volumeStreamingDisabled:true,extensions:[],
        allowMajorPerformanceCaveat:true,pixelScale:1,illumination:false,
      });
      if(run!==serial){instance.dispose();return;}viewer=instance;
      controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),20000);
      let pdb;
      try {
        const response=await fetch(data.local?'./assets/protein/1CRN.pdb.txt':'https://files.rcsb.org/download/'+id+'.pdb',{signal:controller.signal});
        if(!response.ok)throw new Error('Coordinates could not load ('+response.status+').');
        pdb=await response.text();
      } finally {clearTimeout(timer);}
      if(run!==serial)return;
      if(pdb.length>5000000||!/^ATOM  /m.test(pdb))throw new Error('The coordinate file was empty or unsupported.');
      const raw=await instance.plugin.builders.data.rawData({data:pdb,label:id+' · RCSB PDB'});
      if(run!==serial)return;
      const trajectory=await instance.plugin.builders.structure.parseTrajectory(raw,'pdb');
      if(run!==serial)return;
      await instance.plugin.builders.structure.hierarchy.applyPreset(trajectory,'default',{
        structure:{name:'model',params:{}},showUnitcell:false,representationPreset:'polymer-and-ligand',representationPresetParams:{theme:{globalName:'secondary-structure'}},
      });
      if(run!==serial)return;
      const count=instance.plugin.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data.elementCount||0;
      if(!count)throw new Error('No atoms were found in the experimental coordinates.');
      instance.plugin.managers.camera.reset(undefined,0);loaded=true;busy=false;$('cover').hidden=true;
      $('stage').dataset.loaded='true';$('stage').dataset.atoms=String(count);$('stage').dataset.protein=id;
      status(id+' ready · '+count.toLocaleString()+' atoms loaded');controls();
    } catch(error) {
      if(run!==serial)return;
      viewer?.dispose();viewer=null;busy=false;loaded=false;
      cover('Structure unavailable',data.local?'This view needs WebGL. '+(error.message||'Retry the included structure.'):'Check your internet connection and retry, or choose Crambin to explore the included offline structure.',true);
      status('No structure loaded · '+(data.local?'viewer error':'RCSB request failed'));controls();
    }
  }
  async function representation(mode) {
    if(!viewer||busy||!loaded||!modes.some(button=>button.dataset.paMode===mode))return;
    const instance=viewer,run=serial;busy=true;controls();status('Updating representation…');
    try {
      const structure=instance.plugin.managers.structure.hierarchy.current.structures[0];
      await instance.plugin.managers.structure.component.clear([structure]);if(run!==serial)return;
      await instance.plugin.builders.structure.representation.applyPreset(structure.cell,mode,{theme:{globalName:mode==='atomic-detail'?'element-symbol':'secondary-structure'}});
      if(run!==serial)return;
      currentMode=mode;$('key').hidden=mode==='atomic-detail';$('stage').dataset.mode=mode;
      status(selected+' · '+modes.find(button=>button.dataset.paMode===mode).textContent+' view');
    }catch(error){if(run===serial)status('Representation unavailable. Reload the structure to retry.');}
    finally{if(run===serial){busy=false;controls();}}
  }
  $('load').addEventListener('click',()=>open(selected));
  choices.forEach(button=>button.addEventListener('click',()=>open(button.dataset.paProtein)));
  modes.forEach(button=>button.addEventListener('click',()=>representation(button.dataset.paMode)));
  $('reset').addEventListener('click',()=>{viewer?.plugin.managers.camera.reset(undefined,0);status(selected+' · view reset');});
  $('ligand').addEventListener('click',()=>{
    const ligand=structures[selected].ligand;if(!viewer||busy||!loaded||!ligand)return;
    viewer.structureInteractivity({elements:{label_comp_id:ligand},action:['select','focus'],focusOptions:{durationMs:0}});
    status(selected+' · '+ligand+' ligand selected and focused');
  });
  const themeObserver=new MutationObserver(theme);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  function deepLink() {if(location.hash==='#proteins'&&!viewer&&!busy)open(selected);}
  addEventListener('hashchange',deepLink);deepLink();
  addEventListener('pagehide',()=>{stop();themeObserver.disconnect();},{once:true});
})();
