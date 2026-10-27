/* First-paint, device-local study preferences. No analytics, identity or mastery inference. */
(function (root) {
  'use strict';
  const DATA = root.BIO_CBSE_DATA, KEY = 'bioq.cbse.profile.v1', SKIP = 'bioq.cbse.skip.v1';
  const goals = {foundations:'Build understanding',revision:'Revise a chapter',practice:'Practise retrieval'};
  let sessionProfile = null, savedStatus = null;
  function valid(value) {
    if (!value || value.version !== 1 || !Object.hasOwn(DATA.courses,value.classYear) || !Object.hasOwn(goals,value.goal) || ![10,20,30].includes(value.minutes)) return null;
    const course=DATA.courses[value.classYear];
    if (!course.units.some(unit=>unit.id===value.focus)) return null;
    return {version:1,classYear:String(value.classYear),goal:value.goal,minutes:value.minutes,focus:value.focus};
  }
  function storageGet(key) {try{return root.localStorage.getItem(key);}catch(_){return null;}}
  function read() {try{return valid(JSON.parse(storageGet(KEY)));}catch(_){return null;}}
  function save(value) {
    const clean=valid(value);if(!clean)return false;
    sessionProfile=clean;
    try{root.localStorage.setItem(KEY,JSON.stringify(clean));root.localStorage.removeItem(SKIP);savedStatus=true;}
    catch(_){savedStatus=false;}
    return savedStatus;
  }
  function reset() {
    let removed=true;
    try{root.localStorage.removeItem(KEY);root.localStorage.removeItem(SKIP);}catch(_){removed=false;}
    sessionProfile=null;savedStatus=null;
    return removed;
  }
  // This file runs before the package host. A share query or a restored history
  // entry must be understood before the manifest is downloaded and decoded.
  function currentRoute() {
    if(root.BioPortable)return root.BioPortable.getRoute();
    if(root.location?.hash)return root.location.hash;
    try{const query=new root.URL(root.location.href).searchParams;if(query.has('route')){const value=query.get('route');return value?'#'+value.replace(/^#/,''):'';}}catch(_){}
    const entry=root.history?.state?.__bioqPortable;
    return entry?.version===1&&typeof entry.route==='string'?entry.route:'';
  }
  const api = {valid,read,save,reset,KEY,currentRoute,getSession:()=>({profile:sessionProfile||read(),saved:savedStatus})};root.BioCBSE=api;
  if (!root.document) return;
  const doc=root.document, dialog=doc.getElementById('bio-cbse');
  if (!dialog) return;
  const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const requestedClass=()=>/^#(?:cbse:?|courses\/)(9|10|11|12)(?:\/|$)/.exec(currentRoute())?.[1]||'';
  const isCBSE=()=>/^#cbse(?::?(?:9|10|11|12))?(?:\/practicals(?:\/[a-z0-9-]+)?)?$/.test(currentRoute());
  let profile=read(),priorFocus=null,openMode='',practicalRoute='',viewedClass=requestedClass()||profile?.classYear||'9';
  const incoming=currentRoute();
  let pendingIncoming=incoming&&incoming!=='#home'&&!isCBSE()?incoming:'';
  const choices=(name,values,current)=>'<div class="cbse-choices">'+values.map(([value,label])=>'<label class="cbse-choice"><input type="radio" name="'+name+'" value="'+value+'" '+(String(current)===String(value)?'checked':'')+' required><span>'+label+'</span></label>').join('')+'</div>';
  const brand='<div class="cbse-brand"><strong>ENTELLOQ <span>BIOLOGY</span></strong><span>CBSE · 2026–27</span></div>';
  function show(html,mode) {
    if(!dialog.open)priorFocus=doc.activeElement;
    openMode=mode;dialog.innerHTML='<div class="cbse-inner">'+brand+html+'</div>';
    if(!dialog.open)dialog.showModal();
    dialog.scrollTop=0;dialog.querySelector('h1').focus({preventScroll:true});
  }
  function close() {
    if(dialog.open)dialog.close();openMode='';practicalRoute='';
    if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});
  }
  function go(hash,{replace=false}={}) {
    close();
    if(root.BioPortable){root.BioPortable.navigate(hash,{replace});return;}
    if(replace){
      const url=new root.URL(root.location.href);url.hash=hash;url.searchParams.delete('route');
      root.history.replaceState(root.history.state,'',url.href);
      root.dispatchEvent(new root.HashChangeEvent('hashchange'));
    }else if(root.location.hash!==hash)root.location.hash=hash;
    else root.dispatchEvent(new root.HashChangeEvent('hashchange'));
  }
  function unitOptions(year,selected) {return DATA.courses[year].units.map(unit=>'<option value="'+unit.id+'" '+(unit.id===selected?'selected':'')+'>'+escape(unit.title)+'</option>').join('');}
  function questionnaire(editing=false) {
    const value=profile||{classYear:viewedClass,goal:'foundations',minutes:20,focus:DATA.courses[viewedClass].units[0].id};
    show('<p class="cbse-kicker">Your biology, your starting point</p><h1 tabindex="-1">Let’s make this workspace yours.</h1><p class="cbse-muted">Four quick choices. Start with your class, while keeping every chapter, concept and experiment open to you.</p><div class="cbse-layout"><form class="cbse-form" id="cbse-form"><fieldset><legend>1. Which class are you studying?</legend>'+choices('classYear',[['9','Class 9'],['10','Class 10'],['11','Class 11'],['12','Class 12']],value.classYear)+'</fieldset><fieldset><legend>2. What would help today?</legend>'+choices('goal',Object.entries(goals),value.goal)+'</fieldset><fieldset><legend>3. How long is this session?</legend>'+choices('minutes',[[10,'10 minutes'],[20,'20 minutes'],[30,'30 minutes']],value.minutes)+'</fieldset><fieldset><legend><label for="cbse-focus">4. Where would you like to start?</label></legend><select id="cbse-focus" name="focus">'+unitOptions(value.classYear,value.focus)+'</select></fieldset><div class="cbse-actions"><button class="cbse-primary" type="submit">'+(editing?'Save my preferences':'Build my study space')+'</button><button type="button" class="cbse-quiet" data-action="skip">'+(editing?'Cancel':'Skip for now')+'</button></div><p id="cbse-feedback" role="status">'+(savedStatus===false?'Preferences could not be saved by this browser. Your current session still works.':'')+'</p>'+(editing?'<button class="cbse-quiet" type="button" data-action="reset">Reset only study preferences</button><p class="cbse-muted">Reset keeps chapter reflections, lesson history and laboratory notes.</p>':'')+'</form><aside class="cbse-aside"><strong>A starting point, not a score.</strong><p>Your choices guide your study route. They don’t measure mastery or limit what you can explore.</p><strong>Private to this browser.</strong><p>No name, birthday, school or account required. These preferences stay on this device. You can change them later.</p><p>Physics has its own separate workspace and locally saved preferences.</p><a href="https://physics.entelloq.com/">Go to Physics Entelloq ↗</a></aside></div>','questionnaire');
    const sibling=dialog.querySelector('.cbse-aside a');sibling.href='https://physics.entelloq.com/#cbse:'+value.classYear;
    dialog.querySelectorAll('input[name=classYear]').forEach(input=>input.addEventListener('change',()=>{dialog.querySelector('#cbse-focus').innerHTML=unitOptions(input.value,'');sibling.href='https://physics.entelloq.com/#cbse:'+input.value;}));
    dialog.querySelector('#cbse-form').addEventListener('submit',event=>{
      event.preventDefault();const form=new root.FormData(event.currentTarget);
      profile=valid({version:1,classYear:form.get('classYear'),goal:form.get('goal'),minutes:Number(form.get('minutes')),focus:form.get('focus')});
      if(!profile)return;save(profile);viewedClass=profile.classYear;
      const destination=pendingIncoming||(root.BioCBSEPracticals?.parse(currentRoute())?currentRoute():'#courses/'+viewedClass);
      pendingIncoming='';go(destination);
    });
    dialog.querySelector('[data-action=skip]').onclick=()=>{
      if(editing){close();return;}
      try{root.localStorage.setItem(SKIP,'1');}catch(_){}
      const destination=pendingIncoming;pendingIncoming='';close();
      if(destination)go(destination);else handleRoute();
    };
    const resetButton=dialog.querySelector('[data-action=reset]');
    if(resetButton)resetButton.onclick=()=>{const removed=reset();profile=null;questionnaire(true);if(!removed)dialog.querySelector('#cbse-feedback').textContent='This browser could not remove saved preferences. Your other work is unchanged.';};
  }
  function openPractical(practical) {
    const route=currentRoute();
    // Both native hashchange and the host event can describe the same entry.
    // Do not replace a live guide and lose an unsaved draft on the second event.
    if(openMode==='practicals'&&practicalRoute===route)return;
    viewedClass=String(practical.year);practicalRoute=route;
    show('<div id="cbse-practicals"><h1 tabindex="-1">Practical preparation</h1></div>','practicals');
    root.BioCBSEPracticals.render(dialog.querySelector('#cbse-practicals'),{...practical,
      onNavigate:(year,id)=>go(root.BioCBSEPracticals.path(year,id)),
      onBack:year=>go('#courses/'+year),onLab:id=>go('#labs/'+id)});
  }
  function handleRoute() {
    if(openMode==='questionnaire')return;
    const practical=root.BioCBSEPracticals?.parse(currentRoute());
    if(practical){openPractical(practical);return;}
    if(isCBSE()){go('#courses/'+(requestedClass()||profile?.classYear||viewedClass),{replace:true});return;}
    if(openMode==='practicals')close();
  }
  api.openQuestionnaire=()=>{pendingIncoming='';questionnaire(true);};
  api.openDashboard=()=>go('#courses/'+(profile?.classYear||viewedClass));
  dialog.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const controls=[...dialog.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')].filter(node=>!node.disabled&&!node.closest('[hidden]'));
    const first=controls[0],last=controls[controls.length-1];if(!first)return;
    if(event.shiftKey&&(doc.activeElement===first||doc.activeElement===dialog.querySelector('h1'))){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}
  });
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(openMode==='questionnaire')dialog.querySelector('[data-action=skip]')?.click();else dialog.querySelector('[data-action=close]')?.click();});
  root.addEventListener('hashchange',handleRoute);
  root.addEventListener('bioq:routechange',handleRoute);
  const skipped=storageGet(SKIP)==='1';
  if(!profile&&!skipped)questionnaire();else handleRoute();
})(typeof window === 'undefined' ? globalThis : window);
