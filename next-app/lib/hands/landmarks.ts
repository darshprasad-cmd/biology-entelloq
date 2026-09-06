/**
 * MediaPipe Hands landmark model + geometry helpers.
 *
 * MediaPipe returns 21 landmarks per hand in normalised image space
 * (x,y ∈ [0,1], origin top-left; z is relative depth, negative = toward camera).
 * All gesture metrics here are normalised by *hand size* (wrist→middle-MCP),
 * so they are invariant to how far the hand is from the camera — the key
 * robustness trick borrowed from production gesture systems.
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export const LM = {
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
} as const;

export const FINGERTIPS = [
  LM.INDEX_TIP,
  LM.MIDDLE_TIP,
  LM.RING_TIP,
  LM.PINKY_TIP,
] as const;

export const FINGER_MCPS = [
  LM.INDEX_MCP,
  LM.MIDDLE_MCP,
  LM.RING_MCP,
  LM.PINKY_MCP,
] as const;

export const FINGER_PIPS = [
  LM.INDEX_PIP,
  LM.MIDDLE_PIP,
  LM.RING_PIP,
  LM.PINKY_PIP,
] as const;

/** 2D euclidean distance (ignores z — image-plane distance). */
export function dist2(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** 3D euclidean distance. */
export function dist3(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Apparent hand size: wrist → middle-MCP distance in normalised space.
 * Grows as the hand nears the camera; used as the scale for every other
 * metric so thresholds stay depth-invariant.
 */
export function handSize(lm: Landmark[]): number {
  const w = lm[LM.WRIST];
  const m = lm[LM.MIDDLE_MCP];
  if (!w || !m) return 0;
  return dist2(w, m);
}

/** Midpoint of thumb tip and index tip — the natural "pinch cursor". */
export function pinchPoint(lm: Landmark[]): Landmark {
  const t = lm[LM.THUMB_TIP];
  const i = lm[LM.INDEX_TIP];
  return { x: (t.x + i.x) / 2, y: (t.y + i.y) / 2, z: (t.z + i.z) / 2 };
}

/** Pinch aperture as a fraction of hand size (0 = tips touching). */
export function pinchRatio(lm: Landmark[]): number {
  const hs = handSize(lm);
  if (hs === 0) return 1;
  return dist2(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP]) / hs;
}

/**
 * A finger is "extended" when its tip is meaningfully farther from the wrist
 * than its MCP joint. The slack factor allows a slightly bent finger.
 */
export function isFingerExtended(
  lm: Landmark[],
  tipIdx: number,
  mcpIdx: number,
  slack = 0.9,
): boolean {
  const wrist = lm[LM.WRIST];
  return dist2(lm[tipIdx], wrist) > dist2(lm[mcpIdx], wrist) * slack;
}

/** How many of the four fingers (index→pinky) are extended. */
export function extendedFingerCount(lm: Landmark[]): number {
  let n = 0;
  for (let i = 0; i < FINGERTIPS.length; i++) {
    if (isFingerExtended(lm, FINGERTIPS[i], FINGER_MCPS[i])) n++;
  }
  return n;
}

/** Roll angle of the hand (radians) from index-MCP → pinky-MCP across the palm. */
export function palmRoll(lm: Landmark[]): number {
  const a = lm[LM.INDEX_MCP];
  const b = lm[LM.PINKY_MCP];
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Pointing direction (radians) of the index finger, PIP → TIP. */
export function pointingAngle(lm: Landmark[]): number {
  const a = lm[LM.INDEX_PIP];
  const b = lm[LM.INDEX_TIP];
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Distance between the two hands' pinch points, normalised by mean hand size. */
export function twoHandSpan(a: Landmark[], b: Landmark[]): number {
  const pa = pinchPoint(a);
  const pb = pinchPoint(b);
  const scale = (handSize(a) + handSize(b)) / 2 || 1;
  return dist2(pa, pb) / scale;
}
