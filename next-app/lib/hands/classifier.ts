/**
 * Per-hand gesture classification with hysteresis.
 *
 * Each hand gets its own stateful classifier instance so that pinch state
 * (the primary interaction) has hysteresis: we ENTER a pinch when the tips
 * come within PINCH_ENTER of hand size, and only EXIT when they separate past
 * PINCH_RELEASE. The gap between the two thresholds eliminates the flicker that
 * plagues naive per-frame classification when fingers hover near the boundary.
 */

import {
  LM,
  FINGERTIPS,
  FINGER_MCPS,
  dist2,
  handSize,
  pinchRatio,
  isFingerExtended,
  extendedFingerCount,
  pinchPoint,
  palmRoll,
  type Landmark,
} from "./landmarks";
import { clamp, mapRange } from "@/lib/utils";

export type Gesture =
  | "none"
  | "pinch"
  | "point"
  | "fist"
  | "openPalm"
  | "five";

// Fractions of hand size (wrist→middle-MCP).
export const PINCH_ENTER = 0.42;
export const PINCH_RELEASE = 0.6;
const PINCH_CLOSED = 0.12;

export type Handedness = "Left" | "Right";

export interface HandPose {
  handedness: Handedness;
  gesture: Gesture;
  /** 0 = open, 1 = fully pinched. Continuous — drives grab/tools. */
  pinchStrength: number;
  isPinching: boolean;
  /** Pinch cursor midpoint, normalised image space (x,y ∈ [0,1]). */
  cursor: Landmark;
  /** Index fingertip, normalised image space. */
  indexTip: Landmark;
  /** Wrist roll in radians (for specimen rotation). */
  roll: number;
  handSize: number;
  landmarks: Landmark[];
}

function isFistShape(lm: Landmark[]): boolean {
  let curled = 0;
  for (let i = 0; i < FINGERTIPS.length; i++) {
    if (!isFingerExtended(lm, FINGERTIPS[i], FINGER_MCPS[i], 1.05)) curled++;
  }
  return curled >= 3;
}

function isPointShape(lm: Landmark[]): boolean {
  const indexOut = isFingerExtended(lm, LM.INDEX_TIP, LM.INDEX_MCP, 0.95);
  const middleIn = !isFingerExtended(lm, LM.MIDDLE_TIP, LM.MIDDLE_MCP, 1.0);
  const ringIn = !isFingerExtended(lm, LM.RING_TIP, LM.RING_MCP, 1.0);
  const pinkyIn = !isFingerExtended(lm, LM.PINKY_TIP, LM.PINKY_MCP, 1.0);
  return indexOut && middleIn && ringIn && pinkyIn;
}

function thumbExtended(lm: Landmark[]): boolean {
  // Thumb tip meaningfully farther from pinky-MCP than the thumb-MCP is.
  const ref = lm[LM.PINKY_MCP];
  return dist2(lm[LM.THUMB_TIP], ref) > dist2(lm[LM.THUMB_MCP], ref) * 1.05;
}

/** Creates one stateful classifier for a single hand. */
export function createHandClassifier() {
  let pinching = false;

  return function classify(
    lm: Landmark[],
    handedness: Handedness,
  ): HandPose {
    const hs = handSize(lm);
    const ratio = pinchRatio(lm);

    // Hysteresis on the pinch state.
    if (pinching) {
      pinching = ratio < PINCH_RELEASE;
    } else {
      pinching = ratio < PINCH_ENTER;
    }
    const pinchStrength = clamp(
      mapRange(ratio, PINCH_RELEASE, PINCH_CLOSED, 0, 1),
      0,
      1,
    );

    let gesture: Gesture;
    if (pinching) {
      gesture = "pinch";
    } else if (isPointShape(lm)) {
      gesture = "point";
    } else if (isFistShape(lm)) {
      gesture = "fist";
    } else if (extendedFingerCount(lm) >= 4) {
      gesture = thumbExtended(lm) ? "five" : "openPalm";
    } else {
      gesture = "none";
    }

    return {
      handedness,
      gesture,
      pinchStrength,
      isPinching: pinching,
      cursor: pinchPoint(lm),
      indexTip: lm[LM.INDEX_TIP],
      roll: palmRoll(lm),
      handSize: hs,
      landmarks: lm,
    };
  };
}
