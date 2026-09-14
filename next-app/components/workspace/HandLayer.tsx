"use client";

import { useEffect, useRef } from "react";
import { getHandController } from "@/lib/hands/controller";
import { useLab } from "@/lib/engine/store";

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

const GESTURE_COLOR: Record<string, string> = {
  pinch: "#34d399",
  fist: "#f5b942",
  point: "#38e0d8",
  openPalm: "#8ea0ae",
  five: "#6ee7b7",
  none: "#8ea0ae",
};

export function HandLayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const skeletonRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const inputMode = useLab((s) => s.inputMode);
  const setTracking = useLab((s) => s.setTracking);
  const onboarding = useLab((s) => s.onboarding);

  // Start / stop the controller with the input mode.
  useEffect(() => {
    const ctrl = getHandController();
    const unsub = ctrl.subscribe((c) =>
      setTracking({
        status: c.status,
        handCount: c.handCount,
        primaryGesture: c.primaryGesture,
        error: c.error,
      }),
    );
    if (inputMode === "hand" && videoRef.current) {
      ctrl.start(videoRef.current);
    }
    return () => {
      unsub();
      if (inputMode !== "hand") ctrl.stop();
    };
  }, [inputMode, setTracking]);

  // Draw loop: skeleton in the corner + pinch cursor in the viewport.
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const ctrl = getHandController();
      const snap = ctrl.snapshot;
      const cnv = skeletonRef.current;
      const ctx = cnv?.getContext("2d");
      if (cnv && ctx) {
        const w = cnv.width;
        const h = cnv.height;
        ctx.clearRect(0, 0, w, h);
        for (const hand of snap.hands) {
          const lm = hand.landmarks;
          const col = GESTURE_COLOR[hand.gesture] ?? "#8ea0ae";
          ctx.strokeStyle = col;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.85;
          for (const [a, b] of CONNECTIONS) {
            if (!lm[a] || !lm[b]) continue;
            ctx.beginPath();
            ctx.moveTo((1 - lm[a].x) * w, lm[a].y * h);
            ctx.lineTo((1 - lm[b].x) * w, lm[b].y * h);
            ctx.stroke();
          }
          for (let i = 0; i < lm.length; i++) {
            const big = i === 4 || i === 8;
            ctx.fillStyle = big ? "#eafff6" : col;
            ctx.beginPath();
            ctx.arc((1 - lm[i].x) * w, lm[i].y * h, big ? 4 : 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }

      // Pinch cursor projected into the viewport.
      const cursor = cursorRef.current;
      const vp = viewportRef.current;
      const primary = snap.primary;
      if (cursor && vp) {
        if (primary && snap.status === "tracking") {
          const rect = vp.getBoundingClientRect();
          const x = (1 - primary.cursor.x) * rect.width;
          const y = primary.cursor.y * rect.height;
          const col = GESTURE_COLOR[primary.gesture] ?? "#8ea0ae";
          const s = 0.7 + primary.pinchStrength * 0.9;
          cursor.style.opacity = "1";
          cursor.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s})`;
          cursor.style.borderColor = col;
          cursor.style.boxShadow = `0 0 24px ${col}, inset 0 0 10px ${col}`;
        } else {
          cursor.style.opacity = "0";
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const showCam = inputMode === "hand";
  const calibrating = onboarding === "calibrating";

  return (
    <div ref={viewportRef} className="pointer-events-none absolute inset-0 z-30">
      {/* Pinch cursor */}
      <div
        ref={cursorRef}
        className="absolute left-0 top-0 h-10 w-10 rounded-full border-2 opacity-0 transition-opacity duration-200"
        style={{ willChange: "transform" }}
      >
        <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
      </div>

      {/* Corner webcam preview + skeleton */}
      <div
        className={[
          "absolute bottom-5 right-5 h-[150px] w-[200px] overflow-hidden rounded-2xl glass-strong transition-all duration-500",
          showCam ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-4",
        ].join(" ")}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        <canvas
          ref={skeletonRef}
          width={200}
          height={150}
          className="absolute inset-0 h-full w-full"
        />
        {calibrating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-24 rounded-full border-2 border-bio-400/70 animate-bio-pulse" />
          </div>
        )}
        <div className="absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-bio-300">
          Live tracking
        </div>
      </div>
    </div>
  );
}
