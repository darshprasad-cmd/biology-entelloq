/* The launch photograph continues through the application as one persistent scene. */
(function(){
  'use strict';
  const embedded = new URLSearchParams(location.search).has('embed');
  const style=document.createElement('style');style.id='bio-launch-backdrop-css';
  style.textContent=`html:root{background:var(--bg,#050b08)!important}html body,body .stage,body .home{background:transparent!important}body>#atmo,body>#fx,body>.bg-veil{display:none!important}
    #bio-app-backdrop{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none;background:#050b08}
    #bio-app-backdrop:before{content:'';position:absolute;inset:-3%;background:url('./assets/biology-dna-hero.webp') center right/cover no-repeat;opacity:.62;animation:bio-app-drift 28s ease-in-out infinite alternate}
    #bio-app-backdrop:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#050b08e0 3%,#050b08a8 48%,#050b0866),linear-gradient(0deg,#050b0899,transparent 70%)}
    html[data-theme=light] #bio-app-backdrop{background:#eef3e9}html[data-theme=light] #bio-app-backdrop:before{opacity:.23}html[data-theme=light] #bio-app-backdrop:after{background:linear-gradient(90deg,#f1f5edee,#f1f5edb0)}
    body .side,body .topbar{background:color-mix(in srgb,var(--bg-2) 93%,transparent);backdrop-filter:blur(12px)}
    #bio-background-toggle{position:fixed;right:18px;bottom:16px;z-index:45;padding:8px 11px;border:1px solid var(--hair,#38523c);border-radius:6px;background:var(--panel,#0d180f);color:var(--dim,#b2bdb0);font:11px var(--sans,system-ui);cursor:pointer}
    #bio-background-toggle:focus-visible{outline:2px solid var(--em);outline-offset:3px}
    #bio-app-backdrop[data-paused=true]:before{animation-play-state:paused}
    @keyframes bio-app-drift{from{transform:scale(1.015)}to{transform:translate3d(-7px,4px,0) scale(1.055)}}
    @media(max-width:760px){#bio-background-toggle{bottom:calc(76px + env(safe-area-inset-bottom));right:12px;font-size:10px;padding:7px 9px}#bio-app-backdrop:before{background-position:62% center;opacity:.5}}
    @media(prefers-reduced-motion:reduce){#bio-app-backdrop:before{animation:none!important;transform:none!important}}`;
  if(embedded) style.textContent+='html:root,html body{background:transparent!important}';
  document.head.append(style);
  window.BIOQ_ATMO={theme(){},setSection(){},mouse:null,mode:embedded?'embedded':'launch-image'};
  if(embedded)return;
  const bg=document.createElement('div');bg.id='bio-app-backdrop';bg.setAttribute('aria-hidden','true');document.body.prepend(bg);
  const toggle=document.createElement('button');toggle.id='bio-background-toggle';toggle.type='button';document.body.append(toggle);
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');let stored=false;
  try{stored=localStorage.getItem('bioq_landing_motion')==='paused';}catch(_){}
  function refresh(){const paused=stored||reduced.matches||document.hidden;bg.dataset.paused=String(paused);toggle.textContent=reduced.matches?'Reduced background motion':stored?'▷ Background motion':'Ⅱ Background motion';toggle.setAttribute('aria-label',reduced.matches?'Reduced background motion enabled':stored?'Resume background motion':'Pause background motion');toggle.setAttribute('aria-pressed',String(stored||reduced.matches));toggle.disabled=reduced.matches;}
  toggle.onclick=()=>{stored=!stored;try{localStorage.setItem('bioq_landing_motion',stored?'paused':'running');}catch(_){}refresh();};
  reduced.addEventListener('change',refresh);document.addEventListener('visibilitychange',refresh);
  addEventListener('storage',e=>{if(e.key==='bioq_landing_motion'){stored=e.newValue==='paused';refresh();}});refresh();
})();
