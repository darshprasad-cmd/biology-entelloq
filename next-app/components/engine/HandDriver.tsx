"use client";

import * as THREE from "three";
import { useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { getHandController } from "@/lib/hands/controller";
import { useLab } from "@/lib/engine/store";
import { clamp } from "@/lib/utils";

const ROTATE_SENSITIVITY = 4.2;
const ROLL_SENSITIVITY = 1.1;
const LEAN_RADIUS = 0.55;
const MIN_SCALE = 0.55;
const MAX_SCALE = 2.3;

/**
 * Translates live hand poses into specimen interaction every frame. Lives
 * inside the Canvas; reads the controller snapshot directly (no React state on
 * the hot path) and only writes to the store on discrete changes.
 */
export function HandDriver({
  groupRef,
  homeScale = 1,
}: {
  groupRef: RefObject<THREE.Group | null>;
  homeScale?: number;
}) {
  const { camera } = useThree();
  const ctrl = getHandController();

  const rayRef = useRef<THREE.Raycaster | null>(null);
  if (rayRef.current === null) rayRef.current = new THREE.Raycaster();
  const ray = rayRef.current;

  const stateRef = useRef<DriverState | null>(null);
  if (stateRef.current === null) stateRef.current = createDriverState();
  const state = stateRef.current;

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const lab = useLab.getState();
    const snap = ctrl.snapshot;
    const active = lab.inputMode === "hand" && snap.status === "tracking";

    if (!active || !snap.primary) {
      // Ease back home when hands leave.
      if (state.grabbing || state.holding) {
        state.grabbing = false;
        state.holding = false;
        lab.setGrabbed(false);
      }
      g.position.lerp(state.home, 0.12);
      g.scale.lerp(state.homeScaleVec.setScalar(homeScale), 0.1);
      return;
    }

    const p = snap.primary;
    const both =
      snap.hands.length >= 2 &&
      snap.hands[0].isPinching &&
      snap.hands[1].isPinching &&
      snap.twoHandSpan !== null;

    // Mirrored NDC from the pinch cursor.
    const ndcX = 1 - 2 * p.cursor.x;
    const ndcY = 1 - 2 * p.cursor.y;

    // ── Two-hand pinch → zoom + roll ────────────────────────────────────────
    if (both) {
      endGrab(state, lab);
      const span = snap.twoHandSpan as number;
      if (state.baseSpan === null) {
        state.baseSpan = span;
        state.baseScale = g.scale.x;
        state.baseTwoAngle = twoHandAngle(snap);
        state.prevTwoAngle = state.baseTwoAngle;
      }
      const target = clamp(
        (state.baseScale * span) / (state.baseSpan || span),
        MIN_SCALE,
        MAX_SCALE,
      );
      g.scale.lerp(state.homeScaleVec.setScalar(target), 0.25);
      const ang = twoHandAngle(snap);
      g.rotation.z += (ang - (state.prevTwoAngle ?? ang)) * 0.9;
      state.prevTwoAngle = ang;
      lab.setGrabbed(true);
      return;
    } else {
      state.baseSpan = null;
      state.prevTwoAngle = null;
    }

    // ── Point → identify structure under the fingertip ──────────────────────
    if (p.gesture === "point") {
      endGrab(state, lab);
      const fx = 1 - 2 * p.indexTip.x;
      const fy = 1 - 2 * p.indexTip.y;
      const id = raycastId(ray, g, camera, fx, fy);
      lab.setHovered(id);
      if (id && id !== state.lastPointed) {
        state.lastPointed = id;
        lab.select(id);
      }
      leanHome(g, state, homeScale);
      return;
    }
    state.lastPointed = null;

    // ── Five fingers → toggle labels (rising edge) ──────────────────────────
    if (p.gesture === "five") {
      if (!state.fiveLatch) {
        state.fiveLatch = true;
        lab.toggleLabels();
      }
    } else if (p.gesture !== "openPalm") {
      state.fiveLatch = false;
    }

    // ── Open palm → release ─────────────────────────────────────────────────
    if (p.gesture === "openPalm") {
      endGrab(state, lab);
      const id = raycastId(ray, g, camera, ndcX, ndcY);
      lab.setHovered(id);
      leanHome(g, state, homeScale);
      state.fiveLatch = false;
      return;
    }

    // ── Pinch / fist → grab & manipulate ────────────────────────────────────
    const wantsGrab = p.gesture === "pinch" || p.gesture === "fist";
    if (wantsGrab) {
      const scalpel = lab.tool === "scalpel" && p.gesture === "pinch";

      if (!state.grabbing) {
        state.grabbing = true;
        state.holding = p.gesture === "fist";
        state.prevX = ndcX;
        state.prevY = ndcY;
        state.prevRoll = p.roll;
        state.dissectAnchorY = ndcY;
        lab.setGrabbed(true);
      }

      if (scalpel) {
        // Pinch + drag downward performs the incision.
        const drag = state.dissectAnchorY - ndcY; // down = positive
        if (drag > 0.002) {
          lab.addDissection(drag * 1.4);
          state.dissectAnchorY = ndcY;
        } else if (drag < 0) {
          state.dissectAnchorY = ndcY;
        }
      } else {
        // Trackball rotation from hand movement + wrist roll.
        const dx = ndcX - state.prevX;
        const dy = ndcY - state.prevY;
        g.rotation.y += dx * ROTATE_SENSITIVITY;
        g.rotation.x += -dy * ROTATE_SENSITIVITY;
        let dRoll = p.roll - state.prevRoll;
        if (dRoll > Math.PI) dRoll -= 2 * Math.PI;
        if (dRoll < -Math.PI) dRoll += 2 * Math.PI;
        g.rotation.z += dRoll * ROLL_SENSITIVITY;

        // Subtle lean toward the hand for the "in your hand" feel (not for fist hold).
        if (!state.holding) {
          const world = pointerWorld(ray, g, camera, ndcX, ndcY);
          const center = g.getWorldPosition(state.tmpCenter);
          const offset = state.tmpOffset.subVectors(world, center);
          offset.z = 0;
          if (offset.length() > LEAN_RADIUS) offset.setLength(LEAN_RADIUS);
          state.tmpTarget.copy(state.home).add(offset);
          g.position.lerp(state.tmpTarget, 0.18);
        }
      }
      state.prevX = ndcX;
      state.prevY = ndcY;
      state.prevRoll = p.roll;
      return;
    }

    // Idle hand present → hover only.
    endGrab(state, lab);
    const id = raycastId(ray, g, camera, ndcX, ndcY);
    lab.setHovered(id);
    leanHome(g, state, homeScale);
  });

  return null;
}

// ── helpers ───────────────────────────────────────────────────────────────

interface DriverState {
  grabbing: boolean;
  holding: boolean;
  prevX: number;
  prevY: number;
  prevRoll: number;
  dissectAnchorY: number;
  lastPointed: string | null;
  fiveLatch: boolean;
  baseSpan: number | null;
  baseScale: number;
  baseTwoAngle: number;
  prevTwoAngle: number | null;
  home: THREE.Vector3;
  homeScaleVec: THREE.Vector3;
  tmpCenter: THREE.Vector3;
  tmpOffset: THREE.Vector3;
  tmpTarget: THREE.Vector3;
}

// Persistent per-instance mutable scratch, initialised once.
function createDriverState(): DriverState {
  return {
    grabbing: false,
    holding: false,
    prevX: 0,
    prevY: 0,
    prevRoll: 0,
    dissectAnchorY: 0,
    lastPointed: null,
    fiveLatch: false,
    baseSpan: null,
    baseScale: 1,
    baseTwoAngle: 0,
    prevTwoAngle: null,
    home: new THREE.Vector3(0, 0, 0),
    homeScaleVec: new THREE.Vector3(1, 1, 1),
    tmpCenter: new THREE.Vector3(),
    tmpOffset: new THREE.Vector3(),
    tmpTarget: new THREE.Vector3(),
  };
}

function endGrab(s: DriverState, lab: ReturnType<typeof useLab.getState>) {
  if (s.grabbing || s.holding) {
    s.grabbing = false;
    s.holding = false;
    lab.setGrabbed(false);
  }
}

function leanHome(g: THREE.Group, s: DriverState, homeScale: number) {
  g.position.lerp(s.home, 0.12);
  g.scale.lerp(s.homeScaleVec.setScalar(homeScale), 0.08);
}

function twoHandAngle(snap: ReturnType<typeof getHandController>["snapshot"]) {
  const a = snap.hands[0].cursor;
  const b = snap.hands[1].cursor;
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function pointerWorld(
  ray: THREE.Raycaster,
  g: THREE.Group,
  camera: THREE.Camera,
  ndcX: number,
  ndcY: number,
): THREE.Vector3 {
  ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const dist = camera.position.distanceTo(g.getWorldPosition(new THREE.Vector3()));
  return ray.ray.at(dist, new THREE.Vector3());
}

function raycastId(
  ray: THREE.Raycaster,
  g: THREE.Group,
  camera: THREE.Camera,
  ndcX: number,
  ndcY: number,
): string | null {
  ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const hits = ray.intersectObject(g, true);
  for (const h of hits) {
    const id = h.object.userData.structureId as string | undefined;
    if (id) return id;
  }
  return null;
}
