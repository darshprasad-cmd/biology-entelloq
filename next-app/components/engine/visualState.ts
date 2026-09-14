import * as THREE from "three";

export interface VisualState {
  hoveredId: string | null;
  selectedId: string | null;
  transparency: number; // 0..1
  isolatedGroup: string | null;
  hiddenIds: string[];
  fadedIds: string[];
  clipPlane: THREE.Plane | null;
}

interface Base {
  opacity: number;
  transparent: boolean;
  emissive?: THREE.Color;
  emissiveIntensity?: number;
}

function eachMaterial(mesh: THREE.Mesh, fn: (m: THREE.Material) => void) {
  const mat = mesh.material;
  if (Array.isArray(mat)) mat.forEach((m) => fn(m));
  else if (mat) fn(mat);
}

/**
 * Apply the Universal Model Engine's display state to any specimen group by
 * traversal. Because it reads only `userData.structureId` / `userData.group`,
 * it works for procedural models today and drop-in GLB models tomorrow — the
 * whole point of the engine.
 */
export function applyVisualState(group: THREE.Object3D, s: VisualState) {
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;

    const id = (mesh.userData.structureId as string | undefined) ?? null;
    const grp = (mesh.userData.group as string | undefined) ?? null;
    const hidden = id !== null && s.hiddenIds.includes(id);
    const faded = id !== null && s.fadedIds.includes(id);

    eachMaterial(mesh, (m) => {
      // Capture pristine values once.
      const std = m as THREE.MeshStandardMaterial;
      if (!mesh.userData.base) {
        const base: Base = {
          opacity: m.opacity ?? 1,
          transparent: m.transparent ?? false,
        };
        if (std.emissive instanceof THREE.Color) {
          base.emissive = std.emissive.clone();
          base.emissiveIntensity = std.emissiveIntensity ?? 0;
        }
        mesh.userData.base = base;
      }
      const base = mesh.userData.base as Base;

      const isHovered = id !== null && id === s.hoveredId;
      const isSelected = id !== null && id === s.selectedId;
      const dimmed =
        s.isolatedGroup !== null && grp !== s.isolatedGroup && !isSelected;

      // Opacity: transparency slider dims everything; isolation hides the rest;
      // hovered/selected always stay legible.
      let opacity = base.opacity;
      if (s.transparency > 0 && !isHovered && !isSelected) {
        opacity = base.opacity * (1 - s.transparency * 0.82);
      }
      if (dimmed) opacity = Math.min(opacity, 0.05);
      if (faded && !isSelected) opacity = Math.min(opacity, 0.18);
      if (hidden && !isSelected) opacity = 0;
      const transparent = base.transparent || opacity < 0.999;
      m.transparent = transparent;
      m.opacity = opacity;
      m.depthWrite = opacity > 0.65;
      mesh.visible = !hidden || isSelected;

      // Highlight via emissive glow.
      if (base.emissive && std.emissive instanceof THREE.Color) {
        if (isSelected) {
          std.emissive.set("#34d399");
          std.emissiveIntensity = 0.75;
        } else if (isHovered) {
          std.emissive.set("#6ee7b7");
          std.emissiveIntensity = 0.4;
        } else {
          std.emissive.copy(base.emissive);
          std.emissiveIntensity = base.emissiveIntensity ?? 0;
        }
      }

      // Cross-section clipping.
      m.clippingPlanes = s.clipPlane ? [s.clipPlane] : null;
      m.clipShadows = true;
    });
  });
}
