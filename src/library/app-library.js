/* Reflect nested learning context in a reloadable app URL. */
(function(){
  'use strict';
  addEventListener('message',e=>{
    const frame=document.getElementById('viewFrame');
    if(!frame || !frame.classList.contains('on') || e.source!==frame.contentWindow || e.origin!==location.origin)return;
    const c=e.data?.bioqContext;if(!c || !['learn','lab','reason','solve'].includes(c.kind))return;
    const id=c.kind==='lab'?c.lab:(c.subtopicId||c.topic);
    if(typeof id!=='string'||!/^[-a-z0-9]+$/.test(id))return;
    const modes=['layman','intuition','visual','scientific','advanced','realWorld'];
    const section=c.kind==='lab'?'labs':c.kind;
    if(!new URL(frame.src,location.href).pathname.endsWith('/'+section+'.html'))return;
    const mode=modes.includes(c.mode)?c.mode:'layman';
    const sub=c.kind==='lab'?id:(c.kind==='learn'?'topic/':'learn/')+id+'/'+mode;
    // postMessage can arrive after the child has returned to its catalogue.
    // A WindowProxy survives navigation, so source identity alone is not enough.
    try {
      const child=frame.contentWindow;
      if(child.BioqContext?.ready===false)return;
      const parts=(child.BioqLocation||child.location).hash.replace(/^#/,'').split('/').map(decodeURIComponent);
      const current=c.kind==='lab'?parts[0]:parts[1];
      const currentMode=modes.includes(parts[2])?parts[2]:'layman';
      if(current!==id || (c.kind!=='lab' &&
        (parts[0]!== (c.kind==='learn'?'topic':'learn') || currentMode!==mode)))return;
    } catch (_) { return; } // A replaced or foreign child cannot report our route.
    window.BioAppContext?.remember(section,sub);
    if(location.hash!=='#'+section+'/'+sub)history.replaceState({k:section,sub},'','#'+section+'/'+sub);
    const crumb=document.getElementById('routeLabel');if(crumb)crumb.textContent=({learn:'Learn',labs:'Lab',reason:'Reason',solve:'Solve'}[section])+' / '+(c.title||id)+(c.subtopic?' / '+c.subtopic:'');
  });
  window.BioAppContext?.refreshHome();
  // Add a curriculum entry without changing the existing launcher or routes.
  let cbseHost;
  try { if (window.top !== window) cbseHost = window.top.BioCBSE; } catch (_) { /* A foreign embedding origin cannot expose the local profile. */ }
  if (cbseHost) {
    for (const [selector, className] of [['#nav','navi'],['.explore-worlds','btn']]) {
      const target = document.querySelector(selector);
      if (!target) continue;
      const button = document.createElement('button');
      button.className = className;
      button.textContent = 'CBSE study space';
      button.dataset.cbseEntry = 'true';
      button.addEventListener('click', () => {
        document.getElementById('bq-explore')?.close();
        cbseHost.openDashboard();
      });
      target.append(button);
    }
  }
})();
