/*
 * ui.js — the interface that stays out of the way.
 *
 * The whole design brief is "the interface should disappear while exploring", so
 * the HUD is deliberately thin: a title readout, a vertical scale rail showing
 * where you are in the 36-orders-of-magnitude journey, live hotspot markers over
 * the 3D, and one info panel that slides in when you click something. After a few
 * idle seconds every bit of chrome fades to near-nothing and the scene is all
 * there is; the first scroll or move brings it back.
 *
 * It owns its CSS as a string (UI_CSS) injected once, and it talks to the engine
 * only through the small surface core.js exposes (pos, jumpTo, projectedHotspots).
 */

const UI_CSS = `
:root{
  --bg:#04070a; --ink:#eaf2f5; --dim:#9fb2bc; --faint:#66787f;
  --em:#34d399; --cy:#38e0d8; --indigo:#7c8cf8; --amber:#f6c667; --rose:#fb7185;
  --line:rgba(255,255,255,.10); --glass:rgba(9,14,19,.66); --glass-2:rgba(8,12,17,.85);
  --sans:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --ease:cubic-bezier(.23,1,.32,1);
}
*{box-sizing:border-box}
html,body{margin:0;height:100%;overflow:hidden;background:var(--bg);color:var(--ink);
  font-family:var(--sans);-webkit-font-smoothing:antialiased;letter-spacing:-.01em}
#uni{position:fixed;inset:0}
#uni canvas{display:block}
.hud{position:fixed;z-index:10;transition:opacity .6s var(--ease),transform .6s var(--ease)}
body.immersed .hud.dim{opacity:0;pointer-events:none}
body.immersed .hud.dim.rail{opacity:.25}

/* top-left: brand + live scale readout */
.u-top{top:0;left:0;padding:22px 26px;display:flex;align-items:center;gap:14px}
.u-brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:15px}
.u-brand svg{width:26px;height:26px}
.u-brand b{font-weight:800}
.u-readout{margin-left:8px;padding-left:16px;border-left:1px solid var(--line);display:flex;flex-direction:column;gap:2px}
.u-readout .t{font-weight:700;font-size:15px;letter-spacing:-.02em;line-height:1}
.u-readout .s{font-family:var(--mono);font-size:11px;color:var(--cy);letter-spacing:.06em}

/* scale readout number, bottom-left */
.u-scale{left:26px;bottom:26px;font-family:var(--mono)}
.u-scale .num{font-size:clamp(1.6rem,3.2vw,2.4rem);font-weight:800;letter-spacing:-.02em;
  background:linear-gradient(120deg,var(--em),var(--cy));-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1}
.u-scale .lbl{font-size:11px;color:var(--faint);letter-spacing:.14em;text-transform:uppercase;margin-top:6px}

/* bottom hint */
.u-hint{left:50%;bottom:24px;transform:translateX(-50%);display:flex;gap:18px;align-items:center;
  padding:9px 16px;border-radius:999px;background:var(--glass);backdrop-filter:blur(14px);
  border:1px solid var(--line);font-size:12.5px;color:var(--dim)}
.u-hint b{color:var(--ink);font-weight:600}
.u-hint kbd{font-family:var(--mono);font-size:10px;padding:2px 6px;border-radius:5px;border:1px solid var(--line);color:var(--dim)}

/* right scale rail */
.u-rail{right:20px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:3px;align-items:flex-end}
.u-rail button{display:flex;align-items:center;gap:10px;background:none;border:none;cursor:pointer;
  padding:3px 2px;color:var(--faint);font-family:var(--mono);font-size:10.5px;letter-spacing:.04em;
  transition:color .2s;justify-content:flex-end}
.u-rail button .rl{opacity:0;transform:translateX(6px);transition:opacity .2s var(--ease),transform .2s var(--ease);white-space:nowrap;text-transform:uppercase}
.u-rail button:hover .rl,.u-rail button.on .rl{opacity:1;transform:none}
.u-rail button:hover{color:var(--ink)}
.u-rail button .rd{width:22px;height:3px;border-radius:3px;background:var(--line);transition:background .25s,width .25s var(--ease)}
.u-rail button.on{color:var(--ink)}
.u-rail button.on .rd{background:linear-gradient(90deg,var(--em),var(--cy));width:34px}

/* hotspot markers over the 3D */
.u-markers{position:fixed;inset:0;z-index:8;pointer-events:none}
.u-mark{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;cursor:pointer;
  display:flex;align-items:center;gap:8px;will-change:transform,opacity;
  background:none;border:none;margin:0;padding:0;font:inherit;color:inherit;text-align:left}
/* Focus ring for the keyboard path. A pale hairline on its own vanishes over a bright
   nebula, so it rides on a dark halo and stays legible over anything the 3D puts
   behind it. Focusing a marker also reveals its name, exactly as hovering does. */
.u-mark:focus{outline:none}
.u-mark:focus-visible{outline:2px solid var(--ink);outline-offset:4px;border-radius:12px;
  box-shadow:0 0 0 8px rgba(4,7,10,.8)}
.u-mark:focus-visible .ring{transform:scale(1.25)}
.u-mark:focus-visible .nm{opacity:1;transform:none}
.u-mark .ring{width:14px;height:14px;border-radius:50%;border:1.5px solid var(--cy);flex:none;position:relative;
  background:radial-gradient(circle,rgba(56,224,216,.35),transparent 70%);transition:transform .2s var(--ease)}
.u-mark .ring::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:1px solid rgba(56,224,216,.35);
  animation:mpulse 2.4s var(--ease) infinite}
@keyframes mpulse{0%{transform:scale(.6);opacity:.8}100%{transform:scale(1.7);opacity:0}}
.u-mark .nm{font-size:12px;font-weight:600;padding:4px 10px;border-radius:8px;background:var(--glass-2);
  backdrop-filter:blur(10px);border:1px solid var(--line);white-space:nowrap;opacity:0;transform:translateX(-4px);
  transition:opacity .2s,transform .2s var(--ease)}
.u-mark:hover .nm{opacity:1;transform:none}
.u-mark:hover .ring{transform:scale(1.25)}
@media (prefers-reduced-motion:reduce){.u-mark .ring::after{animation:none}}

/* info panel */
.u-panel{position:fixed;z-index:12;top:0;right:0;height:100%;width:min(420px,92vw);
  background:var(--glass-2);backdrop-filter:blur(24px) saturate(1.3);border-left:1px solid var(--line);
  transform:translateX(102%);transition:transform .5s var(--ease);display:flex;flex-direction:column;
  padding:28px 26px;overflow-y:auto}
.u-panel.open{transform:none}
.u-panel .close{position:absolute;top:20px;right:20px;width:34px;height:34px;border-radius:10px;border:1px solid var(--line);
  background:none;color:var(--dim);cursor:pointer;display:grid;place-items:center;transition:color .2s,border-color .2s,transform .1s var(--ease)}
.u-panel .close:hover{color:var(--ink);border-color:var(--cy)}
.u-panel .close:active{transform:scale(.94)}
.u-panel .eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--cy);margin-bottom:12px}
.u-panel h2{font-size:1.7rem;font-weight:800;letter-spacing:-.02em;margin:0 0 12px;line-height:1.1}
.u-panel .desc{color:var(--dim);font-size:15px;line-height:1.65;margin-bottom:20px}
.u-panel .sec{margin-top:20px}
.u-panel .sec h4{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin:0 0 10px;display:flex;align-items:center;gap:8px}
.u-panel .sec h4 svg{width:13px;height:13px}
.u-panel ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.u-panel li{font-size:14px;color:var(--dim);line-height:1.5;padding-left:16px;position:relative}
.u-panel li::before{content:"";position:absolute;left:0;top:8px;width:5px;height:5px;border-radius:50%;background:var(--em)}
.u-panel li.dis::before{background:var(--rose)}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{font-size:12.5px;font-weight:600;padding:7px 12px;border-radius:9px;border:1px solid var(--line);
  background:rgba(255,255,255,.03);color:var(--dim);cursor:pointer;transition:color .2s,border-color .2s,transform .1s var(--ease)}
.chip:hover{color:var(--ink);border-color:var(--cy)}
.chip:active{transform:scale(.96)}
.u-ai{margin-top:6px}
.u-ai .askbtn{display:inline-flex;align-items:center;gap:9px;padding:11px 18px;border-radius:11px;font-weight:600;font-size:14px;
  color:#04140e;background:linear-gradient(120deg,var(--em),var(--cy));border:none;cursor:pointer;
  transition:transform .12s var(--ease),box-shadow .3s}
.u-ai .askbtn:hover{box-shadow:0 12px 34px -12px rgba(52,211,153,.6)}
.u-ai .askbtn:active{transform:scale(.97)}
.u-ai .answer{margin-top:14px;font-size:14px;line-height:1.7;color:var(--ink);border-left:2px solid var(--em);padding-left:14px;
  max-height:0;overflow:hidden;opacity:0;transition:max-height .5s var(--ease),opacity .4s}
.u-ai.show .answer{max-height:400px;opacity:1}
.u-ai .cite{display:block;margin-top:10px;font-family:var(--mono);font-size:10.5px;color:var(--faint)}
.linkbtn{display:inline-flex;align-items:center;gap:7px;color:var(--cy);font-size:13.5px;font-weight:600;cursor:pointer}
.linkbtn:hover{text-decoration:underline}

/* keyboard help */
.u-help{position:fixed;inset:0;z-index:20;display:none;place-items:center;background:rgba(2,4,6,.6);backdrop-filter:blur(8px)}
.u-help.open{display:grid}
.u-help .box{width:min(460px,92vw);background:var(--glass-2);border:1px solid var(--line);border-radius:20px;padding:28px}
.u-help h3{margin:0 0 18px;font-size:1.2rem}
.u-help .row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line);font-size:14px;color:var(--dim)}
.u-help .row:last-child{border:none}
.u-help kbd{font-family:var(--mono);font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid var(--line);color:var(--ink)}

@media (max-width:640px){
  .u-rail{display:none}
  .u-panel{width:100%;height:70%;top:auto;bottom:0;border-left:none;border-top:1px solid var(--line);
    transform:translateY(102%);border-radius:22px 22px 0 0}
  .u-panel.open{transform:none}
  .u-hint{font-size:11px;gap:12px}
  .u-top{padding:16px}
}

/* Notched phones. The page already ships viewport-fit=cover, so env() carries the
   real insets; without this the HUD sits under the notch in landscape and under the
   home indicator at the bottom. It comes last — after the phone media query — so it
   wins over both, and sits behind @supports so a browser with no env() keeps the
   plain values above. The marker layer is deliberately untouched: it is positioned
   from the 3D projection and has to stay welded to the canvas. */
@supports (padding:env(safe-area-inset-top)){
  .u-top{padding:calc(22px + env(safe-area-inset-top)) 26px 22px calc(26px + env(safe-area-inset-left))}
  .u-scale{left:calc(26px + env(safe-area-inset-left));bottom:calc(26px + env(safe-area-inset-bottom))}
  .u-hint{bottom:calc(24px + env(safe-area-inset-bottom))}
  .u-rail{right:calc(20px + env(safe-area-inset-right))}
  .u-help{padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
  .u-panel{padding:calc(28px + env(safe-area-inset-top)) calc(26px + env(safe-area-inset-right))
    calc(28px + env(safe-area-inset-bottom)) calc(26px + env(safe-area-inset-left))}
  .u-panel .close{top:calc(20px + env(safe-area-inset-top));right:calc(20px + env(safe-area-inset-right))}
  @media (max-width:640px){
    .u-top{padding:calc(16px + env(safe-area-inset-top)) 16px 16px calc(16px + env(safe-area-inset-left))}
    /* on a phone the panel is a bottom sheet — nothing above it to clear */
    .u-panel{padding-top:28px}
  }
}
`;

// icons used in the panel section headers
const UIC = {
  ai: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.7"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  dis: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l9 16H3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 10v4M12 17v.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  res: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 5h13v14H6a2 2 0 01-2-2V5z" stroke="currentColor" stroke-width="1.7"/><path d="M8 9h6M8 13h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  lab: '<svg viewBox="0 0 24 24" fill="none"><path d="M9 3v6l-4 8a2 2 0 002 3h10a2 2 0 002-3l-4-8V3" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 3h8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  rel: '<svg viewBox="0 0 24 24" fill="none"><circle cx="6" cy="12" r="2.4" stroke="currentColor" stroke-width="1.7"/><circle cx="18" cy="6" r="2.4" stroke="currentColor" stroke-width="1.7"/><circle cx="18" cy="18" r="2.4" stroke="currentColor" stroke-width="1.7"/><path d="M8 11l8-4M8 13l8 4" stroke="currentColor" stroke-width="1.5"/></svg>',
};

const LAB_URL = './Biology Entelloq - Dissection Lab.html';

function buildUniverseUI(core) {
  const data = UNI_DATA;
  const style = document.createElement('style'); style.textContent = UI_CSS; document.head.appendChild(style);

  // ── top brand + readout ──────────────────────────────────────────────────
  const top = el('div', 'hud u-top dim');
  top.innerHTML = `
    <a class="u-brand" href="${LAB_URL}" title="Biology Entelloq">
      <svg viewBox="0 0 100 100" fill="none"><defs><linearGradient id="ug" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#38e0d8"/></linearGradient></defs>
        <path d="M32 16c20 9 16 28 0 34 20 6 24 24 0 34" stroke="url(#ug)" stroke-width="5" stroke-linecap="round"/>
        <path d="M68 16C48 25 52 44 68 50 48 56 44 75 68 84" stroke="url(#ug)" stroke-width="5" stroke-linecap="round"/></svg>
      <span>Biology <b>Entelloq</b></span></a>
    <div class="u-readout"><div class="t" id="uTitle">The Universe</div><div class="s" id="uSub">observable universe</div></div>`;
  document.body.appendChild(top);

  // ── scale number, bottom-left ────────────────────────────────────────────
  const scale = el('div', 'hud u-scale dim');
  scale.innerHTML = `<div class="num" id="uSize">10²⁶ m</div><div class="lbl" id="uScaleLbl">the universe</div>`;
  document.body.appendChild(scale);

  // ── hint ─────────────────────────────────────────────────────────────────
  const hint = el('div', 'hud u-hint dim');
  hint.innerHTML = `<span><b>Scroll</b> or <b>drag</b> to zoom</span><span><b>Click</b> a marker to explore</span><span><kbd>?</kbd> shortcuts</span>`;
  document.body.appendChild(hint);

  // ── scale rail ───────────────────────────────────────────────────────────
  const rail = el('div', 'hud u-rail dim rail');
  UNI_ORDER.forEach((k, i) => {
    const b = el('button'); b.dataset.i = i;
    b.innerHTML = `<span class="rl">${(data[k] && data[k].title) || k}</span><span class="rd"></span>`;
    b.addEventListener('click', () => core.jumpTo(i));
    rail.appendChild(b);
  });
  document.body.appendChild(rail);
  const railBtns = [...rail.querySelectorAll('button')];

  // ── markers layer ────────────────────────────────────────────────────────
  const markers = el('div', 'u-markers'); document.body.appendChild(markers);
  const markEls = new Map();   // id -> element

  // ── info panel ───────────────────────────────────────────────────────────
  const panel = el('div', 'u-panel');
  document.body.appendChild(panel);
  function closePanel() { panel.classList.remove('open'); }

  function openPanel(meta, stageKey) {
    const sd = data[stageKey] || {};
    const title = meta && meta.name ? meta.name : sd.title;
    const desc = meta && meta.desc ? meta.desc : sd.blurb;
    const facts = sd.facts || [];
    const related = (sd.related || []).map((rk) => ({ k: rk, t: (data[rk] && data[rk].title) || rk }));
    const diseases = sd.diseases || [];
    const research = sd.research || [];
    const labs = sd.labs || [];
    const ai = sd.ai;

    panel.innerHTML = `
      <button class="close" aria-label="Close">&times;</button>
      <div class="eyebrow">${sd.scaleLabel || ''} · ${sd.size || ''}</div>
      <h2>${title}</h2>
      <div class="desc">${desc}</div>
      ${ai ? `<div class="u-ai" id="uAi">
        <button class="askbtn">${UIC.ai} Ask the tutor</button>
        <div class="answer" id="uAns"></div></div>` : ''}
      ${facts.length ? `<div class="sec"><h4>Did you know</h4><ul>${facts.map((f) => `<li>${f}</li>`).join('')}</ul></div>` : ''}
      ${diseases.length ? `<div class="sec"><h4>${UIC.dis} When it goes wrong</h4><ul>${diseases.map((d) => `<li class="dis">${d}</li>`).join('')}</ul></div>` : ''}
      ${research.length ? `<div class="sec"><h4>${UIC.res} At the frontier</h4><ul>${research.map((r) => `<li>${r}</li>`).join('')}</ul></div>` : ''}
      ${labs.length ? `<div class="sec"><h4>${UIC.lab} Labs</h4><ul>${labs.map((l) => `<li>${/dissection/i.test(l) ? `<a class="linkbtn" href="${LAB_URL}">${l} →</a>` : l}</li>`).join('')}</ul></div>` : ''}
      ${related.length ? `<div class="sec"><h4>${UIC.rel} Connected scales</h4><div class="chips">${related.map((r) => `<button class="chip" data-jump="${r.k}">${r.t}</button>`).join('')}</div></div>` : ''}`;

    panel.querySelector('.close').addEventListener('click', closePanel);
    panel.querySelectorAll('[data-jump]').forEach((c) => c.addEventListener('click', () => {
      const i = UNI_ORDER.indexOf(c.dataset.jump); if (i >= 0) { core.jumpTo(i); closePanel(); }
    }));
    const aiBox = panel.querySelector('#uAi');
    if (aiBox) {
      aiBox.querySelector('.askbtn').addEventListener('click', () => {
        // Re-entry guard: a second click must not spawn a second typewriter racing
        // the first on the same node.
        if (aiBox.classList.contains('show')) return;
        // No cloud model here: the "tutor" answers from the verified knowledge for
        // this scale — the seed question plus the facts, typed out. Honest, offline.
        const ans = aiBox.querySelector('#uAns');
        aiBox.classList.add('show');
        const text = `${ai} — ${desc} ${facts[0] || ''}`;
        const cite = `<span class="cite">Explained from Biology Entelloq’s knowledge base · open the full tutor in the app</span>`;
        // Append the citation ONLY after typing finishes — each textContent write
        // replaces all children, so appending before completion would erase it.
        typeInto(ans, text, () => ans.insertAdjacentHTML('beforeend', cite));
      });
    }
    panel.classList.add('open');
  }

  // typewriter that respects reduced motion
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function typeInto(node, text, done) {
    if (reduced) { node.textContent = text; if (done) done(); return; }
    node.textContent = ''; let n = 0;
    (function t() {
      n += Math.max(1, Math.round(text.length / 90)); node.textContent = text.slice(0, n);
      if (n < text.length) setTimeout(t, 16); else if (done) done();
    })();
  }

  // ── keyboard help ────────────────────────────────────────────────────────
  const help = el('div', 'u-help');
  help.innerHTML = `<div class="box"><h3>Navigate the Biology Universe</h3>
    <div class="row"><span>Zoom through scales</span><span><kbd>scroll</kbd> · <kbd>drag</kbd> · <kbd>↑</kbd><kbd>↓</kbd></span></div>
    <div class="row"><span>Jump to a scale</span><span><kbd>1</kbd>–<kbd>9</kbd>, <kbd>0</kbd></span></div>
    <div class="row"><span>To the universe / the atom</span><span><kbd>Home</kbd> · <kbd>End</kbd></span></div>
    <div class="row"><span>Explore an object</span><span><kbd>click</kbd> a marker</span></div>
    <div class="row"><span>Close panel · this help</span><span><kbd>Esc</kbd></span></div></div>`;
  document.body.appendChild(help);
  addEventListener('keydown', (e) => {
    if (e.key === '?' || (e.key === '/' && e.shiftKey)) { help.classList.toggle('open'); }
    else if (e.key === 'Escape') { if (help.classList.contains('open')) help.classList.remove('open'); else closePanel(); }
  });
  help.addEventListener('click', (e) => { if (e.target === help) help.classList.remove('open'); });

  // ── superscript-friendly size formatter (10^26 → 10²⁶) ───────────────────
  // data already carries pretty strings, so just read them.

  // ── per-frame update, driven by the engine ───────────────────────────────
  const uTitle = document.getElementById('uTitle'), uSub = document.getElementById('uSub');
  const uSize = document.getElementById('uSize'), uScaleLbl = document.getElementById('uScaleLbl');
  let shownIndex = -1;

  core.onImmersion((on) => document.body.classList.toggle('immersed', on));
  core.onJump(() => {});

  core.onFrame((pos) => {
    // readout snaps to the nearest hero scale
    const idx = Math.round(pos);
    if (idx !== shownIndex) {
      shownIndex = idx;
      const k = UNI_ORDER[idx], d = data[k] || {};
      uTitle.textContent = d.title || k;
      uSub.textContent = d.scaleLabel || '';
      uSize.textContent = (d.size || '').replace(/~/, '');
      uScaleLbl.textContent = d.scaleLabel || '';
      railBtns.forEach((b, i) => b.classList.toggle('on', i === idx));
    }
    // markers: reconcile the DOM set with the currently projected hotspots
    const spots = core.projectedHotspots();
    const live = new Set();
    for (const s of spots) {
      live.add(s.id);
      let m = markEls.get(s.id);
      if (!m) {
        // A real <button>, so the keyboard path is native: it lands in the tab order,
        // announces itself as a button, and BOTH Enter and Space fire the click. Built
        // once per hotspot id and thereafter only moved — rebuilding the node every
        // frame would attach a listener per frame and throw focus away each time.
        const nm = (s.meta && s.meta.name) || '';
        m = el('button', 'u-mark');
        m.type = 'button';
        m.setAttribute('aria-label', nm ? `Explore ${nm}` : 'Explore this hotspot');
        m.innerHTML = `<span class="ring"></span><span class="nm">${nm}</span>`;
        m.addEventListener('click', () => openPanel(s.meta, s.stage));
        markers.appendChild(m); markEls.set(s.id, m);
      }
      // The inline transform overrides the sheet's translate(-50%,-50%), so the
      // centring has to be baked in here: -7px puts the 14px ring's centre on the
      // projected x, and -50% of the marker's own height puts the row's centre —
      // and so the ring's — on the projected y.
      m.style.transform = `translate(calc(${s.x}px - 7px), calc(${s.y}px - 50%))`;
      m.style.opacity = String(Math.max(0, s.fade));
    }
    // drop markers that are no longer projected
    for (const [id, m] of markEls) { if (!live.has(id)) { m.remove(); markEls.delete(id); } }
  });

  function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
  return { openPanel, closePanel };
}
