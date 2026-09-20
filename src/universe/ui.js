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
.u-brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:15px;color:var(--ink);text-decoration:none}
.u-brand svg{width:26px;height:26px}
.u-brand b{font-weight:800}
.u-readout{margin-left:8px;padding-left:16px;border-left:1px solid var(--line);display:flex;flex-direction:column;gap:2px}
.u-readout .t{font-weight:700;font-size:15px;letter-spacing:-.02em;line-height:1}
.u-readout .s{font-family:var(--mono);font-size:11px;color:var(--cy);letter-spacing:.06em}

/* scale readout number, bottom-left */
.u-scale{left:26px;bottom:88px;font-family:var(--mono);pointer-events:none}
.u-scale .num{font-size:clamp(1.6rem,3.2vw,2.4rem);font-weight:800;letter-spacing:-.02em;
  background:linear-gradient(120deg,var(--em),var(--cy));-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1}
.u-scale .lbl{font-size:11px;color:var(--faint);letter-spacing:.14em;text-transform:uppercase;margin-top:6px}
.u-scale .note{max-width:265px;color:var(--dim);font:11px/1.5 var(--sans);margin-top:9px}

/* bottom hint */
.u-hint{left:50%;bottom:24px;transform:translateX(-50%);display:flex;gap:18px;align-items:center;
  padding:9px 16px;border-radius:999px;background:var(--glass);backdrop-filter:blur(14px);
  border:1px solid var(--line);font-size:12.5px;color:var(--dim)}
.u-hint b{color:var(--ink);font-weight:600}
.u-hint kbd{font-family:var(--mono);font-size:10px;padding:2px 6px;border-radius:5px;border:1px solid var(--line);color:var(--dim)}

/* right scale rail */
.u-rail{right:20px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:3px;align-items:flex-end}
.u-rail button{display:flex;align-items:center;gap:10px;background:none;border:none;cursor:pointer;
  padding:6px 2px;min-height:28px;color:var(--faint);font-family:var(--mono);font-size:10.5px;letter-spacing:.04em;
  transition:color .2s;justify-content:flex-end}
.u-rail button .rl{opacity:0;transform:translateX(6px);transition:opacity .2s var(--ease),transform .2s var(--ease);white-space:nowrap;text-transform:uppercase}
.u-rail button:hover .rl,.u-rail button.on .rl{opacity:1;transform:none}
.u-rail button:focus-visible .rl{opacity:1;transform:none}
.u-rail button:focus-visible{outline:2px solid var(--em);outline-offset:3px;border-radius:4px}
.u-rail button:hover{color:var(--ink)}
.u-rail button .rd{width:22px;height:3px;border-radius:3px;background:var(--line);transition:background .25s,width .25s var(--ease)}
.u-rail button.on{color:var(--ink)}
.u-rail button.on .rd{background:linear-gradient(90deg,var(--em),var(--cy));width:34px}

/* hotspot markers over the 3D */
.u-markers{position:fixed;inset:0;z-index:8;pointer-events:none}
.u-mark{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;cursor:pointer;
  display:grid;place-items:center;width:28px;height:28px;will-change:transform,opacity;
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
.u-mark .nm{position:absolute;left:28px;pointer-events:none;font-size:12px;font-weight:600;padding:4px 10px;border-radius:8px;background:var(--glass-2);
  backdrop-filter:blur(10px);border:1px solid var(--line);white-space:nowrap;opacity:0;transform:translateX(-4px);
  transition:opacity .2s,transform .2s var(--ease)}
.u-mark:hover .nm{opacity:1;transform:none}
.u-mark:hover .ring{transform:scale(1.25)}
.u-mark.selected .nm{opacity:1;transform:none}
.u-mark.selected .ring{border-color:var(--em);background:rgba(52,211,153,.5)}
@media (prefers-reduced-motion:reduce){.u-mark .ring::after{animation:none}}
body.u-keyboard .hud,body.u-keyboard .u-panel,body.u-keyboard .u-ai .answer{transition:none}

/* Stable access to named model structures, including off-screen hotspots. */
.u-explorer{left:26px;top:82px;display:flex;gap:6px;flex-wrap:wrap;max-width:calc(100vw - 70px)}
.u-explorer button,.u-explorer select,.u-parts button,.u-part-nav button{font:600 12px var(--sans);min-height:44px;padding:9px 12px;border:1px solid var(--line);border-radius:9px;color:var(--dim);background:var(--glass-2);cursor:pointer;touch-action:manipulation}
.u-explorer button:active,.u-parts button:active,.u-part-nav button:active{transform:scale(.97)}
.u-explorer select{max-width:205px;color:var(--ink)}
.u-explorer button[aria-pressed="true"],.u-explorer button[aria-expanded="true"],.u-parts button[aria-current="true"]{color:var(--em);border-color:rgba(52,211,153,.55);background:rgba(13,39,30,.95)}
.u-explorer button:disabled,.u-part-nav button:disabled{opacity:.45;cursor:default}
.u-explorer button:focus-visible,.u-explorer select:focus-visible,.u-parts button:focus-visible,.u-part-nav button:focus-visible,.u-panel button:focus-visible{outline:2px solid var(--em);outline-offset:3px}
.u-parts{position:fixed;left:26px;top:134px;z-index:13;width:310px;max-height:calc(100dvh - 240px);padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--glass-2);backdrop-filter:blur(20px);overflow:auto;overscroll-behavior:contain;touch-action:pan-y}
.u-parts[hidden],.u-panel[hidden]{display:none}
.u-parts-head{position:sticky;top:0;z-index:1;background:var(--glass-2);display:flex;align-items:start;justify-content:space-between;gap:10px;margin-bottom:8px}
.u-parts h2{margin:0;font-size:15px;line-height:1.4}
.u-parts p{margin:0 0 12px;color:var(--dim);font-size:11px;line-height:1.5}
.u-parts .u-parts-close{min-width:44px;padding:5px;flex:none;font-size:22px}
.u-parts-list{display:flex;flex-direction:column;gap:6px}
.u-parts-list button{text-align:left;width:100%;display:flex;align-items:center;gap:9px;line-height:1.4}
.u-parts-list .part-number{font:10px var(--mono);color:var(--faint);min-width:18px}
.u-part-nav{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:0 0 20px}
.u-part-nav .part-count{width:100%;color:var(--faint);font:10px var(--mono)}
.u-panel .desc{overflow-wrap:anywhere}
.u-panel h2,.u-panel .eyebrow{padding-right:52px}
.u-panel:focus{outline:none}

/* info panel */
.u-panel{position:fixed;z-index:12;top:0;right:0;height:100%;width:min(420px,92vw);
  background:var(--glass-2);backdrop-filter:blur(24px) saturate(1.3);border-left:1px solid var(--line);
  transform:translateX(102%);transition:transform .24s var(--ease);display:flex;flex-direction:column;
  padding:28px 26px;overflow-y:auto}
.u-panel.open{transform:none}
.u-panel .close{position:sticky;top:0;align-self:flex-end;flex:none;margin:0 0 -44px auto;z-index:1;width:44px;height:44px;border-radius:10px;border:1px solid var(--line);
  background:var(--glass-2);color:var(--dim);font-size:24px;cursor:pointer;display:grid;place-items:center;touch-action:manipulation;transition:color .2s,border-color .2s,transform .1s var(--ease)}
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
.u-help .box{width:min(500px,92vw);max-height:calc(100dvh - 32px);display:flex;flex-direction:column;background:var(--glass-2);border:1px solid var(--line);border-radius:20px;padding:20px}
.u-help-head{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-bottom:12px}
.u-help h3{margin:0;font-size:1.2rem}
.u-help-close{width:44px;height:44px;flex:none;font-size:24px;background:var(--glass-2);color:var(--ink);border:1px solid var(--line);border-radius:10px;cursor:pointer;touch-action:manipulation}
.u-help-close:focus-visible{outline:2px solid var(--em);outline-offset:3px}
.u-help-close:active{transform:scale(.97)}
.u-help-body{overflow-y:auto;overscroll-behavior:contain}
.u-help .row{display:flex;justify-content:space-between;gap:14px;padding:9px 0;border-bottom:1px solid var(--line);font-size:13px;line-height:1.5;color:var(--dim)}
.u-help .row>span{flex:1;min-width:0}.u-help .row>span:last-child{text-align:right}
.u-help .row:last-child{border:none}
.u-help kbd{font-family:var(--mono);font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid var(--line);color:var(--ink)}

@media (max-width:640px){
  .u-explorer{left:16px;right:16px;top:90px;max-width:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
  .u-explorer button{padding:8px;font-size:11px}
  .u-explorer select{width:100%;max-width:none;font-size:11px}
  .u-parts{left:16px;right:16px;top:244px;width:auto;max-height:calc(100dvh - 265px);padding:14px}
  .u-top{max-width:100vw;gap:8px}.u-brand{font-size:13px;gap:6px;flex-shrink:0}.u-brand svg{width:22px;height:22px}
  .u-readout{min-width:0;margin-left:0;padding-left:9px}.u-readout .t{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.u-readout .s{font-size:9px;line-height:1.3}
  .u-rail{display:none}
  .u-panel{width:100%;height:70%;top:auto;bottom:0;border-left:none;border-top:1px solid var(--line);
    transform:translateY(102%);border-radius:22px 22px 0 0}
  .u-panel.open{transform:none}
  .u-hint{font-size:11px;gap:12px;width:max-content;max-width:calc(100vw - 32px);text-align:center;bottom:24px}
  .u-hint>span:not(:first-child){display:none}
  .u-scale .note{max-width:230px}
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
  .u-scale{left:calc(26px + env(safe-area-inset-left));bottom:calc(88px + env(safe-area-inset-bottom))}
  .u-hint{bottom:calc(24px + env(safe-area-inset-bottom))}
  .u-rail{right:calc(20px + env(safe-area-inset-right))}
  .u-help{padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
  .u-panel{padding:calc(28px + env(safe-area-inset-top)) calc(26px + env(safe-area-inset-right))
    calc(28px + env(safe-area-inset-bottom)) calc(26px + env(safe-area-inset-left))}
  .u-explorer{left:calc(26px + env(safe-area-inset-left));top:calc(82px + env(safe-area-inset-top))}
  @media (max-width:640px){
    .u-top{padding:calc(16px + env(safe-area-inset-top)) 16px 16px calc(16px + env(safe-area-inset-left))}
    /* on a phone the panel is a bottom sheet — nothing above it to clear */
    .u-panel{padding-top:28px}
    .u-explorer{left:calc(16px + env(safe-area-inset-left));right:calc(16px + env(safe-area-inset-right));top:calc(90px + env(safe-area-inset-top))}
    .u-parts{top:calc(244px + env(safe-area-inset-top));max-height:calc(100dvh - 265px - env(safe-area-inset-top) - env(safe-area-inset-bottom))}
    .u-scale{bottom:calc(144px + env(safe-area-inset-bottom))}
  }
}
@media(max-height:500px) and (min-width:641px){.u-explorer{top:68px}.u-parts{top:118px;max-height:calc(100dvh - 135px)}.u-panel{padding-top:25px}.u-part-nav{margin-bottom:12px}}
@media (prefers-reduced-motion:reduce){
  .hud,.u-panel,.u-ai .answer,.u-rail button,.u-rail button .rl,.u-rail button .rd,.u-mark .ring,.u-mark .nm{transition:none}
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

const LAB_URL = './lab.html';

// Exactly the catalogue's named hotspots; no synthesized anatomy or camera-space
// visibility filtering. A projection can disappear without losing its lesson.
function universeSubpartsFor(data, stageKey) {
  const spots = data[stageKey] && data[stageKey].hotspots;
  return Object.entries(spots || {}).filter(([, meta]) => meta && typeof meta.name === 'string' && meta.name.trim())
    .map(([id, meta]) => ({ id, meta, stage: stageKey }));
}

function buildUniverseUI(core) {
  const data = UNI_DATA;
  const style = document.createElement('style'); style.textContent = UI_CSS; document.head.appendChild(style);
  addEventListener('keydown', () => document.body.classList.add('u-keyboard'));
  addEventListener('pointerdown', () => document.body.classList.remove('u-keyboard'));

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
  scale.innerHTML = `<div class="num" id="uSize">~10²⁶ m</div><div class="lbl" id="uScaleLbl">the universe</div><div class="note">Approximate scale · illustrative models.<br>Colours and motion aid understanding; zoom transitions are not to scale.</div>`;
  document.body.appendChild(scale);

  // ── hint ─────────────────────────────────────────────────────────────────
  const hint = el('div', 'hud u-hint dim');
  hint.innerHTML = `<span><b>Scroll</b> · <b>drag</b> · <b>pinch</b> to zoom</span><span><b>Click</b> a marker to explore</span><span><kbd>?</kbd> shortcuts</span>`;
  document.body.appendChild(hint);

  // ── scale rail ───────────────────────────────────────────────────────────
  const rail = el('div', 'hud u-rail dim rail');
  UNI_ORDER.forEach((k, i) => {
    const b = el('button'); b.dataset.i = i;
    b.innerHTML = `<span class="rl">${(data[k] && data[k].title) || k}</span><span class="rd"></span>`;
    b.addEventListener('click', e => core.jumpTo(i, e.detail === 0));
    rail.appendChild(b);
  });
  document.body.appendChild(rail);
  const railBtns = [...rail.querySelectorAll('button')];

  // ── markers layer ────────────────────────────────────────────────────────
  const markers = el('div', 'u-markers'); document.body.appendChild(markers);
  const markEls = new Map();   // id -> element

  // Stable keyboard/touch entry: projection is not the inventory of a model.
  const explorer = el('div', 'hud u-explorer');
  explorer.setAttribute('role', 'group'); explorer.setAttribute('aria-label', 'Explore this scale');
  explorer.innerHTML = '<button type="button" id="uPartsToggle" aria-expanded="false" aria-controls="uParts">Subparts</button>'
    + '<button type="button" id="uInspect" aria-pressed="false">Inspect 3D</button>'
    + '<button type="button" id="uPause" aria-pressed="false">Pause motion</button>'
    + '<button type="button" id="uResetView">Reset view</button>'
    + '<select id="uScaleSelect" aria-label="Choose a scale"></select>'
    + '<button type="button" id="uHelpToggle" aria-haspopup="dialog" aria-controls="uHelp">Help</button>';
  document.body.appendChild(explorer);
  const partsToggle = explorer.querySelector('#uPartsToggle'), inspectBtn = explorer.querySelector('#uInspect');
  const pauseBtn = explorer.querySelector('#uPause'), resetBtn = explorer.querySelector('#uResetView');
  const scaleSelect = explorer.querySelector('#uScaleSelect');
  UNI_ORDER.forEach((key, index) => { const option = el('option'); option.value = index; option.textContent = (index + 1) + ' · ' + ((data[key] || {}).title || key); scaleSelect.appendChild(option); });
  scaleSelect.addEventListener('change', () => { closeSubparts(false); closePanel(false); core.jumpTo(Number(scaleSelect.value), true); });
  function updateViewControls() {
    inspectBtn.disabled = typeof core.setViewMode !== 'function';
    pauseBtn.disabled = typeof core.setPaused !== 'function' || !!core.reducedMotion;
    resetBtn.disabled = typeof core.resetView !== 'function';
    const inspecting = core.viewMode === 'orbit';
    inspectBtn.setAttribute('aria-pressed', String(inspecting));
    inspectBtn.textContent = inspecting ? 'Exit 3D inspect' : 'Inspect 3D';
    inspectBtn.title = inspecting ? 'Drag rotates; wheel/pinch adjusts inspection zoom. Exit to travel through scales.' : 'Inspect this model without changing scale';
    pauseBtn.setAttribute('aria-pressed', String(!!core.paused));
    pauseBtn.textContent = core.paused ? 'Resume motion' : 'Pause motion';
    if (core.reducedMotion) pauseBtn.textContent = 'Motion off';
    pauseBtn.title = core.reducedMotion ? 'Reduced motion keeps automatic animation off; manual inspection remains available.' : 'Pause or resume illustrative scene motion. Inspection mode always freezes it.';
    hint.innerHTML = inspecting
      ? '<span><b>Inspect</b> · drag / arrows rotate · wheel / pinch / + − zoom</span><span>Scene motion frozen · exit to travel</span><span><kbd>?</kbd> shortcuts</span>'
      : '<span><b>Scroll</b> · <b>drag</b> · <b>pinch</b> to zoom</span><span><b>Subparts</b> · choose a named structure</span><span><kbd>?</kbd> shortcuts</span>';
  }
  inspectBtn.addEventListener('click', () => { if (core.setViewMode) core.setViewMode(core.viewMode === 'orbit' ? 'zoom' : 'orbit'); updateViewControls(); });
  pauseBtn.addEventListener('click', () => { if (core.setPaused) core.setPaused(!core.paused); updateViewControls(); });
  resetBtn.addEventListener('click', () => { if (core.resetView) core.resetView(); updateViewControls(); });
  if (core.onViewChange) core.onViewChange(updateViewControls);
  updateViewControls();

  const partsPanel = el('section', 'u-parts'); partsPanel.id = 'uParts'; partsPanel.hidden = true;
  partsPanel.setAttribute('aria-labelledby', 'uPartsTitle');
  partsPanel.innerHTML = '<div class="u-parts-head"><h2 id="uPartsTitle">Subparts</h2>'
    + '<button class="u-parts-close" type="button" aria-label="Close subparts">×</button></div>'
    + '<p>Choose a named structure. The full list stays available even when a marker is off-screen.</p>'
    + '<div class="u-parts-list"></div>';
  document.body.appendChild(partsPanel);
  const partsTitle = partsPanel.querySelector('#uPartsTitle'), partsList = partsPanel.querySelector('.u-parts-list');
  let partsStage = null, partButtons = new Map(), selected = null, panelReturn = null;
  const currentStage = () => UNI_ORDER[Math.max(0, Math.min(UNI_ORDER.length - 1, Math.round(core.pos || 0)))];
  function updateSelection() {
    partButtons.forEach((button, id) => button.setAttribute('aria-current', String(!!selected && selected.stage === partsStage && selected.id === id)));
  }
  function renderSubparts(stageKey) {
    partsStage = stageKey;
    const records = universeSubpartsFor(data, stageKey);
    partsTitle.textContent = ((data[stageKey] || {}).title || stageKey) + ' · subparts';
    partsToggle.textContent = 'Subparts · ' + records.length;
    partsList.replaceChildren(); partButtons = new Map();
    const overview = el('button'); overview.type = 'button'; overview.textContent = 'Scale overview';
    overview.addEventListener('click', () => openPanel(null, stageKey)); partsList.appendChild(overview);
    records.forEach((record, i) => {
      const button = el('button'); button.type = 'button'; button.dataset.part = record.id;
      const number = el('span', 'part-number'); number.textContent = String(i + 1).padStart(2, '0'); number.setAttribute('aria-hidden', 'true');
      const name = el('span'); name.textContent = record.meta.name;
      button.append(number, name); button.addEventListener('click', () => openPanel(record.meta, stageKey));
      partsList.appendChild(button); partButtons.set(record.id, button);
    });
    if (!records.length) { const empty = el('p'); empty.textContent = 'No named subparts for this scale yet. The overview is available.'; partsList.appendChild(empty); }
    updateSelection();
  }
  function closeSubparts(restore = true) {
    partsPanel.hidden = true; partsToggle.setAttribute('aria-expanded', 'false');
    if (restore) partsToggle.focus({ preventScroll: true });
  }
  function openSubparts(stageKey = currentStage()) {
    if (!data[stageKey]) stageKey = currentStage();
    closePanel(false);
    if (stageKey !== currentStage()) core.jumpTo(UNI_ORDER.indexOf(stageKey), true);
    renderSubparts(stageKey); partsPanel.hidden = false; partsToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.remove('immersed');
    const button = selected && selected.stage === stageKey ? partButtons.get(selected.id) : partsList.querySelector('button');
    if (button) button.focus({ preventScroll: true });
  }
  partsToggle.addEventListener('click', () => partsPanel.hidden ? openSubparts() : closeSubparts());
  partsPanel.querySelector('.u-parts-close').addEventListener('click', () => closeSubparts());
  partsPanel.addEventListener('keydown', e => {
    if (e.key === 'Tab') return;
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); closeSubparts(); return; }
    const buttons = [...partsList.querySelectorAll('button')], index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    let next = index;
    if (e.key === 'ArrowDown') next = (index + 1) % buttons.length;
    else if (e.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = buttons.length - 1;
    else return;
    e.preventDefault(); buttons[next].focus({ preventScroll: true }); buttons[next].scrollIntoView({ block: 'nearest' });
  });

  // ── info panel ───────────────────────────────────────────────────────────
  const panel = el('div', 'u-panel');
  panel.hidden = true; panel.tabIndex = -1; panel.setAttribute('role', 'region'); panel.setAttribute('aria-labelledby', 'uPanelTitle');
  document.body.appendChild(panel);
  let panelAbort = null, panelGeneration = 0, clientPromise = null, panelStage = null;
  function cancelPanelAI() { ++panelGeneration; if (panelAbort) panelAbort.abort(); panelAbort = null; }
  function closePanel(restore = true) {
    cancelPanelAI(); const wasOpen = !panel.hidden; panel.classList.remove('open'); panel.hidden = true; panelStage = null;
    if (restore && wasOpen) {
      const target = panelReturn && panelReturn.isConnected && !panelReturn.closest('[hidden]') ? panelReturn : partsToggle;
      target.focus({ preventScroll: true });
    }
  }
  addEventListener('pagehide', cancelPanelAI);
  function getAIClient() {
    if (window.BIOQ_AI) return Promise.resolve(window.BIOQ_AI);
    if (clientPromise) return clientPromise;
    clientPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let timer;
      const fail = () => { clearTimeout(timer); script.remove(); clientPromise = null; reject(new Error('unavailable')); };
      script.src = './src/ai/biology-ai.js'; script.async = true;
      script.onload = () => { clearTimeout(timer); if (window.BIOQ_AI) resolve(window.BIOQ_AI); else fail(); };
      script.onerror = fail;
      timer = setTimeout(fail, 8000);
      document.head.appendChild(script);
    });
    return clientPromise;
  }

  function openPanel(meta, stageKey) {
    cancelPanelAI();
    panelStage = stageKey;
    if (!panel.contains(document.activeElement)) panelReturn = document.activeElement;
    const sd = data[stageKey] || {};
    const records = universeSubpartsFor(data, stageKey);
    const selectedIndex = records.findIndex(record => record.meta === meta || (meta && record.meta.name === meta.name));
    selected = selectedIndex >= 0 ? records[selectedIndex] : null;
    updateSelection();
    if (matchMedia('(max-width: 640px)').matches) closeSubparts(false);
    const title = meta && meta.name ? meta.name : sd.title;
    const desc = meta && meta.desc ? meta.desc : sd.blurb;
    const facts = sd.facts || [];
    const related = (sd.related || []).map((rk) => ({ k: rk, t: (data[rk] && data[rk].title) || rk }));
    const diseases = sd.diseases || [];
    const research = sd.research || [];
    const labs = sd.labs || [];
    const ai = sd.ai;

    panel.innerHTML = `
      <button class="close" type="button" aria-label="Close structure details">&times;</button>
      <div class="eyebrow">${sd.scaleLabel || ''} · ${sd.size || ''}</div>
      <h2 id="uPanelTitle">${title}</h2>
      <div class="desc">${desc}</div>
      <div class="u-part-nav" role="group" aria-label="Subpart navigation">
        <span class="part-count">${selectedIndex >= 0 ? 'Subpart ' + (selectedIndex + 1) + ' of ' + records.length : 'Scale overview'}</span>
        <button type="button" class="u-prev" aria-label="Inspect previous subpart" ${selectedIndex <= 0 ? 'disabled' : ''}>← Previous</button>
        <button type="button" class="u-next" aria-label="Inspect next subpart" ${!records.length || selectedIndex >= records.length - 1 ? 'disabled' : ''}>Next →</button>
        <button type="button" class="u-all-parts">All subparts</button></div>
      ${sd.modelNote ? `<div class="sec"><h4>About this model</h4><p>${sd.modelNote}</p>${sd.source ? `<a href="${sd.source.url}" target="_blank" rel="noopener noreferrer">${sd.source.label} ↗</a>` : ''}</div>` : ''}
      ${ai ? `<div class="u-ai" id="uAi">
        <button class="askbtn">${UIC.ai} Ask the tutor</button>
        <div class="answer" id="uAns" role="status" style="white-space:pre-wrap"></div></div>` : ''}
      ${facts.length ? `<div class="sec"><h4>Did you know</h4><ul>${facts.map((f) => `<li>${f}</li>`).join('')}</ul></div>` : ''}
      ${diseases.length ? `<div class="sec"><h4>${UIC.dis} When it goes wrong</h4><ul>${diseases.map((d) => `<li class="dis">${d}</li>`).join('')}</ul></div>` : ''}
      ${research.length ? `<div class="sec"><h4>${UIC.res} At the frontier</h4><ul>${research.map((r) => `<li>${r}</li>`).join('')}</ul></div>` : ''}
      ${labs.length ? `<div class="sec"><h4>${UIC.lab} Labs</h4><ul>${labs.map((l) => `<li>${/dissection/i.test(l) ? `<a class="linkbtn" href="${LAB_URL}">${l} →</a>` : l}</li>`).join('')}</ul></div>` : ''}
      ${related.length ? `<div class="sec"><h4>${UIC.rel} Connected scales</h4><div class="chips">${related.map((r) => `<button class="chip" data-jump="${r.k}">${r.t}</button>`).join('')}</div></div>` : ''}`;

    panel.querySelector('.close').addEventListener('click', () => closePanel());
    panel.querySelector('.u-prev').addEventListener('click', () => { if (selectedIndex > 0) openPanel(records[selectedIndex - 1].meta, stageKey); });
    panel.querySelector('.u-next').addEventListener('click', () => { if (records[selectedIndex + 1]) openPanel(records[selectedIndex + 1].meta, stageKey); });
    panel.querySelector('.u-all-parts').addEventListener('click', () => openSubparts(stageKey));
    panel.querySelectorAll('[data-jump]').forEach((c) => c.addEventListener('click', e => {
      const i = UNI_ORDER.indexOf(c.dataset.jump); if (i >= 0) { core.jumpTo(i, e.detail === 0); closePanel(); }
    }));
    const aiBox = panel.querySelector('#uAi');
    if (aiBox) {
      const button = aiBox.querySelector('.askbtn');
      button.addEventListener('click', async () => {
        const ans = aiBox.querySelector('#uAns');
        if (panelAbort) { cancelPanelAI(); button.textContent = 'Ask the tutor'; ans.textContent = 'Request stopped.'; return; }
        cancelPanelAI();
        const gen = panelGeneration, controller = new AbortController(); panelAbort = controller;
        const current = () => gen === panelGeneration && ans.isConnected;
        aiBox.classList.add('show');
        ans.textContent = 'Thinking…'; button.textContent = 'Stop';
        let answer = `${ai} — ${desc} ${facts[0] || ''}`;
        let source = 'Offline example · Biology Entelloq knowledge base';
        try {
          const client = await getAIClient();
          if (!current() || controller.signal.aborted) return;
          answer = await client.ask({ question: ai,
            context: 'Biology Universe. Selected topic: ' + title + '. Scale: ' + sd.scaleLabel + '. '
              + desc + '\nReference facts: ' + facts.join(' ') + '\nThe colours, sizes and motion are illustrative, not experimental measurements.',
            signal: controller.signal });
          source = 'AI explanation · verify important details';
        } catch (error) {
          if (controller.signal.aborted) return;
          source = (window.BIOQ_AI ? window.BIOQ_AI.explainError(error) : 'AI is unavailable right now.') + ' Showing an offline example.';
        }
        if (!current()) return;
        panelAbort = null; button.textContent = 'Ask again';
        typeInto(ans, answer, () => {
          if (!current()) return;
          const cite = el('span', 'cite'); cite.textContent = source; ans.appendChild(cite);
        }, current);
      });
    }
    panel.classList.add('open');
    panel.hidden = false; panel.scrollTop = 0; document.body.classList.remove('immersed');
    panel.focus({ preventScroll: true });
  }
  panel.addEventListener('keydown', e => {
    if (e.key === 'Tab') return;
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); closePanel(); }
  });

  // typewriter that respects reduced motion
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function typeInto(node, text, done, current) {
    if (current && !current()) return;
    if (reduced.matches || document.body.classList.contains('u-keyboard')) { node.textContent = text; if (done) done(); return; }
    node.textContent = ''; let n = 0;
    (function t() {
      if (current && !current()) return;
      n += Math.max(1, Math.round(text.length / 90)); node.textContent = text.slice(0, n);
      if (n < text.length) setTimeout(t, 16); else if (done) done();
    })();
  }

  // ── keyboard help ────────────────────────────────────────────────────────
  const help = el('div', 'u-help'); help.id = 'uHelp';
  help.setAttribute('role', 'dialog'); help.setAttribute('aria-modal', 'true'); help.setAttribute('aria-labelledby', 'uHelpTitle');
  help.innerHTML = `<div class="box"><div class="u-help-head"><h3 id="uHelpTitle">Navigate the Biology Universe</h3><button class="u-help-close" type="button" aria-label="Close help">×</button></div><div class="u-help-body">
    <div class="row"><span>Travel through scales</span><span><kbd>scroll</kbd> · <kbd>drag</kbd> · <kbd>↑</kbd><kbd>↓</kbd></span></div>
    <div class="row"><span>Inspect 3D (motion frozen)</span><span>Drag / arrows rotate</span></div>
    <div class="row"><span>Inspection zoom</span><span>Wheel / pinch / <kbd>+</kbd><kbd>−</kbd></span></div>
    <div class="row"><span>Return to scale travel</span><span>Exit 3D inspect</span></div>
    <div class="row"><span>Jump to a scale</span><span><kbd>1</kbd>–<kbd>9</kbd>, <kbd>0</kbd></span></div>
    <div class="row"><span>To the universe / the atom</span><span><kbd>Home</kbd> · <kbd>End</kbd></span></div>
    <div class="row"><span>Explore an object</span><span>Subparts list · or a marker</span></div>
    <div class="row"><span>Move through subparts</span><span><kbd>↑</kbd><kbd>↓</kbd> · <kbd>Enter</kbd></span></div>
    <div class="row"><span>Close panel · this help</span><span>× button · <kbd>Esc</kbd></span></div></div></div>`;
  document.body.appendChild(help);
  const helpToggle = explorer.querySelector('#uHelpToggle'), helpClose = help.querySelector('.u-help-close');
  let helpReturn = null;
  function setHelp(open) {
    if (open) helpReturn = document.activeElement;
    help.classList.toggle('open', open);
    if (open) helpClose.focus({ preventScroll: true });
    else (helpReturn && helpReturn.isConnected ? helpReturn : helpToggle).focus({ preventScroll: true });
  }
  helpToggle.addEventListener('click', () => setHelp(true));
  helpClose.addEventListener('click', () => setHelp(false));
  help.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape' || e.key === '?') { e.preventDefault(); setHelp(false); }
    else if (e.key === 'Tab') { e.preventDefault(); helpClose.focus(); }
  });
  addEventListener('keydown', (e) => {
    if (e.target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable)) return;
    if (e.key === '?' || (e.key === '/' && e.shiftKey)) { e.preventDefault(); setHelp(!help.classList.contains('open')); }
    else if (e.key === 'Escape') { if (help.classList.contains('open')) setHelp(false); else if (!panel.hidden) closePanel(); else if (!partsPanel.hidden) closeSubparts(); }
  });
  help.addEventListener('click', (e) => { if (e.target === help) setHelp(false); });

  // ── superscript-friendly size formatter (10^26 → 10²⁶) ───────────────────
  // data already carries pretty strings, so just read them.

  // ── per-frame update, driven by the engine ───────────────────────────────
  const uTitle = document.getElementById('uTitle'), uSub = document.getElementById('uSub');
  const uSize = document.getElementById('uSize'), uScaleLbl = document.getElementById('uScaleLbl');
  let shownIndex = -1;

  core.onImmersion((on) => document.body.classList.toggle('immersed', on && panel.hidden && partsPanel.hidden && !explorer.contains(document.activeElement)));
  core.onJump(() => {});

  core.onFrame((pos) => {
    // readout snaps to the nearest hero scale
    const idx = Math.round(pos);
    if (idx !== shownIndex) {
      shownIndex = idx;
      const k = UNI_ORDER[idx], d = data[k] || {};
      scaleSelect.value = String(idx);
      const listHadFocus = !partsPanel.hidden && partsPanel.contains(document.activeElement);
      if ((selected && selected.stage !== k) || (!panel.hidden && panelStage !== k)) {
        selected = null;
        const detailHadFocus = panel.contains(document.activeElement);
        closePanel(false);
        if (detailHadFocus) partsToggle.focus({ preventScroll: true });
      }
      renderSubparts(k);
      if (listHadFocus) partsList.querySelector('button').focus({ preventScroll: true });
      uTitle.textContent = d.title || k;
      uSub.textContent = d.scaleLabel || '';
      uSize.textContent = d.size || '';
      uScaleLbl.textContent = d.scaleLabel || '';
      railBtns.forEach((b, i) => { b.classList.toggle('on', i === idx); b.setAttribute('aria-current', i === idx ? 'step' : 'false'); });
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
      const isSelected = !!selected && selected.stage === s.stage && (selected.meta === s.meta || selected.meta.name === s.meta?.name);
      m.classList.toggle('selected', isSelected);
      m.setAttribute('aria-pressed', String(isSelected));
    }
    // drop markers that are no longer projected
    for (const [id, m] of markEls) { if (!live.has(id)) { m.remove(); markEls.delete(id); } }
  });

  function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
  return { openPanel, closePanel, openSubparts, closeSubparts,
    selectSubpart(id, stageKey = currentStage()) {
      const record = universeSubpartsFor(data, stageKey).find(part => part.id === id);
      if (!record) return false;
      if (stageKey !== currentStage()) core.jumpTo(UNI_ORDER.indexOf(stageKey), true);
      openPanel(record.meta, stageKey); return true;
    },
    get selection() { return selected ? { id: selected.id, stage: selected.stage } : null; },
  };
}
