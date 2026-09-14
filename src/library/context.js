/* Context travels with the concept or experiment. No provider keys or network calls. */
(function () {
  'use strict';
  let context = null, dialog = null, returnFocus = null;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
      dialog.querySelector('.bio-guide-form').addEventListener('submit', e => { e.preventDefault(); answer(dialog.querySelector('textarea').value); });
      dialog.addEventListener('close', () => returnFocus?.isConnected && returnFocus.focus());
      dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
    }
    returnFocus = document.activeElement;
    dialog.querySelector('.bio-guide-context').textContent = context ? (context.title || context.topic || context.lab) + (context.subtopic ? ' / '+context.subtopic : '') + ' · ' + (context.mode || context.stage || 'investigation') : 'Select a concept to begin.';
    dialog.querySelector('textarea').value = question;
    if (!dialog.open) dialog.showModal();
    answer(question || 'What should I consider next?');
    dialog.querySelector('textarea').focus();
  }
  function answer(question) {
    dialog.querySelector('.bio-guide-answer').textContent = reply(question);
    window.dispatchEvent(new CustomEvent('bioq:ask', { detail: { question, context } }));
  }
  window.BioContext = {
    publish(value) {
      context = value;
      window.dispatchEvent(new CustomEvent('bioq:context', { detail: value }));
      if (parent !== window && location.origin !== 'null') parent.postMessage({ bioqContext: value }, location.origin);
    },
    get: () => context, ask, reply, escape: esc
  };
})();
