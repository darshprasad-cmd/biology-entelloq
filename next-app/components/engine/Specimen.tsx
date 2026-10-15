"use client";

import * as THREE from "three";
import { useCallback, useRef, type RefObject } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Practical } from "@/lib/engine/types";
import { useLab } from "@/lib/engine/store";
import { applyVisualState } from "./visualState";

export function Specimen({
  practical,
  groupRef,
  clipPlane,
}: {
  practical: Practical;
  groupRef: RefObject<THREE.Group | null>;
  clipPlane: THREE.Plane | null;
}) {
  const Model = practical.Model;
  const dissection = useLab((s) => s.dissection);
  const exploded = useLab((s) => s.exploded);
  const labelsVisible = useLab((s) => s.labelsVisible);
  const selectedId = useLab((s) => s.selectedId);
  const setHovered = useLab((s) => s.setHovered);
  const select = useLab((s) => s.select);
  const hovering = useRef<string | null>(null);

  const registerHit = useCallback(
    (mesh: THREE.Object3D | null, id: string) => {
      if (!mesh) return;
      mesh.userData.structureId = id;
      mesh.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && !o.userData.structureId) {
          o.userData.structureId = id;
        }
      });
    },
    [],
  );

  // Apply the universal display state (transparency, isolation, cross-section,
  // hover/select highlight) every frame — reads store without subscribing.
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const st = useLab.getState();
    applyVisualState(g, {
      hoveredId: st.hoveredId,
      selectedId: st.selectedId,
      transparency: st.transparency,
      isolatedGroup: st.isolatedGroup,
      hiddenIds: st.hiddenIds,
      fadedIds: st.fadedIds,
      clipPlane,
    });
  });

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (useLab.getState().inputMode === "hand") return;
    e.stopPropagation();
    const id = (e.object.userData.structureId as string | undefined) ?? null;
    if (id !== hovering.current) {
      hovering.current = id;
      setHovered(id);
      document.body.style.cursor = id ? "pointer" : "auto";
    }
  };

  const onOut = () => {
    if (hovering.current !== null) {
      hovering.current = null;
      setHovered(null);
      document.body.style.cursor = "auto";
    }
  };

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (useLab.getState().inputMode === "hand") return;
    e.stopPropagation();
    const id = (e.object.userData.structureId as string | undefined) ?? null;
    if (id) select(id);
  };

  return (
    <group
      ref={groupRef}
      onPointerMove={onMove}
      onPointerOut={onOut}
      onClick={onClick}
    >
      <Model
        dissection={dissection}
        exploded={exploded}
        hoveredId={useLab.getState().hoveredId}
        selectedId={selectedId}
        isolatedGroup={useLab.getState().isolatedGroup}
        transparency={useLab.getState().transparency}
        crossSection={useLab.getState().crossSection}
        labelsVisible={labelsVisible}
        hiddenIds={useLab.getState().hiddenIds}
        fadedIds={useLab.getState().fadedIds}
        registerHit={registerHit}
      />

      {practical.structures.map((s) => {
        const show = labelsVisible || selectedId === s.id;
        if (!show) return null;
        const active = selectedId === s.id;
        return (
          <Html
            key={s.id}
            position={s.position}
            center
            distanceFactor={8}
            zIndexRange={[20, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div
              style={{ pointerEvents: "auto" }}
              onClick={() => useLab.getState().select(s.id)}
              className={[
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors",
                active
                  ? "bg-bio-500/90 text-ink-950 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.8)]"
                  : "glass-strong text-foreground/90 hover:text-white",
              ].join(" ")}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: active ? "#05070a" : s.accent ?? "#34d399" }}
              />
              {s.name}
            </div>
          </Html>
        );
      })}
    </group>
  );
}
