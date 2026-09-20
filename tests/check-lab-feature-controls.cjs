/* Source-shell DOM regression. No WebGL, camera, model mutation or AI request.
 * Run: node tests/check-lab-feature-controls.cjs
 * Module close targets use their real source CSS on minimal DOM fixtures;
 * the rendered microscope/scale journey are covered by the separate live check. */
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '../biology-entelloq/node_modules');
const { chromium } = createRequire(path.join(modules, '__feature_controls__.cjs'))('playwright');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const lab = read('lab.html');
const headStyles = (lab.split('</head>')[0].match(/<style\b[^>]*>[\s\S]*?<\/style>/g) || []).join('\n');
const shared = lab.match(/<!-- ENTELLOQ-ECOSYSTEM-SWITCHER:START -->[\s\S]*?<!-- ENTELLOQ-ECOSYSTEM-SWITCHER:END -->/)[0];
const shellSource = read('src/lab/shell.js').replace(/^export /gm, '');
const anatomy = read('src/lab/anatomy.js').replace(/^export /gm, '');
const histologySource = read('src/lab/histology.js');
const histologyCSS = histologySource.match(/const HIS_CSS = `([\s\S]*?)`;/)[1];
// Read the real catalogue without drawing any slides. Only renderer references
// are stubbed; names, stains and catalogue length remain source-owned data.
const slideSource = histologySource.slice(histologySource.indexOf('const HIS_SLIDES = {'), histologySource.indexOf('/* Resolve a part'));
const slideRenderers = Object.fromEntries([...slideSource.matchAll(/draw:\s*(HIS_\w+)/g)].map(match => [match[1],()=>{}]));
const catalogue = vm.runInNewContext(slideSource+'\nObject.entries(HIS_SLIDES).map(([id,slide])=>({id,name:slide.name,stain:slide.stain}))',slideRenderers);
assert.equal(catalogue.length,23,'real microscope catalogue is fully represented');
const journeyCSS = read('src/lab/zoomverse.js').match(/style\.textContent = `([\s\S]*?)`;/)[1];
const viewports = [{width:1440,height:1000},{width:768,height:1024},{width:390,height:844},{width:320,height:640},{width:844,height:390}];

async function usable(page, selector) {
  const info = await page.locator(selector).evaluate(el => {
    const r = el.getBoundingClientRect();
    return { selector:el.id || el.className, width:r.width, height:r.height, x:r.x, y:r.y,
      bounds:r.x >= 0 && r.y >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
      hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)) };
  }).catch(error => { throw new Error(selector + ': ' + error.message); });
  assert.ok(info.width >= 44 && info.height >= 44 && info.bounds && info.hit, JSON.stringify(info));
}

(async () => {
  const browser = await chromium.launch({headless:true,args:['--disable-gpu']});
  const errors = [], pictures = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({viewport,hasTouch:true,reducedMotion:'reduce'});
      await context.route('**/*', route => route.request().url() === 'http://lab-features.test/'
        ? route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+headStyles+'<body><div id="stage"></div>'+shared})
        : route.abort());
      const page = await context.newPage(); page.setDefaultTimeout(5000);
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://lab-features.test/');
      await page.addScriptTag({content:anatomy+'\n'+shellSource+`
        window.shell=buildShell(document.body);document.querySelector('#shellcss').textContent=SHELL_CSS;
        shell.setSpecimen(SPECIMENS.frog,[]);
        window.featureEvents=[]; window.adjustments=[]; window.leakedKeys=[];
        shell.on('feature',id=>featureEvents.push(id));
        shell.on('imaging-window',()=>adjustments.push('window'));
        shell.on('imaging-weighting',()=>adjustments.push('weighting'));
        window.addEventListener('keydown',e=>leakedKeys.push(e.key));
      `});
      await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('#pick')).opacity) === 0);
      assert.equal(await page.locator('#histologybtn').isDisabled(),true);
      assert.equal(await page.locator('#scalebtn').isDisabled(),true);
      for (const selector of ['#histologybtn','#scalebtn','#labmodesbtn']) await usable(page,selector);
      await page.locator('#labmodesbtn').tap(); await usable(page,'#featureclose');
      assert.equal(await page.evaluate(()=>shell.featureOpen()),true);
      for (const id of ['imaging','physiology','tutor','tutor-answer','tutor-hint','tutor-skip','pathology','layers'])
        assert.equal(await page.locator('[data-choice="'+id+'"]').isDisabled(),true,id);
      await page.keyboard.press('v'); await page.keyboard.press('z'); await page.keyboard.press('1');
      assert.equal(await page.locator('#viva').isVisible(),false);
      await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(()=>document.activeElement.dataset.choice),'controls');
      await page.keyboard.press('Tab'); assert.equal(await page.evaluate(()=>document.activeElement.id),'featureclose');
      await page.keyboard.press('Escape'); assert.equal(await page.evaluate(()=>document.activeElement.id),'labmodesbtn');
      assert.deepEqual(await page.evaluate(()=>leakedKeys),[],'chooser keyboard must not reach the dissection');
      await page.evaluate(() => {
        shell.setFeatureAvailability({histology:true,zoomverse:true,imaging:true,physiology:true,tutor:true});
        shell.setCases([{id:'case1',label:'Case one',applicable:true}]);
        shell.setStrata([{layer:0,name:'Exterior'}],0);
      });
      for (const id of ['tutor','tutor-answer','tutor-hint','tutor-skip','physiology']) {
        await page.locator('#labmodesbtn').tap();
        await page.locator('[data-choice="'+id+'"]').tap();
        assert.equal(await page.evaluate(()=>shell.featureOpen()),false);
      }
      assert.deepEqual(await page.evaluate(()=>featureEvents),['tutor','tutor-answer','tutor-hint','tutor-skip','physiology']);
      await page.locator('#labmodesbtn').tap();
      assert.equal(await page.locator('[data-choice="pathology"]').isDisabled(),false);
      assert.equal(await page.locator('[data-choice="layers"]').isDisabled(),false);
      await page.locator('[data-choice="imaging"]').tap();
      assert.equal(await page.locator('#drawer').evaluate(el=>el.classList.contains('open')),true);
      assert.equal(await page.evaluate(()=>document.activeElement.parentElement.id),'imgseg');
      for (const mode of ['off','xray','us']) {
        await page.evaluate(mode=>shell.setImaging({mode}),mode);
        assert.equal(await page.locator('#imgwindowbtn').isDisabled(),true);
        assert.equal(await page.locator('#imgweightingbtn').isDisabled(),true);
      }
      await page.evaluate(()=>shell.setImaging({mode:'ct',window:{level:40,width:400}}));
      assert.equal(await page.locator('#imgwindowbtn').isDisabled(),false);
      assert.equal(await page.locator('#imgweightingbtn').isDisabled(),true);
      assert.match(await page.locator('#imgwindowbtn').textContent(),/40 \/ 400/);
      assert.match(await page.locator('#imgwindowbtn').getAttribute('title'),/level 40, width 400/);
      await page.locator('#imgwindowbtn').scrollIntoViewIfNeeded(); await usable(page,'#imgwindowbtn');
      await page.locator('#imgwindowbtn').tap();
      await page.evaluate(()=>shell.setImaging({mode:'mri',window:{level:500,width:1000},weighting:'t2'}));
      assert.equal(await page.locator('#imgweightingbtn').isDisabled(),false);
      assert.match(await page.locator('#imgweightingbtn').textContent(),/T2/);
      await page.locator('#imgweightingbtn').scrollIntoViewIfNeeded(); await usable(page,'#imgweightingbtn');
      await page.locator('#imgweightingbtn').tap();
      assert.deepEqual(await page.evaluate(()=>adjustments),['window','weighting']);
      await page.evaluate(()=>{shell.setImaging({mode:'off'});shell.setConsoleOpen(false);});

      await page.locator('#histologybtn').focus();
      await page.evaluate(catalogue=>{
        const frogSlides=new Set(['epidermis','intestine','liver','lung','kidney','spleen']);
        shell.showFeatureChoices({title:'Histology · reference slides',
          note:'Illustrative teaching sections, not microscope photographs or tissue sampled from your dissection. Choose a labelled reference and change magnification. Each sample identifies its reference species. These are normal sections, not pathology findings.',
          items:catalogue.map(slide=>({id:slide.id,label:slide.name,detail:slide.stain+' · '+(frogSlides.has(slide.id)?'Frog':'Mammalian')+' reference'})),selectedId:'gastric',
          onChoose:id=>window.chosen={id,focus:document.activeElement.id,open:shell.featureOpen()}});
      },catalogue);
      await usable(page,'#featureclose');
      assert.equal(await page.locator('[data-choice="gastric"]').getAttribute('aria-current'),'true');
      assert.equal(await page.locator('#featuretitle').evaluate(el=>{const r=el.getBoundingClientRect();return el.closest('#features').contains(document.elementFromPoint(r.left+10,r.top+10));}),true,'shared launcher must not cover the chooser title');
      assert.equal(await page.locator('#featurebox').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;}),true);
      const cardLayout = await page.locator('#featureitems').evaluate(grid=>{
        const buttons=[...grid.querySelectorAll('.feature-choice')];
        const overflow=buttons.flatMap(button=>{
          const bounds=button.getBoundingClientRect();
          return [...button.querySelectorAll('strong,span')].filter(child=>{
            const r=child.getBoundingClientRect();
            return r.left<bounds.left-1||r.top<bounds.top-1||r.right>bounds.right+1||r.bottom>bounds.bottom+1;
          }).map(child=>({id:button.dataset.choice,text:child.textContent}));
        });
        const overlaps=[];
        for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++){
          const a=buttons[i].getBoundingClientRect(),b=buttons[j].getBoundingClientRect();
          if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)
            overlaps.push([buttons[i].dataset.choice,buttons[j].dataset.choice]);
        }
        return {count:buttons.length,overflow,overlaps};
      });
      assert.equal(cardLayout.count,23);
      assert.deepEqual(cardLayout.overflow,[],JSON.stringify({viewport,overflow:cardLayout.overflow}));
      assert.deepEqual(cardLayout.overlaps,[],JSON.stringify({viewport,overlaps:cardLayout.overlaps}));
      await page.locator('[data-choice="gallbladder"]').scrollIntoViewIfNeeded();
      await usable(page,'#featureclose'); await usable(page,'[data-choice="gallbladder"]');
      const picture=path.join(os.tmpdir(),'biology-feature-chooser-'+viewport.width+'x'+viewport.height+'.png');
      await page.screenshot({path:picture});pictures.push(picture);
      await page.locator('[data-choice="gallbladder"]').focus(); await page.keyboard.press('Enter');
      assert.deepEqual(await page.evaluate(()=>chosen),{id:'gallbladder',focus:'histologybtn',open:false});
      await page.locator('#histologybtn').tap(); await page.locator('#scalebtn').tap();
      assert.deepEqual(await page.evaluate(()=>featureEvents.slice(-2)),['histology','zoomverse']);
      await page.evaluate(()=>{
        shell.setStructure({name:'Liver',system:'Digestive',actions:[{id:'histology',label:'Histology',partId:'liver-left'}]});
        shell.setActions([{id:'histology',label:'Histology',partId:'liver-left'}],(id,partId)=>window.actionTarget={id,partId});
      });
      await page.locator('#struct .act').tap();
      assert.deepEqual(await page.evaluate(()=>actionTarget),{id:'histology',partId:'liver-left'});
      await page.evaluate(()=>{
        shell.setStructure(null); shell.setFeatureAvailability({histology:false,zoomverse:false,tutor:false});
        shell.setCases(null); shell.setStrata(null,0);
      });
      assert.equal(await page.locator('#histologybtn').isDisabled(),true);
      assert.equal(await page.locator('#scalebtn').isDisabled(),true);
      // Later-injected module CSS must not undo accessible close sizing/focus.
      await page.addStyleTag({content:histologyCSS+'\n'+journeyCSS});
      await page.evaluate(()=>{
        const his=document.createElement('div');his.id='his';his.className='on ready';
        his.innerHTML='<button id="hisClose" class="fade" type="button" aria-label="Close microscope">×</button>';document.body.appendChild(his);
      });
      await usable(page,'#hisClose'); await page.keyboard.press('Tab'); await page.locator('#hisClose').focus();
      assert.ok(await page.locator('#hisClose').evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth)>=2 && getComputedStyle(el).outlineStyle!=='none'));
      await page.evaluate(()=>{
        document.querySelector('#his').remove();const journey=document.createElement('div');journey.id='zoomverse';journey.className='on vis';
        journey.innerHTML='<div class="zv-top"><span></span><button class="zv-x" type="button">Esc ×</button></div>';document.body.appendChild(journey);
      });
      await usable(page,'#zoomverse .zv-x');await page.locator('#zoomverse .zv-x').focus();
      assert.ok(await page.locator('#zoomverse .zv-x').evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth)>=2 && getComputedStyle(el).outlineStyle!=='none'));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await context.close();
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({viewports:viewports.length,errors,pictures},null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
