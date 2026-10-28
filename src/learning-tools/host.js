/* Additive entries inside the existing Biology sections. Original section state
   stays mounted while a lazy tool is open and becomes visible again on return. */
(function(){
  'use strict';
  if(window.BiologyLearningTools)return;
  var script=document.currentScript,section=script&&script.dataset.section;
  var placements={solve:['review','sketches'],me:['review'],learn:['search','animations'],reason:['notebook','sketches'],labs:['kinetics','notebook','sketches'],explore:['volume']};
  if(!placements[section])return;
  var tools={
    review:{title:'Review queue',group:'learning',label:'Retrieve & revisit',copy:'Recall a Biology concept, reveal the explanation and schedule your next review.',note:'Your explicit retrieval rating sets the review timing. This is separate from assessment scores or a mastery claim.'},
    notebook:{title:'Experiment notebook',group:'learning',label:'Keep the evidence',copy:'Keep predictions, observations and conclusions together. Export notes to share them.',note:'Notes stay in this browser. Sharing is through a document file or tabs on the same browser and site, not an online classroom. Export notes you want to keep before clearing browser data.'},
    search:{title:'Concept search',group:'learning',label:'Connect the ideas',copy:'Find an explanation in a curated collection of Biology concepts.',note:'The semantic model downloads only when you enable it. Search returns lesson suggestions, not generated scientific answers.'},
    kinetics:{title:'Biochemical dynamics',group:'biology',label:'Change a mechanism',copy:'Run a documented enzyme model and compare how concentrations change over time.',note:'New simulations use the local Tellurium companion. Model assumptions, units and connection status are shown in the workbench.'},
    volume:{title:'Microscopy volume',group:'biology',label:'Explore in three dimensions',copy:'Move through a real microscopy stack and compare labelled channels and physical scales.',note:'Dataset provenance and voxel spacing are supplied in the viewer. This educational view is not a diagnostic tool.'},
    sketches:{title:'Scientific sketchbook',group:'sketches',label:'Draw your explanation',copy:'Sketch a cell, connect a process and keep an editable diagram beside your reasoning.',note:'Sketches are your visual explanations, not computed models. Export an editable scene to keep a separate copy of your work.'},
    animations:{title:'Animated explanations',group:'animations',label:'Watch the mechanism',copy:'Follow an authored enzyme explanation, revisit a step and read its transcript.',note:'These are authored explanations rendered with Manim. They illustrate a mechanism; they are not live simulations or experimental recordings.'}
  };
  var hints={review:'Your rating schedules the next review; it is not an assessment score.',notebook:'Saved in this browser. Export a copy to keep or share.',search:'Search the curated concepts. Optional semantic search stays off until you enable it.',kinetics:'A new simulation requires the local companion. Check its connection in the tool.',volume:'Real microscopy data, with labelled channels and physical scales.',sketches:'An editable drawing, saved in this browser. Export a copy to keep or share.',animations:'Authored film: captions, transcript and stills.'};
  var sections={solve:['Solve','Build your answer.','Revisit a concept or draw the reasoning behind your answer.'],me:['Me','Keep concepts fresh.','Return to ideas you have met and decide what needs another look.'],learn:['Learn','Look at the idea another way.','Find a concept or follow an explanation one step at a time.'],reason:['Reason','Make your reasoning visible.','Keep the evidence alongside a diagram of your explanation.'],labs:['Labs','Plan, test and record.','Explore a model, keep observations and draw what you predict.'],explore:['Explore','Look a little closer.','Inspect real data and connect its details to the wider idea.']};
  var roots={biology:'#biology-next',learning:'[data-learning-entry]',sketches:'#sketch-app',animations:'#animation-app'};
  var original=document.querySelector('main');if(!original)return;
  var entry=document.createElement('section');entry.className='bql-entry';entry.setAttribute('aria-label','Biology learning tools');entry.dataset.count=placements[section].length;
  var title=document.createElement('h2');title.textContent=sections[section][1];entry.appendChild(title);
  var intro=document.createElement('p');intro.textContent=sections[section][2];entry.appendChild(intro);
  var cards=document.createElement('div');cards.className='bql-cards';entry.appendChild(cards);
  placements[section].forEach(function(id){
    var t=tools[id],button=document.createElement('button');button.className='bql-card';button.type='button';button.dataset.learningOpen=id;
    [['small',t.label],['strong',t.title],['span',t.copy]].forEach(function(pair,index){
      var el=document.createElement(pair[0]);el.textContent=pair[1];
      if(index===1){el.id='bql-title-'+id;button.setAttribute('aria-labelledby',el.id);}
      if(index===2){el.id='bql-copy-'+id;button.setAttribute('aria-describedby',el.id);}
      button.appendChild(el);
    });
    button.onclick=function(){open(id,true);};cards.appendChild(button);
  });
  var workspace=document.createElement('section');workspace.className='bql-workspace';workspace.setAttribute('aria-labelledby','bql-workspace-title');workspace.hidden=true;entry.appendChild(workspace);
  // The catalogue is the entry point; additional tools follow it. Opening a
  // tool still focuses and scrolls its workspace into view.
  if(section==='learn'||section==='labs')original.append(entry);else original.prepend(entry);
  var active=null,child=null,timer=null,observer=null,sizeObserver=null,hidden=[],guide=null;
  function fitFrame(){
    if(!child||workspace.hidden)return;
    var frame=child.getBoundingClientRect(),bottom=innerHeight-16,scope=window,offsetX=0,offsetY=0;
    // The existing app controls float above embedded sections. Keep the tool's
    // bottom edge above visible controls, including the portable outer frame.
    try{while(scope){
      scope.document.querySelectorAll('#eqx-fab,#bioq-ai-launch').forEach(function(control){
        var rect=control.getBoundingClientRect(),style=scope.getComputedStyle(control);
        if(rect.width&&rect.height&&style.visibility!=='hidden'&&style.display!=='none'&&Number(style.opacity)!==0&&rect.bottom>0&&rect.top<scope.innerHeight&&rect.right-offsetX>frame.left&&rect.left-offsetX<frame.right){bottom=Math.min(bottom,rect.top-offsetY-12);}
      });
      if(scope===scope.parent||!scope.frameElement)break;
      var outer=scope.frameElement.getBoundingClientRect();offsetX+=outer.left;offsetY+=outer.top;scope=scope.parent;
    }}catch(e){/* A standalone cross-origin embed uses its own viewport. */}
    child.style.height=Math.max(320,Math.floor(bottom-Math.max(0,frame.top)))+'px';
  }
  addEventListener('resize',fitFrame);
  function returnShortcut(e){
    if(active&&!guide&&e.altKey&&(e.key==='Escape'||(e.shiftKey&&e.key==='ArrowLeft'))){e.preventDefault();back(true);}
  }
  document.addEventListener('keydown',returnShortcut,true);
  function theme(){return document.documentElement.dataset.theme==='light'?'light':'dark';}
  function tokens(){var style=getComputedStyle(document.documentElement);function read(name,fallback){return style.getPropertyValue(name).trim()||fallback;}return {accent:read('--em','#34d399'),background:read('--bg','#080b0d'),surface:read('--panel','#0b1117'),text:read('--ink','#eaf2f5'),muted:read('--dim','#9fb2bc'),border:read('--line',read('--hair','#3b5057'))};}
  function pause(){if(!child)return;try{var player=child.contentWindow.EntelloqAnimations;if(player&&player.pause)player.pause();child.contentDocument.querySelectorAll('video,audio').forEach(function(media){media.pause();});}catch(e){}}
  function sync(){
    if(!child)return;
    var message={type:'entelloq-learning:theme',theme:theme(),tokens:tokens()};
    child.contentWindow.postMessage(message,location.origin==='null'?'*':location.origin);
    child.contentWindow.postMessage({type:'entelloq:theme',theme:theme(),tokens:tokens()},location.origin==='null'?'*':location.origin);
    try{child.contentDocument.documentElement.dataset.theme=theme();var panel=child.contentDocument.querySelector('.bn'),style=getComputedStyle(document.documentElement);if(panel)['--bg','--panel','--raise','--ink','--dim','--line','--em'].forEach(function(name){var value=style.getPropertyValue(name).trim();if(value)panel.style.setProperty(name,value);});}catch(e){}
  }
  function clear(){
    if(guide){var closed=guide;guide=null;closed.close();closed.remove();}
    clearTimeout(timer);timer=null;
    if(observer){observer.disconnect();observer=null;}
    if(sizeObserver){sizeObserver.disconnect();sizeObserver=null;}
    if(child){try{if(child.contentWindow.EntelloqSketch)child.contentWindow.EntelloqSketch.destroy();if(child.contentWindow.EntelloqAnimations)child.contentWindow.EntelloqAnimations.destroy();child.contentDocument.querySelectorAll('video,audio').forEach(function(media){media.pause();});}catch(e){}child.remove();child=null;}
  }
  function setStatus(text,state){
    var el=workspace.querySelector('[role=status]');
    if(el){el.textContent=text;el.dataset.error=state==='error'?'true':'false';el.dataset.state=state;workspace.querySelector('[data-frame]').setAttribute('aria-busy',String(state==='loading'));requestAnimationFrame(fitFrame);}
  }
  function showGuide(){
    guide=document.createElement('dialog');guide.className='bql-guide';guide.setAttribute('aria-label','Learning tools sources and setup');guide.innerHTML='<button type="button">Close sources</button>';
    var guideFrame=document.createElement('iframe');guideFrame.title='Learning tools sources and setup';guideFrame.src='src/learning-tools/guide.html';guide.appendChild(guideFrame);document.body.appendChild(guide);
    guide.querySelector('button').onclick=function(){guide.close();};
    var opened=guide;guide.addEventListener('close',function(){if(guide!==opened)return;guide=null;opened.remove();workspace.querySelector('[data-guide]')?.focus();},{once:true});guide.showModal();
  }
  function open(id,push){
    if(placements[section].indexOf(id)<0)return;
    clear();var t=tools[id];active=id;
    if(!hidden.length){Array.from(original.children).forEach(function(node){if(node!==entry&&!node.hidden){hidden.push(node);node.hidden=true;}});}
    cards.hidden=true;title.hidden=true;intro.hidden=true;workspace.hidden=false;entry.dataset.open='true';
    workspace.innerHTML='<div class="bql-toolbar"><button type="button" data-back aria-keyshortcuts="Alt+Escape Alt+Shift+ArrowLeft"></button><h2 id="bql-workspace-title" tabindex="-1"></h2><div class="bql-actions"><button type="button" data-guide>Sources & setup</button><button type="button" data-reload>Reload</button></div></div><p id="bql-tool-note" data-hint></p><p class="bql-status" role="status" aria-atomic="true"></p><div data-frame aria-busy="true"></div><div class="bql-footer"><details class="bql-context"><summary>About this tool</summary><p data-note></p></details><span>Alt + Esc returns to '+sections[section][0]+'.</span></div>';
    workspace.querySelector('h2').textContent=t.title;workspace.querySelector('[data-hint]').textContent=hints[id];workspace.querySelector('[data-note]').textContent=t.note;
    var backButton=workspace.querySelector('[data-back]');backButton.textContent='← '+sections[section][0];backButton.setAttribute('aria-label','Back to '+sections[section][0]);backButton.onclick=function(){back(true);};
    workspace.querySelector('[data-reload]').onclick=function(){open(id,false);};workspace.querySelector('[data-guide]').onclick=showGuide;
    child=document.createElement('iframe');var current=child;child.className='bql-frame';child.title=t.title;child.setAttribute('aria-describedby','bql-tool-note');child.setAttribute('allow',"camera 'none'; microphone 'none'; geolocation 'none'");if(id==='animations')child.allowFullscreen=true;child.referrerPolicy='same-origin';
    child.onload=function(){
      if(child!==current)return;clearTimeout(timer);
      try{if(!child.contentDocument||!child.contentDocument.querySelector(roots[t.group]))throw Error('Missing document');sync();child.contentDocument.addEventListener('keydown',returnShortcut,true);setStatus(t.title+' ready.','ready');}
      catch(e){setStatus('This tool could not open. Try Reload, or return to '+sections[section][0]+'.','error');}
    };
    child.onerror=function(){if(child===current)setStatus('This tool could not load. Try Reload, or return to '+sections[section][0]+'.','error');};
    child.src='assets/learning-tools/'+t.group+'/index.html?subject=biology&panel='+id+'&theme='+theme();workspace.querySelector('[data-frame]').appendChild(child);setStatus('Opening '+t.title+'…','loading');
    observer=new MutationObserver(sync);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','style']});
    if(typeof ResizeObserver!=='undefined'){sizeObserver=new ResizeObserver(fitFrame);sizeObserver.observe(workspace.querySelector('.bql-toolbar'));sizeObserver.observe(workspace.querySelector('[data-hint]'));}
    timer=setTimeout(function(){if(child===current)setStatus('This is taking longer than expected. Try Reload, or return to '+sections[section][0]+'.','error');},20000);
    if(push)history.pushState(null,'','#learning-'+id);workspace.querySelector('h2').focus({preventScroll:true});entry.scrollIntoView({block:'start',behavior:'instant'});requestAnimationFrame(fitFrame);
  }
  function back(push){
    var id=active;clear();active=null;workspace.hidden=true;delete entry.dataset.open;cards.hidden=false;title.hidden=false;intro.hidden=false;hidden.forEach(function(el){el.hidden=false;});hidden=[];
    if(push)history.pushState(null,'',location.pathname+location.search);var button=cards.querySelector('[data-learning-open="'+id+'"]');if(button)button.focus({preventScroll:true});
  }
  function route(){var m=/^#learning-([a-z]+)$/.exec(location.hash);if(m&&placements[section].indexOf(m[1])>=0){if(active!==m[1])open(m[1],false);}else if(active)back(false);}
  addEventListener('hashchange',route);addEventListener('popstate',route);addEventListener('pagehide',function(event){if(!event.persisted)clear();});
  window.BiologyLearningTools={open:function(id){open(id,true);},back:function(){back(true);},pause:pause};route();
})();
