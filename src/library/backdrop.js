/* The launch's cell continues into study as a static, cached backdrop.
   No animation loop, full-screen compositor layer, or backdrop blur is needed. */
(function(){
  'use strict';
  const embedded = new URLSearchParams(location.search).has('embed');
  const style=document.createElement('style');style.id='bio-launch-backdrop-css';
  style.textContent=`html:root{background:var(--bg,#080b0d)!important}html body,body .stage,body .home{background:transparent!important}body>#atmo,body>#fx,body>.bg-veil{display:none!important}
    #bio-app-backdrop{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none;background:#080b0d}
    #bio-app-backdrop:before{content:'';position:absolute;inset:0;background:url('./assets/launch/biology-cell.webp') center right/cover no-repeat;opacity:.23}
    #bio-app-backdrop:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#080b0df5 3%,#080b0dc4 48%,#080b0d70),linear-gradient(0deg,#080b0dbb,transparent 70%)}
    html[data-theme=light] #bio-app-backdrop{background:#f4f1e9}html[data-theme=light] #bio-app-backdrop:before{opacity:.09}html[data-theme=light] #bio-app-backdrop:after{background:linear-gradient(90deg,#f4f1e9f5,#f4f1e9bf)}
    body .side,body .topbar{background:var(--bg-2);backdrop-filter:none}
    @media(max-width:760px){#bio-app-backdrop:before{background-position:62% center;opacity:.16}}`;
  if(embedded) style.textContent+='html:root,html body{background:transparent!important}';
  document.head.append(style);
  window.BIOQ_ATMO={theme(){},setSection(){},mouse:null,mode:embedded?'embedded':'launch-image'};
  if(embedded)return;
  const bg=document.createElement('div');bg.id='bio-app-backdrop';bg.setAttribute('aria-hidden','true');document.body.prepend(bg);
})();
