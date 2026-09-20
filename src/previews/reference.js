/* Conceptual reference diagrams. Atlas/timeline content and selection stay owned
 * by Explore; these progressively enhance its existing controls without timers.
 * Editorial corrections in Explore were checked against:
 * https://www.nature.com/articles/s41559-024-02461-1 (LUCA)
 * https://pubmed.ncbi.nlm.nih.gov/24821442/ (early photosynthesis evidence)
 * https://www.nature.com/articles/s41467-021-23286-7 (oxygenation)
 * https://openstax.org/books/anatomy-and-physiology-2e/pages/25-5-physiology-of-urine-formation
 */
(function () {
  'use strict';
  if (!document.getElementById('atlas') || !document.getElementById('tlTrack')) return;
  const ink='var(--ink)',accent='var(--em)',dim='var(--dim)',sky='var(--cy)',rose='var(--rose)',amber='var(--amber)',indigo='var(--indigo)';
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const path=(d,color=accent,width=3,fill='none')=>`<path d="${d}" fill="${fill}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const circle=(x,y,r,color=accent,opacity=.12)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" fill-opacity="${opacity}" stroke="${color}" stroke-width="2"/>`;
  const ellipse=(x,y,rx,ry,color=accent)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${color}" fill-opacity=".1" stroke="${color}" stroke-width="2"/>`;
  const text=(x,y,label,color=dim,size=13)=>`<text x="${x}" y="${y}" text-anchor="middle" fill="${color}" font-size="${size}">${esc(label)}</text>`;
  const line=(x,y,xx,yy,color=accent,width=2)=>path(`M${x} ${y}L${xx} ${yy}`,color,width);
  const arrow=(x,y,xx,yy,color=accent)=>{const angle=Math.atan2(yy-y,xx-x),r=9;return line(x,y,xx,yy,color)+path(`M${xx-r*Math.cos(angle-.5)} ${yy-r*Math.sin(angle-.5)}L${xx} ${yy}L${xx-r*Math.cos(angle+.5)} ${yy-r*Math.sin(angle+.5)}`,color,2);};
  const label=(a,b)=>text(300,292,a,ink,16)+(b?text(300,316,b,dim,11):'');
  const cell=(x,y,r=38)=>circle(x,y,r,accent)+circle(x-7,y,12,indigo,.2)+ellipse(x+15,y+12,9,5,amber);
  const bodyOutline=()=>circle(300,45,21,dim,.025)+path('M286 68L267 82L253 160L264 167L281 112L278 190L277 255M314 68L333 82L347 160L336 167L319 112L322 190L323 255M278 188Q300 204 322 188M300 204V232',dim,1.5);
  const heart=(x=300,y=145,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">${path('M0 60C-72 13-54-61-8-34C20-76 84-34 55 14Q36 45 0 60Z',rose,3,'var(--panel)')}${path('M-2-32Q12-6-3 56M-40-5L4 0L48-10',rose,2)}${path('M11-43V-64Q39-76 42-43M-18-38V-63',sky,5)}</g>`;
  const kidneys=()=>path('M244 85C174 61 159 176 215 185C255 192 264 155 233 141C215 132 269 108 244 85Z',rose,3,'var(--panel)')+path('M356 85C426 61 441 176 385 185C345 192 336 155 367 141C385 132 331 108 356 85Z',rose,3,'var(--panel)')+path('M239 152Q267 173 276 230M361 152Q333 173 324 230',amber,3)+path('M273 224Q300 206 327 224Q344 258 300 266Q256 258 273 224ZM300 266V284',amber,3,'var(--panel)');
  function atlas(index) {
    switch(index) {
      case 0:return bodyOutline()+path('M289 31Q272 32 276 48Q265 61 283 64Q289 75 299 63Q309 75 320 60Q336 54 324 40Q324 26 309 28Q299 18 289 31Z',indigo,2,'var(--panel)')+path('M300 65V186M300 85L273 108L264 145M300 85L327 108L337 146M300 154L284 193L283 250M300 154L316 193L317 250',sky,3)+path('M287 37Q304 44 286 52M314 35Q302 42 320 51',indigo,1.5)+text(430,82,'Brain',ink)+line(340,55,404,75,dim,1)+text(436,154,'Spinal cord',ink)+line(305,128,394,149,dim,1)+label('A fast communication network','Central and peripheral nerves carry signals in both directions');
      case 1:return heart(300,139,.72)+path('M292 97V39H440V225H316M270 119H174V229H288M272 97V48H169V87M320 106H428V48H307',rose,3)+path('M312 106V48H206V106M315 169V244H160V106M293 181V244H449V111',sky,3)+text(109,141,'Body',dim)+text(471,141,'Lungs',dim)+[0,1,2,3].map(i=>line(155+i*9,92,155+i*9,117,dim,1.5)+line(425+i*9,98,425+i*9,117,dim,1.5)).join('')+label('Two linked circuits','Heart → lungs → heart → body');
      case 2:return path('M292 25V115L253 147M308 25V115L347 147M283 98C223 60 166 104 170 219Q201 251 275 211ZM317 98C377 60 434 104 430 219Q399 251 325 211Z',sky,3,'var(--panel)')+path('M250 143L209 168M250 143L240 195M348 143L391 168M348 143L359 195',sky,3)+[0,1,2].map(i=>line(289,44+i*19,311,44+i*19,dim,1.3)).join('')+path('M163 253Q300 214 438 253',rose,3)+circle(502,199,32,accent)+[0,1,2,3,4].map(i=>circle(478+i*12,200+Math.sin(i)*14,9,accent)).join('')+arrow(449,174,474,187,dim)+label('Airways branch toward alveoli','A thin exchange surface connects ventilation with blood flow');
      case 3:return path('M297 26V88Q302 112 330 104Q373 88 377 126Q382 167 328 177Q305 180 291 156',rose,5)+path('M291 154Q247 153 251 177L344 179Q368 180 365 202L254 202Q242 206 254 222L347 224Q369 228 355 244H290V267',amber,5)+path('M229 262V182Q208 154 228 141H274M365 175H393V254H326',accent,6)+path('M274 106Q210 63 183 112Q184 149 260 130Z',indigo,2,'var(--panel)')+text(443,135,'Stomach',dim)+line(384,132,407,132,dim,1)+text(118,198,'Intestine',dim)+line(161,194,233,204,dim,1)+label('Break down. Absorb. Reclaim.','A continuous digestive tract works with accessory organs');
      case 4:return circle(300,45,27,dim,.06)+path('M282 59L287 79H313L319 58M300 82V194M251 105H349M251 105L228 172L208 218M349 105L372 172L392 218M269 191L283 216L270 270M331 191L317 216L330 270M269 191Q300 175 331 191Q319 214 300 213Q281 214 269 191',ink,3)+[0,1,2,3,4].map(i=>path(`M298 ${107+i*13}Q237 ${93+i*16}257 ${120+i*11}M302 ${107+i*13}Q363 ${93+i*16}343 ${120+i*11}`,dim,2)).join('')+label('A living framework','Bones support, protect and provide attachment for muscles');
      case 5:return path('M161 84L292 193L423 136',ink,11)+circle(292,193,18,dim,.08)+path('M176 84Q262 75 280 176Q230 148 176 84Z',rose,3,'var(--panel)')+path('M166 111Q156 171 273 208Q213 161 166 111Z',indigo,3,'var(--panel)')+line(173,91,270,174,rose,5)+arrow(361,182,397,157,accent)+text(356,87,'Flexor shortens',rose)+line(322,93,251,118,dim,1)+text(156,241,'Antagonist lengthens',indigo)+label('Muscles pull across a joint','Antagonistic pairs control movement by changing tension');
      case 6:return bodyOutline()+[[301,51,indigo],[300,86,amber],[300,142,rose],[284,176,accent],[316,176,accent],[293,210,amber],[307,210,amber]].map(([x,y,c])=>circle(x,y,7,c,.4)).join('')+arrow(339,115,426,115,amber)+[0,1,2].map(i=>circle(352+i*26,153,4,amber,.6)).join('')+circle(483,138,40,sky)+path('M457 105V119H469V105',amber,3)+text(481,205,'Target cell',ink)+text(176,145,'Hormone',amber)+label('Small signals, specific receptors','Endocrine glands release chemical messengers into circulation');
      case 7:return path('M288 34Q261 75 270 126L245 218M312 34Q339 75 330 126L355 218M270 126L300 166L330 126M300 166V246',accent,3)+[[271,99],[330,99],[268,135],[333,135],[291,183],[310,198]].map(([x,y])=>circle(x,y,9,accent,.25)).join('')+circle(449,127,34,sky)+circle(449,127,12,indigo,.3)+[0,1,2].map(i=>path(`M${403+i*42} 219V201L${395+i*42} 190M${403+i*42} 201L${411+i*42} 190`,rose,3)).join('')+text(143,111,'Lymph nodes',ink)+line(200,113,253,103,dim,1)+text(450,65,'Immune cell',ink)+label('Surveillance, response and memory','Lymphatic vessels connect tissues with immune-cell meeting points');
      case 8:return `<g transform="translate(0 -18)">${kidneys()}</g>`+line(300,37,300,174,rose,4)+path('M300 83H255M300 83H345',rose,3)+text(105,117,'Kidney',ink)+line(145,113,181,112,dim,1)+text(456,207,'Ureter',ink)+line(417,200,343,196,dim,1)+label('Filter, then selectively reabsorb','Urine travels from kidneys to bladder through the ureters');
      case 9:return circle(180,143,49,rose,.12)+circle(180,143,18,indigo,.3)+ellipse(319,144,15,9,sky)+path('M334 143Q363 122 384 145Q405 165 431 142',sky,3)+arrow(272,213,392,213,accent)+cell(465,143,49)+text(180,224,'Egg',rose)+text(316,103,'Sperm',sky)+text(465,224,'Zygote',ink)+label('Two gametes combine genetic information','Fertilisation restores a paired chromosome set');
      default:return '';
    }
  }
  const fish=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">${path('M-72 0Q-15-65 66-4Q26 52-72 0L-109-31V31ZM-18-23L-11-48L13-28M-11 21L-2 48L25 20',accent,3,'var(--panel)')}${circle(39,-8,4,ink,.8)}</g>`;
  const sprout=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">${path('M0 60V-40M0-10Q-53-49-64-16Q-46 16 0-10M0-29Q49-78 65-39Q52-6 0-29M0 60L-26 80M0 60L26 82',accent,3,'var(--panel)')}</g>`;
  function timeline(index) {
    switch(index) {
      case 0:return cell(152,129,42)+cell(301,103,59)+cell(441,168,46)+[0,1,2].map(i=>path(`M69 ${223+i*13}Q170 ${198+i*13}290 ${228+i*13}T530 ${223+i*13}`,sky,1.5)).join('')+label('Early microbial life','A conceptual scene; the earliest origins remain uncertain');
      case 1:return [0,1,2,3,4,5].map(i=>path(`M113 ${249-i*20}Q147 ${157-i*17}225 ${215-i*20}Q275 ${138-i*16}337 ${207-i*18}Q405 ${151-i*12}486 ${249-i*20}`,i%2?dim:accent,4)).join('')+circle(446,64,24,amber,.2)+arrow(420,92,383,130,amber)+label('Layer upon layer','Microbial communities and sediment build stromatolites');
      case 2:return path('M62 200Q172 171 298 204T539 194',sky,3)+[0,1,2,3,4].map(i=>circle(104+i*92,228,16,accent,.12)).join('')+[[142,106],[284,73],[438,123]].map(([x,y])=>circle(x-10,y,14,sky,.15)+circle(x+10,y,14,sky,.15)).join('')+arrow(168,172,178,132,accent)+arrow(404,183,418,155,accent)+text(285,122,'O₂',sky,23)+label('Oxygen accumulates','Biological production interacts with geological oxygen sinks');
      case 3:return ellipse(300,146,151,103,accent)+circle(260,132,44,indigo,.13)+ellipse(373,148,33,18,amber)+path('M353 148L363 139L373 156L383 137L396 146',amber,2)+ellipse(247,206,23,12,amber)+text(260,137,'Nucleus',ink,12)+text(447,55,'Mitochondrion',amber)+line(421,64,390,126,dim,1)+label('A compartmentalised cell','Endosymbiotic ancestry connects mitochondria to bacteria');
      case 4:return [0,1,2,3,4,5,6].map(i=>{const a=i*Math.PI*2/7;return cell(207+Math.cos(a)*66,153+Math.sin(a)*66,31);}).join('')+circle(206,153,29,accent)+arrow(319,151,369,151,dim)+circle(405,120,24,rose)+circle(456,181,24,sky)+arrow(451,120,490,123,rose)+arrow(475,181,495,154,sky)+cell(524,137,27)+label('Cooperation and genetic mixing','Multicellularity and sexual reproduction have distinct histories');
      case 5:return ellipse(163,157,51,89,amber)+[0,1,2,3,4,5].map(i=>path(`M116 ${103+i*21}Q163 ${91+i*21}211 ${103+i*21}`,amber,2)).join('')+line(163,70,163,243,amber,2)+fish(354,166,.6)+[0,1,2].map(i=>path(`M${456+i*30} 238V${149+i*17}Q${452+i*30} ${122+i*17} ${443+i*30} ${99+i*17}M${456+i*30} ${151+i*17}L${473+i*30} ${115+i*17}`,accent,3)).join('')+label('Diverse marine body plans','Concept sketches of segmented, swimming and attached animals');
      case 6:return path('M74 213Q300 190 532 213',dim,2)+sprout(211,147,.8)+sprout(378,149,1.25)+[0,1,2].map(i=>path(`M${166+i*98} 227l-12 26M${170+i*98} 227l18 34`,amber,2)).join('')+label('Plants establish on land','Structures for support, water balance and reproduction diversify');
      case 7:return fish(173,137,.84)+arrow(274,151,335,151,dim)+path('M389 99L406 152L448 188L478 201M406 152L397 192L413 226M448 188L470 224M413 226l-6 16m6-16 8 16M470 224l-3 16m3-16 9 13',ink,8)+circle(406,152,9,amber,.3)+circle(448,188,7,amber,.3)+text(174,237,'Lobed fin',accent)+text(428,265,'Limb framework',ink)+label('Shared skeletal patterns','Fins and limbs reveal evolutionary relationships');
      case 8:return path('M83 206Q176 207 209 145Q242 110 322 137L366 82Q383 38 430 66L466 76L455 94L409 95L385 153Q368 180 329 184L307 238L340 247H287L282 187L249 185L229 242L255 251H204L207 181Q156 214 83 206Z',accent,3,'var(--panel)')+circle(433,76,4,ink,.8)+path('M373 149l33 7l-12 16',accent,3)+label('Dinosaurs diversify','A stylised body plan; birds are living dinosaurs');
      case 9:return circle(253,194,85,sky,.1)+path('M188 138Q227 160 225 185L201 202L236 241M291 131L318 167L298 187L319 221',accent,3)+circle(425,61,24,amber,.3)+path('M443 44L480 12M451 66L493 39M420 38L444 11',amber,4)+arrow(399,84,325,145,rose)+path('M315 149l17-28l-2 31l33-7l-26 17l23 23l-31-12',amber,2)+label('A rapid environmental disruption','Impact-related change reshapes ecosystems at the K–Pg boundary');
      case 10:return path('M300 240V174L192 118M300 174L408 118M192 118L140 65M192 118L243 65M408 118L358 65M408 118L458 65',dim,3)+circle(140,59,20,accent)+circle(243,59,20,accent)+circle(358,59,20,indigo)+circle(458,59,20,rose)+text(183,30,'Other primate branches',dim,12)+text(410,30,'Hominin branches',ink,12)+label('Evolution branches','Humans and chimpanzees share ancestors; one did not become the other');
      case 11:return path('M255 211V183Q229 170 230 123Q225 58 294 50Q355 50 362 108L384 141L358 146V169H321V212M259 210H322',ink,3,'var(--panel)')+path('M259 95Q280 70 305 89Q340 81 341 112Q320 104 302 125Q278 116 259 135Q247 114 259 95Z',indigo,2)+circle(343,119,4,ink,.7)+[0,1,2,3].map(i=>circle(153+i*100,249,7,accent,.2)+(i<3?line(162+i*100,249,244+i*100,249,dim,1):'')).join('')+label('Homo sapiens','An interconnected species with a shared African origin');
      default:return '';
    }
  }
  function svg(type,index,title) { return `<svg viewBox="0 0 600 340" role="img" aria-label="${esc(title)} conceptual diagram" xmlns="http://www.w3.org/2000/svg"><title>${esc(title)} — conceptual diagram</title>${type==='atlas'?atlas(index):timeline(index)}</svg>`; }
  function thumb(button,type,index) {
    if (button.querySelector('.br-reference-thumb')) return;
    const preview=document.createElement('span');preview.className='br-reference-thumb';preview.setAttribute('aria-hidden','true');
    const title=button.querySelector(type==='atlas'?'.sn':'.nm')?.firstChild?.textContent || 'Biology';
    preview.innerHTML=svg(type,index,title);button.prepend(preview);
  }
  function selected(type) {
    const list=document.getElementById(type==='atlas'?'sysList':'tlTrack'),detail=document.getElementById(type==='atlas'?'atlasDetail':'tlDetail');
    const button=list?.querySelector('[aria-selected="true"]');if(!detail||!button||detail.querySelector('.br-reference-figure'))return;
    const index=Number(button.dataset.i);if(!Number.isInteger(index))return;
    const title=detail.querySelector('h3,h4')?.textContent || 'Biology';
    const figure=document.createElement('figure');figure.className='br-reference-figure';figure.dataset.referenceType=type;figure.dataset.referenceIndex=index;
    figure.innerHTML=svg(type,index,title)+'<figcaption>Concept sketch · structures are simplified and not to scale.</figcaption>';
    detail.prepend(figure);
  }
  document.querySelectorAll('#sysList .sys-btn').forEach(button=>thumb(button,'atlas',Number(button.dataset.i)));
  document.querySelectorAll('#tlTrack .tl-ev').forEach(button=>thumb(button,'timeline',Number(button.dataset.i)));
  for(const type of ['atlas','timeline']) {
    const detail=document.getElementById(type==='atlas'?'atlasDetail':'tlDetail');if(!detail)continue;
    new MutationObserver(()=>selected(type)).observe(detail,{childList:true});selected(type);
  }
  // Existing Atlas click selection is retained. Match the Timeline's keyboard access.
  const list=document.getElementById('sysList');
  list?.addEventListener('keydown',event=>{
    if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const buttons=[...list.querySelectorAll('.sys-btn')],current=buttons.indexOf(event.target.closest('.sys-btn'));
    if(current<0)return;event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,current+(['ArrowDown','ArrowRight'].includes(event.key)?1:-1)));
    buttons[next].click();buttons[next].focus();
  });
  window.BioReferencePreviews={svg};
})();
