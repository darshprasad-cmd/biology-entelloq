(function(){
  'use strict';
  var surface=document.getElementById('lnd'),hero=document.getElementById('bio-welcome'),story=document.getElementById('bio-cell-story'),cell=document.querySelector('.bio-cell-window'),buttons=Array.from(document.querySelectorAll('[data-organelle-button]')),description=document.getElementById('bio-cell-description'),menu=document.getElementById('bio-menu-toggle'),nav=document.getElementById('bio-launch-nav');
  // Keep the same control/handler outside the clipped hero throughout the story.
  surface.insertBefore(document.getElementById('bio-motion-toggle'),surface.querySelector('main'));
  var reduced=matchMedia('(prefers-reduced-motion: reduce)'),desktop=matchMedia('(min-width:801px)'),active=-1,manual=false,frame=0,inView=true;
  var content=[['The membrane defines a living boundary.','The cell membrane separates the cytoplasm from its surroundings and controls the exchange of many substances.'],['The nucleus holds most of the genetic instructions.','DNA in the nucleus provides instructions used in making proteins. The surrounding cytoplasm contains the machinery that reads and carries out those instructions.'],['Mitochondria connect respiration to cellular work.','Their folded inner membranes support reactions that produce much of the ATP in a typical aerobic animal cell. ATP transfers energy to many cellular processes.']];
  function paused(){return surface.dataset.motion==='paused'||reduced.matches;}
  function select(index){if(index===active)return;active=index;cell.dataset.organelle=['membrane','nucleus','mitochondria'][index];buttons.forEach(function(button,i){button.setAttribute('aria-pressed',String(i===index));});description.querySelector('strong').textContent=content[index][0];description.querySelector('p').textContent=content[index][1];}
  function pose(progress){
    // A camera/cutaway composition, not simulated time or a biological process.
    var approach=Math.min(1,progress*2.5),open=Math.max(0,Math.min(1,(progress-.2)/.5)),spread=Math.max(0,Math.min(1,(progress-.55)/.45));
    cell.style.setProperty('--cell-progress',progress.toFixed(3));
    cell.style.setProperty('--cell-scale',(0.72+approach*.68-spread*.25).toFixed(3));
    cell.style.setProperty('--cell-tilt',(-8+progress*12).toFixed(2)+'deg');
    cell.style.setProperty('--cell-yaw',(-14+progress*22).toFixed(2)+'deg');
    cell.style.setProperty('--membrane-open',open.toFixed(3));
    cell.style.setProperty('--organelle-spread',spread.toFixed(3));
    cell.style.setProperty('--cell-observation-opacity',(1-Math.max(0,Math.min(1,(progress-.1)/.14))).toFixed(3));
    cell.style.setProperty('--cell-diagram-opacity',Math.max(0,Math.min(1,(progress-.24)/.12)).toFixed(3));
  }
  buttons.forEach(function(button,i){button.addEventListener('click',function(){manual=true;select(i);pose(i/2);});});
  function update(){frame=0;if(!story||!inView||document.hidden||paused()||!desktop.matches)return;var box=story.getBoundingClientRect(),travel=Math.max(1,box.height-innerHeight),progress=Math.max(0,Math.min(1,-box.top/travel));if(!manual){pose(progress);select(Math.min(2,Math.floor(progress*2.99)));}}
  function schedule(){if(!frame&&!paused()&&!document.hidden&&inView)frame=requestAnimationFrame(update);}
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
  if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(function(entries){inView=entries[0].isIntersecting;schedule();},{rootMargin:'100px'}).observe(story);
  menu.addEventListener('click',function(){var open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.dataset.open=String(open);menu.textContent=open?'×':'☰';});
  nav.addEventListener('click',function(event){if(event.target.closest('a')){menu.setAttribute('aria-expanded','false');nav.dataset.open='false';menu.textContent='☰';}});
  document.addEventListener('keydown',function(event){if(event.key!=='Escape')return;var search=document.getElementById('bio-search');if(search.open){event.preventDefault();search.close();document.getElementById('bio-open-search').focus();}if(nav.dataset.open==='true'){nav.dataset.open='false';menu.setAttribute('aria-expanded','false');menu.textContent='☰';menu.focus();}});
  var videos=Array.from(document.querySelectorAll('video[data-launch-video]'));
  function syncVideo(video){if(paused()||document.hidden||video.dataset.visible!=='true'){video.pause();return;}if(video.dataset.autoplayBlocked==='true')return;var play=video.play();if(play)play.catch(function(){video.dataset.autoplayBlocked='true';});}
  videos.forEach(function(video){if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(function(entries){video.dataset.visible=String(entries[0].isIntersecting);syncVideo(video);},{threshold:.15}).observe(video);video.addEventListener('play',function(){video.dataset.autoplayBlocked='false';});video.addEventListener('error',function(){video.hidden=true;var fallback=video.parentElement.querySelector('[data-video-fallback]');if(fallback)fallback.hidden=false;});});
  function refresh(){videos.forEach(syncVideo);document.dispatchEvent(new Event('bioq-launch-motion'));if(paused()){cancelAnimationFrame(frame);frame=0;pose(0);}else schedule();}
  new MutationObserver(refresh).observe(surface,{attributes:true,attributeFilter:['data-motion']});
  document.addEventListener('visibilitychange',function(){hero.classList.toggle('bio-scene-asleep',document.hidden);refresh();});
  if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(function(entries){hero.classList.toggle('bio-scene-asleep',!entries[0].isIntersecting);},{threshold:0}).observe(hero);
  reduced.addEventListener('change',refresh);addEventListener('pagehide',function(){cancelAnimationFrame(frame);videos.forEach(function(video){video.pause();});});select(0);refresh();
})();
