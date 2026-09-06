"use client";

import * as THREE from "three";
import type { ModelProps, Practical } from "@/lib/engine/types";
import { HitMesh, PAL, tissue, useBlobGeometry } from "./_primitives";

function AnimalCellModel({ exploded, registerHit }: ModelProps) {
  const ex = 1 + exploded * 0.7;
  const membrane = useBlobGeometry(2.05, 4, 0.05);
  const nucleus = useBlobGeometry(0.72, 3, 0.06);

  const mitos: [number, number, number][] = [
    [1.1, 0.6, 0.4],
    [-1.0, -0.7, 0.6],
    [0.3, -1.2, -0.7],
    [-0.6, 0.9, -0.9],
  ];
  const ribos: [number, number, number][] = [
    [0.9, -0.3, 1.0],
    [-1.2, 0.3, 0.4],
    [0.4, 1.2, 0.6],
    [-0.4, -0.9, 1.0],
    [1.2, 0.9, -0.3],
    [-0.9, -1.1, -0.4],
  ];

  return (
    <group>
      {/* Plasma membrane */}
      <HitMesh id="cellMembrane" group="boundary" registerHit={registerHit} geometry={membrane}>
        <meshStandardMaterial
          {...tissue(PAL.membrane)}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          roughness={0.3}
        />
      </HitMesh>

      {/* Cytoplasm (inner soft glow) */}
      <HitMesh id="cytoplasm" group="matrix" registerHit={registerHit}>
        <sphereGeometry args={[1.95, 32, 32]} />
        <meshStandardMaterial {...tissue(PAL.cytoplasm)} transparent opacity={0.12} />
      </HitMesh>

      {/* Nucleus + nucleolus */}
      <group position={[0.1 * ex, 0.15 * ex, 0]}>
        <HitMesh id="nucleus" group="nucleus" registerHit={registerHit} geometry={nucleus}>
          <meshStandardMaterial {...tissue(PAL.nucleus)} transparent opacity={0.9} />
        </HitMesh>
        <HitMesh id="nucleolus" group="nucleus" registerHit={registerHit} position={[0.12, 0.05, 0.15]}>
          <sphereGeometry args={[0.26, 20, 20]} />
          <meshStandardMaterial {...tissue("#4a2ea8")} />
        </HitMesh>
      </group>

      {/* Mitochondria */}
      {mitos.map((p, i) => (
        <HitMesh
          key={i}
          id="mitochondrion"
          group="organelle"
          registerHit={registerHit}
          position={[p[0] * ex, p[1] * ex, p[2] * ex]}
          rotation={[i * 0.7, i * 1.1, i * 0.4]}
          scale={[0.5, 0.28, 0.28]}
        >
          <capsuleGeometry args={[0.5, 0.7, 6, 14]} />
          <meshStandardMaterial {...tissue("#e07a3c")} />
        </HitMesh>
      ))}

      {/* Rough endoplasmic reticulum */}
      <HitMesh
        id="endoplasmicReticulum"
        group="organelle"
        registerHit={registerHit}
        position={[-0.7 * ex, -0.2 * ex, 0.7 * ex]}
        rotation={[0.4, 0.6, 0]}
      >
        <torusKnotGeometry args={[0.55, 0.09, 90, 8, 2, 3]} />
        <meshStandardMaterial {...tissue("#2f8f6b")} />
      </HitMesh>

      {/* Golgi apparatus (stacked cisternae) */}
      <group position={[0.9 * ex, -0.8 * ex, -0.2 * ex]} rotation={[0.3, 0, 0.2]}>
        {[0, 1, 2, 3].map((i) => (
          <HitMesh
            key={i}
            id="golgiApparatus"
            group="organelle"
            registerHit={registerHit}
            position={[0, i * 0.16, 0]}
            scale={[1 - i * 0.12, 1, 1 - i * 0.12]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[0.4, 0.05, 10, 24, Math.PI]} />
            <meshStandardMaterial {...tissue("#d4a53a")} />
          </HitMesh>
        ))}
      </group>

      {/* Lysosome */}
      <HitMesh
        id="lysosome"
        group="organelle"
        registerHit={registerHit}
        position={[-1.0 * ex, 0.9 * ex, 0.5 * ex]}
      >
        <sphereGeometry args={[0.3, 18, 18]} />
        <meshStandardMaterial {...tissue("#c65cff")} />
      </HitMesh>

      {/* Ribosomes */}
      {ribos.map((p, i) => (
        <HitMesh
          key={i}
          id="ribosome"
          group="organelle"
          registerHit={registerHit}
          position={[p[0] * ex, p[1] * ex, p[2] * ex]}
        >
          <sphereGeometry args={[0.09, 10, 10]} />
          <meshStandardMaterial {...tissue("#eafff6")} emissive={new THREE.Color("#6ee7b7")} emissiveIntensity={0.2} />
        </HitMesh>
      ))}
    </group>
  );
}

export const animalCellPractical: Practical = {
  id: "animal-cell",
  title: "Animal Cell",
  tagline: "Peer inside a living animal cell and meet the organelles that keep it alive.",
  emoji: "🔬",
  discipline: "Cell Biology",
  difficulty: "Foundation",
  durationMin: 10,
  camera: { position: [0, 0.5, 7], target: [0, 0, 0] },
  aiContext:
    "An animal (eukaryotic) cell: plasma membrane, cytoplasm, nucleus containing a nucleolus, mitochondria (aerobic respiration / ATP), rough endoplasmic reticulum, Golgi apparatus, lysosomes, and ribosomes. Unlike a plant cell it has NO cell wall, NO chloroplasts and NO large permanent vacuole.",
  objectives: [
    "Identify the main organelles of an animal cell",
    "Relate each organelle to its function",
    "Contrast the animal cell with a plant cell",
  ],
  structures: [
    { id: "cellMembrane", name: "Cell (Plasma) Membrane", position: [0, 2.1, 0.2], accent: "#2f9e73", group: "boundary", description: "A selectively permeable phospholipid bilayer controlling what enters and leaves the cell." },
    { id: "cytoplasm", name: "Cytoplasm", position: [1.4, -1.4, 0.6], accent: "#123a30", group: "matrix", description: "The jelly-like fluid where organelles sit and most chemical reactions of the cell occur." },
    { id: "nucleus", name: "Nucleus", position: [0.1, 0.9, 0.4], accent: "#7b5cff", group: "nucleus", description: "The control centre: it stores DNA and directs the cell's activities, including protein synthesis." },
    { id: "nucleolus", name: "Nucleolus", position: [0.35, 0.2, 0.6], accent: "#4a2ea8", group: "nucleus", description: "A dense region inside the nucleus that manufactures ribosomes." },
    { id: "mitochondrion", name: "Mitochondrion", position: [1.4, 0.75, 0.5], accent: "#e07a3c", group: "organelle", description: "The powerhouse of the cell — site of aerobic respiration, releasing energy as ATP.", functionText: "More numerous in cells with high energy demand, like muscle." },
    { id: "endoplasmicReticulum", name: "Endoplasmic Reticulum", position: [-1.1, -0.3, 1.0], accent: "#2f8f6b", group: "organelle", description: "A network of membranes; the rough ER (studded with ribosomes) folds and transports proteins." },
    { id: "golgiApparatus", name: "Golgi Apparatus", position: [1.3, -1.1, -0.3], accent: "#d4a53a", group: "organelle", description: "Modifies, packages and ships proteins and lipids in vesicles — the cell's post office." },
    { id: "lysosome", name: "Lysosome", position: [-1.3, 1.2, 0.6], accent: "#c65cff", group: "organelle", description: "Contains digestive enzymes that break down waste, debris and worn-out organelles." },
    { id: "ribosome", name: "Ribosome", position: [0.6, 1.6, 0.8], accent: "#eafff6", group: "organelle", description: "Tiny structures that assemble amino acids into proteins during translation." },
  ],
  supportsDissection: false,
  guided: [
    { id: "g1", title: "Meet the cell", narration: "Here is a living animal cell. Pinch to pick it up and rotate it. Notice it has no rigid outer wall — just a soft, flexible membrane.", action: "Pinch → grab · move to rotate", advanceOn: { type: "next" } },
    { id: "g2", title: "The control centre", narration: "Point at the large purple sphere near the middle — that's the nucleus, holding the cell's DNA.", focusStructureId: "nucleus", advanceOn: { type: "select", structureId: "nucleus" } },
    { id: "g3", title: "See inside", narration: "Use the transparency control to fade the membrane, then find a mitochondrion — the cell's powerhouse.", focusStructureId: "mitochondrion", advanceOn: { type: "select", structureId: "mitochondrion" } },
    { id: "g4", title: "Explore freely", narration: "Turn on labels with an open five-finger hand, then identify the Golgi apparatus and lysosome. When ready, take the assessment.", advanceOn: { type: "labels" } },
  ],
  assessment: [
    { id: "a1", instruction: "Identify the Nucleus.", requires: { type: "identify", structureId: "nucleus" }, hint: "The largest organelle, centrally placed.", successNote: "Correct — the control centre." },
    { id: "a2", instruction: "Identify a Mitochondrion.", requires: { type: "identify", structureId: "mitochondrion" }, hint: "Bean-shaped, orange, scattered in the cytoplasm.", successNote: "Yes — site of respiration." },
    { id: "a3", instruction: "Identify the Cell Membrane.", requires: { type: "identify", structureId: "cellMembrane" }, hint: "The outer boundary of the whole cell.", successNote: "Correct." },
  ],
  viva: [
    { id: "v1", prompt: "Give one structural difference between an animal cell and a plant cell, and explain its significance.", expectedConcepts: ["cell wall", "chloroplast", "vacuole", "support", "photosynthesis"], idealAnswer: "Animal cells lack a cell wall (so they have no rigid support and are flexible), lack chloroplasts (they cannot photosynthesise) and lack a large permanent vacuole." },
    { id: "v2", prompt: "Why do muscle cells contain especially large numbers of mitochondria?", expectedConcepts: ["energy", "ATP", "respiration", "contraction"], idealAnswer: "Muscle cells need a great deal of energy to contract, and mitochondria carry out aerobic respiration to release that energy as ATP, so more mitochondria supply more energy." },
  ],
  Model: AnimalCellModel,
};
