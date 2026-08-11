/* ============================================================================
   BIOLOGY ENTELLOQ — THE LIVING FIELD.

   Physics Entelloq puts a sheet of spacetime behind the product and bends it
   around the cursor. This is the biological answer to that, and it is not the
   same idea in different colours: matter is passive and gets curved, whereas
   tissue is ALIVE and reaches toward what it wants. So the field here is a thick
   section of living tissue seen down a microscope, and the cursor is a nutrient
   source. Cells near it swell, their membranes brighten, and the capillary
   network grows toward it — chemotaxis, the oldest behaviour there is.

   Four things are happening at once in the shader:
     · a Worley cell field (membranes are the F2-F1 ridge — the real thing under
       phase contrast) in two parallax layers, so the section has thickness
     · a domain warp driven by slow fbm, because no real tissue is on a grid
     · ridged fbm capillaries that bias their flow toward the cursor
     · a breath — everything respires at about 7 cycles a minute, which is why
       it reads as alive rather than as a screensaver on a loop

   SELF-INSTALLING. Dropping this one <script> onto a page is the whole install:
   it makes its own canvas, injects its own CSS, picks its colour from
   <body data-page>, and follows the light/dark toggle. It never needs markup.
   ========================================================================== */
(function () {
  "use strict";
  if (window.BIOQ_ATMO) return;                       // idempotent: safe to double-inject

  // Inside the unified app shell each section loads in an iframe with ?embed=1.
  // The shell already has a field; a second one per iframe would mean two WebGL
  // contexts fighting for the GPU and a visible seam where the two tissues meet.
  // So the embedded page renders none of its own and goes transparent instead,
  // letting the shell's single continuous field show through — which is also why
  // navigating between sections never interrupts it.
  try {
    if (new URLSearchParams(location.search).get("embed")) {
      var t = document.createElement("style");
      t.id = "atmo-embed";
      t.textContent = "html,body{background:transparent!important}.bg-veil{display:none!important}";
      (document.head || document.documentElement).appendChild(t);
      window.BIOQ_ATMO = { theme: function () {}, setSection: function () {}, mouse: null, mode: "embedded" };
      return;
    }
  } catch (e) {}

  /* --- where the colour comes from -------------------------------------- */
  // Each pillar gets its own biology, and the hues deliberately match the `tc`
  // accent the app shell already assigns that view — so the field is the same
  // colour as the section you are standing in rather than a second, competing
  // palette. Intensity is how ALIVE the field looks: the Lab runs hot, Me runs quiet.
  var SECTIONS = {
    home:     ["#34d399", 0.44],   // em     — chlorophyll
    learn:    ["#34d399", 0.52],   // em
    lessons:  ["#38e0d8", 0.50],   // cy
    reason:   ["#8b5cf6", 0.48],   // violet — the colour of thinking
    labs:     ["#f6c667", 0.52],   // amber  — a bench lamp
    solve:    ["#7c8cf8", 0.48],   // indigo
    explore:  ["#38e0d8", 0.58],   // cy     — open water
    me:       ["#c9a86a", 0.34],   // quiet, warm, low
    about:    ["#34d399", 0.46],   // em
    lab:      ["#fb7185", 0.64],   // rose   — an opened body, and the field runs hot
    universe: ["#38e0d8", 0.60]    // cy
  };

  var reduced = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var STILL = reduced || /[?&#](still|print)=?1?/.test(location.search + location.hash);

  /* --- install ----------------------------------------------------------- */
  var css = document.createElement("style");
  css.id = "atmo-css";
  css.textContent =
    // z-index:-1, NOT 0. A positioned element at z-index:0 paints ABOVE ordinary
    // in-flow block content, so the field would cover the page. Negative z puts it
    // between the root background and everything else, which means not one existing
    // element needs its position or stacking touched — and the product's fixed nav
    // (position:fixed;z-index:60) keeps working exactly as before.
    "#atmo{position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;" +
      "opacity:0;transition:opacity 1.2s cubic-bezier(.22,1,.36,1);display:block}" +
    "#atmo.lit{opacity:.78}" +
    // In light mode the same field reads as a stained section on a white slide, so
    // it stays — but fainter, because ink on paper is a quieter medium.
    "html[data-theme=\"light\"] #atmo.lit{opacity:.42}" +
    // The pages paint --bg on BOTH html and body; body's copy would hide a
    // negative-z child, so hand the background to the root alone. --bg is a themed
    // custom property, so this keeps following the light/dark toggle for free.
    "html{background:var(--bg,#04070a)}body{background:transparent!important}";
  (document.head || document.documentElement).appendChild(css);

  var cv = document.createElement("canvas");
  cv.id = "atmo";
  cv.setAttribute("aria-hidden", "true");
  // NOTE: attach() is *declared* here but deliberately not *called* until the very
  // bottom of this module. It reaches into cur/tgt/M/FS/VS, all of which are `var`
  // bindings that are hoisted but still undefined at this point in the file —
  // calling it here would throw on the first property write and silently leave the
  // page with no field at all.
  function attach() {
    if (!document.body) return setTimeout(attach, 16);
    document.body.insertBefore(cv, document.body.firstChild);
    // The class is what fades the field in, and it must land on a LATER frame than
    // the insert or the CSS transition has nothing to transition from. rAF is the
    // usual way to get that, but rAF does not run at all in a background tab — so a
    // page that loads hidden would sit at opacity 0. The timer is the backstop;
    // adding the class twice costs nothing.
    function lit() { cv.classList.add("lit"); }
    requestAnimationFrame(lit);
    setTimeout(lit, 80);
    boot();
  }

  /* --- state ------------------------------------------------------------- */
  function hexRGB(h) {
    h = String(h).replace("#", "");
    return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
  }
  var cur = { r: 0.20, g: 0.83, b: 0.60, in: 0.44, lt: 0 };
  var tgt = { r: 0.20, g: 0.83, b: 0.60, in: 0.44, lt: 0 };
  var M = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2, live: 0, tlive: 0 };

  addEventListener("pointermove", function (e) {
    M.tx = e.clientX; M.ty = e.clientY; M.tlive = 1;
  }, { passive: true });
  // A pointer that has left should stop feeding the tissue, or the glow sits there
  // forever on a page nobody is touching. pointerleave does not bubble, so it has
  // to be bound to the root element rather than to window; mouseout with a null
  // relatedTarget is the belt-and-braces case for leaving through the chrome.
  document.documentElement.addEventListener("pointerleave", function () { M.tlive = 0; }, { passive: true });
  addEventListener("mouseout", function (e) { if (!e.relatedTarget) M.tlive = 0; }, { passive: true });
  addEventListener("blur", function () { M.tlive = 0; });
  // Touch has no hover: without this the glow would stay wherever the last tap
  // landed, permanently, on every phone.
  addEventListener("pointerup", function (e) {
    if (e.pointerType !== "mouse") M.tlive = 0;
  }, { passive: true });

  function theme(rgb, intensity) {
    tgt.r = rgb[0]; tgt.g = rgb[1]; tgt.b = rgb[2];
    if (typeof intensity === "number") tgt.in = intensity;
  }
  function setSection(key) {
    var s = SECTIONS[key] || SECTIONS.home;
    theme(hexRGB(s[0]), s[1]);
    nudge();                             // navigating must restain the field even in STILL mode
  }
  // repaint is filled in by whichever renderer boots. In STILL mode (reduced
  // motion, or ?still=1) exactly one frame is ever drawn, so without this a reader
  // who switches to light mode would be left looking at the dark field forever.
  var repaint = null;
  function nudge() {
    if (!STILL || !repaint) return;      // the animated path picks the change up on its own
    for (var i = 0; i < 60; i++) ease(); // settle the eased colour, then draw the one frame
    repaint(0);
  }
  function readTheme() {
    var next = (document.documentElement.getAttribute("data-theme") === "light") ? 1 : 0;
    if (next === tgt.lt) return;
    tgt.lt = next;
    nudge();
  }

  function ease() {
    cur.r += (tgt.r - cur.r) * 0.035; cur.g += (tgt.g - cur.g) * 0.035;
    cur.b += (tgt.b - cur.b) * 0.035; cur.in += (tgt.in - cur.in) * 0.035;
    cur.lt += (tgt.lt - cur.lt) * 0.08;
    M.x += (M.tx - M.x) * 0.075; M.y += (M.ty - M.y) * 0.075;
    M.live += (M.tlive - M.live) * 0.04;
  }

  /* --- the field --------------------------------------------------------- */
  var FS = [
    "precision mediump float;",
    "uniform vec2 uRes;uniform float uT;uniform vec2 uM;uniform vec3 uC;uniform float uIn;uniform float uLive;uniform float uLight;",

    "float h1(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
    "vec2 h2(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}",
    "float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
    " float a=h1(i),b=h1(i+vec2(1,0)),c=h1(i+vec2(0,1)),d=h1(i+vec2(1,1));",
    " return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}",
    "float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*vn(p);p*=2.07;a*=.5;}return v;}",
    // Ridged noise gives threads instead of blobs — this is what makes a capillary
    // look like a vessel and not like a cloud.
    "float ridge(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*(1.-abs(vn(p)*2.-1.));p*=2.11;a*=.5;}return v;}",

    // Worley. Returns (F1, F2-F1, cell id). Every nucleus orbits its own cell on a
    // slow private path, so no two cells ever pulse together.
    "vec3 cells(vec2 p,float t){vec2 n=floor(p),f=fract(p);",
    " float f1=8.,f2=8.;vec2 id=vec2(0.);",
    " for(int j=-1;j<=1;j++){for(int i=-1;i<=1;i++){",
    "  vec2 g=vec2(float(i),float(j));vec2 o=h2(n+g);",
    "  o=.5+.40*sin(t*.32+6.2831*o);",
    "  float d=length(g+o-f);",
    "  if(d<f1){f2=f1;f1=d;id=n+g;}else if(d<f2){f2=d;}",
    " }}",
    " return vec3(f1,f2-f1,h1(id));}",

    "void main(){",
    " vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;",
    " vec2 m=(uM-.5*uRes)/uRes.y;m.y*=-1.;",
    " float t=uT;",
    // ~7 breaths a minute. Slow enough that you feel it rather than watch it.
    " float breath=.5+.5*sin(t*.72);",

    // Chemotaxis. Everything below is stronger the closer it is to the cursor,
    // and uLive fades the whole effect out when the pointer leaves.
    " float rm=length(uv-m);",
    // Tight. A wide gradient turns the whole page into a lamp; the point is a
    // local response in the tissue the pointer is actually over, so the falloff
    // is effectively gone by a third of the screen height.
    " float food=exp(-rm*rm*7.5)*uLive;",

    // Domain warp — the reason this reads as tissue and not as a tiling.
    " vec2 w=uv+vec2(fbm(uv*1.5+t*.05),fbm(uv*1.5-t*.04+11.3))*.34;",
    // Tissue swells toward the food source: cells near the cursor get physically
    // bigger by shrinking the sampling scale there.
    " float swell=1.-food*.30;",

    // Two layers at different depths. The far one drifts slower and sits dimmer,
    // which is what gives a flat quad the thickness of a real section.
    " vec3 c1=cells(w*3.4*swell+vec2(t*.020,-t*.014),t);",
    " vec3 c2=cells(w*6.9*swell+vec2(-t*.030,t*.023)+31.7,t*1.25);",

    // Membrane = the F2-F1 ridge. This is the single most biological line there is.
    " float mem1=1.-smoothstep(.0,.085,c1.y);",
    " float mem2=1.-smoothstep(.0,.060,c2.y);",
    // Cytoplasm: each cell tinted by its own id, so the field has variation
    // rather than one flat wash.
    " float cyto=(.35+.65*c1.z)*(1.-smoothstep(.15,.85,c1.x));",
    // Nuclei, breathing slightly out of phase per cell.
    " float nuc=smoothstep(.135+.02*sin(t*.6+c1.z*31.),.0,c1.x)*(.55+.45*c1.z);",

    // Capillaries, warped again so they wander, and pulled toward the cursor so
    // the network visibly grows in that direction.
    " vec2 vp=w*2.3+vec2(t*.035,-t*.028)-normalize(uv-m+1e-4)*food*.55;",
    " float vas=ridge(vp);",
    " vas=pow(max(vas-.62,0.)*2.6,2.0);",

    // Motes — organelles and spores adrift in the medium, the counterpart to the
    // stars in the physics field. They rise, because everything in a fluid does.
    " vec2 sp=w*17.0+vec2(0.,-t*.10);vec2 si=floor(sp);vec2 sf=fract(sp)-.5;",
    " float sv=h1(si);",
    " float mote=step(.972,sv)*smoothstep(.055,0.,length(sf-(h2(si)-.5)*.6))*(.55+.45*sin(t*2.1+sv*44.));",

    // --- compose ---
    " float lum=(.030+.055*breath)*(.55+uIn);",
    " vec3 col=vec3(.012,.026,.034)*(1.-uLight);",
    " col+=uC*cyto*lum*1.35;",
    " col+=uC*mem1*(.055+uIn*.13)*(.75+.25*breath);",
    " col+=mix(uC,vec3(1.),.35)*mem2*(.022+uIn*.055);",
    " col+=mix(uC,vec3(1.),.55)*nuc*(.020+uIn*.048);",
    " col+=mix(uC,vec3(1.,.55,.52),.30)*vas*(.055+uIn*.14);",
    " col+=vec3(.85,.95,1.)*mote*.55;",
    // The food source itself: a soft bloom, plus a brightening of whatever tissue
    // is under it, so the cursor lights the section rather than floating over it.
    " col+=uC*food*(.085+uIn*.15);",
    " col*=1.+food*.34;",
    // Depth: the section is thickest and best-lit in the middle of the field.
    " col*=1.-.38*smoothstep(.55,1.35,length(uv));",

    // Light mode: invert the physics, not the palette. On a slide the stain
    // ABSORBS — so a green stain removes red and blue and leaves green, which
    // means the structures subtract (1-uC), not uC. Subtracting uC would print
    // the complement and give a magenta negative of the tissue.
    " float dens=cyto*.30+mem1*1.05+mem2*.42+nuc*.62+vas*.95;",
    " dens=min(dens*(.46+uIn*.60)*(1.+food*.45),1.25);",
    " vec3 ink=vec3(1.)-(vec3(1.)-uC)*dens*.80-vec3(.05)*dens;",
    // Illumination falls off toward the edge of the coverslip.
    " ink=mix(ink,vec3(1.),.22*smoothstep(.55,1.4,length(uv)));",
    " col=mix(col,ink,uLight);",

    " gl_FragColor=vec4(col,1.);}"
  ].join("\n");

  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";

  function boot() {
    readTheme();
    // Follow the product's own theme toggle without it having to know we exist.
    try {
      new MutationObserver(readTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    } catch (e) {}
    // Pick the colour from the page the shell already declares.
    setSection((document.body && document.body.getAttribute("data-page")) || "home");
    for (var i = 0; i < 40; i++) ease();     // start already at the right colour, no fade-in from green

    var gl = null;
    try {
      gl = cv.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" })
        || cv.getContext("experimental-webgl", { alpha: true, antialias: false, depth: false });
    } catch (e) {}
    if (!gl) return fallback();

    function sh(ty, src) {
      var o = gl.createShader(ty); gl.shaderSource(o, src); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o) || "compile");
      return o;
    }
    var prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link");
    } catch (e) { return fallback(); }

    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var lp = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(lp);
    gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, "uRes"), uT = gl.getUniformLocation(prog, "uT"),
        uM = gl.getUniformLocation(prog, "uM"), uC = gl.getUniformLocation(prog, "uC"),
        uIn = gl.getUniformLocation(prog, "uIn"), uLive = gl.getUniformLocation(prog, "uLive"),
        uLight = gl.getUniformLocation(prog, "uLight");

    // A full-screen procedural field is fill-rate bound, so resolution is the one
    // dial that matters. 1.25x is enough for the membranes to stay crisp and cheap
    // enough that an integrated GPU never notices.
    var dpr = Math.min(devicePixelRatio || 1, 1.25);
    // A page can boot while its tab is hidden or its pane is not compositing, and
    // then innerWidth is 0 — sizing to that leaves a 1x1 canvas which never
    // recovers, because becoming visible does not fire a resize event. Fall back
    // through the layout box to a sane default so the field is always drawable.
    function vw() { return innerWidth || document.documentElement.clientWidth || cv.clientWidth || 1280; }
    function vh() { return innerHeight || document.documentElement.clientHeight || cv.clientHeight || 800; }
    function size() {
      // Re-read it every measure: devicePixelRatio changes when the window moves to
      // a display of a different density, or the browser is zoomed.
      dpr = Math.min(devicePixelRatio || 1, 1.25);
      var w = Math.max(1, Math.round(vw() * dpr)), h = Math.max(1, Math.round(vh() * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    }
    // draw() re-measures on every frame, so while the loop is running the resize
    // event has nothing to add. It matters in STILL mode, where resizing the canvas
    // clears it and no further frame is coming to put the field back — and it is
    // coalesced to one measure per frame, because a window drag fires it in bursts.
    var rz = 0;
    addEventListener("resize", function () {
      if (rz) return;
      rz = requestAnimationFrame(function () { rz = 0; size(); if (STILL) draw(0); });
    });
    size();

    var raf = null, t0 = 0;
    // draw() is the whole render and nothing else; frame() is draw() plus the
    // scheduling. Keeping them apart is what lets _tick() below render on demand
    // without quietly queueing a second rAF alongside the running loop.
    function draw(ms) {
      ease(); size();
      if (!t0) t0 = ms || 0;
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uT, ((ms || 0) - t0) * 0.001);
      var s = cv.width / vw();
      gl.uniform2f(uM, M.x * s, (vh() - M.y) * s);
      gl.uniform3f(uC, cur.r, cur.g, cur.b);
      gl.uniform1f(uIn, cur.in);
      gl.uniform1f(uLive, M.live);
      gl.uniform1f(uLight, cur.lt);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function frame(ms) {
      raf = null;
      draw(ms);
      if (!STILL) raf = requestAnimationFrame(frame);
    }
    repaint = draw;
    if (STILL) draw(0); else raf = requestAnimationFrame(frame);

    // A field nobody can see must not cost a frame.
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
      // Coming back from hidden also re-measures, because the viewport may have
      // been 0 the whole time the tab was in the background.
      else if (!raf && !STILL) { size(); raf = requestAnimationFrame(frame); }
    });

    // _tick renders exactly one frame on demand. rAF is throttled to nothing in a
    // hidden tab, so this is the only way to prove the field actually draws when
    // the page is not on screen — which is precisely when it needs proving.
    window.BIOQ_ATMO = { theme: theme, setSection: setSection, mouse: M, mode: "webgl", _tick: draw };
  }

  /* --- fallback ---------------------------------------------------------- */
  // No WebGL. Draw the same idea in 2D: drifting cells with membranes and nuclei,
  // and a nutrient glow at the cursor. Fewer cells, no capillaries, same product.
  function fallback() {
    var ctx = cv.getContext("2d");
    if (!ctx) { window.BIOQ_ATMO = { theme: theme, setSection: setSection, mouse: M, mode: "none" }; return; }
    var dpr = Math.min(devicePixelRatio || 1, 1.5), W = 0, H = 0, pop = [];
    // Same reasoning as the WebGL path: a page can boot hidden with innerWidth 0,
    // and becoming visible does not fire a resize event.
    function vw() { return innerWidth || document.documentElement.clientWidth || cv.clientWidth || 1280; }
    function vh() { return innerHeight || document.documentElement.clientHeight || cv.clientHeight || 800; }
    function cell(x, y) {
      return {
        x: x, y: y, r: 42 + Math.random() * 78,
        vx: (Math.random() - 0.5) * 0.13, vy: (Math.random() - 0.5) * 0.13, ph: Math.random() * 6.283
      };
    }
    function size() {
      var w = vw(), h = vh();
      // devicePixelRatio is not fixed for the life of a page: dragging the window
      // to a display of a different density, or zooming the browser, changes it,
      // and a stale one leaves the field soft or oversampled.
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      // Reseeding the population here is what used to make the whole field jump on
      // every resize — and resize is not a rare event: a window drag fires it
      // continuously, and on a phone so does the URL bar collapsing. So the cells
      // are carried across and rescaled into the new box instead, and only the
      // surplus or shortfall is dropped or seeded to keep the density right.
      var sx = W ? w / W : 1, sy = H ? h / H : 1;
      for (var i = 0; i < pop.length; i++) { pop[i].x *= sx; pop[i].y *= sy; }
      W = w; H = h;
      cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.max(10, Math.min(30, Math.round(W * H / 46000)));
      while (pop.length > n) pop.pop();
      while (pop.length < n) pop.push(cell(Math.random() * W, Math.random() * H));
    }
    // Resize arrives in bursts, and each one reallocates the backing store, so it
    // is coalesced to one measure per frame — which is all the display can show.
    var rz = 0;
    function onResize() {
      if (rz) return;
      rz = requestAnimationFrame(function () {
        rz = 0; size();
        // Setting cv.width clears the canvas, and in STILL mode no further frame is
        // coming, so the single frame has to be drawn again by hand.
        if (STILL) frame();
      });
    }
    size(); addEventListener("resize", onResize);

    var raf = null, t = 0;
    function rgba(a) { return "rgba(" + (cur.r * 255 | 0) + "," + (cur.g * 255 | 0) + "," + (cur.b * 255 | 0) + "," + a + ")"; }
    function frame() {
      raf = null; ease(); t += 0.016;
      var light = cur.lt > 0.5;
      ctx.clearRect(0, 0, W, H);
      var glow = ctx.createRadialGradient(M.x, M.y, 0, M.x, M.y, 340);
      glow.addColorStop(0, rgba((light ? 0.10 : 0.13) * M.live)); glow.addColorStop(1, rgba(0));
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < pop.length; i++) {
        var c = pop[i];
        c.x += c.vx; c.y += c.vy;
        if (c.x < -140) c.x = W + 140; if (c.x > W + 140) c.x = -140;
        if (c.y < -140) c.y = H + 140; if (c.y > H + 140) c.y = -140;
        // Chemotaxis, cheaply: a cell near the cursor swells.
        var d = Math.hypot(c.x - M.x, c.y - M.y);
        var food = Math.exp(-(d * d) / 260000) * M.live;
        var r = c.r * (1 + Math.sin(t * 0.62 + c.ph) * 0.05 + food * 0.20);
        var g = ctx.createRadialGradient(c.x, c.y, r * 0.2, c.x, c.y, r);
        g.addColorStop(0, rgba((light ? 0.030 : 0.052) * (0.6 + cur.in) * (1 + food))); g.addColorStop(1, rgba(0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 6.283); ctx.fill();
        ctx.strokeStyle = rgba((light ? 0.055 : 0.085) * (1 + food * 1.4)); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 6.283); ctx.stroke();
        ctx.fillStyle = rgba((light ? 0.045 : 0.062) * (1 + food));
        ctx.beginPath(); ctx.arc(c.x + r * 0.11, c.y - r * 0.07, r * 0.24, 0, 6.283); ctx.fill();
      }
      if (!STILL) raf = requestAnimationFrame(frame);
    }
    repaint = frame;
    if (STILL) { for (var k = 0; k < 40; k++) ease(); frame(); } else raf = requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } return; }
      // Re-measure on the way back: the viewport may have been 0 for the whole time
      // the tab was in the background, and no resize event marks it coming good.
      size();
      if (STILL) frame();
      else if (!raf) raf = requestAnimationFrame(frame);
    });

    window.BIOQ_ATMO = { theme: theme, setSection: setSection, mouse: M, mode: "2d" };
  }

  /* --- go ---------------------------------------------------------------- */
  // Last line on purpose: everything above is now assigned, so boot() can read it.
  attach();
})();
