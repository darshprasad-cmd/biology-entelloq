/* Shared real-browser visual and native-control assertions for first-visit setup.
   Call while the default questionnaire is open, before dismissing it. */
'use strict';
const assert=require('node:assert/strict');
async function checkQuestionnaireLayout(page,width,{capture}={}){
 const geometry=await page.locator('#bio-cbse').evaluate(dialog=>{
  const rect=node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
  const choices=name=>[...dialog.querySelectorAll('input[name="'+name+'"]')].map(input=>{
   const label=input.nextElementSibling,b=label.querySelector('b'),style=getComputedStyle(label);
   return{value:input.value,checked:input.checked,box:rect(label),text:rect(b),lineHeight:parseFloat(getComputedStyle(b).lineHeight),background:style.backgroundColor,border:style.borderColor};
  });
  const form=dialog.querySelector('#cbse-form'),select=form.querySelector('select');
  return{view:dialog.dataset.view,groups:[...form.querySelectorAll('fieldset legend')].map(e=>e.innerText.replace(/^\d+\s*/,'')),defaults:Object.fromEntries(new FormData(form)),classChoices:choices('classYear'),goals:choices('goal'),times:choices('minutes'),form:rect(form),panel:rect(dialog.querySelector('.cbse-form-panel')),select:rect(select),privacy:rect(dialog.querySelector('.cbse-device-note')),actions:[...form.querySelectorAll('.cbse-actions button')].map(rect),viewport:{width:innerWidth,height:innerHeight},valid:form.checkValidity()};
 });
 assert.equal(geometry.view,'questionnaire');
 assert.deepEqual(geometry.groups,['Which class are you studying?','What would help today?','How long is this session?','Where would you like to start?']);
 assert.deepEqual(geometry.defaults,{classYear:'9',goal:'foundations',minutes:'20',focus:'cells'});
 assert.equal(geometry.valid,true);
 assert.deepEqual(geometry.classChoices.map(c=>c.value),['9','10','11','12']);
 assert.deepEqual(geometry.goals.map(c=>c.value),['foundations','revision','practice']);
 assert.deepEqual(geometry.times.map(c=>c.value),['10','20','30']);
 const near=(a,b,message)=>assert.ok(Math.abs(a-b)<=1,message+' ('+a+' vs '+b+')');
 const rowCount=items=>new Set(items.map(c=>Math.round(c.box.y))).size;
 assert.equal(rowCount(geometry.classChoices),width>1000?1:2,'class choices use deliberate four-across or two-by-two layout');
 if(width<=1000){near(geometry.classChoices[0].box.y,geometry.classChoices[1].box.y,'first class row');near(geometry.classChoices[2].box.y,geometry.classChoices[3].box.y,'second class row');}
 for(const group of [geometry.classChoices,geometry.goals,geometry.times])for(const choice of group){
  near(choice.box.width,group[0].box.width,'equal choice widths');near(choice.box.height,group[0].box.height,'equal choice heights');
  assert.ok(choice.box.height>=44,'choice touch target remains at least 44px high');
  assert.ok(choice.box.x>=geometry.panel.x&&choice.box.right<=geometry.panel.right,'choice stays within panel');
  assert.ok(choice.text.x>=choice.box.x&&choice.text.right<=choice.box.right,'choice text stays within card');
 }
 assert.equal(rowCount(geometry.times),1,'all three times stay on one row');
 for(const time of geometry.times)assert.ok(time.text.height<=time.lineHeight+1,'time label remains on one text line');
 assert.ok(geometry.select.x>=geometry.panel.x&&geometry.select.right<=geometry.panel.right,'native topic selector stays within panel');
 assert.ok(geometry.select.height>=44);
 near(geometry.actions[0].height,geometry.actions[1].height,'primary and skip action heights');
 for(const action of geometry.actions)assert.ok(action.height>=44&&action.x>=geometry.panel.x&&action.right<=geometry.panel.right,'action remains usable without clipping');
 assert.ok(geometry.privacy.y>=0&&geometry.privacy.bottom<=geometry.viewport.height,'local-only reassurance visible on initial view');
 if(width<=760)assert.ok(geometry.privacy.bottom<geometry.panel.y,'reassurance precedes form on phones');
 assert.notEqual(geometry.classChoices[0].background,geometry.classChoices[1].background,'selected choice has distinct surface');
 assert.notEqual(geometry.classChoices[0].border,geometry.classChoices[1].border,'selected choice has distinct border');
 await page.keyboard.press('Tab');
 const focus=await page.evaluate(()=>{const input=document.activeElement,style=getComputedStyle(input.nextElementSibling);return{name:input.name,value:input.value,visible:input.matches(':focus-visible'),outline:style.outlineStyle,width:parseFloat(style.outlineWidth)};});
 assert.equal(focus.name,'classYear');assert.equal(focus.value,'9');assert.equal(focus.visible,true);assert.notEqual(focus.outline,'none');assert.ok(focus.width>=2,'keyboard focus has a visible ring');
 await page.locator('#cbse-form .cbse-actions').scrollIntoViewIfNeeded();
 if(capture)await capture('questionnaire-actions-'+width);
 await page.locator('#bio-cbse').evaluate(dialog=>{dialog.scrollTop=0;dialog.querySelector('h1').focus({preventScroll:true});});
 return{questionnaireDesign:true,classRows:rowCount(geometry.classChoices),timeRows:1,equalChoiceTargets:true,balancedActions:true,privacyVisible:true,nativeKeyboardFocus:true,unchangedQuestionsAndDefaults:true};
}
module.exports={checkQuestionnaireLayout};
