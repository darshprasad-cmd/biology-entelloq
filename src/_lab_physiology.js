/* ============================================================================
   Biology Entelloq — PHYSIOLOGY BENCHES
   Two real, runnable benches registered into the LABS shell:
     · enzyme-kinetics — temperature / pH / [S] against reaction rate, with
       Michaelis–Menten saturation and IRREVERSIBLE thermal denaturation.
     · heart-rate — an ECG bench where autonomic drive sets HR, SV and CO.
   Plain browser JS. No imports, no build step, no assets, no network.
   ========================================================================== */
(function () {
  "use strict";

  /* ── tiny shared helpers ───────────────────────────────────────────────── */
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var fmt = function (v, d) { return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); };
  var reducedMotion = function () {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };

  /* Resolve a CSS custom property to a real rgb() string, so Canvas 2D can use
     tokens too. The probe lives inside the lab root, so scoped vars resolve. */
  function makePalette(root) {
    var probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;left:-9999px;top:0;width:0;height:0;opacity:0;pointer-events:none";
    root.appendChild(probe);
    var cache = Object.create(null);
    return {
      get: function (token) {
        if (cache[token]) return cache[token];
        probe.style.color = "";
        probe.style.color = "var(" + token + ")";
        var c = getComputedStyle(probe).color || "rgb(150,150,150)";
        cache[token] = c;
        return c;
      },
      flush: function () { cache = Object.create(null); },
      destroy: function () { if (probe.parentNode) probe.parentNode.removeChild(probe); }
    };
  }

  /* Watch the theme attribute so canvas colours follow light/dark. */
  function onThemeChange(fn) {
    var mo = new MutationObserver(fn);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return mo;
  }

  function injectStyle(host, css) {
    var s = document.createElement("style");
    s.textContent = css;
    host.appendChild(s);
    return s;
  }

  /* ==========================================================================
     LAB 1 — ENZYME KINETICS
     ======================================================================== */

  var ENZYMES = [
    {
      id: "pepsin", name: "Pepsin", short: "Pepsin",
      pHopt: 2.0, pHw: 1.05, Km: 3.0, Vmax: 45,
      where: "Stomach lumen — secreted as pepsinogen, activated by HCl",
      does: "Protein → short peptides",
      fact: "Its optimum is pH 2 because gastric juice really is that acidic. Move it into the duodenum (pH 8) and it stops."
    },
    {
      id: "amylase", name: "Salivary amylase", short: "Amylase",
      pHopt: 6.8, pHw: 0.75, Km: 1.6, Vmax: 120,
      where: "Mouth — saliva, buffered near neutral",
      does: "Starch → maltose",
      fact: "Chewing bread long enough tastes sweet: amylase is cutting starch into maltose while it is still in your mouth."
    },
    {
      id: "trypsin", name: "Trypsin", short: "Trypsin",
      pHopt: 8.0, pHw: 0.95, Km: 0.6, Vmax: 80,
      where: "Small intestine — pancreatic juice, alkaline from bicarbonate",
      does: "Peptides → shorter peptides & amino acids",
      fact: "Pancreatic bicarbonate neutralises stomach acid so trypsin gets the pH 8 it needs."
    }
  ];

  /* Thermal term: Q10 = 2 rise in molecular collisions, multiplied by the
     fraction of enzyme still correctly folded (a two-state unfolding curve).
     The product is the familiar skewed bell peaking near 40 °C. */
  var FT_PEAK = (function () {
    var m = 0;
    for (var t = 0; t <= 90; t += 0.05) {
      var v = Math.pow(2, (t - 37) / 10) / (1 + Math.exp((t - 44) / 3));
      if (v > m) m = v;
    }
    return m;
  })();
  function fT(T) { return Math.pow(2, (T - 37) / 10) / (1 + Math.exp((T - 44) / 3)) / FT_PEAK; }
  function fPH(pH, e) { var d = pH - e.pHopt; return Math.exp(-(d * d) / (2 * e.pHw * e.pHw)); }
  function fS(S, e) { return S / (e.Km + S); }
  function rateOf(e, T, pH, S, denat) { return e.Vmax * fT(T) * fPH(pH, e) * (1 - denat) * fS(S, e); }

  var ENZ_CSS = [
    ".enzb{--lc:var(--amber);--acc:var(--amber);--warn:var(--rose);--good:var(--em)}",
    ':root[data-theme="light"] .enzb{--lc:color-mix(in srgb,var(--amber) 56%,var(--ink));--acc:var(--lc)}',
    ".enzb .enz-view{display:flex;flex-direction:column}",
    ".enzb .enz-tube{padding:12px 14px 2px}",
    ".enzb .enz-tube svg{width:100%}",
    ".enzb .enz-chart{padding:0 6px 6px}",
    ".enzb .enz-chart svg{width:100%}",
    ".enzb .enz-cap{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:0 16px 10px;" +
      "font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}",
    ".enzb .enz-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px;vertical-align:1px}",
    ".enzb .enz-sub{fill:var(--amber)}",
    ".enzb .enz-prod{fill:var(--em)}",
    ".enzb .enz-enzyme{fill:none;stroke:var(--cy);stroke-width:1.6}",
    ".enzb .enz-enzyme.dead{stroke:var(--rose)}",
    ".enzb .enz-alarm{margin:0 14px 12px;padding:9px 12px;border-radius:10px;font-size:12.5px;line-height:1.5;" +
      "border:1px solid color-mix(in srgb,var(--rose) 42%,transparent);color:var(--rose);" +
      "background:color-mix(in srgb,var(--rose) 11%,transparent)}",
    ".enzb .enz-alarm[hidden]{display:none}",
    ".enzb .enz-hot{color:var(--rose)}",
    ".enzb .enz-meta{font-size:12.5px;color:var(--faint);line-height:1.5}",
    ".enzb .enz-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
    ".enzb .enz-cell{border:1px solid var(--line);border-radius:10px;padding:9px 11px}",
    ".enzb .enz-cell .k{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}",
    ".enzb .enz-cell .v{font-family:var(--mono);font-size:15px;font-weight:700;color:var(--ink);margin-top:2px}",
    ".enzb .enz-cell .v small{font-size:10.5px;font-weight:500;color:var(--faint);margin-left:3px}",
    ".enzb .enz-bars{display:flex;flex-direction:column;gap:7px}",
    ".enzb .enz-bar{display:grid;grid-template-columns:78px 1fr 42px;gap:9px;align-items:center;font-family:var(--mono);font-size:10.5px;color:var(--faint)}",
    ".enzb .enz-bar .t{height:6px;border-radius:99px;background:color-mix(in srgb,var(--ink) 9%,transparent);overflow:hidden}",
    ".enzb .enz-bar .f{height:100%;border-radius:99px;background:var(--acc);transition:width .18s linear}",
    ".enzb .enz-bar .n{text-align:right;color:var(--ink);font-weight:600}",
    "@media (prefers-reduced-motion: reduce){.enzb .enz-bar .f{transition:none}}"
  ].join("\n");

  LABS.register("enzyme-kinetics", {
    title: "The enzyme rate bench",
    tag: "Physiology · Enzymes",
    color: "#f6c667",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 3v6.2L4.9 17.1A2.4 2.4 0 0 0 7 20.7h10a2.4 2.4 0 0 0 2.1-3.6L14.5 9.2V3"/><path d="M8 3h8"/><path d="M7.1 14.6h9.8"/><circle cx="10.6" cy="17" r="1"/><circle cx="13.9" cy="18.2" r="1"/></svg>',
    blurb: "Set temperature, pH and substrate concentration and watch a real rate equation answer. Push past 55 °C and the enzyme is destroyed for good — no amount of cooling brings it back.",

    build: function (host) {
      var styleEl = injectStyle(host, ENZ_CSS);
      var root = document.createElement("div");
      root.className = "enzb";
      host.appendChild(root);

      /* ── state ─────────────────────────────────────────────────────────── */
      var st = {
        e: ENZYMES[1],
        T: 37, pH: 7.0, S: 20,
        denat: 0,          // irreversible: only ever increases
        product: 0,        // µmol per mg enzyme, accumulated
        elapsed: 0,
        axis: "T"
      };
      var motion = !reducedMotion();

      var AXES = {
        T: { label: "Temperature (°C)", min: 0, max: 90, ticks: [0, 15, 30, 45, 60, 75, 90], dp: 0 },
        pH: { label: "pH", min: 0, max: 14, ticks: [0, 2, 4, 6, 8, 10, 12, 14], dp: 1 },
        S: { label: "[Substrate]  (mmol L⁻¹)", min: 0, max: 100, ticks: [0, 20, 40, 60, 80, 100], dp: 0 }
      };

      /* ── markup ────────────────────────────────────────────────────────── */
      root.innerHTML =
        '<div class="bx">' +
          '<div class="bx-view enz-view">' +
            '<div class="enz-tube" id="ezTube"></div>' +
            '<div class="enz-cap">' +
              '<span><span class="enz-dot" style="background:var(--amber)"></span><span id="ezNsub">40</span> substrate</span>' +
              '<span><span class="enz-dot" style="background:var(--em)"></span><span id="ezNprod">0</span> product</span>' +
              '<span id="ezTurn">turnover 0.0 %/s</span>' +
            '</div>' +
            '<div class="enz-alarm" id="ezAlarm" hidden role="status"></div>' +
            '<div class="enz-chart" id="ezChart"></div>' +
          '</div>' +

          '<div class="bx-side">' +
            '<div class="bx-grp">' +
              '<span class="bx-lbl" id="ezEnzLbl">Enzyme</span>' +
              '<div class="bx-chips" role="group" aria-labelledby="ezEnzLbl" id="ezEnz"></div>' +
              '<div class="enz-meta" id="ezMeta"></div>' +
            '</div>' +

            '<div class="bx-grp">' +
              '<label for="ezT">Temperature</label>' +
              '<div class="bx-row">' +
                '<input class="bx-slider" type="range" id="ezT" min="0" max="90" step="1" value="37">' +
                '<span class="bx-val" id="ezTv">37 °C</span>' +
              '</div>' +
            '</div>' +

            '<div class="bx-grp">' +
              '<label for="ezP">pH</label>' +
              '<div class="bx-row">' +
                '<input class="bx-slider" type="range" id="ezP" min="0" max="14" step="0.1" value="7">' +
                '<span class="bx-val" id="ezPv">7.0</span>' +
              '</div>' +
            '</div>' +

            '<div class="bx-grp">' +
              '<label for="ezS">Substrate concentration</label>' +
              '<div class="bx-row">' +
                '<input class="bx-slider" type="range" id="ezS" min="0" max="100" step="0.5" value="20">' +
                '<span class="bx-val" id="ezSv">20 mM</span>' +
              '</div>' +
            '</div>' +

            '<div class="bx-grp">' +
              '<span class="bx-lbl" id="ezAxLbl">Plot rate against</span>' +
              '<div class="bx-chips" role="group" aria-labelledby="ezAxLbl" id="ezAxis">' +
                '<button class="bx-btn on" type="button" data-ax="T">Temperature</button>' +
                '<button class="bx-btn" type="button" data-ax="pH">pH</button>' +
                '<button class="bx-btn" type="button" data-ax="S">[S]</button>' +
              '</div>' +
            '</div>' +

            '<div class="enz-grid">' +
              '<div class="enz-cell"><div class="k">Reaction rate</div><div class="v" id="ezRate">0.0<small>µmol min⁻¹ mg⁻¹</small></div></div>' +
              '<div class="enz-cell"><div class="k">Of this enzyme\'s Vmax</div><div class="v" id="ezPct">0<small>%</small></div></div>' +
              '<div class="enz-cell"><div class="k">Product formed</div><div class="v" id="ezProd">0.0<small>µmol mg⁻¹</small></div></div>' +
              '<div class="enz-cell"><div class="k">Enzyme destroyed</div><div class="v" id="ezDen">0<small>%</small></div></div>' +
            '</div>' +

            '<div class="enz-bars" aria-hidden="true">' +
              '<div class="enz-bar"><span>temperature</span><span class="t"><span class="f" id="ezBT"></span></span><span class="n" id="ezNT">0</span></div>' +
              '<div class="enz-bar"><span>pH</span><span class="t"><span class="f" id="ezBP"></span></span><span class="n" id="ezNP">0</span></div>' +
              '<div class="enz-bar"><span>saturation</span><span class="t"><span class="f" id="ezBS"></span></span><span class="n" id="ezNS">0</span></div>' +
              '<div class="enz-bar"><span>intact enzyme</span><span class="t"><span class="f" id="ezBD"></span></span><span class="n" id="ezND">0</span></div>' +
            '</div>' +

            '<div class="bx-read" id="ezEq"></div>' +
            '<div class="bx-chips">' +
              '<button class="bx-btn pri" type="button" id="ezReset">Fresh enzyme (reset)</button>' +
              '<button class="bx-btn" type="button" id="ezOpt">Set to optimum</button>' +
            '</div>' +
            '<div class="bx-verdict" id="ezVerdict" role="status"></div>' +
            '<p class="bx-note"><b>What this shows.</b> Rate is set by four independent things multiplied together: how fast molecules collide (temperature), how well the active site holds its shape and charge (pH), how often the active site is occupied (substrate), and how much enzyme is still intact. Warming speeds collisions until roughly 40 °C; beyond that the protein starts to unfold and the fall is far steeper than the rise. Above 55 °C the unfolding becomes permanent — hydrogen and ionic bonds break, the chain tangles, and cooling it down does nothing. That asymmetry is why enzymes have a "danger side".</p>' +
          '</div>' +
        '</div>';

      var q = function (id) { return root.querySelector("#" + id); };
      var tubeBox = q("ezTube"), chartBox = q("ezChart"), alarm = q("ezAlarm");
      var sT = q("ezT"), sP = q("ezP"), sS = q("ezS");
      var vT = q("ezTv"), vP = q("ezPv"), vS = q("ezSv");
      var enzBox = q("ezEnz"), axBox = q("ezAxis"), metaBox = q("ezMeta");

      /* ── enzyme chips ──────────────────────────────────────────────────── */
      ENZYMES.forEach(function (e) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "bx-btn" + (e === st.e ? " on" : "");
        b.textContent = e.short;
        b.setAttribute("aria-pressed", e === st.e ? "true" : "false");
        b.addEventListener("click", function () {
          st.e = e;
          Array.prototype.forEach.call(enzBox.children, function (c, i) {
            var on = ENZYMES[i] === st.e;
            c.classList.toggle("on", on);
            c.setAttribute("aria-pressed", on ? "true" : "false");
          });
          st.product = 0; st.elapsed = 0;
          drawMeta(); chartDirty = true; sync(true);
        });
        enzBox.appendChild(b);
      });

      function drawMeta() {
        metaBox.innerHTML = st.e.name + " — " + st.e.does + ". " + st.e.where +
          ". <b style=\"color:var(--ink)\">Optimum pH " + fmt(st.e.pHopt, 1) + "</b>, K<sub>m</sub> " +
          fmt(st.e.Km, 1) + " mmol L⁻¹, V<sub>max</sub> " + st.e.Vmax + " µmol min⁻¹ mg⁻¹.";
      }
      drawMeta();

      /* ── axis chips ────────────────────────────────────────────────────── */
      Array.prototype.forEach.call(axBox.children, function (b) {
        b.setAttribute("aria-pressed", b.classList.contains("on") ? "true" : "false");
        b.addEventListener("click", function () {
          st.axis = b.getAttribute("data-ax");
          Array.prototype.forEach.call(axBox.children, function (c) {
            var on = c === b;
            c.classList.toggle("on", on);
            c.setAttribute("aria-pressed", on ? "true" : "false");
          });
          chartDirty = true;
        });
      });

      /* ── the reaction vessel ───────────────────────────────────────────── */
      var TUBE_W = 640, TUBE_H = 76, N_MOL = 40, N_ENZ = 5;
      var mols = [], enzGlyphs = [];
      var tubeSvg = null;

      function buildTube() {
        var parts = ['<svg viewBox="0 0 ' + TUBE_W + ' ' + TUBE_H + '" role="img" aria-label="Reaction vessel: substrate molecules converting to product">'];
        parts.push('<rect x="1" y="1" width="' + (TUBE_W - 2) + '" height="' + (TUBE_H - 2) +
          '" rx="16" style="fill:var(--panel);stroke:var(--line);stroke-width:1"/>');
        parts.push('<g id="ezEnzG"></g><g id="ezMolG"></g>');
        parts.push("</svg>");
        tubeBox.innerHTML = parts.join("");
        tubeSvg = tubeBox.querySelector("svg");
        var mg = tubeBox.querySelector("#ezMolG"), eg = tubeBox.querySelector("#ezEnzG");
        mols.length = 0; enzGlyphs.length = 0;
        var i, c;
        for (i = 0; i < N_ENZ; i++) {
          var ex = 60 + i * ((TUBE_W - 120) / (N_ENZ - 1));
          var ey = 20 + (i % 2) * 34;
          var g = document.createElementNS("http://www.w3.org/2000/svg", "path");
          /* a small open "active site" wedge */
          g.setAttribute("d", "M" + (ex - 11) + "," + (ey - 9) + " a11,11 0 1,0 0,18 l6,-5 a6,6 0 1,1 0,-8 z");
          g.setAttribute("class", "enz-enzyme");
          eg.appendChild(g);
          enzGlyphs.push(g);
        }
        for (i = 0; i < N_MOL; i++) {
          c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          c.setAttribute("r", "3.4");
          c.setAttribute("class", "enz-sub");
          mg.appendChild(c);
          mols.push({
            el: c,
            x: 16 + Math.random() * (TUBE_W - 32),
            y: 12 + Math.random() * (TUBE_H - 24),
            vx: (Math.random() * 2 - 1) * 26,
            vy: (Math.random() * 2 - 1) * 20,
            done: false
          });
        }
        placeMols();
      }
      function placeMols() {
        for (var i = 0; i < mols.length; i++) {
          var m = mols[i];
          m.el.setAttribute("cx", m.x.toFixed(1));
          m.el.setAttribute("cy", m.y.toFixed(1));
        }
      }
      buildTube();

      /* ── the chart ─────────────────────────────────────────────────────── */
      var VB_W = 660, VB_H = 320, PL = 60, PR = 18, PT = 16, PB = 42;
      var PW = VB_W - PL - PR, PH = VB_H - PT - PB;

      function curveValue(ax, x, ideal) {
        var e = st.e;
        var T = ax === "T" ? x : (ideal ? 40 : st.T);
        var pH = ax === "pH" ? x : (ideal ? e.pHopt : st.pH);
        var S = ax === "S" ? x : (ideal ? 100 : st.S);
        if (ideal) {
          if (ax === "T") { pH = e.pHopt; S = 100; }
          if (ax === "pH") { T = 40; S = 100; }
          if (ax === "S") { T = 40; pH = e.pHopt; }
        }
        return rateOf(e, T, pH, S, ideal ? 0 : st.denat);
      }

      function drawChart() {
        var e = st.e, ax = AXES[st.axis], k = st.axis;
        var ymax = e.Vmax;
        var X = function (v) { return PL + (v - ax.min) / (ax.max - ax.min) * PW; };
        var Y = function (r) { return PT + (1 - clamp(r / ymax, 0, 1)) * PH; };

        var s = ['<svg viewBox="0 0 ' + VB_W + ' ' + VB_H + '" role="img" aria-label="Reaction rate against ' +
          ax.label + ' for ' + e.name + '">'];

        /* danger band (temperature only) */
        if (k === "T") {
          s.push('<rect x="' + X(55).toFixed(1) + '" y="' + PT + '" width="' + (X(90) - X(55)).toFixed(1) +
            '" height="' + PH + '" style="fill:var(--rose);opacity:.10"/>');
          s.push('<text x="' + (X(55) + 7).toFixed(1) + '" y="' + (PT + 15) +
            '" style="fill:var(--rose);font-size:10.5px;letter-spacing:.1em;font-family:var(--mono)">DENATURING ZONE</text>');
        }

        /* horizontal gridlines + y ticks */
        var i, gy;
        for (i = 0; i <= 4; i++) {
          gy = PT + (i / 4) * PH;
          s.push('<line x1="' + PL + '" y1="' + gy.toFixed(1) + '" x2="' + (PL + PW) + '" y2="' + gy.toFixed(1) +
            '" style="stroke:var(--line);stroke-width:1"/>');
          s.push('<text x="' + (PL - 9) + '" y="' + (gy + 4).toFixed(1) +
            '" text-anchor="end" style="fill:var(--faint);font-size:11px;font-family:var(--mono)">' +
            Math.round(ymax * (1 - i / 4)) + "</text>");
        }
        /* x ticks */
        ax.ticks.forEach(function (t) {
          s.push('<line x1="' + X(t).toFixed(1) + '" y1="' + (PT + PH) + '" x2="' + X(t).toFixed(1) + '" y2="' + (PT + PH + 5) +
            '" style="stroke:var(--line);stroke-width:1"/>');
          s.push('<text x="' + X(t).toFixed(1) + '" y="' + (PT + PH + 19) +
            '" text-anchor="middle" style="fill:var(--faint);font-size:11px;font-family:var(--mono)">' + t + "</text>");
        });
        s.push('<line x1="' + PL + '" y1="' + (PT + PH) + '" x2="' + (PL + PW) + '" y2="' + (PT + PH) +
          '" style="stroke:var(--line);stroke-width:1.2"/>');
        s.push('<text x="' + (PL + PW / 2) + '" y="' + (VB_H - 8) +
          '" text-anchor="middle" style="fill:var(--dim);font-size:12px">' + ax.label + "</text>");
        s.push('<text transform="translate(15,' + (PT + PH / 2) + ') rotate(-90)" text-anchor="middle" ' +
          'style="fill:var(--dim);font-size:12px">Rate  (µmol min⁻¹ mg⁻¹)</text>');

        /* sampled curves */
        var N = 180, dIdeal = "", dNow = "", fill = "", t, xv, rv;
        for (i = 0; i <= N; i++) {
          xv = ax.min + (i / N) * (ax.max - ax.min);
          rv = curveValue(k, xv, true);
          dIdeal += (i ? "L" : "M") + X(xv).toFixed(1) + "," + Y(rv).toFixed(1) + " ";
        }
        for (i = 0; i <= N; i++) {
          xv = ax.min + (i / N) * (ax.max - ax.min);
          rv = curveValue(k, xv, false);
          dNow += (i ? "L" : "M") + X(xv).toFixed(1) + "," + Y(rv).toFixed(1) + " ";
        }
        fill = dNow + "L" + X(ax.max).toFixed(1) + "," + (PT + PH) + " L" + X(ax.min).toFixed(1) + "," + (PT + PH) + " Z";

        s.push('<path d="' + dIdeal + '" style="fill:none;stroke:var(--dim);stroke-width:1.3;opacity:.42;stroke-dasharray:5 5"/>');
        s.push('<path d="' + fill + '" style="fill:var(--acc);opacity:.12"/>');
        s.push('<path d="' + dNow + '" style="fill:none;stroke:var(--acc);stroke-width:2.4;stroke-linejoin:round"/>');

        /* Michaelis–Menten annotations on the [S] axis */
        if (k === "S") {
          var vmaxEff = e.Vmax * fT(st.T) * fPH(st.pH, e) * (1 - st.denat);
          var halfY = Y(vmaxEff / 2);
          s.push('<line x1="' + PL + '" y1="' + halfY.toFixed(1) + '" x2="' + X(e.Km).toFixed(1) + '" y2="' + halfY.toFixed(1) +
            '" style="stroke:var(--cy);stroke-width:1.2;stroke-dasharray:3 4;opacity:.85"/>');
          s.push('<line x1="' + X(e.Km).toFixed(1) + '" y1="' + halfY.toFixed(1) + '" x2="' + X(e.Km).toFixed(1) + '" y2="' + (PT + PH) +
            '" style="stroke:var(--cy);stroke-width:1.2;stroke-dasharray:3 4;opacity:.85"/>');
          s.push('<text x="' + (X(e.Km) + 8).toFixed(1) + '" y="' + (halfY - 7).toFixed(1) +
            '" style="fill:var(--cy);font-size:11px;font-family:var(--mono)">½V_max at [S] = K_m = ' + fmt(e.Km, 1) + " mM</text>");
        }
        if (k === "pH") {
          s.push('<line x1="' + X(e.pHopt).toFixed(1) + '" y1="' + PT + '" x2="' + X(e.pHopt).toFixed(1) + '" y2="' + (PT + PH) +
            '" style="stroke:var(--cy);stroke-width:1.2;stroke-dasharray:3 4;opacity:.8"/>');
          s.push('<text x="' + (X(e.pHopt) + 7).toFixed(1) + '" y="' + (PT + 14) +
            '" style="fill:var(--cy);font-size:11px;font-family:var(--mono)">optimum pH ' + fmt(e.pHopt, 1) + "</text>");
        }
        if (k === "T") {
          s.push('<line x1="' + X(40).toFixed(1) + '" y1="' + PT + '" x2="' + X(40).toFixed(1) + '" y2="' + (PT + PH) +
            '" style="stroke:var(--cy);stroke-width:1.2;stroke-dasharray:3 4;opacity:.7"/>');
          s.push('<text x="' + (X(40) + 7).toFixed(1) + '" y="' + (PT + PH - 8).toFixed(1) +
            '" style="fill:var(--cy);font-size:11px;font-family:var(--mono)">optimum ≈ 40 °C</text>');
        }

        /* live marker */
        var cx = k === "T" ? st.T : k === "pH" ? st.pH : st.S;
        var cy = rateOf(e, st.T, st.pH, st.S, st.denat);
        var mx = X(cx), my = Y(cy);
        s.push('<line x1="' + PL + '" y1="' + my.toFixed(1) + '" x2="' + mx.toFixed(1) + '" y2="' + my.toFixed(1) +
          '" style="stroke:var(--acc);stroke-width:1;stroke-dasharray:2 4;opacity:.65"/>');
        s.push('<line x1="' + mx.toFixed(1) + '" y1="' + my.toFixed(1) + '" x2="' + mx.toFixed(1) + '" y2="' + (PT + PH) +
          '" style="stroke:var(--acc);stroke-width:1;stroke-dasharray:2 4;opacity:.65"/>');
        s.push('<circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="6.5" style="fill:var(--acc);opacity:.22"/>');
        s.push('<circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="3.6" style="fill:var(--acc)"/>');
        var lx = mx > PL + PW - 110 ? mx - 10 : mx + 10;
        var anchor = mx > PL + PW - 110 ? "end" : "start";
        s.push('<text x="' + lx.toFixed(1) + '" y="' + clamp(my - 11, PT + 12, PT + PH - 4).toFixed(1) + '" text-anchor="' + anchor +
          '" style="fill:var(--ink);font-size:12px;font-weight:700;font-family:var(--mono)">' + fmt(cy, 1) + "</text>");

        s.push("</svg>");
        chartBox.innerHTML = s.join("");
      }

      /* ── controls ──────────────────────────────────────────────────────── */
      function readSliders() {
        st.T = parseFloat(sT.value);
        st.pH = parseFloat(sP.value);
        st.S = parseFloat(sS.value);
      }
      function onInput() { readSliders(); chartDirty = true; sync(true); }
      sT.addEventListener("input", onInput);
      sP.addEventListener("input", onInput);
      sS.addEventListener("input", onInput);

      var btnReset = q("ezReset"), btnOpt = q("ezOpt");
      btnReset.addEventListener("click", function () {
        st.denat = 0; st.product = 0; st.elapsed = 0;
        for (var i = 0; i < mols.length; i++) { mols[i].done = false; mols[i].el.setAttribute("class", "enz-sub"); }
        chartDirty = true; sync(true);
      });
      btnOpt.addEventListener("click", function () {
        sT.value = "37"; sP.value = String(st.e.pHopt); sS.value = "60";
        readSliders(); chartDirty = true; sync(true);
      });

      /* ── readouts ──────────────────────────────────────────────────────── */
      var oRate = q("ezRate"), oPct = q("ezPct"), oProd = q("ezProd"), oDen = q("ezDen");
      var bT = q("ezBT"), bP = q("ezBP"), bS = q("ezBS"), bD = q("ezBD");
      var nT = q("ezNT"), nP = q("ezNP"), nS = q("ezNS"), nD = q("ezND");
      var eqBox = q("ezEq"), verdict = q("ezVerdict");
      var nSub = q("ezNsub"), nProd = q("ezNprod"), oTurn = q("ezTurn");
      var lastVerdict = "";

      function sync(fromUser) {
        var e = st.e;
        var ft = fT(st.T), fp = fPH(st.pH, e), fs = fS(st.S, e), intact = 1 - st.denat;
        var v = e.Vmax * ft * fp * intact * fs;

        vT.textContent = fmt(st.T, 0) + " °C";
        vT.classList.toggle("enz-hot", st.T > 55);
        vP.textContent = fmt(st.pH, 1);
        vS.textContent = fmt(st.S, 1) + " mM";

        oRate.innerHTML = fmt(v, 1) + "<small>µmol min⁻¹ mg⁻¹</small>";
        oPct.innerHTML = fmt(v / e.Vmax * 100, 1) + "<small>%</small>";
        oProd.innerHTML = fmt(st.product, 1) + "<small>µmol mg⁻¹</small>";
        oDen.innerHTML = fmt(st.denat * 100, 0) + "<small>%</small>";
        oDen.style.color = st.denat > 0.005 ? "var(--rose)" : "";

        bT.style.width = (ft * 100).toFixed(1) + "%"; nT.textContent = fmt(ft, 2);
        bP.style.width = (fp * 100).toFixed(1) + "%"; nP.textContent = fmt(fp, 2);
        bS.style.width = (fs * 100).toFixed(1) + "%"; nS.textContent = fmt(fs, 2);
        bD.style.width = (intact * 100).toFixed(1) + "%"; nD.textContent = fmt(intact, 2);

        eqBox.innerHTML =
          "v = V<sub>max</sub> · f(T) · f(pH) · (1 − D) · [S]/(K<sub>m</sub>+[S])<br>" +
          "v = <b>" + e.Vmax + "</b> × <b>" + fmt(ft, 2) + "</b> × <b>" + fmt(fp, 2) + "</b> × <b>" + fmt(intact, 2) +
          "</b> × <b>" + fmt(fs, 2) + "</b> = <b>" + fmt(v, 1) + "</b> µmol min⁻¹ mg⁻¹";

        var done = 0;
        for (var i = 0; i < mols.length; i++) if (mols[i].done) done++;
        nSub.textContent = String(mols.length - done);
        nProd.textContent = String(done);
        oTurn.textContent = "turnover " + fmt(v / e.Vmax * 55, 1) + " %/s";

        alarm.hidden = st.denat < 0.005;
        if (!alarm.hidden) {
          alarm.innerHTML = st.denat >= 0.999
            ? "<b>Enzyme denatured.</b> The tertiary structure has collapsed and the active site no longer exists. Cooling the tube will not restore it — this is irreversible. Press “Fresh enzyme” to add new enzyme."
            : "<b>Denaturing — " + fmt(st.denat * 100, 0) + "% destroyed.</b> Every second above 55 °C permanently unfolds more protein. Cool it now to save what is left.";
        }
        for (i = 0; i < enzGlyphs.length; i++) {
          var dead = st.denat > (i + 0.5) / enzGlyphs.length;
          enzGlyphs[i].setAttribute("class", "enz-enzyme" + (dead ? " dead" : ""));
        }

        /* verdict — only recomputed on real change, so screen readers aren't spammed */
        var msg;
        if (st.denat >= 0.999) {
          msg = "<b>Dead.</b> No rate at any temperature or pH now. Denaturation is a one-way door: the hydrogen bonds, ionic bonds and hydrophobic packing that held the active site in shape have been broken and the chain has tangled. This is the difference between <i>slowing</i> an enzyme and <i>destroying</i> it.";
        } else if (st.denat > 0.005) {
          msg = "<b>Losing enzyme every second.</b> " + fmt(st.denat * 100, 0) + "% is already destroyed. The whole curve is being scaled down permanently.";
        } else {
          var worst = Math.min(ft, fp, fs);
          if (worst === fp && fp < 0.55) {
            msg = "<b>pH is the limit.</b> At pH " + fmt(st.pH, 1) + ", " + e.name + " keeps only " + fmt(fp * 100, 0) +
              "% of its activity — you are " + fmt(Math.abs(st.pH - e.pHopt), 1) + " units from its optimum of pH " + fmt(e.pHopt, 1) +
              ". Charged R-groups in the active site gain or lose protons, so the substrate no longer fits. " + e.fact;
          } else if (worst === ft && ft < 0.55) {
            msg = st.T < 30
              ? "<b>Too cold.</b> At " + fmt(st.T, 0) + " °C molecules move slowly, so enzyme and substrate collide rarely — " +
                fmt(ft * 100, 0) + "% of peak activity. Warming toward 40 °C roughly doubles the rate every 10 °C (Q₁₀ ≈ 2)."
              : "<b>Too hot.</b> At " + fmt(st.T, 0) + " °C much of the enzyme is unfolded, leaving " + fmt(ft * 100, 0) +
                "% activity. Note the shape: the rise is gentle, the fall is a cliff.";
          } else if (worst === fs && fs < 0.7) {
            msg = "<b>Substrate is the limit.</b> Only " + fmt(fs * 100, 0) + "% of active sites are occupied at " +
              fmt(st.S, 1) + " mmol L⁻¹ (K<sub>m</sub> = " + fmt(e.Km, 1) +
              "). Add more substrate and the rate climbs — but it flattens as every site fills. That plateau is V<sub>max</sub>.";
          } else {
            msg = "<b>Near-ideal conditions.</b> " + e.name + " is running at " + fmt(v / e.Vmax * 100, 0) +
              "% of V<sub>max</sub>. Every factor is close to its best; the only way up now is more enzyme, not better conditions.";
          }
        }
        if (msg !== lastVerdict) { verdict.innerHTML = msg; lastVerdict = msg; }
        return v;
      }

      /* ── loop ──────────────────────────────────────────────────────────── */
      var raf = 0, last = 0, chartDirty = true, lastChart = 0;
      function frame(ts) {
        raf = requestAnimationFrame(frame);
        if (!last) last = ts;
        var dt = clamp((ts - last) / 1000, 0, 0.05);
        last = ts;

        /* irreversible thermal denaturation — accrues only above 55 °C */
        if (st.T > 55 && st.denat < 1) {
          st.denat = clamp(st.denat + dt * 0.22 * Math.pow(st.T - 55, 1.15), 0, 1);
          chartDirty = true;
        }

        var v = rateOf(st.e, st.T, st.pH, st.S, st.denat);
        st.product += v * dt / 60;
        st.elapsed += dt;

        /* molecules drift and convert at a rate proportional to v */
        var i, m;
        if (motion) {
          for (i = 0; i < mols.length; i++) {
            m = mols[i];
            m.x += m.vx * dt; m.y += m.vy * dt;
            if (m.x < 10) { m.x = 10; m.vx = -m.vx; }
            if (m.x > TUBE_W - 10) { m.x = TUBE_W - 10; m.vx = -m.vx; }
            if (m.y < 10) { m.y = 10; m.vy = -m.vy; }
            if (m.y > TUBE_H - 10) { m.y = TUBE_H - 10; m.vy = -m.vy; }
            m.el.setAttribute("cx", m.x.toFixed(1));
            m.el.setAttribute("cy", m.y.toFixed(1));
          }
        }
        var frac = v / st.e.Vmax;
        if (frac > 0.0005) {
          convAcc += dt * frac * 0.55 * mols.length;
          while (convAcc >= 1) {
            convAcc -= 1;
            var pool = [];
            for (i = 0; i < mols.length; i++) if (!mols[i].done) pool.push(mols[i]);
            if (!pool.length) { refillAt = st.elapsed + 0.7; convAcc = 0; break; }
            var pick = pool[(Math.random() * pool.length) | 0];
            pick.done = true;
            pick.el.setAttribute("class", "enz-prod");
          }
        }
        if (refillAt && st.elapsed > refillAt) {
          refillAt = 0;
          for (i = 0; i < mols.length; i++) { mols[i].done = false; mols[i].el.setAttribute("class", "enz-sub"); }
        }

        if (chartDirty && ts - lastChart > 55) { drawChart(); chartDirty = false; lastChart = ts; }
        if (ts - lastSync > 80) { sync(false); lastSync = ts; }
      }
      var convAcc = 0, refillAt = 0, lastSync = 0;

      var themeMo = onThemeChange(function () { chartDirty = true; });

      drawChart();
      sync(true);
      raf = requestAnimationFrame(frame);

      return {
        dispose: function () {
          cancelAnimationFrame(raf);
          themeMo.disconnect();
          sT.removeEventListener("input", onInput);
          sP.removeEventListener("input", onInput);
          sS.removeEventListener("input", onInput);
          if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
          if (root.parentNode) root.parentNode.removeChild(root);
          mols.length = 0; enzGlyphs.length = 0;
        }
      };
    }
  });

  /* ==========================================================================
     LAB 2 — HEART RATE / CARDIAC OUTPUT
     ======================================================================== */

  var HRT_CSS = [
    ".hrtb{--lc:var(--rose);--acc:var(--rose)}",
    ':root[data-theme="light"] .hrtb{--lc:color-mix(in srgb,var(--rose) 62%,var(--ink));--acc:var(--lc)}',
    ".hrtb .hr-view{display:flex;flex-direction:column}",
    ".hrtb .hr-top{display:flex;align-items:center;gap:14px;padding:14px 16px 8px}",
    ".hrtb .hr-view .hr-heart svg{width:34px;height:34px;flex:none;fill:var(--acc);transform-origin:50% 55%}",
    ".hrtb .hr-big{display:flex;align-items:baseline;gap:6px}",
    ".hrtb .hr-big b{font-family:var(--mono);font-size:30px;font-weight:700;color:var(--ink);line-height:1;font-variant-numeric:tabular-nums}",
    ".hrtb .hr-big span{font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}",
    ".hrtb .hr-tgt{font-family:var(--mono);font-size:11px;color:var(--faint);margin-left:2px}",
    ".hrtb .hr-lead{margin-left:auto;font-family:var(--mono);font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--faint);text-align:right}",
    ".hrtb .hr-canwrap{padding:0 10px 12px}",
    ".hrtb canvas{width:100%;height:clamp(170px,24vw,225px);border-radius:12px;background:var(--panel);border:1px solid var(--line)}",
    ".hrtb .hr-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}",
    ".hrtb .hr-cell{border:1px solid var(--line);border-radius:10px;padding:9px 11px}",
    ".hrtb .hr-cell.wide{grid-column:1/-1}",
    ".hrtb .hr-cell .k{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}",
    ".hrtb .hr-cell .v{font-family:var(--mono);font-size:15px;font-weight:700;color:var(--ink);margin-top:2px;font-variant-numeric:tabular-nums}",
    ".hrtb .hr-cell .v small{font-size:10.5px;font-weight:500;color:var(--faint);margin-left:3px}",
    ".hrtb .hr-drive{display:flex;flex-direction:column;gap:6px;font-family:var(--mono);font-size:11px}",
    ".hrtb .hr-drow{display:grid;grid-template-columns:120px 1fr 56px;gap:9px;align-items:center;color:var(--faint)}",
    ".hrtb .hr-drow .t{height:6px;border-radius:99px;background:color-mix(in srgb,var(--ink) 9%,transparent);position:relative;overflow:hidden}",
    ".hrtb .hr-drow .f{position:absolute;top:0;bottom:0;border-radius:99px}",
    ".hrtb .hr-drow .n{text-align:right;color:var(--ink);font-weight:600}",
    ".hrtb .hr-zone{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase}"
  ].join("\n");

  var HEART_PATH = "M12 21.2 4.3 13.1a4.95 4.95 0 0 1 .3-7.2 4.95 4.95 0 0 1 7.4 1.05 4.95 4.95 0 0 1 7.4-1.05 4.95 4.95 0 0 1 .3 7.2z";

  LABS.register("heart-rate", {
    title: "The cardiac output bench",
    tag: "Physiology · Circulation",
    color: "#fb7185",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.6 4.9 13.3a4.7 4.7 0 1 1 7.1-6 4.7 4.7 0 1 1 7.1 6z"/><path d="M6.6 12.4h2.6l1.2-2.6 1.9 4.8 1.2-2.2h2.9"/></svg>',
    blurb: "A live ECG driven by real autonomic control. Add exercise, add adrenaline, cut the vagus nerve — and watch heart rate, stroke volume and cardiac output move exactly as they do in a body.",

    build: function (host) {
      var styleEl = injectStyle(host, HRT_CSS);
      var root = document.createElement("div");
      root.className = "hrtb";
      host.appendChild(root);
      var motion = !reducedMotion();

      /* ── state ─────────────────────────────────────────────────────────── */
      var st = {
        ex: 0,          // 0..1 exercise intensity
        adr: 0,         // 0..1 plasma adrenaline
        vagus: true,    // parasympathetic supply intact?
        age: 20
      };
      /* smoothed effectors — different limbs respond at very different speeds */
      var sm = { vagal: 30, symp: 0, adr: 0, ex: 0, adrS: 0 };

      root.innerHTML =
        '<div class="bx">' +
          '<div class="bx-view hr-view">' +
            '<div class="hr-top">' +
              '<span class="hr-heart" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="' + HEART_PATH + '"/></svg></span>' +
              '<span class="hr-big"><b id="hrNum">70</b><span>bpm</span></span>' +
              '<span class="hr-tgt" id="hrTgt"></span>' +
              '<span class="hr-lead">Lead II · 25 mm s⁻¹ · 10 mm mV⁻¹</span>' +
            '</div>' +
            '<div class="hr-canwrap"><canvas id="hrCan"></canvas></div>' +
          '</div>' +

          '<div class="bx-side">' +
            '<div class="bx-grp">' +
              '<label for="hrEx">Exercise intensity</label>' +
              '<div class="bx-row">' +
                '<input class="bx-slider" type="range" id="hrEx" min="0" max="100" step="1" value="0">' +
                '<span class="bx-val" id="hrExV">0 %</span>' +
              '</div>' +
            '</div>' +
            '<div class="bx-grp">' +
              '<label for="hrAd">Plasma adrenaline</label>' +
              '<div class="bx-row">' +
                '<input class="bx-slider" type="range" id="hrAd" min="0" max="100" step="1" value="0">' +
                '<span class="bx-val" id="hrAdV">0 %</span>' +
              '</div>' +
            '</div>' +
            '<div class="bx-grp">' +
              '<label for="hrAge">Age (sets predicted HR<sub>max</sub>)</label>' +
              '<div class="bx-row">' +
                '<input class="bx-slider" type="range" id="hrAge" min="12" max="80" step="1" value="20">' +
                '<span class="bx-val" id="hrAgeV">20 yr</span>' +
              '</div>' +
            '</div>' +

            '<div class="bx-grp">' +
              '<span class="bx-lbl" id="hrNerveLbl">Vagus nerve (parasympathetic)</span>' +
              '<div class="bx-chips" role="group" aria-labelledby="hrNerveLbl">' +
                '<button class="bx-btn on" type="button" id="hrVagus" aria-pressed="true">Vagus intact</button>' +
                '<button class="bx-btn" type="button" id="hrRest">Back to rest</button>' +
              '</div>' +
            '</div>' +

            '<div class="bx-grp">' +
              '<span class="bx-lbl" id="hrPreLbl">Scenarios</span>' +
              '<div class="bx-chips" role="group" aria-labelledby="hrPreLbl" id="hrPre"></div>' +
            '</div>' +

            '<div class="hr-grid">' +
              '<div class="hr-cell"><div class="k">Heart rate (HR)</div><div class="v" id="oHR">70<small>bpm</small></div></div>' +
              '<div class="hr-cell"><div class="k">Stroke volume (SV)</div><div class="v" id="oSV">71<small>mL</small></div></div>' +
              '<div class="hr-cell wide"><div class="k">Cardiac output — CO = HR × SV</div><div class="v" id="oCO"></div></div>' +
              '<div class="hr-cell"><div class="k">Diastolic filling time</div><div class="v" id="oFill">579<small>ms</small></div></div>' +
              '<div class="hr-cell"><div class="k">Ejection fraction</div><div class="v" id="oEF">60<small>%</small></div></div>' +
              '<div class="hr-cell"><div class="k">End-diastolic volume</div><div class="v" id="oEDV">118<small>mL</small></div></div>' +
              '<div class="hr-cell"><div class="k">% of HR<sub>max</sub></div><div class="v" id="oPct">35<small>%</small></div></div>' +
            '</div>' +

            '<div class="hr-drive" aria-hidden="true">' +
              '<div class="hr-drow"><span>intrinsic SA node</span><span class="t"><span class="f" id="dInt" style="left:0;background:var(--dim)"></span></span><span class="n">+100</span></div>' +
              '<div class="hr-drow"><span>vagal brake</span><span class="t"><span class="f" id="dVag" style="left:0;background:var(--cy)"></span></span><span class="n" id="nVag">−30</span></div>' +
              '<div class="hr-drow"><span>sympathetic nerves</span><span class="t"><span class="f" id="dSym" style="left:0;background:var(--acc)"></span></span><span class="n" id="nSym">+0</span></div>' +
              '<div class="hr-drow"><span>adrenaline (blood)</span><span class="t"><span class="f" id="dAdr" style="left:0;background:var(--amber)"></span></span><span class="n" id="nAdr">+0</span></div>' +
            '</div>' +

            '<div class="bx-read" id="hrEq"></div>' +
            '<div class="bx-verdict" id="hrVerdict" role="status"></div>' +
            '<p class="bx-note"><b>What this shows.</b> The SA node fires on its own at about <b>100 bpm</b>. A resting rate near 70 exists only because the vagus nerve is constantly braking it with acetylcholine — block the vagus and the heart immediately jumps to its intrinsic rate. At the start of exercise the first thing that happens is <i>vagal withdrawal</i> (fast, within a beat), and only then does sympathetic noradrenaline take over (slow, over several seconds); circulating adrenaline from the adrenal medulla arrives slower still. Stroke volume rises for a different reason — more venous return stretches the ventricle, and by the Frank–Starling mechanism a stretched ventricle contracts harder. Multiply the two and you get cardiac output. At very high rates diastole becomes so short that filling starts to suffer, which is why CO eventually plateaus.</p>' +
          '</div>' +
        '</div>';

      var q = function (id) { return root.querySelector("#" + id); };
      var can = q("hrCan"), ctx = can.getContext("2d");
      var heartEl = root.querySelector(".hr-heart svg");
      var pal = makePalette(root);

      var sEx = q("hrEx"), sAd = q("hrAd"), sAge = q("hrAge");
      var vEx = q("hrExV"), vAd = q("hrAdV"), vAge = q("hrAgeV");
      var bVag = q("hrVagus"), bRest = q("hrRest"), preBox = q("hrPre");

      /* ── physiology ────────────────────────────────────────────────────── */
      function targets() {
        return {
          vagal: st.vagus ? 30 * Math.exp(-st.ex / 0.28) : 0,   // vagal tone, withdrawn early in exercise
          symp: 78 * Math.pow(st.ex, 1.05),                     // cardiac sympathetic nerves
          adr: 32 * st.adr                                      // circulating adrenaline on β1 receptors
        };
      }
      function hrMax() { return 220 - st.age; }
      function softCap(hr) {
        var m = hrMax(), knee = m - 15;
        if (hr <= knee) return hr;
        return knee + 15 * (1 - Math.exp(-(hr - knee) / 15));
      }
      function baseHR() { return softCap(Math.max(28, 100 - sm.vagal + sm.symp + sm.adr)); }

      function mechanics(hr) {
        var T = 60 / hr;
        var sys = clamp(0.325 * Math.sqrt(T), 0.12, 0.36);      // systole shortens with rate
        var dias = Math.max(0.05, T - sys);
        var fill = 0.75 + 0.25 * clamp(dias / 0.40, 0, 1);      // lusitropy keeps most of it
        var svPot = 71 + 50 * (1 - Math.exp(-sm.ex / 0.22)) + 14 * sm.adrS;
        var sv = svPot * fill;
        var ef = clamp(0.60 + 0.18 * (1 - Math.exp(-sm.ex / 0.25)) + 0.05 * sm.adrS, 0.5, 0.86);
        var edv = sv / ef;
        return { T: T, sys: sys, dias: dias, sv: sv, ef: ef, edv: edv, esv: edv - sv, co: hr * sv / 1000 };
      }

      /* ── ECG waveform: a sum of Gaussians in real time, not phase ───────── */
      function ecg(tau, T) {
        if (tau < 0 || tau > T + 0.30) return 0;
        var prS = clamp(Math.sqrt(T / 0.86), 0.58, 1.15);
        var qrs = 0.155 * prS;
        var QT = 0.385 * Math.sqrt(T);
        var g = function (c, w, a) { var d = (tau - c) / w; return a * Math.exp(-0.5 * d * d); };
        return g(0.045 * prS, 0.022 * prS, 0.13) +      // P
               g(qrs + 0.008, 0.008, -0.09) +            // Q
               g(qrs + 0.035, 0.011, 1.15) +             // R
               g(qrs + 0.065, 0.012, -0.28) +            // S
               g(qrs + 0.62 * QT, 0.075 * Math.sqrt(T / 0.86), 0.30); // T
      }

      /* ── canvas plumbing ───────────────────────────────────────────────── */
      var PX_PER_S = 130, W = 0, H = 0, dpr = 1;
      var buf = null, filled = 0, sampAcc = 0;
      var simT = 0, lastBeat = -1, curP = 60 / 70, prevP = 60 / 70, rsaPhase = 0;

      function resize() {
        var r = can.getBoundingClientRect();
        var w = Math.max(120, Math.round(r.width)), h = Math.max(90, Math.round(r.height));
        dpr = Math.min(2, window.devicePixelRatio || 1);
        if (w === W && h === H) return;
        W = w; H = h;
        can.width = Math.round(W * dpr); can.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buf = new Float32Array(W); filled = 0;
        if (!motion) staticStrip();
      }

      function pushSample(v) {
        if (!buf) return;
        if (filled < W) { buf[filled++] = v; return; }
        buf.copyWithin(0, 1); buf[W - 1] = v;
      }

      function drawGrid() {
        ctx.clearRect(0, 0, W, H);
        var big = 0.2 * PX_PER_S;                 // 200 ms per large square
        ctx.lineWidth = 1;
        ctx.strokeStyle = pal.get("--line");
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        for (var x = W % big; x < W; x += big) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, H); }
        var yStep = H / 6;
        for (var i = 1; i < 6; i++) { ctx.moveTo(0, Math.round(i * yStep) + 0.5); ctx.lineTo(W, Math.round(i * yStep) + 0.5); }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      function drawTrace() {
        if (!buf || !filled) return;
        var base = H * 0.66, mv = H / 2.6;         // px per mV
        var acc = pal.get("--acc");
        ctx.lineWidth = 2;
        ctx.strokeStyle = acc;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        var x0 = W - filled;
        for (var i = 0; i < filled; i++) {
          var y = base - buf[i] * mv;
          if (i === 0) ctx.moveTo(x0 + i, y); else ctx.lineTo(x0 + i, y);
        }
        ctx.stroke();
        if (motion) {
          ctx.fillStyle = acc;
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.arc(W - 1, base - buf[filled - 1] * mv, 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        /* 1 mV calibration mark */
        ctx.strokeStyle = pal.get("--faint");
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(6, base); ctx.lineTo(12, base); ctx.lineTo(12, base - mv);
        ctx.lineTo(20, base - mv); ctx.lineTo(20, base); ctx.lineTo(26, base);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      /* Steady-state strip for reduced-motion users: no animation, but the
         beat spacing still changes with every control. */
      function staticStrip() {
        var t = targets();
        sm.vagal = t.vagal; sm.symp = t.symp; sm.adr = t.adr; sm.ex = st.ex; sm.adrS = st.adr;
        var hr = baseHR(), T = 60 / hr;
        buf = new Float32Array(W); filled = W;
        for (var i = 0; i < W; i++) {
          var tt = i / PX_PER_S;
          var tau = tt % T;
          buf[i] = ecg(tau, T) + ecg(tau + T, T);
        }
        drawGrid(); drawTrace();
        readouts(hr, mechanics(hr), true);
      }

      /* ── readouts ──────────────────────────────────────────────────────── */
      var oHR = q("oHR"), oSV = q("oSV"), oCO = q("oCO"), oFill = q("oFill"),
          oEF = q("oEF"), oEDV = q("oEDV"), oPct = q("oPct"),
          hrNum = q("hrNum"), hrTgt = q("hrTgt"), eqBox = q("hrEq"), verdict = q("hrVerdict");
      var dVag = q("dVag"), dSym = q("dSym"), dAdr = q("dAdr"), dInt = q("dInt");
      var nVag = q("nVag"), nSym = q("nSym"), nAdr = q("nAdr");
      var lastVerdict = "";

      function zoneOf(p) {
        if (p < 55) return ["Rest / very light", "--cy"];
        if (p < 65) return ["Warm-up zone", "--em"];
        if (p < 75) return ["Aerobic base", "--em"];
        if (p < 85) return ["Aerobic / tempo", "--amber"];
        if (p < 93) return ["Lactate threshold", "--amber"];
        return ["Maximal effort", "--rose"];
      }

      function readouts(hr, m, force) {
        var shown = Math.round(hr);
        hrNum.textContent = String(shown);
        oHR.innerHTML = shown + "<small>bpm</small>";
        oSV.innerHTML = Math.round(m.sv) + "<small>mL</small>";
        oCO.innerHTML = shown + " × " + Math.round(m.sv) + " mL = <b>" + fmt(m.co, 1) + "</b><small>L min⁻¹</small>";
        oFill.innerHTML = Math.round(m.dias * 1000) + "<small>ms</small>";
        oEF.innerHTML = Math.round(m.ef * 100) + "<small>%</small>";
        oEDV.innerHTML = Math.round(m.edv) + "<small>mL  ESV " + Math.round(m.esv) + "</small>";

        var pct = hr / hrMax() * 100, z = zoneOf(pct);
        oPct.innerHTML = Math.round(pct) + '<small>of ' + hrMax() + " bpm · " + z[0] + "</small>";
        oPct.style.color = "var(" + z[1] + ")";

        var tg = targets();
        var raw = softCap(Math.max(28, 100 - tg.vagal + tg.symp + tg.adr));
        hrTgt.textContent = Math.abs(raw - hr) > 1.5 ? "→ " + Math.round(raw) : "";

        dInt.style.width = (100 / 130 * 100) + "%";
        dVag.style.width = clamp(sm.vagal / 130 * 100, 0, 100) + "%";
        dSym.style.width = clamp(sm.symp / 130 * 100, 0, 100) + "%";
        dAdr.style.width = clamp(sm.adr / 130 * 100, 0, 100) + "%";
        nVag.textContent = "−" + fmt(sm.vagal, 0);
        nSym.textContent = "+" + fmt(sm.symp, 0);
        nAdr.textContent = "+" + fmt(sm.adr, 0);

        eqBox.innerHTML =
          "HR = 100 (SA node) − " + fmt(sm.vagal, 0) + " (vagal) + " + fmt(sm.symp, 0) +
          " (sympathetic) + " + fmt(sm.adr, 0) + " (adrenaline) = <b>" + shown + "</b> bpm<br>" +
          "CO = HR × SV = <b>" + shown + "</b> × <b>" + Math.round(m.sv) + " mL</b> = <b>" + fmt(m.co, 1) + " L min⁻¹</b>" +
          "  <span style=\"color:var(--faint)\">(rest ≈ 5.0)</span><br>" +
          "Cycle " + Math.round(m.T * 1000) + " ms = systole " + Math.round(m.sys * 1000) +
          " ms + diastole " + Math.round(m.dias * 1000) + " ms";

        var msg;
        if (!st.vagus && st.ex < 0.05 && st.adr < 0.05) {
          msg = "<b>Vagus blocked at rest.</b> Nothing is stimulating the heart — the rate has risen to the SA node's own intrinsic firing rate of about 100 bpm simply because the brake was removed. This is what atropine does, and it is why a transplanted (denervated) heart rests near 100.";
        } else if (!st.vagus) {
          msg = "<b>No vagal brake.</b> Every bpm above 100 here is sympathetic drive and adrenaline. Recovery after you drop the intensity will also be slow: the fast fall in heart rate after exercise is normally vagal re-engagement, and you have removed it.";
        } else if (st.ex < 0.05 && st.adr > 0.4) {
          msg = "<b>Adrenaline without exercise.</b> A fright raises rate and contractility (stroke volume and ejection fraction climb) while venous return has barely changed — so cardiac output rises mostly through rate. Notice it also builds and fades slowly: this is a hormone travelling in blood, not a nerve impulse.";
        } else if (st.ex > 0 && st.ex <= 0.35) {
          msg = "<b>Early exercise = vagal withdrawal.</b> Almost all of the rise so far comes from taking the brake off (vagal tone is down to " +
            fmt(sm.vagal, 0) + " bpm from 30). It happens within a beat or two because acetylcholine is cleared fast. Sympathetic drive is only just beginning.";
        } else if (st.ex > 0.35 && st.ex < 0.85) {
          msg = "<b>Sympathetic drive is now doing the work.</b> The vagus is almost fully withdrawn, so further rate rise is noradrenaline at the SA node — and it also raises contractility, which is why stroke volume is up to " +
            Math.round(m.sv) + " mL. Cardiac output is " + fmt(m.co / 5.0, 1) + "× resting.";
        } else if (st.ex >= 0.85) {
          msg = "<b>Near maximum.</b> Diastole has shrunk to " + Math.round(m.dias * 1000) +
            " ms, so filling time is the new limit — stroke volume has stopped climbing and cardiac output plateaus. Rate cannot rescue it: beyond here, faster means less filled.";
        } else {
          msg = "<b>Resting state.</b> The SA node would fire at 100 bpm on its own; continuous vagal tone holds it at about 70. Cardiac output is " +
            fmt(m.co, 1) + " L min⁻¹ — the whole blood volume, roughly once a minute.";
        }
        if (force || msg !== lastVerdict) { verdict.innerHTML = msg; lastVerdict = msg; }
      }

      /* ── controls ──────────────────────────────────────────────────────── */
      function sliderChange() {
        st.ex = parseInt(sEx.value, 10) / 100;
        st.adr = parseInt(sAd.value, 10) / 100;
        st.age = parseInt(sAge.value, 10);
        vEx.textContent = sEx.value + " %";
        vAd.textContent = sAd.value + " %";
        vAge.textContent = sAge.value + " yr";
        if (!motion) staticStrip();
      }
      sEx.addEventListener("input", sliderChange);
      sAd.addEventListener("input", sliderChange);
      sAge.addEventListener("input", sliderChange);

      function setVagus(on) {
        st.vagus = on;
        bVag.classList.toggle("on", on);
        bVag.setAttribute("aria-pressed", on ? "true" : "false");
        bVag.textContent = on ? "Vagus intact" : "Vagus blocked (atropine)";
        if (!motion) staticStrip();
      }
      bVag.addEventListener("click", function () { setVagus(!st.vagus); });

      function applyPreset(p) {
        sEx.value = String(Math.round(p.ex * 100));
        sAd.value = String(Math.round(p.adr * 100));
        sliderChange();
        setVagus(p.vagus);
      }
      var PRESETS = [
        { n: "Rest", ex: 0, adr: 0, vagus: true },
        { n: "Brisk walk", ex: 0.28, adr: 0.05, vagus: true },
        { n: "Hard run", ex: 0.85, adr: 0.55, vagus: true },
        { n: "Sudden fright", ex: 0, adr: 0.9, vagus: true },
        { n: "Atropine", ex: 0, adr: 0, vagus: false }
      ];
      PRESETS.forEach(function (p) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "bx-btn"; b.textContent = p.n;
        b.addEventListener("click", function () { applyPreset(p); });
        preBox.appendChild(b);
      });
      bRest.addEventListener("click", function () { applyPreset(PRESETS[0]); });

      /* ── loop ──────────────────────────────────────────────────────────── */
      var raf = 0, last = 0;
      function step(dts) {
        var t = targets();
        var kv = 1 - Math.exp(-dts / 0.8);                                   // vagal: fast, ~1 beat
        var ks = 1 - Math.exp(-dts / (t.symp > sm.symp ? 4.5 : 8.0));        // sympathetic: slow
        var ka = 1 - Math.exp(-dts / (t.adr > sm.adr ? 5.0 : 8.0));          // hormone: slower still
        sm.vagal += (t.vagal - sm.vagal) * kv;
        sm.symp += (t.symp - sm.symp) * ks;
        sm.adr += (t.adr - sm.adr) * ka;
        var ke = 1 - Math.exp(-dts / 6.0);
        sm.ex += (st.ex - sm.ex) * ke;                                       // venous return / Starling: slow
        sm.adrS += (st.adr - sm.adrS) * ka;
      }

      function frame(ts) {
        raf = requestAnimationFrame(frame);
        if (!last) last = ts;
        var dt = clamp((ts - last) / 1000, 0, 0.06);
        last = ts;
        if (!W) { resize(); return; }

        sampAcc += PX_PER_S * dt;
        var n = Math.min(400, Math.floor(sampAcc));
        sampAcc -= n;
        var dts = n > 0 ? dt / n : dt;

        for (var i = 0; i < n; i++) {
          step(dts);
          simT += dts;
          rsaPhase += dts;
          if (lastBeat < 0) { lastBeat = simT; prevP = curP; }
          if (simT - lastBeat >= curP) {
            lastBeat += curP;
            prevP = curP;
            var hrB = baseHR();
            /* respiratory sinus arrhythmia — only exists while the vagus works */
            var breathHz = 0.22 + 0.35 * sm.ex;
            var rsa = st.vagus ? 3.4 * Math.exp(-sm.ex / 0.4) * Math.sin(2 * Math.PI * breathHz * simT) : 0;
            curP = 60 / clamp(hrB + rsa, 25, 240);
          }
          var tau = simT - lastBeat;
          var wander = 0.018 * Math.sin(2 * Math.PI * (0.22 + 0.35 * sm.ex) * simT);
          pushSample(ecg(tau, curP) + ecg(tau + prevP, prevP) + wander);
        }

        var hr = 60 / curP, m = mechanics(hr);
        drawGrid(); drawTrace();

        /* heart glyph contracts in systole */
        var since = simT - lastBeat;
        var p = clamp(1 - since / 0.30, 0, 1);
        heartEl.style.transform = "scale(" + (1 + 0.16 * p * p) + ")";
        heartEl.style.opacity = String(0.72 + 0.28 * p);

        if (ts - lastRead > 80) { readouts(hr, m, false); lastRead = ts; }
      }
      var lastRead = 0;

      var ro = null;
      if (window.ResizeObserver) { ro = new ResizeObserver(function () { resize(); }); ro.observe(can); }
      var onWinResize = function () { resize(); };
      window.addEventListener("resize", onWinResize);
      var themeMo = onThemeChange(function () { pal.flush(); if (!motion) staticStrip(); });

      sliderChange();
      resize();
      if (motion) {
        raf = requestAnimationFrame(frame);
      } else {
        heartEl.style.transform = "";
        staticStrip();
      }

      return {
        dispose: function () {
          cancelAnimationFrame(raf);
          if (ro) ro.disconnect();
          window.removeEventListener("resize", onWinResize);
          themeMo.disconnect();
          sEx.removeEventListener("input", sliderChange);
          sAd.removeEventListener("input", sliderChange);
          sAge.removeEventListener("input", sliderChange);
          pal.destroy();
          buf = null;
          if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
          if (root.parentNode) root.parentNode.removeChild(root);
        }
      };
    }
  });
})();
