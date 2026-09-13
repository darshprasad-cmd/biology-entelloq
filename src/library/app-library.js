/* Reflect nested learning context in a reloadable app URL. */
(function(){
  'use strict';
  addEventListener('message',e=>{
    const frame=document.getElementById('viewFrame');
    if(!frame || e.source!==frame.contentWindow || e.origin!==location.origin)return;
    const c=e.data?.bioqContext;if(!c || !['learn','lab'].includes(c.kind))return;
    const id=c.kind==='learn'?(c.subtopicId||c.topic):c.lab;
    if(typeof id!=='string'||!/^[-a-z0-9]+$/.test(id))return;
    const modes=['layman','intuition','visual','scientific','advanced','realWorld'];
    const section=c.kind==='learn'?'learn':'labs';
    if(!new URL(frame.src,location.href).pathname.endsWith('/'+section+'.html'))return;
    const sub=c.kind==='learn'?'topic/'+id+'/'+(modes.includes(c.mode)?c.mode:'layman'):id;
    if(location.hash!=='#'+section+'/'+sub)history.replaceState({k:section,sub},'','#'+section+'/'+sub);
    const crumb=document.getElementById('routeLabel');if(crumb)crumb.textContent=(section==='learn'?'Learn':'Lab')+' / '+(c.title||id)+(c.subtopic?' / '+c.subtopic:'');
  });
})();
