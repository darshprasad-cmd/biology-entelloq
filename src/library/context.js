/* Context travels with the concept or experiment. Keys stay on the shared server;
   the local guide remains available and experiment records stay on this device. */
(function () {
  'use strict';
  let context = null, dialog = null, returnFocus = null;
  let activeRequest = null, generation = 0, clientPromise = null;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const contextKey = c => [c?.kind, c?.subtopicId || c?.topic || c?.lab, c?.mode || c?.stage].join(':');
  function stop() {
    ++generation;
    if (activeRequest) activeRequest.abort();
    activeRequest = null;
    if (dialog) dialog.querySelector('.bio-guide-form button').textContent = 'Explore the question →';
  }
  function client() {
    if (window.BIOQ_AI) return Promise.resolve(window.BIOQ_AI);
    try { if (parent !== window && parent.BIOQ_AI) return Promise.resolve(parent.BIOQ_AI); } catch (e) { /* standalone */ }
    if (clientPromise) return clientPromise;
    clientPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script'); let timer;
      const fail = () => { clearTimeout(timer); script.remove(); clientPromise = null; reject(new Error('unavailable')); };
      script.src = './src/ai/biology-ai.js'; script.async = true;
      script.onload = () => { clearTimeout(timer); if (window.BIOQ_AI) resolve(window.BIOQ_AI); else fail(); };
      script.onerror = fail; timer = setTimeout(fail, 8000); document.head.appendChild(script);
    });
    return clientPromise;
  }
  function publicContext(c) {
    c = c || {};
    const topic = (window.BIO_LIBRARY?.topics || []).find(t => t.id === (c.subtopicId || c.topic));
    // Only selected topic metadata and authored reference text leave the device.
    // Deliberately exclude hypotheses, trials, observations and saved notebooks.
    return 'Biology Entelloq educational ' + (c.kind === 'lab' ? 'experiment' : 'concept') + '. '
      + 'Topic: ' + String(c.title || c.topic || c.lab || 'biology').slice(0, 200)
      + '. Focus: ' + String(c.subtopic || '').slice(0, 180) + '. Mode: ' + String(c.mode || c.stage || '').slice(0, 80)
      + '.\nAuthored reference: ' + String(topic?.explanations?.[c.mode] || topic?.explanations?.scientific || c.summary || '').slice(0, 2500)
      + '\nStudent experiment records were not supplied. Ask for relevant observations when needed; do not invent results.';
  }
  function reply(question) {
    const c = context || {}, q = question.toLowerCase();
    if (c.kind === 'lab') {
      const trials = c.trials || [], latest = trials.at(-1), previous = trials.at(-2);
      if (!c.hypothesis) return 'Before changing a variable, write a prediction: if you change one condition, which measurement should change, and why?';
      if (!latest) return 'Record a baseline trial. Which one variable will you change next, and which conditions will you hold constant?';
      if (previous) {
        const changed = Object.keys(latest.variables || {}).filter(k => JSON.stringify(latest.variables[k]) !== JSON.stringify(previous.variables?.[k]));
        if (changed.length > 1) return 'Between your last two trials you changed ' + changed.join(', ') + '. Which change caused the result? Repeat while changing only one of these conditions.';
        if (!changed.length) return 'Your last two trials used the same recorded conditions. Compare the measurements: does the model vary between repeats, or is it deterministic? Repeating a deterministic simulation alone does not estimate biological uncertainty.';
        return 'You changed ' + changed[0] + '. Compare the two measurements with your hypothesis. What further value would distinguish a trend from a single comparison?';
      }
      return 'You have a baseline. Choose one independent variable, predict the direction of the change, then record another trial. Explain any difference using the linked theory.';
    }
    const topics = window.BIO_LIBRARY?.topics || [], t = topics.find(t => t.id === (c.subtopicId || c.topic));
    if (!t) return 'Open a concept or an experiment first. I use the selected concept, explanation mode, and recorded trials to keep the discussion in context.';
    const ex = t.explanations;
    if (/simpl|layman/.test(q)) return ex.layman;
    if (/deeper|advanced|molecular/.test(q)) return ex.advanced;
    if (/before|prerequis/.test(q)) {
      const prereqs = (t.prerequisites || []).map(id => topics.find(x => x.id === id)?.title).filter(Boolean);
      return prereqs.length ? 'Build on ' + prereqs.join(' and ') + '. ' + ex.intuition : ex.intuition;
    }
    if (/connect|relat/.test(q)) {
      const related = (t.relatedTopics || []).map(id => topics.find(x => x.id === id)).filter(Boolean);
      return related.slice(0, 2).map(x => x.title + ': ' + x.summary).join('\n\n') || ex.realWorld;
    }
    const term = (t.keyTerms || []).find(x => q.includes(x.term.toLowerCase()));
    if (term) return term.term + ': ' + term.definition + '\n\n' + ex.intuition;
    if (/why|intuition/.test(q)) return ex.intuition;
    if (/world|use|matter/.test(q)) return ex.realWorld;
    return 'From the ' + t.title + ' library entry:\n\n' + (ex[c.mode] || ex.scientific) + '\n\nFor a focused next step, ask for a simpler explanation, a prerequisite, a related concept, or a deeper mechanism.';
  }
  function ask(question = '') {
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.className = 'bio-guide';
      dialog.innerHTML = '<form method="dialog"><button class="bx-btn bio-guide-close" aria-label="Close learning guide">Close ×</button></form><div class="eyebrow">Entelloq learning guide</div><h2>Think it through.</h2><p class="bio-guide-context"></p><p class="bio-guide-source">On-device guidance from the concept library and your experiment records.</p><div class="bio-guide-answer" role="status"></div><form class="bio-guide-form"><label for="bio-guide-question">Ask about this concept or trial</label><textarea id="bio-guide-question" rows="2" maxlength="1200" placeholder="What should I keep controlled?"></textarea><button class="bx-btn pri" type="submit">Explore the question →</button></form>';
      document.body.append(dialog);
      dialog.querySelector('.bio-guide-form').addEventListener('submit', e => {
        e.preventDefault();
        if (activeRequest) { stop(); dialog.querySelector('.bio-guide-source').textContent = 'On-device guidance · AI request stopped.'; return; }
        answer(dialog.querySelector('textarea').value);
      });
      dialog.addEventListener('close', () => { stop(); if(returnFocus?.isConnected)returnFocus.focus(); });
      dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
    }
    returnFocus = document.activeElement;
    dialog.querySelector('.bio-guide-context').textContent = context ? (context.title || context.topic || context.lab) + (context.subtopic ? ' / '+context.subtopic : '') + ' · ' + (context.mode || context.stage || 'investigation') : 'Select a concept to begin.';
    dialog.querySelector('textarea').value = question;
    if (!dialog.open) dialog.showModal();
    answer(question || 'What should I consider next?');
    dialog.querySelector('textarea').focus();
  }
  async function answer(question) {
    stop();
    question = String(question || '').trim() || 'What should I consider next?';
    dialog.querySelector('.bio-guide-answer').textContent = reply(question);
    dialog.querySelector('.bio-guide-source').textContent = 'On-device guidance below. An AI explanation is loading; only your question and selected topic are sent.';
    window.dispatchEvent(new CustomEvent('bioq:ask', { detail: { question, context } }));
    const controller = new AbortController(), gen = generation, selected = contextKey(context), reference = publicContext(context);
    activeRequest = controller; dialog.querySelector('.bio-guide-form button').textContent = 'Stop AI request';
    let ai;
    try {
      ai = await client();
      if (gen !== generation || controller.signal.aborted || !dialog.open) return;
      const result = await ai.ask({ question, context: reference, signal: controller.signal });
      if (gen !== generation || selected !== contextKey(context) || !dialog.open) return;
      dialog.querySelector('.bio-guide-answer').textContent = result;
      dialog.querySelector('.bio-guide-source').textContent = 'AI explanation · verify important details. Experiment records remain on this device.';
    } catch (error) {
      if (gen !== generation || controller.signal.aborted || !dialog.open) return;
      dialog.querySelector('.bio-guide-source').textContent = (ai ? ai.explainError(error) : 'AI is unavailable right now.') + ' Showing on-device guidance.';
    } finally {
      if (gen === generation) { activeRequest = null; dialog.querySelector('.bio-guide-form button').textContent = 'Explore the question →'; }
    }
  }
  window.BioContext = {
    publish(value) {
      if (contextKey(context) !== contextKey(value)) stop();
      context = value;
      window.dispatchEvent(new CustomEvent('bioq:context', { detail: value }));
      if (parent !== window && location.origin !== 'null') parent.postMessage({ bioqContext: value }, location.origin);
    },
    get: () => context, ask, reply, escape: esc
  };
  window.addEventListener('pagehide', stop);
})();
