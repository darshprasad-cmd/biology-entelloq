/* Data-driven Learn library. No network request is needed to learn or search. */
(function () {
  'use strict';
  const root = document.getElementById('bioLibrary');
  const library = window.BIO_LIBRARY;
  if (!root || !library || !Array.isArray(library.topics)) return;
  const topics = library.topics;
  const categories = library.categories || [];
  const byId = new Map(topics.map(t => [t.id, t]));
  const categoryById = new Map(categories.map(c => [c.id, c]));
  const modes = [
    { id:'layman', name:'Layman', glyph:'A', color:'var(--em)', question:'What is the simplest way to understand this?', title:'Start with the idea.' },
    { id:'intuition', name:'Intuition', glyph:'B', color:'var(--sky,var(--cy))', question:'Why does it work this way?', title:'Build a mental model.' },
    { id:'visual', name:'Visual', glyph:'C', color:'var(--cy)', question:'What is happening, and where?', title:'Follow the process.' },
    { id:'scientific', name:'Scientific', glyph:'D', color:'var(--indigo)', question:'What is the biological mechanism?', title:'Inside the mechanism.' },
    { id:'advanced', name:'Advanced', glyph:'E', color:'var(--rose)', question:'What changes when we look closer?', title:'Go one level deeper.' },
    { id:'realWorld', name:'Real World', glyph:'F', color:'var(--amber)', question:'Where does this matter?', title:'Biology beyond the page.' }
  ];
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const categoryTitle = id => categoryById.get(id)?.title || id;
  const difficultyTitle = topic => ({foundation:'Foundation',school:'Core',university:'Advanced'}[topic.difficulty] || topic.difficulty || 'Core');
  const inCategory = (topic, category) => category === 'all' || topic.category === category || (topic.additionalCategories || []).includes(category) || (category === 'plant-biology' && (topic.id === 'photosynthesis' || topic.parentId === 'photosynthesis'));
  const url = (topic, mode = 'layman') => '#topic/' + encodeURIComponent(typeof topic === 'string' ? topic : topic.id) + '/' + mode;
  const children = id => topics.filter(t => t.parentId === id);
  const storageKey = 'bio.entelloq.library.progress.v1';
  let progress = { topics:{}, last:null };
  let sessionOnly = false;
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (stored && typeof stored === 'object' && stored.topics && !Array.isArray(stored.topics)) {
      for (const [id, entry] of Object.entries(stored.topics)) {
        if (byId.has(id) && entry && typeof entry === 'object') progress.topics[id] = {
          modes:Array.isArray(entry.modes) ? entry.modes.filter(k => modes.some(m => m.id === k)) : [],
          checked:entry.checked && typeof entry.checked === 'object' && !Array.isArray(entry.checked) ? entry.checked : {}
        };
      }
      if (stored.last && byId.has(stored.last.id)) progress.last = { id:stored.last.id, mode:modes.some(m => m.id === stored.last.mode) ? stored.last.mode : 'layman' };
    }
  } catch (_) { sessionOnly = true; }
  let query = '', selectedCategory = 'all', curriculum = 'all', scope = 'start', visualCleanup = null, focusMode = null;
  const previewCache = new Map();
  function preview(topic, slot='catalog') {
    const key = slot + ':' + topic.id;
    if (!previewCache.has(key)) previewCache.set(key, window.BioLibraryVisuals?.preview(topic,{topics,idPrefix:'bl-'+slot+'-'+topic.id}) || '');
    return previewCache.get(key);
  }
  const index = topics.map(topic => ({ topic, title:norm(topic.title), aliases:(topic.aliases || []).map(norm), text:norm([topic.title, topic.summary, ...(topic.aliases || []), ...(topic.keyTerms || []).map(k => k.term)].join(' ')) }));
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); sessionOnly = false; }
    catch (_) { sessionOnly = true; }
  }
  function entryFor(id) { return progress.topics[id] || (progress.topics[id] = { modes:[], checked:{} }); }
  function savedText() { return sessionOnly ? 'Saved for this visit; browser storage is unavailable.' : 'Your progress stays in this browser.'; }
  function distance(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 3;
    let prev = Array.from({length:b.length + 1}, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const next = [i];
      for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = next;
    }
    return prev[b.length];
  }
  function search(value) {
    const q = norm(value);
    if (!q) return topics.filter(t => scope !== 'start' || selectedCategory !== 'all' || !t.parentId).map(topic => ({topic, score:1}));
    const words = q.split(' ');
    const hits = index.map(item => {
      let score = item.title === q ? 120 : item.aliases.includes(q) ? 110 : item.title.includes(q) ? 90 : item.aliases.some(a => a.includes(q)) ? 80 : item.text.includes(q) ? 50 : 0;
      if (!score && words.every(w => item.text.includes(w))) score = 35;
      if (!score && q.length >= 4 && words.length <= 2) {
        const tokens = [item.title, ...item.aliases, ...item.title.split(' ')];
        if (tokens.some(token => distance(q, token) <= (q.length > 7 ? 2 : 1))) score = 25;
      }
      return {topic:item.topic, score};
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
    const found = new Set(hits.map(item => item.topic.id));
    hits.filter(item => item.score >= 80).slice(0, 3).forEach(item => {
      const ids = [...(item.topic.relatedTopics || []), ...(item.topic.prerequisites || [])];
      ids.forEach(id => { if (byId.has(id) && !found.has(id)) { found.add(id); hits.push({topic:byId.get(id), score:10, connected:true}); } });
    });
    return hits;
  }
  const curriculumOptions = [
    ['all','All curricula'], ['foundation','Foundation'], ['cbse','CBSE / ICSE'], ['neet','NEET'], ['ap','AP Biology'], ['a-level','A-Level'], ['ib','IB Biology'], ['university','Intro university']
  ];
  function matchesCurriculum(topic) {
    if (curriculum === 'all') return true;
    const tags = norm((topic.curriculumTags || []).join(' '));
    if (curriculum === 'cbse') return /cbse|icse|high school/.test(tags);
    if (curriculum === 'neet') return /(^| )neet( |$)/.test(tags);
    if (curriculum === 'ap') return /(^| )ap( |$)/.test(tags);
    if (curriculum === 'a-level') return /a level|alevel/.test(tags);
    if (curriculum === 'ib') return /(^| )ib( |$)/.test(tags);
    if (curriculum === 'university') return /university|college/.test(tags);
    return /foundation/.test(tags);
  }
  function learningPaths() {
    const paths = [
      {id:'cell-to-system',title:'From a cell to a system',summary:'Build the foundation, then connect transport with whole-body coordination.',ids:['cell-structure','membrane-transport','homeostasis','heart-circulation']},
      {id:'information-to-inheritance',title:'From information to inheritance',summary:'Follow a sequence from DNA to protein, division and inherited variation.',ids:['dna','protein-synthesis','meiosis','mendelian-genetics']},
      {id:'energy-to-ecosystems',title:'From energy to ecosystems',summary:'Connect cellular chemistry with energy flow through the living world.',ids:['enzymes','photosynthesis','cellular-respiration','food-webs']}
    ];
    return `<details class="bl-paths" ${window.matchMedia('(min-width:761px)').matches ? 'open' : ''}><summary class="bl-paths-heading"><span><span class="bl-label">A little direction</span><strong id="bl-paths-title">Follow a thread.</strong></span><span class="bl-paths-prompt">3 optional study paths <span aria-hidden="true">+</span></span></summary><p class="bl-paths-note">Suggested sequences, not locked courses. Start anywhere.</p><div class="bl-pathgrid">${paths.map((path,index) => {
      const steps = path.ids.map(id => byId.get(id)).filter(Boolean);
      const visited = steps.filter(topic => progress.topics[topic.id]?.modes.length).length;
      return `<details class="bl-path" data-learning-path="${path.id}"><summary><span class="bl-pathnumber" aria-hidden="true">0${index+1}</span><span><strong>${path.title}</strong><small>${steps.length} connected concepts${visited ? ' · '+visited+' visited' : ''}</small></span><span class="bl-pathplus" aria-hidden="true">+</span></summary><div class="bl-pathbody"><p>${path.summary}</p><ol>${steps.map(topic => `<li><a href="${url(topic)}"><span>${esc(topic.title)}</span><span aria-hidden="true">${progress.topics[topic.id]?.modes.length ? '✓' : '↗'}</span></a></li>`).join('')}</ol></div></details>`;
    }).join('')}</div></details>`;
  }
  function renderIndex() {
    root.dataset.view = 'index';
    const revisit = window.BioDepth?.reviewItems(topics) || [];
    const explored = Object.values(progress.topics).filter(e => e.modes.length).length;
    const last = progress.last && byId.get(progress.last.id);
    root.innerHTML = `<header class="bl-intro"><div><p class="eyebrow">Learn / The visual library</p><h1 class="bl-library-title">One concept. <span class="grad">Six ways in.</span></h1><p class="lead">See the system. Trace the mechanism. Make the connections that turn facts into understanding.</p><div class="bl-hero-notes" aria-label="Inside each concept"><span>Interactive models</span><span>Mechanisms & evidence</span><span>Practice & reflection</span></div></div><div class="bl-progress"><span class="bl-label">Your living library</span><strong>${topics.length} concepts</strong><span>${categories.length} connected fields of biology</span><div class="bl-progress-track" role="meter" aria-label="Concepts visited" aria-valuemin="0" aria-valuemax="${topics.length}" aria-valuenow="${explored}" aria-valuetext="${explored} of ${topics.length} concepts visited; visits are not mastery"><span style="width:${topics.length ? explored/topics.length*100 : 0}%"></span></div><span>${explored} visited · explore at your own pace</span>${last ? `<a href="${url(last, progress.last.mode)}">Continue: ${esc(last.title)} →</a>` : '<a href="#topic/cell-structure/layman">Begin with the cell →</a>'}</div></header>
      ${revisit.length ? `<section class="bd-revisit" aria-labelledby="bd-revisit-title"><h2 id="bd-revisit-title">Ideas you wanted to revisit</h2><p>Your own review choices, ready when you are.</p><nav aria-label="Revisit a concept">${revisit.map(t=>`<a href="${url(t,'scientific')}">${esc(t.title)} →</a>`).join('')}</nav></section>` : ''}
      <form class="bl-searchbar" role="search" aria-label="Search biology concepts"><label class="bl-field"><span class="bl-label">Find a concept</span><input id="bl-search" type="search" placeholder="Search all ${topics.length} concepts…" value="${esc(query)}" autocomplete="off" aria-controls="bl-results"></label><label class="bl-field"><span class="bl-label">Curriculum</span><select id="bl-curriculum">${curriculumOptions.map(([id, label]) => `<option value="${id}" ${curriculum === id ? 'selected' : ''}>${label}</option>`).join('')}</select></label><button type="button" class="btn ghost bl-clear" id="bl-clear">Reset filters</button></form>
      <p class="bl-searchhint">Try an idea: <button type="button" data-search="cell powerhouse">cell powerhouse</button> · <button type="button" data-search="plant food">plant food</button> · <button type="button" data-search="protein factory">protein factory</button></p>
      <p class="bl-curriculum-note">Curriculum tags indicate a suitable learning level, not complete or official exam-board syllabus coverage.</p>
      ${learningPaths()}
      <div class="bl-browser"><nav class="bl-categories" aria-label="Biology units"><p class="bl-label">Browse by field</p>${[{id:'all', title:'All biology'}, ...categories].map(c => `<button type="button" class="bl-category" data-category="${esc(c.id)}" aria-pressed="${selectedCategory === c.id}"><span>${esc(c.title)}</span><span>${topics.filter(t => inCategory(t,c.id)).length}</span></button>`).join('')}</nav><div class="bl-results" id="bl-results"></div></div>
      <div class="bl-legacy"><span>Keep exploring</span><a href="#cell">Interactive cell</a><a href="#microscope">Virtual microscope</a><a href="./lessons.html">Six-lens lessons</a><a href="./labs.html">Open the lab →</a></div>`;
    root.querySelector('form').addEventListener('submit', e => e.preventDefault());
    root.querySelector('#bl-search').addEventListener('input', e => { query = e.target.value; renderResults(); });
    root.querySelector('#bl-curriculum').addEventListener('change', e => { curriculum = e.target.value; renderResults(); });
    root.querySelector('#bl-clear').addEventListener('click', () => { query = ''; curriculum = 'all'; selectedCategory = 'all'; scope = 'start'; renderIndex(); root.querySelector('#bl-search').focus(); });
    root.querySelectorAll('[data-search]').forEach(button => button.addEventListener('click', () => { query = button.dataset.search; selectedCategory = 'all'; root.querySelector('#bl-search').value = query; updateCategories(); renderResults(); root.querySelector('#bl-search').focus(); }));
    root.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => { selectedCategory = button.dataset.category; updateCategories(); renderResults(); }));
    renderResults();
  }
  function updateCategories() { root.querySelectorAll('[data-category]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === selectedCategory))); }
  function renderResults() {
    const hits = search(query).filter(({topic}) => inCategory(topic, selectedCategory) && matchesCurriculum(topic));
    const title = query ? 'Matching concepts' : selectedCategory === 'all' ? (scope === 'start' ? 'Choose a starting point' : 'The complete library') : categoryTitle(selectedCategory);
    const card = ({topic,connected}) => {
      const sub = children(topic.id), record = progress.topics[topic.id], parent = topic.parentId && byId.get(topic.parentId);
      const level = difficultyTitle(topic);
      return `<article class="bl-topicrow" data-preview-topic="${esc(topic.id)}"><a class="bl-topiclink" href="${url(topic)}" aria-labelledby="bl-card-${esc(topic.id)}" aria-describedby="bl-card-desc-${esc(topic.id)}"><div class="bl-preview" aria-hidden="true">${preview(topic)}<span class="bl-preview-open">Explore <span aria-hidden="true">↗</span></span></div><div class="bl-cardbody"><p class="bl-overline">${esc(parent ? parent.title : categoryTitle(topic.category))}${connected ? ' · related' : ''}</p><h3 id="bl-card-${esc(topic.id)}">${esc(topic.title)}</h3><p class="bl-card-summary" id="bl-card-desc-${esc(topic.id)}">${esc(topic.summary)}</p><div class="bl-rowmeta"><span>${sub.length ? sub.length + ' concepts inside' : esc(level)}</span><span class="${record?.modes.length ? 'bl-done' : ''}">${record?.modes.length ? record.modes.length+'/6 explored' : 'Six perspectives'}</span></div></div></a>${sub.length ? `<details class="bl-card-topics"><summary>Explore ${sub.length} subtopics</summary><ul>${sub.map(t => `<li><a href="${url(t)}">${esc(t.title)}<span aria-hidden="true">↗</span></a></li>`).join('')}</ul></details>` : ''}</article>`;
    };
    const groups = !query && selectedCategory === 'all' && scope === 'all';
    root.querySelector('#bl-results').innerHTML = `<div class="bl-resulthead"><div><h2>${esc(title)}</h2><p role="status" aria-live="polite">${hits.length} complete concepts${curriculum !== 'all' ? ' · ' + esc(curriculumOptions.find(c => c[0] === curriculum)?.[1] || '') : ''}</p></div>${selectedCategory === 'all' && !query ? `<div class="bl-scope" aria-label="Library view"><button type="button" data-scope="start" aria-pressed="${scope === 'start'}">Starting points</button><button type="button" data-scope="all" aria-pressed="${scope === 'all'}">All ${topics.length}</button></div>` : ''}</div>
      ${selectedCategory !== 'all' && !query ? `<p class="bl-category-description">${esc(categoryById.get(selectedCategory)?.summary || '')}</p>` : ''}${hits.length ? groups ? categories.map(category => {const group = hits.filter(({topic}) => topic.category === category.id); return group.length ? `<section class="bl-topicgroup" aria-label="${esc(category.title)}"><div class="bl-grouphead"><div><h3>${esc(category.title)}</h3><p>${esc(category.summary)}</p></div><span>${group.length} concepts</span></div><div class="bl-topiclist">${group.map(card).join('')}</div></section>` : '';}).join('') : `<div class="bl-topiclist">${hits.map(card).join('')}</div>` : `<div class="bl-empty"><h3>No concepts match these filters.</h3><p>Try a broader term, another curriculum, or reset the filters.</p></div>`}`;
    root.querySelectorAll('[data-scope]').forEach(button => button.addEventListener('click', () => {scope=button.dataset.scope;renderResults();root.querySelector('[data-scope="'+scope+'"]')?.focus({preventScroll:true});}));
  }
  function prose(value) {
    // Keep the complete authored explanation, but give it a readable first layer.
    const paragraphs = String(value || '').split(/\n\s*\n|\n/).filter(Boolean);
    const chunks = [];
    paragraphs.forEach(paragraph => {
      const sentences = paragraph.match(/[^.!?]+(?:[.!?]+(?=\s+[A-Z0-9“"(]|$)|$)/g);
      if (!sentences || sentences.join('').replace(/\s/g,'') !== paragraph.replace(/\s/g,'')) { chunks.push(paragraph); return; }
      let current = '';
      sentences.forEach(sentence => {
        if (current && (current + ' ' + sentence).split(/\s+/).length > 48) { chunks.push(current); current = ''; }
        current += (current ? ' ' : '') + sentence.trim();
      });
      if (current) chunks.push(current);
    });
    const first = chunks.shift() || '';
    return `<p>${esc(first)}</p>${chunks.length ? `<details class="bl-explanation-depth"><summary>Unpack the explanation <span aria-hidden="true">+</span></summary><div>${chunks.map(p => `<p>${esc(p)}</p>`).join('')}</div></details>` : ''}`;
  }
  function practiceLinks(topic, mode) {
    const context = '/learn/' + encodeURIComponent(topic.id) + '/' + encodeURIComponent(mode);
    return `<nav class="bl-practice" aria-label="Practise ${esc(topic.title)}"><span class="bl-label">Try the idea yourself</span><div><a href="./solve.html#${context.slice(1)}" data-practice="solve"><span>Test in Solve</span><span aria-hidden="true">↗</span></a><a href="./reason.html#${context.slice(1)}" data-practice="reason"><span>Reason it through</span><span aria-hidden="true">↗</span></a></div><p>Keep this topic with you. Return here whenever you need the model.</p>${window.BioDepth?.unitFor(topic.id)?'<button type="button" class="bd-open" data-open-depth>Explore the mechanism & evidence ↓</button>':''}</nav>`;
  }
  function enrichmentFor(topic) { return window.BIO_ENRICHMENT?.[topic.id] || {}; }
  function curiosity(topic) {
    const item = enrichmentFor(topic).curiosity;
    if (!item?.title || !item.body) return '';
    const source = (library.sources || []).find(s => s.id === item.sourceId);
    return `<aside class="bl-curiosity" aria-labelledby="bl-curiosity-title"><p class="bl-label">Did you know?</p><h3 id="bl-curiosity-title">${esc(item.title)}</h3><p>${esc(item.body)}</p>${source && /^https:\/\//.test(source.url || '') ? `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">Explore the science ↗</a>` : ''}</aside>`;
  }
  function workedExample(topic) {
    const item = enrichmentFor(topic).workedExample;
    if (!item?.question || !Array.isArray(item.steps) || !item.answer) return '';
    return `<section class="bl-example" aria-labelledby="bl-example-title"><p class="bl-label">A worked example</p><h3 id="bl-example-title">${esc(item.question)}</h3><details class="bl-example-reveal"><summary>Follow the reasoning <span aria-hidden="true">+</span></summary><ol>${item.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol><p class="bl-example-answer"><span class="bl-label">What follows</span>${esc(item.answer)}</p></details></section>`;
  }
  function connectionMap(topic, mode) {
    const before = [...new Set(topic.prerequisites || [])].filter(id => byId.has(id) && id !== topic.id);
    const related = [...new Set(topic.relatedTopics || [])].filter(id => byId.has(id) && id !== topic.id);
    if (!before.length && !related.length) return '';
    const branch = (ids, label, kind) => ids.length ? `<div class="bl-mapbranch" data-relation="${kind}"><h3>${label}</h3><ul>${ids.map(id => `<li><a href="${url(id,mode)}"><span class="bl-map-preview" aria-hidden="true">${preview(byId.get(id),'map-'+kind)}</span><span>${esc(byId.get(id).title)}</span><span aria-hidden="true">↗</span></a></li>`).join('')}</ul></div>` : '';
    return `<section class="bl-connection-map" aria-labelledby="bl-map-title"><div class="bl-mapheader"><div><p class="bl-label">Make the connections</p><h2 id="bl-map-title">Where this idea leads.</h2></div><p>Open any connected concept; your explanation mode follows you.</p></div><div class="bl-map"><div class="bl-map-current"><span class="bl-label">You are exploring</span><strong>${esc(topic.title)}</strong></div><div class="bl-mapbranches">${branch(before,'Builds on','prerequisite')}${branch(related,'Connects to','related')}</div></div></section>`;
  }
  function sourcesFor(topic) {
    const entries = Array.isArray(topic.sources) ? topic.sources : Array.isArray(library.sources) ? library.sources : [];
    return entries.map(entry => typeof entry === 'string' ? (library.sources || []).find(source => source.id === entry) || {url:entry,title:'Reference'} : entry).filter(entry => /^https:\/\//.test(entry.url || entry.href || '')).slice(0, 4).map(entry => `<a href="${esc(entry.url || entry.href)}" target="_blank" rel="noopener noreferrer">${esc(entry.title || entry.name || 'Reference')}</a>`).join('');
  }
  function publish(topic, mode) {
    const parent = topic.parentId && byId.get(topic.parentId);
    window.BioContext?.publish({ kind:'learn', topic:parent ? parent.id : topic.id, title:parent ? parent.title : topic.title, subtopic:parent ? topic.title : '', subtopicId:parent ? topic.id : '', mode, summary:topic.summary });
  }
  function renderTopic(topic, modeId) {
    root.dataset.view = 'topic';
    const mode = modes.find(m => m.id === modeId) || modes[0];
    const parent = topic.parentId && byId.get(topic.parentId);
    const siblings = parent ? children(parent.id) : children(topic.id);
    const entry = entryFor(topic.id);
    if (!entry.modes.includes(mode.id)) entry.modes.push(mode.id);
    progress.last = {id:topic.id, mode:mode.id};
    persist();
    publish(topic, mode.id);
    const labs = (topic.labs || []).map(lab => typeof lab === 'string' ? {id:lab, title:lab.replace(/-/g, ' ')} : lab);
    root.innerHTML = `<nav class="bl-breadcrumb" aria-label="Breadcrumb"><a href="#library">Learn</a><span aria-hidden="true">/</span><a href="#category/${esc(topic.category)}">${esc(categoryTitle(topic.category))}</a>${parent ? `<span aria-hidden="true">/</span><a href="${url(parent, mode.id)}">${esc(parent.title)}</a>` : ''}<span aria-hidden="true">/</span><span aria-current="page">${esc(topic.title)}</span></nav>
      <header class="bl-topichead"><p class="eyebrow">${esc(categoryTitle(topic.category))}</p><h1 id="bl-topic-title" tabindex="-1">${esc(topic.title)}</h1><p class="lead">${esc(topic.summary)}</p><div class="bl-topicmeta"><span>${esc(difficultyTitle(topic))}</span><span>${entry.modes.length} of 6 perspectives explored</span><details class="bl-curriculum-detail"><summary>Curriculum learning levels</summary><p>${esc((topic.curriculumTags || []).join(' · '))}</p><p>Learning-level tags, not complete or official exam-board syllabus coverage.</p></details></div></header>
      ${siblings.length ? `<nav class="bl-subnav" aria-label="Concepts inside ${esc(parent ? parent.title : topic.title)}">${parent ? `<a href="${url(parent, mode.id)}">Overview</a>` : ''}${siblings.map(t => `<a href="${url(t, mode.id)}" ${t.id === topic.id ? 'aria-current="page"' : ''}>${esc(t.title)}</a>`).join('')}</nav>` : ''}
      <nav class="bl-lesson-nav" aria-label="Jump to a lesson section"><span class="bl-label">In this concept</span><button type="button" data-lesson-section="bl-visual">01 <span>Explore the model</span></button>${window.BioDepth?.unitFor(topic.id) ? '<button type="button" data-lesson-section="bd-title">02 <span>Mechanism & evidence</span></button>' : ''}<button type="button" data-lesson-section="bl-check-title">03 <span>Check understanding</span></button><button type="button" data-lesson-section="bl-terms-title">04 <span>Key terms</span></button></nav>
      <div class="bl-modes" role="tablist" aria-label="Explanation mode">${modes.map(m => `<button type="button" class="bl-mode" id="bl-mode-${m.id}" role="tab" aria-selected="${m.id === mode.id}" aria-controls="bl-explanation" tabindex="${m.id === mode.id ? '0' : '-1'}" data-mode="${m.id}" style="--mode-color:${m.color}"><span aria-hidden="true">${m.glyph}</span>${m.name}</button>`).join('')}</div>
      <div class="bl-study"><div class="bl-stage" id="bl-visual"></div><section class="bl-explanation" id="bl-explanation" role="tabpanel" aria-labelledby="bl-mode-${mode.id}" tabindex="0"><p class="bl-modequestion">${mode.question}</p><h2>${mode.title}</h2><div class="bl-prose">${prose(topic.explanations?.[mode.id])}</div>${practiceLinks(topic,mode.id)}<div class="bl-understand"><button type="button" id="bl-next-mode">${mode.id === 'realWorld' ? 'Return to the simple idea ↩' : 'Try ' + modes[(modes.indexOf(mode) + 1) % modes.length].name + ' →'}</button><span>${savedText()}</span></div><div class="bl-ai" aria-label="Ask the learning guide"><button type="button" data-ask="Explain this simpler.">Explain it simpler</button><button type="button" data-ask="What comes before this, and why?">What comes before?</button><button type="button" data-ask="Take me one level deeper.">Go deeper ↗</button></div><p class="bl-ai-status" role="status" hidden></p></section></div>
      <div class="bl-discoveries">${curiosity(topic)}${workedExample(topic)}</div>
      ${window.BioDepth?.markup(topic) || ''}
      <div class="bl-bottom"><section class="bl-quiz" aria-labelledby="bl-check-title"><p class="bl-label">One quick check</p><h2 id="bl-check-title">Pause. Predict. Explain.</h2>${(topic.quickCheck || []).map((check, i) => `<fieldset data-question="${i}"><legend>${esc(check.question)}</legend><div class="bl-options">${check.options.map((option, n) => `<button type="button" class="bl-option" data-answer="${n}" data-check="${i}"><span aria-hidden="true">${String.fromCharCode(65 + n)}</span>${esc(option)}</button>`).join('')}</div><div class="bl-feedback" data-feedback="${i}" role="status" aria-live="polite" hidden></div></fieldset>`).join('')}</section><aside class="bl-connections" aria-label="Explore this topic further"><h3>Take it further.</h3>${labs.length ? `<div class="bl-linkgroup"><span class="bl-label">Test it in the lab</span><div class="bl-lablinks">${labs.map(lab => `<a href="./labs.html#${encodeURIComponent(lab.id)}"><span>${esc(lab.title)}</span><span aria-hidden="true">↗</span></a>`).join('')}</div></div>` : ''}<details class="bl-terms"><summary id="bl-terms-title">Key terms · ${(topic.keyTerms || []).length}</summary><dl>${(topic.keyTerms || []).map(term => `<div><dt>${esc(term.term)}</dt><dd>${esc(term.definition)}</dd></div>`).join('')}</dl></details><p class="bl-revisit">Use the model, make a prediction, then try it in Solve or Reason. You can move between them at any point.</p></aside></div>
      ${connectionMap(topic,mode.id)}
      ${sourcesFor(topic) ? `<p class="bl-sources">Read further ${sourcesFor(topic)}</p>` : ''}<div class="bl-legacy"><a href="#library">← All biology</a><a href="./labs.html">Explore the lab →</a></div>`;
    const switchMode = id => { focusMode = id; location.hash = url(topic, id); };
    window.BioDepth?.mount(root,topic);
    root.querySelectorAll('[data-lesson-section]').forEach(button => button.addEventListener('click', () => {
      const target = root.querySelector('#' + button.dataset.lessonSection);
      if (!target) return;
      if (target.parentElement?.tagName === 'DETAILS') target.parentElement.open = true;
      if (!target.matches('summary,button,a[href],input,select,textarea,[tabindex]')) target.setAttribute('tabindex','-1');
      target.focus({preventScroll:true});
      target.scrollIntoView({block:'start',behavior:'instant'});
    }));
    root.querySelector('[data-open-depth]')?.addEventListener('click', () => {
      const title = root.querySelector('#bd-title');
      if (title) { title.setAttribute('tabindex','-1'); title.focus({preventScroll:true}); title.scrollIntoView({block:'start',behavior:'instant'}); }
    });
    root.querySelectorAll('[data-mode]').forEach(tab => {
      tab.addEventListener('click', () => switchMode(tab.dataset.mode));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault();
        let at = modes.findIndex(m => m.id === tab.dataset.mode);
        at = event.key === 'Home' ? 0 : event.key === 'End' ? modes.length - 1 : (at + (event.key === 'ArrowRight' ? 1 : -1) + modes.length) % modes.length;
        switchMode(modes[at].id);
      });
    });
    root.querySelector('#bl-next-mode').addEventListener('click', () => switchMode(modes[(modes.indexOf(mode) + 1) % modes.length].id));
    root.querySelectorAll('[data-ask]').forEach(button => button.addEventListener('click', () => {
      publish(topic, mode.id);
      if (window.BioContext?.ask) window.BioContext.ask(button.dataset.ask);
      else { const status = root.querySelector('.bl-ai-status'); status.hidden = false; status.textContent = 'The learning guide is unavailable here. Try another explanation mode or open a connected concept below.'; }
    }));
    root.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => answer(topic, Number(button.dataset.check), Number(button.dataset.answer))));
    Object.entries(entry.checked).forEach(([index, chosen]) => { if (Number.isInteger(chosen) && topic.quickCheck?.[index]?.options[chosen] != null) answer(topic, Number(index), chosen, false); });
    if (window.BioLibraryVisuals?.mount) visualCleanup = window.BioLibraryVisuals.mount(root.querySelector('#bl-visual'), topic, { topics, mode:mode.id, url, onContext:detail => window.BioContext?.publish({kind:'learn', topic:topic.id,title:topic.title,subtopic:detail,mode:mode.id,summary:topic.summary}) });
    else root.querySelector('#bl-visual').innerHTML = `<div class="bl-diagram"><div class="bl-stepdetail"><strong>Visual sequence</strong>${esc(topic.explanations?.visual)}</div></div>`;
    // Reveal the selected lens inside the horizontal strip without moving the
    // document. This also covers direct links to later modes on a phone.
    const strip = root.querySelector('.bl-modes'), activeTab = strip.querySelector('[aria-selected="true"]');
    const stripBounds = strip.getBoundingClientRect(), activeBounds = activeTab.getBoundingClientRect();
    if (activeBounds.right > stripBounds.right) strip.scrollLeft += activeBounds.right - stripBounds.right + 8;
    else if (activeBounds.left < stripBounds.left) strip.scrollLeft -= stripBounds.left - activeBounds.left + 8;
    if (focusMode) { root.querySelector('#bl-mode-' + focusMode)?.focus({preventScroll:true}); focusMode = null; }
  }
  function answer(topic, index, chosen, save = true) {
    const check = topic.quickCheck[index];
    if (!check || !Number.isInteger(chosen) || check.options[chosen] == null) return;
    const correct = chosen === check.answer;
    root.querySelectorAll(`[data-check="${index}"]`).forEach(button => { button.disabled = true; const n = Number(button.dataset.answer); button.dataset.result = n === check.answer ? 'correct' : n === chosen ? 'incorrect' : ''; });
    const feedback = root.querySelector(`[data-feedback="${index}"]`);
    feedback.hidden = false;
    feedback.innerHTML = `<strong>${correct ? 'That’s the mechanism.' : 'A useful misconception to untangle.'}</strong>${!correct ? `The best answer is ${String.fromCharCode(65 + check.answer)}. ` : ''}${esc(check.explanation)}<br><button type="button">Try this check again</button>`;
    feedback.querySelector('button').addEventListener('click', () => { delete entryFor(topic.id).checked[index]; persist(); feedback.hidden = true; root.querySelectorAll(`[data-check="${index}"]`).forEach(button => { button.disabled = false; button.dataset.result = ''; }); root.querySelector(`[data-check="${index}"]`)?.focus(); });
    if (save) { entryFor(topic.id).checked[index] = chosen; persist(); }
  }
  let lastTopic = null;
  function route() {
    if (typeof visualCleanup === 'function') visualCleanup();
    visualCleanup = null;
    let parts;
    try { parts = location.hash.slice(1).split('/').map(decodeURIComponent); } catch (_) { parts = []; }
    if (parts[0] === 'topic' && byId.has(parts[1])) {
      renderTopic(byId.get(parts[1]), parts[2]);
      if (lastTopic !== parts[1]) root.scrollIntoView({block:'start', behavior:'instant'});
      lastTopic = parts[1];
    } else {
      if (parts[0] === 'category' && categoryById.has(parts[1])) { selectedCategory = parts[1]; query = ''; }
      if (parts[0] === 'library') selectedCategory = 'all';
      renderIndex();
      if (parts[0] === 'library' || parts[0] === 'category') root.scrollIntoView({block:'start', behavior:'instant'});
      if (parts[0] === 'cell' || parts[0] === 'microscope') document.getElementById(parts[0])?.scrollIntoView({block:'start', behavior:'instant'});
      lastTopic = null;
    }
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('pagehide', () => { if (typeof visualCleanup === 'function') visualCleanup(); });
  route();
})();
