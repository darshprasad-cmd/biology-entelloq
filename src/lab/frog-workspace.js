/* The frog practical's focused teaching controls. Rendering, anatomical content
 * and pin validation stay in their own modules. This view never awards progress
 * for a button press: every placement goes through the same validated engine. */
const FROG_WORKSPACE_CSS = `
body.frog-lab{--ink:#e6eee9;--dim:#b5c5be;--faint:#a1b1a9;--em:#8cd5b1;--cy:#9ed3c4;--glass:rgba(13,24,22,.95)}
body.frog-lab #obj,body.frog-lab #hint,body.frog-lab #topright,body.frog-lab #systems,body.frog-lab #rail,body.frog-lab #say,body.frog-lab #coach{display:none!important}
body.frog-lab #pick.gone{visibility:hidden}
body.frog-lab #recclose{display:block}
#frog-workspace{position:fixed;inset:0;pointer-events:none;z-index:22;font:14px/1.5 var(--sans);color:var(--ink)}
#frog-workspace *{box-sizing:border-box}
#frog-workspace button,#frog-workspace select,#frog-workspace a{font:inherit;min-height:44px;border:1px solid #3b5047;border-radius:9px;background:#182a24;color:var(--ink);padding:8px 12px;cursor:pointer;text-decoration:none;touch-action:manipulation}
#frog-workspace button:active{transform:scale(.98)}
#frog-workspace button:disabled{opacity:.55;cursor:not-allowed}
#frog-workspace button[aria-pressed=true],#frog-workspace .primary{background:#a1dfbb;color:#0a2418;border-color:#a1dfbb;font-weight:650}
#frog-workspace :focus-visible,body.frog-lab .tool:focus-visible{outline:3px solid #c2f5d7;outline-offset:3px}
#frog-workspace .fw-kicker{font:10px/1.5 var(--mono);letter-spacing:.17em;text-transform:uppercase;color:#a6c6b4}
.fw-header{position:absolute;inset:18px 24px auto;display:flex;justify-content:space-between;gap:16px;align-items:center;pointer-events:auto}
.fw-brand{padding:5px 0;line-height:1.2}.fw-brand strong{display:block;font-size:19px;font-weight:550;margin:4px 0}
.fw-header nav{display:flex;gap:8px;align-items:center}.fw-header nav button{background:rgba(15,27,23,.92)}
.fw-embedded .fw-header nav{padding-right:80px}.fw-embedded .fw-header nav a{display:none}
.fw-step{position:absolute;right:24px;top:106px;width:292px;max-height:calc(100dvh - 228px);overflow:auto;padding:21px;pointer-events:auto}
.fw-step h1{font-size:23px;line-height:1.18;letter-spacing:-.025em;margin:12px 0;font-weight:550}
.fw-step p{margin:9px 0;color:#c0cec6}.fw-step summary{cursor:pointer;min-height:44px;display:flex;align-items:center;gap:8px;color:#b5d7c2}
.fw-step summary::before{content:'+';font-size:20px}.fw-step details[open]>summary::before{content:'−'}
.fw-progress{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #30453b;padding-top:13px;margin-top:16px;font-size:12px}
.fw-progress b{color:#b1e8c6}.fw-checks{display:flex;gap:5px}.fw-checks i{height:6px;width:21px;background:#31483d;border-radius:4px}.fw-checks i.done{background:#9bdfb8}
.fw-targets{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:13px 0}.fw-targets button{font-size:12px!important;padding:8px!important;text-align:left}
.fw-targets button span{display:block;font-size:10px;opacity:.85}
.fw-pin-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.fw-pin-actions button{font-size:12px!important}
#frog-confirm,#frog-continue{width:100%;margin-top:9px}
.fw-feedback{border-left:2px solid #99c5a8;padding-left:10px;font-size:12px;min-height:36px;margin:12px 0;color:#d9e4dc}
.fw-feedback[data-error=true]{border-color:#ecb48f;color:#ffdcc4}
.fw-note{font-size:11px!important;color:#aebdb3!important}.fw-subtle{border:0!important;background:transparent!important;color:#abcdbb!important;padding:5px 0!important}
.fw-viewbar{position:absolute;bottom:22px;left:50%;transform:translateX(-50%);display:flex;gap:5px;padding:6px;pointer-events:auto;max-width:calc(100vw - 390px);flex-wrap:wrap;justify-content:center}
.fw-viewbar button{font-size:11px!important;padding:7px 11px!important;background:transparent!important}
.fw-viewbar button[aria-pressed=true]{color:#b5edcb!important;background:#203a2d!important}
.fw-orientation{position:absolute;left:calc(50% - 100px);top:110px;pointer-events:none;color:#bfd0c4;font:10px var(--mono);letter-spacing:.17em;text-transform:uppercase;text-shadow:0 2px 5px #000}
.fw-drawer{display:none;position:absolute;right:24px;top:80px;width:350px;max-height:calc(100dvh - 110px);overflow:auto;padding:20px;pointer-events:auto;z-index:35;background:#101e18!important}
.fw-drawer.open{display:block}.fw-drawer h2{font-size:21px;margin:0}.fw-drawer .fw-close{float:right}.fw-drawer h3{font-size:13px;margin:22px 0 8px}
.fw-drawer p,.fw-drawer li{color:#b9ccc0;font-size:12px}.fw-drawer a{border:0!important;padding:0!important;display:inline-block;color:#b4e4c5!important;text-decoration:underline!important;min-height:0!important}
.fw-drawer select{width:100%;margin:5px 0 9px}.fw-drawer fieldset{border:0;margin:18px 0;padding:0}.fw-drawer legend{font-size:12px;margin-bottom:8px}.fw-segment{display:flex;gap:5px;flex-wrap:wrap}.fw-segment button{font-size:12px!important}
.fw-structures{padding:0;list-style:none}.fw-structures li{border-top:1px solid #304137;padding:12px 0}.fw-structures button{display:block;width:100%;text-align:left}.fw-structures p{margin-bottom:0}.fw-structures small{display:block;color:#99bda7;margin-top:4px}
body.frog-lab #hand{position:static!important;display:flex!important;width:auto!important;padding:12px!important;margin-top:12px;background:#14281e;border-radius:9px}
body.frog-lab #dock{top:106px!important;left:24px;display:flex!important;flex-direction:column;gap:6px;padding:7px;z-index:23;background:rgba(13,24,20,.94);max-height:calc(100dvh - 214px);overflow:auto}
body.frog-lab #dock .tool{width:70px;height:66px;display:flex;flex-direction:column;justify-content:center;gap:5px;flex-shrink:0;color:#bccdc1;transform:none}
body.frog-lab #dock .tool svg{width:22px;height:22px}body.frog-lab #dock .tname{display:block;font:10px var(--sans)}
body.frog-lab #dock .tnum{font-size:8px;right:4px;top:4px;bottom:auto}body.frog-lab #dock .ttip{display:none}
body.frog-lab #dock .tool.on{border-color:#8ed4ac;background:#264638;color:#c4f2d5;box-shadow:none}
body.frog-lab #dock .tool.on::after{display:none}body.frog-lab #dock .tool[aria-disabled=true]{opacity:.45}
.fw-atlas{position:absolute;inset:90px 330px 100px 112px;display:none;pointer-events:auto;border:1px solid #3b5144;border-radius:16px;background:#13251d;overflow:hidden}
.fw-atlas.on{display:flex;align-items:center;justify-content:center}.fw-atlas svg{width:100%;height:100%;max-height:680px}
.fw-atlas .fw-map-target{cursor:pointer}.fw-atlas .fw-map-target:focus{outline:none;stroke:#fff;stroke-width:5}
.fw-atlas .fw-atlas-caption{position:absolute;bottom:8px;left:14px;right:14px;font-size:11px;color:#c4d7ca;text-align:center}
body.frog-2d #stage canvas{visibility:hidden}
@media(max-width:1050px){.fw-step{width:252px;right:16px;padding:16px}.fw-header{left:16px;right:16px}.fw-viewbar{max-width:calc(100vw - 290px);left:45%;bottom:20px}.fw-atlas{right:280px}.fw-header nav{gap:5px}.fw-header nav button,.fw-header nav a{padding:7px 9px!important;font-size:12px!important}}
@media(max-width:760px){.fw-header{inset:10px 12px auto}.fw-brand strong{font-size:15px}.fw-brand .fw-kicker{font-size:8px;letter-spacing:.08em}.fw-header nav{gap:4px}.fw-header nav button,.fw-header nav a{font-size:10px!important;padding:7px!important}.fw-header [data-fw-drawer=help]{display:none}
.fw-header{gap:8px}.fw-embedded .fw-header nav{padding-right:80px}
body.frog-lab #dock .tname{font-size:9px;letter-spacing:0;text-transform:none;max-width:100%}
.fw-step{top:74px;left:12px;right:12px;width:auto;padding:12px 15px;max-height:calc(100dvh - 254px);z-index:24}.fw-step h1{font-size:18px;margin:5px 0}.fw-step .fw-lead{font-size:12px;margin:4px 0}.fw-step .fw-progress{margin-top:9px;padding-top:9px}.fw-step .fw-instructions{display:none}.fw-step.expanded .fw-instructions{display:block}.fw-step .fw-mobile-toggle{display:block!important;position:absolute;right:11px;top:9px;font-size:11px!important}.fw-step .fw-kicker{font-size:9px}.fw-step .fw-targets{grid-template-columns:repeat(4,1fr)}
.fw-step #frog-continue{margin-top:8px}.fw-step .fw-feedback{min-height:0;margin:9px 0;font-size:11px}.fw-step #frog-feedback:empty{display:none}
.fw-step:not(.expanded) #frog-continue:disabled,.fw-step:not(.expanded) #frog-saved,.fw-step:not(.expanded) #frog-atlas-toggle{display:none}
body.frog-lab #dock{left:12px!important;right:12px!important;bottom:76px!important;top:auto!important;max-height:none;flex-direction:row!important;justify-content:center;padding:5px;gap:4px}
body.frog-lab .eqx-fab,body.frog-lab .eqx-panel{bottom:calc(12px + env(safe-area-inset-bottom,0px))!important}
body.frog-lab #dock .tool{width:calc((100vw - 68px)/6);max-width:70px;height:52px}.fw-viewbar{bottom:12px;left:auto;right:12px;max-width:calc(100vw - 140px);transform:none;padding:3px;gap:1px}.fw-viewbar button{font-size:10px!important;padding:5px 7px!important}.fw-viewbar .fw-wide{display:none}
.fw-orientation{top:252px;left:50%;transform:translateX(-50%);font-size:8px;white-space:nowrap}.fw-drawer{top:68px;left:12px;right:12px;width:auto;max-height:calc(100dvh - 90px)}.fw-atlas{inset:244px 12px 139px}.fw-atlas .fw-atlas-caption{font-size:9px;bottom:4px}
}
@media(prefers-reduced-motion:reduce){#frog-workspace *,body.frog-lab .tool{animation:none!important;transition:none!important;scroll-behavior:auto!important}#frog-workspace button:active{transform:none}}
`;

function createFrogWorkspace(api) {
  const style = document.createElement("style");
  style.textContent = FROG_WORKSPACE_CSS;
  document.head.appendChild(style);
  const host = document.createElement("section");
  host.id = "frog-workspace";
  host.setAttribute("aria-label", "Frog dissection workspace");
  host.innerHTML = `
    <header class="fw-header"><div class="fw-brand"><span class="fw-kicker">Entelloq · Virtual biology</span><strong>Frog dissection</strong></div>
      <nav aria-label="Laboratory"><button data-fw-drawer="anatomy" aria-expanded="false">Anatomy</button><button data-fw-drawer="settings" aria-expanded="false">Settings</button><button data-fw-drawer="help" aria-expanded="false">Help</button><a href="./app.html#learn" target="_top">Exit</a></nav></header>
    <div class="fw-orientation">Anterior ↑ · Ventral surface</div>
    <section class="fw-step chrome" aria-label="Current dissection step">
      <span class="fw-kicker" id="frog-step-number">Guided practical · Step 1 of 8</span>
      <button class="fw-mobile-toggle" style="display:none" aria-expanded="false">Controls</button>
      <h1 id="frog-step-title">A steady foundation.</h1><p class="fw-lead" id="frog-step-instruction">Secure the four distal limbs to the tray.</p>
      <div class="fw-progress"><b id="frog-pin-count">0 / 4 limbs pinned</b><span class="fw-checks" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>
      <div id="frog-feedback" class="fw-feedback" role="status" aria-live="polite" aria-atomic="true"></div>
      <div class="fw-instructions">
        <div id="frog-targets" class="fw-targets" role="group" aria-label="Select a limb for pinning"></div>
        <p class="fw-note" id="frog-keyboard-help">Select a limb. Use arrow keys to adjust its proposed anchor, then confirm. You can also tap a ring on the tray.</p>
        <button id="frog-confirm">Place selected pin</button>
        <div class="fw-pin-actions"><button id="frog-guide">Guide one pin</button><button id="frog-undo">Undo pin</button><button id="frog-remove">Reposition limb</button><button id="frog-reset">Restart pinning</button></div>
        <details><summary>Why this matters</summary><p>Stable limbs keep the specimen still and place the belly wall under controlled tension. Use the distal limb targets, away from joints, eyes and the torso.</p><p class="fw-note">Before continuing, notice: the belly faces up (ventral); the back rests below (dorsal). The head is anterior and the hind limbs are posterior.</p></details>
      </div>
      <button id="frog-continue" class="primary" disabled>Continue to skin incision</button>
      <p id="frog-saved" class="fw-note">Valid pin placements are saved on this device.</p>
      <button id="frog-atlas-toggle" class="fw-subtle">Use accessible 2D view</button>
    </section>
    <div class="fw-viewbar chrome" role="group" aria-label="Camera views"><button data-view="ventral" aria-pressed="true">Ventral</button><button data-view="top" aria-pressed="false">Top</button><button data-view="left" class="fw-wide" aria-pressed="false">Left</button><button data-view="right" class="fw-wide" aria-pressed="false">Right</button><button id="frog-reset-view">Reset view</button></div>
    <aside class="fw-drawer chrome" id="frog-anatomy" aria-label="Anatomy drawer"><button class="fw-close">Close</button><h2>Anatomy</h2>
      <label for="frog-mode">Learning mode</label><select id="frog-mode"><option value="guided">Guided dissection</option><option value="independent">Independent practical</option><option value="explore">Explore anatomy</option></select>
      <p id="frog-mode-note">Internal anatomy becomes available as the overlying layers are opened.</p><ol class="fw-structures" id="frog-structures"></ol></aside>
    <aside class="fw-drawer chrome" id="frog-settings" aria-label="Experience settings"><button class="fw-close">Close</button><h2>Your laboratory</h2>
      <fieldset><legend>Tissue presentation</legend><div class="fw-segment"><button data-presentation="clinical" aria-pressed="true">Clinical</button><button data-presentation="realistic" aria-pressed="false">Realistic</button><button data-presentation="minimal" aria-pressed="false">Minimal</button></div><p id="frog-presentation-note">Clinical: a preserved-specimen study, without active bleeding.</p></fieldset>
      <label for="frog-quality">Rendering quality</label><select id="frog-quality"><option value="1">Balanced</option><option value="2">Desktop detail</option><option value="0">Low power</option></select><p>Quality changes pixel density and shadows, never the anatomy or placement rules.</p>
      <details><summary>Optional hand tracking</summary><div id="frog-hand-slot"></div></details>
      <button data-fw-drawer="help" aria-expanded="false">About this practical & help</button>
      <button id="frog-switch-specimen">Change specimen</button><button id="frog-restart-specimen">Restart this specimen</button>
    </aside>
    <aside class="fw-drawer chrome" id="frog-help" aria-label="Laboratory help"><button class="fw-close">Close</button><h2>Observe. Understand. Practice.</h2>
      <p>This virtual practical lets you repeat observations and learn anatomical orientation without using an animal. It does not replace supervised laboratory instruction.</p>
      <h3>Place a pin</h3><p>Choose Pins (4), then tap a target ring. For keyboard operation, choose a limb, adjust with arrow keys and press Enter. Pinning is reversible until an incision begins.</p>
      <h3>Inspect the specimen</h3><p>Drag empty space to orbit. Scroll or pinch to zoom. Use the named views to recover your orientation. In 2D, use the same limb controls; no precise dragging is required.</p>
      <h3>About this specimen</h3><p>An original generalized Rana-type adult frog teaching model. Pale ventral skin suggests a preserved specimen; colour and tissue response are simplified. Species and sex are not independently verified; reproductive structures are not a species-specific diagnostic reference.</p>
      <p>Pin targets and tension limits are authored teaching constraints in model units, not measurements of biological force. No animal experiment, medical claim, or clinical validation is implied.</p>
      <h3>Reference</h3><a href="https://pressbooks.cuny.edu/dimbro7/chapter/week-9-animals-ii-chordates/" target="_blank" rel="noopener noreferrer">CUNY General Biology OER · Chordates</a>
      <h3>Contextual help</h3><button id="frog-tutor-help">Ask the Entelloq tutor for a hint</button><p>Tutor guidance stays on request. Camera and sound are optional.</p>
      <h3>Review your practical</h3><button id="frog-open-record">Attempt record</button><button id="frog-open-viva">Review questions</button><p>Your record and review questions remain available throughout the 3D practical.</p>
    </aside>
    <div class="fw-atlas" id="frog-atlas" role="region" aria-label="Accessible two-dimensional frog diagram">
      <svg viewBox="-650 -750 1300 1500" role="group" aria-label="Ventral frog diagram: head anterior at the top, hind limbs posterior at the bottom, four distal pin targets.">
        <rect x="-605" y="-710" width="1210" height="1420" rx="55" fill="#81988a" stroke="#c1cfc2" stroke-width="14"/>
        <g transform="scale(1,-1)" fill="#a9b28a" stroke="#4b5d40" stroke-width="8">
          <path d="M-140 180 Q-220 240 -280 210 L-353 282 M140 180 Q220 240 280 210 L353 282 M-140 -185 Q-330 -190 -355 -285 Q-290 -375 -370 -472 M140 -185 Q330 -190 355 -285 Q290 -375 370 -472" fill="none" stroke="#a7b584" stroke-width="60" stroke-linecap="round"/>
          <path d="M0 440 Q155 415 160 235 Q225 95 175 -160 Q120 -350 0 -390 Q-120 -350 -175 -160 Q-225 95 -160 235 Q-155 415 0 440Z" fill="#d0d1ac"/>
          <path d="M-130 300 Q0 260 130 300 M0 240 Q-10 0 0 -275" fill="none" stroke="#a6ac86" stroke-width="5"/>
        </g><g id="frog-map-pins"></g>
      </svg><p class="fw-atlas-caption">Schematic ventral diagram · not a photograph or calibrated scale</p>
    </div>`;
  if (window.self !== window.top) host.classList.add("fw-embedded");
  document.body.appendChild(host);
  document.body.classList.add("frog-lab");
  const stage = document.getElementById("stage");
  const stageRole = stage?.getAttribute("role");
  const stageLabel = stage?.getAttribute("aria-label");
  stage?.setAttribute("role", "region");
  stage?.setAttribute(
    "aria-label",
    "Interactive frog specimen. Keyboard pin controls and an accessible 2D view are available in the current dissection step.",
  );
  const $ = (s) => host.querySelector(s);
  const hand = document.getElementById("hand");
  if (hand) $("#frog-hand-slot").appendChild(hand);
  let is2D = !!api.fallback,
    lastSnapshot = null,
    lastFeedback = "",
    lastDrawerButton = null,
    selectedStructure = null;
  let structureKey = "",
    mapKey = "";
  function say(text, error = false) {
    if (!text) return;
    const node = $("#frog-feedback");
    node.textContent = text;
    node.dataset.error = String(error);
    lastFeedback = text;
  }
  function closeDrawers() {
    host
      .querySelectorAll(".fw-drawer")
      .forEach((n) => n.classList.remove("open"));
    host
      .querySelectorAll("[data-fw-drawer]")
      .forEach((n) => n.setAttribute("aria-expanded", "false"));
  }
  host.querySelectorAll("[data-fw-drawer]").forEach(
    (b) =>
      (b.onclick = () => {
        const drawer = $("#frog-" + b.dataset.fwDrawer);
        const open = !drawer.classList.contains("open");
        closeDrawers();
        if (open) {
          drawer.classList.add("open");
          b.setAttribute("aria-expanded", "true");
          lastDrawerButton = b;
          drawer.querySelector(".fw-close").focus();
        }
      }),
  );
  host.querySelectorAll(".fw-close").forEach(
    (b) =>
      (b.onclick = () => {
        closeDrawers();
        if (lastDrawerButton) lastDrawerButton.focus();
      }),
  );
  const call = (method, ...args) => {
    const d = api.dissection();
    if (d && typeof d[method] === "function") d[method](...args);
    update();
  };
  const targetButtons = new Map();
  function makeTargets(s) {
    if (targetButtons.size || !s) return;
    s.targets.forEach((t, i) => {
      const b = document.createElement("button");
      b.dataset.pinTarget = t.id;
      b.setAttribute("aria-label", "Select " + t.label.toLowerCase());
      b.innerHTML = `<b>${i + 1}. ${t.label.replace(" limb", "").replace("forelimb", "fore").replace("hindlimb", "hind")}</b><span>Not pinned</span>`;
      b.onclick = () => {
        call("selectPinTarget", t.id);
        api.tool("pins");
      };
      b.onkeydown = (e) => {
        const moves = {
          ArrowLeft: [-0.04, 0],
          ArrowRight: [0.04, 0],
          ArrowUp: [0, 0.04],
          ArrowDown: [0, -0.04],
        };
        if (!moves[e.key]) return;
        e.preventDefault();
        e.stopPropagation();
        if (
          !lastSnapshot ||
          lastSnapshot.selectedTargetId !== t.id ||
          !lastSnapshot.preview
        )
          call("selectPinTarget", t.id);
        call("movePinPreview", ...moves[e.key]);
      };
      $("#frog-targets").appendChild(b);
      targetButtons.set(t.id, b);
    });
  }
  $("#frog-confirm").onclick = () => call("confirmPin");
  $("#frog-guide").onclick = () => {
    api.tool("pins");
    call("guidePin");
  };
  $("#frog-undo").onclick = () => call("undoPin");
  $("#frog-remove").onclick = () => {
    if (lastSnapshot) call("removePin", lastSnapshot.selectedTargetId);
  };
  $("#frog-reset").onclick = () => call("resetPins");
  $("#frog-continue").onclick = () => {
    call("continuePinning");
    if (lastSnapshot && lastSnapshot.continued) {
      api.tool("scalpel");
      api.view("top", true);
    }
  };
  $(".fw-mobile-toggle").onclick = () => {
    const open = $(".fw-step").classList.toggle("expanded");
    $(".fw-mobile-toggle").setAttribute("aria-expanded", String(open));
    $(".fw-mobile-toggle").textContent = open ? "Hide" : "Controls";
  };
  host.querySelectorAll("[data-view]").forEach(
    (b) =>
      (b.onclick = (e) => {
        api.view(b.dataset.view, e.detail === 0);
        host
          .querySelectorAll("[data-view]")
          .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      }),
  );
  $("#frog-reset-view").onclick = (e) => api.view("ventral", e.detail === 0);
  $("#frog-quality").onchange = (e) => api.quality(Number(e.target.value));
  host.querySelectorAll("[data-presentation]").forEach(
    (b) =>
      (b.onclick = () => {
        host
          .querySelectorAll("[data-presentation]")
          .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        api.presentation(b.dataset.presentation);
        $("#frog-presentation-note").textContent = {
          clinical:
            "Clinical: a preserved-specimen study, without active bleeding.",
          realistic:
            "Realistic: optional simulated tissue bleeding during later incisions. This is a teaching effect, not preserved-specimen appearance.",
          minimal:
            "Minimal: no blood effects; the same anatomy and procedure remain available.",
        }[b.dataset.presentation];
      }),
  );
  $("#frog-mode").onchange = (e) => {
    call("setMode", e.target.value);
    api.restore();
    selectedStructure = null;
    const d = api.dissection();
    api.tool(
      e.target.value !== "explore" && d.canUseTool("pins") ? "pins" : "probe",
    );
    renderStructures();
  };
  $("#frog-switch-specimen").onclick = () => api.picker();
  $("#frog-restart-specimen").onclick = () => {
    const b = $("#frog-restart-specimen");
    if (b.dataset.confirm !== "true") {
      b.dataset.confirm = "true";
      b.textContent = "Confirm restart · clear this attempt";
      return;
    }
    api.restart();
  };
  $("#frog-tutor-help").onclick = () => {
    closeDrawers();
    api.hint();
  };
  for (const [selector, action] of [
    ["#frog-open-record", "record"],
    ["#frog-open-viva", "viva"],
  ]) {
    const button = $(selector);
    button.disabled = !!api.fallback;
    if (api.fallback)
      button.title =
        "The full practical record and review require the 3D session.";
    button.onclick = () => {
      closeDrawers();
      api[action]();
    };
  }
  function set2D(on) {
    is2D = !!on;
    document.body.classList.toggle("frog-2d", is2D);
    $("#frog-atlas").classList.toggle("on", is2D);
    $("#frog-atlas-toggle").textContent = is2D
      ? api.fallback
        ? "2D view · WebGL unavailable"
        : "Return to 3D specimen"
      : "Use accessible 2D view";
    api.alternative(is2D);
    update();
  }
  $("#frog-atlas-toggle").onclick = () => {
    if (!api.fallback) set2D(!is2D);
  };
  function renderMap(s) {
    if (!s) return;
    const key = JSON.stringify(s.anchors);
    if (key === mapKey && $("#frog-map-pins").childElementCount) return;
    mapKey = key;
    const focusedId =
      document.activeElement &&
      document.activeElement.getAttribute("data-map-target");
    const g = $("#frog-map-pins");
    g.replaceChildren();
    s.targets.forEach((t, i) => {
      const anchor = t.anchor || t.center;
      const b = document.createElementNS("http://www.w3.org/2000/svg", "g");
      b.setAttribute(
        "transform",
        `translate(${anchor[0] * 100},${-anchor[2] * 100})`,
      );
      b.setAttribute("class", "fw-map-target");
      b.setAttribute("role", "button");
      b.setAttribute("tabindex", "0");
      b.setAttribute("data-map-target", t.id);
      b.setAttribute(
        "aria-label",
        (t.pinned ? "Reposition " : "Pin ") + t.label.toLowerCase(),
      );
      b.innerHTML = `<circle r="44" fill="${t.pinned ? "#143b29" : "#e2ecd7"}" stroke="#173d29" stroke-width="5"/><text text-anchor="middle" y="13" font-size="36" fill="${t.pinned ? "#cbf1d4" : "#163624"}">${t.pinned ? "✓" : i + 1}</text>`;
      b.onclick = () => {
        call("selectPinTarget", t.id);
        call("confirmPin");
      };
      b.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          b.onclick();
        }
      };
      g.appendChild(b);
    });
    if (focusedId) {
      const restore = Array.from(g.children).find(
        (n) => n.getAttribute("data-map-target") === focusedId,
      );
      if (restore) restore.focus();
    }
  }
  function renderStructures() {
    const d = api.dissection();
    if (!d) return;
    const explore = d.pinning && d.pinning.mode === "explore";
    $("#frog-mode-note").textContent = explore
      ? "Exploration is not a completed dissection. Select a structure to isolate it, or return to Guided to restore your procedure."
      : "Internal anatomy becomes available as the overlying layers are opened.";
    const list = $("#frog-structures");
    list.replaceChildren();
    api.parts().forEach((p) => {
      const available = explore || p.layer <= d.state.maxLayerRevealed;
      const li = document.createElement("li"),
        b = document.createElement("button");
      b.textContent = p.name;
      b.disabled = !available;
      b.onclick = () => {
        selectedStructure = p.id;
        api.structure(p.id, explore);
        renderStructures();
      };
      b.setAttribute("aria-pressed", String(selectedStructure === p.id));
      li.appendChild(b);
      const text = document.createElement("small");
      text.textContent = available
        ? p.system
        : "Locked · open the overlying layer first";
      li.appendChild(text);
      if (selectedStructure === p.id) {
        const desc = document.createElement("p");
        desc.textContent =
          p.note || "Observe its position relative to neighbouring structures.";
        li.appendChild(desc);
      }
      list.appendChild(li);
    });
  }
  function update() {
    const d = api.dissection(),
      s = d && d.pinning;
    if (!s || !s.enabled) return;
    lastSnapshot = s;
    makeTargets(s);
    $("#frog-pin-count").textContent = `${s.count} / 4 limbs pinned`;
    host
      .querySelectorAll(".fw-checks i")
      .forEach((n, i) => n.classList.toggle("done", i < s.count));
    s.targets.forEach((t) => {
      const b = targetButtons.get(t.id);
      if (!b) return;
      b.setAttribute("aria-pressed", String(t.id === s.selectedTargetId));
      b.querySelector("span").textContent = t.pinned
        ? "✓ Secured"
        : "Place anchor";
    });
    $("#frog-continue").disabled =
      !s.canContinue || s.continued || s.mode === "explore";
    $("#frog-continue").textContent = s.continued
      ? "Pinning verified ✓"
      : "Continue to skin incision";
    $("#frog-confirm").disabled = !s.selectedTargetId || s.mode === "explore";
    $("#frog-undo").disabled = !s.history || !s.history.length;
    $("#frog-remove").disabled =
      !s.selectedTargetId || !s.anchors[s.selectedTargetId];
    $("#frog-guide").disabled = s.mode !== "guided" || s.count === 4;
    $("#frog-mode").value = s.mode;
    const oldTitle = document.getElementById("objtxt"),
      oldNumber = document.getElementById("objn");
    $("#frog-step-title").textContent =
      s.mode === "explore"
        ? "Look beneath the surface."
        : s.continued
          ? "Observe the next layer."
          : "A steady foundation.";
    $("#frog-step-instruction").textContent =
      s.mode === "explore"
        ? "Use the Anatomy drawer to study individual structures."
        : s.continued && oldTitle
          ? oldTitle.textContent
          : "Secure the four distal limbs to the tray.";
    if (s.continued && is2D) {
      $("#frog-step-title").textContent = "Four limbs secured.";
      $("#frog-step-instruction").textContent = api.fallback
        ? "First-step practical complete. Review orientation in the diagram; later cutting requires the 3D view."
        : "First-step practical complete. Return to 3D for the existing incision activity, or review Anatomy.";
    }
    $("#frog-step-number").textContent =
      s.mode === "explore"
        ? "Explore anatomy · No procedure credit"
        : `${s.mode === "independent" ? "Independent" : "Guided"} practical · ${s.continued && oldNumber ? oldNumber.textContent.replace(" / ", " of ") : "Step 1 of 8"}`;
    $("#frog-saved").textContent =
      s.saveAvailable === false
        ? "Device storage is unavailable. Your pins last for this session only."
        : "Valid pin placements are saved on this device.";
    const feedback =
      typeof s.feedback === "string"
        ? s.feedback
        : s.feedback && (s.feedback.message || s.feedback.text);
    if (feedback && feedback !== lastFeedback)
      say(feedback, s.feedback && s.feedback.valid === false);
    document.querySelectorAll("#dock .tool").forEach((b) => {
      const ok = !d.canUseTool || d.canUseTool(b.dataset.tool);
      b.setAttribute("aria-disabled", String(!ok));
      b.setAttribute("aria-pressed", String(b.classList.contains("on")));
      b.title = ok
        ? `${b.getAttribute("aria-label")} · Key ${b.querySelector(".tnum").textContent}`
        : d.toolReason(b.dataset.tool);
    });
    if (is2D) renderMap(s);
    const nextStructureKey = s.mode + ":" + d.state.maxLayerRevealed;
    if (nextStructureKey !== structureKey) {
      structureKey = nextStructureKey;
      renderStructures();
    }
  }
  const onKey = (e) => {
    if (e.key === "Escape") {
      closeDrawers();
      if (lastDrawerButton) lastDrawerButton.focus();
    }
    if (e.key === "Enter" && e.target && e.target.dataset.pinTarget) {
      e.preventDefault();
      if (
        !lastSnapshot ||
        lastSnapshot.selectedTargetId !== e.target.dataset.pinTarget ||
        !lastSnapshot.preview
      )
        call("selectPinTarget", e.target.dataset.pinTarget);
      call("confirmPin");
    }
  };
  host.addEventListener("keydown", onKey);
  api.presentation("clinical");
  renderStructures();
  set2D(is2D);
  if (api.fallback)
    say(
      "3D could not start. The accessible 2D practical uses the same validated pin placements and saved progress.",
    );
  else
    say(
      "Begin with Pins (4). Tap a distal target ring, or select a limb below.",
    );
  return {
    update,
    say,
    renderStructures,
    get is2D() {
      return is2D;
    },
    dispose() {
      if (hand) document.body.appendChild(hand);
      if (stage) {
        if (stageRole === null) stage.removeAttribute("role");
        else stage.setAttribute("role", stageRole);
        if (stageLabel === null) stage.removeAttribute("aria-label");
        else stage.setAttribute("aria-label", stageLabel);
      }
      document.body.classList.remove("frog-lab", "frog-2d");
      host.remove();
      style.remove();
    },
  };
}
