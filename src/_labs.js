/* ============================================================================
   Biology Entelloq — THE LABS.
   A registry + shell. Each lab is a self-contained module that registers itself
   and is handed a host element to build into; the shell owns the picker, the
   mounting, and the teardown so a lab never has to think about routing.
   Every lab here is REAL and runnable — there are no teasers in this product.
   ========================================================================== */
const LABS = (function () {
  const list = [];
  return {
    register(id, def) { list.push(Object.assign({ id }, def)); },
    all() { return list; },
    get(id) { return list.find((l) => l.id === id); },
  };
})();

(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const app = document.getElementById("labsApp");
  if (!app) return;

  let live = null;          // { dispose } of the mounted lab
  function unmount() { if (live && live.dispose) { try { live.dispose(); } catch (e) {} } live = null; }

  function route() {
    const id = location.hash.replace(/^#/, "");
    const lab = LABS.get(id);
    unmount();
    if (lab) renderLab(lab); else renderIndex();
    scrollTo({ top: 0, behavior: "smooth" });
    if (window.__observeReveals) window.__observeReveals();
  }
  addEventListener("hashchange", route);

  function renderIndex() {
    const cards = LABS.all().map((l, i) => `
      <a class="card lift reveal d${(i % 3) + 1}" href="#${l.id}" style="--lc:${l.color || "var(--em)"}">
        <div class="glow"></div>
        <div class="ico" style="background:color-mix(in srgb,${l.color || "var(--em)"} 13%,transparent);
             color:${l.color || "var(--em)"};border-color:color-mix(in srgb,${l.color || "var(--em)"} 24%,transparent)">${l.icon || ""}</div>
        <div class="lb-tag" style="color:${l.color || "var(--em)"}">${l.tag || "Lab"}</div>
        <h3 class="h3" style="margin:4px 0 8px">${l.title}</h3>
        <p>${l.blurb}</p>
        <div class="lb-go" style="color:${l.color || "var(--em)"}">Open the bench →</div>
      </a>`).join("");
    app.innerHTML = `
      <div class="wrap band">
        <div class="reveal">
          <div class="eyebrow">The benches</div>
          <h1 class="h1" style="margin:16px 0 16px">Run the experiment<br><span class="grad">yourself.</span></h1>
          <p class="lead" style="max-width:640px">Every bench here works: reagents, variables, instruments and results. Change something, and the biology answers back.</p>
        </div>
        <div class="grid g3" style="margin-top:38px">${cards}</div>
      </div>`;
  }

  function renderLab(l) {
    app.innerHTML = `
      <div class="wrap band lb-page" style="--lc:${l.color || "var(--em)"}">
        <a class="lb-back" href="#">← All benches</a>
        <div class="lb-hd reveal">
          <div class="lb-tag" style="color:${l.color || "var(--em)"}">${l.tag || "Lab"}</div>
          <h1 class="h1" style="margin:8px 0 12px">${l.title}</h1>
          <p class="lead" style="max-width:720px">${l.blurb}</p>
        </div>
        <div class="lb-stage" id="labStage"></div>
      </div>`;
    const host = $("#labStage");
    try { live = l.build(host) || null; }
    catch (e) {
      host.innerHTML = `<div class="lb-err">This bench hit a problem starting up. <button class="btn ghost" onclick="location.reload()">Reload</button></div>`;
      console.warn("lab failed: " + l.id, e);
    }
  }

  // Defer the first route by a microtask: the bench modules are concatenated AFTER
  // this shell, so they have not registered yet at this point in synchronous
  // execution. A microtask runs once the whole script block has finished, by which
  // time every LABS.register() call has landed.
  queueMicrotask(route);
})();
