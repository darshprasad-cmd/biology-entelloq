/* First-paint, device-local study preferences. No analytics, identity or mastery inference. */
(function (root) {
  'use strict';
  const DATA = root.BIO_CBSE_DATA, KEY = 'bioq.cbse.profile.v1', SKIP = 'bioq.cbse.skip.v1';
  const goals = {foundations:'Build understanding',revision:'Revise a chapter',practice:'Practise retrieval'};
  function valid(value) {
    if (!value || value.version !== 1 || !Object.hasOwn(DATA.courses,value.classYear) || !Object.hasOwn(goals,value.goal) || ![10,20,30].includes(value.minutes)) return null;
    const course=DATA.courses[value.classYear];
    if (!course.units.some(unit=>unit.id===value.focus)) return null;
    return {version:1,classYear:String(value.classYear),goal:value.goal,minutes:value.minutes,focus:value.focus};
  }
  function storageGet(key) {try{return root.localStorage.getItem(key);}catch(_){return null;}}
  function read() {try{return valid(JSON.parse(storageGet(KEY)));}catch(_){return null;}}
  function save(value) {const clean=valid(value);if(!clean)return false;try{root.localStorage.setItem(KEY,JSON.stringify(clean));root.localStorage.removeItem(SKIP);return true;}catch(_){return false;}}
  const api = {valid,read,save,KEY}; root.BioCBSE = api;
  if (!root.document) return;
  const doc=root.document, dialog=doc.getElementById('bio-cbse');
  if (!dialog) return;
  const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const requestedClass=()=>/^#cbse:?(9|10|11|12)?(?:\/practicals(?:\/[a-z0-9-]+)?)?$/.exec(root.location.hash)?.[1]||'';
  const isCBSE=()=>/^#cbse(?::(?:9|10|11|12))?(?:\/practicals(?:\/[a-z0-9-]+)?)?$/.test(root.location.hash);
  let profile=read(), priorFocus=null, openMode='', viewedClass=requestedClass()||profile?.classYear||'9';
  const incoming=root.location.hash && root.location.hash!=='#home' && !isCBSE() ? root.location.hash : '';
  let pendingIncoming=incoming;
  const choices=(name,values,current)=>'<div class="cbse-choices">'+values.map(([value,label])=>'<label class="cbse-choice"><input type="radio" name="'+name+'" value="'+value+'" '+(String(current)===String(value)?'checked':'')+' required><span>'+label+'</span></label>').join('')+'</div>';
  const brand='<div class="cbse-brand"><strong>ENTELLOQ <span>BIOLOGY</span></strong><span>CBSE · 2026–27</span></div>';
  function show(html,mode) {
    if (!dialog.open) priorFocus=doc.activeElement;
    openMode=mode;dialog.innerHTML='<div class="cbse-inner">'+brand+html+'</div>';
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop=0;
    dialog.querySelector('h1').focus({preventScroll:true});
  }
  function close() {dialog.close();openMode='';if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});}
  function go(hash) {close();if(root.location.hash!==hash)root.location.hash=hash;else root.dispatchEvent(new root.HashChangeEvent('hashchange'));}
  function unitOptions(year,selected) {return DATA.courses[year].units.map(unit=>'<option value="'+unit.id+'" '+(unit.id===selected?'selected':'')+'>'+escape(unit.title)+'</option>').join('');}
  function questionnaire(editing=false) {
    const value=profile||{classYear:viewedClass,goal:'foundations',minutes:20,focus:DATA.courses[viewedClass].units[0].id};
    show('<p class="cbse-kicker">Your biology, your starting point</p><h1 tabindex="-1">Let’s make this workspace yours.</h1><p class="cbse-muted">Four quick choices. We’ll suggest a class-specific study route, while keeping every other part of Entelloq open to you.</p><div class="cbse-layout"><form class="cbse-form" id="cbse-form"><fieldset><legend>1. Which class are you studying?</legend>'+choices('classYear',[['9','Class 9'],['10','Class 10'],['11','Class 11'],['12','Class 12']],value.classYear)+'</fieldset><fieldset><legend>2. What would help today?</legend>'+choices('goal',Object.entries(goals),value.goal)+'</fieldset><fieldset><legend>3. How long is this session?</legend>'+choices('minutes',[[10,'10 minutes'],[20,'20 minutes'],[30,'30 minutes']],value.minutes)+'</fieldset><fieldset><legend><label for="cbse-focus">4. Where would you like to start?</label></legend><select id="cbse-focus" name="focus">'+unitOptions(value.classYear,value.focus)+'</select></fieldset><div class="cbse-actions"><button class="cbse-primary" type="submit">'+(editing?'Save my preferences':'Build my study space')+'</button><button type="button" class="cbse-quiet" data-action="skip">'+(editing?'Cancel':'Skip for now')+'</button></div><p id="cbse-feedback" role="status"></p></form><aside class="cbse-aside"><strong>A starting point, not a score.</strong><p>Your choices guide recommendations. They don’t measure mastery or limit what you can explore.</p><strong>Private to this browser.</strong><p>No name, birthday, school or account required. These preferences stay on this device. You can change them later.</p><p>Physics has its own separate workspace and locally saved preferences.</p><a href="https://physics.entelloq.com/">Go to Physics Entelloq ↗</a></aside></div>','questionnaire');
    const sibling=dialog.querySelector('.cbse-aside a');
    sibling.href='https://physics.entelloq.com/#cbse:'+value.classYear;
    dialog.querySelectorAll('input[name=classYear]').forEach(input=>input.addEventListener('change',()=>{dialog.querySelector('#cbse-focus').innerHTML=unitOptions(input.value,'');sibling.href='https://physics.entelloq.com/#cbse:'+input.value;}));
    dialog.querySelector('#cbse-form').addEventListener('submit',event=>{
      event.preventDefault();const form=new FormData(event.currentTarget);
      profile=valid({version:1,classYear:form.get('classYear'),goal:form.get('goal'),minutes:Number(form.get('minutes')),focus:form.get('focus')});
      if(!profile)return;const stored=save(profile);viewedClass=profile.classYear;
      if(pendingIncoming){const route=pendingIncoming;pendingIncoming='';go(route);return;}
      if(root.BioCBSEPracticals?.parse(root.location.hash)){openCBSE();return;}
      dashboard(viewedClass,stored?'':'Preferences could not be saved by this browser. Your current session still works.');
    });
    dialog.querySelector('[data-action=skip]').onclick=()=>{
      if(editing){if(profile)dashboard(profile.classYear);else close();return;}
      try{root.localStorage.setItem(SKIP,'1');}catch(_){}
      const route=pendingIncoming;pendingIncoming='';if(route)go(route);else if(isCBSE())openCBSE();else close();
    };
  }
  function topicLabel(id) {return id.split('-').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ').replace(/Dna/g,'DNA').replace(/Pcr/g,'PCR').replace(/Atp/g,'ATP');}
  function route(id,practice=false){return '#'+(practice?'solve/learn/':'learn/topic/')+id+'/'+(!practice&&profile?.goal==='revision'?'visual':'layman');}
  function dashboard(year=profile?.classYear||viewedClass,message='') {
    viewedClass=DATA.courses[year]?String(year):'9';const course=DATA.courses[viewedClass];
    const selected=profile?.classYear===viewedClass?course.units.find(unit=>unit.id===profile.focus):course.units[0];
    const first=selected.topics[0],goal=profile?.goal||'foundations',minutes=profile?.minutes||20;
    const readMinutes=minutes===10?5:minutes===20?10:15, recallMinutes=minutes===10?3:minutes===20?6:10;
    const action=goal==='practice'?'Start with a retrieval check':goal==='revision'?'Revisit the visual explanation':'Start with the explanation';
    show('<p class="cbse-kicker">Separate curriculum workspace</p><h1 tabindex="-1">'+escape(course.title)+'</h1><p class="cbse-muted">A clear starting route through existing lessons. General exploration stays separate, and nothing here changes your notes or learning history.</p><div class="cbse-actions"><button data-action="edit">'+(profile?'Edit my preferences':'Personalise my route')+'</button><button data-action="explore" class="cbse-quiet">General biology library</button><a class="cbse-button cbse-quiet" href="https://physics.entelloq.com/">Separate Physics section ↗</a><button data-action="close" class="cbse-quiet" aria-label="Close CBSE workspace">Close ×</button></div><nav class="cbse-tabs" aria-label="CBSE biology classes">'+Object.keys(DATA.courses).map(key=>'<button data-class="'+key+'" aria-pressed="'+(viewedClass===key)+'">Class '+key+'</button>').join('')+'</nav><p id="cbse-feedback" role="status">'+escape(message)+'</p><section class="cbse-plan" aria-label="Suggested study session"><p class="cbse-kicker">'+minutes+'-minute suggestion · '+escape(goals[goal])+'</p><h2>'+escape(selected.title)+'</h2><p>Based on your choices, not an assessment of your ability. Adjust the pace as needed.</p><ol><li>'+readMinutes+' min: read '+escape(topicLabel(first))+' and connect the visual steps.</li><li>'+recallMinutes+' min: recall the idea without looking, then try its practice questions.</li><li>'+(minutes-readMinutes-recallMinutes)+' min: explain one mistake or uncertainty in your own words.</li></ol><a class="cbse-button cbse-primary" data-route="'+route(first,goal==='practice')+'" href="'+route(first,goal==='practice')+'">'+action+'</a></section><p class="cbse-notice">'+escape(course.note)+'</p><h2>Unit resource map</h2><p class="cbse-muted">Supporting resources only · no unit is labelled complete. Course-specific gaps are shown below; listed lessons may go beyond your class depth. Practical simulations do not replace required hands-on school work.</p><div class="cbse-grid">'+course.units.map(unit=>'<article class="cbse-unit"><p class="cbse-kicker">Supporting lessons available</p><h3>'+escape(unit.title)+'</h3><ul>'+unit.topics.map(id=>'<li><a data-route="'+route(id)+'" href="'+route(id)+'">'+escape(topicLabel(id))+'</a></li>').join('')+'</ul><p class="cbse-gap"><strong>Still to complete:</strong> '+escape(unit.gap)+'</p></article>').join('')+'</div><footer class="cbse-footer"><p>Mapping source: <a href="'+course.source+'" target="_blank" rel="noopener">Official CBSE 2026–27 syllabus (PDF) ↗</a>. This independent resource map is not CBSE endorsement or a full syllabus-completion audit.</p><button class="cbse-quiet" data-action="reset">Reset only study preferences</button><p>Reset does not delete lesson notes, practice history or laboratory records.</p></footer>','dashboard');
    dialog.querySelector('.cbse-actions a').href='https://physics.entelloq.com/#cbse:'+viewedClass;
    if(root.BioCBSEPracticals){const practicalButton=doc.createElement('button');practicalButton.type='button';practicalButton.textContent='Practical preparation';practicalButton.className='cbse-primary';practicalButton.dataset.action='practicals';practicalButton.onclick=()=>go(root.BioCBSEPracticals.path(viewedClass));dialog.querySelector('.cbse-actions').prepend(practicalButton);}
    dialog.querySelectorAll('[data-class]').forEach(button=>button.onclick=()=>dashboard(button.dataset.class));
    dialog.querySelectorAll('[data-route]').forEach(link=>link.onclick=event=>{event.preventDefault();pendingIncoming='';go(link.dataset.route);});
    dialog.querySelector('[data-action=edit]').onclick=()=>questionnaire(true);
    dialog.querySelector('[data-action=explore]').onclick=()=>go('#learn');
    dialog.querySelector('[data-action=close]').onclick=()=>{if(isCBSE())go('#home');else close();};
    dialog.querySelector('[data-action=reset]').onclick=()=>{try{root.localStorage.removeItem(KEY);root.localStorage.removeItem(SKIP);}catch(_){}profile=null;questionnaire(true);};
  }
  function openCBSE(){
    const practical=root.BioCBSEPracticals?.parse(root.location.hash);
    if(!practical){dashboard(requestedClass()||profile?.classYear||viewedClass);return;}
    viewedClass=String(practical.year);
    show('<div id="cbse-practicals"><h1 tabindex="-1">Practical preparation</h1></div>','practicals');
    root.BioCBSEPracticals.render(dialog.querySelector('#cbse-practicals'),{...practical,
      onNavigate:(year,id)=>go(root.BioCBSEPracticals.path(year,id)),
      onBack:year=>go('#cbse:'+year),onLab:id=>go('#labs/'+id)});
  }
  api.openQuestionnaire=()=>questionnaire(true);api.openDashboard=()=>dashboard();
  dialog.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const controls=[...dialog.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')].filter(node=>!node.disabled&&!node.closest('[hidden]'));
    const first=controls[0],last=controls[controls.length-1];
    if(!first)return;
    if(event.shiftKey&&(doc.activeElement===first||doc.activeElement===dialog.querySelector('h1'))){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}
  });
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(openMode==='questionnaire'){const skip=dialog.querySelector('[data-action=skip]');skip?.click();}else{dialog.querySelector('[data-action=close]')?.click();}});
  root.addEventListener('hashchange',()=>{if(isCBSE())openCBSE();});
  const skipped=storageGet(SKIP)==='1';
  if(!profile&&!skipped)questionnaire();else if(isCBSE())openCBSE();else if(profile&&!root.location.hash)dashboard(profile.classYear);
})(typeof window === 'undefined' ? globalThis : window);
