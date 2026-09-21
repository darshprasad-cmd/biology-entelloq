/**
 * HandController — the runtime for natural hand interaction.
 *
 * A single long-lived object (not React state) that:
 *   1. loads the MediaPipe HandLandmarker (dynamically, browser-only),
 *   2. runs a per-frame detection loop against a <video> element,
 *   3. classifies each hand into a rich {@link HandPose},
 *   4. publishes a *mutable live snapshot* that the 3D scene reads every frame.
 *
 * The hot path (60fps hand → 3D) never touches React — the scene reads
 * `snapshot` inside `useFrame`. Only coarse changes (tracking status, primary
 * gesture) are pushed to subscribers, which throttle them into the store.
 */

import {
  createHandClassifier,
  type HandPose,
  type Gesture,
  type Handedness,
} from "./classifier";
import { twoHandSpan as computeSpan, type Landmark } from "./landmarks";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export type TrackingStatus =
  | "idle"
  | "loading-model"
  | "starting-camera"
  | "tracking"
  | "no-hands"
  | "error";

export interface HandSnapshot {
  status: TrackingStatus;
  hands: HandPose[];
  /** The interacting hand: whichever is pinching, else the first detected. */
  primary: HandPose | null;
  secondary: HandPose | null;
  /** Normalised distance between two pinch points, or null with <2 hands. */
  twoHandSpan: number | null;
  frame: number;
  updatedAt: number;
}

export interface CoarseState {
  status: TrackingStatus;
  handCount: number;
  primaryGesture: Gesture;
  error?: string;
}

type Listener = (s: CoarseState) => void;

export class HandController {
  readonly snapshot: HandSnapshot = {
    status: "idle",
    hands: [],
    primary: null,
    secondary: null,
    twoHandSpan: null,
    frame: 0,
    updatedAt: 0,
  };

  private video: HTMLVideoElement | null = null;
  private landmarker: unknown = null;
  private raf = 0;
  private lastVideoTime = -1;
  private running = false;
  private listeners = new Set<Listener>();
  private classifiers = new Map<Handedness, ReturnType<typeof createHandClassifier>>();
  private lastCoarse: CoarseState = {
    status: "idle",
    handCount: 0,
    primaryGesture: "none",
  };

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.lastCoarse);
    return () => this.listeners.delete(fn);
  }

  private setStatus(status: TrackingStatus, error?: string) {
    this.snapshot.status = status;
    this.emit(error);
  }

  private emit(error?: string) {
    const next: CoarseState = {
      status: this.snapshot.status,
      handCount: this.snapshot.hands.length,
      primaryGesture: this.snapshot.primary?.gesture ?? "none",
      error,
    };
    const prev = this.lastCoarse;
    if (
      next.status !== prev.status ||
      next.handCount !== prev.handCount ||
      next.primaryGesture !== prev.primaryGesture ||
      next.error !== prev.error
    ) {
      this.lastCoarse = next;
      this.listeners.forEach((l) => l(next));
    }
  }

  async start(video: HTMLVideoElement) {
    if (this.running) return;
    this.running = true;
    this.video = video;

    try {
      this.setStatus("loading-model");
      const { FilesetResolver, HandLandmarker } = await import(
        "@mediapipe/tasks-vision"
      );
      const resolver = await FilesetResolver.forVisionTasks(WASM_URL);
      this.landmarker = await HandLandmarker.createFromOptions(resolver, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      this.setStatus("starting-camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });
      video.srcObject = stream;
      await video.play();

      this.setStatus("no-hands");
      this.loop();
    } catch (err) {
      this.running = false;
      const message =
        err instanceof Error ? err.message : "Unknown tracking error";
      this.setStatus("error", message);
    }
  }

  private loop = () => {
    if (!this.running || !this.video || !this.landmarker) return;
    const video = this.video;
    const lm = this.landmarker as {
      detectForVideo: (v: HTMLVideoElement, t: number) => MPResult;
    };

    if (video.readyState >= 2 && video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = video.currentTime;
      try {
        const result = lm.detectForVideo(video, performance.now());
        this.ingest(result);
      } catch {
        /* transient frame errors are ignored; loop continues */
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private classifierFor(h: Handedness) {
    let c = this.classifiers.get(h);
    if (!c) {
      c = createHandClassifier();
      this.classifiers.set(h, c);
    }
    return c;
  }

  private ingest(result: MPResult) {
    const poses: HandPose[] = [];
    const raw = result.landmarks ?? [];
    for (let i = 0; i < raw.length; i++) {
      const lm = raw[i] as Landmark[];
      const mpLabel = result.handedness?.[i]?.[0]?.categoryName;
      // MediaPipe labels from the camera's view; the mirrored display flips it
      // so the label matches the user's own hand.
      const handedness: Handedness = mpLabel === "Left" ? "Right" : "Left";
      poses.push(this.classifierFor(handedness)(lm, handedness));
    }

    // Primary = the pinching hand (strongest pinch), else first hand.
    let primary: HandPose | null = null;
    for (const p of poses) {
      if (p.isPinching && (!primary || p.pinchStrength > primary.pinchStrength)) {
        primary = p;
      }
    }
    if (!primary && poses.length) primary = poses[0];
    const secondary = poses.find((p) => p !== primary) ?? null;

    this.snapshot.hands = poses;
    this.snapshot.primary = primary;
    this.snapshot.secondary = secondary;
    this.snapshot.twoHandSpan =
      poses.length >= 2
        ? computeSpan(poses[0].landmarks, poses[1].landmarks)
        : null;
    this.snapshot.frame++;
    this.snapshot.updatedAt = performance.now();
    this.snapshot.status = poses.length ? "tracking" : "no-hands";
    this.emit();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    const stream = this.video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (this.video) this.video.srcObject = null;
    this.classifiers.clear();
    this.lastVideoTime = -1;
    this.snapshot.hands = [];
    this.snapshot.primary = null;
    this.snapshot.secondary = null;
    this.setStatus("idle");
  }
}

interface MPResult {
  landmarks?: { x: number; y: number; z: number }[][];
  handedness?: { categoryName: string; score: number }[][];
}

let singleton: HandController | null = null;
export function getHandController(): HandController {
  if (!singleton) singleton = new HandController();
  return singleton;
}
