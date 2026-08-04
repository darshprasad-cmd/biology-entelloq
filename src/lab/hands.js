/**
 * hands.js — monocular hand tracking for the dissection table.
 *
 * Pipeline:  webcam → MediaPipe HandLandmarker → per-hand classification with
 * hysteresis → One-Euro filtering → a single long-lived snapshot object.
 *
 * THE 2.5D LAW. Nothing in this file uses landmark z as a control axis. Hand
 * depth from a single camera is noise dressed up as a number. Every signal we
 * publish is either in-plane (cursor, indexTip, roll) or a scale-invariant
 * ratio (pinchStrength, span) normalised by apparent hand size — so it stays
 * put when the student leans toward the camera. Depth belongs to the scene:
 * the app raycasts from cursor and takes the depth of whatever it hits.
 *
 * PRIVACY / ENCAPSULATION. Raw landmarks never leave this module. They live in
 * function-local variables inside the detect path and are read into scalars.
 * There is no accessor that returns them, so the app is structurally unable to
 * draw a hand skeleton. Nothing is recorded, buffered, or uploaded; the camera
 * is untouched until start() and released on stop().
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const HND_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const HND_TASKS_VISION_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const HND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

// MediaPipe 21-landmark hand model.
const HND_LM = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

const HND_FINGERTIPS = [
  HND_LM.INDEX_TIP,
  HND_LM.MIDDLE_TIP,
  HND_LM.RING_TIP,
  HND_LM.PINKY_TIP,
];
const HND_FINGER_MCPS = [
  HND_LM.INDEX_MCP,
  HND_LM.MIDDLE_MCP,
  HND_LM.RING_MCP,
  HND_LM.PINKY_MCP,
];

// Pinch thresholds, as fractions of hand size (wrist → middle-MCP).
// The gap between ENTER and RELEASE is the hysteresis band; it is the single
// thing that stops the grip from flickering when fingers hover at the boundary.
const HND_PINCH_ENTER = 0.42;
const HND_PINCH_RELEASE = 0.6;
const HND_PINCH_CLOSED = 0.12;

// Open-hand spread test (from the reference classifier): the MINIMUM gap
// between adjacent fingertips, as a fraction of hand size. Minimum rather than
// mean, because a "duck" shape keeps the outer pair far apart while adjacent
// tips touch — the mean stays high and lies, the minimum collapses and tells
// the truth. Natural open hand ≈ 0.20–0.35; duck ≈ 0.02–0.08.
const HND_SPREAD_MIN = 0.18;

// Loss handling.
const HND_GRIP_FREEZE_MS = 550; // hold a grip this long through a dropout
const HND_REACQUIRE_SNAP = 0.22; // normalised distance that still counts as "same hand"
const HND_LOST_MS = 900; // no hand at all for this long ⇒ health 3
const HND_WINDOW = 45; // detection-continuity sliding window, in detect frames

// One-Euro tuning. minCutoff sets the floor smoothing (steady hand), beta sets
// how fast the filter opens up when you move (lag under motion).
const HND_CURSOR_MIN_CUTOFF = 1.2;
const HND_CURSOR_BETA = 0.03;
const HND_D_CUTOFF = 1.0;

// Reach / sensitivity mapping. A single webcam frames the hand in the MIDDLE of
// its view; the corners take an arm-flail to reach and the fingertip landmark is
// noisiest out there — which is a real chunk of why the cursor reads as "can't
// get there / inaccurate at the edges". So a comfortable central BOX of the frame
// is mapped onto the WHOLE screen with a uniform gain about a re-centreable
// origin: small, relaxed hand motions now cover everything corner to corner. The
// gain is uniform (a pure scale about the centre), so applying the SAME transform
// to the drawn overlay landmarks keeps the hand glued to the cursor — the map
// changes how far the hand reaches, never the hand's shape.
const HND_GAIN = 1.3; // >1 amplifies; the reachable box spans 1/GAIN of the frame
const HND_CENTER_LERP = 0.15; // per-detect-frame rate the applied centre chases a recenter

// Single-frame spike rejection. MediaPipe occasionally throws ONE fingertip
// sample to a wrong spot for a single frame — the cursor jumps and snaps back,
// the classic "it twitched". A median-of-3 on the control points removes exactly
// that (the lone outlier is never the median) for one frame of latency on a hard
// reversal, which the One-Euro speed term then hides. It runs BEFORE the gain and
// the filter, on the raw mirrored point.

// ── Render-rate resampling and latency compensation ──────────────────────────
// Detection runs at CAMERA rate (~30 Hz, 15 in a dim room); the screen runs at
// 60–144 Hz. Publishing a cursor only on detect frames therefore produces a
// staircase — one position held for two to five consecutive rendered frames — and
// every one of those frames is already drawing where the hand WAS 60–120 ms ago
// (capture, transport, inference, and the filter's own group delay).
//
// So the filtered detect point is not the published cursor; it is an ANCHOR with a
// velocity. The published cursor is re-derived on every animation frame by dead
// reckoning from that anchor, plus a bounded forward lead that pays back part of
// the measured pipeline latency. Two failure modes govern every constant below:
// a still hand must not drift or shimmer (so the lead is gated to zero at low
// speed), and a hand that reverses must not overshoot (so a sign change in the
// velocity collapses the lead outright rather than bleeding it away).
// Ceiling on forward projection — swimming ahead is worse than lag.
// 30, not 60. Measured by driving the resampler against synthetic hand paths at
// six camera/display combinations (15–60 fps camera, 60/144 Hz display) and
// sweeping this constant: mean tracking error bottoms out at a 20–25 ms lead in
// EVERY combination, and by 60 ms the error is worse than extrapolating not at
// all — a lead that large overshoots any path with curvature in it. The measured
// latency (interval/2 + inference) only exceeds 30 ms on a slow camera, which is
// precisely the case where the old ceiling let the lead run away, so this binds
// where it should and leaves the healthy 30 fps case untouched.
const HND_LEAD_MAX_MS = 30;
const HND_COAST_MAX_MS = 55; // furthest dead reckoning may run past the last detect
const HND_LEAD_SPEED_LO = 0.1; // screen-widths/s below which NO lead is applied
const HND_LEAD_SPEED_HI = 0.55; // ...and at/above which it is applied in full
const HND_PRED_MAX = 0.1; // magnitude ceiling on the whole predicted offset
const HND_VEL_ALPHA = 0.45; // EMA on the velocity read off the filtered signal
const HND_RESAMPLE_TAU_MS = 22; // render-side follow constant; hides the per-detect step
const HND_REV_RECOVER = 0.2; // per-detect recovery of the lead after a reversal
const HND_DECEL_POW = 2; // how sharply slowing down withdraws the lead (see push)

// Rate adaptation. The presets were tuned against a 30 fps camera; the measured
// interval is compared to this to decide how much smoothing we can still afford.
const HND_RATE_REF_MS = 33.3;
const HND_RATE_SCALE_MIN = 0.65;
const HND_RATE_SCALE_MAX = 2.0;

// ─────────────────────────────────────────────────────────────────────────────
// One-Euro filter (Casiez et al., 2012) — ported verbatim
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adaptive low-pass whose cutoff rises with speed: slow movement is smoothed
 * hard (rock-steady cursor), fast movement passes through with little lag.
 */
class HndLowPass {
  constructor() {
    this.y = null;
    this.s = null;
  }
  filter(value, alpha) {
    if (this.y === null) {
      this.s = value;
    } else {
      this.s = alpha * value + (1 - alpha) * this.s;
    }
    this.y = value;
    return this.s;
  }
  /** Prime the filter's state without treating the value as a fresh sample. */
  prime(value) {
    this.y = value;
    this.s = value;
  }
  reset() {
    this.y = null;
    this.s = null;
  }
  hasLast() {
    return this.y !== null;
  }
  last() {
    return this.s === null ? 0 : this.s;
  }
}

class HndOneEuro {
  constructor(minCutoff = 1.2, beta = 0.03, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xf = new HndLowPass();
    this.dxf = new HndLowPass();
    this.lastTime = null;
    this.lastX = 0;
  }
  alpha(cutoff, dt) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }
  filter(x, timestampMs) {
    if (this.lastTime === null) {
      this.lastTime = timestampMs;
      this.lastX = x;
      this.xf.filter(x, 1);
      return x;
    }
    let dt = (timestampMs - this.lastTime) / 1000;
    if (dt <= 0) dt = 1 / 60;
    this.lastTime = timestampMs;

    const dx = (x - this.lastX) / dt;
    this.lastX = x;
    const edx = this.dxf.filter(dx, this.alpha(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xf.filter(x, this.alpha(cutoff, dt));
  }
  /**
   * Restart the filter as if it had been sitting still at `value`. Used when a
   * hand reappears near where it was frozen: output resumes from the frozen
   * point and converges to the live one over a few frames instead of jumping.
   */
  seed(value, timestampMs) {
    this.xf.reset();
    this.dxf.reset();
    this.xf.prime(value);
    this.dxf.prime(0);
    this.lastX = value;
    this.lastTime = timestampMs;
  }
  reset() {
    this.xf.reset();
    this.dxf.reset();
    this.lastTime = null;
    this.lastX = 0;
  }
}

/** Two-axis One-Euro for a 2D point. Writes into `out` — no per-frame garbage. */
class HndOneEuro2D {
  constructor(minCutoff = 1.2, beta = 0.03, dCutoff = 1.0) {
    this.fx = new HndOneEuro(minCutoff, beta, dCutoff);
    this.fy = new HndOneEuro(minCutoff, beta, dCutoff);
  }
  filterInto(out, x, y, t) {
    out.x = this.fx.filter(x, t);
    out.y = this.fy.filter(y, t);
    return out;
  }
  seed(x, y, t) {
    this.fx.seed(x, t);
    this.fy.seed(y, t);
  }
  reset() {
    this.fx.reset();
    this.fy.reset();
  }
  // Retune in place, without dropping the running state — changing smoothing must
  // not make the cursor jump. Jitter-vs-lag is a per-camera, per-lighting feel and
  // only the person at the webcam can judge it, so this has to be live.
  retune(minCutoff, beta) {
    this.fx.minCutoff = minCutoff; this.fx.beta = beta;
    this.fy.minCutoff = minCutoff; this.fy.beta = beta;
  }
}

/**
 * Render-rate resampler: turns a signal that only steps at camera rate into one
 * that moves on every animation frame, and projects it a bounded distance forward
 * to pay back part of the detector's latency.
 *
 * It is fed one anchor per detection (push) and read once per rendered frame
 * (sampleInto). Between anchors it dead-reckons on the velocity of the FILTERED
 * signal — not the raw landmark, whose noise would be indistinguishable from real
 * speed — and the result is chased by a small time-constant follower so the moment
 * a new anchor lands never shows up as a visible tick.
 *
 * Everything writes into a caller-owned point; nothing here allocates per frame.
 */
class HndResampler2D {
  constructor() {
    this.ax = 0; this.ay = 0; // anchor: the last filtered detect point
    this.at = 0;              // ...and when it landed (wall clock, ms)
    this.vx = 0; this.vy = 0; // velocity of the filtered signal, units/second
    this.px = 0; this.py = 0; // the published, render-rate point
    this.lastT = 0;
    this.rev = 0;             // 1 = travelling on; 0 = just reversed, lead collapsed
    this.primed = false;
  }

  /**
   * A newly filtered detection. Returns true if this call PRIMED the track, which
   * the caller uses to publish the point on this same frame — a hand that has just
   * appeared must not draw one frame at wherever the cursor was last left.
   */
  push(x, y, t) {
    if (!this.primed) {
      this.prime(x, y, t);
      return true;
    }
    const gapMs = t - this.at;
    // A long gap is a dropout, not a slow hand: the displacement across it says
    // nothing about how fast the hand is moving NOW, and extrapolating on it would
    // fling the cursor. Re-anchor with no velocity and earn the lead back.
    if (gapMs > 250) {
      this.ax = x; this.ay = y; this.at = t;
      this.vx = 0; this.vy = 0; this.rev = 0;
      return false;
    }
    const dt = Math.max(gapMs, 1000 / 240) / 1000;
    const nvx = (x - this.ax) / dt;
    const nvy = (y - this.ay) / dt;
    const oldSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const newSpeed = Math.sqrt(nvx * nvx + nvy * nvy);
    // Direction reversal — the single classic way extrapolation goes wrong. Half a
    // frame of stale velocity aimed the wrong way is a visible overshoot and a
    // rubber-band back, which reads far worse than plain lag. So on a sign change
    // we drop the lead to zero AND adopt the new velocity outright instead of
    // easing toward it, because an EMA would keep pointing the old way for another
    // two frames — exactly through the overshoot.
    if (nvx * this.vx + nvy * this.vy < 0) {
      this.rev = 0;
      this.vx = nvx; this.vy = nvy;
    } else {
      this.rev += (1 - this.rev) * HND_REV_RECOVER;
      this.vx += (nvx - this.vx) * HND_VEL_ALPHA;
      this.vy += (nvy - this.vy) * HND_VEL_ALPHA;
    }
    // Reacting to a reversal is always too late: the detector is reporting a hand
    // position from ~40 ms ago, so by the time the sign flips we have already
    // extrapolated straight through the turn. But no hand reverses without slowing
    // down first, and deceleration IS visible before the turn — so the lead is
    // withdrawn in proportion to how sharply the speed is falling. Squared, because
    // a gentle slow-down should barely cost any lead while a hard stop should
    // surrender all of it at once. This is what stops the cursor sailing past the
    // structure the student is decelerating onto.
    if (oldSpeed > 1e-6 && newSpeed < oldSpeed) {
      this.rev *= Math.pow(newSpeed / oldSpeed, HND_DECEL_POW);
    }
    this.ax = x; this.ay = y; this.at = t;
    return false;
  }

  /**
   * One rendered frame. `leadMs` is how far ahead we may aim, `coastMs` how far
   * past the anchor dead reckoning may run, and `hold` suspends both — used while
   * a grip is frozen through a dropout, where the contract is that the point does
   * not move at all.
   */
  sampleInto(out, now, leadMs, coastMs, hold) {
    if (!this.primed) return out;
    let dtr = this.lastT ? now - this.lastT : 16;
    if (dtr < 0) dtr = 0;
    if (dtr > 100) dtr = 100; // after a stall, ease in rather than snap across
    this.lastT = now;

    let tx = this.ax;
    let ty = this.ay;
    if (!hold) {
      // The lead shrinks to nothing as the hand comes to rest. Without this, the
      // residual velocity of a still hand is pure noise and the cursor breathes
      // around the fingertip — jitter that the One-Euro filter was there to remove.
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const gate = hndSmoothStep(HND_LEAD_SPEED_LO, HND_LEAD_SPEED_HI, speed);
      if (gate > 0) {
        let ahead = now - this.at;
        if (ahead < 0) ahead = 0;
        if (ahead > coastMs) ahead = coastMs;
        const ms = ahead + leadMs * this.rev;
        let ox = this.vx * (ms / 1000) * gate;
        let oy = this.vy * (ms / 1000) * gate;
        const m = Math.sqrt(ox * ox + oy * oy);
        if (m > HND_PRED_MAX) {
          const s = HND_PRED_MAX / m;
          ox *= s; oy *= s;
        }
        tx += ox; ty += oy;
      }
    }

    // Exponential follow on REAL elapsed time, so the feel is identical at 60 and
    // at 144 Hz — a fixed per-frame lerp would smooth twice as hard on the faster
    // monitor. This is also what absorbs the step when a new anchor arrives.
    const a = 1 - Math.exp(-dtr / HND_RESAMPLE_TAU_MS);
    this.px += (tx - this.px) * a;
    this.py += (ty - this.py) * a;
    // Pin at the frame edge exactly as the gain map does, so the prediction can
    // never park the cursor off-screen where nothing can be reached.
    if (this.px < 0) this.px = 0; else if (this.px > 1) this.px = 1;
    if (this.py < 0) this.py = 0; else if (this.py > 1) this.py = 1;
    out.x = this.px;
    out.y = this.py;
    return out;
  }

  /** Start clean at a known point — no velocity, therefore no lead, until earned. */
  prime(x, y, t) {
    this.ax = x; this.ay = y; this.at = t;
    this.px = x; this.py = y;
    this.vx = 0; this.vy = 0;
    this.rev = 0;
    this.lastT = t;
    this.primed = true;
  }

  /**
   * Forget the track. The published point is deliberately left where it is — the
   * next push re-primes it, and zeroing here would teleport every reader to the
   * top-left corner for one frame.
   */
  clear() {
    this.primed = false;
    this.vx = 0; this.vy = 0;
    this.rev = 0;
    this.lastT = 0;
  }
}

/** Exponential moving average for a scalar. */
class HndEMA {
  constructor(alpha = 0.35) {
    this.alpha = alpha;
    this.v = null;
  }
  next(x) {
    this.v = this.v === null ? x : this.alpha * x + (1 - this.alpha) * this.v;
    return this.v;
  }
  reset() {
    this.v = null;
  }
}

/**
 * EMA over an angle. Smoothing raw atan2 output is a bug waiting to happen —
 * the ±π seam makes the average swing a full turn. We accumulate the wrapped
 * delta instead, then wrap the result back into (-π, π].
 */
class HndAngleEMA {
  constructor(alpha = 0.35) {
    this.alpha = alpha;
    this.v = null;
  }
  next(a) {
    if (this.v === null) {
      this.v = a;
      return this.v;
    }
    let d = a - this.v;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    this.v += this.alpha * d;
    while (this.v > Math.PI) this.v -= 2 * Math.PI;
    while (this.v <= -Math.PI) this.v += 2 * Math.PI;
    return this.v;
  }
  reset() {
    this.v = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Landmark geometry
// ─────────────────────────────────────────────────────────────────────────────

function hndClamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Hermite smoothstep, clamped. Used for the extrapolation gate: a hard threshold
 * there would switch the lead on and off across the boundary and pop the cursor.
 */
function hndSmoothStep(e0, e1, x) {
  if (e1 <= e0) return x >= e1 ? 1 : 0;
  let t = (x - e0) / (e1 - e0);
  if (t < 0) t = 0; else if (t > 1) t = 1;
  return t * t * (3 - 2 * t);
}

/** Median of three scalars — branchy but branch-predictable and allocation-free. */
function hndMed3(a, b, c) {
  return a < b
    ? (b < c ? b : a < c ? c : a)
    : (a < c ? a : b < c ? c : b);
}

function hndMapRange(v, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return outMin;
  return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/** 2D distance in the image plane. z is deliberately ignored — see 2.5D law. */
function hndDist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Apparent hand size: wrist → middle-MCP. Grows as the hand nears the camera,
 * which is exactly why every other metric is divided by it — thresholds then
 * hold at any distance without ever consulting z.
 */
function hndHandSize(lm) {
  const w = lm[HND_LM.WRIST];
  const m = lm[HND_LM.MIDDLE_MCP];
  if (!w || !m) return 0;
  return hndDist2(w, m);
}

/** Pinch aperture as a fraction of hand size (0 = tips touching). */
function hndPinchRatio(lm) {
  const hs = hndHandSize(lm);
  if (hs === 0) return 1;
  return hndDist2(lm[HND_LM.THUMB_TIP], lm[HND_LM.INDEX_TIP]) / hs;
}

/** A finger is extended when its tip sits farther from the wrist than its MCP. */
function hndIsFingerExtended(lm, tipIdx, mcpIdx, slack) {
  const s = slack === undefined ? 0.9 : slack;
  const wrist = lm[HND_LM.WRIST];
  return hndDist2(lm[tipIdx], wrist) > hndDist2(lm[mcpIdx], wrist) * s;
}

function hndExtendedFingerCount(lm) {
  let n = 0;
  for (let i = 0; i < HND_FINGERTIPS.length; i++) {
    if (hndIsFingerExtended(lm, HND_FINGERTIPS[i], HND_FINGER_MCPS[i])) n++;
  }
  return n;
}

/** Roll across the palm, index-MCP → pinky-MCP, in radians. */
/**
 * The image-plane angle of the knuckle line. Deliberately 2D — do not "upgrade"
 * this to a palm-normal computed from 3D landmarks.
 *
 * That upgrade is an obvious-looking one and it is wrong, because it measures a
 * DIFFERENT rotation than the one the tool dial is driven by. The dial gesture is
 * a steering-wheel twist about the camera axis, not pronation of the forearm.
 * Measured against synthetic hand poses across palm tilts of 0-75 degrees, this
 * 2D form tracks that twist exactly (slope 1.000 at every tilt), while a
 * palm-frame roll built from wrist/index-MCP/pinky-MCP scores 0.000 at zero tilt
 * — it cannot see the gesture at all when the palm faces the camera, which is
 * the commonest way a hand is held — and only reaches 0.98 at 75 degrees. Both
 * carry identical landmark noise (1.4 degrees s.d. at 0.004 jitter), so 3D buys
 * nothing here and costs the whole interaction.
 */
function hndPalmRollRaw(lm) {
  const a = lm[HND_LM.INDEX_MCP];
  const b = lm[HND_LM.PINKY_MCP];
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function hndIsFistShape(lm) {
  let curled = 0;
  for (let i = 0; i < HND_FINGERTIPS.length; i++) {
    if (!hndIsFingerExtended(lm, HND_FINGERTIPS[i], HND_FINGER_MCPS[i], 1.05)) {
      curled++;
    }
  }
  return curled >= 3;
}

function hndIsPointShape(lm) {
  const indexOut = hndIsFingerExtended(lm, HND_LM.INDEX_TIP, HND_LM.INDEX_MCP, 0.95);
  const middleIn = !hndIsFingerExtended(lm, HND_LM.MIDDLE_TIP, HND_LM.MIDDLE_MCP, 1.0);
  const ringIn = !hndIsFingerExtended(lm, HND_LM.RING_TIP, HND_LM.RING_MCP, 1.0);
  const pinkyIn = !hndIsFingerExtended(lm, HND_LM.PINKY_TIP, HND_LM.PINKY_MCP, 1.0);
  return indexOut && middleIn && ringIn && pinkyIn;
}

/** Fingers extended AND fanned apart — see HND_SPREAD_MIN for why "min". */
function hndIsOpenShape(lm) {
  if (hndExtendedFingerCount(lm) < 4) return false;
  const hs = hndHandSize(lm);
  if (hs === 0) return false;
  let minGap = Infinity;
  for (let i = 0; i < HND_FINGERTIPS.length - 1; i++) {
    const d = hndDist2(lm[HND_FINGERTIPS[i]], lm[HND_FINGERTIPS[i + 1]]);
    if (d < minGap) minGap = d;
  }
  return minGap >= hs * HND_SPREAD_MIN;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-hand classifier (stateful — the pinch latch lives here)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One stateful classifier per hand slot. Returns a plain result object that is
 * reused every frame; it carries numbers only, never a landmark reference.
 */
function hndCreateClassifier() {
  let pinching = false;
  const out = {
    gesture: "none",
    pinchStrength: 0,
    isPinching: false,
    cursorX: 0,
    cursorY: 0,
    indexX: 0,
    indexY: 0,
    rollRaw: 0,
    handSize: 0,
  };

  function classify(lm) {
    const hs = hndHandSize(lm);
    const ratio = hndPinchRatio(lm);

    // Hysteresis: a looser bar to stay pinched than to become pinched.
    if (pinching) {
      pinching = ratio < HND_PINCH_RELEASE;
    } else {
      pinching = ratio < HND_PINCH_ENTER;
    }

    const strength = hndClamp(
      hndMapRange(ratio, HND_PINCH_RELEASE, HND_PINCH_CLOSED, 0, 1),
      0,
      1,
    );

    let gesture;
    if (pinching) gesture = "pinch";
    else if (hndIsPointShape(lm)) gesture = "point";
    else if (hndIsFistShape(lm)) gesture = "fist";
    else if (hndIsOpenShape(lm)) gesture = "open";
    else gesture = "none";

    const t = lm[HND_LM.THUMB_TIP];
    const i = lm[HND_LM.INDEX_TIP];

    out.gesture = gesture;
    out.pinchStrength = strength;
    out.isPinching = pinching;
    // Cursor = the INDEX FINGERTIP, not the thumb/index midpoint the app used to
    // use. The midpoint reads as "not accurate" for one concrete reason: when you
    // pinch to grab, the thumb sweeps a long arc toward a near-stationary index, and
    // the midpoint travels half of that arc with it — so the grab lands up to a
    // centimetre off the point you aimed at, and every scalpel stroke starts by
    // sliding off target. The index tip is a single landmark that barely moves
    // through a pinch (the thumb comes to IT), so the aim point holds from hover to
    // grip. It is also simply where people expect to point. Pinch distance is still
    // measured from both fingers above; it just no longer moves the cursor.
    out.cursorX = i.x;
    out.cursorY = i.y;
    out.indexX = i.x;
    out.indexY = i.y;
    out.rollRaw = hndPalmRollRaw(lm);
    out.handSize = hs;
    return out;
  }

  classify.reset = function reset() {
    pinching = false;
  };
  return classify;
}

// ─────────────────────────────────────────────────────────────────────────────
// Camera + error mapping
// ─────────────────────────────────────────────────────────────────────────────

function hndFailure(code, reason) {
  return { ok: false, code, reason };
}

function hndMapCameraError(err) {
  const name = err && err.name ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return hndFailure(
      "permission-denied",
      "Camera access was blocked. Allow the camera in your browser's address bar, then try again — or keep using the mouse.",
    );
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return hndFailure(
      "no-camera",
      "No camera was found on this device. Mouse control works exactly the same.",
    );
  }
  if (
    name === "NotReadableError" ||
    name === "TrackStartError" ||
    name === "AbortError"
  ) {
    return hndFailure(
      "camera-busy",
      "The camera is already in use by another app. Close it and try again.",
    );
  }
  if (name === "SecurityError") {
    return hndFailure(
      "insecure-context",
      "The browser blocked camera access on this page. Hand tracking needs a secure (https) origin.",
    );
  }
  return hndFailure(
    "camera-failed",
    "Could not open the camera" +
      (err && err.message ? " (" + err.message + ")" : "") +
      ".",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tracker
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates the hand tracker. Constructing it touches nothing — no camera, no
 * network. Everything is inert until start().
 *
 * @param {object} [options]
 * @param {number} [options.minCutoff] One-Euro floor cutoff for the cursor.
 * @param {number} [options.beta]      One-Euro speed coefficient.
 * @param {number} [options.width]     Requested capture width.
 * @param {number} [options.height]    Requested capture height.
 */
export function createHands(options) {
  const opts = options || {};
  const minCutoff =
    typeof opts.minCutoff === "number" ? opts.minCutoff : HND_CURSOR_MIN_CUTOFF;
  const beta = typeof opts.beta === "number" ? opts.beta : HND_CURSOR_BETA;
  // 1280x720, not 640x480. MediaPipe's landmark precision — and the fingertip
  // precision especially, which is what the cursor rides on — scales directly with
  // input resolution. At VGA the index tip lands within a few coarse pixels and the
  // cursor reads as imprecise no matter how well it is filtered afterwards. HD more
  // than doubles the linear fingertip resolution for a modest inference cost, since
  // detectForVideo downsamples internally anyway. Falls back gracefully (see start()
  // — an over-constrained request retries with plain `video: true`).
  const reqW = typeof opts.width === "number" ? opts.width : 1280;
  const reqH = typeof opts.height === "number" ? opts.height : 720;

  // ── The video element exists from the start so a self-view can bind to it
  // immediately, but it has no srcObject until start() succeeds.
  const videoEl = document.createElement("video");
  videoEl.setAttribute("playsinline", "");
  videoEl.setAttribute("autoplay", "");
  videoEl.setAttribute("muted", "");
  videoEl.muted = true;
  videoEl.width = reqW;
  videoEl.height = reqH;

  // ── Long-lived snapshot. Allocated once, mutated in place, never replaced.
  // Slot 0 is the student's LEFT hand, slot 1 their RIGHT. Slots are keyed by
  // handedness, not by detection order — MediaPipe's result array order is not
  // stable, and letting the slots swap would swap two hands' filter histories
  // and fling anything they were holding across the table.
  const snapshot = {
    active: false,
    health: 3,
    hands: [hndMakeHandView("Left"), hndMakeHandView("Right")],
    // Measured timing, republished every detect frame. detectFps is the rate the
    // CAMERA is actually delivering (which a dim room halves without telling
    // anyone), detectMs the synchronous inference cost, latencyMs the part of the
    // pipeline delay we can actually see from in here, and leadMs how much of it
    // the resampler is currently projecting back. A HUD that shows these turns
    // "the cursor feels bad today" into a number.
    detectFps: 0,
    detectMs: 0,
    latencyMs: 0,
    leadMs: 0,
  };

  function hndMakeHandView(handedness) {
    return {
      present: false,
      handedness,
      gesture: "none",
      pinchStrength: 0,
      isPinching: false,
      cursor: { x: 0.5, y: 0.5 },
      indexTip: { x: 0.5, y: 0.5 },
      // The DETECT-rate truth above, and the RENDER-rate estimate below. `cursor`
      // is what the last camera frame actually showed and is what anything
      // reasoning ABOUT detections must use (the reacquire jump test, the two-hand
      // span, recenter) — measuring those against a prediction would make grip
      // retention depend on prediction error. `cursorS` is where the hand is
      // believed to be right NOW: re-derived every animation frame and projected a
      // bounded step forward. Anything that AIMS or DRAWS should read this one.
      cursorS: { x: 0.5, y: 0.5 },
      indexTipS: { x: 0.5, y: 0.5 },
      // Velocity of the filtered cursor in screen-widths (velX) and screen-heights
      // (velY) per second, measured between camera frames. Published because a
      // consumer differencing `cursor` on its own render clock cannot get this
      // right: on a detect frame it divides a whole camera frame of travel by a
      // single display frame, over-reading speed by refreshRate/cameraRate.
      velX: 0,
      velY: 0,
      roll: 0,
      span: 0,
      // 21 mirrored, normalised landmark points {x,y} for the on-screen hand
      // overlay. The user asked to SEE the hand (Physics-Entelloq style), which
      // overrides this module's default hide-the-skeleton stance — so, and ONLY
      // so, a 2D projection of the landmarks is published here. Depth (z) is
      // still never exposed as a control axis; these are for drawing only.
      landmarks: Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 })),
    };
  }

  // ── Private per-slot state. Nothing here is reachable from the snapshot.
  function hndMakeSlot() {
    return {
      classify: hndCreateClassifier(),
      cursorF: new HndOneEuro2D(minCutoff, beta, HND_D_CUTOFF),
      indexF: new HndOneEuro2D(minCutoff, beta, HND_D_CUTOFF),
      // Render-rate resamplers, fed one anchor per detection from the filters above.
      cursorR: new HndResampler2D(),
      indexR: new HndResampler2D(),
      rollF: new HndAngleEMA(0.3),
      seenThisFrame: false,
      lastSeenMs: 0,
      frozen: false,
      freezeStartMs: 0,
      hasCursor: false, // has the cursor ever held a real value?
      // Median-of-3 spike guard: last two RAW mirrored samples for cursor (c) and
      // index (i), plus a prime counter so the first two frames pass through.
      c1x: 0, c1y: 0, c2x: 0, c2y: 0,
      i1x: 0, i1y: 0, i2x: 0, i2y: 0,
      medN: 0,
      // The pre-gain (raw mirrored) cursor, kept so recenter() can put the comfort
      // box wherever the hand actually is right now.
      rawX: 0.5, rawY: 0.5,
    };
  }
  const slots = [hndMakeSlot(), hndMakeSlot()];
  const spanF = new HndEMA(0.3);

  // ── Reach mapping. `region.cx/cy` is the TARGET centre of the comfort box in
  // raw (mirrored) camera space; `cxS/cyS` is the smoothed centre actually applied,
  // so a recenter glides in rather than teleporting the cursor. gain>1 amplifies.
  const region = { gain: HND_GAIN, cx: 0.5, cy: 0.5 };
  let cxS = 0.5, cyS = 0.5;

  // Map one raw axis to the screen: the box centre lands at screen-middle (0.5),
  // and ±(0.5/gain) around it fills the axis edge-to-edge. Clamped, so drifting
  // outside the box pins to the edge exactly like a mouse hitting the frame.
  function hndGainAxis(v, center) {
    const o = 0.5 + (v - center) * region.gain;
    return o < 0 ? 0 : o > 1 ? 1 : o;
  }

  // Same scale, UNCLAMPED — for the overlay skeleton. Clamping each landmark axis
  // independently would pin far-side joints to the frame edge while the palm stays
  // interior, squashing the drawn hand; leaving it unclamped keeps the hand a rigid
  // scaled shape and simply lets the canvas clip whatever runs off-screen.
  function hndGainAxisRaw(v, center) {
    return 0.5 + (v - center) * region.gain;
  }

  // Keep the box fully inside the frame: its half-width in raw space is 0.5/gain,
  // so the centre cannot sit closer than that to an edge without losing reach.
  function hndSetCenter(x, y) {
    const half = 0.5 / region.gain;
    region.cx = Math.max(half, Math.min(1 - half, x));
    region.cy = Math.max(half, Math.min(1 - half, y));
  }

  // ── Runtime state
  let landmarker = null;
  let stream = null;
  let running = false;
  let starting = false;
  let lastVideoTime = -1;
  let lastDetectTs = -1;
  let lastAnySeenMs = 0;
  let wasHidden = false;

  // ── Measured cadence. The camera is asked for 30 fps and gives whatever the
  // exposure allows, so the true interval is the only thing worth tuning against.
  // Both are EMAs over detect frames; the interval starts at the reference so the
  // very first frames are smoothed as if the camera were healthy.
  let detectIntervalMs = HND_RATE_REF_MS;
  let detectMs = 0;
  let lastSampleT = 0;
  // Maps the video element's own clock into the wall-clock epoch everything else
  // uses — see the sample-time reconstruction in update().
  let mediaBase = 0;
  let mediaPrimed = false;

  // Detection-continuity ring buffer: 1 = at least one hand resolved on that
  // detect frame. Only real detect frames tick it, so a 144 Hz display does not
  // dilute the window with frames that never ran inference.
  const window_ = new Uint8Array(HND_WINDOW);
  let windowIdx = 0;
  let windowCount = 0;
  let windowHits = 0;

  function hndPushWindow(hit) {
    if (windowCount === HND_WINDOW) {
      windowHits -= window_[windowIdx];
    } else {
      windowCount++;
    }
    window_[windowIdx] = hit ? 1 : 0;
    windowHits += hit ? 1 : 0;
    windowIdx = (windowIdx + 1) % HND_WINDOW;
  }

  function hndResetWindow() {
    window_.fill(0);
    windowIdx = 0;
    windowCount = 0;
    windowHits = 0;
  }

  function hndResetSlot(slot, view) {
    slot.classify.reset();
    slot.cursorF.reset();
    slot.indexF.reset();
    // Drop the track too: a velocity measured before a dropout is not a claim
    // about where the hand is going after it.
    slot.cursorR.clear();
    slot.indexR.clear();
    slot.rollF.reset();
    slot.frozen = false;
    slot.hasCursor = false;
    slot.medN = 0; // re-prime the spike guard; stale samples across a dropout lie
    view.present = false;
    view.gesture = "none";
    view.pinchStrength = 0;
    view.isPinching = false;
    view.roll = 0;
    view.span = 0;
    view.velX = 0;
    view.velY = 0;
    // cursor/indexTip/cursorS/indexTipS are deliberately left where they were. Zeroing them would
    // yank anything reading them to the top-left corner — the exact teleport
    // the freeze logic exists to prevent.
  }

  // ───────────────────────────────────────────────────────────────────────────
  // start
  // ───────────────────────────────────────────────────────────────────────────

  async function start() {
    if (running) return { ok: true, code: "already-running", reason: "" };
    if (starting) {
      return hndFailure("already-starting", "Camera is already starting up.");
    }
    starting = true;
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia) {
        return hndFailure(
          "no-camera-api",
          "This browser does not expose a camera API. Mouse control works exactly the same.",
        );
      }
      // getUserMedia is only available on secure origins; localhost counts.
      if (typeof window !== "undefined" && window.isSecureContext === false) {
        return hndFailure(
          "insecure-context",
          "Hand tracking needs a secure (https or localhost) page to use the camera.",
        );
      }

      // ── Model. Loaded lazily so nothing is fetched unless the student opts in.
      if (!landmarker) {
        let vision;
        try {
          vision = await import(
            /* @vite-ignore */ HND_TASKS_VISION_URL
          );
        } catch (e) {
          return hndFailure(
            "model-failed",
            "Could not load the hand-tracking library. Check your connection, or keep using the mouse.",
          );
        }
        let fileset;
        try {
          fileset = await vision.FilesetResolver.forVisionTasks(HND_WASM_URL);
        } catch (e) {
          return hndFailure(
            "model-failed",
            "Could not load the hand-tracking runtime. Check your connection, or keep using the mouse.",
          );
        }

        const baseCfg = {
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        };
        try {
          landmarker = await vision.HandLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: HND_MODEL_URL, delegate: "GPU" },
            ...baseCfg,
          });
        } catch (e) {
          // GPU delegate is unavailable on plenty of machines (no WebGL2,
          // blocklisted driver, locked-down VM). CPU is slower but universal.
          try {
            landmarker = await vision.HandLandmarker.createFromOptions(fileset, {
              baseOptions: { modelAssetPath: HND_MODEL_URL, delegate: "CPU" },
              ...baseCfg,
            });
          } catch (e2) {
            landmarker = null;
            return hndFailure(
              "model-failed",
              "Could not start the hand-tracking model on this device. Mouse control works exactly the same.",
            );
          }
        }
      }

      // ── Camera. Nothing before this line has touched it.
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          // `ideal`, not exact: a webcam that cannot do 720p should hand back its
          // best rather than throw. A steady 30fps also matters — a camera that
          // drifts to 15fps under low light doubles the gap between landmark
          // updates, which the filter cannot hide and which reads as lag.
          video: {
            width: { ideal: reqW }, height: { ideal: reqH },
            frameRate: { ideal: 30, min: 15 }, facingMode: "user",
          },
          audio: false,
        });
      } catch (err) {
        if (err && err.name === "OverconstrainedError") {
          // Some webcams refuse the exact size; retry with no constraints.
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } catch (err2) {
            return hndMapCameraError(err2);
          }
        } else {
          return hndMapCameraError(err);
        }
      }

      videoEl.srcObject = stream;
      try {
        await videoEl.play();
      } catch (e) {
        // Autoplay policy can reject the promise even though the muted stream
        // plays fine; readyState below is the real test.
      }

      // Wait for actual pixels, with a ceiling so a wedged device can't hang start().
      if (videoEl.readyState < 2) {
        const gotData = await new Promise((resolve) => {
          let done = false;
          const finish = (v) => {
            if (done) return;
            done = true;
            videoEl.removeEventListener("loadeddata", onData);
            clearTimeout(timer);
            resolve(v);
          };
          const onData = () => finish(true);
          const timer = setTimeout(() => finish(false), 8000);
          videoEl.addEventListener("loadeddata", onData, { once: true });
        });
        if (!gotData && videoEl.readyState < 2) {
          hndReleaseCamera();
          return hndFailure(
            "camera-timeout",
            "The camera opened but never delivered a picture. Try reconnecting it, or keep using the mouse.",
          );
        }
      }

      lastVideoTime = -1;
      lastDetectTs = -1;
      lastAnySeenMs = typeof performance !== "undefined" ? performance.now() : Date.now();
      hndResetWindow();
      hndResetSlot(slots[0], snapshot.hands[0]);
      hndResetSlot(slots[1], snapshot.hands[1]);
      spanF.reset();
      cxS = region.cx; cyS = region.cy; // honour a persisted recenter without a glide
      running = true;
      snapshot.active = true;
      snapshot.health = 1; // warming up; first detections will settle it
      return { ok: true, code: "ok", reason: "" };
    } finally {
      starting = false;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // stop
  // ───────────────────────────────────────────────────────────────────────────

  function hndReleaseCamera() {
    if (stream) {
      const tracks = stream.getTracks();
      for (let i = 0; i < tracks.length; i++) tracks[i].stop();
      stream = null;
    }
    // Clearing srcObject is what actually lets the OS drop the device and turn
    // the camera light off; stopping tracks alone is not always enough.
    try {
      videoEl.pause();
    } catch (e) {
      /* pause can throw if the element was never played */
    }
    videoEl.srcObject = null;
  }

  function stop() {
    running = false;
    hndReleaseCamera();
    snapshot.active = false;
    snapshot.health = 3;
    hndResetSlot(slots[0], snapshot.hands[0]);
    hndResetSlot(slots[1], snapshot.hands[1]);
    spanF.reset();
    hndResetWindow();
    lastVideoTime = -1;
    lastDetectTs = -1;
    lastSampleT = 0;
    mediaBase = 0;
    mediaPrimed = false;
    detectIntervalMs = HND_RATE_REF_MS;
    detectMs = 0;
    snapshot.detectFps = 0;
    snapshot.detectMs = 0;
    snapshot.latencyMs = 0;
    snapshot.leadMs = 0;
    // The landmarker is kept alive so a restart is instant. dispose() frees it.
  }

  function dispose() {
    stop();
    if (landmarker && typeof landmarker.close === "function") {
      try {
        landmarker.close();
      } catch (e) {
        /* closing a half-built landmarker can throw; nothing to do about it */
      }
    }
    landmarker = null;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // update — one call per animation frame
  // ───────────────────────────────────────────────────────────────────────────

  function update(nowMs) {
    if (!running || !landmarker) return;
    const now = typeof nowMs === "number" ? nowMs : performance.now();

    // Backgrounded tab: the video stalls and rAF may be throttled to nothing.
    // Skip inference, hold the last snapshot, and re-seed the filters' clocks on
    // return so a multi-second dt doesn't produce a garbage velocity estimate.
    const hidden = typeof document !== "undefined" && document.hidden === true;
    if (hidden) {
      wasHidden = true;
      snapshot.health = 3;
      return;
    }
    if (wasHidden) {
      wasHidden = false;
      lastVideoTime = -1;
      lastAnySeenMs = now;
      // The media clock kept running (or did not) while we were away; either way the
      // wall-clock rebase is stale, and so is the cadence measured against it.
      mediaPrimed = false;
      lastSampleT = 0;
      hndResetWindow();
      for (let i = 0; i < 2; i++) {
        const s = slots[i];
        const v = snapshot.hands[i];
        if (s.hasCursor) {
          s.cursorF.seed(v.cursor.x, v.cursor.y, now);
          s.indexF.seed(v.indexTip.x, v.indexTip.y, now);
        }
        // The resamplers' clocks are just as stale; a multi-second `age` would
        // dead-reckon the cursor clean off the table on the first frame back.
        s.cursorR.clear();
        s.indexR.clear();
      }
    }

    // Resample BEFORE the camera-frame gate below. This is the whole point: on a
    // 144 Hz display four of every five calls to update() bail at that gate, and
    // those are exactly the frames that used to redraw a cursor that had not moved.
    sample(now);

    if (videoEl.readyState < 2) return;
    // No new camera frame ⇒ no new information. Re-running inference on the
    // same pixels would only burn GPU and re-tick the health window.
    if (videoEl.currentTime === lastVideoTime) return;
    lastVideoTime = videoEl.currentTime;

    // detectForVideo throws on a non-increasing timestamp.
    let ts = Math.round(now);
    if (ts <= lastDetectTs) ts = lastDetectTs + 1;
    lastDetectTs = ts;

    // ── When did this frame actually happen?
    //
    // The wall clock records when we NOTICED the camera frame, and that is up to a
    // whole render frame after it arrived: ±7 ms of jitter on a 33 ms interval at
    // 144 Hz, ±16 at 60. That jitter lands directly in every dt the One-Euro filter
    // and the velocity estimate divide by, so a hand moving at a constant speed
    // reports a speed that swings by half either way — which is exactly the input
    // an adaptive filter is least able to cope with.
    //
    // videoEl.currentTime is the frame's OWN clock and carries none of it. Rebase it
    // once into the wall-clock epoch (so it stays comparable with the freeze and
    // health timers, which genuinely want wall time) and use that as the sample
    // time. It is always at or before `now`, which is correct — and it makes the
    // resampler's "how stale is this anchor" honest, because the notice delay is now
    // inside the number rather than invisible. Re-based whenever the two disagree by
    // more than any plausible notice delay: a stall, a resumed tab, a camera restart.
    const vtMs = lastVideoTime * 1000;
    let sampleT = mediaBase + vtMs;
    if (!mediaPrimed || sampleT > now || now - sampleT > 250) {
      mediaBase = now - vtMs;
      mediaPrimed = true;
      sampleT = now;
    }

    // Measure the cadence we are actually getting, off the camera's clock rather
    // than ours. Absurd gaps are a throttled tab or a camera hiccup, not the frame
    // rate, so they must not drag the average — this number retunes the smoothing
    // and sizes the forward lead.
    if (lastSampleT) {
      const gap = sampleT - lastSampleT;
      if (gap > 4 && gap < 400) {
        detectIntervalMs += (gap - detectIntervalMs) * 0.15;
      }
    }
    lastSampleT = sampleT;
    hndTuneFilters();

    // Glide the applied comfort-box centre toward its target once per camera frame,
    // so a recenter eases the whole hand+cursor across rather than snapping it.
    cxS += (region.cx - cxS) * HND_CENTER_LERP;
    cyS += (region.cy - cyS) * HND_CENTER_LERP;

    let result;
    // Inference is synchronous on the render thread, so its cost IS latency the
    // student feels — worth measuring rather than assuming.
    const t0 = performance.now();
    try {
      result = landmarker.detectForVideo(videoEl, ts);
    } catch (e) {
      return; // a dropped frame is not a failure state
    }
    detectMs += (performance.now() - t0 - detectMs) * 0.15;
    if (!result || !result.landmarks) return;

    slots[0].seenThisFrame = false;
    slots[1].seenThisFrame = false;

    const count = result.landmarks.length;
    for (let i = 0; i < count; i++) {
      const lm = result.landmarks[i]; // ← raw landmarks; scoped to this loop only
      if (!lm || lm.length < 21) continue;

      // MediaPipe labels handedness assuming a MIRRORED (selfie-flipped) image.
      // We feed the raw camera frame, so its "Left" is the student's right hand.
      // Swap it here, once, and everything downstream is in the student's frame.
      const raw = result.handedness && result.handedness[i] && result.handedness[i][0];
      const rawLabel = raw && raw.categoryName ? raw.categoryName : "Right";
      const slotIdx = rawLabel === "Left" ? 1 : 0;

      const slot = slots[slotIdx];
      if (slot.seenThisFrame) continue; // two blobs claimed the same hand; keep the first
      slot.seenThisFrame = true;

      const view = snapshot.hands[slotIdx];
      const pose = slot.classify(lm);

      // Mirror x so the cursor moves the way the student's hand moves. y is not
      // mirrored: normalised image y already runs top-down like screen space.
      let rmx = 1 - pose.cursorX;
      let rmy = pose.cursorY;
      let rix = 1 - pose.indexX;
      let riy = pose.indexY;

      // Median-of-3 spike guard on the raw mirrored control points: a lone bad
      // sample is never the median, so a single-frame teleport is dropped before
      // it can move the cursor. The first two frames prime the history and pass
      // straight through. History always stores the RAW sample so the trend the
      // median reads is the true signal, not a previously-corrected one.
      if (slot.medN >= 2) {
        const mcx = hndMed3(rmx, slot.c1x, slot.c2x);
        const mcy = hndMed3(rmy, slot.c1y, slot.c2y);
        const mix = hndMed3(rix, slot.i1x, slot.i2x);
        const miy = hndMed3(riy, slot.i1y, slot.i2y);
        slot.c2x = slot.c1x; slot.c2y = slot.c1y; slot.c1x = rmx; slot.c1y = rmy;
        slot.i2x = slot.i1x; slot.i2y = slot.i1y; slot.i1x = rix; slot.i1y = riy;
        rmx = mcx; rmy = mcy; rix = mix; riy = miy;
      } else {
        slot.c2x = slot.c1x; slot.c2y = slot.c1y; slot.c1x = rmx; slot.c1y = rmy;
        slot.i2x = slot.i1x; slot.i2y = slot.i1y; slot.i1x = rix; slot.i1y = riy;
        slot.medN++;
      }
      // Remember where the hand really is (pre-gain) so recenter() can move the
      // comfort box onto it.
      slot.rawX = rmx; slot.rawY = rmy;

      // Reach mapping: the comfortable central box → the whole screen. Applied
      // AFTER the median and BEFORE the One-Euro filter, so the filter, the flick
      // detector and the reacquire test all work in one consistent screen space.
      const mx = hndGainAxis(rmx, cxS);
      const my = hndGainAxis(rmy, cyS);
      const ix = hndGainAxis(rix, cxS);
      const iy = hndGainAxis(riy, cyS);

      if (slot.frozen) {
        // Reacquisition after a frozen grip. If the hand came back near where
        // it vanished it is the same hand mid-gesture: seed the filter at the
        // frozen point so it slides back rather than snapping. If it came back
        // somewhere else, the grip is not credible — drop it instead of
        // dragging the organ across the table.
        const jump = Math.hypot(mx - view.cursor.x, my - view.cursor.y);
        if (jump <= HND_REACQUIRE_SNAP) {
          slot.cursorF.seed(view.cursor.x, view.cursor.y, sampleT);
          slot.indexF.seed(view.indexTip.x, view.indexTip.y, sampleT);
        } else {
          slot.classify.reset();
          slot.cursorF.reset();
          slot.indexF.reset();
          // The track dies with the filters: the distance from the frozen point to
          // wherever the hand turned up is not a velocity, and extrapolating it
          // would turn a deliberate jump into a fling.
          slot.cursorR.clear();
          slot.indexR.clear();
          slot.rollF.reset();
          view.isPinching = false;
          view.pinchStrength = 0;
          view.gesture = "none";
        }
        slot.frozen = false;
      }

      // Filtered on the camera's clock, not ours — see the sample-time note above.
      slot.cursorF.filterInto(view.cursor, mx, my, sampleT);
      slot.indexF.filterInto(view.indexTip, ix, iy, sampleT);
      // Hand the freshly filtered points to the render-rate resamplers as new
      // anchors. They are what the rest of the app actually reads; `view.cursor`
      // stays the unpredicted record of what this camera frame saw.
      if (slot.cursorR.push(view.cursor.x, view.cursor.y, sampleT)) {
        view.cursorS.x = view.cursor.x;
        view.cursorS.y = view.cursor.y;
      }
      if (slot.indexR.push(view.indexTip.x, view.indexTip.y, sampleT)) {
        view.indexTipS.x = view.indexTip.x;
        view.indexTipS.y = view.indexTip.y;
      }

      // Mirroring x negates the x component of the palm vector, so the roll
      // angle must be reflected too or it would run backwards on screen.
      const rollMirrored = Math.atan2(
        Math.sin(pose.rollRaw),
        -Math.cos(pose.rollRaw),
      );
      view.roll = slot.rollF.next(rollMirrored);

      view.present = true;
      view.gesture = pose.gesture;
      view.pinchStrength = pose.pinchStrength;
      view.isPinching = pose.isPinching;
      // Publish the mirrored 2D landmark set for the overlay. Unfiltered (the
      // overlay wants the hand as it is; filtering would lag it behind the cursor),
      // but pushed through the SAME reach gain as the cursor so the drawn hand and
      // its pinch cursor scale together and stay glued — the gain is a pure scale
      // about the centre, so it moves the hand without deforming it.
      for (let k = 0; k < 21; k++) {
        view.landmarks[k].x = hndGainAxisRaw(1 - lm[k].x, cxS);
        view.landmarks[k].y = hndGainAxisRaw(lm[k].y, cyS);
      }
      slot.hasCursor = true;
      slot.lastSeenMs = now;
    }

    // ── Slots with no detection this frame: freeze a live grip, else release.
    for (let i = 0; i < 2; i++) {
      const slot = slots[i];
      const view = snapshot.hands[i];
      if (slot.seenThisFrame) continue;

      if (view.present && view.isPinching && slot.hasCursor) {
        if (!slot.frozen) {
          slot.frozen = true;
          slot.freezeStartMs = now;
          // CRITICAL: re-prime the spike guard on freeze. Otherwise the stale c1/c2
          // history holds the frozen position, and on reacquisition the median of
          // {new, frozen, frozen} returns the FROZEN point — so the reacquire jump
          // test below sees jump≈0 and wrongly keeps the grip even when the hand
          // reappeared somewhere completely different, dragging the held organ
          // across the table. medN=0 makes the first reacquire frame pass the true
          // raw position straight through so the jump test can see the teleport.
          slot.medN = 0;
        }
        if (now - slot.freezeStartMs <= HND_GRIP_FREEZE_MS) {
          // Hold everything exactly as it was. Whatever the student is holding
          // stays put through the dropout instead of flying off.
          continue;
        }
      }
      hndResetSlot(slot, view);
    }

    // ── Two-hand span: separation of the two cursors, normalised by mean hand
    // size. Dividing by hand size is what makes it depth-invariant — leaning in
    // scales both numerator and denominator, so the value holds still.
    const bothPresent = snapshot.hands[0].present && snapshot.hands[1].present;
    if (bothPresent) {
      const a = snapshot.hands[0].cursor;
      const b = snapshot.hands[1].cursor;
      const raw = Math.hypot(a.x - b.x, a.y - b.y);
      const s = spanF.next(raw);
      snapshot.hands[0].span = s;
      snapshot.hands[1].span = s;
    } else {
      spanF.reset();
      snapshot.hands[0].span = 0;
      snapshot.hands[1].span = 0;
    }

    // ── Health.
    const anySeen = slots[0].seenThisFrame || slots[1].seenThisFrame;
    if (anySeen) lastAnySeenMs = now;
    hndPushWindow(anySeen);
    snapshot.health = hndComputeHealth(now);

    // ── Publish the measured timing for anyone drawing a HUD.
    snapshot.detectFps = detectIntervalMs > 0 ? 1000 / detectIntervalMs : 0;
    snapshot.detectMs = detectMs;
    snapshot.latencyMs = hndMeasuredLatencyMs();
  }

  /**
   * The part of the pipeline delay this module can actually see: the mean wait for
   * the next camera frame (half an interval) plus the inference just spent. Capture
   * exposure and USB transport are invisible from in here, so this is a FLOOR, not
   * the true glass-to-glass number — which is precisely why the lead derived from
   * it is capped well below what a full estimate would ask for. Over-leading reads
   * as a cursor swimming ahead of the finger, and that is worse than lag.
   */
  function hndMeasuredLatencyMs() {
    return detectIntervalMs * 0.5 + detectMs;
  }

  function hndLeadMs() {
    const l = hndMeasuredLatencyMs();
    return l < 0 ? 0 : l > HND_LEAD_MAX_MS ? HND_LEAD_MAX_MS : l;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // sample — one call per ANIMATION frame, cheap enough to mean it
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Steps the published cursor toward its dead-reckoned target. No inference, no
   * allocation, no landmark work — a handful of multiplies per hand, which is what
   * makes it honest to call at display rate.
   *
   * update() calls this itself, BEFORE the camera-frame gate, so a host already on
   * one-update-per-frame gets it for free. It is exposed for a host whose loop does
   * not call update() every frame, and for one that wants to re-read the point later
   * in its own frame once real time has passed.
   */
  function sample(nowMs) {
    if (!running) return;
    const now = typeof nowMs === "number" ? nowMs : performance.now();
    const lead = hndLeadMs();
    // Never coast much past one camera frame: beyond that we are inventing motion
    // rather than filling a known gap. Scaled by the measured interval so a 15 fps
    // camera gets a proportionally longer bridge, up to the hard ceiling.
    let coast = detectIntervalMs * 1.5;
    if (coast > HND_COAST_MAX_MS) coast = HND_COAST_MAX_MS;

    for (let i = 0; i < 2; i++) {
      const slot = slots[i];
      const view = snapshot.hands[i];
      if (!slot.hasCursor) continue;
      // A frozen grip must not move — that is the entire contract of the freeze —
      // and an absent hand has nothing to predict from. Both settle onto the last
      // filtered point instead of coasting.
      const hold = slot.frozen || !view.present;
      slot.cursorR.sampleInto(view.cursorS, now, lead, coast, hold);
      slot.indexR.sampleInto(view.indexTipS, now, lead, coast, hold);
      view.velX = hold ? 0 : slot.cursorR.vx;
      view.velY = hold ? 0 : slot.cursorR.vy;
    }
    snapshot.leadMs = lead;
  }

  /**
   * 0 healthy → 3 lost. Blends "how long since we saw anything" with detection
   * continuity across the window, so a steadily flickering hand reads as
   * degraded even while it is technically visible right now.
   */
  function hndComputeHealth(now) {
    if (!running) return 3;
    if (now - lastAnySeenMs > HND_LOST_MS) return 3;
    if (slots[0].frozen || slots[1].frozen) return 2;
    if (windowCount < 8) return 1;
    const rate = windowHits / windowCount;
    if (rate >= 0.85) return 0;
    if (rate >= 0.55) return 1;
    return 2;
  }

  // Named smoothing presets. The trade is always the same — a lower floor cutoff
  // is steadier at rest but lags under motion; a higher beta opens the filter
  // faster so fast moves keep up at the cost of a little jitter. 'balanced' is the
  // new default (steadier than the old 1.2/0.03) because "not accurate" almost
  // always means fingertip jitter, not lag.
  const HND_SMOOTH_PRESETS = {
    steady: { minCutoff: 0.6, beta: 0.02 },     // rock-still, deliberate work
    balanced: { minCutoff: 0.9, beta: 0.045 },  // default — a touch steadier at rest,
                                                //  a touch quicker under motion, so the
                                                //  median's one-frame lag never reads
    responsive: { minCutoff: 1.6, beta: 0.10 }, // fast hands, accepts some shimmer
  };
  let smoothingName = "balanced";
  // The preset as chosen, before rate adaptation. The filters never hold these
  // numbers directly — see hndTuneFilters.
  let baseMinCutoff = HND_SMOOTH_PRESETS.balanced.minCutoff;
  let baseBeta = HND_SMOOTH_PRESETS.balanced.beta;

  /**
   * How far the smoothing must open up for the rate we are actually getting.
   *
   * A first-order low-pass already holds the same TIME constant at any sample rate,
   * so the cutoff does not need to chase the framerate to stay consistent. What
   * does change is everything around it: at 15 fps the median-of-3 costs 66 ms of
   * lag instead of 33, and every published value is held twice as long before the
   * next one arrives. Spending an unchanged filter delay on top of that doubled
   * sampling delay is exactly why a dim room feels like glue. So the floor cutoff —
   * and the speed term with it — scales with the measured interval: less smoothing
   * when the sample rate is already costing us, more when it is cheap. The preset
   * keeps meaning the same thing to the hand at 15 fps as at 60.
   */
  function hndRateScale() {
    const k = detectIntervalMs / HND_RATE_REF_MS;
    return k < HND_RATE_SCALE_MIN ? HND_RATE_SCALE_MIN
         : k > HND_RATE_SCALE_MAX ? HND_RATE_SCALE_MAX : k;
  }

  function hndTuneFilters() {
    const k = hndRateScale();
    const mc = baseMinCutoff * k;
    const b = baseBeta * k;
    for (let i = 0; i < slots.length; i++) {
      slots[i].cursorF.retune(mc, b);
      slots[i].indexF.retune(mc, b);
    }
  }

  function applySmoothing(minC, b) {
    baseMinCutoff = minC;
    baseBeta = b;
    hndTuneFilters();
  }
  // Seed the chosen default over the constructor's raw params.
  applySmoothing(HND_SMOOTH_PRESETS.balanced.minCutoff, HND_SMOOTH_PRESETS.balanced.beta);

  return {
    start,
    stop,
    dispose,
    update,
    // Render-rate resample only. update() already calls this, so a host on the
    // usual one-update-per-frame loop gets it for free; call it directly to refresh
    // the cursor again later in a frame without touching the camera.
    sample,
    snapshot,
    videoEl,
    // Live smoothing control. Pass a preset name, or {minCutoff, beta} directly.
    // Returns the name now in effect so a caller can show it.
    setSmoothing(nameOrParams) {
      if (typeof nameOrParams === "string" && HND_SMOOTH_PRESETS[nameOrParams]) {
        smoothingName = nameOrParams;
        const p = HND_SMOOTH_PRESETS[nameOrParams];
        applySmoothing(p.minCutoff, p.beta);
      } else if (nameOrParams && typeof nameOrParams === "object") {
        smoothingName = "custom";
        applySmoothing(nameOrParams.minCutoff, nameOrParams.beta);
      }
      return smoothingName;
    },
    get smoothing() {
      return smoothingName;
    },
    smoothingPresets: Object.keys(HND_SMOOTH_PRESETS),
    // Put the comfort box wherever the driving hand is right now, so "screen
    // centre" becomes the spot the student naturally holds their hand — the fix
    // for a camera aimed a little high, or a student sitting off to one side.
    // Returns false if there is no hand to centre on. The move is smoothed.
    recenter() {
      const s = slots[0].hasCursor && snapshot.hands[0].present ? slots[0]
              : slots[1].hasCursor && snapshot.hands[1].present ? slots[1] : null;
      if (!s) return false;
      hndSetCenter(s.rawX, s.rawY);
      return true;
    },
    // Live tuning of the reach mapping. {gain} rescales sensitivity; {cx,cy} move
    // the box centre directly (clamped to keep the box in-frame).
    setRegion(partial) {
      if (!partial) return;
      if (typeof partial.gain === "number") {
        region.gain = Math.max(1, Math.min(2.2, partial.gain));
      }
      if (typeof partial.cx === "number" || typeof partial.cy === "number") {
        hndSetCenter(
          typeof partial.cx === "number" ? partial.cx : region.cx,
          typeof partial.cy === "number" ? partial.cy : region.cy,
        );
      }
    },
    get region() {
      return { gain: region.gain, cx: region.cx, cy: region.cy, cxS, cyS };
    },
    // Measured timing, for a HUD or a support conversation. `fps` is what the
    // camera is really delivering (not the 30 we asked for), `detectMs` the
    // inference cost, `latencyMs` the visible pipeline delay, `leadMs` how much of
    // it the resampler is currently projecting back, and `smoothingScale` how far
    // the rate adaptation has opened the filter beyond the chosen preset.
    get perf() {
      return {
        fps: snapshot.detectFps,
        intervalMs: detectIntervalMs,
        detectMs,
        latencyMs: hndMeasuredLatencyMs(),
        leadMs: snapshot.leadMs,
        smoothingScale: hndRateScale(),
      };
    },
    // Debug/regression hooks — the reach map and the spike guard are otherwise only
    // exercised behind a live webcam, which no automated check has.
    _map(x, y) {
      return { x: hndGainAxis(x, cxS), y: hndGainAxis(y, cyS) };
    },
    _med3: hndMed3,
    get isRunning() {
      return running;
    },
  };
}
