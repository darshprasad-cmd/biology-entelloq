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
  // reveal: fade the loader once the first frame is up
  const loader = document.getElementById('uniload');
  if (loader) { requestAnimationFrame(() => requestAnimationFrame(() => { loader.classList.add('gone'); setTimeout(() => loader.remove(), 700); })); }
  // exposed for scripted verification
  window.__UNI = core;
  window.__UNI_ORDER = UNI_ORDER;
}

if (document.readyState !== 'loading') startUniverse();
else addEventListener('DOMContentLoaded', startUniverse);
