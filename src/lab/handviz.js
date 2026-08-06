/*
 * handviz.js — the live hand overlay. THE money shot.
 *
 * The student asked to SEE their hand in the world, Physics-Entelloq style:
 * their webcam feed composited in as an ambient backdrop, a glowing hand
 * skeleton riding the 21 tracked landmarks, thin cyan tracking rays, and the
 * same pinch cursor the dissection engine grabs with. This module draws all of
 * that into ONE full-viewport 2D canvas, layered above the 3D scene (z-index 15)
 * and below the glass chrome (z-index 20), with pointer-events:none so it can
 * never fight the mouse path.
 *
 * PRIVACY NOTE. hands.js normally refuses to expose raw landmarks — a skeleton
 * is "not drawable by design". That stance was deliberately overridden for this
 * refinement: hands.js now publishes a 2D-only, mirrored landmark set on each
 * hand view expressly so this overlay can exist. We consume it for DRAWING only;
 * depth is still never a control axis, and nothing here records or uploads.
 *
 * It owns no CSS in the shell — everything is inline on the canvas element and
 * painted with the Canvas 2D API, so it stays self-contained and needs no THREE.
 */

// ─────────────────────────────────────────────────────────────────────────────
// MediaPipe hand bone topology
// ─────────────────────────────────────────────────────────────────────────────
//
// 21 landmarks, MediaPipe index order:
//   0 wrist · 1–4 thumb · 5–8 index · 9–12 middle · 13–16 ring · 17–20 pinky
// Each pair below is one bone drawn as a connective line. Grouped by anatomical
// part so the glow reads as a real hand rather than a random graph. The palm is
// the wrist fanning out to each finger's MCP plus the knuckle ridge across them.
const HV_BONES = [
  // palm — wrist → thumb-CMC, wrist → index-MCP, the MCP knuckle ridge, wrist → pinky-MCP
  [0, 1], [0, 5], [5, 9], [9, 13], [13, 17], [0, 17],
  // thumb  — CMC → MCP → IP → TIP
  [1, 2], [2, 3], [3, 4],
  // index  — MCP → PIP → DIP → TIP
  [5, 6], [6, 7], [7, 8],
  // middle — MCP → PIP → DIP → TIP
  [9, 10], [10, 11], [11, 12],
  // ring   — MCP → PIP → DIP → TIP
  [13, 14], [14, 15], [15, 16],
  // pinky  — MCP → PIP → DIP → TIP
  [17, 18], [18, 19], [19, 20],
];

// The five fingertips — drawn as larger, brighter nodes and the origin of the
// cyan tracking rays.
const HV_FINGERTIPS = [4, 8, 12, 16, 20];

// ─────────────────────────────────────────────────────────────────────────────
// Palette (matches the app's CSS custom properties)
// ─────────────────────────────────────────────────────────────────────────────
const HV_EM = [52, 211, 153]; // --em  emerald
const HV_CY = [56, 224, 216]; // --cy  cyan
const HV_WARN = [240, 184, 102]; // --warn amber
const HV_BAD = [232, 115, 94]; // --bad  red
const HV_BG = [4, 7, 10]; // --bg   near-black
const HV_HOT = [206, 255, 236]; // hot near-white core for tips / pinch

const HV_TAU = Math.PI * 2;

// How far the contrast plate under a hand reaches, in CSS pixels, when the webcam
// backdrop is switched off. Sized to roughly a drawn hand: wide enough that the
// whole skeleton sits on it, tight enough that it reads as the hand's own shadow
// rather than a smudge over the specimen.
const HV_PLATE_R = 132;

function hvRgba(c, a) {
  return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
}
function hvLerp(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}
function hvClamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
function hvGestureName(g) {
  switch (g) {
    case "pinch":
      return "PINCH";
    case "point":
      return "POINT";
    case "fist":
      return "FIST";
    case "open":
      return "OPEN";
    default:
      return "IDLE";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// createHandViz
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the hand overlay. Constructing it appends one canvas to `root` (defaults
 * to document.body so its z-index sits cleanly between the scene and the chrome)
 * and touches nothing else — no camera, no timers, no rAF of its own. It paints
 * only when the host calls update(), so it inherits the host's frame clock and
 * pauses with it when the tab is hidden.
 *
 * @param {HTMLElement} [root] where to attach the canvas (default document.body)
 * @returns {{ mount:Function, update:Function, setEnabled:Function,
 *             setDial:Function, setBackdrop:Function, resize:Function,
 *             dispose:Function }}
 */
export function createHandViz(root) {
  const host = root || (typeof document !== "undefined" ? document.body : null);

  const canvas = document.createElement("canvas");
  canvas.className = "handviz";
  canvas.style.cssText =
    "position:fixed;left:0;top:0;width:100%;height:100%;" +
    "z-index:15;pointer-events:none;display:none";
  if (host) host.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  // Logical (CSS-pixel) drawing size, and the device-pixel backing scale.
  let W = 0;
  let H = 0;
  let dpr = 1;

  let enabled = false;
  let video = null;

  // Whether the webcam plate is composited in behind the overlay. Tracking does
  // not depend on it in any way — the landmarks, the glowing hand, the cursor and
  // the dial are all drawn from the tracker's numbers, and the video is only ever
  // wallpaper. Plenty of people do not want to watch themselves while they
  // dissect, so this is a pure display choice; Physics Entelloq tracks hands
  // without ever showing a camera and nothing about the gestures changes.
  let showVideo = true;

  // Per-hand cursor trails (pixel coords). Short and additive — a subtle comet
  // tail on the grip point, cleared the instant a hand leaves so no stale streak
  // is left hanging over the specimen.
  const MAX_TRAIL = 16;
  const trails = [[], []];

  // ── wrist-dial HUD state. Fed by the host each frame while a hand drives; drawn
  // as a compact rotary around the cursor whenever the wrist is actively twisting,
  // then eased out. `fade` is the draw envelope, decayed by real elapsed time so it
  // reads the same at 30 or 144 fps.
  const dialState = {
    active: false,
    progress: 0, // -1..1 toward the previous/next notch
    index: 0, // which tool is current
    labels: [], // tool display names, in cycle order
    cursor: null, // {x,y} normalised, where to centre the dial
    fade: 0,
    lastT: 0,
  };
  function clearDial() {
    dialState.active = false;
    dialState.progress = 0;
    dialState.fade = 0;
    dialState.cursor = null;
    dialState.lastT = 0;
  }
  function setDial(s) {
    if (!s) {
      dialState.active = false;
      return;
    }
    dialState.active = !!s.active;
    dialState.progress = typeof s.progress === "number" ? s.progress : 0;
    if (typeof s.index === "number") dialState.index = s.index;
    if (s.labels) dialState.labels = s.labels;
    if (s.cursor) dialState.cursor = s.cursor;
  }

  // ── sizing ──────────────────────────────────────────────────────────────────
  function resize() {
    dpr = Math.min(
      typeof window !== "undefined" && window.devicePixelRatio
        ? window.devicePixelRatio
        : 1,
      2,
    );
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
  }
  resize();

  // ── mount the tracker's <video> as the backdrop source ───────────────────────
  function mount(videoEl) {
    video = videoEl || null;
  }

  // ── show / hide the whole layer (mouse mode hides it) ────────────────────────
  function setEnabled(on) {
    enabled = !!on;
    canvas.style.display = enabled ? "block" : "none";
    if (!enabled) {
      trails[0].length = 0;
      trails[1].length = 0;
      // A dial left active when the layer is hidden would otherwise re-render as a
      // ghost (fade still 1, cursor still referenced) the next time update() runs.
      clearDial();
      // Wipe the backing store so nothing lingers if it is shown again later.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ── show / hide the webcam plate without touching anything else ──────────────
  function setBackdrop(on) {
    showVideo = on !== false;
  }

  // ── backdrop: dim, desaturated, mirrored webcam + a center-clean vignette ─────
  function drawBackdrop() {
    if (
      !video ||
      video.readyState < 2 ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      return; // no pixels yet — leave the scene fully visible, don't dim it
    }
    ctx.save();
    ctx.globalAlpha = 0.24;
    // Canvas filter dims + drains colour so it reads as ambience, not a selfie.
    // Silently ignored on the rare engine without filter support — then alpha
    // alone keeps it subtle.
    ctx.filter = "grayscale(0.55) brightness(0.72) contrast(1.05)";
    // Mirror horizontally so the video matches the already-mirrored landmark x.
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    drawCover(video, 0, 0, W, H);
    ctx.restore(); // restores transform, alpha AND filter

    // Center-clean + edge vignette: darken the middle back toward --bg so the
    // specimen floats clean, let a faint ring of webcam read through, then frame
    // the corners. Painted with the page background so it never tints the scene.
    const g = ctx.createRadialGradient(
      W / 2,
      H * 0.46,
      0,
      W / 2,
      H * 0.46,
      Math.max(W, H) * 0.62,
    );
    g.addColorStop(0.0, hvRgba(HV_BG, 0.55));
    g.addColorStop(0.42, hvRgba(HV_BG, 0.0));
    g.addColorStop(1.0, hvRgba(HV_BG, 0.42));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // object-fit:cover for a video drawn into (dx,dy,dw,dh).
  function drawCover(v, dx, dy, dw, dh) {
    const vw = v.videoWidth;
    const vh = v.videoHeight;
    const s = Math.max(dw / vw, dh / vh);
    const sw = dw / s;
    const sh = dh / s;
    const sx = (vw - sw) / 2;
    const sy = (vh - sh) / 2;
    ctx.drawImage(v, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  // ── keeping the drawn hand glued to the resampled cursor ─────────────────────
  //
  // hands.js publishes two versions of the grip point: `cursor`, the truth as of
  // the last camera frame, and `cursorS`, that point resampled on every animation
  // frame and projected a little forward to pay back detector latency. The 21
  // landmarks are camera-rate only. Drawing the ring from one clock and the
  // skeleton from the other would let the ring slide off the fingertip it is
  // supposed to sit on — a small detachment, but it is the one thing on screen
  // that says "this is not really tracking your hand".
  //
  // Between two detections the whole hand translates together, so shifting every
  // landmark by the cursor's own resample offset keeps them locked — and smooths
  // the skeleton for free instead of stepping it at 30Hz. It ignores rotation and
  // scale change across the gap, which over ~30ms is far below a drawn pixel.
  const hvOff = { x: 0, y: 0 };
  function hvResampleOffset(h) {
    hvOff.x = 0;
    hvOff.y = 0;
    if (h.cursorS && h.cursor) {
      hvOff.x = (h.cursorS.x - h.cursor.x) * W;
      hvOff.y = (h.cursorS.y - h.cursor.y) * H;
    }
    return hvOff;
  }

  /** The point the app aims with — resampled when the tracker offers it. */
  function hvGrip(h) {
    return h.cursorS || h.cursor;
  }

  // ── faint cyan tracking rays from each fingertip toward screen-centre ────────
  function drawTrackingLines(h, ox, oy) {
    const cx = W / 2;
    const cy = H * 0.46;
    const lm = h.landmarks;
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    for (let f = 0; f < HV_FINGERTIPS.length; f++) {
      const tip = lm[HV_FINGERTIPS[f]];
      const tx = tip.x * W + ox;
      const ty = tip.y * H + oy;
      // Gradient fades to nothing before it reaches the middle, so the rays read
      // as aim indicators and never knot up over the specimen.
      const grad = ctx.createLinearGradient(tx, ty, cx, cy);
      grad.addColorStop(0, hvRgba(HV_CY, 0.16));
      grad.addColorStop(0.45, hvRgba(HV_CY, 0.04));
      grad.addColorStop(1, hvRgba(HV_CY, 0));
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }
  }

  // ── the glowing hand skeleton ────────────────────────────────────────────────
  function strokeBones(lm, ox, oy) {
    ctx.beginPath();
    for (let b = 0; b < HV_BONES.length; b++) {
      const a = lm[HV_BONES[b][0]];
      const c = lm[HV_BONES[b][1]];
      ctx.moveTo(a.x * W + ox, a.y * H + oy);
      ctx.lineTo(c.x * W + ox, c.y * H + oy);
    }
    ctx.stroke();
  }

  // ── contrast plate, drawn ONLY when the webcam backdrop is off ───────────────
  //
  // The skeleton, the rays and the cursor are all painted with `lighter`, so they
  // add light and can only be seen against something darker than themselves. With
  // the webcam plate on, the backdrop's vignette supplies that: it lays ~0.55 of
  // page-background over the middle of the frame. Take the backdrop away and that
  // dimming goes with it — over a brightly lit organ the thin bright core of the
  // bones washes straight out.
  //
  // Restoring the full-frame vignette would be the wrong fix: the whole point of
  // turning the camera off is to see the specimen, not to dim it. So the contrast
  // comes back LOCALLY and only where the overlay actually draws — a soft pool
  // under the palm plus a dark keyline down the bones, in normal compositing
  // before the additive pass. It reads as the hand's own shadow, which is what a
  // hand over a lit bench would cast anyway.
  function drawHandPlate(h, ox, oy) {
    const lm = h.landmarks;
    ctx.save();

    // Pool centred on the middle-finger MCP — the palm's centre, not the grip
    // point, so the plate sits under the whole hand instead of off at a fingertip.
    const px = lm[9].x * W + ox;
    const py = lm[9].y * H + oy;
    const pool = ctx.createRadialGradient(px, py, 0, px, py, HV_PLATE_R);
    pool.addColorStop(0, hvRgba(HV_BG, 0.34));
    pool.addColorStop(0.55, hvRgba(HV_BG, 0.17));
    pool.addColorStop(1, hvRgba(HV_BG, 0));
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.arc(px, py, HV_PLATE_R, 0, HV_TAU);
    ctx.fill();

    // Keyline: two dark strokes down the bones, wide-and-faint then narrow-and-
    // deeper, so the glow pass has a dark bed even where the pool has faded out at
    // the fingertips.
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = hvRgba(HV_BG, 0.24);
    ctx.lineWidth = 18;
    strokeBones(lm, ox, oy);
    ctx.strokeStyle = hvRgba(HV_BG, 0.34);
    ctx.lineWidth = 9;
    strokeBones(lm, ox, oy);

    ctx.restore();
  }

  function drawSkeleton(h, ox, oy) {
    const lm = h.landmarks;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Pass 1: wide, soft emerald glow.
    ctx.shadowColor = hvRgba(HV_EM, 0.9);
    ctx.shadowBlur = 16;
    ctx.strokeStyle = hvRgba(HV_EM, 0.28);
    ctx.lineWidth = 5.5;
    strokeBones(lm, ox, oy);

    // Pass 2: thin bright core threaded down the middle of the glow.
    ctx.shadowBlur = 6;
    ctx.strokeStyle = hvRgba(HV_HOT, 0.82);
    ctx.lineWidth = 1.6;
    strokeBones(lm, ox, oy);

    // Joints — filled dots; wrist a touch larger, fingertips largest + hottest.
    ctx.shadowColor = hvRgba(HV_EM, 0.95);
    ctx.shadowBlur = 8;
    for (let k = 0; k < 21; k++) {
      const isTip = HV_FINGERTIPS.indexOf(k) >= 0;
      const r = isTip ? 4.4 : k === 0 ? 4 : 2.7;
      const x = lm[k].x * W + ox;
      const y = lm[k].y * H + oy;
      ctx.fillStyle = isTip ? hvRgba(HV_HOT, 0.95) : hvRgba(HV_EM, 0.8);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, HV_TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // ── cursor trail (comet tail on the grip point) ──────────────────────────────
  function pushTrail(i, x, y) {
    const t = trails[i];
    const last = t[t.length - 1];
    // De-dupe while the hand is still, so a held pose doesn't stack a bright blob.
    if (last && Math.abs(last.x - x) < 0.6 && Math.abs(last.y - y) < 0.6) return;
    t.push({ x: x, y: y });
    if (t.length > MAX_TRAIL) t.shift();
  }

  function drawTrail(i) {
    const t = trails[i];
    if (t.length < 2) return;
    ctx.shadowColor = hvRgba(HV_CY, 0.8);
    for (let k = 1; k < t.length; k++) {
      const a = k / t.length; // newest segment brightest
      ctx.strokeStyle = hvRgba(HV_CY, 0.1 * a);
      ctx.lineWidth = 0.5 + 2.4 * a;
      ctx.shadowBlur = 6 * a;
      ctx.beginPath();
      ctx.moveTo(t[k - 1].x, t[k - 1].y);
      ctx.lineTo(t[k].x, t[k].y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // ── the pinch / grip cursor — sits exactly where the app is aiming ───────────
  function drawCursor(h, now) {
    const g = hvGrip(h);
    const x = g.x * W;
    const y = g.y * H;
    const s = hvClamp(h.pinchStrength || 0, 0, 1);
    // Emerald when open, shifting to cyan as the pinch closes.
    const col = hvLerp(HV_EM, HV_CY, s);
    // Radius grows with pinchStrength (same feel as the DOM cursor in main.js).
    const R = 17 + s * 13;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // Soft inner pool, deepening slightly as the grip closes.
    const fill = ctx.createRadialGradient(x, y, 0, x, y, R);
    fill.addColorStop(0, hvRgba(col, 0.1 + 0.22 * s));
    fill.addColorStop(1, hvRgba(col, 0));
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, HV_TAU);
    ctx.fill();

    // Main ring.
    ctx.shadowColor = hvRgba(col, 0.9);
    ctx.shadowBlur = 12;
    ctx.strokeStyle = hvRgba(col, 0.85);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, HV_TAU);
    ctx.stroke();

    // Grip meter: an arc from 12 o'clock that sweeps with pinchStrength.
    ctx.strokeStyle = hvRgba(HV_CY, 0.9);
    ctx.lineWidth = 2.6;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y, R + 3.5, -Math.PI / 2, -Math.PI / 2 + HV_TAU * s);
    ctx.stroke();

    // Four cardinal ticks — a light HUD reticle.
    ctx.shadowBlur = 0;
    ctx.strokeStyle = hvRgba(col, 0.5);
    ctx.lineWidth = 1;
    for (let a = 0; a < 4; a++) {
      const ang = a * (Math.PI / 2);
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      ctx.beginPath();
      ctx.moveTo(x + ca * (R + 7), y + sa * (R + 7));
      ctx.lineTo(x + ca * (R + 11), y + sa * (R + 11));
      ctx.stroke();
    }

    // Core: a solid, gently pulsing node when actually gripping; otherwise a
    // small quiet dot marking the exact point.
    if (h.isPinching) {
      const pulse = 1 + 0.12 * Math.sin(now * 0.012);
      ctx.shadowColor = hvRgba(HV_CY, 1);
      ctx.shadowBlur = 14;
      ctx.fillStyle = hvRgba(HV_HOT, 0.95);
      ctx.beginPath();
      ctx.arc(x, y, (4 + s * 3) * pulse, 0, HV_TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = hvRgba(col, 0.7);
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, HV_TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── status chip: "● 1 HAND · PINCH", coloured by tracking health ─────────────
  function hvRoundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawStatusChip(snap, hands) {
    let n = 0;
    let lead = null;
    for (let i = 0; i < hands.length; i++) {
      if (hands[i] && hands[i].present) {
        n++;
        if (!lead) lead = hands[i];
      }
    }
    const active = !!(snap && snap.active);
    const health = snap ? snap.health | 0 : 3;

    // Dot colour by health (red overrides when lost or no hand at all).
    let dot;
    if (!active || n === 0 || health >= 3) dot = HV_BAD;
    else if (health === 2) dot = HV_WARN;
    else dot = HV_EM;

    const label = n === 0 ? "NO HAND" : n === 1 ? "1 HAND" : "2 HANDS";
    const gest = lead ? hvGestureName(lead.gesture) : "";

    // Camera rate, shown ONLY when it has genuinely collapsed. hands.js measures
    // what the webcam is really delivering, and a dim room routinely halves it to
    // 15fps — at which point everything feels heavier and the student blames the
    // app. Naming the number at exactly that moment turns "this is laggy" into
    // "turn a light on". Above the threshold it stays invisible, because a
    // permanent telemetry readout is furniture, not an instrument.
    const fps = snap && typeof snap.detectFps === "number" ? snap.detectFps : 0;
    const rate = active && fps > 0 && fps < 20 ? Math.round(fps) + " FPS" : "";

    const x0 = 20;
    const y0 = 20;
    const padX = 12;
    const chipH = 27;
    const dotR = 3.5;
    const dotGap = 9;

    ctx.font =
      '600 11px ui-monospace,"SF Mono",Menlo,Consolas,monospace';
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const hasLS = "letterSpacing" in ctx;
    if (hasLS) ctx.letterSpacing = "1.6px";

    const labelW = ctx.measureText(label).width;
    const sepW = ctx.measureText("   ").width;
    const gestW = gest ? ctx.measureText(gest).width : 0;
    const rateW = rate ? ctx.measureText(rate).width : 0;
    const chipW = padX + dotR * 2 + dotGap + labelW
      + (gest ? sepW + gestW : 0) + (rate ? sepW + rateW : 0) + padX;
    const cy = y0 + chipH / 2;

    // Glass slab.
    hvRoundRect(x0, y0, chipW, chipH, 7);
    ctx.fillStyle = "rgba(8,13,18,0.72)";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.09)";
    ctx.stroke();

    // Status dot with a soft glow.
    ctx.save();
    ctx.shadowColor = hvRgba(dot, 0.9);
    ctx.shadowBlur = 8;
    ctx.fillStyle = hvRgba(dot, 1);
    ctx.beginPath();
    ctx.arc(x0 + padX + dotR, cy, dotR, 0, HV_TAU);
    ctx.fill();
    ctx.restore();

    // Text — bright count, dim gesture.
    let tx = x0 + padX + dotR * 2 + dotGap;
    ctx.fillStyle = "rgba(214,226,232,0.92)"; // --ink
    ctx.fillText(label, tx, cy + 0.5);
    tx += labelW;
    if (gest) {
      tx += sepW;
      ctx.fillStyle = hvRgba(dot === HV_BAD ? HV_BAD : HV_CY, 0.82);
      ctx.fillText(gest, tx, cy + 0.5);
      tx += gestW;
    }
    if (rate) {
      tx += sepW;
      ctx.fillStyle = hvRgba(HV_WARN, 0.8);
      ctx.fillText(rate, tx, cy + 0.5);
    }

    if (hasLS) ctx.letterSpacing = "0px";
  }

  // ── wrist-dial rotary — a compact instrument selector at the hand ────────────
  function drawDial(now) {
    const ds = dialState;
    // Fade envelope, decayed by real elapsed time so it eases out identically at
    // any framerate: full while actively twisting, gone ~450ms after.
    const dt = ds.lastT ? Math.min(120, now - ds.lastT) : 16;
    ds.lastT = now;
    if (ds.active) ds.fade = 1;
    else ds.fade = Math.max(0, ds.fade - dt / 450);
    if (ds.fade <= 0.001 || !ds.cursor || !ds.labels.length) return;

    const a = ds.fade;
    const n = ds.labels.length;
    const cx = ds.cursor.x * W;
    const cy = ds.cursor.y * H;
    const R = 52;
    const step = HV_TAU / n;
    const top = -Math.PI / 2; // notch 0 sits at 12 o'clock

    ctx.save();

    // Faint dark disc so the dial stays legible over bright tissue.
    const disc = ctx.createRadialGradient(cx, cy, R * 0.35, cx, cy, R + 16);
    disc.addColorStop(0, hvRgba(HV_BG, 0));
    disc.addColorStop(0.7, hvRgba(HV_BG, 0.34 * a));
    disc.addColorStop(1, hvRgba(HV_BG, 0));
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 16, 0, HV_TAU);
    ctx.fill();

    // The notch ring.
    ctx.lineWidth = 1;
    ctx.strokeStyle = hvRgba(HV_CY, 0.16 * a);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, HV_TAU);
    ctx.stroke();

    // One notch per instrument; the current one is a hot, glowing node.
    for (let i = 0; i < n; i++) {
      const ang = top + i * step;
      const x = cx + Math.cos(ang) * R;
      const y = cy + Math.sin(ang) * R;
      const on = i === ds.index;
      ctx.beginPath();
      ctx.arc(x, y, on ? 5 : 2.6, 0, HV_TAU);
      if (on) {
        ctx.shadowColor = hvRgba(HV_CY, 0.9 * a);
        ctx.shadowBlur = 10 * a;
        ctx.fillStyle = hvRgba(HV_HOT, 0.95 * a);
      } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle = hvRgba(HV_EM, 0.5 * a);
      }
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Progress needle: from the hub toward the active notch, swinging by the
    // fraction of a notch the twist has turned. When it reaches the next notch the
    // host steps the instrument and the needle snaps back to centre.
    const needle = top + ds.index * step + ds.progress * step;
    const nx = cx + Math.cos(needle) * (R - 8);
    const ny = cy + Math.sin(needle) * (R - 8);
    ctx.strokeStyle = hvRgba(HV_CY, 0.85 * a);
    ctx.lineWidth = 2.4;
    ctx.shadowColor = hvRgba(HV_CY, 0.8 * a);
    ctx.shadowBlur = 8 * a;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Current instrument name on a small chip under the dial.
    ctx.font = '600 12px ui-monospace,"SF Mono",Menlo,Consolas,monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const hasLS = "letterSpacing" in ctx;
    if (hasLS) ctx.letterSpacing = "1.5px";
    const label = (ds.labels[ds.index] || "").toUpperCase();
    const ly = cy + R + 20;
    const tw = ctx.measureText(label).width;
    hvRoundRect(cx - tw / 2 - 8, ly - 10, tw + 16, 20, 6);
    ctx.fillStyle = hvRgba(HV_BG, 0.6 * a);
    ctx.fill();
    ctx.fillStyle = hvRgba(HV_HOT, 0.92 * a);
    ctx.fillText(label, cx, ly + 0.5);
    if (hasLS) ctx.letterSpacing = "0px";

    ctx.restore();
  }

  // ── one frame ────────────────────────────────────────────────────────────────
  function update(snapshot) {
    if (!enabled) return;

    // Establish a CSS-pixel logical coordinate space over the HiDPI backing store.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const hands = (snapshot && snapshot.hands) || [];

    // The per-frame drawImage is genuinely skipped, not drawn at zero alpha —
    // compositing a 1280x720 video into a full-viewport canvas every frame is the
    // single most expensive thing this module does, and switching the plate off
    // should actually buy that back.
    if (showVideo) {
      drawBackdrop();
    } else {
      for (let i = 0; i < hands.length; i++) {
        const h = hands[i];
        if (!h || !h.present) continue;
        const o = hvResampleOffset(h);
        drawHandPlate(h, o.x, o.y);
      }
    }

    // Maintain trails: extend for present hands, drop for absent ones. The trail
    // rides the resampled point too, so it reads as a continuous comet rather than
    // a row of discrete beads at camera rate.
    for (let i = 0; i < 2; i++) {
      const h = hands[i];
      if (h && h.present) {
        const g = hvGrip(h);
        pushTrail(i, g.x * W, g.y * H);
      } else trails[i].length = 0;
    }

    // Additive pass — trails, tracking rays, skeleton all glow over the dark.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 2; i++) drawTrail(i);
    for (let i = 0; i < hands.length; i++) {
      const h = hands[i];
      if (!h || !h.present) continue;
      const o = hvResampleOffset(h);
      drawTrackingLines(h, o.x, o.y);
      drawSkeleton(h, o.x, o.y);
    }
    ctx.restore();

    // Cursor manages its own additive/normal state per element.
    for (let i = 0; i < hands.length; i++) {
      const h = hands[i];
      if (!h || !h.present) continue;
      drawCursor(h, now);
    }

    // Wrist-dial rotary. Self-heal: if no hand is present the host may not have
    // cleared it, so force it inactive here and let the fade ease it out — it can
    // never stick over the specimen.
    let anyPresent = false;
    for (let i = 0; i < hands.length; i++) {
      if (hands[i] && hands[i].present) { anyPresent = true; break; }
    }
    if (!anyPresent) dialState.active = false;
    drawDial(now);

    // Status chip last, in normal compositing so the glass reads true.
    drawStatusChip(snapshot, hands);
  }

  // ── teardown ─────────────────────────────────────────────────────────────────
  function dispose() {
    enabled = false;
    video = null;
    trails[0].length = 0;
    trails[1].length = 0;
    clearDial();
    if (canvas.parentNode) {
      try {
        canvas.parentNode.removeChild(canvas);
      } catch (e) {
        /* already detached */
      }
    }
  }

  return {
    mount: mount,
    update: update,
    setEnabled: setEnabled,
    setDial: setDial,
    setBackdrop: setBackdrop,
    resize: resize,
    dispose: dispose,
  };
}
