"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ModelEngine } from "./ModelEngine";
import { getPractical } from "@/lib/engine/registry";
import { useLab } from "@/lib/engine/store";

export default function Scene() {
  const practicalId = useLab((s) => s.practicalId);
  const practical = getPractical(practicalId);

  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 42, position: [0, 0.4, 6.4], near: 0.1, far: 100 }}
    >
      <Suspense fallback={null}>
        {/* key remounts the engine on practical switch → clean camera + state */}
        <ModelEngine practical={practical} key={practical.id} />
      </Suspense>
    </Canvas>
  );
}
