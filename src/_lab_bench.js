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
  const upd = () => { o.textContent = fmt(+i.value); on(+i.value); };
  i.addEventListener("input", upd); host.appendChild(g); upd(); return i;
}
function LB_canvas(host, ratio) {
  const c = LB_el("canvas"); host.appendChild(c);
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
  blurb: "Four real specimen slides at 40x to 1000x. Change the objective, hunt for focus, add a stain — the field of view narrows and the scale bar recalculates exactly as it would on the bench.",
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
    const MAGS = [40, 100, 400, 1000];
    let slide = "onion", mag = 100, focus = 50, light = 70, stained = false, raf, t = 0;

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
      const b = LB_el("button", "bx-btn" + (m === mag ? " on" : ""), m + "x");
      b.addEventListener("click", () => {
        mag = m; [...mchips.children].forEach((c) => c.classList.remove("on")); b.classList.add("on"); read();
      });
      mchips.appendChild(b);
    });
    mg.appendChild(mchips); side.appendChild(mg);

    LB_slider(side, "Fine focus", 0, 100, 50, 1, (v) => (Math.abs(v - 50) < 6 ? "sharp" : Math.abs(v - 50) < 20 ? "soft" : "blurred"), (v) => { focus = v; read(); });
    LB_slider(side, "Condenser / light", 20, 100, 70, 1, (v) => v + "%", (v) => { light = v; read(); });

    const stainBtn = LB_el("button", "bx-btn", "Apply stain");
    stainBtn.addEventListener("click", () => {
      stained = !stained; stainBtn.classList.toggle("on", stained);
      stainBtn.textContent = stained ? "Wash off stain" : "Apply stain"; read();
    });
    side.appendChild(stainBtn);
    side.appendChild(readout); side.appendChild(note);

    // real optics: field of view is inversely proportional to magnification.
    function fovMicrons() { return 4000 / (mag / 40); }   // ~4mm field at 40x
    function blur() { return Math.min(9, Math.abs(focus - 50) / 5.2); }

    function read() {
      const s = SLIDES[slide];
      const fov = fovMicrons();
      const resolved = mag >= s.need;
      readout.innerHTML = `Field of view <b>${fov >= 1000 ? (fov / 1000).toFixed(2) + " mm" : Math.round(fov) + " µm"}</b> · `
        + `magnification <b>${mag}x</b> · focus <b>${blur() < 1 ? "sharp" : blur().toFixed(1) + " µm off"}</b>`;
      note.textContent = !resolved
        ? `At ${mag}x this specimen is not resolved — step up the objective to at least ${s.need}x to see its structure.`
        : (s.stain !== "none" && !stained)
          ? `Structure is visible but low-contrast. ${s.stain[0].toUpperCase() + s.stain.slice(1)} would stain it.`
          : `Well resolved. Total magnification is objective x10 eyepiece; the scale bar below is measured, not decorative.`;
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
      if (slide === "onion") drawOnion(ctx, cx, cy, R, zoom, stained);
      else if (slide === "blood") drawBlood(ctx, cx, cy, R, zoom, stained, resolved);
      else if (slide === "stomata") drawStomata(ctx, cx, cy, R, zoom);
      else drawBacteria(ctx, cx, cy, R, zoom, stained, resolved);
      ctx.filter = "none";
      ctx.restore();
      // eyepiece surround + scale bar
      ctx.strokeStyle = "rgba(255,255,255,.14)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.28); ctx.stroke();
      const fov = fovMicrons(), barUm = niceBar(fov / 4);
      const px = (barUm / fov) * (R * 2);
      ctx.strokeStyle = LB_css("--ink"); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - R + 16, cy + R - 18); ctx.lineTo(cx - R + 16 + px, cy + R - 18); ctx.stroke();
      ctx.fillStyle = LB_css("--ink"); ctx.font = "600 12px ui-monospace,monospace"; ctx.textAlign = "left";
      ctx.fillText(barUm >= 1000 ? (barUm / 1000) + " mm" : barUm + " µm", cx - R + 16, cy + R - 26);
      raf = requestAnimationFrame(draw);
    }
    function niceBar(x) { const p = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000]; return p.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a); }

    function drawOnion(ctx, cx, cy, R, z, st) {
      const w = 120 * z, h = 58 * z;
      ctx.lineWidth = Math.max(1, 2 * z);
      ctx.strokeStyle = st ? "rgba(120,70,150,.85)" : "rgba(150,170,175,.55)";
      for (let r = -4; r <= 4; r++) for (let c = -4; c <= 4; c++) {
        const x = cx + c * w + (r % 2 ? w / 2 : 0), y = cy + r * h;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y - h / 2); ctx.lineTo(x + w / 2, y - h / 2);
        ctx.lineTo(x + w / 2, y + h / 2); ctx.lineTo(x - w / 2, y + h / 2); ctx.closePath();
        ctx.stroke();
        if (z >= 1) {   // nuclei resolve from 100x
          ctx.fillStyle = st ? "rgba(90,40,120,.85)" : "rgba(120,140,150,.5)";
          ctx.beginPath(); ctx.arc(x + w * 0.16, y, Math.max(1.5, 5 * z), 0, 6.28); ctx.fill();
        }
      }
    }
    function drawBlood(ctx, cx, cy, R, z, st, resolved) {
      for (let i = 0; i < 90; i++) {
        const a = i * 2.39, r = Math.sqrt(i / 90) * R * 1.1;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        const rad = 7 * z;
        ctx.fillStyle = st ? "rgba(190,70,90,.75)" : "rgba(205,110,110,.55)";
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.28); ctx.fill();
        if (resolved) {  // the biconcave pale centre only resolves at 400x+
          ctx.fillStyle = "rgba(255,250,245,.5)";
          ctx.beginPath(); ctx.arc(x, y, rad * 0.45, 0, 6.28); ctx.fill();
        }
      }
      if (resolved) {   // one white cell with a lobed nucleus
        ctx.fillStyle = st ? "rgba(70,60,170,.85)" : "rgba(150,150,190,.6)";
        ctx.beginPath(); ctx.arc(cx + 20 * z, cy - 14 * z, 12 * z, 0, 6.28); ctx.fill();
        ctx.fillStyle = st ? "rgba(40,30,120,.95)" : "rgba(110,110,160,.8)";
        for (let k = 0; k < 3; k++) {
          ctx.beginPath(); ctx.arc(cx + 20 * z + Math.cos(k * 2) * 5 * z, cy - 14 * z + Math.sin(k * 2) * 5 * z, 5 * z, 0, 6.28); ctx.fill();
        }
      }
    }
    function drawStomata(ctx, cx, cy, R, z) {
      ctx.strokeStyle = "rgba(120,175,130,.5)"; ctx.lineWidth = Math.max(1, 1.6 * z);
      for (let r = -3; r <= 3; r++) for (let c = -3; c <= 3; c++) {
        const x = cx + c * 110 * z + (r % 2 ? 55 * z : 0), y = cy + r * 74 * z;
        ctx.beginPath();
        for (let k = 0; k <= 7; k++) {
          const a = k / 7 * 6.28, rr = 44 * z * (0.8 + Math.sin(k * 2.1) * 0.16);
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
    function drawBacteria(ctx, cx, cy, R, z, st, resolved) {
      const col = st ? "rgba(60,70,170,.9)" : "rgba(150,160,180,.4)";
      ctx.fillStyle = col; ctx.strokeStyle = col;
      for (let i = 0; i < 150; i++) {
        const a = i * 2.39, r = Math.sqrt(i / 150) * R * 1.15;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        const s = resolved ? 1 : 0.4;
        if (i % 3 === 0) { ctx.beginPath(); ctx.arc(x, y, 3.2 * z * s, 0, 6.28); ctx.fill(); }
        else {
          ctx.save(); ctx.translate(x, y); ctx.rotate(a);
          ctx.beginPath(); ctx.ellipse(0, 0, 7 * z * s, 2.6 * z * s, 0, 0, 6.28); ctx.fill(); ctx.restore();
        }
      }
    }
    read(); draw();
    return { dispose() { cancelAnimationFrame(raf); cv.off(); } };
  },
});

/* ======================================================== ELECTROPHORESIS == */
LABS.register("gel-electrophoresis", {
  title: "Gel Electrophoresis", tag: "Molecular", color: "var(--indigo)",
  icon: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 6v2M12 6v2M16 6v2M8 12h1M12 14h1M16 11h1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  blurb: "Load a real agarose gel, set the voltage and run it. Small fragments race ahead, migration falls off logarithmically with size — then read an unknown off the ladder.",
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
    let volts = 90, minutes = 0, running = false, raf, loaded = false;

    LB_slider(side, "Voltage", 40, 150, 90, 5, (v) => v + " V", (v) => { volts = v; });
    const loadBtn = LB_el("button", "bx-btn pri", "Load the wells");
    const runBtn = LB_el("button", "bx-btn", "Run the gel"); runBtn.disabled = true;
    const resetBtn = LB_el("button", "bx-btn", "Reset");
    const row = LB_el("div", "bx-chips"); row.appendChild(loadBtn); row.appendChild(runBtn); row.appendChild(resetBtn);
    side.appendChild(row);
    const readout = LB_el("div", "bx-read"); side.appendChild(readout);
    const guessWrap = LB_el("div", "bx-grp"); side.appendChild(guessWrap);
    const verdict = LB_el("div", "bx-verdict"); verdict.style.display = "none"; side.appendChild(verdict);

    loadBtn.addEventListener("click", () => { loaded = true; runBtn.disabled = false; loadBtn.disabled = true; upd(); });
    runBtn.addEventListener("click", () => { running = !running; runBtn.textContent = running ? "Pause" : "Run the gel"; });
    resetBtn.addEventListener("click", () => {
      minutes = 0; running = false; loaded = false; loadBtn.disabled = false;
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

    // real physics: distance ∝ voltage × time × log-inverse of fragment size
    function migration(bp) {
      const mobility = 1 / Math.log10(bp);          // small fragments move further
      return Math.min(1, (volts / 100) * (minutes / 60) * mobility * 1.55);
    }
    function upd() {
      readout.innerHTML = !loaded
        ? "Wells empty. Load the samples to begin."
        : `Running at <b>${volts} V</b> for <b>${minutes.toFixed(0)} min</b>. ${minutes < 8 ? "Bands are still in the wells." : minutes > 55 ? "Careful — the smallest fragments are running off the end." : "Bands separating."}`;
    }
    function draw() {
      if (running) { minutes += 0.25; if (minutes > 90) { minutes = 90; running = false; runBtn.textContent = "Run the gel"; } upd(); }
      const { ctx, W, H } = cv; ctx.clearRect(0, 0, W, H);
      const padX = 26, padTop = 30, gelH = H - padTop - 24, laneW = (W - padX * 2) / LANES.length;
      // gel slab
      ctx.fillStyle = "rgba(120,150,170,.10)";
      ctx.fillRect(padX, padTop, W - padX * 2, gelH);
      ctx.strokeStyle = "rgba(255,255,255,.10)"; ctx.strokeRect(padX, padTop, W - padX * 2, gelH);
      ctx.fillStyle = LB_css("--faint"); ctx.font = "600 11px ui-monospace,monospace"; ctx.textAlign = "center";
      ctx.fillText("− cathode", W / 2, 16);
      ctx.fillText("+ anode", W / 2, H - 8);
      LANES.forEach((L, i) => {
        const x = padX + laneW * i + laneW / 2;
        ctx.fillStyle = "rgba(255,255,255,.16)";
        ctx.fillRect(x - laneW * 0.3, padTop + 4, laneW * 0.6, 7);      // the well
        ctx.fillStyle = LB_css("--dim"); ctx.font = "600 11px Inter,sans-serif";
        ctx.fillText(L.n, x, padTop - 8);
        if (!loaded) return;
        L.frags.forEach((bp) => {
          const y = padTop + 12 + migration(bp) * (gelH - 26);
          const int = L.fixed ? 0.5 : 0.85;
          ctx.fillStyle = `rgba(${L.fixed ? "150,170,255" : "120,255,210"},${int})`;
          ctx.shadowColor = L.fixed ? "rgba(150,170,255,.8)" : "rgba(120,255,210,.8)";
          ctx.shadowBlur = 8;
          ctx.fillRect(x - laneW * 0.3, y, laneW * 0.6, 5);
          ctx.shadowBlur = 0;
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
    return { dispose() { cancelAnimationFrame(raf); cv.off(); } };
  },
});

/* ========================================================== PREDATOR-PREY == */
LABS.register("predator-prey", {
  title: "Predator & Prey", tag: "Ecology", color: "var(--amber)",
  icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 17c3-6 6 2 9-4s6 3 9-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="6" cy="7" r="1.6" fill="currentColor"/><circle cx="17" cy="15" r="1.6" fill="currentColor"/></svg>',
  blurb: "The Lotka–Volterra cycle, running live. Push the birth and predation rates and watch the two populations chase each other — the predator peak always lagging the prey peak.",
  build(host) {
    const wrap = LB_el("div", "bx"); host.appendChild(wrap);
    const view = LB_el("div", "bx-view"); const side = LB_el("div", "bx-side");
    wrap.appendChild(view); wrap.appendChild(side);
    const cv = LB_canvas(view, 0.62);

    let a = 0.9, b = 0.9, c = 0.6, d = 0.9;   // prey birth, predation, pred death, conversion
    let prey = 40, pred = 9, raf, hist = [], t = 0;
    LB_slider(side, "Prey birth rate", 20, 200, 90, 5, (v) => (v / 100).toFixed(2), (v) => { a = v / 100; });
    LB_slider(side, "Predation rate", 20, 200, 90, 5, (v) => (v / 100).toFixed(2), (v) => { b = v / 100; });
    LB_slider(side, "Predator death rate", 20, 200, 60, 5, (v) => (v / 100).toFixed(2), (v) => { c = v / 100; });
    const resetBtn = LB_el("button", "bx-btn", "Reset populations");
    resetBtn.addEventListener("click", () => { prey = 40; pred = 9; hist = []; });
    side.appendChild(resetBtn);
    const readout = LB_el("div", "bx-read"); side.appendChild(readout);
    const note = LB_el("div", "bx-note",
      "Prey grow when predators are scarce; predators grow only after prey are plentiful, so their peak always lags. That lag is why the two curves are permanently out of phase — the classic Lotka–Volterra oscillation.");
    side.appendChild(note);

    function step(dt) {
      // dPrey/dt = a·N − b·N·P ; dPred/dt = d·b·N·P − c·P
      const dN = (a * prey - b * prey * pred * 0.02) * dt;
      const dP = (d * b * prey * pred * 0.02 * 0.35 - c * pred) * dt;
      prey = Math.max(0.4, Math.min(400, prey + dN));
      pred = Math.max(0.2, Math.min(400, pred + dP));
      hist.push([prey, pred]); if (hist.length > 460) hist.shift();
    }
    function draw() {
      if (!LB_REDUCED) { for (let i = 0; i < 3; i++) step(0.016); t += 0.016; } else step(0.05);
      const { ctx, W, H } = cv; ctx.clearRect(0, 0, W, H);
      const pad = 30, gw = W - pad * 2, gh = H - pad * 2;
      ctx.strokeStyle = "rgba(255,255,255,.10)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, H - pad); ctx.lineTo(W - pad, H - pad); ctx.stroke();
      const maxV = Math.max(60, ...hist.map((h) => Math.max(h[0], h[1])));
      function series(idx, col) {
        ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath();
        hist.forEach((h, i) => {
          const x = pad + (i / 460) * gw, y = H - pad - (h[idx] / maxV) * gh;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      }
      series(0, LB_css("--em")); series(1, LB_css("--rose"));
      ctx.font = "600 11px ui-monospace,monospace"; ctx.textAlign = "left";
      ctx.fillStyle = LB_css("--em"); ctx.fillText("prey", pad + 6, pad + 4);
      ctx.fillStyle = LB_css("--rose"); ctx.fillText("predators", pad + 50, pad + 4);
      readout.innerHTML = `Prey <b>${prey.toFixed(0)}</b> · Predators <b>${pred.toFixed(0)}</b>`;
      raf = requestAnimationFrame(draw);
    }
    draw();
    return { dispose() { cancelAnimationFrame(raf); cv.off(); } };
  },
});

/* ========================================================= ENZYME KINETICS = */
LABS.register("enzyme-kinetics", {
  title: "Enzyme Kinetics", tag: "Molecular", color: "var(--em)",
  icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 18c4 0 4-9 8-9s4 6 8 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="7" cy="9" r="1.6" fill="currentColor"/></svg>',
  blurb: "Drive a real enzyme with temperature, pH and substrate. Find its optimum — then cook it past 55 °C and watch the denaturation refuse to reverse, exactly as broken tertiary structure does.",
  build(host) {
    const wrap = LB_el("div", "bx"); host.appendChild(wrap);
    const view = LB_el("div", "bx-view"); const side = LB_el("div", "bx-side");
    wrap.appendChild(view); wrap.appendChild(side);
    const cv = LB_canvas(view, 0.62);

    const ENZ = { pepsin: { n: "Pepsin", pH: 2, t: 37 }, amylase: { n: "Amylase", pH: 7, t: 37 }, trypsin: { n: "Trypsin", pH: 8, t: 37 } };
    let enz = "amylase", temp = 37, pH = 7, sub = 50, denatured = false, raf;

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
    const resetBtn = LB_el("button", "bx-btn", "Fresh enzyme sample");
    resetBtn.addEventListener("click", () => { denatured = false; });
    side.appendChild(resetBtn);
    const readout = LB_el("div", "bx-read"); side.appendChild(readout);
    const note = LB_el("div", "bx-note"); side.appendChild(note);

    function rate() {
      if (denatured) return 0;
      const e = ENZ[enz];
      const tf = Math.exp(-Math.pow(temp - e.t, 2) / 260);      // bell around optimum
      const pf = Math.exp(-Math.pow(pH - e.pH, 2) / 3.2);
      const sf = sub / (18 + sub);                               // Michaelis–Menten
      return tf * pf * sf * 100;
    }
    function draw() {
      const { ctx, W, H } = cv; ctx.clearRect(0, 0, W, H);
      const pad = 34, gw = W - pad * 2, gh = H - pad * 2;
      ctx.strokeStyle = "rgba(255,255,255,.10)";
      ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, H - pad); ctx.lineTo(W - pad, H - pad); ctx.stroke();
      ctx.fillStyle = LB_css("--faint"); ctx.font = "600 10.5px ui-monospace,monospace";
      ctx.textAlign = "center"; ctx.fillText("temperature (°C)", W / 2, H - 10);
      // rate-vs-temperature curve for the current pH & substrate
      const e = ENZ[enz];
      ctx.strokeStyle = LB_css("--em"); ctx.lineWidth = 2.4; ctx.beginPath();
      for (let x = 0; x <= 80; x++) {
        const tf = Math.exp(-Math.pow(x - e.t, 2) / 260);
        const pf = Math.exp(-Math.pow(pH - e.pH, 2) / 3.2);
        const v = (x > 55 ? 0 : tf * pf * (sub / (18 + sub)) * 100);
        const px = pad + (x / 80) * gw, py = H - pad - (v / 100) * gh;
        x ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
      // denature zone
      ctx.fillStyle = "rgba(232,115,94,.10)";
      ctx.fillRect(pad + (55 / 80) * gw, pad, gw - (55 / 80) * gw, gh);
      ctx.fillStyle = "rgba(232,115,94,.75)"; ctx.font = "600 10px ui-monospace,monospace"; ctx.textAlign = "left";
      ctx.fillText("denaturation", pad + (56 / 80) * gw, pad + 12);
      // current operating point
      const r = rate();
      const mx = pad + (temp / 80) * gw, my = H - pad - (r / 100) * gh;
      ctx.fillStyle = denatured ? LB_css("--rose") : LB_css("--amber");
      ctx.beginPath(); ctx.arc(mx, my, 6, 0, 6.28); ctx.fill();
      readout.innerHTML = `Reaction rate <b>${r.toFixed(1)}</b> arbitrary units${denatured ? " — <b style='color:var(--rose)'>denatured</b>" : ""}`;
      note.textContent = denatured
        ? "Above ~55 °C the hydrogen and ionic bonds holding the tertiary structure gave way. The active site's shape is gone — and cooling it back down does NOT restore it. Take a fresh sample."
        : Math.abs(temp - e.t) < 5 && Math.abs(pH - ENZ[enz].pH) < 1
          ? `Close to ${ENZ[enz].n}'s optimum (${e.t} °C, pH ${ENZ[enz].pH}). Raising substrate now gives diminishing returns — the active sites are saturating.`
          : `${ENZ[enz].n} works best near ${e.t} °C and pH ${ENZ[enz].pH}. Away from that, fewer collisions have the right energy and geometry.`;
      raf = requestAnimationFrame(draw);
    }
    draw();
    return { dispose() { cancelAnimationFrame(raf); cv.off(); } };
  },
});
