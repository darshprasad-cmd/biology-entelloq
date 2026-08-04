/* ============================================================================
   Biology Entelloq — ECOLOGY & EVOLUTION benches.

   Two working benches live in this module:
     • predator-prey     — Lotka–Volterra, integrated live with RK4, time series
                           + phase portrait + nullclines, measured period and
                           measured peak lag (the quarter-cycle result).
     • natural-selection — a real diploid one-locus population: random mating,
                           Hardy–Weinberg at birth, camouflage-weighted predation,
                           mutation, and a live allele-frequency trace.

   Plain browser JS. No imports, no build step, no network, no assets.
   Colour comes only from the shared design tokens so both themes work.
   ========================================================================== */
(function () {
  "use strict";

  /* ── shared kit ─────────────────────────────────────────────────────────── */

  const MQ = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const reduced = () => !!(MQ && MQ.matches);

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  /** Accepts "#abc", "#aabbcc", "rgb(…)", "rgba(…)" — custom properties come
      back as their raw token text, so both forms really do turn up. */
  function parseColor(s) {
    s = String(s || "").trim();
    if (s.charAt(0) === "#") {
      let h = s.slice(1);
      if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
      const n = parseInt(h.slice(0, 6), 16);
      if (!isFinite(n)) return [128, 128, 128];
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = s.match(/-?[\d.]+/g);
    if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
    return [128, 128, 128];
  }
  const rgba = (c, a) => "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";
  const solid = (c) => "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")";
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const lumOf = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

  const TOKENS = ["--em", "--cy", "--indigo", "--amber", "--rose", "--ink", "--dim", "--faint", "--line", "--panel", "--bg-2"];
  function palette(el) {
    const cs = getComputedStyle(el);
    const p = {};
    for (const t of TOKENS) p[t.replace(/^--/, "").replace("-", "")] = parseColor(cs.getPropertyValue(t));
    return p; // .em .cy .indigo .amber .rose .ink .dim .faint .line .panel .bg2
  }

  /** Size a canvas to its CSS box at device resolution. Returns null if hidden. */
  function fit(cv) {
    const r = cv.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (w < 8 || h < 8) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  function niceStep(range, target) {
    const raw = range / Math.max(1, target);
    const mag = Math.pow(10, Math.floor(Math.log10(raw <= 0 ? 1 : raw)));
    const n = raw / mag;
    const s = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
    return s * mag;
  }

  const MONO = '11px ui-monospace,"SF Mono",Menlo,Consolas,monospace';

  function injectStyle(id, text) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      el.textContent = text;
      document.head.appendChild(el);
    }
    return el;
  }

  function sliderRow(id, label, min, max, step, val) {
    return '<div class="bx-grp"><label for="' + id + '">' + label + '</label>' +
      '<div class="bx-row"><input class="bx-slider" id="' + id + '" type="range" min="' + min +
      '" max="' + max + '" step="' + step + '" value="' + val + '"><span class="bx-val" id="' + id + 'v"></span></div></div>';
  }

  /* ========================================================================
     LAB 1 — PREDATOR & PREY  (Lotka–Volterra)
     ====================================================================== */

  const PP_CSS = `
.pp-wrap{padding:14px}
.pp-grid{display:grid;grid-template-columns:1.45fr 1fr;gap:14px}
@media (max-width:760px){.pp-grid{grid-template-columns:1fr}}
.pp-cell{display:flex;flex-direction:column;gap:7px;min-width:0}
.pp-cap{display:flex;align-items:center;gap:9px;flex-wrap:wrap;font-family:var(--mono);font-size:10.5px;
  letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
.pp-k{display:inline-flex;align-items:center;gap:6px;color:var(--dim)}
.pp-k i{width:16px;height:3px;border-radius:2px;background:var(--c);display:inline-block;font-style:normal}
.pp-cap .sp{margin-left:auto}
.pp-cap b{color:var(--ink);font-weight:600;letter-spacing:.06em}
.pp-cv{width:100%;aspect-ratio:16/8;background:color-mix(in srgb,var(--ink) 3%,transparent);
  border:1px solid var(--line);border-radius:12px}
.pp-cv.sq{aspect-ratio:1/.86}
@media (max-width:760px){.pp-cv{aspect-ratio:16/9}.pp-cv.sq{aspect-ratio:1/.9}}
.pp-side .bx-grp.off{opacity:.42}
.pp-eq{display:grid;grid-template-columns:1fr;gap:4px;font-family:var(--mono);font-size:12px;color:var(--dim);
  border-left:2px solid color-mix(in srgb,var(--lc,var(--em)) 55%,transparent);padding-left:11px;margin:2px 0}
.pp-eq b{color:var(--ink);font-weight:600}
.pp-lagbar{height:8px;border-radius:5px;background:color-mix(in srgb,var(--ink) 8%,transparent);position:relative;overflow:hidden;margin-top:7px}
.pp-lagbar i{position:absolute;inset:0 auto 0 0;border-radius:5px;background:var(--grad-life);width:0%;transition:width .4s var(--ease-out)}
.pp-lagbar u{position:absolute;top:-3px;bottom:-3px;width:2px;left:25%;background:var(--indigo);text-decoration:none}
`;

  const PP_PRESETS = {
    lynx:   { a: 0.55, b: 0.092, g: 0.84, e: 0.23, N0: 60, P0: 4,  K: 150, useK: false },
    fast:   { a: 1.10, b: 0.120, g: 1.10, e: 0.30, N0: 40, P0: 6,  K: 150, useK: false },
    fragile:{ a: 0.35, b: 0.150, g: 0.45, e: 0.30, N0: 30, P0: 9,  K: 150, useK: false },
    damped: { a: 0.55, b: 0.092, g: 0.84, e: 0.23, N0: 60, P0: 4,  K: 120, useK: true  }
  };

  LABS.register("predator-prey", {
    title: "Predator & Prey",
    tag: "Population ecology",
    color: "#fb7185",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M3 15c2.6 0 3.2-8 5.6-8S11 17 13.6 17s3-10 5.4-10"/><circle cx="19" cy="7" r="1.4"/></svg>',
    blurb: "Run the Lotka–Volterra equations live. Push the birth rate, the attack rate, the death rate — watch hares and lynx chase each other round a loop, and find out exactly why the predator peak always arrives a quarter-cycle late.",

    build(host) {
      const styleEl = injectStyle("pp-lab-css", PP_CSS);

      host.innerHTML =
        '<div class="bx pp-wrap">' +
          '<div class="bx-view" style="min-height:0;background:transparent;border:0;overflow:visible">' +
            '<div class="pp-grid">' +
              '<div class="pp-cell">' +
                '<div class="pp-cap">' +
                  '<span class="pp-k" style="--c:var(--em)"><i></i>Hare (prey)</span>' +
                  '<span class="pp-k" style="--c:var(--rose)"><i></i>Lynx (predator)</span>' +
                  '<span class="sp"></span><b id="ppClock">t = 0.0 yr</b>' +
                '</div>' +
                '<canvas class="pp-cv" id="ppChart" role="img" aria-label="Time series of prey and predator populations"></canvas>' +
              '</div>' +
              '<div class="pp-cell">' +
                '<div class="pp-cap">Phase space<span class="sp"></span><b>predator vs prey</b></div>' +
                '<canvas class="pp-cv sq" id="ppPhase" role="img" aria-label="Phase space trajectory of predator against prey"></canvas>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="bx-side pp-side">' +
            '<div class="bx-grp"><span class="bx-lbl">Scenario</span>' +
              '<div class="bx-chips">' +
                '<button class="bx-btn on" data-pre="lynx">Hare &amp; lynx</button>' +
                '<button class="bx-btn" data-pre="fast">Fast cycles</button>' +
                '<button class="bx-btn" data-pre="fragile">Fragile</button>' +
                '<button class="bx-btn" data-pre="damped">With a food limit</button>' +
              '</div></div>' +

            sliderRow("ppA", "Prey birth rate &alpha; (per year)", 0.1, 1.5, 0.01, 0.55) +
            sliderRow("ppB", "Attack rate &beta; (per predator-unit·yr)", 0.01, 0.25, 0.001, 0.092) +
            sliderRow("ppG", "Predator death rate &gamma; (per year)", 0.1, 1.5, 0.01, 0.84) +
            sliderRow("ppE", "Conversion efficiency &epsilon;", 0.05, 0.6, 0.005, 0.23) +
            sliderRow("ppN", "Starting prey N&#8320; (thousands)", 2, 140, 1, 60) +
            sliderRow("ppP", "Starting predators P&#8320; (thousands)", 0.5, 24, 0.1, 4) +

            '<div class="bx-grp"><span class="bx-lbl">Prey food limit</span>' +
              '<div class="bx-chips"><button class="bx-btn" id="ppK" aria-pressed="false">Carrying capacity off</button></div></div>' +
            '<div class="bx-grp off" id="ppKg">' +
              '<label for="ppKv2">Carrying capacity K (thousands)</label>' +
              '<div class="bx-row"><input class="bx-slider" id="ppKv2" type="range" min="30" max="400" step="5" value="150" disabled><span class="bx-val" id="ppKv2v"></span></div></div>' +

            '<div class="bx-grp"><span class="bx-lbl">Bench controls</span>' +
              '<div class="bx-chips">' +
                '<button class="bx-btn pri" id="ppRun">Run</button>' +
                '<button class="bx-btn" id="ppReset">Reset</button>' +
                '<button class="bx-btn" id="ppCull">Cull 70% of prey</button>' +
                '<button class="bx-btn" id="ppDis">Predator disease &minus;80%</button>' +
              '</div></div>' +

            '<div class="bx-read" id="ppRead"></div>' +

            '<div class="bx-grp"><span class="bx-lbl">Why the predator peak is late</span>' +
              '<div class="pp-eq" id="ppLag"></div>' +
              '<div class="pp-lagbar" aria-hidden="true"><i id="ppLagFill"></i><u title="quarter cycle"></u></div>' +
              '<div class="bx-note">The indigo mark is a quarter of a cycle — where linear theory says the predator peak should land.</div>' +
            '</div>' +

            '<div class="bx-verdict" id="ppVerdict" aria-live="polite"></div>' +

            '<div class="bx-note"><b>What this shows.</b> Prey grow on their own (&alpha;N) and are eaten at a rate set by how often the two meet (&beta;NP). Predators can only be built out of prey they have already caught (&epsilon;&beta;NP) and die at a constant rate (&gamma;P). ' +
            'That one-way dependence is the whole story: <b>predator numbers respond to prey numbers that existed a while ago</b>, because eating has to be converted into surviving offspring before it shows up in the census. So predators keep rising while prey are already falling, and only turn over once prey have dropped below N* = &gamma;/&epsilon;&beta; — a quarter of a cycle behind. ' +
            'Without a food limit the orbits are neutrally stable: every knock puts the system on a wider loop forever, and a wide enough loop takes the trough below a handful of animals, which in a real forest means gone.</div>' +
          '</div>' +
        '</div>';

      const $ = (s) => host.querySelector(s);
      const chartCv = $("#ppChart"), phaseCv = $("#ppPhase");
      const readEl = $("#ppRead"), verdictEl = $("#ppVerdict"), lagEl = $("#ppLag"), lagFill = $("#ppLagFill");
      const clockEl = $("#ppClock"), runBtn = $("#ppRun");
      const sA = $("#ppA"), sB = $("#ppB"), sG = $("#ppG"), sE = $("#ppE"), sN = $("#ppN"), sP = $("#ppP"), sK = $("#ppKv2");
      const kBtn = $("#ppK"), kGrp = $("#ppKg");

      let pal = palette(host);
      let palAge = 0;

      const q = { alpha: 0.55, beta: 0.092, gamma: 0.84, eps: 0.23, K: 150, useK: false };
      const VIEW_W = 42;          // years visible in the time chart
      const DT = 0.004;           // integration step, years
      const SAMPLE = 0.03;        // history sample interval, years
      const EXT = 0.02;           // extinction floor (thousands = 20 animals)
      const SPEED = reduced() ? 1.6 : 3.2; // simulated years per real second

      const sim = {
        t: 0, N: 60, P: 4, hist: [], phase: [], nextSample: 0,
        running: false, dead: null, culled: 0,
        peakN: null, peakP: null, prevPeakN: null,
        minN: null, minP: null, lag: null, period: null,
        nMax: 0, nMin: Infinity, pMax: 0, pMin: Infinity
      };

      /* ── the model ──────────────────────────────────────────────────────── */
      function deriv(N, P) {
        const growth = q.useK ? q.alpha * N * (1 - N / q.K) : q.alpha * N;
        const kill = q.beta * N * P;
        return [growth - kill, q.eps * kill - q.gamma * P];
      }
      function step(dt) {
        const N = sim.N, P = sim.P;
        const d1 = deriv(N, P);
        const d2 = deriv(N + d1[0] * dt / 2, P + d1[1] * dt / 2);
        const d3 = deriv(N + d2[0] * dt / 2, P + d2[1] * dt / 2);
        const d4 = deriv(N + d3[0] * dt, P + d3[1] * dt);
        let nN = N + dt * (d1[0] + 2 * d2[0] + 2 * d3[0] + d4[0]) / 6;
        let nP = P + dt * (d1[1] + 2 * d2[1] + 2 * d3[1] + d4[1]) / 6;
        if (!isFinite(nN) || nN > 5000) nN = 5000;
        if (!isFinite(nP) || nP > 5000) nP = 5000;
        sim.N = nN < 0 ? 0 : nN;
        sim.P = nP < 0 ? 0 : nP;
        if (sim.P > 0 && sim.P < EXT) { sim.P = 0; if (!sim.dead) sim.dead = { who: "predator", t: sim.t }; }
        if (sim.N > 0 && sim.N < EXT) { sim.N = 0; if (!sim.dead || sim.dead.who !== "prey") sim.dead = { who: "prey", t: sim.t }; }
        sim.t += dt;
      }

      function equilibrium() {
        const Ns = q.gamma / (q.eps * q.beta);
        let Ps = q.alpha / q.beta;
        if (q.useK) Ps = (q.alpha / q.beta) * (1 - Ns / q.K);
        return { Ns: Ns, Ps: Ps };
      }
      const theoryPeriod = () => (2 * Math.PI) / Math.sqrt(q.alpha * q.gamma);

      /* ── history + peak finding (this is how the lag is *measured*) ─────── */
      function record() {
        sim.hist.push({ t: sim.t, N: sim.N, P: sim.P });
        sim.phase.push({ N: sim.N, P: sim.P });
        if (sim.phase.length > 1600) sim.phase.shift();
        while (sim.hist.length > 3 && sim.hist[0].t < sim.t - VIEW_W - 2) sim.hist.shift();

        if (sim.N > sim.nMax) sim.nMax = sim.N;
        if (sim.N < sim.nMin) sim.nMin = sim.N;
        if (sim.P > sim.pMax) sim.pMax = sim.P;
        if (sim.P < sim.pMin) sim.pMin = sim.P;

        const n = sim.hist.length;
        if (n < 3) return;
        const a = sim.hist[n - 3], b = sim.hist[n - 2], c = sim.hist[n - 1];

        // prey: troughs then peaks, each peak must clear the last trough by 3%
        if (b.N < a.N && b.N < c.N) sim.minN = b.N;
        if (b.N > a.N && b.N > c.N && sim.minN != null && b.N > sim.minN * 1.03) {
          sim.prevPeakN = sim.peakN;
          sim.peakN = { t: b.t, v: b.N };
          if (sim.prevPeakN) sim.period = sim.peakN.t - sim.prevPeakN.t;
        }
        if (b.P < a.P && b.P < c.P) sim.minP = b.P;
        if (b.P > a.P && b.P > c.P && sim.minP != null && b.P > sim.minP * 1.03) {
          sim.peakP = { t: b.t, v: b.P };
          if (sim.peakN && sim.peakP.t > sim.peakN.t) {
            const d = sim.peakP.t - sim.peakN.t;
            if (d > 0 && d < theoryPeriod() * 2.5) sim.lag = d;
          }
        }
      }

      function reset(keepParams) {
        sim.t = 0;
        sim.N = +sN.value;
        sim.P = +sP.value;
        sim.hist.length = 0; sim.phase.length = 0;
        sim.nextSample = 0; sim.dead = null; sim.culled = 0;
        sim.peakN = sim.peakP = sim.prevPeakN = null;
        sim.minN = sim.minP = null;
        sim.lag = null; sim.period = null;
        sim.nMax = 0; sim.nMin = Infinity; sim.pMax = 0; sim.pMin = Infinity;
        record();
        if (!keepParams) { /* nothing extra */ }
        draw(); readout();
      }

      /* ── drawing ────────────────────────────────────────────────────────── */
      function drawChart() {
        const f = fit(chartCv); if (!f) return;
        const ctx = f.ctx, w = f.w, h = f.h;
        ctx.clearRect(0, 0, w, h);
        const padL = 44, padR = 56, padT = 12, padB = 24;
        const iw = w - padL - padR, ih = h - padT - padB;
        if (iw < 40 || ih < 30) return;

        let t0, t1;
        if (sim.t <= VIEW_W) { t0 = 0; t1 = VIEW_W; } else { t1 = sim.t; t0 = t1 - VIEW_W; }
        let ymax = 1;
        for (let i = 0; i < sim.hist.length; i++) {
          const s = sim.hist[i];
          if (s.t < t0 - 0.2) continue;
          if (s.N > ymax) ymax = s.N;
          if (s.P > ymax) ymax = s.P;
        }
        const eq = equilibrium();
        if (isFinite(eq.Ns) && eq.Ns > 0 && eq.Ns < 400) ymax = Math.max(ymax, eq.Ns);
        ymax = Math.max(ymax * 1.14, 4);

        const X = (t) => padL + ((t - t0) / (t1 - t0)) * iw;
        const Y = (v) => padT + ih - (clamp(v, 0, ymax) / ymax) * ih;

        // grid + axes
        ctx.font = MONO; ctx.textBaseline = "middle";
        const ys = niceStep(ymax, 4);
        ctx.lineWidth = 1;
        for (let v = 0; v <= ymax + 1e-9; v += ys) {
          const y = Math.round(Y(v)) + 0.5;
          ctx.strokeStyle = rgba(pal.line, v === 0 ? 0.9 : 0.5);
          ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + iw, y); ctx.stroke();
          ctx.fillStyle = rgba(pal.faint, 0.95); ctx.textAlign = "right";
          ctx.fillText(v >= 10 ? v.toFixed(0) : v.toFixed(1), padL - 8, y);
        }
        const ts = niceStep(t1 - t0, 6);
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        for (let t = Math.ceil(t0 / ts) * ts; t <= t1 + 1e-9; t += ts) {
          const x = Math.round(X(t)) + 0.5;
          ctx.strokeStyle = rgba(pal.line, 0.35);
          ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + ih); ctx.stroke();
          ctx.fillStyle = rgba(pal.faint, 0.95);
          ctx.fillText(t.toFixed(0), x, padT + ih + 6);
        }
        ctx.textAlign = "left";
        ctx.fillStyle = rgba(pal.faint, 0.8);
        ctx.fillText("years", padL + iw - 26, padT + ih + 6);

        // equilibrium guides
        if (!sim.dead && isFinite(eq.Ns) && eq.Ns > 0 && eq.Ns <= ymax) {
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = rgba(pal.em, 0.45);
          ctx.beginPath(); ctx.moveTo(padL, Y(eq.Ns)); ctx.lineTo(padL + iw, Y(eq.Ns)); ctx.stroke();
          if (eq.Ps > 0 && eq.Ps <= ymax) {
            ctx.strokeStyle = rgba(pal.rose, 0.45);
            ctx.beginPath(); ctx.moveTo(padL, Y(eq.Ps)); ctx.lineTo(padL + iw, Y(eq.Ps)); ctx.stroke();
          }
          ctx.setLineDash([]);
        }

        // series
        function series(key, col, fillIt) {
          ctx.beginPath();
          let started = false, lastX = padL;
          for (let i = 0; i < sim.hist.length; i++) {
            const s = sim.hist[i];
            if (s.t < t0 - 0.2) continue;
            const x = X(s.t), y = Y(s[key]);
            if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
            lastX = x;
          }
          if (!started) return;
          if (fillIt) {
            ctx.save();
            ctx.lineTo(lastX, padT + ih); ctx.lineTo(X(Math.max(t0, sim.hist[0].t)), padT + ih); ctx.closePath();
            const g = ctx.createLinearGradient(0, padT, 0, padT + ih);
            g.addColorStop(0, rgba(col, 0.20)); g.addColorStop(1, rgba(col, 0));
            ctx.fillStyle = g; ctx.fill();
            ctx.restore();
            ctx.beginPath(); started = false;
            for (let i = 0; i < sim.hist.length; i++) {
              const s = sim.hist[i];
              if (s.t < t0 - 0.2) continue;
              const x = X(s.t), y = Y(s[key]);
              if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
            }
          }
          ctx.strokeStyle = solid(col); ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.lineCap = "round";
          ctx.stroke();
          // head dot + right-edge label
          const last = sim.hist[sim.hist.length - 1];
          const hx = X(last.t), hy = Y(last[key]);
          ctx.fillStyle = solid(col);
          ctx.beginPath(); ctx.arc(hx, hy, 3.2, 0, 6.2832); ctx.fill();
          ctx.font = MONO; ctx.textBaseline = "middle"; ctx.textAlign = "left";
          ctx.fillText(last[key].toFixed(1), Math.min(hx + 7, w - padR + 4), clamp(hy, padT + 6, padT + ih - 6));
        }
        series("N", pal.em, true);
        series("P", pal.rose, false);

        // peak markers — show the lag right on the chart
        if (sim.peakN && sim.peakP && sim.lag != null && sim.peakN.t >= t0 && sim.peakP.t <= t1) {
          const x1 = X(sim.peakN.t), x2 = X(sim.peakP.t), yb = padT + 10;
          ctx.strokeStyle = rgba(pal.indigo, 0.75); ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(x1, yb); ctx.lineTo(x2, yb); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x1, yb - 4); ctx.lineTo(x1, yb + 4);
          ctx.moveTo(x2, yb - 4); ctx.lineTo(x2, yb + 4); ctx.stroke();
          ctx.fillStyle = rgba(pal.indigo, 0.95); ctx.textAlign = "center"; ctx.textBaseline = "bottom";
          ctx.fillText("lag " + sim.lag.toFixed(1) + " yr", (x1 + x2) / 2, yb - 4);
        }
      }

      function drawPhase() {
        const f = fit(phaseCv); if (!f) return;
        const ctx = f.ctx, w = f.w, h = f.h;
        ctx.clearRect(0, 0, w, h);
        const padL = 38, padR = 12, padT = 12, padB = 26;
        const iw = w - padL - padR, ih = h - padT - padB;
        if (iw < 30 || ih < 30) return;

        const eq = equilibrium();
        let nMax = 4, pMax = 2;
        for (let i = 0; i < sim.phase.length; i++) {
          if (sim.phase[i].N > nMax) nMax = sim.phase[i].N;
          if (sim.phase[i].P > pMax) pMax = sim.phase[i].P;
        }
        if (isFinite(eq.Ns) && eq.Ns > 0 && eq.Ns < 1000) nMax = Math.max(nMax, eq.Ns);
        if (isFinite(eq.Ps) && eq.Ps > 0 && eq.Ps < 1000) pMax = Math.max(pMax, eq.Ps);
        nMax *= 1.16; pMax *= 1.16;

        const X = (n) => padL + clamp(n / nMax, 0, 1) * iw;
        const Y = (p) => padT + ih - clamp(p / pMax, 0, 1) * ih;

        ctx.font = MONO; ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(pal.line, 0.9);
        ctx.beginPath();
        ctx.moveTo(padL + .5, padT); ctx.lineTo(padL + .5, padT + ih + .5); ctx.lineTo(padL + iw, padT + ih + .5);
        ctx.stroke();
        ctx.fillStyle = rgba(pal.faint, 0.95);
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText("prey N →", padL + iw / 2, padT + ih + 8);
        ctx.save();
        ctx.translate(11, padT + ih / 2); ctx.rotate(-Math.PI / 2);
        ctx.textBaseline = "middle"; ctx.fillText("predators P →", 0, 0);
        ctx.restore();

        // nullclines: where each species stops changing
        ctx.setLineDash([4, 4]); ctx.lineWidth = 1.4;
        if (eq.Ns > 0 && eq.Ns < nMax) {
          ctx.strokeStyle = rgba(pal.rose, 0.6);           // dP/dt = 0  →  N = γ/εβ
          ctx.beginPath(); ctx.moveTo(X(eq.Ns), padT); ctx.lineTo(X(eq.Ns), padT + ih); ctx.stroke();
        }
        ctx.strokeStyle = rgba(pal.em, 0.6);               // dN/dt = 0
        ctx.beginPath();
        if (q.useK) { ctx.moveTo(X(0), Y(q.alpha / q.beta)); ctx.lineTo(X(q.K), Y(0)); }
        else { ctx.moveTo(padL, Y(q.alpha / q.beta)); ctx.lineTo(padL + iw, Y(q.alpha / q.beta)); }
        ctx.stroke();
        ctx.setLineDash([]);

        // trajectory, older = fainter
        const n = sim.phase.length;
        if (n > 1) {
          ctx.lineWidth = 1.7; ctx.lineJoin = "round";
          for (let i = 1; i < n; i++) {
            const a = sim.phase[i - 1], b = sim.phase[i];
            const age = i / n;
            ctx.strokeStyle = rgba(pal.indigo, 0.08 + 0.72 * age * age);
            ctx.beginPath(); ctx.moveTo(X(a.N), Y(a.P)); ctx.lineTo(X(b.N), Y(b.P)); ctx.stroke();
          }
        }

        // equilibrium crosshair
        if (eq.Ns > 0 && eq.Ps > 0 && eq.Ns < nMax && eq.Ps < pMax) {
          const ex = X(eq.Ns), ey = Y(eq.Ps);
          ctx.strokeStyle = rgba(pal.amber, 0.95); ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(ex - 5, ey); ctx.lineTo(ex + 5, ey);
          ctx.moveTo(ex, ey - 5); ctx.lineTo(ex, ey + 5);
          ctx.stroke();
          ctx.fillStyle = rgba(pal.amber, 0.95); ctx.textAlign = "left"; ctx.textBaseline = "bottom";
          ctx.fillText("(N*, P*)", ex + 7, ey - 3);
        }

        // current state + travel direction
        if (n > 2) {
          const cur = sim.phase[n - 1], prev = sim.phase[Math.max(0, n - 6)];
          const cx = X(cur.N), cy = Y(cur.P);
          const dx = cx - X(prev.N), dy = cy - Y(prev.P);
          const m = Math.hypot(dx, dy);
          if (m > 0.6) {
            const ux = dx / m, uy = dy / m;
            ctx.fillStyle = rgba(pal.cy, 0.95);
            ctx.beginPath();
            ctx.moveTo(cx + ux * 9, cy + uy * 9);
            ctx.lineTo(cx - uy * 4.4 - ux * 2, cy + ux * 4.4 - uy * 2);
            ctx.lineTo(cx + uy * 4.4 - ux * 2, cy - ux * 4.4 - uy * 2);
            ctx.closePath(); ctx.fill();
          }
          ctx.fillStyle = solid(pal.cy);
          ctx.beginPath(); ctx.arc(cx, cy, 3.6, 0, 6.2832); ctx.fill();
        }

        ctx.fillStyle = rgba(pal.faint, 0.9); ctx.textAlign = "right"; ctx.textBaseline = "top";
        ctx.fillText("counter-clockwise", padL + iw, padT);
      }

      function draw() { drawChart(); drawPhase(); }

      /* ── numbers panel ──────────────────────────────────────────────────── */
      let lastVerdict = "";
      function readout() {
        const eq = equilibrium();
        const T = theoryPeriod();
        clockEl.textContent = "t = " + sim.t.toFixed(1) + " yr";
        chartCv.setAttribute("aria-label",
          "At year " + sim.t.toFixed(1) + ", prey " + sim.N.toFixed(1) + " thousand, predators " + sim.P.toFixed(1) + " thousand.");

        readEl.innerHTML =
          "prey N &nbsp;= <b>" + sim.N.toFixed(2) + "</b>k &nbsp;&nbsp; predators P = <b>" + sim.P.toFixed(2) + "</b>k<br>" +
          "N* = <b>" + (isFinite(eq.Ns) ? eq.Ns.toFixed(1) : "—") + "</b>k &nbsp;&nbsp; P* = <b>" + (eq.Ps > 0 ? eq.Ps.toFixed(1) : "0") + "</b>k<br>" +
          "range N " + (sim.nMin === Infinity ? "—" : sim.nMin.toFixed(2)) + " → " + sim.nMax.toFixed(1) + "k<br>" +
          "period: theory <b>" + T.toFixed(2) + "</b> yr &nbsp; measured <b>" + (sim.period ? sim.period.toFixed(2) : "—") + "</b> yr";

        const frac = sim.lag != null && sim.period ? sim.lag / sim.period : null;
        lagEl.innerHTML =
          "prey peak &nbsp;t = <b>" + (sim.peakN ? sim.peakN.t.toFixed(2) : "—") + "</b>" +
          "<br>predator peak t = <b>" + (sim.peakP ? sim.peakP.t.toFixed(2) : "—") + "</b>" +
          "<br>measured lag = <b>" + (sim.lag != null ? sim.lag.toFixed(2) + " yr" : "—") + "</b>" +
          (frac != null ? " = <b>" + (frac * 100).toFixed(0) + "%</b> of a cycle" : "");
        lagFill.style.width = (frac != null ? clamp(frac, 0, 1) * 100 : 0) + "%";

        // verdict
        let v;
        if (sim.dead && sim.N <= 0 && sim.P <= 0) {
          v = "<b>Total collapse at year " + sim.dead.t.toFixed(1) + ".</b> The loop got so wide that the trough fell below 20 animals — the floor this bench treats as extinction. Neutral cycles have no memory of a &ldquo;safe&rdquo; amplitude, so one big shock is permanent.";
        } else if (sim.P <= 0 && sim.dead) {
          v = "<b>Predators extinct at year " + sim.dead.t.toFixed(1) + ".</b> " +
            (eq.Ns > 0 && q.useK && eq.Ns >= q.K
              ? "N* = " + eq.Ns.toFixed(0) + "k is above the prey&rsquo;s carrying capacity of " + q.K + "k, so there was never enough food to cover &gamma;."
              : "Their numbers dipped below the floor during a trough. Prey are now released from predation and " + (q.useK ? "level off at K = " + q.K + "k." : "grow exponentially — the green curve goes vertical."));
        } else if (sim.N <= 0) {
          v = "<b>Prey wiped out at year " + sim.dead.t.toFixed(1) + ".</b> Predators must follow: with N = 0 the predator equation is just &minus;&gamma;P, pure decay.";
        } else if (q.useK) {
          v = "<b>Damped cycle.</b> Adding a prey food limit (K = " + q.K + "k) turns the neutral loop into an inward spiral — the phase trajectory winds onto (N*, P*) instead of retracing itself. This is what real, persistent predator–prey systems look like.";
        } else if (sim.nMin < 1 && sim.t > 6) {
          v = "<b>Dangerously deep troughs.</b> Prey bottom out at " + sim.nMin.toFixed(2) + "k. The maths happily carries a population through 30 animals and back; a real forest would lose them to a bad winter and never get the cycle back.";
        } else if (sim.lag != null && sim.period) {
          v = "<b>Stable out-of-phase cycling.</b> Predators peak " + (frac * 100).toFixed(0) + "% of a cycle after prey — close to the quarter-cycle that theory predicts, because predator growth is driven by the prey level, not by how fast prey are changing.";
        } else {
          v = "Press <b>Run</b> and let two full cycles go by — the bench will find the peaks itself and measure the lag.";
        }
        if (v !== lastVerdict) { verdictEl.innerHTML = v; lastVerdict = v; }
      }

      /* ── controls ───────────────────────────────────────────────────────── */
      function syncLabels() {
        host.querySelector("#ppAv").textContent = (+sA.value).toFixed(2);
        host.querySelector("#ppBv").textContent = (+sB.value).toFixed(3);
        host.querySelector("#ppGv").textContent = (+sG.value).toFixed(2);
        host.querySelector("#ppEv").textContent = (+sE.value).toFixed(3);
        host.querySelector("#ppNv").textContent = (+sN.value).toFixed(0) + "k";
        host.querySelector("#ppPv").textContent = (+sP.value).toFixed(1) + "k";
        host.querySelector("#ppKv2v").textContent = (+sK.value).toFixed(0) + "k";
      }
      function pullParams() {
        q.alpha = +sA.value; q.beta = +sB.value; q.gamma = +sG.value; q.eps = +sE.value; q.K = +sK.value;
        syncLabels();
      }

      const onLive = () => { pullParams(); draw(); readout(); };
      const onIC = () => { pullParams(); reset(true); };
      sA.addEventListener("input", onLive);
      sB.addEventListener("input", onLive);
      sG.addEventListener("input", onLive);
      sE.addEventListener("input", onLive);
      sK.addEventListener("input", onLive);
      sN.addEventListener("input", onIC);
      sP.addEventListener("input", onIC);

      kBtn.addEventListener("click", () => {
        q.useK = !q.useK;
        kBtn.classList.toggle("on", q.useK);
        kBtn.setAttribute("aria-pressed", String(q.useK));
        kBtn.textContent = q.useK ? "Carrying capacity ON" : "Carrying capacity off";
        sK.disabled = !q.useK;
        kGrp.classList.toggle("off", !q.useK);
        draw(); readout();
      });

      function setRunning(on) {
        sim.running = on;
        runBtn.textContent = on ? "Pause" : "Run";
        runBtn.classList.toggle("pri", !on);
      }
      runBtn.addEventListener("click", () => setRunning(!sim.running));
      host.querySelector("#ppReset").addEventListener("click", () => { setRunning(false); reset(true); });
      host.querySelector("#ppCull").addEventListener("click", () => {
        sim.N *= 0.3; sim.culled++;
        if (sim.N < EXT) { sim.N = 0; sim.dead = { who: "prey", t: sim.t }; }
        record(); draw(); readout();
      });
      host.querySelector("#ppDis").addEventListener("click", () => {
        sim.P *= 0.2;
        if (sim.P < EXT) { sim.P = 0; sim.dead = { who: "predator", t: sim.t }; }
        record(); draw(); readout();
      });

      host.querySelectorAll("[data-pre]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const p = PP_PRESETS[btn.getAttribute("data-pre")];
          if (!p) return;
          host.querySelectorAll("[data-pre]").forEach((b) => b.classList.toggle("on", b === btn));
          sA.value = p.a; sB.value = p.b; sG.value = p.g; sE.value = p.e;
          sN.value = p.N0; sP.value = p.P0; sK.value = p.K;
          if (q.useK !== p.useK) kBtn.click();
          pullParams();
          reset(true);
          setRunning(true);
        });
      });

      /* ── loop ───────────────────────────────────────────────────────────── */
      let raf = 0, last = 0, uiAcc = 0;
      function frame(now) {
        raf = requestAnimationFrame(frame);
        if (!last) last = now;
        const dtWall = clamp((now - last) / 1000, 0, 0.1);
        last = now;

        if (sim.running && !(sim.N <= 0 && sim.P <= 0)) {
          let years = dtWall * SPEED;
          let guard = 0;
          while (years > 0 && guard++ < 4000) {
            const d = Math.min(DT, years);
            step(d);
            years -= d;
            if (sim.t >= sim.nextSample) { record(); sim.nextSample = sim.t + SAMPLE; }
          }
          draw();
          uiAcc += dtWall;
          if (uiAcc > 0.12) { uiAcc = 0; readout(); }
        }
        palAge += dtWall;
        if (palAge > 1) { palAge = 0; pal = palette(host); }
      }

      const ro = new ResizeObserver(() => draw());
      ro.observe(chartCv); ro.observe(phaseCv);

      pullParams();
      reset(true);
      if (!reduced()) setRunning(true);
      raf = requestAnimationFrame(frame);

      return {
        dispose() {
          cancelAnimationFrame(raf);
          ro.disconnect();
          sim.running = false;
          if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
          host.innerHTML = "";
        }
      };
    }
  });

  /* ========================================================================
     LAB 2 — NATURAL SELECTION  (one locus, two alleles, camouflage)
     ====================================================================== */

  const NS_CSS = `
.ns-wrap{padding:14px}
.ns-stack{display:flex;flex-direction:column;gap:12px;min-width:0}
.ns-cap{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-family:var(--mono);font-size:10.5px;
  letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
.ns-cap .sp{margin-left:auto}
.ns-cap b{color:var(--ink);font-weight:600;letter-spacing:.06em}
.ns-k{display:inline-flex;align-items:center;gap:6px;color:var(--dim)}
.ns-k i{width:15px;height:3px;border-radius:2px;background:var(--c);display:inline-block;font-style:normal}
.ns-arena{width:100%;aspect-ratio:16/8.2;border:1px solid var(--line);border-radius:14px;display:block}
.ns-chart{width:100%;aspect-ratio:16/5.4;border:1px solid var(--line);border-radius:12px;display:block;
  background:color-mix(in srgb,var(--ink) 3%,transparent)}
@media (max-width:760px){.ns-arena{aspect-ratio:16/11}.ns-chart{aspect-ratio:16/7}}
.ns-morphs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.ns-m{border:1px solid var(--line);border-radius:11px;padding:9px 10px;display:flex;flex-direction:column;gap:5px}
.ns-m .sw{width:100%;height:7px;border-radius:4px;background:var(--sw)}
.ns-m .nm{font-family:var(--mono);font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--faint)}
.ns-m .vv{font-family:var(--mono);font-size:13px;font-weight:600;color:var(--ink)}
.ns-m .ss{font-family:var(--mono);font-size:10.5px;color:var(--dim)}
.ns-p{height:9px;border-radius:6px;overflow:hidden;display:flex;border:1px solid var(--line)}
.ns-p i{display:block;height:100%}
`;

  const PH = [0.87, 0.48, 0.11];   // phenotype lightness by copies of the dark allele (0,1,2)
  const MORPH = ["Light (dd)", "Mottled (Dd)", "Dark (DD)"];
  const CAP = 190;                 // carrying capacity of the log

  LABS.register("natural-selection", {
    title: "Natural Selection",
    tag: "Evolution",
    color: "#7c8cf8",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><ellipse cx="12" cy="12" rx="4.2" ry="6.4"/><path d="M12 5.6V18.4M7.8 12H3.4M16.2 12h4.4M8.6 8.2 5.4 6M15.4 8.2 18.6 6M8.6 15.8 5.4 18M15.4 15.8 18.6 18"/></svg>',
    blurb: "A real population of beetles on real bark. Set the colour of the log, let the birds hunt, and watch the allele frequency march across the chart — generation by generation, with nothing but heredity, variation and differential survival doing the work.",

    build(host) {
      const styleEl = injectStyle("ns-lab-css", NS_CSS);

      host.innerHTML =
        '<div class="bx ns-wrap">' +
          '<div class="bx-view" style="min-height:0;background:transparent;border:0;overflow:visible">' +
            '<div class="ns-stack">' +
              '<div class="ns-cap"><span id="nsPhase">Generation 0 — foraging</span><span class="sp"></span>' +
                '<b id="nsPop">190 beetles</b></div>' +
              '<canvas class="ns-arena" id="nsArena" role="img" aria-label="A log with beetles of varying colour"></canvas>' +
              '<div class="ns-cap">' +
                '<span class="ns-k" style="--c:var(--em)"><i></i>freq. of dark allele D</span>' +
                '<span class="ns-k" style="--c:var(--amber)"><i></i>mean beetle lightness</span>' +
                '<span class="ns-k" style="--c:var(--cy)"><i></i>bark lightness</span>' +
                '<span class="sp"></span><b id="nsGenLbl">gen 0</b></div>' +
              '<canvas class="ns-chart" id="nsChart" role="img" aria-label="Allele frequency over generations"></canvas>' +
            '</div>' +
          '</div>' +

          '<div class="bx-side">' +
            '<div class="bx-grp"><span class="bx-lbl">Starting conditions</span>' +
              '<div class="bx-chips">' +
                '<button class="bx-btn on" data-ns="soot">Sooty bark</button>' +
                '<button class="bx-btn" data-ns="lichen">Pale lichen</button>' +
                '<button class="bx-btn" data-ns="none">No variation (p = 1)</button>' +
              '</div></div>' +

            sliderRow("nsEnv", "Bark lightness (the environment)", 0, 1, 0.01, 0.16) +
            sliderRow("nsPred", "Predation pressure", 0.05, 0.6, 0.01, 0.35) +
            sliderRow("nsMut", "Mutation rate &mu; (per allele, per gen)", 0, 0.02, 0.0005, 0.001) +
            sliderRow("nsP0", "Starting freq. of dark allele p&#8320;", 0, 1, 0.01, 0.5) +

            '<div class="bx-grp"><span class="bx-lbl">Bench controls</span>' +
              '<div class="bx-chips">' +
                '<button class="bx-btn pri" id="nsRun">Run</button>' +
                '<button class="bx-btn" id="nsStep">Step 1 generation</button>' +
                '<button class="bx-btn" id="nsFlip">Flip the environment</button>' +
                '<button class="bx-btn" id="nsReset">Reset</button>' +
              '</div></div>' +

            '<div class="bx-grp"><span class="bx-lbl">Who survived the birds, last generation</span>' +
              '<div class="ns-morphs" id="nsMorphs"></div></div>' +

            '<div class="bx-grp"><span class="bx-lbl">Allele pool</span>' +
              '<div class="ns-p" id="nsPool"><i style="width:50%;background:color-mix(in srgb,var(--ink) 78%,transparent)"></i><i style="width:50%;background:color-mix(in srgb,var(--ink) 16%,transparent)"></i></div>' +
              '<div class="bx-read" id="nsRead"></div></div>' +

            '<div class="bx-verdict" id="nsVerdict" aria-live="polite"></div>' +

            '<div class="bx-note"><b>What this shows.</b> Colour here is one gene with two alleles — D (dark) and d (light) — with the heterozygote mottled in between, so you can read the genotype straight off the beetle. Each generation the birds take a fixed share of the population, but <b>which</b> beetles they take is weighted by how far the beetle&rsquo;s shade sits from the bark. Survivors mate at random, each passing one allele, so the next generation is Hardy–Weinberg at birth — and then selection distorts it again. ' +
            'Nothing here &ldquo;tries&rdquo; to become darker. The allele frequency moves only because carriers of one allele left more offspring, and it moves fastest at intermediate frequencies, where &Delta;p &prop; p&middot;q is largest. ' +
            'Set &mu; = 0 and p&#8320; = 1, then flip the bark to pale: predation goes through the roof and the population shrinks, but nothing evolves. <b>Selection can only sort variation that already exists</b> — mutation is the only thing that puts new alleles into the pool.</div>' +
          '</div>' +
        '</div>';

      const $ = (s) => host.querySelector(s);
      const arena = $("#nsArena"), chart = $("#nsChart");
      const readEl = $("#nsRead"), verdictEl = $("#nsVerdict"), morphEl = $("#nsMorphs");
      const poolEl = $("#nsPool"), phaseEl = $("#nsPhase"), popEl = $("#nsPop"), genLbl = $("#nsGenLbl");
      const runBtn = $("#nsRun");
      const sEnv = $("#nsEnv"), sPred = $("#nsPred"), sMut = $("#nsMut"), sP0 = $("#nsP0");

      let pal = palette(host);
      let palAge = 0;

      /* Bark texture: seeded once so it never shimmers between frames. */
      let seed = 20260803;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const streaks = [];
      for (let i = 0; i < 46; i++) {
        streaks.push({ x: rnd(), w: 0.012 + rnd() * 0.05, d: (rnd() - 0.5) * 0.22, y: rnd() * 0.3, h: 0.7 + rnd() * 0.5, k: rnd() });
      }
      const knots = [];
      for (let i = 0; i < 5; i++) knots.push({ x: 0.08 + rnd() * 0.86, y: 0.12 + rnd() * 0.76, r: 0.012 + rnd() * 0.03 });

      /** Greyscale ramp anchored on the theme tokens, ordered by luminance so
          "dark morph" is genuinely dark in light mode too. Warmed with --amber. */
      function ramp(t) {
        const a = pal.ink, b = pal.bg2;
        const dk = lumOf(a) < lumOf(b) ? a : b;
        const lt = lumOf(a) < lumOf(b) ? b : a;
        const D = mix(dk, [0, 0, 0], 0.30);
        const L = mix(lt, [255, 255, 255], 0.30);
        const g = mix(D, L, clamp(0.05 + 0.9 * t, 0, 1));
        return mix(g, pal.amber, 0.10);
      }

      const state = {
        gen: 0, pop: [], hist: [], env: 0.16, pred: 0.35, mu: 0.001,
        running: false, phase: "roam", phaseT: 0, dead: false,
        surv: [null, null, null], before: [0, 0, 0], p: 0.5, dp: 0, meanPh: 0.5, meanDetect: 0, killed: 0
      };

      function makeBeetle(nD, fresh) {
        return {
          nD: nD, ph: PH[nD],
          x: 0.05 + Math.random() * 0.9, y: 0.08 + Math.random() * 0.84,
          a: Math.random() * 6.283, sp: 0.008 + Math.random() * 0.016,
          turn: (Math.random() - 0.5) * 0.6, wob: Math.random() * 6.283,
          op: fresh ? 0 : 1, dying: 0, mark: 0
        };
      }

      function seedPop() {
        const p = +sP0.value;
        state.pop = [];
        for (let i = 0; i < CAP; i++) {
          const nD = (Math.random() < p ? 1 : 0) + (Math.random() < p ? 1 : 0);
          state.pop.push(makeBeetle(nD, false));
        }
      }

      const alleleFreq = () => {
        if (!state.pop.length) return 0;
        let s = 0;
        for (const b of state.pop) s += b.nD;
        return s / (2 * state.pop.length);
      };
      const detectability = (ph) => 0.05 + Math.pow(Math.abs(ph - state.env), 1.5);

      function reset() {
        state.gen = 0; state.hist.length = 0; state.dead = false;
        state.phase = "roam"; state.phaseT = 0;
        state.surv = [null, null, null]; state.killed = 0; state.dp = 0;
        seedPop();
        state.p = alleleFreq();
        pushHist();
        drawAll(); readout();
      }

      function pushHist() {
        let sum = 0, det = 0;
        for (const b of state.pop) { sum += b.ph; det += detectability(b.ph); }
        state.meanPh = state.pop.length ? sum / state.pop.length : 0;
        state.meanDetect = state.pop.length ? det / state.pop.length : 0;
        state.hist.push({ gen: state.gen, p: state.p, ph: state.meanPh, env: state.env, n: state.pop.length });
        if (state.hist.length > 400) state.hist.shift();
      }

      /* ── one generation of selection ─────────────────────────────────────── */
      function predate() {
        const alive = state.pop.filter((b) => !b.dying);
        if (alive.length < 2) { state.dead = true; return; }
        state.before = [0, 0, 0];
        for (const b of alive) state.before[b.nD]++;

        let det = 0;
        for (const b of alive) det += detectability(b.ph);
        const meanDet = det / alive.length;                 // 0.05 (hidden) … 1.05 (glaring)
        const m = clamp((meanDet - 0.05) / 1.0, 0, 1);
        // total toll rises when the whole population is badly matched — absolute fitness
        let nKill = Math.round(alive.length * state.pred * (0.35 + 1.0 * m));
        nKill = clamp(nKill, 0, alive.length - 1);

        // …and *which* beetles die is weighted by their own conspicuousness — relative fitness
        const pool = alive.slice();
        const w = pool.map((b) => detectability(b.ph));
        let total = w.reduce((s, v) => s + v, 0);
        for (let k = 0; k < nKill && pool.length; k++) {
          let r = Math.random() * total, idx = 0;
          while (idx < pool.length - 1 && r > w[idx]) { r -= w[idx]; idx++; }
          pool[idx].dying = 1; pool[idx].mark = 1;
          total -= w[idx];
          pool.splice(idx, 1); w.splice(idx, 1);
        }
        state.killed = nKill;

        const after = [0, 0, 0];
        for (const b of alive) if (!b.dying) after[b.nD]++;
        for (let i = 0; i < 3; i++) state.surv[i] = state.before[i] > 0 ? after[i] / state.before[i] : null;
      }

      function reproduce() {
        const surv = state.pop.filter((b) => !b.dying);
        state.pop = surv;
        if (surv.length < 2) { state.dead = true; state.running = false; return; }
        const target = Math.min(CAP, Math.max(2, Math.round(surv.length * 2.0)));
        const mu = state.mu;
        const gamete = (parent) => {
          let al = parent.nD === 2 ? 1 : parent.nD === 0 ? 0 : (Math.random() < 0.5 ? 1 : 0);
          if (Math.random() < mu) al = al ? 0 : 1;   // mutation, symmetric
          return al;
        };
        const kids = [];
        for (let i = 0; i < target; i++) {
          const m1 = surv[(Math.random() * surv.length) | 0];
          const m2 = surv[(Math.random() * surv.length) | 0];
          kids.push(makeBeetle(gamete(m1) + gamete(m2), true));
        }
        state.pop = kids;
        const before = state.p;
        state.p = alleleFreq();
        state.dp = state.p - before;
        state.gen++;
        pushHist();
      }

      function runGeneration() {   // used by the Step button — no animation needed
        if (state.dead) return;
        for (const b of state.pop) { b.dying = 0; b.mark = 0; b.op = 1; }
        predate();
        reproduce();
        for (const b of state.pop) b.op = 1;
        state.phase = "roam"; state.phaseT = 0;
        drawAll(); readout();
      }

      /* ── arena ──────────────────────────────────────────────────────────── */
      function drawArena(time) {
        const f = fit(arena); if (!f) return;
        const ctx = f.ctx, w = f.w, h = f.h;
        const B = state.env;

        ctx.fillStyle = solid(ramp(B));
        ctx.fillRect(0, 0, w, h);
        // grain
        for (const s of streaks) {
          const c = ramp(clamp(B + s.d * 0.5, 0, 1));
          ctx.fillStyle = rgba(c, 0.5);
          const x = s.x * w, wd = Math.max(1.5, s.w * w);
          ctx.fillRect(x, -s.y * h, wd, s.h * h * 1.4);
        }
        for (const s of streaks) {
          if (s.k > 0.6) continue;
          ctx.strokeStyle = rgba(ramp(clamp(B - 0.18, 0, 1)), 0.35);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(s.x * w + 2, 0);
          ctx.bezierCurveTo(s.x * w + 14, h * 0.35, s.x * w - 10, h * 0.65, s.x * w + 4, h);
          ctx.stroke();
        }
        for (const k of knots) {
          const kx = k.x * w, ky = k.y * h, kr = k.r * w;
          for (let i = 3; i >= 1; i--) {
            ctx.strokeStyle = rgba(ramp(clamp(B - 0.14, 0, 1)), 0.3);
            ctx.lineWidth = 1.1;
            ctx.beginPath(); ctx.ellipse(kx, ky, kr * i, kr * i * 0.66, 0.4, 0, 6.2832); ctx.stroke();
          }
        }
        // vignette so beetles near the rim stay readable
        const vg = ctx.createLinearGradient(0, 0, 0, h);
        vg.addColorStop(0, rgba(ramp(clamp(B - 0.2, 0, 1)), 0.25));
        vg.addColorStop(0.4, rgba(ramp(B), 0));
        vg.addColorStop(1, rgba(ramp(clamp(B - 0.2, 0, 1)), 0.3));
        ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);

        const sc = clamp(w / 620, 0.7, 1.5);
        for (const b of state.pop) drawBeetle(ctx, b, w, h, sc, time);
      }

      function drawBeetle(ctx, b, w, h, sc, time) {
        if (b.op <= 0.01) return;
        const L = 15 * sc, W = 9.5 * sc;
        const x = b.x * w, y = b.y * h;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(b.a);
        const shrink = b.dying ? lerp(1, 0.55, 1 - b.op) : 1;
        ctx.scale(shrink, shrink);
        ctx.globalAlpha = clamp(b.op, 0, 1);

        const body = ramp(b.ph);
        const dark = mix(body, [0, 0, 0], 0.5);

        // shadow
        ctx.fillStyle = rgba([0, 0, 0], 0.16);
        ctx.beginPath(); ctx.ellipse(0.8 * sc, 1.2 * sc, L * 0.5, W * 0.5, 0, 0, 6.2832); ctx.fill();

        // legs
        ctx.strokeStyle = rgba(dark, 0.95);
        ctx.lineWidth = 1.1 * sc; ctx.lineCap = "round";
        const wig = reduced() ? 0 : Math.sin(time * 7 + b.wob) * 1.3 * sc;
        for (const px of [-L * 0.24, 0, L * 0.24]) {
          for (const sg of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(px, sg * W * 0.32);
            ctx.lineTo(px + wig * sg, sg * (W * 0.34 + 3.6 * sc));
            ctx.stroke();
          }
        }
        // head + antennae
        ctx.fillStyle = solid(dark);
        ctx.beginPath(); ctx.ellipse(L * 0.44, 0, W * 0.28, W * 0.30, 0, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = rgba(dark, 0.9); ctx.lineWidth = 0.9 * sc;
        for (const sg of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(L * 0.5, sg * W * 0.12);
          ctx.lineTo(L * 0.72, sg * (W * 0.3 + wig * 0.2));
          ctx.stroke();
        }
        // body
        ctx.fillStyle = solid(body);
        ctx.beginPath(); ctx.ellipse(0, 0, L * 0.5, W * 0.5, 0, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = rgba(dark, 0.55); ctx.lineWidth = 0.9 * sc;
        ctx.beginPath(); ctx.ellipse(0, 0, L * 0.5, W * 0.5, 0, 0, 6.2832); ctx.stroke();
        // elytra seam + pronotum
        ctx.beginPath(); ctx.moveTo(-L * 0.46, 0); ctx.lineTo(L * 0.26, 0); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(L * 0.28, 0, W * 0.26, W * 0.42, 0, 0, 6.2832); ctx.stroke();
        // sheen
        ctx.fillStyle = rgba(ramp(1), 0.20);
        ctx.beginPath(); ctx.ellipse(-L * 0.1, -W * 0.18, L * 0.2, W * 0.14, -0.3, 0, 6.2832); ctx.fill();

        ctx.restore();

        if (b.mark && b.dying && b.op > 0.05) {
          const r = lerp(4, 20, 1 - b.op) * sc;
          ctx.strokeStyle = rgba(pal.rose, 0.85 * b.op);
          ctx.lineWidth = 1.8 * sc;
          ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.stroke();
        }
      }

      /* ── allele-frequency chart ─────────────────────────────────────────── */
      function drawChart() {
        const f = fit(chart); if (!f) return;
        const ctx = f.ctx, w = f.w, h = f.h;
        ctx.clearRect(0, 0, w, h);
        const padL = 34, padR = 44, padT = 10, padB = 20;
        const iw = w - padL - padR, ih = h - padT - padB;
        if (iw < 40 || ih < 24) return;

        const WIN = 70;
        let g0 = 0, g1 = Math.max(WIN, state.gen);
        if (state.gen > WIN) { g1 = state.gen; g0 = g1 - WIN; }
        const X = (g) => padL + ((g - g0) / Math.max(1, g1 - g0)) * iw;
        const Y = (v) => padT + ih - clamp(v, 0, 1) * ih;

        ctx.font = MONO; ctx.lineWidth = 1;
        for (const v of [0, 0.25, 0.5, 0.75, 1]) {
          const y = Math.round(Y(v)) + 0.5;
          ctx.strokeStyle = rgba(pal.line, v === 0 || v === 1 ? 0.85 : 0.4);
          ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + iw, y); ctx.stroke();
          ctx.fillStyle = rgba(pal.faint, 0.95); ctx.textAlign = "right"; ctx.textBaseline = "middle";
          ctx.fillText(v.toFixed(2), padL - 7, y);
        }
        const gs = niceStep(g1 - g0, 6);
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        for (let g = Math.ceil(g0 / gs) * gs; g <= g1 + 1e-9; g += gs) {
          const x = Math.round(X(g)) + 0.5;
          ctx.strokeStyle = rgba(pal.line, 0.3);
          ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + ih); ctx.stroke();
          ctx.fillStyle = rgba(pal.faint, 0.95); ctx.fillText(String(g), x, padT + ih + 4);
        }

        function line(key, col, dash, wid) {
          ctx.setLineDash(dash || []);
          ctx.strokeStyle = solid(col); ctx.lineWidth = wid || 2;
          ctx.lineJoin = "round"; ctx.lineCap = "round";
          ctx.beginPath();
          let started = false;
          for (const r of state.hist) {
            if (r.gen < g0) continue;
            const x = X(r.gen), y = Y(key === "envInv" ? 1 - r.env : r[key]);
            if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.setLineDash([]);
          return started;
        }
        // bark lightness is plotted inverted so it lines up with "how dark should you be"
        line("envInv", pal.cy, [4, 4], 1.4);
        line("ph", pal.amber, [], 1.5);
        const ok = line("p", pal.em, [], 2.4);

        if (ok && state.hist.length) {
          const last = state.hist[state.hist.length - 1];
          const hx = X(last.gen), hy = Y(last.p);
          ctx.fillStyle = solid(pal.em);
          ctx.beginPath(); ctx.arc(hx, hy, 3.4, 0, 6.2832); ctx.fill();
          ctx.textAlign = "left"; ctx.textBaseline = "middle";
          ctx.fillText("p=" + last.p.toFixed(2), Math.min(hx + 7, w - padR + 2), clamp(hy, padT + 6, padT + ih - 6));
        }
        ctx.fillStyle = rgba(pal.faint, 0.9); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText("generations", padL + 2, padT + ih + 4);
      }

      function drawAll(time) { drawArena(time || 0); drawChart(); }

      /* ── readouts ───────────────────────────────────────────────────────── */
      let lastV = "";
      function readout() {
        const p = state.p, q0 = 1 - p, n = state.pop.length;
        const counts = [0, 0, 0];
        for (const b of state.pop) counts[b.nD]++;
        popEl.textContent = n + " beetle" + (n === 1 ? "" : "s");
        genLbl.textContent = "gen " + state.gen;

        morphEl.innerHTML = [2, 1, 0].map((i) => {
          const c = ramp(PH[i]);
          const s = state.surv[i];
          return '<div class="ns-m" style="--sw:' + solid(c) + '">' +
            '<div class="sw"></div><div class="nm">' + MORPH[i] + '</div>' +
            '<div class="vv">' + counts[i] + '</div>' +
            '<div class="ss">survived ' + (s == null ? "—" : (s * 100).toFixed(0) + "%") + '</div></div>';
        }).join("");

        poolEl.innerHTML =
          '<i style="width:' + (p * 100).toFixed(1) + '%;background:' + solid(ramp(PH[2])) + '"></i>' +
          '<i style="width:' + (q0 * 100).toFixed(1) + '%;background:' + solid(ramp(PH[0])) + '"></i>';

        const ws = state.surv.filter((v) => v != null && v > 0);
        const sCoef = ws.length > 1 ? 1 - Math.min.apply(null, ws) / Math.max.apply(null, ws) : null;

        readEl.innerHTML =
          "p(D) = <b>" + p.toFixed(3) + "</b> &nbsp; q(d) = <b>" + q0.toFixed(3) + "</b><br>" +
          "&Delta;p last gen = <b>" + (state.dp >= 0 ? "+" : "") + state.dp.toFixed(3) + "</b> &nbsp; p&middot;q = <b>" + (p * q0).toFixed(3) + "</b><br>" +
          "eaten last gen = <b>" + state.killed + "</b> &nbsp; s &asymp; <b>" + (sCoef == null ? "—" : sCoef.toFixed(2)) + "</b><br>" +
          "mean beetle lightness <b>" + state.meanPh.toFixed(2) + "</b> vs bark <b>" + state.env.toFixed(2) + "</b>";

        arena.setAttribute("aria-label",
          "Generation " + state.gen + ": " + n + " beetles on bark of lightness " + state.env.toFixed(2) +
          ". Dark allele frequency " + p.toFixed(2) + ".");

        // verdict
        let v;
        const matched = Math.abs(state.meanPh - state.env) < 0.18;
        if (state.dead) {
          v = "<b>The population died out at generation " + state.gen + ".</b> Every beetle stood out against this bark, the birds took a bigger share each round, and there was no allele in the pool that could rescue them. Extinction is what happens when the needed variation simply is not there.";
        } else if (state.mu === 0 && (p >= 0.999 || p <= 0.001)) {
          v = "<b>The population is fixed at p = " + p.toFixed(0) + " and &mu; = 0.</b> There is only one allele left, so every beetle is identical and selection has nothing to choose between — the frequency line is flat no matter what you do to the bark. Raise &mu; and watch new alleles appear, then sweep.";
        } else if (p > 0.97 || p < 0.03) {
          v = "<b>Nearly fixed (p = " + p.toFixed(3) + ").</b> &Delta;p has collapsed because it scales with p&middot;q = " + (p * q0).toFixed(3) + " — the rarer allele is now so rare that most copies sit in heterozygotes, hidden from selection. The last stretch to fixation is the slowest.";
        } else if (Math.abs(state.dp) > 0.008) {
          v = "<b>Directional selection, " + (state.dp > 0 ? "toward dark" : "toward light") + ".</b> " +
            "Survival differs between morphs (s &asymp; " + (sCoef == null ? "—" : sCoef.toFixed(2)) + "), so the allele pool shifts by " +
            (state.dp >= 0 ? "+" : "") + state.dp.toFixed(3) + " per generation. Nothing changed inside any individual beetle — only who left offspring.";
        } else if (matched) {
          v = "<b>The population now matches the bark.</b> With mean lightness " + state.meanPh.toFixed(2) + " against bark " + state.env.toFixed(2) +
            ", the morphs survive at similar rates, so the frequency drifts rather than marches. Flip the environment to start a new sweep.";
        } else {
          v = "Press <b>Run</b>, or step one generation at a time and watch the survival percentages before the frequency moves.";
        }
        if (v !== lastV) { verdictEl.innerHTML = v; lastV = v; }
      }

      /* ── controls ───────────────────────────────────────────────────────── */
      function syncLabels() {
        $("#nsEnvv").textContent = (+sEnv.value).toFixed(2);
        $("#nsPredv").textContent = ((+sPred.value) * 100).toFixed(0) + "%";
        $("#nsMutv").textContent = (+sMut.value).toFixed(4);
        $("#nsP0v").textContent = (+sP0.value).toFixed(2);
      }
      sEnv.addEventListener("input", () => { state.env = +sEnv.value; syncLabels(); drawAll(); readout(); });
      sPred.addEventListener("input", () => { state.pred = +sPred.value; syncLabels(); });
      sMut.addEventListener("input", () => { state.mu = +sMut.value; syncLabels(); });
      sP0.addEventListener("input", () => { syncLabels(); });
      sP0.addEventListener("change", () => { reset(); });

      function setRunning(on) {
        state.running = on && !state.dead;
        runBtn.textContent = state.running ? "Pause" : "Run";
        runBtn.classList.toggle("pri", !state.running);
      }
      runBtn.addEventListener("click", () => setRunning(!state.running));
      $("#nsStep").addEventListener("click", () => { setRunning(false); runGeneration(); });
      $("#nsReset").addEventListener("click", () => { setRunning(false); reset(); });
      $("#nsFlip").addEventListener("click", () => {
        const now = +sEnv.value;
        sEnv.value = now > 0.5 ? 0.14 : 0.86;
        state.env = +sEnv.value;
        syncLabels(); drawAll(); readout();
      });

      const NS_PRE = {
        soot:   { env: 0.16, p0: 0.5,  mu: 0.001, pred: 0.35 },
        lichen: { env: 0.84, p0: 0.5,  mu: 0.001, pred: 0.35 },
        none:   { env: 0.86, p0: 1.0,  mu: 0,     pred: 0.45 }
      };
      host.querySelectorAll("[data-ns]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const c = NS_PRE[btn.getAttribute("data-ns")];
          if (!c) return;
          host.querySelectorAll("[data-ns]").forEach((b) => b.classList.toggle("on", b === btn));
          sEnv.value = c.env; sP0.value = c.p0; sMut.value = c.mu; sPred.value = c.pred;
          state.env = c.env; state.mu = c.mu; state.pred = c.pred;
          syncLabels();
          reset();
          setRunning(!reduced());
        });
      });

      /* ── loop ───────────────────────────────────────────────────────────── */
      const DUR = { roam: 0.95, strike: 0.75, breed: 0.65 };
      let raf = 0, last = 0, clock = 0;

      function frame(now) {
        raf = requestAnimationFrame(frame);
        if (!last) last = now;
        const dt = clamp((now - last) / 1000, 0, 0.1);
        last = now;
        clock += dt;

        palAge += dt;
        if (palAge > 1) { palAge = 0; pal = palette(host); }

        let dirty = false;

        if (!reduced()) {
          for (const b of state.pop) {
            if (b.dying) continue;
            b.a += b.turn * dt + Math.sin(clock * 1.6 + b.wob) * dt * 0.5;
            b.x += Math.cos(b.a) * b.sp * dt * 1.6;
            b.y += Math.sin(b.a) * b.sp * dt * 1.6;
            if (b.x < 0.03) { b.x = 0.03; b.a = Math.PI - b.a; }
            if (b.x > 0.97) { b.x = 0.97; b.a = Math.PI - b.a; }
            if (b.y < 0.05) { b.y = 0.05; b.a = -b.a; }
            if (b.y > 0.95) { b.y = 0.95; b.a = -b.a; }
          }
          dirty = true;
        }

        // fades
        for (const b of state.pop) {
          if (b.dying && b.op > 0) { b.op -= dt * (reduced() ? 8 : 2.4); dirty = true; }
          else if (!b.dying && b.op < 1) { b.op = Math.min(1, b.op + dt * (reduced() ? 8 : 3)); dirty = true; }
        }

        if (state.running && !state.dead) {
          state.phaseT += dt;
          if (state.phaseT >= DUR[state.phase]) {
            state.phaseT = 0;
            if (state.phase === "roam") {
              state.phase = "strike";
              predate();
              readout();
            } else if (state.phase === "strike") {
              state.phase = "breed";
              reproduce();
              readout();
            } else {
              state.phase = "roam";
            }
            dirty = true;
          }
          const label = state.phase === "roam" ? "foraging" : state.phase === "strike" ? "birds hunting" : "breeding";
          phaseEl.textContent = "Generation " + state.gen + " — " + label;
          if (state.dead) { setRunning(false); readout(); }
        } else if (!state.running) {
          phaseEl.textContent = "Generation " + state.gen + (state.dead ? " — population extinct" : " — paused");
        }

        if (dirty) drawArena(clock);
      }

      const ro = new ResizeObserver(() => drawAll(clock));
      ro.observe(arena); ro.observe(chart);

      state.env = +sEnv.value; state.pred = +sPred.value; state.mu = +sMut.value;
      syncLabels();
      reset();
      if (!reduced()) setRunning(true);
      raf = requestAnimationFrame(frame);

      return {
        dispose() {
          cancelAnimationFrame(raf);
          ro.disconnect();
          state.running = false;
          state.pop.length = 0;
          if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
          host.innerHTML = "";
        }
      };
    }
  });
})();
