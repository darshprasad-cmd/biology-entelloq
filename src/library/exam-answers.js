/* Offline worked-answer presentation. Question text, answer keys and marks live
 * in their original engines; this module only explains those authored answers. */
(function (global) {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const letter = index => String.fromCharCode(65 + index);
  const paras = paragraphs => (paragraphs || []).filter(Boolean).map(p => '<p>' + esc(p) + '</p>').join('');
  const ar = ['Both statements are true, and the reason explains the assertion.', 'Both statements are true, but the reason does not explain the assertion.', 'The assertion is true; the reason is false.', 'The assertion is false; the reason is true.'];
  function table(caption, headings, rows) {
    return '<div class="be-table-scroll" tabindex="0" role="region" aria-label="' + esc(caption) + '"><table><caption>' + esc(caption) + '</caption><thead><tr>' + headings.map(h => '<th scope="col">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(row => '<tr>' + row.map((cell,i) => '<' + (i ? 'td' : 'th scope="row"') + '>' + esc(cell) + '</' + (i ? 'td' : 'th') + '>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }
  function diagram(model) {
    if (!model) return '';
    if (model.rows) return '<figure class="be-diagram">' + table(model.title, model.headings, model.rows) + (model.note ? '<figcaption>' + esc(model.note) + '</figcaption>' : '') + '</figure>';
    return '<figure class="be-diagram"><figcaption>' + esc(model.title) + '</figcaption><ol class="be-flow">' + model.steps.map((step,i) => '<li><span class="be-flow-index">' + (i+1) + '</span><strong>' + esc(step[0]) + '</strong><span>' + esc(step[1]) + '</span>' + (i < model.steps.length-1 ? '<b class="be-flow-arrow" aria-hidden="true">↓</b>' : '') + '</li>').join('') + '</ol>' + (model.note ? '<p class="be-diagram-note">' + esc(model.note) + '</p>' : '') + '</figure>';
  }
  function options(choices, answer, reasons) {
    if (!Array.isArray(reasons) || reasons.length !== choices.length) return '';
    return '<div class="be-options"><h3>Check each option</h3><dl>' + choices.map((choice,i) => '<div' + (i === answer ? ' class="be-option-correct"' : '') + '><dt><span>' + letter(i) + '</span>' + esc(choice) + (i === answer ? '<small>Correct answer</small>' : '') + '</dt><dd>' + esc(reasons[i]) + '</dd></div>').join('') + '</dl></div>';
  }
  function answer(model) {
    return '<div class="bioq-exam-answer"><p class="be-direct"><strong>' + esc(model.label || 'Answer') + '</strong>' + esc(model.answer) + '</p><div class="be-explanation">' + paras(model.paragraphs) + '</div>' + diagram(model.diagram) + (model.extra || '') + (model.note ? '<p class="be-precision"><strong>Precision matters</strong>' + esc(model.note) + '</p>' : '') + '</div>';
  }
  function solve(q) {
    if (!q || typeof q !== 'object') return '';
    if (q.type === 'case' && Array.isArray(q.subs)) return '<div class="be-case-solutions">' + q.subs.map((sub,i) => '<section><h3>Part ' + (i+1) + ' · ' + esc(sub.stem) + '</h3>' + solve(Object.assign({},sub,{id:q.id + '.' + i,type:'mcq'})) + '</section>').join('') + '</div>';
    const data = global.BIO_EXAM_SOLVE?.[q.id] || (q.generated ? generated(q) : null) || {};
    const choices = q.type === 'ar' ? ar : q.options;
    let direct = choices?.[q.answer];
    let extra = choices ? options(choices,q.answer,data.reasons) : '';
    if (q.type === 'match') {
      direct = 'The correct pairs connect each structure or process to its biological role.';
      extra = table('Correct matches and why they fit',['Structure / process','Correct match','Biological explanation'],q.left.map((item,i) => [item,q.right[i],data.matches?.[i] || '']));
    }
    if (q.type === 'diagram') direct = data.answer;
    return answer({label:choices ? 'Correct answer · ' + letter(q.answer) : 'Worked answer',answer:direct || q.explain,paragraphs:data.paragraphs || [q.explain],diagram:data.diagram,extra,note:data.note});
  }
  function generated(q) {
    const facts = global.BIO_EXAM_GENERATED || {};
    const key = q.options?.[q.answer], correct = facts[key];
    if (!correct) return null;
    return {paragraphs:correct.paragraphs,diagram:correct.diagram,note:correct.note,reasons:q.options.map(option => facts[option]?.contrast || '')};
  }
  function topic(q, concept) {
    const authored = global.BIO_EXAM_TOPICS?.[concept.id]?.[q.question];
    const rationales = global.BIO_EXAM_TOPIC_RATIONALES?.[q.question] || global.BIO_EXAM_CHECKPOINT_RATIONALES?.[q.question];
    const paragraphs = authored?.paragraphs || [q.explanation,concept.explanations?.scientific];
    const reasons = authored?.reasons || (rationales && q.options.every(option => typeof rationales[option] === 'string') ? q.options.map(option => rationales[option]) : null);
    return answer({label:'Correct answer · ' + letter(q.answer),answer:q.options[q.answer],paragraphs,diagram:authored?.diagram,extra:options(q.options,q.answer,reasons),note:authored?.note});
  }
  function reason(example, concept) {
    const steps = example.steps.map(step => typeof step === 'string' ? step : step.detail || step.text || step.title).filter(Boolean);
    // Assemble the already-authored causal links into an exam-ready paragraph;
    // the progressive trace remains above it and the student's draft is untouched.
    const data = global.BIO_EXAM_REASON?.[concept.id];
    return answer({label:'Model answer',answer:example.answer,paragraphs:data?.paragraphs || [steps.join(' ')],diagram:data?.diagram,note:data?.note});
  }
  function workout(id, stage, source) {
    const data = global.BIO_EXAM_WORKOUTS?.[id]?.[stage];
    if (!data) return source?.why ? '<p>' + esc(source.why) + '</p>' : '';
    if (stage === 'principles') return '<div class="bioq-exam-answer"><h3>Why these principles apply</h3><dl class="be-principles">' + source.options.map((option,i) => '<div><dt>' + esc(option.t) + '<small>' + (option.ok ? 'Relevant principle' : 'Reasoning trap') + '</small></dt><dd>' + esc(data.reasons[i]) + '</dd></div>').join('') + '</dl></div>';
    const choices = source?.o;
    const correctIndex = Number.isInteger(source?.a) ? source.a : Math.max(0,choices?.findIndex(o => o.ok) ?? 0);
    return answer({label:stage === 'reason' ? 'Model exam answer' : 'Correct answer',answer:choices ? (typeof choices[correctIndex] === 'string' ? choices[correctIndex] : choices[correctIndex].t) : data.answer,paragraphs:data.paragraphs || [source?.why],diagram:data.diagram,extra:choices && data.reasons ? options(choices.map(o => typeof o === 'string' ? o : o.t),correctIndex,data.reasons) : '',note:data.note});
  }
  global.BioExamAnswers = {solve,topic,reason,workout,diagram};
})(window);
