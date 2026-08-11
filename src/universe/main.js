/*
 * main.js — the ignition. Everything above has defined the engine, the data, the
 * thirteen stages and the HUD; this just lights them and hands control to the
 * relay. Kept deliberately tiny so the wiring is obvious.
 */
function startUniverse() {
  const mount = document.getElementById('uni');
  let core;
  try {
    core = bootUniverse(mount);
    buildUniverseUI(core);
  } catch (err) {
    const p = document.createElement('pre');
    p.style.cssText = 'position:fixed;inset:24px;z-index:999;color:#e8735e;font:13px ui-monospace;white-space:pre-wrap;'
      + 'background:#0b0f14;border:1px solid #e8735e;border-radius:12px;padding:20px;overflow:auto';
    p.textContent = 'The Biology Universe failed to start:\n\n' + ((err && err.stack) || err);
    document.body.appendChild(p);
    throw err;
  }
  // Deep links. "#cell", "#dna", "#earth" — any key on the zoom axis — open the
  // Universe already at that scale. Without this every link INTO the Universe
  // landed at the far end of the observable universe, thirteen scales away from
  // whatever the link had promised, which made the app shell's command palette
  // and the footers advertise places they could not actually take you.
  //
  // An arriving deep link SETS the position rather than flying to it: jumpTo()
  // animates, and animating thirteen scales on arrival is a five-second wait for
  // a page you asked to open at the cell. Later hash changes DO fly, because by
  // then the reader is already somewhere and the travel is the point.
  function scaleFromHash() {
    return UNI_ORDER.indexOf(decodeURIComponent((location.hash || '').replace(/^#/, '')).trim().toLowerCase());
  }
  const at = scaleFromHash();
  if (at >= 0) { core.Z.pos = core.Z.posTarget = at; core.jumpTo(at); }
  addEventListener('hashchange', () => { const i = scaleFromHash(); if (i >= 0) core.jumpTo(i); });

  // reveal: fade the loader once the first frame is up
  const loader = document.getElementById('uniload');
  if (loader) { requestAnimationFrame(() => requestAnimationFrame(() => { loader.classList.add('gone'); setTimeout(() => loader.remove(), 700); })); }
  // exposed for scripted verification
  window.__UNI = core;
  window.__UNI_ORDER = UNI_ORDER;
}

if (document.readyState !== 'loading') startUniverse();
else addEventListener('DOMContentLoaded', startUniverse);
