/* Authored study depth and private self-review. A self-check is not a mastery score. */
(function (global) {
  'use strict';
  const prefix = 'bioq.depth-study.v1.';
  const memory = new Map();
  const pending = new Set();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const unitFor = id => global.BIO_DEPTH?.[id];
  const signature = task => JSON.stringify([task.question, task.answer, task.rows || []]);
  const empty = () => ({draft:'', rating:'', revealed:false, compared:false, signature:''});
  function clean(raw, task) {
    const item = empty();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return item;
    item.draft = typeof raw.draft === 'string' ? raw.draft.slice(0,4000) : '';
    item.signature = signature(task);
    if (raw.signature === item.signature) {
      item.revealed = raw.revealed === true;
      item.compared = raw.compared === true || item.revealed;
      item.rating = item.compared && item.draft.trim() && ['revisit','explained'].includes(raw.rating) ? raw.rating : '';
    }
    return item;
  }
  function read(id, kind, task) {
    const key = prefix + id + '.' + kind;
    if (pending.has(key)) return {value:clean(memory.get(key),task),saved:false};
    try {
      const raw = global.localStorage.getItem(key);
      return {value:clean(raw ? JSON.parse(raw) : memory.get(key),task), saved:true};
    } catch (_) { return {value:clean(memory.get(key),task), saved:false}; }
  }
  function write(id, kind, task, value) {
    const key = prefix + id + '.' + kind;
    const record = clean({...value,signature:signature(task)},task);
    memory.set(key,record);
    try { global.localStorage.setItem(key,JSON.stringify(record)); pending.delete(key); return true; }
    catch (_) { pending.add(key); return false; }
  }
  function reviewItems(topics) {
    return topics.filter(topic => {
      const unit = unitFor(topic.id);
      return unit && ['investigation','transfer'].some(kind => read(topic.id,kind,unit[kind]).value.rating === 'revisit');
    });
  }
  function table(task) {
    return '<div class="bd-table-wrap" role="region" aria-label="Evidence table" tabindex="0"><table><caption>' + esc(task.title) + '</caption><thead><tr>' + task.columns.map(c => '<th scope="col">'+esc(c)+'</th>').join('') + '</tr></thead><tbody>' + task.rows.map(row => '<tr>' + row.map((cell,i) => i ? '<td>'+esc(cell)+'</td>' : '<th scope="row">'+esc(cell)+'</th>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }
  function exercise(id, kind, task) {
    const evidence = kind === 'investigation';
    const uid = 'bd-' + id + '-' + kind;
    return '<section class="bd-exercise" data-depth-task="'+kind+'" aria-labelledby="'+uid+'-title"><p class="bl-label">'+(evidence?'Read the evidence':'Apply it somewhere new')+'</p><h3 id="'+uid+'-title">'+esc(evidence?task.title:'Can you transfer the idea?')+'</h3>' +
      (evidence ? '<p>'+esc(task.context)+'</p>'+table(task) : '') + '<p class="bd-question">'+esc(task.question)+'</p><label for="'+uid+'-draft">'+(evidence?'Your claim, evidence and reasoning':'Your prediction and explanation')+'</label><textarea id="'+uid+'-draft" data-depth-draft rows="4" maxlength="4000" placeholder="I think… because…"></textarea><p class="bd-note">Saved privately in this browser. Your explanation is for self-review; it is not automatically graded.</p>' +
      '<details class="bd-hint"><summary>Give me a hint</summary><p>'+esc(task.hint)+'</p></details><details class="bd-answer"><summary>Compare with the worked explanation</summary>' +
      (evidence ? '<ol>'+task.reasoning.map(step=>'<li>'+esc(step)+'</li>').join('')+'</ol>' : '') + '<p><strong>'+esc(task.answer)+'</strong></p>'+(evidence?'<p class="bd-limit"><strong>What this evidence cannot tell us</strong><br>'+esc(task.limitation)+'</p>':'')+'</details>' +
      '<fieldset class="bd-review" disabled><legend>After comparing, how does your explanation stand?</legend><button type="button" data-depth-rating="revisit" aria-pressed="false">I need to revisit this</button><button type="button" data-depth-rating="explained" aria-pressed="false">I can explain the mechanism</button></fieldset><p class="bd-save" role="status" aria-live="polite"></p></section>';
  }
  function markup(topic, view = 'learn') {
    const unit = unitFor(topic.id);
    if (!unit) return '';
    const head = '<div class="bd-header"><div><p class="bl-label">Build a deeper understanding</p><h2 id="bd-title">From the idea to the evidence.</h2></div><p>Trace the mechanism. Test an explanation. Notice its limits.</p></div>';
    const foundations = '<details class="bd-goals"><summary>What you should be able to explain</summary><ul>'+unit.objectives.map(o=>'<li>'+esc(o)+'</li>').join('')+'</ul></details><div class="bd-mechanism"><h3>How the mechanism unfolds</h3>'+unit.mechanism.map((step,i)=>'<details'+(i===0?' open':'')+'><summary><span aria-hidden="true">0'+(i+1)+'</span>'+esc(step.title)+'</summary><p>'+esc(step.body)+'</p></details>').join('')+'</div><details class="bd-misconception"><summary>A common misconception to untangle</summary><p><strong>The tempting claim: </strong>'+esc(unit.misconception.claim)+'</p><p>'+esc(unit.misconception.correction)+'</p></details>';
    const tasks = view === 'solve' ? ['transfer'] : view === 'reason' ? ['investigation'] : ['investigation','transfer'];
    return '<section class="bd-study" aria-labelledby="bd-title" data-depth-topic="'+esc(topic.id)+'">'+head+(view==='learn'?foundations:'')+tasks.map(kind=>exercise(topic.id,kind,unit[kind])).join('')+'<footer class="bd-footer"><button type="button" data-depth-export>Download my study notes</button><span>Reference reading</span>'+unit.sources.filter(s=>/^https:\/\//.test(s.url)).map(s=>'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+' ↗</a>').join('')+'</footer></section>';
  }
  function notes(topic) {
    const unit = unitFor(topic.id);
    const lines = ['# '+topic.title+' — study notes','','Personal self-review, not a graded assessment.',''];
    for (const kind of ['investigation','transfer']) {
      const task = unit[kind], record = read(topic.id,kind,task).value;
      lines.push('## '+(task.title || 'Transfer the idea'),'');
      if (kind === 'investigation') {
        const row = cells => '| '+cells.map(cell=>String(cell).replace(/\|/g,'\\|').replace(/\n/g,' ')).join(' | ')+' |';
        lines.push(task.context,'',row(task.columns),row(task.columns.map(()=> '---')),...task.rows.map(row),'','Evidence limits: '+task.limitation,'');
      }
      lines.push(task.question,'','My explanation:',record.draft || '(No explanation written yet.)','','Self-review: '+(record.rating==='revisit'?'Revisit this':record.rating==='explained'?'I can explain it':'Not reviewed'),'');
      if (record.compared) lines.push('Worked explanation:',...(task.reasoning || []).map((step,i)=>(i+1)+'. '+step),task.answer,'');
    }
    lines.push('## Reference reading','',...unit.sources.map(s=>s.title+': '+s.url));
    return lines.join('\n');
  }
  function mount(root, topic) {
    const panel = root.querySelector('[data-depth-topic]');
    const unit = unitFor(topic.id);
    if (!panel || !unit) return;
    panel.querySelectorAll('[data-depth-task]').forEach(el => {
      const kind = el.dataset.depthTask, task = unit[kind], loaded = read(topic.id,kind,task);
      let value = loaded.value;
      const draft = el.querySelector('[data-depth-draft]'), answer = el.querySelector('.bd-answer'), controls = el.querySelector('.bd-review'), status = el.querySelector('.bd-save');
      draft.value = value.draft;
      answer.open = value.revealed;
      function update(saved) {
        controls.disabled = !value.compared || !value.draft.trim();
        controls.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed',String(value.rating===b.dataset.depthRating)));
        status.textContent = (value.rating==='revisit'?'Added to your revisit list. ':value.rating==='explained'?'Self-review recorded. ':'')+(saved?'Saved in this browser.':'Browser storage is unavailable; kept for this visit. Download your notes to keep them.');
      }
      update(loaded.saved);
      draft.addEventListener('input', () => {
        value.draft = draft.value; value.rating = '';
        update(write(topic.id,kind,task,value));
      });
      function saveDisclosure() {
        if (value.revealed === answer.open) return;
        value.revealed = answer.open;
        if (answer.open) value.compared = true;
        update(write(topic.id,kind,task,value));
      }
      // Native toggle is queued; save a user action before an immediate reload
      // or route change can discard that event. Keyboard activation clicks too.
      answer.querySelector('summary').addEventListener('click', event => {
        event.preventDefault(); answer.open = !answer.open; saveDisclosure();
      });
      answer.addEventListener('toggle',saveDisclosure);
      controls.addEventListener('click', event => {
        const button = event.target.closest('[data-depth-rating]');
        if (!button || controls.disabled) return;
        value.rating = button.dataset.depthRating;
        update(write(topic.id,kind,task,value));
      });
    });
    panel.querySelector('[data-depth-export]').addEventListener('click', () => {
      const blob = new Blob([notes(topic)],{type:'text/markdown;charset=utf-8'});
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href=url;link.download='biology-'+topic.id+'-study-notes.md';link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
  }
  global.BioDepth = {unitFor,markup,mount,clean,read,write,reviewItems,notes};
})(typeof window !== 'undefined' ? window : globalThis);
