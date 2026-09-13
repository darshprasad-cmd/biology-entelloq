/* ============================================================================
   Biology Entelloq — working lab benches.
   Every bench here runs: real variables, real mechanisms, real numbers. Written
   against the LABS contract in _labs.js.
   ========================================================================== */

/* ---------------------------------------------------------------- helpers -- */
function LB_el(t, c, h) { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
const LB_REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
function LB_slider(host, label, min, max, val, step, fmt, on) {
  const g = LB_el("div", "bx-grp");
  g.innerHTML = `<label>${label}</label><div class="bx-row"><input type="range" class="bx-slider" min="${min}" max="${max}" value="${val}" step="${step}"><span class="bx-val"></span></div>`;
  const i = g.querySelector("input"), o = g.querySelector(".bx-val");
  i.setAttribute("aria-label", label);
  const upd = () => { o.textContent = fmt(+i.value); on(+i.value); };
  i.addEventListener("input", upd); host.appendChild(g); upd(); return i;
}
function LB_canvas(host, ratio) {
  const c = LB_el("canvas"); host.appendChild(c);
  c.setAttribute("role", "img"); c.setAttribute("aria-label", "Interactive experiment diagram. Measurements are available in the adjacent text readout.");
  const ctx = c.getContext("2d"); let W, H, dpr;
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = host.getBoundingClientRect();
    W = Math.max(240, r.width); H = Math.round(W * (ratio || 0.62));
    c.style.width = "100%"; c.style.height = H + "px";
    c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size(); addEventListener("resize", size);
  return { c, ctx, get W() { return W; }, get H() { return H; }, size, off: () => removeEventListener("resize", size) };
}
function LB_css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || v; }

/* ============================================================== MICROSCOPE == */
LABS.register("microscope", {
  title: "Virtual Microscope", tag: "Microscopy", color: "var(--cy)",
  icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 18h9M9 18l-1-3M11 6l3 5-3 2-3-5zM13 4l2 1M5 21h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  blurb: "Explore illustrated specimen slides at 40x to 1000x. Change objective, move the stage, find focus and annotate structures against a calibrated model scale bar.",
  build(host) {
    const wrap = LB_el("div", "bx"); host.appendChild(wrap);
    const view = LB_el("div", "bx-view"); const side = LB_el("div", "bx-side");
    wrap.appendChild(view); wrap.appendChild(side);
    const cv = LB_canvas(view, 0.78);

    const SLIDES = {
      onion: { n: "Onion epidermis", stain: "iodine", need: 100 },
      blood: { n: "Human blood smear", stain: "methylene blue", need: 400 },
      stomata: { n: "Leaf stomata", stain: "none", need: 100 },
      bacteria: { n: "Bacteria (mixed)", stain: "methylene blue", need: 1000 },
    };
    // TOTAL magnification (objective × the 10x eyepiece). The chips print the
    // objective itself — 4x/10x/40x/100x are the lenses that exist on a turret;
    // a "1000x objective" does not.
    const MAGS = [40, 100, 400, 1000];
    let slide = "onion", mag = 100, focus = 50, light = 70, stained = false, raf, t = 0, stageX = 0, stageY = 0;
    const annotations = [];

    // Declared BEFORE the sliders: LB_slider fires its callback immediately to show
    // the initial value, and those callbacks call read() — referencing these after
    // the sliders would hit the temporal dead zone and kill the bench.
    const readout = LB_el("div", "bx-read");
    const note = LB_el("div", "bx-note");

    const grp = LB_el("div", "bx-grp");
    grp.innerHTML = "<label>Specimen slide</label>";
    const chips = LB_el("div", "bx-chips");
    Object.keys(SLIDES).forEach((k) => {
      const b = LB_el("button", "bx-btn" + (k === slide ? " on" : ""), SLIDES[k].n);
      b.addEventListener("click", () => {
        slide = k; [...chips.children].forEach((c) => c.classList.remove("on")); b.classList.add("on"); read();
      });
      chips.appendChild(b);
    });
    grp.appendChild(chips); side.appendChild(grp);

    const mg = LB_el("div", "bx-grp");
    mg.innerHTML = "<label>Objective</label>";
    const mchips = LB_el("div", "bx-chips");
    MAGS.forEach((m) => {
      const b = LB_el("button", "bx-btn" + (m === mag ? " on" : ""), m / 10 + "x");
      b.addEventListener("click", () => {
        mag = m; [...mchips.children].forEach((c) => c.classList.remove("on")); b.classList.add("on"); read();
      });
      mchips.appendChild(b);
    });
    mg.appendChild(mchips); side.appendChild(mg);

    LB_slider(side, "Fine focus", 0, 100, 50, 1, (v) => (Math.abs(v - 50) < 6 ? "sharp" : Math.abs(v - 50) < 20 ? "soft" : "blurred"), (v) => { focus = v; read(); });
    LB_slider(side, "Condenser / light", 20, 100, 70, 1, (v) => v + "%", (v) => { light = v; read(); });
    LB_slider(side, "Stage X position", -200, 200, 0, 5, (v) => v + " µm", (v) => { stageX = v; });
    LB_slider(side, "Stage Y position", -200, 200, 0, 5, (v) => v + " µm", (v) => { stageY = v; });
    const annotationLabel = LB_el("label", "bx-grp");
    annotationLabel.textContent = "Observation label · then click the specimen";
    const annotationInput = LB_el("input", "ex-select"); annotationInput.type = "text"; annotationInput.maxLength = 60;
    annotationInput.placeholder = "e.g. nucleus"; annotationInput.setAttribute("aria-label", "Microscope observation label");
    annotationLabel.appendChild(annotationInput); side.appendChild(annotationLabel);
    const annotationList = LB_el("div", "bx-note"); side.appendChild(annotationList);
    function markObservation(x,y) {
      if (!annotationInput.value.trim() || annotations.length >= 8) return;
      const R = Math.min(cv.W, cv.H) * .44, u = R * 2 / fovMicrons();
      if (Math.hypot(x * cv.W - cv.W/2, y * cv.H - cv.H/2) > R) return;
      annotations.push({x:(x * cv.W - cv.W/2)/u + stageX, y:(y * cv.H - cv.H/2)/u + stageY, label: annotationInput.value.trim(), slide, mag});
      annotationList.textContent = annotations.map((a,i) => (i + 1) + ". " + a.label + " (" + a.mag + "x)").join(" · ");
    }
    cv.c.addEventListener("click", (event) => {const r=cv.c.getBoundingClientRect();markObservation((event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height);});
    const markCentre = LB_el("button", "bx-btn", "Mark structure at field centre");
    markCentre.addEventListener("click",()=>markObservation(.5,.5));side.appendChild(markCentre);
    const clearAnnotations = LB_el("button", "bx-btn", "Clear observation markers");
    clearAnnotations.addEventListener("click", () => { annotations.length = 0; annotationList.textContent = ""; }); side.appendChild(clearAnnotations);

    const stainBtn = LB_el("button", "bx-btn", "Apply stain");
    stainBtn.addEventListener("click", () => {
      stained = !stained; stainBtn.classList.toggle("on", stained);
      stainBtn.textContent = stained ? "Wash off stain" : "Apply stain"; read();
    });
    side.appendChild(stainBtn);
    side.appendChild(readout); side.appendChild(note);

    // real optics: field of view is inversely proportional to magnification.
    function fovMicrons() { return 4000 / (mag / 40); }   // ~4mm field at 40x
    // A fine-focus knob moves the stage 1 µm per division, so how far the specimen
    // sits out of the focal plane is |focus − 50| µm. blur() is only the PICTURE of
    // that error, in CSS pixels — it is not a distance and must not be printed as one.
    function focusErrUm() { return Math.abs(focus - 50); }
    function blur() { return Math.min(9, Math.abs(focus - 50) / 5.2); }

    function read() {
      const s = SLIDES[slide];
      const fov = fovMicrons();
      const resolved = mag >= s.need;
      const df = focusErrUm();
      readout.innerHTML = `Field of view <b>${fov >= 1000 ? (fov / 1000).toFixed(2) + " mm" : Math.round(fov) + " µm"}</b> · `
        + `objective <b>${mag / 10}x</b>, total <b>${mag}x</b> · focus <b>${df < 6 ? "sharp" : df + " µm off"}</b>`;
      note.textContent = !resolved
        ? `At the ${mag / 10}x objective this specimen is not resolved — step up to at least the ${s.need / 10}x to see its structure.`
        : (s.stain !== "none" && !stained)
          ? `Structure is visible but low-contrast. ${s.stain[0].toUpperCase() + s.stain.slice(1)} would stain it.`
          : `Well resolved. Total magnification is objective x10 eyepiece; the scale bar below is measured, not decorative.`;
      note.textContent += " Illustrated specimens; the model field is 4 mm at 40×. Resolution thresholds and stain contrast are simplified optical assumptions.";
    }

    function draw() {
      t += LB_REDUCED ? 0 : 0.016;
      const { ctx, W, H } = cv;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.44;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.28); ctx.clip();
      // illuminated field
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      const L = light / 100;
      g.addColorStop(0, `rgba(255,252,240,${0.10 + L * 0.5})`);
      g.addColorStop(1, `rgba(220,235,240,${0.04 + L * 0.16})`);
      ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.filter = `blur(${blur()}px)`;
      const s = SLIDES[slide], resolved = mag >= s.need;
      const zoom = mag / 100;
      // Pixels per micron, straight off the same field of view the scale bar is
      // drawn from. Anything sized through u is measurable against that bar.
      const u = (R * 2) / fovMicrons();
      ctx.save(); ctx.translate(-stageX * u, -stageY * u);
      if (slide === "onion") drawOnion(ctx, cx, cy, R, u, stained);
      else if (slide === "blood") drawBlood(ctx, cx, cy, R, u, stained, resolved);
      else if (slide === "stomata") drawStomata(ctx, cx, cy, R, u);
      else drawBacteria(ctx, cx, cy, R, u, stained, resolved);
      ctx.restore();
      ctx.filter = "none";
      ctx.restore();
      // eyepiece surround + scale bar
      ctx.strokeStyle = LB_css("--hair"); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.28); ctx.stroke();
      const fov = fovMicrons(), barUm = niceBar(fov / 4);
      const px = (barUm / fov) * (R * 2);
      ctx.strokeStyle = LB_css("--ink"); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - R + 16, cy + R - 18); ctx.lineTo(cx - R + 16 + px, cy + R - 18); ctx.stroke();
      ctx.fillStyle = LB_css("--ink"); ctx.font = "600 12px ui-monospace,monospace"; ctx.textAlign = "left";
      ctx.fillText(barUm >= 1000 ? (barUm / 1000) + " mm" : barUm + " µm", cx - R + 16, cy + R - 26);
      annotations.forEach((a, i) => { if (a.slide !== slide) return; const x = cx + (a.x - stageX) * u, y = cy + (a.y - stageY) * u; if (Math.hypot(x - cx, y - cy) > R - 10) return; ctx.strokeStyle = LB_css("--amber"); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 10, 0, 6.28); ctx.stroke(); ctx.fillStyle = LB_css("--ink"); ctx.textAlign = "center"; ctx.font = "600 12px Inter,sans-serif"; ctx.fillText(String(i + 1), x, y + 4); });
      raf = requestAnimationFrame(draw);
    }
    function niceBar(x) { const p = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000]; return p.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a); }

    // Onion epidermis: long brick-shaped cells, roughly 250 x 60 um, with a nucleus
    // about 10 um across. Sized in microns through `u` like the blood and bacteria
    // slides, so all four slides now measure true against the same scale bar —
    // previously these two were sized off a bare zoom factor that only agreed with
    // the bar at one canvas size.
    function drawOnion(ctx, cx, cy, R, u, st) {
      const w = 250 * u, h = 60 * u;
      const z = w / 120;                       // line weights keep their old feel
      ctx.lineWidth = Math.max(1, 2 * z);
      ctx.strokeStyle = st ? "rgba(120,70,150,.85)" : "rgba(150,170,175,.55)";
      for (let r = -4; r <= 4; r++) for (let c = -4; c <= 4; c++) {
        const x = cx + c * w + (r % 2 ? w / 2 : 0), y = cy + r * h;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y - h / 2); ctx.lineTo(x + w / 2, y - h / 2);
        ctx.lineTo(x + w / 2, y + h / 2); ctx.lineTo(x - w / 2, y + h / 2); ctx.closePath();
        ctx.stroke();
        if (5 * u >= 1.5) {   // a 10 um nucleus is only worth drawing once it is a pixel or two
          ctx.fillStyle = st ? "rgba(90,40,120,.85)" : "rgba(120,140,150,.5)";
          ctx.beginPath(); ctx.arc(x + w * 0.16, y, 5 * u, 0, 6.28); ctx.fill();
        }
      }
    }
    // u = pixels per micron. A human RBC is 7.5 µm across, so it is a speck at the
    // 10x objective and only becomes a disc at 40x — which is exactly why the slide
    // needs 400x total. The count is what fills the field of a monolayer smear;
    // sizing is the scale bar's job, not the sprite count's.
    function drawBlood(ctx, cx, cy, R, u, st, resolved) {
      const rad = 3.75 * u;
      // Correctly-sized cells stopped filling the field, so the count has to follow
      // the magnification: a real smear is a monolayer at every zoom, and how many
      // cells that takes depends on how many cell-diameters fit across the view.
      // Capped, because at low power the cells are unresolved anyway and drawing ten
      // thousand specks would cost frames to render a pink haze.
      const across = (R * 2) / Math.max(rad * 2, 0.001);
      const N = Math.max(60, Math.min(760, Math.round(0.26 * across * across * 4 / Math.PI)));
      for (let i = 0; i < N; i++) {
        const a = i * 2.39, r = Math.sqrt(i / N) * R * 1.1;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        ctx.fillStyle = st ? "rgba(190,70,90,.75)" : "rgba(205,110,110,.55)";
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.28); ctx.fill();
        if (resolved) {  // the biconcave pale centre only resolves at 400x+
          ctx.fillStyle = "rgba(255,250,245,.5)";
          ctx.beginPath(); ctx.arc(x, y, rad * 0.45, 0, 6.28); ctx.fill();
        }
      }
      if (resolved) {   // one white cell with a lobed nucleus — ~12 µm across
        ctx.fillStyle = st ? "rgba(70,60,170,.85)" : "rgba(150,150,190,.6)";
        ctx.beginPath(); ctx.arc(cx + 20 * u, cy - 14 * u, 6 * u, 0, 6.28); ctx.fill();
        ctx.fillStyle = st ? "rgba(40,30,120,.95)" : "rgba(110,110,160,.8)";
        for (let k = 0; k < 3; k++) {
          ctx.beginPath(); ctx.arc(cx + 20 * u + Math.cos(k * 2) * 2.5 * u, cy - 14 * u + Math.sin(k * 2) * 2.5 * u, 2.5 * u, 0, 6.28); ctx.fill();
        }
      }
    }
    // Leaf epidermis: pavement cells about 70 um across, stomata about 40 um long.
    // Also sized in microns now, for the same reason as the onion above.
    function drawStomata(ctx, cx, cy, R, u) {
      const z = 70 * u / 44;                   // line weights keep their old feel
      ctx.strokeStyle = "rgba(120,175,130,.5)"; ctx.lineWidth = Math.max(1, 1.6 * z);
      for (let r = -3; r <= 3; r++) for (let c = -3; c <= 3; c++) {
        const x = cx + c * 175 * u + (r % 2 ? 87 * u : 0), y = cy + r * 118 * u;
        ctx.beginPath();
        for (let k = 0; k <= 7; k++) {
          const a = k / 7 * 6.28, rr = 70 * u * (0.8 + Math.sin(k * 2.1) * 0.16);
          k ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7) : ctx.moveTo(x + rr, y);
        }
        ctx.closePath(); ctx.stroke();
      }
      // guard cells + pore, opening and closing gently
      const open = 0.5 + Math.sin(t * 0.5) * 0.35;
      [[0, 0], [-110 * z, 74 * z], [110 * z, -74 * z]].forEach(([dx, dy]) => {
        ctx.fillStyle = "rgba(80,160,100,.75)";
        ctx.beginPath(); ctx.ellipse(cx + dx - 11 * z * open, cy + dy, 9 * z, 22 * z, 0, 0, 6.28); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + dx + 11 * z * open, cy + dy, 9 * z, 22 * z, 0, 0, 6.28); ctx.fill();
      });
    }
    // Same micron units: a coccus is ~0.8 µm across and a bacillus ~2.5 µm long by
    // ~0.8 µm wide. Being that small is the whole reason this slide needs the 100x
    // oil objective — draw them any bigger and the scale bar becomes a lie.
    function drawBacteria(ctx, cx, cy, R, u, st, resolved) {
      const col = st ? "rgba(60,70,170,.9)" : "rgba(150,160,180,.4)";
      ctx.fillStyle = col; ctx.strokeStyle = col;
      const N = 320;
      for (let i = 0; i < N; i++) {
        const a = i * 2.39, r = Math.sqrt(i / N) * R * 1.15;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        const s = resolved ? 1 : 0.4;
        if (i % 3 === 0) { ctx.beginPath(); ctx.arc(x, y, 0.4 * u * s, 0, 6.28); ctx.fill(); }
        else {
          ctx.save(); ctx.translate(x, y); ctx.rotate(a);
          ctx.beginPath(); ctx.ellipse(0, 0, 1.25 * u * s, 0.4 * u * s, 0, 0, 6.28); ctx.fill(); ctx.restore();
        }
      }
    }
    read(); draw();
    return { dispose() { cancelAnimationFrame(raf); cv.off(); }, snapshot() { return {variables: {Slide:SLIDES[slide].n, 'Total magnification (×)':mag, 'Focus setting':focus, 'Light (%)':light, 'Stage X (µm)':stageX, 'Stage Y (µm)':stageY, Stained:stained?'Yes':'No'}, measurements: {'Field of view (µm)':fovMicrons(), 'Focus error (µm)':focusErrUm(), 'Observation markers':annotations.length}, stage:'Observing specimen', actions:annotations.map(a=>a.label)}; } };
  },
});

/* ======================================================== ELECTROPHORESIS == */
LABS.register("gel-electrophoresis", {
  title: "Gel Electrophoresis", tag: "Molecular", color: "var(--indigo)",
  icon: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 6v2M12 6v2M16 6v2M8 12h1M12 14h1M16 11h1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  blurb: "Load a virtual agarose gel, set the voltage and separate a fictional DNA sample. Compare its migration with a reference ladder to estimate fragment size.",
  build(host) {
    const wrap = LB_el("div", "bx"); host.appendChild(wrap);
    const view = LB_el("div", "bx-view"); const side = LB_el("div", "bx-side");
    wrap.appendChild(view); wrap.appendChild(side);
    const cv = LB_canvas(view, 0.72);

    const LADDER = [10000, 6000, 3000, 1500, 1000, 500, 250];
    const UNKNOWN = 1500 + Math.floor(Math.random() * 6) * 500;   // hidden truth
    const LANES = [
      { n: "Ladder", frags: LADDER.slice(), fixed: true },
      { n: "Sample A", frags: [3000, 800] },
      { n: "Sample B", frags: [UNKNOWN] },
      { n: "Empty", frags: [] },
    ];
    let volts = 90, minutes = 0, running = false, raf, loaded = false, voltMinutes = 0, lastFrame = performance.now();

    LB_slider(side, "Voltage", 40, 150, 90, 5, (v) => v + " V", (v) => { volts = v; });
    const loadBtn = LB_el("button", "bx-btn pri", "Load the wells");
    const runBtn = LB_el("button", "bx-btn", "Run the gel"); runBtn.disabled = true;
    const resetBtn = LB_el("button", "bx-btn", "Reset");
    const row = LB_el("div", "bx-chips"); row.appendChild(loadBtn); row.appendChild(runBtn); row.appendChild(resetBtn);
    side.appendChild(row);
    const stepBtn = LB_el("button", "bx-btn", "Advance 10 model minutes"); stepBtn.disabled = true; side.appendChild(stepBtn);
    stepBtn.addEventListener("click", () => { running = false; advance(10); runBtn.textContent = "Run the gel"; upd(); });
    side.appendChild(LB_el("p", "bx-note", "Teaching model: migration decreases linearly with log₁₀(fragment size) over this range. Voltage acts over elapsed time; changing it does not move earlier bands retroactively. Fixed gel concentration and temperature; a model separation, not a wet-lab protocol."));
    const readout = LB_el("div", "bx-read"); side.appendChild(readout);
    const guessWrap = LB_el("div", "bx-grp"); side.appendChild(guessWrap);
    const verdict = LB_el("div", "bx-verdict"); verdict.style.display = "none"; side.appendChild(verdict);

    loadBtn.addEventListener("click", () => { loaded = true; runBtn.disabled = false; stepBtn.disabled = false; loadBtn.disabled = true; upd(); });
    runBtn.addEventListener("click", () => { running = !running; runBtn.textContent = running ? "Pause" : "Run the gel"; });
    resetBtn.addEventListener("click", () => {
      minutes = 0; voltMinutes = 0; running = false; loaded = false; loadBtn.disabled = false; stepBtn.disabled = true;
      runBtn.disabled = true; runBtn.textContent = "Run the gel"; verdict.style.display = "none"; upd();
    });

    guessWrap.innerHTML = "<label>Read Sample B off the ladder</label>";
    const gchips = LB_el("div", "bx-chips");
    [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000].forEach((bp) => {
      const b = LB_el("button", "bx-btn", bp + " bp");
      b.addEventListener("click", () => {
        const right = bp === UNKNOWN;
        verdict.style.display = "";
        verdict.innerHTML = right
          ? `<b>Correct — ${UNKNOWN} bp.</b> You read it by interpolating between the ladder bands. Migration distance is proportional to log(1/size), which is why the ladder bands crowd together at the top.`
          : `<b>Not quite.</b> Compare Sample B's band against its nearest ladder neighbours and interpolate — remember spacing is logarithmic, not linear. (It is not ${bp} bp.)`;
      });
      gchips.appendChild(b);
    });
    guessWrap.appendChild(gchips);

    // Empirical-style teaching calibration: distance is linear in log10(size).
    // Integrate voltage exposure so changing voltage affects subsequent motion.
    function migration(bp) {
      const mobility = Math.max(0, (4.3 - Math.log10(bp)) / 2);
      return Math.min(1.1, (voltMinutes / 6000) * mobility);
    }
    function advance(dt) {
      const elapsed = Math.max(0, Math.min(dt, 90 - minutes));
      minutes += elapsed; voltMinutes += volts * elapsed;
      if (minutes >= 90) { running = false; runBtn.textContent = "Run the gel"; }
    }
    function upd() {
      gchips.querySelectorAll("button").forEach(b => { b.disabled = !loaded || minutes < 8; });
      readout.innerHTML = !loaded
        ? "Wells empty. Load the samples to begin."
        : `Running at <b>${volts} V</b> for <b>${minutes.toFixed(0)} min</b>. ${minutes < 8 ? "Bands are still in the wells." : minutes > 55 ? "Careful — the smallest fragments are running off the end." : "Bands separating."}`;
    }
    function draw() {
      const now = performance.now(), dt = Math.min(.1, (now - lastFrame) / 1000); lastFrame = now;
      if (running) { advance(dt * 6); upd(); }
      const { ctx, W, H } = cv; ctx.clearRect(0, 0, W, H);
      const padX = 26, padTop = 30, gelH = H - padTop - 24, laneW = (W - padX * 2) / LANES.length;
      // gel slab
      ctx.fillStyle = "rgba(120,150,170,.10)";
      ctx.fillRect(padX, padTop, W - padX * 2, gelH);
      ctx.strokeStyle = LB_css("--line"); ctx.strokeRect(padX, padTop, W - padX * 2, gelH);
      ctx.fillStyle = LB_css("--faint"); ctx.font = "600 11px ui-monospace,monospace"; ctx.textAlign = "center";
      ctx.fillText("− cathode", W / 2, 16);
      ctx.fillText("+ anode", W / 2, H - 8);
      LANES.forEach((L, i) => {
        const x = padX + laneW * i + laneW / 2;
        // A well is a hole cut in the slab — brighter than the gel under the dark
        // theme, darker than it under the light one. --hair flips with the theme
        // and does both; baked white only ever did the first.
        ctx.fillStyle = LB_css("--hair");
        ctx.fillRect(x - laneW * 0.3, padTop + 4, laneW * 0.6, 7);      // the well
        ctx.fillStyle = LB_css("--dim"); ctx.font = "600 11px Inter,sans-serif";
        ctx.fillText(L.n, x, padTop - 8);
        if (!loaded) return;
        L.frags.forEach((bp) => {
          if (migration(bp) >= 1) return;
          const y = padTop + 12 + migration(bp) * (gelH - 26);
          // The bands are the one thing this bench asks you to read, so they take
          // their colour from the theme: indigo for the ladder, emerald for the
          // samples. The fixed neon they used to carry was picked against a black
          // gel and measured 1.01:1 on the light theme's white one — not there at
          // all. The ladder still sits back from the samples, now by alpha alone.
          const col = L.fixed ? LB_css("--indigo") : LB_css("--em");
          ctx.globalAlpha = L.fixed ? 0.85 : 1;
          ctx.fillStyle = col; ctx.shadowColor = col;
          ctx.shadowBlur = 8;
          ctx.fillRect(x - laneW * 0.3, y, laneW * 0.6, 5);
          ctx.shadowBlur = 0; ctx.globalAlpha = 1;
          if (L.fixed && minutes > 6) {
            ctx.fillStyle = LB_css("--faint"); ctx.font = "500 9.5px ui-monospace,monospace"; ctx.textAlign = "right";
            ctx.fillText(bp >= 1000 ? (bp / 1000) + "kb" : bp, padX - 4, y + 5);
            ctx.textAlign = "center";
          }
        });
      });
      raf = requestAnimationFrame(draw);
    }
    upd(); draw();
    return { dispose() { cancelAnimationFrame(raf); cv.off(); }, snapshot() { return {variables: {'Voltage (V)':volts, 'Samples loaded':loaded?'Yes':'No'}, measurements: {'Run time (model min)':Number(minutes.toFixed(2)), 'Voltage exposure (V·min)':Number(voltMinutes.toFixed(2)), 'Sample B migration (% gel)':loaded?Number((migration(UNKNOWN)*100).toFixed(2)):0}, stage:!loaded?'Load the wells':running?'Separating DNA':'Compare DNA bands'}; } };
  },
});

/* ========================================================== PREDATOR-PREY == */
LABS.register("predator-prey", {
  title: "Predator & Prey", tag: "Ecology", color: "var(--amber)",
  icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 17c3-6 6 2 9-4s6 3 9-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="6" cy="7" r="1.6" fill="currentColor"/><circle cx="17" cy="15" r="1.6" fill="currentColor"/></svg>',
  blurb: "Set starting populations, food supply and predation pressure. Follow a predator–prey model through time and compare abundant food with a limited carrying capacity.",
  build(host) {
    const wrap = LB_el("div", "bx"); host.appendChild(wrap);
    const view = LB_el("div", "bx-view"); const side = LB_el("div", "bx-side");
    wrap.appendChild(view); wrap.appendChild(side);
    const cv = LB_canvas(view, 0.62);

    let a = 0.9, b = 0.9, c = 0.6, d = 0.9;   // prey birth, predation, pred death, conversion
    let prey = 40, pred = 9, initialPrey = 40, initialPred = 9, raf, hist = [[40,9,0]], t = 0, running = false, foodLimited = false, capacity = 180, lastFrame = performance.now();
    LB_slider(side, "Prey birth rate", 20, 200, 90, 5, (v) => (v / 100).toFixed(2), (v) => { a = v / 100; });
    LB_slider(side, "Predation rate", 20, 200, 90, 5, (v) => (v / 100).toFixed(2), (v) => { b = v / 100; });
    LB_slider(side, "Predator death rate", 20, 200, 60, 5, (v) => (v / 100).toFixed(2), (v) => { c = v / 100; });
    LB_slider(side, "Starting prey", 5, 150, 40, 1, (v) => String(v), (v) => { initialPrey = v; });
    LB_slider(side, "Starting predators", 1, 80, 9, 1, (v) => String(v), (v) => { initialPred = v; });
    LB_slider(side, "Food-limited carrying capacity", 30, 300, 180, 5, (v) => v + " prey", (v) => { capacity = v; });
    const foodLabel = LB_el("label", "bx-note");
    const foodToggle = LB_el("input"); foodToggle.type = "checkbox"; foodToggle.addEventListener("change", () => { foodLimited = foodToggle.checked; });
    foodLabel.append(foodToggle, document.createTextNode(" Limit prey growth by food supply")); side.appendChild(foodLabel);
    const runBtn = LB_el("button", "bx-btn", "Run populations");
    runBtn.addEventListener("click", () => { running = !running; runBtn.textContent = running ? "Pause populations" : "Run populations"; }); side.appendChild(runBtn);
    const stepBtn = LB_el("button", "bx-btn", "Advance 1 model time unit");
    stepBtn.addEventListener("click", () => { for (let i = 0; i < 100; i++) step(.01); }); side.appendChild(stepBtn);
    const resetBtn = LB_el("button", "bx-btn", "Reset populations");
    resetBtn.addEventListener("click", () => { prey = initialPrey; pred = initialPred; t = 0; hist = [[prey,pred,0]]; running = false; runBtn.textContent = "Run populations"; });
    side.appendChild(resetBtn);
    const readout = LB_el("div", "bx-read"); side.appendChild(readout);
    const note = LB_el("div", "bx-note",
      "Illustrative Lotka–Volterra model with an optional logistic food limit. Time is in model units and populations are continuous approximations. Predators typically peak after prey; limited food can damp the cycles. Tiny positive numerical floors avoid unstable steps, so extinction is not represented.");
    side.appendChild(note);

    function step(dt) {
      // dPrey/dt = a·N − b·N·P ; dPred/dt = d·b·N·P − c·P
      // No ceiling: the plot already rescales to the data (maxV), so capping the
      // populations only flattened every peak into a plateau. Prey is advanced first
      // and the NEW prey feeds the predator equation — semi-implicit Euler is
      // symplectic for Lotka–Volterra, so the cycle holds its amplitude instead of
      // spiralling outward the way the plain explicit step did. Only the extinction
      // floors remain.
      prey = Math.max(0.4, prey + (a * prey * (foodLimited ? 1 - prey / capacity : 1) - b * prey * pred * 0.02) * dt);
      pred = Math.max(0.2, pred + (d * b * prey * pred * 0.02 * 0.35 - c * pred) * dt);
      t += dt;
      hist.push([prey, pred, t]); if (hist.length > 460) hist.shift();
    }
    function draw() {
      const now = performance.now(), dt = Math.min(.1, (now - lastFrame) / 1000); lastFrame = now;
      if (running) { for (let i = 0; i < 5; i++) step(dt * .6); }
      const { ctx, W, H } = cv; ctx.clearRect(0, 0, W, H);
      const pad = 30, gw = W - pad * 2, gh = H - pad * 2;
      ctx.strokeStyle = LB_css("--line"); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, H - pad); ctx.lineTo(W - pad, H - pad); ctx.stroke();
      const maxV = Math.max(60, ...hist.map((h) => Math.max(h[0], h[1])));
      function series(idx, col) {
        ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath();
        hist.forEach((h, i) => {
          const x = pad + ((h[2]-hist[0][2]) / Math.max(1,t-hist[0][2])) * gw, y = H - pad - (h[idx] / maxV) * gh;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      }
      series(0, LB_css("--em")); series(1, LB_css("--rose"));
      ctx.font = "600 11px ui-monospace,monospace"; ctx.textAlign = "left";
      ctx.fillStyle = LB_css("--em"); ctx.fillText("prey", pad + 6, pad + 4);
      ctx.fillStyle = LB_css("--rose"); ctx.fillText("predators", pad + 50, pad + 4);
      ctx.fillStyle = LB_css("--dim"); ctx.textAlign = "center"; ctx.fillText("model time "+hist[0][2].toFixed(1)+" → "+t.toFixed(1), W / 2, H - 8);
      ctx.textAlign = "right"; ctx.fillText(String(Math.round(maxV)),pad-4,pad+10); ctx.fillText("0",pad-4,H-pad);
      readout.innerHTML = `Prey <b>${prey.toFixed(0)}</b> · Predators <b>${pred.toFixed(0)}</b>`;
      raf = requestAnimationFrame(draw);
    }
    draw();
    return { dispose() { cancelAnimationFrame(raf); cv.off(); }, snapshot() { return {variables: {'Prey birth rate':a, 'Predation rate':b, 'Predator death rate':c, 'Starting prey':initialPrey, 'Starting predators':initialPred, 'Food limit':foodLimited?'Logistic':'Unlimited', 'Carrying capacity (prey)':capacity}, measurements: {'Prey population':Number(prey.toFixed(2)), 'Predator population':Number(pred.toFixed(2)), 'Elapsed model time':Number(t.toFixed(2))}, stage:running?'Population dynamics running':'Population dynamics paused'}; } };
  },
});

/* ========================================================= ENZYME KINETICS = */
LABS.register("enzyme-kinetics", {
  title: "Enzyme Kinetics", tag: "Molecular", color: "var(--em)",
  icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 18c4 0 4-9 8-9s4 6 8 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="7" cy="9" r="1.6" fill="currentColor"/></svg>',
  blurb: "Investigate an enzyme model with temperature, pH, substrate and enzyme concentration. Compare inhibition mechanisms and separate saturation from loss of enzyme activity.",
  build(host) {
    const wrap = LB_el("div", "bx"); host.appendChild(wrap);
    const view = LB_el("div", "bx-view"); const side = LB_el("div", "bx-side");
    wrap.appendChild(view); wrap.appendChild(side);
    const cv = LB_canvas(view, 0.62);

    const ENZ = { pepsin: { n: "Pepsin", pH: 2, t: 37 }, amylase: { n: "Amylase", pH: 7, t: 37 }, trypsin: { n: "Trypsin", pH: 8, t: 37 } };
    let enz = "amylase", temp = 37, pH = 7, sub = 50, enzymeConcentration = 1, inhibitor = "none", inhibitorConcentration = 20, denatured = false, raf;

    const eg = LB_el("div", "bx-grp"); eg.innerHTML = "<label>Enzyme</label>";
    const ec = LB_el("div", "bx-chips");
    Object.keys(ENZ).forEach((k) => {
      const b = LB_el("button", "bx-btn" + (k === enz ? " on" : ""), ENZ[k].n);
      b.addEventListener("click", () => { enz = k; [...ec.children].forEach((x) => x.classList.remove("on")); b.classList.add("on"); });
      ec.appendChild(b);
    });
    eg.appendChild(ec); side.appendChild(eg);
    LB_slider(side, "Temperature", 0, 80, 37, 1, (v) => v + " °C", (v) => { temp = v; if (v > 55) denatured = true; });
    LB_slider(side, "pH", 1, 14, 7, 1, (v) => "pH " + v, (v) => { pH = v; });
    LB_slider(side, "Substrate concentration", 0, 100, 50, 1, (v) => v + " mM", (v) => { sub = v; });
    LB_slider(side, "Relative enzyme concentration", .1, 2, 1, .1, (v) => v.toFixed(1) + "×", (v) => { enzymeConcentration = v; });
    const inhibitorLabel = LB_el("label", "bx-grp"); inhibitorLabel.textContent = "Inhibition model";
    const inhibitorSelect = LB_el("select", "ex-select"); inhibitorSelect.setAttribute("aria-label", "Inhibition model");
    [["none", "No inhibitor"],["competitive", "Competitive"],["noncompetitive", "Pure noncompetitive"]].forEach(([value,label]) => { const option = LB_el("option", "", label); option.value = value; inhibitorSelect.appendChild(option); });
    inhibitorSelect.addEventListener("change", () => { inhibitor = inhibitorSelect.value; }); inhibitorLabel.appendChild(inhibitorSelect); side.appendChild(inhibitorLabel);
    LB_slider(side, "Inhibitor concentration", 0, 100, 20, 5, (v) => v + " µM", (v) => { inhibitorConcentration = v; });
    const resetBtn = LB_el("button", "bx-btn", "Fresh enzyme sample");
    // Fresh enzyme goes into whatever buffer is already in the water bath, so if the
    // tube is still above 55 °C it denatures on the way in. Clearing the flag without
    // re-reading the temperature would report a healthy rate for enzyme in hot buffer.
    resetBtn.addEventListener("click", () => { denatured = temp > 55; });
    side.appendChild(resetBtn);
    const readout = LB_el("div", "bx-read"); side.appendChild(readout);
    const note = LB_el("div", "bx-note"); side.appendChild(note);

    function rate() {
      if (denatured) return 0;
      const e = ENZ[enz];
      const tf = Math.exp(-Math.pow(temp - e.t, 2) / 260);      // bell around optimum
      const pf = Math.exp(-Math.pow(pH - e.pH, 2) / 3.2);
      const alpha = 1 + inhibitorConcentration / 20;
      const km = 18 * (inhibitor === "competitive" ? alpha : 1);
      const vmax = 100 * enzymeConcentration / (inhibitor === "noncompetitive" ? alpha : 1);
      return tf * pf * (sub / (km + sub)) * vmax;
    }
    function draw() {
      const { ctx, W, H } = cv; ctx.clearRect(0, 0, W, H);
      const pad = 34, gw = W - pad * 2, gh = H - pad * 2;
      ctx.strokeStyle = LB_css("--line");
      ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, H - pad); ctx.lineTo(W - pad, H - pad); ctx.stroke();
      ctx.fillStyle = LB_css("--faint"); ctx.font = "600 10.5px ui-monospace,monospace";
      ctx.textAlign = "center"; ctx.fillText("temperature (°C)", W / 2, H - 10);
      ctx.textAlign = "left"; ctx.fillText("rate (arbitrary units)", pad + 4, pad - 12);
      ctx.textAlign = "right"; [0,100,200].forEach(v=>ctx.fillText(String(v),pad-5,H-pad-(v/200)*gh+4));
      // rate-vs-temperature curve for the current pH & substrate
      const e = ENZ[enz];
      ctx.strokeStyle = LB_css("--em"); ctx.lineWidth = 2.4; ctx.beginPath();
      for (let x = 0; x <= 80; x++) {
        const tf = Math.exp(-Math.pow(x - e.t, 2) / 260);
        const pf = Math.exp(-Math.pow(pH - e.pH, 2) / 3.2);
        const alpha = 1 + inhibitorConcentration / 20;
        const km = 18 * (inhibitor === "competitive" ? alpha : 1);
        const vmax = 100 * enzymeConcentration / (inhibitor === "noncompetitive" ? alpha : 1);
        const v = (x > 55 ? 0 : tf * pf * (sub / (km + sub)) * vmax);
        const px = pad + (x / 80) * gw, py = H - pad - (v / 200) * gh;
        x ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
      // denature zone — washed and labelled in the theme's own rose, the colour the
      // operating point already turns once the enzyme is cooked. The fixed salmon it
      // used to carry left the 10px label at 1.9:1 on the light theme's paper.
      const rose = LB_css("--rose");
      ctx.globalAlpha = 0.1; ctx.fillStyle = rose;
      ctx.fillRect(pad + (55 / 80) * gw, pad, gw - (55 / 80) * gw, gh);
      ctx.globalAlpha = 1;
      ctx.fillStyle = rose; ctx.font = "600 10px ui-monospace,monospace"; ctx.textAlign = "left";
      ctx.fillText("denaturation", pad + (56 / 80) * gw, pad + 12);
      // current operating point
      const r = rate();
      const mx = pad + (temp / 80) * gw, my = H - pad - (r / 200) * gh;
      ctx.fillStyle = denatured ? LB_css("--rose") : LB_css("--amber");
      ctx.beginPath(); ctx.arc(mx, my, 6, 0, 6.28); ctx.fill();
      readout.innerHTML = `Reaction rate <b>${r.toFixed(1)}</b> arbitrary units${denatured ? " — <b style='color:var(--rose)'>denatured</b>" : ""}`;
      note.textContent = denatured
        ? "This sample crossed the model's illustrative 55 °C irreversible-denaturation threshold. Cooling does not restore its activity here. Actual denaturation depends on the enzyme, exposure time and conditions; use a fresh virtual sample."
        : Math.abs(temp - e.t) < 5 && Math.abs(pH - ENZ[enz].pH) < 1
          ? `Close to ${ENZ[enz].n}'s optimum (${e.t} °C, pH ${ENZ[enz].pH}). Raising substrate now gives diminishing returns — the active sites are saturating.`
          : `${ENZ[enz].n} has an illustrative optimum near ${e.t} °C and pH ${ENZ[enz].pH} in this model.`;
      note.textContent += " Assumptions: Michaelis–Menten response, Km = 18 mM, inhibitor Ki = 20 µM, fixed sample volume. Competitive inhibition raises apparent Km; pure noncompetitive inhibition lowers Vmax. These constants and curves are teaching approximations.";
      raf = requestAnimationFrame(draw);
    }
    draw();
    return { dispose() { cancelAnimationFrame(raf); cv.off(); }, snapshot() { return {variables: {Enzyme:ENZ[enz].n, 'Temperature (°C)':temp, pH, 'Substrate (mM)':sub, 'Relative enzyme concentration':enzymeConcentration, Inhibition:inhibitor, 'Inhibitor (µM)':inhibitorConcentration}, measurements: {'Reaction rate (arbitrary units)':Number(rate().toFixed(3)), 'Active sample':denatured?'Denatured':'Active'}, stage:denatured?'Sample denatured':'Measuring reaction rate'}; } };
  },
});
