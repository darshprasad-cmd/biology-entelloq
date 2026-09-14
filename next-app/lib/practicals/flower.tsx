"use client";

import * as THREE from "three";
import type { ModelProps, Practical } from "@/lib/engine/types";
import { HitMesh, tissue } from "./_primitives";

function FlowerModel({ dissection, exploded, registerHit }: ModelProps) {
  const open = dissection; // dissection = removing/spreading petals to reveal parts
  const spread = 1 + exploded * 0.5;
  const petalCount = 6;
  const sepalCount = 5;
  const stamenCount = 8;

  return (
    <group rotation={[-0.35, 0, 0]}>
      {/* Receptacle + stem */}
      <HitMesh id="receptacle" group="base" registerHit={registerHit} position={[0, -1.15, 0]}>
        <sphereGeometry args={[0.42, 24, 18]} />
        <meshStandardMaterial {...tissue("#3f8f5b")} />
      </HitMesh>
      <mesh position={[0, -2.1, 0]}>
        <cylinderGeometry args={[0.14, 0.18, 1.6, 16]} />
        <meshStandardMaterial {...tissue("#357a4c")} />
      </mesh>

      {/* Sepals */}
      {Array.from({ length: sepalCount }).map((_, i) => {
        const a = (i / sepalCount) * Math.PI * 2;
        return (
          <HitMesh
            key={`s${i}`}
            id="sepal"
            group="whorl"
            registerHit={registerHit}
            position={[Math.cos(a) * 0.7, -0.95, Math.sin(a) * 0.7]}
            rotation={[Math.PI / 2.4, -a, 0]}
            scale={[0.28, 0.7, 0.08]}
          >
            <sphereGeometry args={[0.6, 14, 10]} />
            <meshStandardMaterial {...tissue("#3d8a52")} side={THREE.DoubleSide} />
          </HitMesh>
        );
      })}

      {/* Petals */}
      {Array.from({ length: petalCount }).map((_, i) => {
        const a = (i / petalCount) * Math.PI * 2;
        const tilt = 0.55 + open * 0.85;
        const r = (0.75 + open * 0.5) * spread;
        return (
          <HitMesh
            key={`p${i}`}
            id="petal"
            group="whorl"
            registerHit={registerHit}
            position={[Math.cos(a) * r, -0.35 + open * 0.15, Math.sin(a) * r]}
            rotation={[tilt, -a, 0]}
            scale={[0.5, 1.15, 0.12]}
          >
            <sphereGeometry args={[0.7, 18, 14]} />
            <meshStandardMaterial
              {...tissue("#e879a6")}
              side={THREE.DoubleSide}
              transparent
              opacity={1 - open * 0.15}
              roughness={0.5}
            />
          </HitMesh>
        );
      })}

      {/* Stamens (filament + anther) */}
      {Array.from({ length: stamenCount }).map((_, i) => {
        const a = (i / stamenCount) * Math.PI * 2;
        const r = 0.42;
        return (
          <group key={`st${i}`} position={[Math.cos(a) * r, -0.5, Math.sin(a) * r]}>
            <HitMesh id="filament" group="reproductive" registerHit={registerHit} position={[0, 0.4, 0]} rotation={[0, 0, Math.cos(a) * 0.2]}>
              <cylinderGeometry args={[0.03, 0.035, 1.0, 8]} />
              <meshStandardMaterial {...tissue("#e7e2c8")} />
            </HitMesh>
            <HitMesh id="anther" group="reproductive" registerHit={registerHit} position={[0, 0.95, 0]}>
              <sphereGeometry args={[0.11, 12, 10]} />
              <meshStandardMaterial {...tissue("#f5b942")} emissive={new THREE.Color("#f5b942")} emissiveIntensity={0.2} />
            </HitMesh>
          </group>
        );
      })}

      {/* Pistil: ovary → style → stigma */}
      <HitMesh id="ovary" group="reproductive" registerHit={registerHit} position={[0, -0.55, 0]}>
        <sphereGeometry args={[0.3, 20, 16]} />
        <meshStandardMaterial {...tissue("#7bbf6a")} />
      </HitMesh>
      <HitMesh id="style" group="reproductive" registerHit={registerHit} position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 1.5, 10]} />
        <meshStandardMaterial {...tissue("#9ccf7e")} />
      </HitMesh>
      <HitMesh id="stigma" group="reproductive" registerHit={registerHit} position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.16, 16, 12]} />
        <meshStandardMaterial {...tissue("#d98cc0")} roughness={0.4} />
      </HitMesh>
    </group>
  );
}

export const flowerPractical: Practical = {
  id: "flower",
  title: "Flower",
  tagline: "Take a flower apart with your hands and uncover how plants reproduce.",
  emoji: "🌸",
  discipline: "Plant Reproduction",
  difficulty: "Foundation",
  durationMin: 11,
  camera: { position: [0, 1.2, 6.5], target: [0, -0.2, 0] },
  aiContext:
    "A generalised insect-pollinated flower. Non-reproductive whorls: sepals (protect the bud) and petals (attract pollinators). Male part (stamen) = filament + anther (produces pollen). Female part (carpel/pistil) = stigma (receives pollen) + style + ovary (contains ovules). Sits on the receptacle at the top of the stem.",
  objectives: [
    "Identify the four whorls of a flower",
    "Distinguish male (stamen) from female (carpel) parts",
    "Explain the role of each part in reproduction",
  ],
  structures: [
    { id: "petal", name: "Petal", position: [1.4, -0.1, 0.2], accent: "#e879a6", group: "whorl", description: "Often large and brightly coloured to attract pollinating insects to the flower." },
    { id: "sepal", name: "Sepal", position: [0.9, -1.2, 0.4], accent: "#3d8a52", group: "whorl", description: "Small green leaf-like structures that enclose and protect the flower while it is a bud." },
    { id: "stamen", name: "Stamen", position: [0.6, 0.5, 0.5], accent: "#f5b942", group: "reproductive", description: "The male reproductive organ, made of a filament supporting an anther." },
    { id: "anther", name: "Anther", position: [0.5, 0.9, 0.3], accent: "#f5b942", group: "reproductive", description: "Produces and releases pollen grains, which contain the male gametes." },
    { id: "filament", name: "Filament", position: [0.45, 0.3, 0.45], accent: "#e7e2c8", group: "reproductive", description: "The stalk that holds the anther in position for pollinators to reach." },
    { id: "stigma", name: "Stigma", position: [0.25, 1.05, 0.1], accent: "#d98cc0", group: "reproductive", description: "The sticky top of the carpel that catches and holds pollen grains during pollination." },
    { id: "style", name: "Style", position: [0.3, 0.25, 0.1], accent: "#9ccf7e", group: "reproductive", description: "The stalk connecting the stigma to the ovary; the pollen tube grows down through it." },
    { id: "ovary", name: "Ovary", position: [0.35, -0.55, 0.35], accent: "#7bbf6a", group: "reproductive", description: "Contains the ovules (female gametes); after fertilisation it develops into the fruit." },
    { id: "receptacle", name: "Receptacle", position: [0.0, -1.25, 0.5], accent: "#3f8f5b", group: "base", description: "The thickened end of the stem to which all the floral parts are attached." },
  ],
  supportsDissection: true,
  guided: [
    { id: "g1", title: "A whole flower", narration: "Here is a complete flower. Pinch and rotate it to see all its parts arranged in rings, or whorls.", action: "Pinch → grab · move to rotate", advanceOn: { type: "next" } },
    { id: "g2", title: "The showy petals", narration: "Point at a petal. Bright petals aren't for us — they advertise the flower to pollinating insects.", focusStructureId: "petal", advanceOn: { type: "select", structureId: "petal" } },
    { id: "g3", title: "Open the flower", narration: "Choose the scalpel and pinch-drag downward to spread the petals aside and reveal the reproductive organs inside.", advanceOn: { type: "dissect", min: 0.75 } },
    { id: "g4", title: "Find the stigma", narration: "Point at the stigma — the sticky female surface at the top of the central carpel that receives pollen.", focusStructureId: "stigma", advanceOn: { type: "select", structureId: "stigma" } },
    { id: "g5", title: "Well dissected", narration: "You've taken a flower apart and found both its male and female parts. Take the assessment when ready.", advanceOn: { type: "next" } },
  ],
  assessment: [
    { id: "a1", instruction: "Identify a Petal.", requires: { type: "identify", structureId: "petal" }, hint: "The large coloured whorl on the outside.", successNote: "Correct — attracts pollinators." },
    { id: "a2", instruction: "Open the flower to at least 75%.", requires: { type: "dissect", min: 0.75 }, hint: "Scalpel + pinch-drag down.", successNote: "Reproductive parts exposed." },
    { id: "a3", instruction: "Identify the Anther.", requires: { type: "identify", structureId: "anther" }, hint: "The pollen-bearing tip of a stamen.", successNote: "Yes — it makes pollen." },
    { id: "a4", instruction: "Identify the Ovary.", requires: { type: "identify", structureId: "ovary" }, hint: "The swollen base of the central carpel.", successNote: "Correct — it holds the ovules." },
  ],
  viva: [
    { id: "v1", prompt: "Describe what happens during pollination and which parts are involved.", expectedConcepts: ["pollen", "anther", "stigma", "transfer", "insect"], idealAnswer: "Pollination is the transfer of pollen from the anther (male) to the stigma (female), often carried by insects attracted by the petals. The pollen then germinates on the stigma." },
    { id: "v2", prompt: "Why are the petals of insect-pollinated flowers usually large and brightly coloured, while wind-pollinated flowers have small dull ones?", expectedConcepts: ["attract", "insect", "pollinator", "wind", "no need"], idealAnswer: "Insect-pollinated flowers need to attract insects, so they have large, bright, scented petals and nectar. Wind-pollinated flowers rely on the wind and don't need to attract anything, so their petals are small and inconspicuous." },
  ],
  Model: FlowerModel,
};
