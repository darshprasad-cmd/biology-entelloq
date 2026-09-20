/* Real view captures for browsing. Previews never start an experiment. */
(function(){
  'use strict';
  const sections=['home','learn','lessons','reason','labs','solve','explore','me','about','lab','universe'];
  const lessons=['diffusion','enzyme','population','photosynthesis','respiration','replication','selection','actionpotential','cardiac'];
  const workouts=['altitude','resistance','glucose'];
  const legacy={cell:'legacy-cell',microscope:'legacy-microscope'};
  function routeKey(k,sub){
    const concept=/^(?:topic|learn)\/([-a-z0-9]+)\//.exec(sub||'');
    if(['learn','reason','solve'].includes(k)&&concept&&window.BIO_LIBRARY?.topics.some(t=>t.id===concept[1]))return 'topic-'+concept[1];
    if(k==='learn'&&legacy[sub])return legacy[sub];
    if(k==='explore'&&['tree','atlas','timeline','graph','diseases'].includes(sub))return 'explore-'+sub;
    if(k==='lessons'&&lessons.includes(sub))return 'lesson-'+sub;
    if(k==='reason'&&workouts.includes(sub))return 'reason-'+sub;
    if(k==='labs'&&/^[a-z0-9-]+$/.test(sub||''))return 'lab-'+sub;
    return sections.includes(k)?'section-'+k:null;
  }
  function media(key){
    const figure=document.createElement('span');figure.className='bp-media';figure.setAttribute('aria-hidden','true');
    if(key.startsWith('topic-')&&window.BioLibraryVisuals){const topic=window.BIO_LIBRARY?.topics.find(t=>t.id===key.slice(6));if(topic){figure.innerHTML=window.BioLibraryVisuals.preview(topic,{topics:window.BIO_LIBRARY.topics,idPrefix:'bp-concept-'+(++media.serial)});return figure;}}
    const image=document.createElement('img');image.src='./assets/previews/'+key+'.webp';image.alt='';image.width=640;image.height=400;image.loading='lazy';image.decoding='async';
    image.addEventListener('error',()=>{figure.classList.add('bp-unavailable');image.remove();figure.textContent='Preview unavailable';},{once:true});
    figure.append(image);return figure;
  }
  media.serial=0;
  function attach(card,key){
    if(!key||card.dataset.previewMounted)return;
    card.dataset.previewMounted=key;card.classList.add('bp-card');card.prepend(media(key));
  }
  const selector='#homeIn .cc-world,#homeIn .cc-node,#homeIn .cc-promo,#learningPaths .tile,.les-card,.rz-workout,#catalog .exp,#recSlot .card,[data-preview-route],[data-bio-preview]';
  function enhance(){
    document.querySelectorAll(selector).forEach(card=>{
      let key=card.dataset.bioPreview;
      if(!key&&card.dataset.previewRoute)key=routeKey(card.dataset.previewRoute,card.dataset.previewSub);
      if(!key&&card.dataset.go)key=routeKey(card.dataset.go,card.dataset.sub);
      if(!key&&card.dataset.lesson)key='lesson-'+card.dataset.lesson;
      if(!key&&card.matches('.rz-workout')){const id=card.getAttribute('href')?.slice(1);if(workouts.includes(id))key='reason-'+id;}
      if(!key&&card.matches('#recSlot .card')){const link=card.matches('a[href]')?card:card.querySelector('a[href]');if(link){const url=new URL(link.href,location.href);key=routeKey(url.pathname.split('/').pop().replace('.html',''),url.hash.slice(1));}}
      if(!key&&card.matches('#catalog .exp')){
        const link=card.matches('a')?card:card.querySelector('a[href]');
        if(link){const url=new URL(link.href,location.href);const route=url.pathname.split('/').pop().replace('.html','');key=routeKey(route,url.hash.slice(1))||legacy[url.hash.slice(1)];}
      }
      attach(card,key);
    });
    const topicImages={'Mixed':'section-learn','Cell Biology':'legacy-cell','Genetics & DNA':'lesson-replication','Human Physiology':'lab-heart-rate','Evolution':'lesson-selection','Ecology':'lesson-population','Plant Biology':'lesson-photosynthesis','Microbiology':'lab-microscope','Biotechnology':'lab-pcr'};
    document.querySelectorAll('.sv-opt[data-group="topic"],.sv-opt[data-group="mode"]').forEach(button=>{
      const key=button.dataset.group==='topic'?topicImages[button.dataset.val]:'solve-'+button.dataset.val;
      if(!key||button.dataset.previewMounted)return;
      button.dataset.previewMounted=key;button.classList.add('bp-choice');button.prepend(media(key));
    });
  }
  let queued=false;
  const observer=new MutationObserver(records=>{
    if(queued||!records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&!n.matches('.bp-media,.bp-media *')&&(n.matches(selector+',.sv-opt')||n.querySelector(selector+',.sv-opt')))))return;
    queued=true;queueMicrotask(()=>{queued=false;enhance();});
  });
  observer.observe(document.body,{childList:true,subtree:true});enhance();
  const tip=document.createElement('div');tip.id='bio-nav-preview';tip.className='bp-nav-preview';tip.hidden=true;tip.setAttribute('role','tooltip');document.body.append(tip);let active=null;
  function hide(){if(active)active.removeAttribute('aria-describedby');active=null;tip.hidden=true;}
  function show(button){
    if(!matchMedia('(min-width:851px)').matches)return;
    const key=routeKey(button.dataset.go,button.dataset.sub);if(!key)return;
    hide();active=button;tip.replaceChildren(media(key));const label=document.createElement('strong');label.textContent=button.textContent.trim();tip.append(label);tip.hidden=false;
    const rect=button.getBoundingClientRect();tip.style.left=Math.min(innerWidth-292,rect.right+14)+'px';tip.style.top=Math.max(12,Math.min(innerHeight-230,rect.top-15))+'px';button.setAttribute('aria-describedby',tip.id);
  }
  document.querySelectorAll('.side [data-go]').forEach(button=>{
    button.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')show(button);});button.addEventListener('pointerleave',hide);button.addEventListener('focus',()=>show(button));button.addEventListener('blur',hide);button.addEventListener('click',hide);
  });
  addEventListener('keydown',event=>{if(event.key==='Escape')hide();});addEventListener('resize',hide);
  window.BioPreviews={refresh:enhance,routeKey};
  // Keep persistent display controls in the app bar, clear of lesson content.
  const appbar=document.querySelector('.topbar'),motion=document.getElementById('bio-background-toggle');
  if(appbar&&motion)appbar.append(motion);
})();
