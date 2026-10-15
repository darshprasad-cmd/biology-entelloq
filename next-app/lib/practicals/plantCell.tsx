"use client";

import * as THREE from "three";
import type { ModelProps, Practical } from "@/lib/engine/types";
import { HitMesh, PAL, tissue, useBlobGeometry } from "./_primitives";

function PlantCellModel({ exploded, registerHit }: ModelProps) {
  const ex = 1 + exploded * 0.6;
  const nucleus = useBlobGeometry(0.6, 3, 0.06);

  const chloros: [number, number, number][] = [
    [1.4, 0.7, 0.6],
    [-1.5, -0.4, 0.5],
    [0.6, -1.4, -0.6],
    [-0.8, 1.3, -0.6],
    [1.3, -0.9, 0.4],
    [-1.3, 0.8, 0.9],
  ];
  const mitos: [number, number, number][] = [
    [1.2, 1.2, -0.3],
    [-1.6, -1.1, -0.2],
  ];

  return (
    <group>
      {/* Rigid cell wall */}
      <HitMesh id="cellWall" group="boundary" registerHit={registerHit}>
        <boxGeometry args={[4.0, 4.0, 4.0]} />
        <meshStandardMaterial {...tissue(PAL.wall)} transparent opacity={0.12} side={THREE.BackSide} />
      </HitMesh>
      <mesh>
        <boxGeometry args={[4.02, 4.02, 4.02]} />
        <meshStandardMaterial color={PAL.wall} wireframe transparent opacity={0.25} />
      </mesh>

      {/* Plasma membrane just inside the wall */}
      <HitMesh id="cellMembrane" group="boundary" registerHit={registerHit}>
        <boxGeometry args={[3.7, 3.7, 3.7]} />
        <meshStandardMaterial {...tissue(PAL.membrane)} transparent opacity={0.14} side={THREE.DoubleSide} />
      </HitMesh>

      {/* Large central vacuole */}
      <HitMesh id="vacuole" group="matrix" registerHit={registerHit}>
        <sphereGeometry args={[1.55, 40, 40]} />
        <meshStandardMaterial {...tissue("#2a7fb0")} transparent opacity={0.16} />
      </HitMesh>

      {/* Nucleus pushed to the edge by the vacuole */}
      <group position={[1.35 * ex, 1.0 * ex, 0.4 * ex]}>
        <HitMesh id="nucleus" group="nucleus" registerHit={registerHit} geometry={nucleus}>
          <meshStandardMaterial {...tissue(PAL.nucleus)} transparent opacity={0.92} />
        </HitMesh>
      </group>

      {/* Chloroplasts */}
      {chloros.map((p, i) => (
        <HitMesh
          key={i}
          id="chloroplast"
          group="organelle"
          registerHit={registerHit}
          position={[p[0] * ex, p[1] * ex, p[2] * ex]}
          rotation={[i * 0.6, i * 0.9, i * 0.3]}
          scale={[0.55, 0.32, 0.4]}
        >
          <sphereGeometry args={[0.6, 20, 16]} />
          <meshStandardMaterial {...tissue("#2f9e52")} emissive={new THREE.Color("#1f7a3a")} emissiveIntensity={0.35} />
        </HitMesh>
      ))}

      {/* Mitochondria */}
      {mitos.map((p, i) => (
        <HitMesh
          key={i}
          id="mitochondrion"
          group="organelle"
          registerHit={registerHit}
          position={[p[0] * ex, p[1] * ex, p[2] * ex]}
          rotation={[i, i * 1.3, 0]}
          scale={[0.45, 0.26, 0.26]}
        >
          <capsuleGeometry args={[0.5, 0.6, 6, 12]} />
          <meshStandardMaterial {...tissue("#e07a3c")} />
        </HitMesh>
      ))}

      {/* Cytoplasm */}
      <HitMesh id="cytoplasm" group="matrix" registerHit={registerHit}>
        <boxGeometry args={[3.6, 3.6, 3.6]} />
        <meshStandardMaterial {...tissue(PAL.cytoplasm)} transparent opacity={0.08} />
      </HitMesh>
    </group>
  );
}

export const plantCellPractical: Practical = {
  id: "plant-cell",
  title: "Plant Cell",
  tagline: "Explore a plant cell's rigid wall, giant vacuole and photosynthetic chloroplasts.",
  emoji: "🌿",
  discipline: "Cell Biology",
  difficulty: "Foundation",
  durationMin: 10,
  camera: { position: [0, 0.6, 8], target: [0, 0, 0] },
  aiContext:
    "A plant (eukaryotic) cell: rigid cellulose cell wall outside the plasma membrane; a large permanent central vacuole filled with cell sap (maintains turgor and pushes organelles to the edge); chloroplasts containing chlorophyll for photosynthesis; nucleus; mitochondria; cytoplasm. Distinct from animal cells by the wall, vacuole and chloroplasts.",
  objectives: [
    "Identify the structures unique to plant cells",
    "Explain the role of the vacuole and cell wall",
    "Link chloroplasts to photosynthesis",
  ],
  structures: [
    { id: "cellWall", name: "Cell Wall", position: [2.2, 2.2, 2.2], accent: "#7fae52", group: "boundary", description: "A rigid cellulose layer that gives the cell shape, support and protection." },
    { id: "cellMembrane", name: "Cell Membrane", position: [-2.0, 1.6, 0.4], accent: "#2f9e73", group: "boundary", description: "Selectively permeable layer just inside the wall, controlling transport into and out of the cell." },
    { id: "vacuole", name: "Central Vacuole", position: [0, 0, 1.7], accent: "#2a7fb0", group: "matrix", description: "A large sap-filled sac that maintains turgor pressure, keeping the plant firm and pushing other organelles to the edge." },
    { id: "nucleus", name: "Nucleus", position: [1.6, 1.3, 0.6], accent: "#7b5cff", group: "nucleus", description: "The control centre holding the cell's DNA, displaced to the edge by the large vacuole." },
    { id: "chloroplast", name: "Chloroplast", position: [1.7, 0.9, 0.8], accent: "#2f9e52", group: "organelle", description: "Contains chlorophyll and is the site of photosynthesis, converting light energy into glucose.", functionText: "Only found in green plant cells, not animal cells." },
    { id: "mitochondrion", name: "Mitochondrion", position: [1.5, 1.6, -0.4], accent: "#e07a3c", group: "organelle", description: "Site of aerobic respiration, releasing energy as ATP — plants respire too, day and night." },
    { id: "cytoplasm", name: "Cytoplasm", position: [-1.6, -1.6, 0.5], accent: "#123a30", group: "matrix", description: "The fluid medium where organelles are suspended and metabolic reactions occur." },
  ],
  supportsDissection: false,
  guided: [
    { id: "g1", title: "A cell with a wall", narration: "This is a plant cell. Pinch and rotate it. Notice the straight, box-like edges — that's the rigid cellulose cell wall an animal cell doesn't have.", action: "Pinch → grab · move to rotate", advanceOn: { type: "next" } },
    { id: "g2", title: "The giant vacuole", narration: "Point at the large central sphere — the vacuole. Filled with sap, it keeps the cell firm through turgor pressure.", focusStructureId: "vacuole", advanceOn: { type: "select", structureId: "vacuole" } },
    { id: "g3", title: "Powerhouses of photosynthesis", narration: "Find a chloroplast — the green, disc-shaped organelle where photosynthesis happens.", focusStructureId: "chloroplast", advanceOn: { type: "select", structureId: "chloroplast" } },
    { id: "g4", title: "Explore", narration: "Show the labels and compare this to the animal cell you studied. Then take the assessment.", advanceOn: { type: "labels" } },
  ],
  assessment: [
    { id: "a1", instruction: "Identify the Cell Wall.", requires: { type: "identify", structureId: "cellWall" }, hint: "The rigid outer box giving the cell its shape.", successNote: "Correct — cellulose support." },
    { id: "a2", instruction: "Identify a Chloroplast.", requires: { type: "identify", structureId: "chloroplast" }, hint: "Green, oval, scattered near the edge.", successNote: "Yes — the photosynthesis organelle." },
    { id: "a3", instruction: "Identify the Central Vacuole.", requires: { type: "identify", structureId: "vacuole" }, hint: "The single large sphere dominating the centre.", successNote: "Correct — maintains turgor." },
  ],
  viva: [
    { id: "v1", prompt: "Explain how the vacuole and cell wall together keep a plant upright.", expectedConcepts: ["turgor", "pressure", "water", "wall", "support"], idealAnswer: "Water entering the vacuole by osmosis raises turgor pressure, pushing the membrane against the rigid cell wall. The wall resists this pressure, making the cell firm; many such firm cells give the plant support and keep it upright." },
    { id: "v2", prompt: "Why can a plant cell photosynthesise but an animal cell cannot?", expectedConcepts: ["chloroplast", "chlorophyll", "light", "glucose"], idealAnswer: "Plant cells contain chloroplasts with chlorophyll, which absorb light energy to convert carbon dioxide and water into glucose. Animal cells have no chloroplasts, so they cannot photosynthesise." },
  ],
  Model: PlantCellModel,
};
