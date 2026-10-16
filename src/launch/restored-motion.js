(function(){
  'use strict';
  var surface=document.getElementById('lnd'),hero=document.getElementById('bio-welcome'),toggle=document.getElementById('bio-motion-toggle');
  var reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)'),stored=false,frame=0,px=0,py=0,heroVisible=true;
  try{stored=localStorage.getItem('bioq_landing_motion')==='paused';}catch(error){}
  var paused=stored||reduced.matches;
  function resetPointer(){cancelAnimationFrame(frame);frame=0;hero.style.setProperty('--bio-px','0px');hero.style.setProperty('--bio-py','0px');}
  function activity(){hero.dataset.motionActive=String(heroVisible&&!document.hidden&&!paused);if(!heroVisible||document.hidden||paused)resetPointer();}
  function refresh(){
    surface.dataset.motion=paused?'paused':'running';
    activity();
    document.dispatchEvent(new Event('bioq-launch-motion'));
    toggle.innerHTML=paused?'▷ <span>Resume background motion</span>':'Ⅱ <span>Pause background motion</span>';
    toggle.setAttribute('aria-pressed',String(paused));
    toggle.disabled=reduced.matches;
    if(reduced.matches)toggle.innerHTML='◌ <span>Reduced motion enabled</span>';
    if(paused){resetPointer();document.querySelectorAll('.bio-reveal-pending').forEach(function(node){node.classList.remove('bio-reveal-pending');});}
  }
  toggle.addEventListener('click',function(){paused=!paused;stored=paused;try{localStorage.setItem('bioq_landing_motion',paused?'paused':'running');}catch(error){}refresh();});
  reduced.addEventListener('change',function(){paused=reduced.matches||stored;refresh();});
  hero.addEventListener('pointermove',function(event){if(paused||!heroVisible||!fine.matches||document.hidden)return;var box=hero.getBoundingClientRect();px=Math.max(-4,Math.min(4,((event.clientX-box.left)/box.width-.5)*8));py=Math.max(-4,Math.min(4,((event.clientY-box.top)/box.height-.5)*8));if(!frame)frame=requestAnimationFrame(function(){frame=0;hero.style.setProperty('--bio-px',px.toFixed(2)+'px');hero.style.setProperty('--bio-py',py.toFixed(2)+'px');});});
  hero.addEventListener('pointerleave',resetPointer);
  document.addEventListener('visibilitychange',activity);
  if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(function(entries){heroVisible=entries[0].isIntersecting;activity();},{threshold:0}).observe(hero);
  addEventListener('pagehide',function(){hero.dataset.motionActive='false';resetPointer();});
  addEventListener('pageshow',activity);
  refresh();
  if(typeof IntersectionObserver!=='undefined'&&!paused){
    var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.remove('bio-reveal-pending');observer.unobserve(entry.target);}});},{threshold:.08});
    document.querySelectorAll('.pe-statement,.pe-world-section,.pe-tutor-section,.bio-model-section,.pe-science,.pe-faq,.pe-founder,.pe-final').forEach(function(node){if(node.getBoundingClientRect().top>innerHeight*.95){node.classList.add('bio-reveal','bio-reveal-pending');observer.observe(node);}});
  }
})();
