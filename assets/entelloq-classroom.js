/* Optional local classroom exchange. No accounts, uploads, grading or cloud service. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./entelloq-science.js'));
  else root.EntelloqClassroom = factory(root.EntelloqScience);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Science) {
  'use strict';
  function plain(value, limit, field) { if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new Error(field + ' is required (maximum ' + limit + ' characters).'); return value.trim(); }
  function validateAssignment(value, catalog) {
    if (!value || value.format !== 'entelloq-assignment' || value.version !== 1) throw new Error('Choose an Entelloq assignment file, version 1.');
    var id = plain(value.id, 100, 'Assignment ID'), experiment = value.experiment;
    if (!experiment || (experiment.subject !== 'physics' && experiment.subject !== 'biology')) throw new Error('Invalid assignment subject.');
    var ref = { id: plain(experiment.id, 180, 'Experiment ID'), subject: experiment.subject };
    var item = catalog.find(function (x) { return x.id === ref.id && x.subject === ref.subject; });
    if (!item) throw new Error('This experiment is not available in this catalogue. Open the matching subject or update the app.');
    return { format: 'entelloq-assignment', version: 1, id: id, title: plain(value.title, 200, 'Title'), experiment: ref, objective: plain(value.objective, 2000, 'Learning objective'), question: plain(value.question, 4000, 'Investigation question'), curriculum: (item.tags || []).filter(function (tag) { return /cbse|class|grade|curriculum/i.test(tag); }), createdAt: typeof value.createdAt === 'string' ? value.createdAt : null };
  }
  function validateSubmission(value, catalog) {
    if (!value || value.format !== 'entelloq-submission' || value.version !== 1) throw new Error('Choose an Entelloq submission file, version 1.');
    var a = validateAssignment(value.assignment, catalog), e = value.entry;
    if (!e || e.subject !== a.experiment.subject || typeof e.title !== 'string') throw new Error('Submission does not contain a matching subject record.');
    if (!matchesEntry(a, e, catalog)) throw new Error('This observation belongs to a different experiment. Save evidence from the assigned experiment before submitting.');
    // The exported scientific record is data, never executable HTML or a URL destination.
    var serialized = JSON.stringify(e); if (serialized.length > 2000000) throw new Error('Submission record exceeds 2 MB.');
    return { format: 'entelloq-submission', version: 1, assignment: a, entry: JSON.parse(serialized), studentCode: typeof value.studentCode === 'string' ? value.studentCode.slice(0,80) : '', submittedAt: typeof value.submittedAt === 'string' ? value.submittedAt : null };
  }
  function matchesEntry(assignment, entry, catalog) {
    var item = catalog.find(function (x) { return x.id === assignment.experiment.id && x.subject === assignment.experiment.subject; });
    if (!item || !entry || entry.subject !== item.subject || entry.kind === 'classroom-review') return false;
    return entry.catalogId === item.id || (!entry.catalogId && (entry.experimentId === item.id || (item.experimentId && entry.experimentId === item.experimentId)));
  }
  function serialize(value) { var text=JSON.stringify(value); if(new TextEncoder().encode(text).byteLength>2100000)throw new Error('The exchange file exceeds 2.1 MB. Reduce its captured data before exporting.');return text; }
  function parse(text, catalog) { if (new TextEncoder().encode(text).byteLength > 2100000) throw new Error('Choose a file smaller than 2.1 MB.'); var value = JSON.parse(text, function(k,v){if(k==='__proto__'||k==='constructor'||k==='prototype')throw new Error('Unsupported file content.');return v;}); return value.format === 'entelloq-assignment' ? validateAssignment(value,catalog) : validateSubmission(value,catalog); }
  function worksheetHTML(assignment) {
    var e = Science.escapeHTML;
    return '<!doctype html><html lang="en"><meta charset="utf-8"><title>' + e(assignment.title) + '</title><style>body{font:17px/1.6 system-ui;max-width:850px;margin:40px auto;padding:20px;color:#172b3b}section{min-height:100px;border-bottom:1px solid #bccbd4;break-inside:avoid}small{color:#456}</style><h1>' + e(assignment.title) + '</h1><p>' + e(assignment.experiment.subject) + ' · ' + e(assignment.experiment.id) + '</p><h2>Learning objective</h2><p>' + e(assignment.objective) + '</p><h2>Investigate</h2><p>' + e(assignment.question) + '</p><section><h2>Predict</h2><p>What do you expect, and why?</p></section><section><h2>Method</h2><p>Which parameter will you change? Which will you hold fixed?</p></section><section><h2>Evidence</h2><p>Record settings, readings with units and graph observations.</p></section><section><h2>Explain and evaluate</h2><p>Use your evidence to explain the result. State model assumptions and limitations.</p></section><small>Local classroom pilot. Return your exported submission using the method agreed with your teacher. This app does not upload work or provide a private teacher inbox.</small></html>';
  }
  function open(options) {
    if (!Science.classroomEnabled()) return false;
    var catalog = options.catalog || [], notebook = options.notebook, previous = document.activeElement, active = null;
    var dialog = document.createElement('dialog'); dialog.className = 'eq-classroom eq-science'; dialog.setAttribute('aria-label','Classroom pilot');
    dialog.innerHTML = '<header class="eq-actions"><h2>Classroom pilot</h2><button type="button" data-close>Close</button></header><p>Local file exchange · No cloud sync or student accounts</p><p>Create a worksheet, complete an experiment and export a submission. Teachers can open a submission here and save private review notes on this device. Use anonymous student codes.</p><details open><summary>Create an assignment</summary><form data-create><label>Experiment<select name="experiment" required></select></label><label>Assignment title<input name="title" maxlength="200" required></label><label>Learning objective<textarea name="objective" maxlength="2000" required></textarea></label><label>Investigation question<textarea name="question" maxlength="4000" required></textarea></label><button type="submit">Create assignment</button></form></details><details><summary>Open an assignment or submission</summary><label>Entelloq JSON file<input type="file" data-import accept="application/json,.json"></label></details><div class="eq-status" role="status" data-status></div><section data-active hidden></section>';
    document.body.appendChild(dialog);
    var picker = dialog.querySelector('select'), status = dialog.querySelector('[data-status]'), body = dialog.querySelector('[data-active]');
    catalog.filter(function (item) { return /lab|experiment|simulation|practical/i.test(item.kind || ''); }).forEach(function (item) { var option = document.createElement('option'); option.value = catalog.indexOf(item); option.textContent = item.subject + ' · ' + item.title; picker.appendChild(option); });
    function inform(message) { status.textContent = message; }
    function close() { dialog.close(); dialog.remove(); if (previous && previous.isConnected) previous.focus(); }
    dialog.querySelector('[data-close]').onclick = close; dialog.addEventListener('cancel', function (event) { event.preventDefault(); close(); });
    function render(value) {
      active = value; var a = value.assignment || value, item = catalog.find(function(x){return x.id===a.experiment.id&&x.subject===a.experiment.subject;});
      body.hidden = false;
      body.innerHTML = '<h3>' + Science.escapeHTML(a.title) + '</h3><p><strong>Objective:</strong> ' + Science.escapeHTML(a.objective) + '</p><p>' + Science.escapeHTML(a.question) + '</p><p>' + Science.escapeHTML(item.title) + '</p><div class="eq-actions"><button type="button" data-launch>Open experiment</button><button type="button" data-assignment>Export assignment JSON</button><button type="button" data-worksheet>Printable worksheet</button></div>';
      body.querySelector('[data-launch]').onclick = function(){ close(); if(options.openExperiment)options.openExperiment(item); };
      body.querySelector('[data-assignment]').onclick = function(){ try{Science.download('entelloq-assignment.json',serialize(a),'application/json');inform('Assignment exported. No student work was uploaded.');}catch(e){inform(e.message);} };
      body.querySelector('[data-worksheet]').onclick = function(){ Science.download('entelloq-worksheet.html',worksheetHTML(a),'text/html');inform('Worksheet exported. Open it in a browser to print or save as PDF.'); };
      if(value.format==='entelloq-submission'){
        var attribution=document.createElement('p');attribution.textContent='Student code: '+(value.studentCode||'Not supplied')+' · Submitted: '+(value.submittedAt||'Not supplied');body.appendChild(attribution);
        var record = document.createElement('pre');record.textContent=JSON.stringify(value.entry,null,2);body.appendChild(record);
        var label = document.createElement('label');label.textContent='Teacher review notes (local only)';var notes=document.createElement('textarea');notes.maxLength=10000;label.appendChild(notes);body.appendChild(label);
        var save=document.createElement('button');save.type='button';save.textContent='Save review locally';body.appendChild(save);
        save.onclick=function(){var result=notebook.save({title:'Review: '+a.title,subject:a.experiment.subject,experimentId:a.experiment.id,kind:'classroom-review',config:{assignment:a,submission:value.entry,studentCode:value.studentCode,submittedAt:value.submittedAt},observations:notes.value,provenance:{source:'Imported classroom submission; values have not been independently verified.'}});inform(result.ok?'Review saved on this device. No feedback was sent.':result.error);};
      }else{
        var label=document.createElement('label');label.textContent='Saved observation to submit';var entries=notebook.list().filter(function(e){return matchesEntry(a,e,catalog);}), select=document.createElement('select');entries.forEach(function(e,i){var o=document.createElement('option');o.value=i;o.textContent=e.title+' · '+e.updatedAt;select.appendChild(o);});label.appendChild(select);body.appendChild(label);
        var codeLabel=document.createElement('label');codeLabel.textContent='Anonymous student code (optional)';var code=document.createElement('input');code.maxLength=80;codeLabel.appendChild(code);body.appendChild(codeLabel);
        var exportButton=document.createElement('button');exportButton.type='button';exportButton.textContent='Export submission JSON';exportButton.disabled=!entries.length;body.appendChild(exportButton);
        var hint=document.createElement('p');hint.textContent=entries.length?'Only records from the assigned experiment are offered. Check the readings and your explanation before exporting.':'Save an observation in the assigned experiment, then reopen this assignment to submit it.';body.appendChild(hint);
        exportButton.onclick=function(){try{var e=entries[Number(select.value)],v=validateSubmission({format:'entelloq-submission',version:1,assignment:a,entry:e,studentCode:code.value,submittedAt:new Date().toISOString()},catalog);Science.download('entelloq-submission.json',serialize(v),'application/json');inform('Submission exported. Deliver the file using the method agreed with your teacher.');}catch(e){inform(e.message);}};
      }
    }
    dialog.querySelector('[data-create]').onsubmit=function(event){event.preventDefault();try{var form=new FormData(event.target),item=catalog[Number(form.get('experiment'))];if(!item)throw Error('No supported experiments in this catalogue.');render(validateAssignment({format:'entelloq-assignment',version:1,id:Science.uid(),title:form.get('title'),objective:form.get('objective'),question:form.get('question'),experiment:{id:item.id,subject:item.subject},createdAt:new Date().toISOString()},catalog));inform('Assignment ready. Export its JSON file and worksheet.');}catch(e){inform(e.message);}};
    dialog.querySelector('[data-import]').onchange=async function(event){try{var file=event.target.files[0];if(!file)return;if(file.size>2100000)throw Error('Choose a file smaller than 2.1 MB.');render(parse(await file.text(),catalog));inform('File opened locally. Nothing was uploaded.');}catch(e){inform('Could not open file: '+e.message);}event.target.value='';};
    dialog.showModal();dialog.querySelector('[data-close]').focus();return true;
  }
  return {open:open,parse:parse,serialize:serialize,validateAssignment:validateAssignment,validateSubmission:validateSubmission,matchesEntry:matchesEntry,worksheetHTML:worksheetHTML};
});
