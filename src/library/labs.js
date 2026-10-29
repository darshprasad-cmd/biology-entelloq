/* Biology Entelloq: existing registry, extended with investigation furniture. */
const LABS = (function () {
  const list = [];
  const enrich = l => Object.assign({}, l, window.BIO_LAB_META?.[l.id] || {});
  return {
    register(id, def) { if (!list.some(l => l.id === id)) list.push(Object.assign({ id }, def)); },
    all() { return list.map(enrich); },
    get(id) { const l = list.find(l => l.id === id); return l ? enrich(l) : null; }
  };
})();
(function () {
  'use strict';
  const app = document.getElementById('labsApp');
  if (!app) return;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let live = null, notebook = null, activeLabId = null;
  let filters = { query: '', category: '', difficulty: '', duration: '', type: '' };
  function unmount() { notebook?.dispose(); notebook = null; try { live?.dispose?.(); } catch (e) { console.warn('Lab cleanup', e); } live = null; }
  function route(event) {
    let id; try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { id = ''; }
    const previousLabId = activeLabId;
    unmount();
    const lab = LABS.get(id);
    activeLabId = lab?.id || null;
    if (lab) renderLab(lab); else renderIndex(id, previousLabId, event?.type === 'hashchange');
    if (window.__observeReveals) window.__observeReveals();
  }
  function renderIndex(unknown, returnToLab, navigated = false) {
    const all = LABS.all(), categories = [...new Set(all.map(l => l.category || l.tag))].sort();
    app.innerHTML = `<div class="wrap band lb-library"><header class="lc-heading"><div><div class="eyebrow">The biology laboratory</div><h1 class="h1">See it. Test it. Understand it.</h1><p>Choose a slide, a living system, or a specimen.</p></div><div class="lc-library-note"><span>${all.length} interactive labs</span><span>Real bench previews · Your own notebook</span></div></header>${unknown ? '<p role="status">That bench could not be found. Choose an investigation below.</p>' : ''}<form id="lab-filters" role="search" aria-label="Find a laboratory investigation"><div class="ln-filters"><label class="ln-search">Find an experiment<input id="lab-search" type="search" placeholder="Search experiments…" value="${esc(filters.query)}"></label><label>Category<select id="lab-category"><option value="">All fields</option>${categories.map(c=>`<option>${esc(c)}</option>`).join('')}</select></label><label>Level<select id="lab-difficulty"><option value="">All levels</option><option value="foundation">Foundation</option><option value="school">School</option><option value="advanced">Advanced</option></select></label><label>Time<select id="lab-duration"><option value="">Any duration</option><option value="10">Up to 10 min</option><option value="20">Up to 20 min</option><option value="40">Up to 40 min</option></select></label><label>Type<select id="lab-type"><option value="">All types</option>${['simulation','microscope','dissection','genetics','data','investigation'].map(t=>`<option value="${t}">${t[0].toUpperCase()+t.slice(1)}</option>`).join('')}</select></label></div><div class="lc-search-actions"><button class="bx-btn" id="lab-show-results" type="submit">Show results <span aria-hidden="true">↓</span></button></div></form><div class="lc-results-heading"><h2 id="lab-results-title" tabindex="-1" aria-describedby="lab-count">Investigations</h2><p id="lab-count" class="ln-count" role="status" aria-live="polite" aria-atomic="true"></p></div><div class="lc-catalog" id="lab-cards"></div></div>`;
    const controls = { query:'lab-search', category:'lab-category', difficulty:'lab-difficulty', duration:'lab-duration', type:'lab-type' };
    Object.entries(controls).forEach(([k,id]) => { const e=document.getElementById(id); e.value=filters[k]; e.addEventListener(k==='query'?'input':'change',()=>{filters[k]=e.value;paint();}); });
    const focusResults = () => {
      const heading = document.getElementById('lab-results-title');
      heading.focus({preventScroll:true});
      heading.scrollIntoView({block:'start',behavior:'instant'});
    };
    document.getElementById('lab-filters').addEventListener('submit', event => { event.preventDefault(); focusResults(); });
    function paint() {
      const query=filters.query.trim().toLowerCase();
      const shown=all.filter(l=>{
        const searchable=[l.title,l.blurb,l.category,l.tag,...(l.aliases||[]),...(l.relatedTopics||[])].join(' ').toLowerCase();
        return (!query || query.split(/\s+/).every(w=>searchable.includes(w))) && (!filters.category || (l.category||l.tag)===filters.category) && (!filters.difficulty || l.difficulty===filters.difficulty) && (!filters.duration || (l.minutes||15)<=Number(filters.duration)) && (!filters.type || (l.type||'simulation')===filters.type);
      });
      const context = [filters.category, filters.difficulty, filters.duration ? 'up to '+filters.duration+' min' : '', filters.type].filter(Boolean);
      document.getElementById('lab-count').textContent=shown.length+' of '+all.length+' investigations'+(context.length?' · '+context.join(' · '):'');
      document.getElementById('lab-cards').innerHTML=shown.length ? shown.map((l,i)=>`<a class="lc-card" data-lab-id="${esc(l.id)}" href="#${esc(l.id)}" style="--lc:${l.color||'var(--em)'}"><div class="lc-preview${l.type==='dissection'?' lc-preview-specimen':''}"><img src="./assets/previews/lab-${esc(l.id)}.webp" alt="" width="960" height="600" loading="${i<6?'eager':'lazy'}" decoding="async"><span class="lc-preview-type">${esc(l.type||'simulation')}</span><span class="lc-open" aria-hidden="true">↗</span></div><div class="lc-card-copy"><span class="lb-tag">${esc(l.category||l.tag)}</span><h2>${esc(l.title)}</h2><div class="ln-card-meta"><span>${esc(l.difficulty||'school')}</span><span>${l.minutes||15} min</span></div></div></a>`).join('') : '<div class="ln-empty"><h2>No experiments match those filters.</h2><p>Try a broader term or another field.</p><button class="bx-btn" id="lab-clear" type="button">Show all experiments</button></div>';
      document.getElementById('lab-clear')?.addEventListener('click',()=>{filters={query:'',category:'',difficulty:'',duration:'',type:''};Object.values(controls).forEach(id=>{document.getElementById(id).value='';});paint();document.getElementById('lab-search').focus();});
    }
    paint();
    if (returnToLab && !unknown) {
      const card = [...app.querySelectorAll('[data-lab-id]')].find(card=>card.dataset.labId===returnToLab);
      if (card) { card.focus({preventScroll:true}); card.scrollIntoView({block:'center',behavior:'instant'}); }
      else focusResults();
    } else if (navigated) focusResults();
  }
  function renderLab(l) {
    app.innerHTML=`<div class="wrap band lb-page" style="--lc:${l.color||'var(--em)'}"><nav class="ln-breadcrumb" aria-label="Breadcrumb"><a href="#">All labs</a><span>/</span><span>${esc(l.category||l.tag)}</span><span>/</span><span aria-current="page">${esc(l.title)}</span></nav><header class="lb-hd"><div class="lc-lab-title"><div class="lb-tag">${esc(l.type||'simulation')} · ${esc(l.difficulty||'school')} · ${l.minutes||15} min</div><h1 class="h1" tabindex="-1">${esc(l.title)}</h1><p class="lead">${esc(l.blurb)}</p></div><nav class="lc-workspace-nav" aria-label="Investigation steps"><button type="button" data-lab-jump="lab-workflow"><span>01</span> Predict</button><button type="button" data-lab-jump="labStage"><span>02</span> Experiment</button><button type="button" data-lab-jump="lab-notebook"><span>03</span> Notebook</button></nav></header><div id="lab-workflow"></div><div class="lb-stage" id="labStage"></div><div id="lab-notebook"></div></div>`;
    const host=document.getElementById('labStage');
    try {
      live=l.build(host)||{};
      notebook=window.BioNotebook?.mount(l,host,live,document.getElementById('lab-workflow'),document.getElementById('lab-notebook'));
    } catch(e) {
      host.innerHTML='<div class="lb-err">This bench could not start. <button class="bx-btn" id="lab-retry">Try again</button><a href="#">Choose another lab</a></div>';
      document.getElementById('lab-retry').onclick=route;
      console.error('Lab failed: '+l.id,e);
    }
    app.querySelectorAll('[data-lab-jump]').forEach(button=>button.addEventListener('click',()=>{
      const target=document.getElementById(button.dataset.labJump);
      target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
      const focusTarget=target?.querySelector('input,button,h2');
      if(focusTarget){if(focusTarget.tagName==='H2')focusTarget.tabIndex=-1;focusTarget.focus({preventScroll:true});}
    }));
    app.querySelector('h1').focus({preventScroll:true});
  }
  addEventListener('hashchange',route);
  addEventListener('pagehide',unmount);
  addEventListener('pageshow',event=>{if(event.persisted)route();});
  if(document.readyState==='loading') addEventListener('DOMContentLoaded',route,{once:true}); else queueMicrotask(route);
})();
