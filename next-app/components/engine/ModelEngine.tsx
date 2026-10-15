"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  AdaptiveDpr,
  Float,
} from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Specimen } from "./Specimen";
import { HandDriver } from "./HandDriver";
import { useLab } from "@/lib/engine/store";
import { structureById, type Practical } from "@/lib/engine/types";
import { mapRange } from "@/lib/utils";

export function ModelEngine({ practical }: { practical: Practical }) {
  const { gl, camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const inputMode = useLab((s) => s.inputMode);
  const crossSection = useLab((s) => s.crossSection);
  const grabbed = useLab((s) => s.grabbed);
  const cameraPreset = useLab((s) => s.cameraPreset);
  const selectedId = useLab((s) => s.selectedId);
  const tool = useLab((s) => s.tool);

  const clipPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, -1), 3.5),
    [],
  );

  // Enable local clipping once.
  useEffect(() => {
    Reflect.set(gl, "localClippingEnabled", true);
  }, [gl]);

  // Frame the camera to the practical.
  useEffect(() => {
    const base = practical.camera?.position ?? [0, 0.4, 6];
    const cam: [number, number, number] =
      cameraPreset === "posterior"
        ? [-base[0], base[1], -Math.abs(base[2])]
        : cameraPreset === "left"
          ? [Math.abs(base[2]), base[1], 0]
          : base;
    camera.position.set(cam[0], cam[1], cam[2]);
    const t = practical.camera?.target ?? [0, 0, 0];
    if (controlsRef.current) {
      controlsRef.current.target.set(t[0], t[1], t[2]);
      controlsRef.current.update();
    }
    camera.lookAt(t[0], t[1], t[2]);
  }, [practical, camera, cameraPreset]);

  useEffect(() => {
    if (tool !== "microscope" || !selectedId || !controlsRef.current) return;
    const structure = structureById(practical, selectedId);
    if (!structure) return;
    controlsRef.current.target.set(...structure.position);
    controlsRef.current.update();
  }, [practical, selectedId, tool]);

  // Drive the clip plane constant from the cross-section slider.
  useFrame(() => {
    clipPlane.setComponents(
      0,
      0,
      -1,
      mapRange(useLab.getState().crossSection, 0, 1, 3.5, -0.25),
    );
  });

  const useClip = crossSection > 0.001;

  return (
    <>
      <color attach="background" args={["#070b10"]} />
      <fog attach="fog" args={["#070b10", 9, 22]} />

      {/* Lighting rig — no external HDR, fully offline. */}
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#bfeee0", "#0a1016", 0.55]} />
      <directionalLight
        position={[4, 6, 5]}
        intensity={2.1}
        color="#eafff6"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-6, 2, -4]} intensity={0.9} color="#38e0d8" />
      <pointLight position={[0, -3, 4]} intensity={0.6} color="#10b981" />
      <spotLight
        position={[0, 8, 2]}
        angle={0.5}
        penumbra={1}
        intensity={1.2}
        color="#ffffff"
      />

      <Float
        speed={grabbed ? 0 : 1.1}
        rotationIntensity={grabbed ? 0 : 0.18}
        floatIntensity={grabbed ? 0 : 0.35}
        floatingRange={[-0.05, 0.05]}
      >
        <Specimen
          practical={practical}
          groupRef={groupRef}
          clipPlane={useClip ? clipPlane : null}
        />
      </Float>

      <HandDriver groupRef={groupRef} />

      <ContactShadows
        position={[0, -2.4, 0]}
        opacity={0.42}
        scale={14}
        blur={2.6}
        far={5}
        color="#0b1a14"
      />

      <OrbitControls
        ref={controlsRef}
        enabled={inputMode === "mouse"}
        enablePan
        enableDamping
        dampingFactor={0.08}
        minDistance={2.5}
        maxDistance={14}
        makeDefault
      />
      <AdaptiveDpr pixelated />
    </>
  );
}
