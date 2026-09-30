/* Topic-specific practice lives in Reason / Solve; Learn remains one click away.
 * These small sessions have their own storage and never modify the Solve bank,
 * its active sessions, recorded marks, or mistake history. */
(function (global) {
  'use strict';
  const PREFIX = 'bioq.topic-practice.v1.';
  const modes = ['layman', 'intuition', 'visual', 'scientific', 'advanced', 'realWorld'];
  const memory = new Map();
  const caseTopics = {altitude:'gas-exchange',resistance:'natural-selection',glucose:'homeostasis'};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const topics = () => global.BIO_LIBRARY?.topics || [];
  const enrichment = id => global.BIO_ENRICHMENT?.[id];
  function parseRoute(hash) {
    const match = /^#learn\/([-a-z0-9]+)(?:\/([a-zA-Z]+))?\/?$/.exec(hash);
    if (!match) return null;
    const topic = topics().find(t => t.id === match[1]);
    return topic ? {topic, mode: modes.includes(match[2]) ? match[2] : 'layman'} : null;
  }
  function href(section, id, mode) {
    return './' + section + '.html#' + (section === 'learn' ? 'topic/' : 'learn/') + encodeURIComponent(id) + '/' + (modes.includes(mode) ? mode : 'layman');
  }
  function questionsFor(topic) {
    const candidates = [...(topic.quickCheck || []), ...(enrichment(topic.id)?.checkpoints || [])];
    const seen = new Set();
    return candidates.filter(q => {
      if (!q || typeof q.question !== 'string' || !Array.isArray(q.options) || q.options.length < 2 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length || seen.has(q.question)) return false;
      seen.add(q.question); return true;
    });
  }
  function get(key, fallback) {
    if (memory.has(key)) return memory.get(key);
    try { const value = JSON.parse(localStorage.getItem(PREFIX + key)); return value && typeof value === 'object' ? value : fallback; }
    catch (_) { return fallback; }
  }
  function put(key, value) {
    memory.set(key, value);
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  }
  function validateAnswers(raw, questions) {
    return questions.map((q, i) => {
      const answer = raw?.[i];
      return answer && answer.question === q.question && answer.signature === JSON.stringify(q.options) + ':' + q.answer && Number.isInteger(answer.choice) && answer.choice >= 0 && answer.choice < q.options.length ? {question:q.question,signature:answer.signature,choice:answer.choice,checked:answer.checked === true} : null;
    });
  }
  global.BioPractice = {parseRoute, href, questionsFor, validateAnswers};
  if (typeof document === 'undefined') return;
  const section = /\/reason\.html$/.test(location.pathname) ? 'reason' : /\/solve\.html$/.test(location.pathname) ? 'solve' : null;
  if (!section) return;
  let host, catalog, original, active = null, state, saved = true;
  const $ = selector => host.querySelector(selector);
  function publish(route) {
    const context = {kind:section,topic:route.topic.id,title:route.topic.title,mode:route.mode};
    if (global.BioContext) global.BioContext.publish(context);
    else {
      global.dispatchEvent(new CustomEvent('bioq:context', {detail:context}));
      if (parent !== global && location.origin !== 'null') parent.postMessage({bioqContext:context}, location.origin);
    }
  }
  function save() {
    if (!active) return;
    saved = put(section + '.' + active.topic.id, state);
    const status = $('.tp-save');
    if (status) status.textContent = saved ? 'Saved on this device' : 'Kept for this visit only';
  }
  function nav(route) {
    const {topic,mode} = route;
    return '<nav class="tp-path" aria-label="Learning and practice"><a href="' + href('learn',topic.id,mode) + '">← Back to Learn</a><div><a href="' + href('reason',topic.id,mode) + '"' + (section === 'reason' ? ' aria-current="page"' : '') + '>Reason</a><a href="' + href('solve',topic.id,mode) + '"' + (section === 'solve' ? ' aria-current="page"' : '') + '>Solve</a></div></nav>';
  }
  function header(route, subtitle) {
    return nav(route) + '<header class="tp-heading"><div><p class="tp-eyebrow">' + (section === 'solve' ? 'Test your understanding' : 'Think it through') + '</p><h1 tabindex="-1">' + esc(route.topic.title) + '</h1><p>' + subtitle + '</p></div><span class="tp-save">' + (saved ? 'Saved on this device' : 'Kept for this visit only') + '</span></header>';
  }
  function footer(route) {
    return '<footer class="tp-footer"><a href="' + href('learn',route.topic.id,route.mode) + '">Revisit this concept ↗</a><a href="#">All ' + (section === 'reason' ? 'reasoning workouts' : 'Solve practice') + ' →</a></footer>';
  }
  function focusCurrent(selector) {
    const target = $(selector);
    if (target) target.focus({preventScroll:true});
  }
  function mountDepth(route) {
    const footer = host.querySelector('.tp-footer');
    if (!footer || !global.BioDepth) return;
    footer.insertAdjacentHTML('beforebegin',global.BioDepth.markup(route.topic,section));
    global.BioDepth.mount(host,route.topic);
  }
  function renderSolve(route, focus) {
    const questions = questionsFor(route.topic);
    if (!questions.length) { renderUnavailable(route); return; }
    state.answers = validateAnswers(state.answers, questions);
    state.index = Math.max(0, Math.min(questions.length - 1, Number.isInteger(state.index) ? state.index : 0));
    const index = state.index, q = questions[index], answer = state.answers[index], checked = answer?.checked;
    const reviewed = state.answers.filter(a => a?.checked).length;
    const correct = state.answers.filter((a,i) => a?.checked && a.choice === questions[i].answer).length;
    host.innerHTML = header(route,'One question at a time. Switch to Learn whenever you need; your answers stay here.') +
      '<div class="tp-progress"><span>' + reviewed + ' / ' + questions.length + ' checked</span><ol aria-label="Practice questions">' + questions.map((item,i) => '<li><button class="tp-dot' + (i === index ? ' current' : '') + '" type="button" data-question="' + i + '" aria-label="Question ' + (i+1) + (state.answers[i]?.checked ? ', checked' : ', not checked') + '"' + (i === index ? ' aria-current="step"' : '') + '>' + (i+1) + (state.answers[i]?.checked ? '<span aria-hidden="true"> ✓</span>' : '') + '</button></li>').join('') + '</ol></div>' +
      '<section class="tp-question" aria-labelledby="tpQuestion"><p class="tp-eyebrow">Question ' + (index+1) + ' of ' + questions.length + '</p><h2 id="tpQuestion" tabindex="-1">' + esc(q.question) + '</h2>' +
      '<form class="tp-answer-form"><fieldset' + (checked ? ' disabled' : '') + '><legend class="tp-sr">Choose one answer</legend><div class="tp-options">' + q.options.map((option,i) => '<label class="tp-option' + (checked && i === q.answer ? ' correct' : checked && i === answer.choice ? ' chosen' : '') + '"><input type="radio" name="tpAnswer" value="' + i + '"' + (answer?.choice === i ? ' checked' : '') + '><span>' + esc(option) + (checked && i === q.answer ? '<small>Correct answer</small>' : checked && i === answer.choice ? '<small>Your choice</small>' : '') + '</span></label>').join('') + '</div></fieldset>' +
      (!checked ? '<div class="tp-actions"><button type="submit" class="btn primary tp-submit"' + (!answer ? ' disabled' : '') + '>Check answer →</button><a href="' + href('learn',route.topic.id,route.mode) + '">Look back at Learn</a></div>' : '') + '</form>' +
      (checked ? '<div class="tp-feedback" role="status" tabindex="-1"><strong>' + (answer.choice === q.answer ? 'That’s right.' : 'A useful point to revisit.') + '</strong><p>' + esc(q.explanation) + '</p><div class="tp-actions"><button type="button" class="btn ghost tp-retry">Try this question again</button>' + (index < questions.length-1 ? '<button type="button" class="btn primary tp-next">Next question →</button>' : '') + '</div></div>' : '') + '</section>' +
      (reviewed === questions.length ? '<section class="tp-complete"><div><p class="tp-eyebrow">This set is checked</p><h2>' + correct + ' of ' + questions.length + ' correct in your current attempt</h2><p>Explain the mechanism in Reason, or revisit any question above.</p></div><a class="btn primary" href="' + href('reason',route.topic.id,route.mode) + '">Put it into words →</a></section>' : '') + footer(route);
    host.querySelectorAll('[data-question]').forEach(button => button.addEventListener('click', () => {state.index = Number(button.dataset.question); save(); renderSolve(route,true);}));
    $('.tp-answer-form').addEventListener('change', e => {
      if (!e.target.matches('input[name=tpAnswer]')) return;
      state.answers[index] = {question:q.question,signature:JSON.stringify(q.options)+':'+q.answer,choice:Number(e.target.value),checked:false};
      save(); $('.tp-submit').disabled = false;
    });
    $('.tp-answer-form').addEventListener('submit', e => {
      e.preventDefault(); if (!state.answers[index] || state.answers[index].checked) return;
      state.answers[index].checked = true; save(); renderSolve(route); focusCurrent('.tp-feedback');
    });
    $('.tp-retry')?.addEventListener('click', () => {state.answers[index] = null; save(); renderSolve(route,true);});
    $('.tp-next')?.addEventListener('click', () => {state.index++; save(); renderSolve(route,true);});
    mountDepth(route);
    if (focus) focusCurrent('#tpQuestion');
  }
  function validExample(topic) {
    const example = enrichment(topic.id)?.workedExample;
    return example && typeof example.question === 'string' && Array.isArray(example.steps) && example.steps.length && typeof example.answer === 'string' ? example : null;
  }
  function renderReason(route, focus) {
    const example = validExample(route.topic);
    if (!example) { renderUnavailable(route); return; }
    state.draft = typeof state.draft === 'string' ? state.draft.slice(0,5000) : '';
    state.reflection = typeof state.reflection === 'string' ? state.reflection.slice(0,3000) : '';
    state.revealed = Math.max(0,Math.min(example.steps.length,Number.isInteger(state.revealed) ? state.revealed : 0));
    const complete = state.revealed === example.steps.length;
    host.innerHTML = header(route,'Make a prediction, trace the cause, then compare your explanation.') +
      '<ol class="tp-stages" aria-label="Reasoning stages"><li' + (!state.revealed ? ' aria-current="step"' : '') + '><span>01</span> Predict</li><li' + (state.revealed && !complete ? ' aria-current="step"' : '') + '><span>02</span> Trace</li><li' + (complete ? ' aria-current="step"' : '') + '><span>03</span> Reflect</li></ol>' +
      '<section class="tp-scenario"><p class="tp-eyebrow">The question</p><h2>' + esc(example.question) + '</h2></section><div class="tp-reason-grid"><section class="tp-draft"><label for="tpDraft">Your prediction & reasoning</label><p id="tpDraftHint">What should happen? Explain which biological mechanism leads to it.</p><textarea id="tpDraft" rows="6" maxlength="5000" aria-describedby="tpDraftHint" placeholder="I predict… because…">' + esc(state.draft) + '</textarea><p class="tp-note">Your own words, saved here. Compare them with the worked explanation; this is not automatically graded.</p>' +
      (!state.revealed ? '<button type="button" class="btn primary tp-reveal"' + (!state.draft.trim() ? ' disabled' : '') + '>Compare my reasoning →</button>' : '') + '</section><section class="tp-trace" aria-label="Worked reasoning"><div class="tp-trace-head"><p class="tp-eyebrow">Follow the mechanism</p><span>' + state.revealed + ' / ' + example.steps.length + '</span></div>' +
      (!state.revealed ? '<div class="tp-prompt-map" aria-hidden="true"><span>Change</span><i>↓</i><span>Mechanism</span><i>↓</i><span>Outcome</span></div><p class="tp-note">Write your prediction first. Then uncover the causal chain one step at a time.</p>' : '<ol class="tp-chain">' + example.steps.slice(0,state.revealed).map((step,i) => '<li><span class="tp-chain-number">' + (i+1) + '</span><p>' + esc(typeof step === 'string' ? step : step.detail || step.text || step.title) + '</p></li>').join('') + '</ol><div class="tp-step-status" role="status" tabindex="-1">Step ' + state.revealed + ' of ' + example.steps.length + ' revealed.</div>' +
      (!complete ? '<button type="button" class="btn ghost tp-reveal">Trace the next step →</button>' : '<div class="tp-model-answer"><strong>Bring it together</strong><p>' + esc(example.answer) + '</p></div>')) + '</section></div>' +
      (complete ? '<section class="tp-reflect"><p class="tp-eyebrow">Make the connection</p><h2>What would you add to your explanation?</h2><label for="tpReflection">Name a missing link, or explain why your original prediction holds.</label><textarea id="tpReflection" rows="3" maxlength="3000" placeholder="The key link in the mechanism is…">' + esc(state.reflection) + '</textarea><div class="tp-actions"><a class="btn primary" href="' + href('solve',route.topic.id,route.mode) + '">Test it with questions →</a><button type="button" class="btn ghost tp-revisit">Hide the worked answer</button></div></section>' : '') + footer(route);
    $('#tpDraft').addEventListener('input', e => {state.draft = e.target.value; save(); if (!state.revealed) $('.tp-reveal').disabled = !state.draft.trim();});
    $('#tpReflection')?.addEventListener('input', e => {state.reflection = e.target.value; save();});
    $('.tp-reveal')?.addEventListener('click', () => {if (!state.draft.trim()) return; state.revealed++; save(); renderReason(route,true);});
    $('.tp-revisit')?.addEventListener('click', () => {state.revealed = 0; save(); renderReason(route); focusCurrent('#tpDraft');});
    mountDepth(route);
    if (focus) focusCurrent('.tp-step-status');
  }
  function renderUnavailable(route) {
    host.innerHTML = header(route,'This topic’s practice could not be loaded.') + '<p>Return to the concept, or open the full practice collection below.</p>' + footer(route);
  }
  function enhanceReasonVisuals() {
    if (section !== 'reason' || !global.BioLibraryVisuals?.preview) return;
    original.querySelectorAll('.rz-workout').forEach(card => {
      const caseId = card.getAttribute('href')?.slice(1), topicId = caseTopics[caseId];
      const topic = topics().find(t => t.id === topicId);
      if (!topic || card.dataset.topicVisual === topicId) return;
      const previous = card.querySelector('.bp-media');
      const media=document.createElement('span');media.className='bp-media';
      if (previous) previous.replaceWith(media); else card.prepend(media);
      media.setAttribute('aria-hidden','true'); media.classList.add('tp-case-preview');
      media.innerHTML = global.BioLibraryVisuals.preview(topic,{topics:topics(),idPrefix:'tp-case-card-'+caseId});
      card.dataset.topicVisual=topicId;card.dataset.previewMounted='topic-'+topicId;card.classList.add('bp-card');
    });
    const topicId=caseTopics[location.hash.slice(1)], topic=topics().find(t=>t.id===topicId);
    const prompt=original.querySelector('.rz-prompt');
    if (topic && prompt && !original.querySelector('.tp-case-visual')) {
      const figure=document.createElement('figure');figure.className='tp-case-visual';
      figure.innerHTML=global.BioLibraryVisuals.preview(topic,{topics:topics(),idPrefix:'tp-case-detail-'+topic.id})+'<figcaption>Concept model · '+esc(topic.title)+' <a href="'+href('learn',topic.id,'visual')+'">Explore the model ↗</a></figcaption>';
      prompt.before(figure);
    }
  }
  function renderCatalog() {
    let latest = get('latest',{});
    // The existing Learn progress record supplies the most recent reading context.
    try {
      const last = JSON.parse(localStorage.getItem('bio.entelloq.library.progress.v1'))?.last;
      if (last && topics().some(t => t.id === last.id)) latest = {topic:last.id,mode:last.mode};
    } catch (_) { /* A blocked store still leaves the topic picker usable. */ }
    const caseTopic = section === 'reason' && caseTopics[location.hash.slice(1)];
    if (caseTopic) latest = {topic:caseTopic,mode:modes.includes(latest.mode) ? latest.mode : 'scientific'};
    const selected = topics().find(t => t.id === latest.topic) || topics()[0];
    const mode = modes.includes(latest.mode) ? latest.mode : 'layman';
    if (!selected) {catalog.hidden = true; return;}
    catalog.classList.toggle('tp-case-bridge',Boolean(caseTopic));
    if (caseTopic) {
      catalog.innerHTML = '<span>Connected concept: <strong>' + esc(selected.title) + '</strong></span><nav aria-label="Continue this reasoning case"><a href="' + href('learn',selected.id,mode) + '">Review in Learn ↗</a><a href="' + href('solve',selected.id,mode) + '">Test in Solve →</a></nav>';
      return;
    }
    catalog.innerHTML = '<div><p class="tp-eyebrow">' + (caseTopic ? 'Connect this case to Learn' : 'Continue from Learn') + '</p><h2>Bring a concept into practice.</h2><p>Stay with the same topic in Learn, Reason and Solve.</p></div><form><label for="tpTopic">Choose a concept</label><select id="tpTopic" name="topic">' + topics().map(t => '<option value="' + t.id + '"' + (t.id === selected.id ? ' selected' : '') + '>' + esc(t.title) + '</option>').join('') + '</select><button class="btn primary" type="submit">' + (section === 'reason' ? 'Reason it through' : 'Test my understanding') + ' →</button><a class="tp-catalog-learn" href="' + href('learn',selected.id,mode) + '">Open this concept in Learn ↗</a></form>';
    catalog.querySelector('form').addEventListener('submit', e => {e.preventDefault(); location.hash = '#learn/' + catalog.querySelector('select').value + '/' + mode;});
    catalog.querySelector('select').addEventListener('change', e => {catalog.querySelector('.tp-catalog-learn').href = href('learn',e.target.value,mode);});
  }
  function route(event) {
    const next = parseRoute(location.hash);
    document.body.classList.toggle('tp-active',Boolean(next));
    if (!next) {
      active = null; host.hidden = true; original.hidden = false; catalog.hidden = false; renderCatalog();
      enhanceReasonVisuals();
      return;
    }
    active = next;
    // Continuing a concept should not replay Solve's entry cinematic. Its own
    // skip handler boots the existing engine and cleans up animation listeners.
    const launch = document.getElementById('launch');
    if (launch && !launch.classList.contains('done')) document.getElementById('launchSkip')?.click();
    put('latest',{topic:next.topic.id,mode:next.mode});
    state = get(section + '.' + next.topic.id,{});
    // Do not trust persisted primitive values or arrays as a practice state.
    if (!state || typeof state !== 'object' || Array.isArray(state)) state = {};
    saved = put(section + '.' + next.topic.id,state);
    original.hidden = true; catalog.hidden = true; host.hidden = false;
    if (section === 'solve') renderSolve(next); else renderReason(next);
    publish(next);
    if (event?.type === 'hashchange') focusCurrent('.tp-heading h1');
  }
  function boot() {
    original = document.getElementById(section === 'reason' ? 'reasonApp' : 'svRoot');
    if (!original) return;
    host = document.createElement('div'); host.id = 'bioPractice'; host.className = 'tp-practice wrap'; host.hidden = true;
    catalog = document.createElement('section'); catalog.id = 'bioPracticeCatalog'; catalog.className = 'tp-catalog wrap';
    original.before(catalog,host);
    if (section === 'reason') {
      let queued=false;
      new MutationObserver(records=>{
        if(queued || !records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches('.rz-workout,.rz-prompt')||n.querySelector('.rz-workout,.rz-prompt')))))return;
        queued=true;queueMicrotask(()=>{queued=false;enhanceReasonVisuals();});
      }).observe(original,{childList:true,subtree:true});
    }
    addEventListener('hashchange',route);
    route();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})(window);
