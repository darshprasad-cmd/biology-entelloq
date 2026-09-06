"use client";

import * as THREE from "three";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { ModelProps, Practical } from "@/lib/engine/types";
import { useLab } from "@/lib/engine/store";
import {
  HitMesh,
  PAL,
  tissue,
  useBlobGeometry,
  useTube,
} from "./_primitives";

// Hoisted so the tube geometries memoise stably (no rebuild during dissection).
const AORTA_PTS: [number, number, number][] = [
  [0.05, 0.5, -0.1],
  [0.12, 1.35, -0.2],
  [-0.15, 1.95, -0.25],
  [-0.85, 1.8, -0.3],
  [-1.05, 1.05, -0.25],
  [-1.0, 0.55, -0.2],
];
const PULMONARY_PTS: [number, number, number][] = [
  [-0.35, 0.6, 0.35],
  [-0.15, 1.3, 0.15],
  [0.35, 1.7, -0.05],
  [0.55, 1.5, -0.2],
];
const SVC_PTS: [number, number, number][] = [
  [-0.75, 1.7, 0.15],
  [-0.75, 1.0, 0.1],
  [-0.7, 0.7, 0.1],
];
const PULMVEIN_PTS: [number, number, number][] = [
  [1.15, 1.0, -0.45],
  [0.75, 0.75, -0.4],
  [0.5, 0.6, -0.3],
];
const CORONARY_PTS: [number, number, number][] = [
  [0.1, 0.45, 0.75],
  [-0.4, 0.0, 0.9],
  [-0.55, -0.6, 0.75],
  [-0.3, -1.1, 0.55],
];

export function HeartModel({ dissection, exploded, registerHit }: ModelProps) {
  const beat = useRef<THREE.Group>(null);

  const lv = useBlobGeometry(1.15, 4, 0.07);
  const rv = useBlobGeometry(1.0, 4, 0.08);
  const la = useBlobGeometry(0.62, 3, 0.09);
  const ra = useBlobGeometry(0.64, 3, 0.09);

  const aorta = useTube(AORTA_PTS, 0.26);
  const pulmonary = useTube(PULMONARY_PTS, 0.24);
  const svc = useTube(SVC_PTS, 0.2);
  const pulmVein = useTube(PULMVEIN_PTS, 0.14);
  const coronary = useTube(CORONARY_PTS, 0.055);

  // Subtle heartbeat when idle (paused while grabbed).
  useFrame(({ clock }) => {
    if (!beat.current) return;
    const grabbed = useLab.getState().grabbed;
    const t = clock.elapsedTime;
    const s = grabbed ? 1 : 1 + Math.max(0, Math.sin(t * 2.4)) ** 6 * 0.035;
    beat.current.scale.setScalar(s);
  });

  const doorAngle = -dissection * 2.35;
  const revealed = dissection > 0.12;
  const explodeY = exploded * 0.6;

  return (
    <group ref={beat}>
      {/* ── Ventricles (exterior, identifiable) ─────────────────────────── */}
      <HitMesh
        id="leftVentricle"
        group="chamber"
        registerHit={registerHit}
        geometry={lv}
        position={[0.4, -0.55, -0.1]}
        scale={[1, 1.25, 1]}
      >
        <meshStandardMaterial {...tissue(PAL.muscle)} />
      </HitMesh>
      <HitMesh
        id="rightVentricle"
        group="chamber"
        registerHit={registerHit}
        geometry={rv}
        position={[-0.6, -0.4, 0.28]}
        scale={[1, 1.18, 1]}
      >
        <meshStandardMaterial {...tissue("#cf5145")} />
      </HitMesh>

      {/* ── Atria ───────────────────────────────────────────────────────── */}
      <HitMesh
        id="leftAtrium"
        group="chamber"
        registerHit={registerHit}
        geometry={la}
        position={[0.6, 0.85 + explodeY, -0.35]}
      >
        <meshStandardMaterial {...tissue("#a83b34")} />
      </HitMesh>
      <HitMesh
        id="rightAtrium"
        group="chamber"
        registerHit={registerHit}
        geometry={ra}
        position={[-0.72, 0.8 + explodeY, 0.05]}
      >
        <meshStandardMaterial {...tissue("#b6443b")} />
      </HitMesh>

      {/* ── Apex ────────────────────────────────────────────────────────── */}
      <HitMesh
        id="apex"
        group="chamber"
        registerHit={registerHit}
        position={[0.15, -1.7, 0.0]}
        rotation={[Math.PI, 0, 0.15]}
      >
        <coneGeometry args={[0.4, 0.7, 20]} />
        <meshStandardMaterial {...tissue(PAL.muscleDeep)} />
      </HitMesh>

      {/* ── Great vessels ───────────────────────────────────────────────── */}
      <HitMesh
        id="aorta"
        group="vessel"
        registerHit={registerHit}
        geometry={aorta}
        position={[0, explodeY * 0.6, 0]}
      >
        <meshStandardMaterial {...tissue(PAL.vesselArtery)} />
      </HitMesh>
      <HitMesh
        id="pulmonaryArtery"
        group="vessel"
        registerHit={registerHit}
        geometry={pulmonary}
        position={[0, explodeY * 0.6, 0]}
      >
        <meshStandardMaterial {...tissue("#9c5fb0")} />
      </HitMesh>
      <HitMesh
        id="venaCava"
        group="vessel"
        registerHit={registerHit}
        geometry={svc}
        position={[0, explodeY * 0.6, 0]}
      >
        <meshStandardMaterial {...tissue(PAL.vesselVein)} />
      </HitMesh>
      <HitMesh
        id="pulmonaryVein"
        group="vessel"
        registerHit={registerHit}
        geometry={pulmVein}
      >
        <meshStandardMaterial {...tissue("#5a7fb5")} />
      </HitMesh>
      <HitMesh
        id="coronaryArtery"
        group="vessel"
        registerHit={registerHit}
        geometry={coronary}
      >
        <meshStandardMaterial {...tissue("#e6b422")} emissive={new THREE.Color("#e6b422")} emissiveIntensity={0.15} />
      </HitMesh>

      {/* ── Interior (revealed by dissection) ───────────────────────────── */}
      <group visible={revealed}>
        {/* cross-section cut face */}
        <mesh position={[-0.05, -0.45, 0.42]}>
          <circleGeometry args={[1.35, 40]} />
          <meshStandardMaterial
            color={PAL.cavity}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
        <HitMesh
          id="septum"
          group="interior"
          registerHit={registerHit}
          position={[-0.05, -0.45, 0.46]}
        >
          <boxGeometry args={[0.16, 1.7, 0.6]} />
          <meshStandardMaterial {...tissue("#9a2e26")} />
        </HitMesh>
        <HitMesh
          id="mitralValve"
          group="interior"
          registerHit={registerHit}
          position={[0.45, -0.1, 0.52]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.32, 0.08, 12, 24]} />
          <meshStandardMaterial {...tissue(PAL.valve)} />
        </HitMesh>
        <HitMesh
          id="tricuspidValve"
          group="interior"
          registerHit={registerHit}
          position={[-0.55, -0.05, 0.52]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.3, 0.075, 12, 24]} />
          <meshStandardMaterial {...tissue("#e8dcc4")} />
        </HitMesh>
      </group>

      {/* ── Anterior wall (the "cut" flap) ──────────────────────────────── */}
      <group position={[-0.1, 0.55, 0.15]} rotation={[doorAngle, 0, 0]}>
        <mesh position={[0, -0.9, 0.55]}>
          <cylinderGeometry
            args={[1.2, 0.95, 1.85, 28, 1, true, Math.PI / 2 - 0.85, 1.7]}
          />
          <meshStandardMaterial
            {...tissue(PAL.muscle)}
            side={THREE.DoubleSide}
            transparent
            opacity={1 - dissection * 0.25}
          />
        </mesh>
      </group>
    </group>
  );
}

export const heartPractical: Practical = {
  id: "heart",
  title: "Human Heart",
  tagline: "Hold a beating heart, open its chambers, and trace the flow of blood.",
  emoji: "🫀",
  discipline: "Human Physiology",
  difficulty: "Intermediate",
  durationMin: 12,
  camera: { position: [0, 0.25, 7.8], target: [0, -0.1, 0] },
  aiContext:
    "A human heart specimen: four chambers (left & right atria, left & right ventricles), separated by the interventricular septum; atrioventricular valves (mitral/bicuspid on the left, tricuspid on the right); great vessels (aorta, pulmonary artery/trunk, superior vena cava, pulmonary veins); coronary arteries on the surface; the apex at the inferior tip. Blood flows: body → vena cava → right atrium → tricuspid → right ventricle → pulmonary artery → lungs → pulmonary veins → left atrium → mitral → left ventricle → aorta → body.",
  objectives: [
    "Identify the four chambers and the septum",
    "Distinguish the atrioventricular valves",
    "Trace the double-circulation pathway of blood",
    "Explain why the left ventricle wall is thickest",
  ],
  priorKnowledge: [
    "Arteries carry blood away from the heart; veins return blood",
    "Valves maintain one-way flow",
    "Muscle thickness reflects the force a chamber must produce",
  ],
  orientation:
    "View the anterior surface first. The apex points inferiorly and slightly left; anatomical left appears on your right when facing the specimen.",
  safetyAndEthics:
    "This clinical simulation avoids graphic tissue and uses no donated specimen imagery. In a physical practical, wear eye protection and gloves, follow local tissue-handling rules, and treat donated or animal material with respect.",
  revisionSummary: [
    "Right heart → lungs; left heart → body",
    "Valves stop backflow as pressure changes",
    "The left ventricular wall is thickest because systemic resistance is higher",
    "Coronary vessels supply the myocardium itself",
  ],
  comparison:
    "Like other mammals, humans have a four-chambered heart that completely separates pulmonary and systemic blood. Fish use a two-chambered single circuit; amphibians have incomplete separation.",
  accessibilityDescription:
    "A clinically coloured four-chambered human heart shown from the front. Major vessels emerge superiorly, the ventricles form the lower muscular mass, and controls also expose an ordered text atlas.",
  permittedTools: ["hand", "scalpel", "forceps", "microscope", "measure"],
  layers: [
    { id: "external", name: "External anatomy", description: "Surface chambers, apex and coronary supply.", structureIds: ["leftVentricle", "rightVentricle", "leftAtrium", "rightAtrium", "coronaryArtery", "apex"] },
    { id: "vessels", name: "Great vessels", description: "Routes carrying blood into and away from the heart.", structureIds: ["aorta", "pulmonaryArtery", "venaCava", "pulmonaryVein"] },
    { id: "interior", name: "Internal anatomy", description: "Structures that separate chambers and enforce one-way flow.", structureIds: ["septum", "mitralValve", "tricuspidValve"] },
  ],
  citations: [
    { label: "OpenStax Anatomy & Physiology 2e — Heart Anatomy", source: "OpenStax", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy" },
    { label: "Anatomy, Thorax, Heart", source: "NCBI Bookshelf", url: "https://www.ncbi.nlm.nih.gov/books/NBK470256/" },
  ],
  assets: [
    { asset: "Procedural heart geometry", author: "Biology Entelloq", licence: "Project source code licence", source: "Generated at runtime in lib/practicals/heart.tsx; no external model or texture files." },
  ],
  structures: [
    {
      id: "leftVentricle",
      name: "Left Ventricle",
      position: [0.4, -0.7, 1.1],
      accent: "#c0392f",
      group: "chamber",
      description:
        "The heart's most powerful chamber. Its thick muscular wall pumps oxygenated blood into the aorta and around the entire body.",
      functionText: "Systemic circulation pump — highest pressure chamber.",
      system: "Cardiovascular system",
      relationships: "Receives blood through the mitral valve and ejects it through the aortic valve into the aorta.",
      significance: "Its thick myocardium is direct evidence of the higher pressure required for systemic circulation.",
      misconception: "Anatomical left appears on the viewer's right in an anterior view.",
    },
    {
      id: "rightVentricle",
      name: "Right Ventricle",
      position: [-0.6, -0.55, 1.4],
      accent: "#cf5145",
      group: "chamber",
      description:
        "Receives deoxygenated blood from the right atrium and pumps it to the lungs via the pulmonary artery. Its wall is thinner — the lungs are a low-pressure circuit.",
      functionText: "Pulmonary circulation pump.",
      system: "Cardiovascular system",
      relationships: "Receives blood through the tricuspid valve and sends it to the lungs through the pulmonary trunk.",
      significance: "Its thinner wall reflects the low-resistance pulmonary circuit.",
    },
    {
      id: "leftAtrium",
      name: "Left Atrium",
      position: [0.85, 1.0, 0.3],
      accent: "#a83b34",
      group: "chamber",
      description:
        "Collects oxygen-rich blood returning from the lungs through the pulmonary veins, then delivers it through the mitral valve into the left ventricle.",
    },
    {
      id: "rightAtrium",
      name: "Right Atrium",
      position: [-1.0, 0.95, 0.4],
      accent: "#b6443b",
      group: "chamber",
      description:
        "Receives deoxygenated blood from the body via the superior and inferior vena cava and passes it through the tricuspid valve into the right ventricle.",
    },
    {
      id: "aorta",
      name: "Aorta",
      position: [-1.15, 1.2, 0.0],
      accent: "#d9534f",
      group: "vessel",
      description:
        "The body's largest artery. It arches out of the left ventricle and distributes oxygenated blood to every organ.",
      system: "Systemic circulation",
      relationships: "Leaves the left ventricle; its branches supply the head, upper limbs, trunk and lower body.",
      significance: "Elastic recoil helps maintain arterial pressure between beats.",
    },
    {
      id: "pulmonaryArtery",
      name: "Pulmonary Artery",
      position: [0.6, 1.7, 0.1],
      accent: "#9c5fb0",
      group: "vessel",
      description:
        "Carries deoxygenated blood from the right ventricle to the lungs — the only artery that carries deoxygenated blood.",
      system: "Pulmonary circulation",
      relationships: "Leaves the right ventricle and divides toward the left and right lungs.",
      misconception: "Arteries are defined by direction away from the heart, not oxygen content.",
    },
    {
      id: "venaCava",
      name: "Superior Vena Cava",
      position: [-0.9, 1.75, 0.3],
      accent: "#4a6fa5",
      group: "vessel",
      description:
        "A large vein returning deoxygenated blood from the head, neck and upper body into the right atrium.",
    },
    {
      id: "pulmonaryVein",
      name: "Pulmonary Vein",
      position: [1.25, 1.0, -0.4],
      accent: "#5a7fb5",
      group: "vessel",
      description:
        "Returns oxygenated blood from the lungs to the left atrium — the only vein that carries oxygenated blood.",
      system: "Pulmonary circulation",
      relationships: "Usually four pulmonary veins return blood from the lungs to the left atrium.",
      misconception: "Veins are defined by direction toward the heart, not oxygen content.",
    },
    {
      id: "coronaryArtery",
      name: "Coronary Artery",
      position: [-0.65, -0.5, 0.95],
      accent: "#e6b422",
      group: "vessel",
      description:
        "Branches across the heart's surface to supply the cardiac muscle itself with oxygen. A blockage here causes a heart attack.",
    },
    {
      id: "apex",
      name: "Apex",
      position: [0.2, -1.9, 0.2],
      accent: "#8f231c",
      group: "chamber",
      description:
        "The pointed inferior tip of the heart, formed by the left ventricle. Its beat can be felt against the chest wall.",
    },
    {
      id: "septum",
      name: "Interventricular Septum",
      position: [-0.05, -0.45, 0.9],
      accent: "#9a2e26",
      group: "interior",
      description:
        "The muscular wall separating the left and right ventricles, keeping oxygenated and deoxygenated blood from mixing.",
      system: "Cardiac conduction and separation",
      relationships: "Forms a shared wall between the ventricles and carries part of the ventricular conduction pathway.",
    },
    {
      id: "mitralValve",
      name: "Mitral (Bicuspid) Valve",
      position: [0.55, -0.1, 0.9],
      accent: "#f0e6d2",
      group: "interior",
      description:
        "The two-cusped valve between the left atrium and left ventricle. It prevents backflow when the ventricle contracts.",
      system: "One-way cardiac flow",
      relationships: "Chordae tendineae and papillary muscles stop its leaflets prolapsing during ventricular systole.",
    },
    {
      id: "tricuspidValve",
      name: "Tricuspid Valve",
      position: [-0.6, -0.05, 0.9],
      accent: "#e8dcc4",
      group: "interior",
      description:
        "The three-cusped valve between the right atrium and right ventricle, preventing backflow into the atrium.",
      system: "One-way cardiac flow",
      relationships: "Opens as the right ventricle fills and closes when ventricular pressure rises.",
    },
  ],
  supportsDissection: true,
  guided: [
    {
      id: "g1",
      title: "Pick up the heart",
      narration:
        "Let's begin. Pinch the heart to pick it up, then turn your wrist to rotate it. Get a feel for the whole organ before we look inside.",
      action: "Pinch → grab · move to rotate · open palm to release",
      checkpoint: {
        prompt: "Prediction: when facing the front of the heart, which side of the screen contains anatomical left?",
        answer: "Anatomical left appears on your right, as if you were facing the person.",
      },
      advanceOn: { type: "next" },
    },
    {
      id: "g2",
      title: "Find the left ventricle",
      narration:
        "Point at the large, thick-walled chamber at the lower left. That's the left ventricle — the powerhouse that drives blood around the whole body.",
      focusStructureId: "leftVentricle",
      advanceOn: { type: "select", structureId: "leftVentricle" },
    },
    {
      id: "g3",
      title: "Compare the right ventricle",
      narration:
        "Now identify the right ventricle. Notice it sits more to the front and has a thinner wall — it only has to reach the nearby lungs.",
      focusStructureId: "rightVentricle",
      checkpoint: {
        prompt: "Observe: which ventricle should have the thicker wall, and why?",
        answer: "The left ventricle, because it must create enough pressure to drive blood through the systemic circuit.",
      },
      advanceOn: { type: "select", structureId: "rightVentricle" },
    },
    {
      id: "g4",
      title: "Open the anterior wall",
      narration:
        "Select the scalpel from the tool dock, then pinch and drag downward to cut through the anterior wall and expose the chambers within.",
      advanceOn: { type: "dissect", min: 0.85 },
      checkpoint: {
        prompt: "Predict what lies beneath the anterior ventricular wall before you complete the incision.",
        answer: "The ventricular cavities, interventricular septum and atrioventricular valve apparatus become visible.",
      },
    },
    {
      id: "g5",
      title: "Identify the valves",
      narration:
        "With the heart open, point at the mitral valve. These valves enforce one-way flow — the secret to an efficient double circulation.",
      focusStructureId: "mitralValve",
      advanceOn: { type: "select", structureId: "mitralValve" },
    },
    {
      id: "g6",
      title: "You've dissected a heart",
      narration:
        "Excellent work. You've handled, opened and explored a human heart. When you're ready, take the assessment and then the AI viva to prove your mastery.",
      advanceOn: { type: "next" },
    },
  ],
  assessment: [
    {
      id: "a1",
      instruction: "Identify the Left Ventricle.",
      requires: { type: "identify", structureId: "leftVentricle" },
      hint: "It's the largest chamber, lower-left, with the thickest wall.",
      successNote: "Correct — the systemic pump.",
    },
    {
      id: "a2",
      instruction: "Identify the Aorta.",
      requires: { type: "identify", structureId: "aorta" },
      hint: "The large vessel arching off the top of the left ventricle.",
      successNote: "Yes — the body's main artery.",
    },
    {
      id: "a3",
      instruction: "Open the heart to at least 85%.",
      requires: { type: "dissect", min: 0.85 },
      hint: "Switch to the scalpel and pinch-drag downward.",
      successNote: "The chambers are exposed.",
    },
    {
      id: "a4",
      instruction: "Identify the Tricuspid Valve.",
      requires: { type: "identify", structureId: "tricuspidValve" },
      hint: "Between the right atrium and right ventricle — three cusps.",
      successNote: "Correct — right atrioventricular valve.",
    },
  ],
  viva: [
    {
      id: "v1",
      prompt:
        "Why is the wall of the left ventricle so much thicker than the right ventricle?",
      expectedConcepts: [
        "higher pressure",
        "systemic circulation",
        "whole body",
        "more muscle",
      ],
      idealAnswer:
        "The left ventricle pumps blood into the systemic circulation to the entire body, which requires high pressure, so its muscular wall is thicker. The right ventricle only pumps to the nearby low-pressure pulmonary circuit.",
      structureId: "leftVentricle",
    },
    {
      id: "v2",
      prompt: "Trace the path of a red blood cell from the body back to the body.",
      expectedConcepts: [
        "vena cava",
        "right atrium",
        "right ventricle",
        "pulmonary artery",
        "lungs",
        "pulmonary vein",
        "left atrium",
        "left ventricle",
        "aorta",
      ],
      idealAnswer:
        "Body → vena cava → right atrium → tricuspid valve → right ventricle → pulmonary artery → lungs → pulmonary veins → left atrium → mitral valve → left ventricle → aorta → body.",
    },
    {
      id: "v3",
      prompt: "What is the function of the heart valves, and what would happen if one failed?",
      expectedConcepts: [
        "one-way",
        "prevent backflow",
        "efficiency",
        "regurgitation",
      ],
      idealAnswer:
        "Valves ensure one-way blood flow and prevent backflow between chambers. A failing valve lets blood leak backward (regurgitation), reducing pumping efficiency and forcing the heart to work harder.",
    },
  ],
  Model: HeartModel,
};
