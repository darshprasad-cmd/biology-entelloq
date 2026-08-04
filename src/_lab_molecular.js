/* ============================================================================
   Biology Entelloq — THE MOLECULAR BENCH
   Three real, runnable benches registered into the LABS shell (_labs.js):

     dna-extraction      — the five-reagent protocol, in order, with the
                           chemistry of every reagent and a spoolable pellet.
     gel-electrophoresis — pour a gel, load wells, set field and time, run it,
                           then size an unknown off the ladder's standard curve.
     pcr                 — a thermocycler with real efficiency physics: wrong
                           annealing temperature really does cost you the yield.

   Plain browser JS. No imports, no exports, no build step, no network.
   All colour comes from CSS custom properties so light and dark both work.
   ========================================================================== */
(function () {
  "use strict";

  if (typeof LABS === "undefined" || !LABS || !LABS.register) return;

  /* ======================================================================
     shared utilities (scoped to this file — nothing leaks to window)
     ====================================================================== */

  var MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  var SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  var VARS = ["--em", "--cy", "--indigo", "--violet", "--amber", "--rose",
              "--ink", "--dim", "--faint", "--line", "--panel", "--bg-2", "--bg"];

  function reduced() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  /* Live palette: reads the theme tokens, and re-reads them when the theme
     flips so canvas drawings follow light/dark like the rest of the page. */
  function palette(onChange) {
    var c = {};
    function read() {
      var s = getComputedStyle(document.documentElement);
      for (var i = 0; i < VARS.length; i++) {
        var k = VARS[i];
        var v = (s.getPropertyValue(k) || "").trim();
        c[k.slice(2)] = v || "#8899a0";
      }
    }
    read();
    var mo = new MutationObserver(function () { read(); if (onChange) onChange(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return { c: c, dispose: function () { mo.disconnect(); } };
  }

  function toRGB(col) {
    col = (col || "").trim();
    if (col.charAt(0) === "#") {
      var hex = col.slice(1);
      if (hex.length === 3) hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
      var n = parseInt(hex, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
    }
    var m = col.match(/rgba?\(([^)]+)\)/);
    if (m) {
      var p = m[1].split(/[,\s\/]+/).filter(Boolean).map(parseFloat);
      return [p[0] || 0, p[1] || 0, p[2] || 0, p.length > 3 ? p[3] : 1];
    }
    return [136, 153, 160, 1];
  }
  function alpha(col, a) {
    var p = toRGB(col);
    return "rgba(" + Math.round(p[0]) + "," + Math.round(p[1]) + "," + Math.round(p[2]) + "," + (p[3] * a) + ")";
  }
  function mix(a, b, t) {
    var x = toRGB(a), y = toRGB(b);
    return "rgb(" + Math.round(x[0] + (y[0] - x[0]) * t) + "," +
                    Math.round(x[1] + (y[1] - x[1]) * t) + "," +
                    Math.round(x[2] + (y[2] - x[2]) * t) + ")";
  }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3); }

  /* deterministic pseudo-random so a redraw never re-shuffles the scene */
  function rnd(seed) {
    var s = seed * 9301 + 49297;
    s = (s % 233280) / 233280;
    return s - Math.floor(s);
  }

  var SUP = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
              "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
  function sup(n) {
    return String(n).split("").map(function (ch) { return SUP[ch] || ch; }).join("");
  }
  function sci(n, digits) {
    if (!isFinite(n) || n <= 0) return "0";
    if (n < 1000) return n.toFixed(n < 10 ? 1 : 0);
    var e = Math.floor(Math.log10(n));
    var m = n / Math.pow(10, e);
    return m.toFixed(digits == null ? 2 : digits) + "×10" + sup(e);
  }
  function group(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  /* one <style> per mounted lab, removed on dispose */
  function styleTag(id, text) {
    var s = document.createElement("style");
    s.id = id;
    s.textContent = text;
    document.head.appendChild(s);
    return { dispose: function () { if (s.parentNode) s.parentNode.removeChild(s); } };
  }

  /* HiDPI canvas that follows its host's width, with a height function */
  function mountCanvas(hostEl, heightFor, onResize, label) {
    var cv = document.createElement("canvas");
    cv.setAttribute("role", "img");
    cv.setAttribute("aria-label", label || "");
    cv.style.width = "100%";
    cv.style.display = "block";
    hostEl.appendChild(cv);
    var ctx = cv.getContext("2d");
    var st = { w: 0, h: 0, dpr: 1 };
    function size() {
      var w = Math.max(260, Math.round(hostEl.clientWidth || hostEl.getBoundingClientRect().width || 320));
      var h = Math.round(heightFor(w));
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w === st.w && h === st.h && dpr === st.dpr) return false;
      st.w = w; st.h = h; st.dpr = dpr;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }
    size();
    var ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () { if (size() && onResize) onResize(); });
      ro.observe(hostEl);
    }
    function onWin() { if (size() && onResize) onResize(); }
    if (!ro) window.addEventListener("resize", onWin);
    return {
      cv: cv, ctx: ctx, st: st, size: size,
      say: function (t) { cv.setAttribute("aria-label", t); },
      dispose: function () {
        if (ro) ro.disconnect(); else window.removeEventListener("resize", onWin);
        if (cv.parentNode) cv.parentNode.removeChild(cv);
      }
    };
  }

  /* rAF loop that only paints when something changed or something is moving */
  function ticker(step) {
    var raf = 0, last = 0, stopped = false;
    function frame(t) {
      if (stopped) return;
      raf = requestAnimationFrame(frame);
      var dt = last ? Math.min(0.064, (t - last) / 1000) : 0.016;
      last = t;
      step(dt, t / 1000);
    }
    raf = requestAnimationFrame(frame);
    return { dispose: function () { stopped = true; cancelAnimationFrame(raf); } };
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function label(ctx, text, x, y, col, size, align, weight) {
    ctx.font = (weight || 400) + " " + (size || 11) + "px " + MONO;
    ctx.fillStyle = col;
    ctx.textAlign = align || "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  }

  /* chips / sliders built as real buttons + range inputs = keyboard native */
  function chipRow(items, current, onPick, cls) {
    return '<div class="bx-chips">' + items.map(function (it) {
      var on = it.v === current;
      return '<button type="button" class="bx-btn ' + (cls || "") + (on ? " on" : "") +
        '" data-v="' + it.v + '" aria-pressed="' + on + '"' +
        (it.title ? ' title="' + it.title + '"' : "") + '>' + it.t + "</button>";
    }).join("") + "</div>";
  }
  function syncChips(root, sel, current) {
    var ns = root.querySelectorAll(sel);
    for (var i = 0; i < ns.length; i++) {
      var on = ns[i].getAttribute("data-v") === String(current);
      ns[i].classList.toggle("on", on);
      ns[i].setAttribute("aria-pressed", String(on));
    }
  }

  /* ======================================================================
     LAB 1 — DNA EXTRACTION
     ====================================================================== */

  var EX_STEPS = [
    {
      k: "lyse",
      btn: "1 · Add lysis buffer (detergent)",
      short: "Lyse",
      did: "Detergent added — membranes dissolving",
      why: "Dish detergent / SDS is amphipathic: a charged head, a greasy tail. The tails " +
           "bury themselves in the phospholipid bilayer and pull the lipids away into micelles. " +
           "The plasma membrane and then the nuclear envelope come apart, spilling DNA, RNA, " +
           "protein and lipid into one cloudy homogenate."
    },
    {
      k: "salt",
      btn: "2 · Add NaCl to 1.5 M",
      short: "Salt",
      did: "Salt in — phosphate backbone screened",
      why: "Every nucleotide carries one negative phosphate — a charge every 0.34 nm along " +
           "the backbone — so strands repel each other and stay dispersed. Na⁺ ions crowd " +
           "into that field and screen the charge, letting strands approach each other. The salt " +
           "also keeps digested protein and polysaccharide soluble so they stay behind later."
    },
    {
      k: "prot",
      btn: "3 · Proteinase K, 15 min at 56 °C",
      short: "Protease",
      did: "Protein digested — naked DNA in solution",
      why: "Genomic DNA is wrapped round histones, which are lysine- and arginine-rich and cling " +
           "to the backbone electrostatically; DNases in the same lysate would shred the DNA. " +
           "Proteinase K is a broad serine protease that stays active in detergent and at 56 °C — " +
           "it strips the histones and destroys the nucleases in one move."
    },
    {
      k: "eth",
      btn: "4 · Layer ice-cold 95% ethanol",
      short: "Ethanol",
      did: "Ethanol layered — DNA precipitating at the interface",
      why: "Water (dielectric constant 80) surrounds and stabilises the charged backbone. Ethanol " +
           "(dielectric constant 24) cannot — it strips the hydration shell. With Na⁺ already " +
           "neutralising the charge, the DNA has nothing keeping it in solution and drops out as a " +
           "solid exactly where the two liquids meet. Cold makes it less soluble still and slows any surviving enzyme."
    },
    {
      k: "spool",
      btn: "5 · Spool onto a glass rod",
      short: "Spool",
      did: "DNA spooled — visible white threads on the rod",
      why: "Genomic DNA is absurdly long — human chromosome 1 is about 8.5 cm of contour length in " +
           "one molecule — so the precipitate is threads, not powder, and it winds onto a rod. " +
           "Short RNA and degraded fragments do not spool; they stay behind in the tube. That is why " +
           "spooled DNA is mostly intact, high-molecular-weight genomic DNA."
    }
  ];

  var EX_SAMPLES = {
    straw: { name: "Strawberry", yield: 38, note: "octoploid (8 chromosome sets) and soft — the classic high-yield source", tint: "rose", a260: 1.81 },
    onion: { name: "Onion", yield: 12, note: "diploid but huge genome (16 Gb); tough cell walls need mashing", tint: "em", a260: 1.84 },
    cheek: { name: "Cheek cells", yield: 2.4, note: "a saline rinse gives ~1 million diploid cells — low but human", tint: "indigo", a260: 1.76 }
  };
  var EX_ETH = { "-20": { f: 1.0, t: "−20 °C" }, "4": { f: 0.82, t: "4 °C" }, "22": { f: 0.46, t: "22 °C" } };

  LABS.register("dna-extraction", {
    title: "DNA extraction, reagent by reagent",
    tag: "Molecular bench",
    color: "#34d399",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">' +
          '<path d="M8 3c0 5 8 5 8 9s-8 4-8 9"/><path d="M16 3c0 5-8 5-8 9s8 4 8 9"/>' +
          '<path d="M9.2 7h5.6M8.2 11h7.6M9.2 15h5.6"/></svg>',
    blurb: "Run the real protocol on real tissue: detergent, salt, protease, ice-cold ethanol, rod. " +
           "Every reagent has a job, the order is chemistry rather than tradition, and the DNA spools out white at the interface.",

    build: function (host) {
      var css = styleTag("mlx-dnax-css",
        ".mlxd .mlx-step{width:100%;text-align:left;font:inherit;background:transparent;cursor:pointer;align-items:center}" +
        ".mlxd .mlx-step:hover:not(:disabled){border-color:var(--hair);color:var(--ink)}" +
        ".mlxd .mlx-step:disabled{cursor:default}" +
        ".mlxd .mlx-step .lbl{flex:1}" +
        ".mlxd .mlx-bad{border-left-color:var(--amber)}" +
        ".mlxd .mlx-yield{display:grid;grid-template-columns:1fr 1fr;gap:10px}" +
        ".mlxd .mlx-cell{border:1px solid var(--line);border-radius:11px;padding:10px 12px}" +
        ".mlxd .mlx-cell .k{font-family:" + MONO + ";font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--faint)}" +
        ".mlxd .mlx-cell .v{font-family:" + MONO + ";font-size:17px;font-weight:700;color:var(--ink);margin-top:3px}"
      );

      host.innerHTML =
        '<div class="bx mlxd">' +
          '<div class="bx-view" id="mlxdView"></div>' +
          '<div class="bx-side">' +
            '<div class="bx-grp"><label id="mlxdSampleLbl">Source tissue</label><div id="mlxdSample"></div>' +
              '<div class="bx-note" id="mlxdSampleNote"></div></div>' +
            '<div class="bx-grp"><label>Ethanol temperature</label><div id="mlxdEth"></div></div>' +
            '<div class="bx-grp"><label>Protocol — each step in order</label>' +
              '<div class="bx-steps" id="mlxdSteps"></div></div>' +
            '<div class="bx-read" id="mlxdRead"></div>' +
            '<div id="mlxdYield"></div>' +
            '<div class="bx-chips"><button type="button" class="bx-btn" id="mlxdReset">Fresh tube</button></div>' +
          '</div>' +
        '</div>' +
        '<div class="bx-verdict" id="mlxdSay"></div>' +
        '<p class="bx-note" style="margin-top:14px"><b>What this shows.</b> Extraction is four chemical problems solved in ' +
        'sequence: get through two lipid membranes, neutralise the charge on the backbone, take the protein off, then take ' +
        'the water away. Do them out of order and the failure is specific and predictable — try it and the bench will tell ' +
        'you exactly which physics you broke.</p>';

      var view = host.querySelector("#mlxdView");
      var elSteps = host.querySelector("#mlxdSteps");
      var elRead = host.querySelector("#mlxdRead");
      var elSay = host.querySelector("#mlxdSay");
      var elYield = host.querySelector("#mlxdYield");
      var elSample = host.querySelector("#mlxdSample");
      var elSampleNote = host.querySelector("#mlxdSampleNote");
      var elEth = host.querySelector("#mlxdEth");

      var S = {
        done: [],          // keys, in the order they were completed
        started: {},       // key -> clock time the step began
        sample: "straw",
        eth: "-20",
        clock: 0,
        dirty: true
      };

      /* scene particles — normalised coords, so resizing never reshuffles */
      var cells = [], strands = [], salt = [];
      var i;
      for (i = 0; i < 34; i++) cells.push({ u: rnd(i * 3.1) * 2 - 1, v: rnd(i * 7.7), r: 0.5 + rnd(i * 11.3) * 0.9, ph: rnd(i * 5.5) * 6.28 });
      for (i = 0; i < 30; i++) strands.push({ u: rnd(i * 2.3) * 2 - 1, v: rnd(i * 9.1), s: rnd(i * 4.4), len: 0.5 + rnd(i * 6.6) * 0.6 });
      for (i = 0; i < 22; i++) salt.push({ u: rnd(i * 13.7) * 2 - 1, d: rnd(i * 3.3) });

      function has(k) { return S.done.indexOf(k) >= 0; }
      function prog(k, dur) {
        if (!has(k)) return 0;
        if (reduced()) return 1;
        return clamp((S.clock - (S.started[k] || 0)) / dur, 0, 1);
      }
      function animating() {
        if (reduced()) return false;
        for (var j = 0; j < S.done.length; j++) {
          if (S.clock - (S.started[S.done[j]] || 0) < 2.6) return true;
        }
        return S.done.length > 0 && S.done.length < 5 ? false : false;
      }

      /* ---- wrong-order explanations: honest chemistry, not a buzzer ---- */
      function explain(k) {
        var L = has("lyse"), Sa = has("salt"), P = has("prot"), E = has("eth");
        if (k === "salt" && !L) return ["Salt into intact cells does nothing",
          "NaCl can only screen phosphate charge on DNA it can reach. Right now every genome in the tube is still " +
          "behind a plasma membrane and a nuclear envelope. Break the membranes first — the salt is for DNA that is already in solution."];
        if (k === "prot" && !L) return ["Proteinase K cannot get in",
          "An enzyme this size does not cross an intact lipid bilayer. It will happily chew whatever protein is loose in the " +
          "buffer, but the histones you actually care about are inside a closed nucleus. Lyse first."];
        if (k === "prot" && !Sa) return ["Survivable — but the salt belongs in first",
          "Proteinase K works fine without extra NaCl, so this is not a disaster. The reason salt goes first: the moment histones " +
          "come off, the DNA is bare charged backbone, it stretches, and long genomic molecules shear on the least stirring. " +
          "Screen the charge first and the DNA stays compact. The salt also keeps the peptide fragments soluble so they do not " +
          "co-precipitate with your DNA later."];
        if (k === "eth" && !L) return ["Ethanol onto whole cells just fixes them",
          "This is essentially how you fix a specimen for microscopy: alcohol dehydrates and denatures, and the DNA stays " +
          "locked inside a stiffened cell. Nothing precipitates at the interface because nothing is in solution."];
        if (k === "eth" && !Sa) return ["No salt, no spoolable pellet",
          "Without Na⁺ screening, the phosphate backbones still repel each other. Ethanol will drive the DNA out of solution, " +
          "but as a fine colloidal haze of separate molecules that never aggregates — a cloudy tube you cannot wind onto anything. " +
          "This is the single most common reason a school extraction 'fails'."];
        if (k === "eth" && !P) return ["You would precipitate the protein too",
          "Skip the protease and the histones ride out of solution still bound to the DNA, along with any active DNases. " +
          "You get a gummy, off-white mass with an A₂₆₀/A₂₈₀ near 1.5 instead of 1.8 — and the nucleases wake up the moment you rehydrate it."];
        if (k === "spool" && !E) return ["There is nothing solid to catch",
          "DNA in solution is molecularly dispersed — invisible, a few nanometres wide. A rod passes straight through it. " +
          "Only precipitated DNA is a phase you can wind up."];
        if (k === "spool" && !P) return ["Nothing to spool yet",
          "You have not precipitated anything. Finish the digestion, then layer the alcohol."];
        return ["Out of order", "Complete the highlighted step first — each one sets up the chemistry the next one needs."];
      }

      /* ------------------------------ actions ------------------------------ */
      function attempt(k) {
        if (has(k)) return;
        var expected = EX_STEPS[S.done.length] ? EX_STEPS[S.done.length].k : null;
        if (k === expected) {
          S.done.push(k);
          S.started[k] = S.clock;
          var st = EX_STEPS.filter(function (s) { return s.k === k; })[0];
          say(true, st.did, st.why);
        } else {
          var e = explain(k);
          say(false, e[0], e[1]);
        }
        S.dirty = true;
        render();
      }
      function say(ok, title, text) {
        elSay.className = "bx-verdict" + (ok ? "" : " mlx-bad");
        elSay.innerHTML = "<b>" + title + ".</b> " + text;
      }

      /* ------------------------------ rendering ---------------------------- */
      function render() {
        var nextIdx = S.done.length;
        elSteps.innerHTML = EX_STEPS.map(function (s, idx) {
          var cls = has(s.k) ? "done" : (idx === nextIdx ? "now" : "");
          return '<button type="button" class="bx-step mlx-step ' + cls + '" data-k="' + s.k + '"' +
                 (has(s.k) ? " disabled" : "") + '>' +
                 '<span class="n">' + (has(s.k) ? "✓" : (idx + 1)) + "</span>" +
                 '<span class="lbl">' + s.btn.replace(/^\d+ · /, "") + "</span></button>";
        }).join("");
        Array.prototype.forEach.call(elSteps.querySelectorAll(".mlx-step"), function (b) {
          b.addEventListener("click", onStepClick);
        });

        var smp = EX_SAMPLES[S.sample];
        elSample.innerHTML = chipRow(Object.keys(EX_SAMPLES).map(function (k) {
          return { v: k, t: EX_SAMPLES[k].name };
        }), S.sample, null, "mlxd-s");
        elSampleNote.textContent = smp.name + " — " + smp.note + ".";
        elEth.innerHTML = chipRow([
          { v: "-20", t: "−20 °C freezer" }, { v: "4", t: "4 °C fridge" }, { v: "22", t: "22 °C bench" }
        ], S.eth, null, "mlxd-e");
        Array.prototype.forEach.call(elSample.querySelectorAll("button"), function (b) {
          b.disabled = S.done.length > 0;
          b.addEventListener("click", function () { S.sample = b.getAttribute("data-v"); S.dirty = true; render(); });
        });
        Array.prototype.forEach.call(elEth.querySelectorAll("button"), function (b) {
          b.disabled = has("eth");
          b.addEventListener("click", function () { S.eth = b.getAttribute("data-v"); S.dirty = true; render(); });
        });

        var lines = [];
        lines.push("<b>In the tube</b>");
        lines.push("cells: " + (has("lyse") ? "lysed — membranes in micelles" : "intact"));
        lines.push("[Na⁺]: " + (has("salt") ? "1.5 M — backbone screened" : "~10 mM — backbone fully charged"));
        lines.push("protein: " + (has("prot") ? "digested to peptides" : "histones still bound"));
        lines.push("DNA phase: " + (has("spool") ? "on the rod" : has("eth") ? "precipitating at the interface" :
                    has("lyse") ? "dissolved, invisible" : "packaged in nuclei"));
        elRead.innerHTML = lines.join("<br>");

        if (has("spool")) {
          var y = smp.yield * EX_ETH[S.eth].f;
          var conc = y / 0.2; /* resuspended in 200 uL -> ng/uL */
          elYield.innerHTML =
            '<div class="mlx-yield">' +
            '<div class="mlx-cell"><div class="k">Yield</div><div class="v">' + y.toFixed(1) + " µg</div></div>" +
            '<div class="mlx-cell"><div class="k">In 200 µL TE</div><div class="v">' + Math.round(conc) + " ng/µL</div></div>" +
            '<div class="mlx-cell"><div class="k">A₂₆₀/A₂₈₀</div><div class="v">' + smp.a260.toFixed(2) + "</div></div>" +
            '<div class="mlx-cell"><div class="k">Fragment size</div><div class="v">&gt;50 kb</div></div>" +
            "</div>" +
            '<p class="bx-note" style="margin-top:10px">Ethanol at ' + EX_ETH[S.eth].t + " recovers " +
            Math.round(EX_ETH[S.eth].f * 100) + "% of what a −20 °C precipitation would give. " +
            "Pure DNA reads 1.8; protein contamination drags the ratio down toward 1.5, RNA pushes it above 2.0.</p>";
        } else {
          elYield.innerHTML = "";
        }
        S.dirty = true;
      }
      function onStepClick(e) { attempt(e.currentTarget.getAttribute("data-k")); }

      /* ------------------------------ the tube ---------------------------- */
      var canvas = mountCanvas(view, function (w) { return clamp(w * 0.66, 320, 430); }, function () { S.dirty = true; }, "Extraction tube");

      function draw() {
        var ctx = canvas.ctx, W = canvas.st.w, H = canvas.st.h, C = pal.c;
        ctx.clearRect(0, 0, W, H);

        var showInset = W > 470;
        var tubeArea = showInset ? W * 0.46 : W;
        var tubeW = clamp(tubeArea * 0.42, 84, 132);
        var cx = tubeArea * 0.5;
        var top = H * 0.10, tubeH = H * 0.80, bot = top + tubeH, r = tubeW / 2;

        /* glass */
        function tubePath(inset) {
          var w = tubeW - inset * 2, rr = w / 2, x = cx - w / 2, t = top + inset, b = bot - inset;
          ctx.beginPath();
          ctx.moveTo(x, t);
          ctx.lineTo(x, b - rr);
          ctx.arc(cx, b - rr, rr, Math.PI, 0, true);
          ctx.lineTo(x + w, t);
        }
        ctx.save();
        tubePath(0);
        ctx.closePath();
        ctx.fillStyle = alpha(C.ink, 0.03);
        ctx.fill();

        /* liquid geometry */
        var aq = 0.40 + (has("lyse") ? 0.08 * prog("lyse", 1.1) : 0) +
                        (has("salt") ? 0.05 * prog("salt", 1.0) : 0) +
                        (has("prot") ? 0.04 * prog("prot", 1.0) : 0);
        var ethP = prog("eth", 1.5);
        var ethF = has("eth") ? 0.30 * ethP : 0;
        var yInt = bot - tubeH * aq;
        var yEth = yInt - tubeH * ethF;

        ctx.save();
        tubePath(2); ctx.closePath(); ctx.clip();

        /* aqueous phase */
        var turb = !has("lyse") ? 0.14 : (has("prot") ? 0.30 : 0.55);
        var tint = C[EX_SAMPLES[S.sample].tint] || C.em;
        var g = ctx.createLinearGradient(0, yInt, 0, bot);
        g.addColorStop(0, alpha(mix(C["bg-2"], tint, 0.18 + turb * 0.35), 0.95));
        g.addColorStop(1, alpha(mix(C["bg-2"], tint, 0.10 + turb * 0.30), 0.98));
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, yInt, tubeW, bot - yInt + 4);

        /* ethanol phase */
        if (ethF > 0.002) {
          var ge = ctx.createLinearGradient(0, yEth, 0, yInt);
          ge.addColorStop(0, alpha(mix(C["bg-2"], C.cy, 0.10), 0.55));
          ge.addColorStop(1, alpha(mix(C["bg-2"], C.cy, 0.18), 0.72));
          ctx.fillStyle = ge;
          ctx.fillRect(cx - r, yEth, tubeW, yInt - yEth);
          ctx.strokeStyle = alpha(C.cy, 0.55);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cx - r, yInt); ctx.lineTo(cx + r, yInt); ctx.stroke();
        }

        /* cells / debris in the aqueous layer */
        var lysP = prog("lyse", 1.2);
        for (i = 0; i < cells.length; i++) {
          var c0 = cells[i];
          var px = cx + c0.u * (r - 10);
          var py = lerp(bot - 8, yInt + 8, c0.v);
          var wob = reduced() ? 0 : Math.sin(S.clock * 0.9 + c0.ph) * 2.2;
          var rad = c0.r * 3.4 * (1 - lysP * 0.85);
          if (rad < 0.3) continue;
          ctx.beginPath();
          ctx.arc(px + wob, py, rad, 0, 6.2832);
          ctx.fillStyle = alpha(tint, (1 - lysP * 0.7) * 0.55);
          ctx.fill();
          if (!has("lyse")) {
            ctx.beginPath();
            ctx.arc(px + wob, py, rad * 0.42, 0, 6.2832);
            ctx.fillStyle = alpha(C.ink, 0.30);
            ctx.fill();
          }
        }

        /* salt crystals dissolving */
        if (has("salt")) {
          var sp = prog("salt", 1.4);
          for (i = 0; i < salt.length; i++) {
            var s0 = salt[i];
            var t0 = clamp((sp - s0.d * 0.35) / 0.6, 0, 1);
            if (t0 <= 0 || t0 >= 1) continue;
            var sy = lerp(yInt + 6, bot - 12, ease(t0));
            ctx.fillStyle = alpha(C.ink, 0.5 * (1 - t0));
            ctx.fillRect(cx + s0.u * (r - 14) - 1.2, sy - 1.2, 2.4, 2.4);
          }
        }

        /* DNA strands */
        if (has("lyse")) {
          var spoolP = prog("spool", 1.6);
          var rodY = lerp(top - 30, yInt - 6, ease(prog("spool", 0.8)));
          for (i = 0; i < strands.length; i++) {
            var st0 = strands[i];
            var free = has("eth") ? 0 : 1;
            var homeX = cx + st0.u * (r - 12);
            var homeY = lerp(bot - 14, yInt + 10, st0.v);
            /* after ethanol they gather at the interface */
            var gx = cx + st0.u * (r - 16) * 0.85;
            var gy = yInt - 4 - (rnd(i * 17.1) * 12) * ethP;
            var x = lerp(homeX, gx, ease(ethP));
            var y = lerp(homeY, gy, ease(ethP));
            /* spooling: wind onto the rod */
            if (has("spool")) {
              var ang = i / strands.length * 6.2832 + S.clock * (reduced() ? 0 : 1.6);
              var rr2 = 7 + rnd(i * 4.9) * 7;
              x = lerp(x, cx + Math.cos(ang) * rr2, ease(spoolP));
              y = lerp(y, rodY + 12 + Math.sin(ang) * rr2 * 0.5, ease(spoolP));
            }
            var vis = has("eth") ? lerp(0.18, 0.95, ease(ethP)) : 0.16 * lysP;
            var col = has("eth") ? mix(C.ink, "#ffffff", 0.55) : alpha(C.ink, 1);
            ctx.strokeStyle = alpha(col, vis * (free ? 0.7 : 1));
            ctx.lineWidth = has("eth") ? 1.7 : 1.0;
            ctx.lineCap = "round";
            var sw = 9 * st0.len, ph = st0.s * 6.28 + (reduced() ? 0 : S.clock * 0.7);
            ctx.beginPath();
            for (var q = 0; q <= 10; q++) {
              var tq = q / 10;
              var xx = x - sw / 2 + sw * tq;
              var yy = y + Math.sin(ph + tq * 5.4) * 3.1;
              if (q === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
          }

          /* the glass rod */
          if (has("spool")) {
            ctx.strokeStyle = alpha(C.ink, 0.35);
            ctx.lineWidth = 5;
            ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(cx, top - 26); ctx.lineTo(cx, rodY + 14); ctx.stroke();
            ctx.strokeStyle = alpha(C.ink, 0.14);
            ctx.lineWidth = 9;
            ctx.beginPath(); ctx.moveTo(cx, top - 26); ctx.lineTo(cx, rodY + 14); ctx.stroke();
          }
        }
        ctx.restore();

        /* glass outline + highlight */
        tubePath(0);
        ctx.strokeStyle = alpha(C.ink, 0.22);
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - r + 7, top + 16); ctx.lineTo(cx - r + 7, bot - r - 8);
        ctx.strokeStyle = alpha(C.ink, 0.10);
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        /* phase labels */
        if (ethF > 0.03) {
          label(ctx, "95% ethanol, " + EX_ETH[S.eth].t, cx + r + 8, (yEth + yInt) / 2, alpha(C.faint, 1), 10.5, "left");
        }
        label(ctx, has("lyse") ? "lysate" : EX_SAMPLES[S.sample].name.toLowerCase() + " slurry",
              cx + r + 8, (yInt + bot) / 2, alpha(C.faint, 1), 10.5, "left");
        if (has("eth")) {
          label(ctx, "◂ interface", cx - r - 8, yInt, alpha(C.cy, 1), 10.5, "right");
        }

        /* molecular inset */
        if (showInset) drawInset(ctx, W * 0.50, H * 0.12, W * 0.46, H * 0.76, C);

        var stage = S.done.length ? EX_STEPS[S.done.length - 1].did : "Fresh " + EX_SAMPLES[S.sample].name.toLowerCase() + " homogenate, nothing added yet";
        canvas.say("Extraction tube. " + stage + ".");
      }

      /* the little schematic that shows what the current reagent is doing */
      function drawInset(ctx, x, y, w, h, C) {
        roundRect(ctx, x, y, w, h, 14);
        ctx.fillStyle = alpha(C.ink, 0.025);
        ctx.fill();
        ctx.strokeStyle = alpha(C.ink, 0.10);
        ctx.lineWidth = 1;
        ctx.stroke();

        var k = S.done.length ? S.done[S.done.length - 1] : null;
        var titles = { lyse: "Detergent × bilayer", salt: "Na⁺ screening the backbone",
                       prot: "Proteinase K × histone", eth: "Ethanol vs water", spool: "Winding a metre of DNA" };
        label(ctx, k ? titles[k] : "Molecular view", x + 14, y + 18, alpha(C.faint, 1), 10, "left", 500);

        var cx = x + w / 2, cy = y + h * 0.55, sw = w - 40;
        ctx.lineCap = "round";

        if (!k) {
          /* a packed nucleus */
          ctx.strokeStyle = alpha(C.ink, 0.22); ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.arc(cx, cy, Math.min(sw, h) * 0.26, 0, 6.2832); ctx.stroke();
          for (var a = 0; a < 8; a++) {
            var an = a / 8 * 6.2832;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(an) * 14, cy + Math.sin(an) * 14, 5, 0, 6.2832);
            ctx.fillStyle = alpha(C.indigo, 0.45); ctx.fill();
          }
          label(ctx, "chromatin, still inside the nucleus", cx, y + h - 22, alpha(C.faint, 1), 10, "center");
          return;
        }

        if (k === "lyse") {
          /* bilayer being pulled apart, micelle on the right */
          var yTop = cy - 22, yBot = cy + 22, gap = ease(prog("lyse", 1.4)) * sw * 0.30;
          for (var side = 0; side < 2; side++) {
            var x0 = side ? cx + gap / 2 : x + 20;
            var x1 = side ? x + w - 20 : cx - gap / 2;
            for (var px = x0; px < x1; px += 8) {
              [yTop, yBot].forEach(function (yy, ii) {
                ctx.beginPath(); ctx.arc(px, yy, 3, 0, 6.2832);
                ctx.fillStyle = alpha(C.amber, 0.55); ctx.fill();
                ctx.strokeStyle = alpha(C.amber, 0.4); ctx.lineWidth = 1.1;
                ctx.beginPath(); ctx.moveTo(px, yy + (ii ? -3 : 3)); ctx.lineTo(px, yy + (ii ? -14 : 14)); ctx.stroke();
              });
            }
          }
          var mx = cx, my = cy;
          if (gap > 4) {
            for (var m = 0; m < 9; m++) {
              var ma = m / 9 * 6.2832;
              ctx.beginPath(); ctx.arc(mx + Math.cos(ma) * 13, my + Math.sin(ma) * 13, 3, 0, 6.2832);
              ctx.fillStyle = alpha(C.em, 0.8); ctx.fill();
              ctx.strokeStyle = alpha(C.em, 0.55); ctx.lineWidth = 1.1;
              ctx.beginPath();
              ctx.moveTo(mx + Math.cos(ma) * 11, my + Math.sin(ma) * 11);
              ctx.lineTo(mx + Math.cos(ma) * 3, my + Math.sin(ma) * 3);
              ctx.stroke();
            }
          }
          label(ctx, "detergent micelle carries the lipid away", cx, y + h - 22, alpha(C.faint, 1), 10, "center");
          return;
        }

        if (k === "salt") {
          ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 2;
          ctx.beginPath();
          for (var q2 = 0; q2 <= 40; q2++) {
            var t2 = q2 / 40, xx2 = x + 22 + t2 * (w - 44), yy2 = cy + Math.sin(t2 * 9) * 12;
            if (!q2) ctx.moveTo(xx2, yy2); else ctx.lineTo(xx2, yy2);
          }
          ctx.stroke();
          for (var s2 = 0; s2 < 9; s2++) {
            var ts = (s2 + 0.5) / 9;
            var sx = x + 22 + ts * (w - 44), sy = cy + Math.sin(ts * 9) * 12;
            label(ctx, "−", sx, sy - 12, alpha(C.rose, 0.95), 12, "center", 700);
            var pp = ease(prog("salt", 1.3));
            var nx = lerp(sx, sx, 1), ny = lerp(sy - 34, sy - 20, pp);
            ctx.beginPath(); ctx.arc(nx, ny, 6.5, 0, 6.2832);
            ctx.fillStyle = alpha(C.cy, 0.20 + 0.45 * pp); ctx.fill();
            label(ctx, "Na⁺", nx, ny, alpha(C.cy, 1), 8.5, "center", 700);
          }
          label(ctx, "screened charge → strands can pack together", cx, y + h - 22, alpha(C.faint, 1), 10, "center");
          return;
        }

        if (k === "prot") {
          var pk = ease(prog("prot", 1.4));
          ctx.strokeStyle = alpha(C.ink, 0.45); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x + 22, cy); ctx.lineTo(x + w - 22, cy); ctx.stroke();
          for (var hn = 0; hn < 4; hn++) {
            var hx = x + 40 + hn * ((w - 80) / 3);
            var lift = pk * (18 + hn * 6);
            ctx.beginPath(); ctx.arc(hx, cy - 12 - lift, 10 * (1 - pk * 0.55), 0, 6.2832);
            ctx.fillStyle = alpha(C.indigo, 0.55 * (1 - pk * 0.5)); ctx.fill();
            if (pk > 0.2) {
              for (var f2 = 0; f2 < 3; f2++) {
                ctx.beginPath();
                ctx.arc(hx + (f2 - 1) * 9 * pk, cy - 12 - lift - 14 * pk, 2.4, 0, 6.2832);
                ctx.fillStyle = alpha(C.indigo, 0.5 * pk); ctx.fill();
              }
            }
          }
          label(ctx, "histones cut to peptides, DNA left bare", cx, y + h - 22, alpha(C.faint, 1), 10, "center");
          return;
        }

        if (k === "eth") {
          var ep = ease(prog("eth", 1.6));
          var lx = x + w * 0.28, rx2 = x + w * 0.72;
          /* left: water-solvated, extended.  right: ethanol, collapsed */
          for (var sside = 0; sside < 2; sside++) {
            var ccx = sside ? rx2 : lx;
            var amp = sside ? lerp(11, 3, ep) : 11;
            ctx.strokeStyle = alpha(sside ? mix(C.ink, "#ffffff", 0.5) : C.ink, sside ? 0.75 : 0.42);
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (var q3 = 0; q3 <= 26; q3++) {
              var t3 = q3 / 26;
              var yy3 = cy - 40 + t3 * 80;
              var xx3 = ccx + Math.sin(t3 * 12) * amp;
              if (!q3) ctx.moveTo(xx3, yy3); else ctx.lineTo(xx3, yy3);
            }
            ctx.stroke();
            for (var d2 = 0; d2 < 10; d2++) {
              var da = d2 / 10 * 6.2832;
              var dr = 26 + (d2 % 3) * 5;
              ctx.beginPath();
              ctx.arc(ccx + Math.cos(da) * dr, cy + Math.sin(da) * dr * 0.9, 2.6, 0, 6.2832);
              ctx.fillStyle = sside ? alpha(C.amber, 0.55) : alpha(C.cy, 0.6);
              ctx.fill();
            }
            label(ctx, sside ? "ethanol ε=24" : "water ε=80", ccx, cy + 52, alpha(C.faint, 1), 10, "center");
          }
          label(ctx, "no hydration shell → DNA drops out of solution", cx, y + h - 20, alpha(C.faint, 1), 10, "center");
          return;
        }

        /* spool */
        var rot = reduced() ? 0 : S.clock * 1.2;
        ctx.strokeStyle = alpha(C.ink, 0.30); ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(cx, cy - 46); ctx.lineTo(cx, cy + 46); ctx.stroke();
        for (var wch = 0; wch < 16; wch++) {
          var wt = wch / 16;
          var wy = cy - 38 + wt * 76;
          ctx.strokeStyle = alpha(mix(C.ink, "#ffffff", 0.6), 0.75);
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.ellipse(cx, wy, 15 + Math.sin(wt * 8 + rot) * 3, 4.5, 0, 0, 6.2832);
          ctx.stroke();
        }
        label(ctx, "one strawberry cell ≈ 5 m of DNA end to end", cx, y + h - 22, alpha(C.faint, 1), 10, "center");
      }

      /* ------------------------------ wiring ------------------------------ */
      var pal = palette(function () { S.dirty = true; });

      host.querySelector("#mlxdReset").addEventListener("click", function () {
        S.done = []; S.started = {}; S.dirty = true;
        say(true, "Fresh tube", "Nothing added. Choose a source and start with the lysis buffer — every later reagent needs the membranes open first.");
        render();
      });

      render();
      say(true, "Ready", "Pick a source tissue and work down the protocol. Try a step early on purpose — the bench will tell you exactly what goes wrong chemically rather than just refusing.");

      var tick = ticker(function (dt) {
        S.clock += dt;
        var moving = false;
        if (!reduced()) {
          moving = true; /* gentle brownian drift keeps the tube alive */
        }
        if (S.dirty || moving) { draw(); S.dirty = false; }
      });

      return {
        dispose: function () {
          tick.dispose();
          canvas.dispose();
          pal.dispose();
          css.dispose();
          host.innerHTML = "";
        }
      };
    }
  });

  /* ======================================================================
     LAB 2 — AGAROSE GEL ELECTROPHORESIS
     ====================================================================== */

  var GEL_LEN = 8.0;          /* cm of gel below the wells */
  var ELECTRODE_GAP = 20.0;   /* cm between electrodes in the tank */

  var LADDER = [10000, 8000, 6000, 5000, 4000, 3000, 2000, 1500, 1000, 750, 500, 250];

  var SAMPLES = [
    { id: "lam", n: "λ DNA / HindIII", f: [23130, 9416, 6557, 4361, 2322, 2027, 564] },
    { id: "pbr", n: "pBR322, uncut", f: [4361] },
    { id: "pbrc", n: "pBR322 / EcoRI+BamHI", f: [3986, 375] },
    { id: "p500", n: "PCR product 500 bp", f: [500] },
    { id: "p1200", n: "PCR product 1200 bp", f: [1200] },
    { id: "gen", n: "Genomic DNA (sheared)", f: null, smear: [400, 20000] }
  ];

  LABS.register("gel-electrophoresis", {
    title: "Agarose gel electrophoresis",
    tag: "Molecular bench",
    color: "#38e0d8",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">' +
          '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M7 3v3M12 3v3M17 3v3"/>' +
          '<path d="M5.5 10h3M10.5 13h3M15.5 9h3M5.5 15h3M15.5 16h3"/></svg>',
    blurb: "Pour the gel, load the wells, choose the field and the run time, then watch DNA migrate. " +
           "Migration is logarithmic in fragment size — so you can size an unknown off the ladder's own standard curve.",

    build: function (host) {
      var css = styleTag("mlx-gel-css",
        ".mlxg .mlx-lanes{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}" +
        ".mlxg .mlx-lane{padding:8px 6px;border-radius:10px;border:1px solid var(--line);background:transparent;" +
          "cursor:pointer;font:inherit;color:var(--dim);text-align:center;transition:border-color .2s,color .2s,background .2s}" +
        ".mlxg .mlx-lane .ln{font-family:" + MONO + ";font-size:10px;letter-spacing:.1em;color:var(--faint);display:block}" +
        ".mlxg .mlx-lane .lc{font-size:11.5px;display:block;margin-top:2px;line-height:1.25}" +
        ".mlxg .mlx-lane.sel{border-color:color-mix(in srgb,var(--lc,var(--cy)) 55%,transparent);" +
          "background:color-mix(in srgb,var(--lc,var(--cy)) 11%,transparent);color:var(--ink)}" +
        ".mlxg .mlx-res{font-family:" + MONO + ";font-size:12px;color:var(--dim);display:flex;flex-direction:column;gap:5px;" +
          "max-height:210px;overflow:auto}" +
        ".mlxg .mlx-res button{font:inherit;text-align:left;background:transparent;border:1px solid var(--line);" +
          "border-radius:9px;padding:7px 10px;color:var(--dim);cursor:pointer}" +
        ".mlxg .mlx-res button:hover{color:var(--ink);border-color:var(--hair)}" +
        ".mlxg .mlx-res button.sel{color:var(--ink);border-color:color-mix(in srgb,var(--cy) 55%,transparent)}" +
        ".mlxg .mlx-warn{color:var(--amber)}"
      );

      /* three unknowns, drawn fresh for every visit */
      var pool = [2800, 620, 7400, 1350, 4900, 340, 9200, 1800, 3300, 780];
      var unknowns = [];
      (function () {
        var used = {};
        while (unknowns.length < 3) {
          var v = pool[Math.floor(Math.random() * pool.length)];
          if (used[v]) continue;
          used[v] = 1;
          unknowns.push({ id: "u" + unknowns.length, n: "Unknown " + "ABC".charAt(unknowns.length), f: [v], hidden: true, shown: false });
        }
      })();

      host.innerHTML =
        '<div class="bx mlxg">' +
          '<div class="bx-view" id="mlxgView"></div>' +
          '<div class="bx-side">' +
            '<div class="bx-grp"><label>Wells — pick one, then load it</label>' +
              '<div class="mlx-lanes" id="mlxgLanes"></div></div>' +
            '<div class="bx-grp"><label>Load into the selected well</label>' +
              '<div class="bx-chips" id="mlxgSamples"></div></div>' +
            '<div class="bx-grp"><label>Agarose <span class="bx-val" id="mlxgAgV"></span></label>' +
              '<input class="bx-slider" id="mlxgAg" type="range" min="0.5" max="2.5" step="0.1" value="1.0" aria-label="Agarose percentage"></div>' +
            '<div class="bx-grp"><label>Voltage <span class="bx-val" id="mlxgVV"></span></label>' +
              '<input class="bx-slider" id="mlxgV" type="range" min="20" max="180" step="5" value="100" aria-label="Voltage"></div>' +
            '<div class="bx-grp"><label>Run time <span class="bx-val" id="mlxgTV"></span></label>' +
              '<input class="bx-slider" id="mlxgT" type="range" min="10" max="150" step="5" value="45" aria-label="Run time in minutes"></div>' +
            '<div class="bx-chips">' +
              '<button type="button" class="bx-btn pri" id="mlxgRun">Run the gel</button>' +
              '<button type="button" class="bx-btn" id="mlxgClear">Empty wells</button></div>' +
            '<div class="bx-read" id="mlxgRead"></div>' +
            '<div class="bx-grp" id="mlxgResWrap" hidden><label>Bands — click to size off the ladder</label>' +
              '<div class="mlx-res" id="mlxgRes"></div></div>' +
          '</div>' +
        '</div>' +
        '<div class="bx-verdict" id="mlxgSay"></div>' +
        '<p class="bx-note" style="margin-top:14px"><b>What this shows.</b> Agarose is a mesh; DNA is uniformly negative, so in a field ' +
        'every fragment is pulled toward the anode with the same force per base pair. Charge-to-mass is constant, so what separates ' +
        'fragments is how badly the mesh slows them — and that scales with the logarithm of length. Distance migrated is ' +
        'therefore linear in log₁₀(bp), which is exactly why a ladder can be turned into a ruler.</p>';

      var view = host.querySelector("#mlxgView");
      var elLanes = host.querySelector("#mlxgLanes");
      var elSamples = host.querySelector("#mlxgSamples");
      var elRead = host.querySelector("#mlxgRead");
      var elSay = host.querySelector("#mlxgSay");
      var elRes = host.querySelector("#mlxgRes");
      var elResWrap = host.querySelector("#mlxgResWrap");
      var sAg = host.querySelector("#mlxgAg"), sV = host.querySelector("#mlxgV"), sT = host.querySelector("#mlxgT");
      var vAg = host.querySelector("#mlxgAgV"), vV = host.querySelector("#mlxgVV"), vT = host.querySelector("#mlxgTV");

      var G = {
        lanes: [
          { kind: "ladder", n: "1 kb ladder", f: LADDER.slice() },
          null, null, null, null, null
        ],
        sel: 1,
        ag: 1.0, V: 100, min: 45,
        ran: null,        /* frozen params of the completed/ongoing run */
        prog: 0,
        running: false,
        pick: null,       /* {lane, bp} selected band */
        dirty: true
      };

      /* ---------------- the physics ---------------- */
      /* Resolving window of the gel: the largest fragment that still moves and
         the smallest that is no longer retarded, both shifting with agarose %. */
      function window_(ag) {
        var hi = 23000 * Math.pow(0.7 / ag, 1.8);
        var lo = 520 * Math.pow(0.7 / ag, 1.8);
        return [Math.max(lo, 20), Math.max(hi, 300)];
      }
      /* normalised mobility 0..1 — linear in log10(size), the real relationship */
      function mobility(bp, ag) {
        var w = window_(ag), lo = w[0], hi = w[1];
        var m = (Math.log10(hi) - Math.log10(bp)) / (Math.log10(hi) - Math.log10(lo));
        return clamp(m, 0, 1);
      }
      /* cm travelled: calibrated so 1% / 5 V·cm⁻¹ / 45 min puts the front at 5 cm */
      function frontCm(ag, V, min) {
        var E = V / ELECTRODE_GAP;
        return 1.33 * E * (min / 60) / Math.pow(ag, 0.55);
      }
      function distCm(bp, p) { return mobility(bp, p.ag) * frontCm(p.ag, p.V, p.min); }
      function dyeBp(ag) { return 300 * Math.pow(ag, -1.6); }   /* bromophenol blue co-migration */

      /* least-squares fit of log10(size) against distance, from the ladder only */
      function standardCurve(p) {
        var lad = null, i;
        for (i = 0; i < G.lanes.length; i++) if (G.lanes[i] && G.lanes[i].kind === "ladder") lad = G.lanes[i];
        if (!lad) return null;
        var xs = [], ys = [];
        for (i = 0; i < lad.f.length; i++) {
          var d = distCm(lad.f[i], p);
          if (d > 0.12 && d < GEL_LEN - 0.05) { xs.push(d); ys.push(Math.log10(lad.f[i])); }
        }
        if (xs.length < 3) return null;
        var n = xs.length, sx = 0, sy = 0, sxy = 0, sxx = 0, j;
        for (j = 0; j < n; j++) { sx += xs[j]; sy += ys[j]; sxy += xs[j] * ys[j]; sxx += xs[j] * xs[j]; }
        var b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
        var a = (sy - b * sx) / n;
        var ybar = sy / n, ssTot = 0, ssRes = 0;
        for (j = 0; j < n; j++) {
          var pred = a + b * xs[j];
          ssTot += (ys[j] - ybar) * (ys[j] - ybar);
          ssRes += (ys[j] - pred) * (ys[j] - pred);
        }
        return { a: a, b: b, r2: ssTot ? 1 - ssRes / ssTot : 0, n: n };
      }
      function sizeFrom(curve, d) { return Math.pow(10, curve.a + curve.b * d); }

      function laneBands(lane, p) {
        if (!lane) return [];
        if (lane.smear) return [];
        var out = [];
        for (var i = 0; i < lane.f.length; i++) {
          var bp = lane.f[i];
          out.push({ bp: bp, d: distCm(bp, p), off: distCm(bp, p) > GEL_LEN });
        }
        return out;
      }

      /* ---------------- UI ---------------- */
      function laneLabel(l) {
        if (!l) return "empty";
        if (l.kind === "ladder") return "1 kb ladder";
        return l.n;
      }
      function renderLanes() {
        elLanes.innerHTML = G.lanes.map(function (l, i) {
          return '<button type="button" class="mlx-lane' + (G.sel === i ? " sel" : "") + '" data-i="' + i + '"' +
            ' aria-pressed="' + (G.sel === i) + '"><span class="ln">WELL ' + (i + 1) + '</span>' +
            '<span class="lc">' + laneLabel(l) + "</span></button>";
        }).join("");
        Array.prototype.forEach.call(elLanes.querySelectorAll(".mlx-lane"), function (b) {
          b.addEventListener("click", function () { G.sel = +b.getAttribute("data-i"); renderLanes(); G.dirty = true; });
        });
      }
      function renderSamples() {
        var items = [{ v: "ladder", t: "1 kb ladder" }];
        SAMPLES.forEach(function (s) { items.push({ v: s.id, t: s.n }); });
        unknowns.forEach(function (u) { items.push({ v: u.id, t: u.n }); });
        items.push({ v: "empty", t: "— empty —" });
        elSamples.innerHTML = items.map(function (it) {
          return '<button type="button" class="bx-btn" data-v="' + it.v + '">' + it.t + "</button>";
        }).join("");
        Array.prototype.forEach.call(elSamples.querySelectorAll("button"), function (b) {
          b.addEventListener("click", function () { load(b.getAttribute("data-v")); });
        });
      }
      function load(v) {
        var lane = null, i;
        if (v === "ladder") lane = { kind: "ladder", n: "1 kb ladder", f: LADDER.slice() };
        else if (v === "empty") lane = null;
        else {
          for (i = 0; i < SAMPLES.length; i++) if (SAMPLES[i].id === v) {
            lane = { kind: "sample", n: SAMPLES[i].n, f: SAMPLES[i].f ? SAMPLES[i].f.slice() : null, smear: SAMPLES[i].smear };
          }
          for (i = 0; i < unknowns.length; i++) if (unknowns[i].id === v) {
            lane = { kind: "unknown", n: unknowns[i].n, f: unknowns[i].f.slice(), hidden: true, ref: unknowns[i] };
          }
        }
        G.lanes[G.sel] = lane;
        resetRun("Wells changed — the gel resets. Load what you want, then run it.");
        renderLanes();
      }
      function resetRun(msg) {
        G.ran = null; G.prog = 0; G.running = false; G.pick = null;
        elResWrap.hidden = true;
        elRes.innerHTML = "";
        if (msg) tell(msg, false);
        readout();
        G.dirty = true;
      }
      function tell(html, warn) {
        elSay.innerHTML = html;
        elSay.style.borderLeftColor = warn ? "var(--amber)" : "";
      }
      function readout() {
        var E = G.V / ELECTRODE_GAP;
        var w = window_(G.ag);
        var front = frontCm(G.ag, G.V, G.min);
        var rows = [];
        rows.push("<b>Gel &amp; field</b>");
        rows.push("agarose " + G.ag.toFixed(1) + "% · " + G.V + " V over " + ELECTRODE_GAP + " cm = <b>" + E.toFixed(1) + " V/cm</b>");
        rows.push("resolving range ≈ " + group(Math.round(w[0] / 10) * 10) + "–" + group(Math.round(w[1] / 100) * 100) + " bp");
        rows.push("dye front after " + G.min + " min: <b>" + Math.min(front, GEL_LEN).toFixed(2) + " cm</b>" +
                  (front > GEL_LEN ? ' <span class="mlx-warn">(off the end)</span>' : ""));
        rows.push("bromophenol blue runs with ≈ " + group(dyeBp(G.ag)) + " bp here");
        elRead.innerHTML = rows.join("<br>");
      }

      function renderResults() {
        if (!G.ran) return;
        var p = G.ran;
        var curve = standardCurve(p);
        var html = [];
        if (!curve) {
          html.push('<div class="bx-note">No usable ladder on this gel — without at least three ladder bands still ' +
                    "on the gel you have no standard curve, and no way to size anything.</div>");
        } else {
          html.push('<div class="bx-note" style="font-family:' + MONO + ';font-size:11.5px">' +
            "standard curve: log₁₀(bp) = " + curve.a.toFixed(3) + " − " + Math.abs(curve.b).toFixed(3) +
            "·d &nbsp; R² = " + curve.r2.toFixed(4) + " (" + curve.n + " ladder bands)</div>");
        }
        for (var i = 0; i < G.lanes.length; i++) {
          var l = G.lanes[i];
          if (!l) continue;
          if (l.smear) {
            html.push('<div class="bx-note">Well ' + (i + 1) + " — " + l.n +
              ": a continuous smear, not bands. Sheared genomic DNA is a population of every length at once.</div>");
            continue;
          }
          var bands = laneBands(l, p);
          for (var j = 0; j < bands.length; j++) {
            var b = bands[j];
            var est = (curve && !b.off && b.d > 0.1) ? sizeFrom(curve, b.d) : null;
            var name = l.kind === "unknown" && !l.ref.shown ? "?" : group(b.bp) + " bp";
            var line = "well " + (i + 1) + " · " + name + " · " +
              (b.off ? "ran off the gel" : b.d.toFixed(2) + " cm");
            if (est) line += " → reads " + group(Math.round(est / 10) * 10) + " bp";
            html.push('<button type="button" data-l="' + i + '" data-b="' + b.bp + '">' + line + "</button>");
          }
        }
        elRes.innerHTML = html.join("");
        elResWrap.hidden = false;
        Array.prototype.forEach.call(elRes.querySelectorAll("button"), function (btn) {
          btn.addEventListener("click", function () {
            selectBand(+btn.getAttribute("data-l"), +btn.getAttribute("data-b"));
          });
        });
      }

      function selectBand(laneIdx, bp) {
        G.pick = { lane: laneIdx, bp: bp };
        G.dirty = true;
        var p = G.ran; if (!p) return;
        var l = G.lanes[laneIdx];
        var d = distCm(bp, p);
        var curve = standardCurve(p);
        var est = curve && d < GEL_LEN ? sizeFrom(curve, d) : null;
        Array.prototype.forEach.call(elRes.querySelectorAll("button"), function (btn) {
          btn.classList.toggle("sel", +btn.getAttribute("data-l") === laneIdx && +btn.getAttribute("data-b") === bp);
        });
        if (d >= GEL_LEN) {
          tell("<b>That band is gone.</b> At " + (p.V / ELECTRODE_GAP).toFixed(1) + " V/cm for " + p.min +
            " min it migrated past the end of the gel. Shorter run or lower voltage — or a higher agarose percentage to slow it down.", true);
          return;
        }
        if (!est) { tell("<b>No standard curve.</b> Load the 1 kb ladder into a well and run again."); return; }
        var msg = "<b>Band at " + d.toFixed(2) + " cm.</b> Reading it off the ladder's standard curve gives <b>" +
          group(Math.round(est / 10) * 10) + " bp</b>. ";
        if (l && l.kind === "unknown") {
          if (!l.ref.shown) {
            msg += 'That is your estimate for ' + l.n + '. <button type="button" class="bx-btn" id="mlxgReveal" style="margin-left:6px">Reveal true size</button>';
            tell(msg);
            var rv = elSay.querySelector("#mlxgReveal");
            if (rv) rv.addEventListener("click", function () {
              l.ref.shown = true;
              var err = Math.abs(est - bp) / bp * 100;
              tell("<b>" + l.n + " is " + group(bp) + " bp.</b> Your gel read " + group(Math.round(est / 10) * 10) +
                " bp — " + err.toFixed(1) + "% error. A well-run gel with a good ladder typically sizes to within 5–10%; " +
                "that is why anything needing exact length gets sequenced instead.");
              renderResults();
              G.dirty = true;
            });
            return;
          }
          var err0 = Math.abs(est - bp) / bp * 100;
          msg += "True size " + group(bp) + " bp — " + err0.toFixed(1) + "% error.";
        } else {
          var err1 = Math.abs(est - bp) / bp * 100;
          msg += "Known size " + group(bp) + " bp, so the curve is off by " + err1.toFixed(1) + "%.";
        }
        tell(msg);
      }

      function run() {
        var loaded = G.lanes.filter(function (l) { return !!l; }).length;
        if (!loaded) { tell("<b>Nothing loaded.</b> Pick a well, then choose a sample to put in it.", true); return; }
        G.ran = { ag: G.ag, V: G.V, min: G.min };
        G.prog = reduced() ? 1 : 0;
        G.running = !reduced();
        G.pick = null;
        elResWrap.hidden = true;
        G.dirty = true;
        if (reduced()) finishRun();
      }
      function finishRun() {
        G.running = false;
        G.prog = 1;
        var p = G.ran;
        var E = p.V / ELECTRODE_GAP;
        var front = frontCm(p.ag, p.V, p.min);
        var offCount = 0, i, j;
        for (i = 0; i < G.lanes.length; i++) {
          var bands = laneBands(G.lanes[i], p);
          for (j = 0; j < bands.length; j++) if (bands[j].off) offCount++;
        }
        var notes = [];
        notes.push("<b>Run complete.</b> " + p.ag.toFixed(1) + "% agarose, " + p.V + " V (" + E.toFixed(1) +
          " V/cm) for " + p.min + " min; dye front at " + Math.min(front, GEL_LEN).toFixed(2) + " cm.");
        if (offCount) notes.push(offCount + " band" + (offCount > 1 ? "s" : "") + " ran off the end of the gel and " +
          "cannot be sized — small fragments reach the anode first.");
        if (E > 7) notes.push("Above about 7 V/cm the gel heats and bands broaden: notice how fuzzy they are. " +
          "5 V/cm is the usual compromise between speed and sharpness.");
        if (front < 1.6) notes.push("Barely moved. Everything is still bunched near the wells — give it more time or more volts.");
        var w = window_(p.ag);
        notes.push("At " + p.ag.toFixed(1) + "% the mesh resolves roughly " + group(Math.round(w[0] / 10) * 10) + "–" +
          group(Math.round(w[1] / 100) * 100) + " bp. Anything bigger crawls at the well; anything smaller runs with the dye front.");
        tell(notes.join(" "), offCount > 0 || E > 7 || front < 1.6);
        renderResults();
        G.dirty = true;
      }

      /* ---------------- drawing ---------------- */
      var pal = palette(function () { G.dirty = true; });
      var canvas = mountCanvas(view, function (w) { return clamp(w * 0.78, 340, 470); }, function () { G.dirty = true; }, "Agarose gel");

      canvas.cv.style.cursor = "crosshair";
      function hit(ev) {
        if (!G.ran || G.prog < 1) return;
        var r = canvas.cv.getBoundingClientRect();
        var mx = ev.clientX - r.left, my = ev.clientY - r.top;
        var L = layout();
        var lane = Math.floor((mx - L.x0) / L.lw);
        if (lane < 0 || lane >= G.lanes.length) return;
        var l = G.lanes[lane];
        if (!l || l.smear) return;
        var bands = laneBands(l, G.ran), best = null, bd = 1e9;
        for (var i = 0; i < bands.length; i++) {
          if (bands[i].off) continue;
          var by = L.y0 + bands[i].d / GEL_LEN * L.gh;
          var dd = Math.abs(by - my);
          if (dd < bd) { bd = dd; best = bands[i]; }
        }
        if (best && bd < 9) selectBand(lane, best.bp);
      }
      canvas.cv.addEventListener("click", hit);

      function layout() {
        var W = canvas.st.w, H = canvas.st.h;
        var padL = 40, padR = 12, padT = 44, padB = 26;
        var x0 = padL, x1 = W - padR;
        var y0 = padT + 14;                       /* top of the gel run area = bottom of wells */
        var gh = H - y0 - padB;
        return { x0: x0, x1: x1, y0: y0, gh: gh, lw: (x1 - x0) / G.lanes.length, W: W, H: H };
      }

      function draw() {
        var ctx = canvas.ctx, C = pal.c, L = layout(), W = L.W, H = L.H;
        ctx.clearRect(0, 0, W, H);

        var p = G.ran || { ag: G.ag, V: G.V, min: G.min };
        var prog = G.ran ? G.prog : 0;

        /* gel slab — a transilluminator plate */
        var slabTop = L.y0 - 16;
        roundRect(ctx, L.x0 - 6, slabTop, (L.x1 - L.x0) + 12, L.gh + 22, 10);
        ctx.fillStyle = mix(C["bg-2"], "#000000", 0.55);
        ctx.fill();
        ctx.strokeStyle = alpha(C.ink, 0.10);
        ctx.lineWidth = 1;
        ctx.stroke();

        /* electrodes */
        label(ctx, "⊖ cathode", L.x0 - 6, 16, alpha(C.rose, 0.9), 10.5, "left", 600);
        label(ctx, "anode ⊕", L.x1, 16, alpha(C.cy, 0.95), 10.5, "right", 600);
        ctx.strokeStyle = alpha(C.ink, 0.16);
        ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(L.x0 - 6, 26); ctx.lineTo(L.x1, 26); ctx.stroke();
        ctx.setLineDash([]);
        var arrowY = 26;
        label(ctx, "DNA is negative — it runs downward, toward ⊕", (L.x0 + L.x1) / 2, H - 10, alpha(C.faint, 1), 10, "center");

        /* cm ruler */
        for (var cmv = 0; cmv <= GEL_LEN; cmv++) {
          var yy = L.y0 + cmv / GEL_LEN * L.gh;
          ctx.strokeStyle = alpha(C.ink, 0.12);
          ctx.beginPath(); ctx.moveTo(L.x0 - 12, yy); ctx.lineTo(L.x0 - 7, yy); ctx.stroke();
          label(ctx, cmv + (cmv === 0 ? " cm" : ""), L.x0 - 15, yy, alpha(C.faint, 1), 9.5, "right");
        }

        /* wells + lane headers */
        for (var i = 0; i < G.lanes.length; i++) {
          var lx = L.x0 + i * L.lw, cxl = lx + L.lw / 2;
          var wW = Math.min(L.lw * 0.62, 34);
          roundRect(ctx, cxl - wW / 2, L.y0 - 13, wW, 11, 2);
          ctx.fillStyle = alpha("#000000", 0.55);
          ctx.fill();
          ctx.strokeStyle = alpha(C.ink, G.sel === i ? 0.5 : 0.16);
          ctx.lineWidth = G.sel === i ? 1.4 : 1;
          ctx.stroke();
          label(ctx, String(i + 1), cxl, L.y0 - 24, alpha(G.sel === i ? C.cy : C.faint, 1), 10, "center", 600);
        }

        /* the DNA itself */
        var E = p.V / ELECTRODE_GAP;
        var smear = clamp((E - 6.5) / 4, 0, 1);
        for (i = 0; i < G.lanes.length; i++) {
          var l = G.lanes[i];
          if (!l) continue;
          var cx2 = L.x0 + i * L.lw + L.lw / 2;
          var bw = Math.min(L.lw * 0.66, 40);
          var isLad = l.kind === "ladder";
          var col = isLad ? C.amber : (l.kind === "unknown" ? C.violet || C.indigo : C.em);

          if (l.smear) {
            /* sheared genomic DNA: a continuum */
            for (var s = 0; s < 46; s++) {
              var bpS = l.smear[0] * Math.pow(l.smear[1] / l.smear[0], s / 45);
              var dS = distCm(bpS, p) * prog;
              if (dS > GEL_LEN) continue;
              var yS = L.y0 + dS / GEL_LEN * L.gh;
              ctx.fillStyle = alpha(C.em, 0.06);
              ctx.fillRect(cx2 - bw / 2, yS - 3, bw, 6);
            }
            continue;
          }

          var bands = laneBands(l, p);
          for (var b = 0; b < bands.length; b++) {
            var d = bands[b].d * prog;
            if (d > GEL_LEN) {
              if (prog >= 1) {
                label(ctx, "↓", cx2, L.y0 + L.gh + 10, alpha(C.rose, 0.8), 11, "center", 700);
              }
              continue;
            }
            var y = L.y0 + d / GEL_LEN * L.gh;
            /* intensity: mass in the band, so big fragments glow more */
            var mass = clamp(Math.log10(bands[b].bp) / 4.4, 0.30, 1);
            if (isLad) mass *= 0.85;
            /* diffusion + joule heating broaden the band as it travels */
            var half = 1.6 + d * 0.55 + smear * d * 1.9;
            var picked = G.pick && G.pick.lane === i && G.pick.bp === bands[b].bp;
            var gr = ctx.createLinearGradient(0, y - half, 0, y + half);
            gr.addColorStop(0, alpha(col, 0));
            gr.addColorStop(0.5, alpha(col, 0.35 + 0.55 * mass));
            gr.addColorStop(1, alpha(col, 0));
            ctx.fillStyle = gr;
            ctx.fillRect(cx2 - bw / 2, y - half, bw, half * 2);
            ctx.fillStyle = alpha(col, (0.5 + 0.4 * mass) * 0.55);
            ctx.fillRect(cx2 - bw / 2, y - 0.9, bw, 1.8);
            if (picked) {
              ctx.strokeStyle = alpha(C.ink, 0.85);
              ctx.lineWidth = 1;
              ctx.setLineDash([2, 3]);
              ctx.strokeRect(cx2 - bw / 2 - 3, y - half - 3, bw + 6, half * 2 + 6);
              ctx.setLineDash([]);
              label(ctx, d.toFixed(2) + " cm", cx2 + bw / 2 + 6, y, alpha(C.ink, 1), 10, "left", 600);
            }
            /* ladder gets its sizes printed, like a real gel doc */
            if (isLad && prog > 0.98 && L.lw > 44) {
              label(ctx, group(bands[b].bp), L.x0 - 20, y, alpha(C.amber, 0.0), 9, "right");
            }
          }
        }

        /* dye front */
        var fd = frontCm(p.ag, p.V, p.min) * prog;
        if (fd > 0.05 && fd < GEL_LEN) {
          var yf = L.y0 + fd / GEL_LEN * L.gh;
          ctx.strokeStyle = alpha(C.indigo, 0.55);
          ctx.setLineDash([5, 5]);
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(L.x0 - 4, yf); ctx.lineTo(L.x1, yf); ctx.stroke();
          ctx.setLineDash([]);
          label(ctx, "dye front", L.x1 - 4, yf - 8, alpha(C.indigo, 0.9), 9.5, "right");
        }

        /* run status */
        var status = !G.ran ? "gel poured · wells loaded · not running"
          : (G.running ? "running — " + Math.round(G.prog * p.min) + " / " + p.min + " min"
                       : "finished · " + p.min + " min at " + p.V + " V");
        label(ctx, status, L.x0 - 6, H - 10, alpha(C.faint, 1), 10, "left");
        canvas.say("Agarose gel, " + p.ag.toFixed(1) + " percent, " + status + ".");
      }

      /* ---------------- wiring ---------------- */
      function syncSliders() {
        G.ag = parseFloat(sAg.value); G.V = parseInt(sV.value, 10); G.min = parseInt(sT.value, 10);
        vAg.textContent = G.ag.toFixed(1) + "%";
        vV.textContent = G.V + " V";
        vT.textContent = G.min + " min";
        readout();
        G.dirty = true;
      }
      [sAg, sV, sT].forEach(function (s) {
        s.addEventListener("input", function () {
          syncSliders();
          if (G.ran) resetRun("Conditions changed — re-run the gel to see the new separation.");
        });
      });
      host.querySelector("#mlxgRun").addEventListener("click", run);
      host.querySelector("#mlxgClear").addEventListener("click", function () {
        G.lanes = [{ kind: "ladder", n: "1 kb ladder", f: LADDER.slice() }, null, null, null, null, null];
        unknowns.forEach(function (u) { u.shown = false; });
        renderLanes();
        resetRun("Fresh gel. Well 1 has the ladder; load samples into the rest.");
      });

      renderLanes();
      renderSamples();
      syncSliders();
      tell("Load a well, set the field, and run. Then click a band — the ladder becomes a ruler and the unknowns get a size.");

      var tick = ticker(function (dt) {
        if (G.running) {
          G.prog = clamp(G.prog + dt / 3.4, 0, 1);
          G.dirty = true;
          if (G.prog >= 1) finishRun();
        }
        if (G.dirty) { draw(); G.dirty = false; }
      });

      return {
        dispose: function () {
          tick.dispose();
          canvas.cv.removeEventListener("click", hit);
          canvas.dispose();
          pal.dispose();
          css.dispose();
          host.innerHTML = "";
        }
      };
    }
  });

  /* ======================================================================
     LAB 3 — PCR THERMOCYCLER
     ====================================================================== */

  var PCR = {
    TM: 61,          /* primer pair melting temperature, °C */
    TOPT: 57,        /* rule of thumb: anneal 3–5 °C below the lower Tm */
    AMPLICON: 1000,  /* bp */
    N0: 1e4,         /* starting template copies */
    NMAX: 1.2e12,    /* dNTP/primer-limited ceiling for a 50 µL reaction */
    T_DEN: 30, T_ANN: 30, T_EXT: 30  /* seconds per segment */
  };

  /* ---- the efficiency model (each term is a real, separate failure mode) ---- */
  function effDenature(Td) {          /* incomplete strand separation below ~92 °C */
    return 1 / (1 + Math.exp(-(Td - 91.5) / 1.0));
  }
  function effAnneal(Ta) {            /* above Tm the primers simply do not bind */
    var dev = Ta - PCR.TOPT;
    if (dev > 0) return Math.exp(-Math.pow(dev / 3.4, 2));
    return Math.exp(-Math.pow(dev / 16, 2));
  }
  function specificity(Ta) {          /* below optimum, primers bind partial matches too */
    var dev = Ta - PCR.TOPT;
    if (dev >= 0) return 0.98;
    return clamp(Math.exp(-Math.pow(dev / 8.5, 2)), 0.02, 0.98);
  }
  function taqRate(Te) {              /* nucleotides per second */
    var r = 65 * Math.exp(-Math.pow((Te - 74) / 10, 2));
    if (Te > 78) r *= Math.exp(-Math.pow((Te - 78) / 6, 2));
    return r;
  }
  function effExtend(Te) {            /* did it finish 1000 nt in 30 s? */
    return clamp(taqRate(Te) * PCR.T_EXT / PCR.AMPLICON, 0, 1);
  }
  function taqHalfLife(Td) {          /* minutes — ~40 min at 95 °C, minutes at 98 °C */
    return 40 * Math.pow(2, -(Td - 95) / 1.35);
  }

  function simulate(Td, Ta, Te, cycles) {
    var eD = effDenature(Td), eA = effAnneal(Ta), eE = effExtend(Te), sp = specificity(Ta);
    var spec = PCR.N0;
    var ns = PCR.N0 * (1 - sp) * 0.6;      /* mispriming seeds a competing product */
    var act = 1;
    var hist = [{ c: 0, spec: spec, ns: ns, eff: 0 }];
    for (var c = 1; c <= cycles; c++) {
      act *= Math.pow(0.5, (PCR.T_DEN / 60) / taqHalfLife(Td));
      var total = spec + ns;
      var plateau = clamp(1 - total / PCR.NMAX, 0, 1);
      var base = 0.97 * eD * eA * eE * act * plateau;
      var eSpec = base * sp;
      var eNs = base * (1 - 0.35 * sp);
      spec = spec * (1 + eSpec);
      ns = ns * (1 + eNs);
      hist.push({ c: c, spec: spec, ns: ns, eff: eSpec });
    }
    return {
      hist: hist, spec: spec, ns: ns,
      eD: eD, eA: eA, eE: eE, sp: sp, act: act,
      meanEff: Math.pow(spec / PCR.N0, 1 / Math.max(1, cycles)) - 1
    };
  }
  function massNg(copies, bp) {
    return copies / 6.02214076e23 * (bp * 650) * 1e9;
  }

  LABS.register("pcr", {
    title: "PCR — the thermocycler",
    tag: "Molecular bench",
    color: "#f6c667",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M3 16h3l2-9 3 13 2.5-8 2 4h5.5"/><path d="M4 20h16"/></svg>',
    blurb: "Set the three temperatures and the cycle count, then run it. Copies double every cycle until the reagents " +
           "run out — and an annealing temperature just five degrees too high costs you almost the entire product.",

    build: function (host) {
      var css = styleTag("mlx-pcr-css",
        ".mlxp .mlx-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}" +
        ".mlxp .mlx-cell{border:1px solid var(--line);border-radius:11px;padding:10px 12px}" +
        ".mlxp .mlx-cell .k{font-family:" + MONO + ";font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}" +
        ".mlxp .mlx-cell .v{font-family:" + MONO + ";font-size:16px;font-weight:700;color:var(--ink);margin-top:3px}" +
        ".mlxp .mlx-cell .s{font-size:11px;color:var(--dim);margin-top:2px}" +
        ".mlxp .mlx-hint{font-size:11.5px;color:var(--faint);font-family:" + MONO + "}" +
        ".mlxp .mlx-hint.warn{color:var(--amber)}"
      );

      host.innerHTML =
        '<div class="bx mlxp">' +
          '<div class="bx-view" id="mlxpView"></div>' +
          '<div class="bx-side">' +
            '<div class="bx-grp"><label>Denature <span class="bx-val" id="mlxpDv"></span></label>' +
              '<input class="bx-slider" id="mlxpD" type="range" min="86" max="99" step="0.5" value="95" aria-label="Denaturation temperature">' +
              '<div class="mlx-hint" id="mlxpDh"></div></div>' +
            '<div class="bx-grp"><label>Anneal <span class="bx-val" id="mlxpAv"></span></label>' +
              '<input class="bx-slider" id="mlxpA" type="range" min="42" max="72" step="0.5" value="57" aria-label="Annealing temperature">' +
              '<div class="mlx-hint" id="mlxpAh"></div></div>' +
            '<div class="bx-grp"><label>Extend <span class="bx-val" id="mlxpEv"></span></label>' +
              '<input class="bx-slider" id="mlxpE" type="range" min="55" max="84" step="0.5" value="72" aria-label="Extension temperature">' +
              '<div class="mlx-hint" id="mlxpEh"></div></div>' +
            '<div class="bx-grp"><label>Cycles <span class="bx-val" id="mlxpCv"></span></label>' +
              '<input class="bx-slider" id="mlxpC" type="range" min="5" max="45" step="1" value="30" aria-label="Number of cycles"></div>' +
            '<div class="bx-grp"><label>Speed</label><div id="mlxpSpeed"></div></div>' +
            '<div class="bx-chips">' +
              '<button type="button" class="bx-btn pri" id="mlxpRun">Run program</button>' +
              '<button type="button" class="bx-btn" id="mlxpStd">Standard program</button></div>' +
            '<div class="bx-read" id="mlxpRead"></div>' +
            '<div class="mlx-grid" id="mlxpOut"></div>' +
          '</div>' +
        '</div>' +
        '<div class="bx-verdict" id="mlxpSay"></div>' +
        '<p class="bx-note" style="margin-top:14px"><b>What this shows.</b> PCR is a chain reaction: every product strand is a ' +
        'template next cycle, so copies go as 2ⁿ and thirty cycles is a billion-fold in theory. Real reactions never reach ' +
        'that. Each cycle multiplies by (1 + E) where E depends on all three temperatures and on how much Taq is left alive, ' +
        'and the curve flattens the moment primers and dNTPs run short. Push the annealing temperature above the primers’ ' +
        'melting point and E collapses to nothing; drop it far below and the primers start binding sequences they were never ' +
        'meant to — you still get a tube full of DNA, just not the DNA you wanted.</p>';

      var view = host.querySelector("#mlxpView");
      var sD = host.querySelector("#mlxpD"), sA = host.querySelector("#mlxpA"),
          sE = host.querySelector("#mlxpE"), sC = host.querySelector("#mlxpC");
      var vD = host.querySelector("#mlxpDv"), vA = host.querySelector("#mlxpAv"),
          vE = host.querySelector("#mlxpEv"), vC = host.querySelector("#mlxpCv");
      var hD = host.querySelector("#mlxpDh"), hA = host.querySelector("#mlxpAh"), hE = host.querySelector("#mlxpEh");
      var elRead = host.querySelector("#mlxpRead"), elOut = host.querySelector("#mlxpOut"),
          elSay = host.querySelector("#mlxpSay"), elSpeed = host.querySelector("#mlxpSpeed");

      var P = {
        Td: 95, Ta: 57, Te: 72, cycles: 30,
        speed: "1",
        running: false,
        cyc: 0,           /* cycles completed */
        phase: 0,         /* 0 denature, 1 anneal, 2 extend */
        phaseT: 0,        /* 0..1 within the phase */
        sim: null,
        done: false,
        dirty: true
      };
      var SPEEDS = { "1": 0.36, "3": 0.12, "i": 0 };  /* seconds of wall clock per cycle */

      function segTemp() {
        return P.phase === 0 ? P.Td : P.phase === 1 ? P.Ta : P.Te;
      }
      function blockTemp() {
        /* ramp between segments so the trace looks like a real block (~3 °C/s) */
        var prev = P.phase === 0 ? P.Te : P.phase === 1 ? P.Td : P.Ta;
        var ramp = clamp(P.phaseT / 0.28, 0, 1);
        return lerp(prev, segTemp(), ease(ramp));
      }

      function hints() {
        var dev = P.Ta - PCR.TM;
        hA.textContent = "primer pair Tm " + PCR.TM + " °C · " +
          (P.Ta > PCR.TM ? "you are " + (P.Ta - PCR.TM).toFixed(1) + " °C ABOVE Tm"
            : P.Ta > PCR.TOPT - 4 ? "in the sweet spot (Tm − 3 to − 5)"
            : (PCR.TOPT - P.Ta).toFixed(1) + " °C below optimum — mispriming risk");
        hA.className = "mlx-hint" + (P.Ta > PCR.TM - 1 || P.Ta < PCR.TOPT - 6 ? " warn" : "");
        hD.textContent = "strand separation " + Math.round(effDenature(P.Td) * 100) + "% · Taq half-life " +
          taqHalfLife(P.Td).toFixed(0) + " min at this temperature";
        hD.className = "mlx-hint" + (P.Td < 93 || P.Td > 96.5 ? " warn" : "");
        hE.textContent = "Taq extends " + taqRate(P.Te).toFixed(0) + " nt/s here — needs " + PCR.AMPLICON +
          " nt in " + PCR.T_EXT + " s (" + Math.round(effExtend(P.Te) * 100) + "% complete)";
        hE.className = "mlx-hint" + (effExtend(P.Te) < 0.95 ? " warn" : "");
      }

      function readout() {
        var secs = P.cycles * (PCR.T_DEN + PCR.T_ANN + PCR.T_EXT) + P.cycles * 22 + 180;
        var rows = [];
        rows.push("<b>Program</b>");
        rows.push("95 °C 3 min initial → [ " + P.Td.toFixed(1) + " °C " + PCR.T_DEN + "s / " +
          P.Ta.toFixed(1) + " °C " + PCR.T_ANN + "s / " + P.Te.toFixed(1) + " °C " + PCR.T_EXT + "s ] × " + P.cycles);
        rows.push("amplicon <b>" + PCR.AMPLICON + " bp</b> · template <b>" + sci(PCR.N0, 0) + " copies</b>");
        rows.push("block time ≈ <b>" + Math.floor(secs / 60) + " min " + (secs % 60) + " s</b>");
        elRead.innerHTML = rows.join("<br>");
      }

      function outputs() {
        if (!P.sim) { elOut.innerHTML = ""; return; }
        var s = P.sim;
        var shown = P.running ? s.hist[Math.min(P.cyc, s.hist.length - 1)] : s.hist[s.hist.length - 1];
        var theo = PCR.N0 * Math.pow(2, shown.c);
        var frac = shown.spec / theo * 100;
        var pct = shown.spec / (shown.spec + shown.ns) * 100;
        elOut.innerHTML =
          '<div class="mlx-cell"><div class="k">Specific product</div><div class="v">' + sci(shown.spec) +
            '</div><div class="s">' + massNg(shown.spec, PCR.AMPLICON).toFixed(0) + " ng in 50 µL</div></div>" +
          '<div class="mlx-cell"><div class="k">Theoretical 2' + sup(shown.c) + '</div><div class="v">' + sci(theo) +
            '</div><div class="s">' + (frac < 0.01 ? "<0.01" : frac.toFixed(frac < 1 ? 3 : 1)) + "% achieved</div></div>" +
          '<div class="mlx-cell"><div class="k">Mean efficiency</div><div class="v">' +
            Math.round((Math.pow(shown.spec / PCR.N0, 1 / Math.max(1, shown.c)) - 1) * 100) + "%</div>" +
            '<div class="s">per cycle, over ' + shown.c + " cycles</div></div>" +
          '<div class="mlx-cell"><div class="k">Purity</div><div class="v">' + pct.toFixed(pct > 99 ? 1 : 0) + "%</div>" +
            '<div class="s">' + (100 - pct).toFixed(0) + "% non-specific</div></div>";
      }

      function verdict() {
        var s = P.sim;
        if (!s) return;
        var out = [];
        var final = s.hist[s.hist.length - 1];
        var theo = PCR.N0 * Math.pow(2, P.cycles);
        var frac = final.spec / theo;
        var purity = final.spec / (final.spec + final.ns);
        var ng = massNg(final.spec, PCR.AMPLICON);

        if (P.Ta > PCR.TM) {
          out.push("<b>Annealing temperature is above the primer Tm.</b> At " + P.Ta.toFixed(1) + " °C the primers are " +
            (P.Ta - PCR.TM).toFixed(1) + " °C past their melting point, so a primer that does land is thermodynamically " +
            "unstable and falls off before Taq can start. Per-cycle efficiency is " + (s.eA * 100).toFixed(1) +
            "% of optimal — that is why the tube looks empty.");
        } else if (P.Ta > PCR.TOPT + 2) {
          out.push("<b>Annealing a little hot.</b> " + P.Ta.toFixed(1) + " °C leaves only " +
            Math.round(s.eA * 100) + "% of the primers stably bound each cycle. Very clean, very low yield — " +
            "the classic 'specific but nothing there' result.");
        } else if (purity < 0.75) {
          out.push("<b>Annealing too cool — you amplified the wrong things.</b> At " + P.Ta.toFixed(1) +
            " °C primers tolerate mismatches, so they prime at sites that are only partly complementary. Only " +
            Math.round(purity * 100) + "% of the product is your amplicon; the rest is a ladder of non-specific bands and " +
            "primer dimer competing for the same dNTPs. Raise the anneal toward " + PCR.TOPT + " °C.");
        }
        if (effDenature(P.Td) < 0.7) {
          out.push("<b>Denaturation is incomplete.</b> At " + P.Td.toFixed(1) + " °C only " +
            Math.round(effDenature(P.Td) * 100) + "% of the duplex separates — GC-rich stretches stay paired, so most " +
            "templates are never available for priming.");
        }
        if (P.Td > 96.5) {
          out.push("<b>Denaturing too hot.</b> Taq's half-life at " + P.Td.toFixed(1) + " °C is only " +
            taqHalfLife(P.Td).toFixed(0) + " min, so after " + P.cycles + " cycles just " +
            Math.round(s.act * 100) + "% of the polymerase is still active. Late cycles barely amplify.");
        }
        if (effExtend(P.Te) < 0.9) {
          out.push("<b>Extension is truncated.</b> Taq runs at " + taqRate(P.Te).toFixed(0) + " nt/s at " +
            P.Te.toFixed(1) + " °C, so in " + PCR.T_EXT + " s it only gets through " +
            Math.round(effExtend(P.Te) * PCR.AMPLICON) + " of the " + PCR.AMPLICON +
            " nt. Incomplete strands are not templates for the next cycle.");
        }
        if (final.spec > PCR.NMAX * 0.55) {
          var plateauAt = 0;
          for (var i = 1; i < s.hist.length; i++) {
            if (s.hist[i].spec + s.hist[i].ns > PCR.NMAX * 0.5) { plateauAt = s.hist[i].c; break; }
          }
          out.push("<b>The reaction plateaued around cycle " + plateauAt + ".</b> Doubling stops when the primers and dNTPs " +
            "run out, not when you stop cycling — which is why extra cycles past the plateau buy you nothing but more " +
            "non-specific product. This ceiling (≈" + sci(PCR.NMAX, 1) + " copies, about " +
            massNg(PCR.NMAX, PCR.AMPLICON).toFixed(1) + " ng of a " + PCR.AMPLICON + " bp amplicon) is set by the dNTPs in the tube.");
        }
        if (!out.length) {
          out.push("<b>Clean amplification.</b> " + P.cycles + " cycles at " + Math.round(s.meanEff * 100) +
            "% mean efficiency turned " + sci(PCR.N0, 0) + " templates into " + sci(final.spec) + " copies — " +
            ng.toFixed(0) + " ng of a " + PCR.AMPLICON + " bp product, " + Math.round(purity * 100) +
            "% specific. Theory says 2" + sup(P.cycles) + "; you got " + (frac * 100).toFixed(1) +
            "% of that, which is what a real, well-behaved reaction looks like.");
        }
        elSay.innerHTML = out.join(" ");
        elSay.style.borderLeftColor = out.length && effDenature(P.Td) < 0.7 || P.Ta > PCR.TM ? "var(--amber)" : "";
      }

      function run() {
        P.sim = simulate(P.Td, P.Ta, P.Te, P.cycles);
        P.cyc = 0; P.phase = 0; P.phaseT = 0; P.done = false;
        if (P.speed === "i" || reduced()) {
          P.cyc = P.cycles; P.running = false; P.done = true;
          outputs(); verdict();
        } else {
          P.running = true;
          elSay.innerHTML = "<b>Cycling.</b> Watch the block step through denature → anneal → extend, and the copy " +
            "count climb by a constant factor each cycle — a straight line on a log axis, until the reagents give out.";
          elSay.style.borderLeftColor = "";
        }
        P.dirty = true;
      }

      /* ---------------- drawing ---------------- */
      var pal = palette(function () { P.dirty = true; });
      var canvas = mountCanvas(view, function (w) { return clamp(w * 0.80, 360, 500); }, function () { P.dirty = true; }, "Thermocycler");

      function draw() {
        var ctx = canvas.ctx, C = pal.c, W = canvas.st.w, H = canvas.st.h;
        ctx.clearRect(0, 0, W, H);

        var padL = 46, padR = 14;
        var thermH = Math.max(108, H * 0.34);
        var gapY = 20;

        /* ---------- thermal profile ---------- */
        var tx0 = padL, tx1 = W - padR, ty0 = 26, ty1 = ty0 + thermH - 30;
        var tMin = 45, tMax = 100;
        function tY(t) { return ty1 - (t - tMin) / (tMax - tMin) * (ty1 - ty0); }

        roundRect(ctx, tx0 - 6, ty0 - 12, (tx1 - tx0) + 12, (ty1 - ty0) + 30, 10);
        ctx.fillStyle = alpha(C.ink, 0.025);
        ctx.fill();

        [50, 60, 70, 80, 90, 100].forEach(function (t) {
          var y = tY(t);
          ctx.strokeStyle = alpha(C.ink, 0.07);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(tx0, y); ctx.lineTo(tx1, y); ctx.stroke();
          label(ctx, t + "°", tx0 - 8, y, alpha(C.faint, 1), 9.5, "right");
        });

        /* three cycles of the programmed square wave */
        var showC = 3, cw = (tx1 - tx0) / showC;
        var segs = [
          { f: 0, w: PCR.T_DEN, t: P.Td, col: C.rose, n: "denature" },
          { f: 1, w: PCR.T_ANN, t: P.Ta, col: C.indigo, n: "anneal" },
          { f: 2, w: PCR.T_EXT, t: P.Te, col: C.amber, n: "extend" }
        ];
        var totalW = PCR.T_DEN + PCR.T_ANN + PCR.T_EXT;
        for (var c = 0; c < showC; c++) {
          var ox = tx0 + c * cw, acc = 0;
          for (var si = 0; si < 3; si++) {
            var sg = segs[si];
            var x0 = ox + acc / totalW * cw;
            var x1 = ox + (acc + sg.w) / totalW * cw;
            acc += sg.w;
            var y = tY(sg.t);
            ctx.fillStyle = alpha(sg.col, 0.10);
            ctx.fillRect(x0, y, x1 - x0, ty1 - y);
            ctx.strokeStyle = alpha(sg.col, 0.85);
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
            if (c === 0 && cw > 120) {
              label(ctx, sg.n + " " + sg.t.toFixed(0) + "°", (x0 + x1) / 2, y - 9, alpha(sg.col, 1), 9.5, "center", 600);
            }
            /* ramps */
            if (si > 0) {
              var py = tY(segs[si - 1].t);
              ctx.strokeStyle = alpha(sg.col, 0.4);
              ctx.beginPath(); ctx.moveTo(x0, py); ctx.lineTo(x0, y); ctx.stroke();
            }
          }
          ctx.strokeStyle = alpha(C.ink, 0.06);
          ctx.beginPath(); ctx.moveTo(ox, ty0); ctx.lineTo(ox, ty1); ctx.stroke();
        }

        /* playhead + live block temperature */
        if (P.sim) {
          var within = (P.phase === 0 ? 0 : P.phase === 1 ? PCR.T_DEN : PCR.T_DEN + PCR.T_ANN) +
                       P.phaseT * (P.phase === 0 ? PCR.T_DEN : P.phase === 1 ? PCR.T_ANN : PCR.T_EXT);
          var slot = P.running ? (P.cyc % showC) : (showC - 1);
          var frac = P.running ? within / totalW : 1;
          var px = tx0 + (slot + frac) * cw;
          ctx.strokeStyle = alpha(C.ink, 0.55);
          ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(px, ty0 - 6); ctx.lineTo(px, ty1 + 4); ctx.stroke();
          var bt = P.running ? blockTemp() : P.Te;
          ctx.beginPath();
          ctx.arc(px, tY(bt), 4.5, 0, 6.2832);
          ctx.fillStyle = segs[P.phase].col;
          ctx.fill();
          label(ctx, bt.toFixed(1) + " °C", tx1, ty0 - 2, alpha(C.ink, 1), 13, "right", 700);
          label(ctx, P.running ? "cycle " + (P.cyc + 1) + " / " + P.cycles + " · " + segs[P.phase].n
                               : (P.done ? "program complete" : "idle"),
                tx0, ty0 - 2, alpha(C.faint, 1), 10, "left");
        } else {
          label(ctx, "program loaded — press Run", tx0, ty0 - 2, alpha(C.faint, 1), 10, "left");
        }

        /* ---------- amplification chart ---------- */
        var gx0 = padL, gx1 = W - padR, gy0 = ty1 + gapY + 22, gy1 = H - 30;
        var loD = 3, hiD = 13;
        function gY(n) {
          var l = Math.log10(Math.max(n, 1));
          return gy1 - clamp((l - loD) / (hiD - loD), 0, 1) * (gy1 - gy0);
        }
        function gX(c) { return gx0 + c / Math.max(1, P.cycles) * (gx1 - gx0); }

        label(ctx, "copies per 50 µL reaction", gx0, gy0 - 14, alpha(C.faint, 1), 10, "left", 500);

        for (var d = loD; d <= hiD; d++) {
          var y2 = gY(Math.pow(10, d));
          ctx.strokeStyle = alpha(C.ink, d % 3 === 0 ? 0.10 : 0.05);
          ctx.beginPath(); ctx.moveTo(gx0, y2); ctx.lineTo(gx1, y2); ctx.stroke();
          if (d % 2 === 1 || d === hiD) label(ctx, "10" + sup(d), gx0 - 8, y2, alpha(C.faint, 1), 9.5, "right");
        }
        /* cycle axis */
        var stepC = P.cycles > 30 ? 10 : 5;
        for (var cc = 0; cc <= P.cycles; cc += stepC) {
          var x2 = gX(cc);
          ctx.strokeStyle = alpha(C.ink, 0.06);
          ctx.beginPath(); ctx.moveTo(x2, gy0); ctx.lineTo(x2, gy1); ctx.stroke();
          label(ctx, String(cc), x2, gy1 + 12, alpha(C.faint, 1), 9.5, "center");
        }
        label(ctx, "cycle", (gx0 + gx1) / 2, gy1 + 24, alpha(C.faint, 1), 9.5, "center");

        /* plateau ceiling */
        var yCap = gY(PCR.NMAX);
        ctx.strokeStyle = alpha(C.faint, 0.7);
        ctx.setLineDash([2, 4]);
        ctx.beginPath(); ctx.moveTo(gx0, yCap); ctx.lineTo(gx1, yCap); ctx.stroke();
        ctx.setLineDash([]);
        label(ctx, "reagent ceiling", gx1 - 3, yCap - 8, alpha(C.faint, 1), 9, "right");

        /* theoretical 2^n */
        ctx.strokeStyle = alpha(C.ink, 0.28);
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (var t3 = 0; t3 <= P.cycles; t3++) {
          var yv = gY(PCR.N0 * Math.pow(2, t3));
          if (!t3) ctx.moveTo(gX(t3), yv); else ctx.lineTo(gX(t3), yv);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        label(ctx, "perfect 2ⁿ", gX(P.cycles) - 4, gY(PCR.N0 * Math.pow(2, P.cycles)) - 10, alpha(C.ink, 0.45), 9.5, "right");

        if (P.sim) {
          var upto = P.running ? P.cyc : P.cycles;
          var hist = P.sim.hist;
          /* non-specific */
          if (P.sim.ns > PCR.N0 * 2) {
            ctx.strokeStyle = alpha(C.rose, 0.75);
            ctx.setLineDash([3, 3]);
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            for (var k2 = 0; k2 <= upto; k2++) {
              var yn = gY(hist[k2].ns);
              if (!k2) ctx.moveTo(gX(k2), yn); else ctx.lineTo(gX(k2), yn);
            }
            ctx.stroke();
            ctx.setLineDash([]);
          }
          /* specific product, filled */
          ctx.beginPath();
          for (var k = 0; k <= upto; k++) {
            var ys = gY(hist[k].spec);
            if (!k) ctx.moveTo(gX(k), ys); else ctx.lineTo(gX(k), ys);
          }
          ctx.lineTo(gX(upto), gy1);
          ctx.lineTo(gX(0), gy1);
          ctx.closePath();
          var gg = ctx.createLinearGradient(0, gy0, 0, gy1);
          gg.addColorStop(0, alpha(C.em, 0.22));
          gg.addColorStop(1, alpha(C.em, 0.02));
          ctx.fillStyle = gg;
          ctx.fill();

          ctx.strokeStyle = C.em;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (var k3 = 0; k3 <= upto; k3++) {
            var y3 = gY(hist[k3].spec);
            if (!k3) ctx.moveTo(gX(k3), y3); else ctx.lineTo(gX(k3), y3);
          }
          ctx.stroke();

          var lastX = gX(upto), lastY = gY(hist[upto].spec);
          ctx.beginPath(); ctx.arc(lastX, lastY, 4, 0, 6.2832);
          ctx.fillStyle = C.em; ctx.fill();
          var tag = sci(hist[upto].spec) + " copies";
          ctx.font = "600 11px " + MONO;
          var tw = ctx.measureText(tag).width;
          var tagX = Math.min(lastX + 8, gx1 - tw - 6);
          label(ctx, tag, tagX, lastY - 12, alpha(C.ink, 1), 11, "left", 600);

          /* legend */
          var lgY = gy0 + 2;
          label(ctx, "● specific product", gx0 + 6, lgY, alpha(C.em, 1), 9.5, "left", 600);
          if (P.sim.ns > PCR.N0 * 2) label(ctx, "● non-specific", gx0 + 118, lgY, alpha(C.rose, 1), 9.5, "left", 600);
        }

        canvas.say("Thermocycler. " + (P.running ? "Cycle " + (P.cyc + 1) + " of " + P.cycles :
          P.sim ? "Program complete." : "Idle.") + " Denature " + P.Td + ", anneal " + P.Ta + ", extend " + P.Te + " degrees.");
      }

      /* ---------------- wiring ---------------- */
      function sync() {
        P.Td = parseFloat(sD.value); P.Ta = parseFloat(sA.value);
        P.Te = parseFloat(sE.value); P.cycles = parseInt(sC.value, 10);
        vD.textContent = P.Td.toFixed(1) + " °C";
        vA.textContent = P.Ta.toFixed(1) + " °C";
        vE.textContent = P.Te.toFixed(1) + " °C";
        vC.textContent = P.cycles + "×";
        hints(); readout();
        P.dirty = true;
      }
      [sD, sA, sE, sC].forEach(function (s) {
        s.addEventListener("input", function () {
          sync();
          if (P.sim && !P.running) {
            P.sim = null; P.done = false; elOut.innerHTML = "";
            elSay.innerHTML = "Program changed — press <b>Run program</b> to cycle it.";
            elSay.style.borderLeftColor = "";
          }
          if (P.running) { P.running = false; P.sim = null; elOut.innerHTML = ""; }
        });
      });

      function renderSpeed() {
        elSpeed.innerHTML = chipRow([
          { v: "1", t: "1×" }, { v: "3", t: "3×" }, { v: "i", t: "Instant" }
        ], P.speed, null, "mlxp-sp");
        Array.prototype.forEach.call(elSpeed.querySelectorAll("button"), function (b) {
          b.addEventListener("click", function () {
            P.speed = b.getAttribute("data-v");
            syncChips(elSpeed, "button", P.speed);
            if (P.running && P.speed === "i") { P.cyc = P.cycles; P.running = false; P.done = true; outputs(); verdict(); P.dirty = true; }
          });
        });
      }

      host.querySelector("#mlxpRun").addEventListener("click", run);
      host.querySelector("#mlxpStd").addEventListener("click", function () {
        sD.value = 95; sA.value = 57; sE.value = 72; sC.value = 30;
        sync();
        P.sim = null; elOut.innerHTML = "";
        elSay.innerHTML = "<b>Standard program loaded.</b> 95 °C denature, 57 °C anneal (Tm − 4), 72 °C extend, " +
          "30 cycles. Run it, then change one temperature at a time and watch which failure you cause.";
        elSay.style.borderLeftColor = "";
        P.dirty = true;
      });

      renderSpeed();
      sync();
      elSay.innerHTML = "Primer pair Tm is <b>61 °C</b> and the amplicon is <b>1000 bp</b>. Set the block and press " +
        "<b>Run program</b>. Then try annealing at 66 °C, and at 47 °C — two completely different kinds of failure.";

      var tick = ticker(function (dt) {
        if (P.running && P.sim) {
          var per = SPEEDS[P.speed] || 0.36;
          var segFrac = P.phase === 0 ? PCR.T_DEN : P.phase === 1 ? PCR.T_ANN : PCR.T_EXT;
          var segSecs = per * (segFrac / (PCR.T_DEN + PCR.T_ANN + PCR.T_EXT));
          P.phaseT += dt / Math.max(0.001, segSecs);
          while (P.phaseT >= 1) {
            P.phaseT -= 1;
            P.phase++;
            if (P.phase > 2) {
              P.phase = 0;
              P.cyc++;
              outputs();
              if (P.cyc >= P.cycles) {
                P.cyc = P.cycles; P.running = false; P.done = true;
                outputs(); verdict();
                break;
              }
            }
          }
          P.dirty = true;
        }
        if (P.dirty) { draw(); P.dirty = false; }
      });

      return {
        dispose: function () {
          tick.dispose();
          canvas.dispose();
          pal.dispose();
          css.dispose();
          host.innerHTML = "";
        }
      };
    }
  });

})();
