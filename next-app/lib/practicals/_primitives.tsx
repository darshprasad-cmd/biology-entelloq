"use client";

import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useMemo, type ReactNode } from "react";
import type { ThreeElements } from "@react-three/fiber";
import type { ModelProps } from "@/lib/engine/types";

export const PAL = {
  muscle: "#c0392f",
  muscleDeep: "#8f231c",
  cavity: "#3a0f10",
  vesselArtery: "#d9534f",
  vesselVein: "#4a6fa5",
  valve: "#f0e6d2",
  membrane: "#2f9e73",
  cytoplasm: "#123a30",
  nucleus: "#7b5cff",
  organelle: "#34d399",
  wall: "#7fae52",
  petal: "#e879a6",
  pollen: "#f5b942",
  stem: "#3f8f5b",
  glass: "#a9c7d6",
  metal: "#8b93a0",
} as const;

type HitMeshProps = {
  id: string;
  group?: string;
  registerHit: ModelProps["registerHit"];
  ownClip?: boolean;
  children?: ReactNode;
} & Omit<ThreeElements["mesh"], "ref" | "children" | "id">;

/**
 * A mesh that registers itself with the engine so it becomes hoverable,
 * selectable and point-to-identifiable by structure id. Any extra props
 * (geometry, position, rotation, scale…) pass straight through to <mesh>.
 */
export function HitMesh({
  id,
  group,
  registerHit,
  ownClip,
  children,
  ...rest
}: HitMeshProps) {
  const ref = (m: THREE.Mesh | null) => {
    if (!m) return;
    m.userData.structureId = id;
    if (group) m.userData.group = group;
    if (ownClip) m.userData.ownClip = true;
    registerHit(m, id);
  };
  return (
    <mesh ref={ref} castShadow receiveShadow {...rest}>
      {children}
    </mesh>
  );
}

/** A blobby organic body from a subdivided icosahedron, gently deformed. */
export function useBlobGeometry(radius: number, detail = 4, wobble = 0.08) {
  return useMemo(() => {
    const geo = mergeVertices(new THREE.IcosahedronGeometry(radius, detail));
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n =
        Math.sin(v.x * 2.1) * Math.cos(v.y * 1.7) +
        Math.sin(v.z * 2.4 + 1.3);
      v.multiplyScalar(1 + n * wobble * 0.5);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, [radius, detail, wobble]);
}

/** A tube along a smooth curve — used for great vessels, veins, stems. */
export function useTube(
  points: [number, number, number][],
  radius: number,
  radialSegments = 14,
) {
  return useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    );
    return new THREE.TubeGeometry(curve, 48, radius, radialSegments, false);
  }, [points, radius, radialSegments]);
}

/** Standard tissue material props for a given colour. */
export function tissue(color: string, extra?: Partial<THREE.MeshStandardMaterialParameters>) {
  return {
    color,
    roughness: 0.62,
    metalness: 0.04,
    emissive: new THREE.Color(color).multiplyScalar(0.06),
    emissiveIntensity: 1,
    ...extra,
  };
}
