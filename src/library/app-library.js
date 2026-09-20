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
    window.BioAppContext?.remember(section,sub);
    if(location.hash!=='#'+section+'/'+sub)history.replaceState({k:section,sub},'','#'+section+'/'+sub);
    const crumb=document.getElementById('routeLabel');if(crumb)crumb.textContent=({learn:'Learn',labs:'Lab',reason:'Reason',solve:'Solve'}[section])+' / '+(c.title||id)+(c.subtopic?' / '+c.subtopic:'');
  });
  window.BioAppContext?.refreshHome();
})();
