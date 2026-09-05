"use client";

import * as THREE from "three";
import type { ModelProps, Practical } from "@/lib/engine/types";
import { HitMesh, PAL, tissue } from "./_primitives";

function MicroscopeModel({ exploded, registerHit }: ModelProps) {
  const ex = exploded; // exploded view separates the components
  const metal = (c: string = PAL.metal) =>
    tissue(c, { roughness: 0.35, metalness: 0.7 });
  const glass = tissue(PAL.glass, {
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.55,
  });

  return (
    <group position={[0, -0.2, 0]} scale={0.95}>
      {/* Base */}
      <HitMesh id="base" group="frame" registerHit={registerHit} position={[0, -2.3 - ex * 0.8, 0]}>
        <cylinderGeometry args={[1.5, 1.7, 0.5, 40]} />
        <meshStandardMaterial {...metal("#3a4048")} />
      </HitMesh>

      {/* Arm (curved back support) */}
      <HitMesh id="arm" group="frame" registerHit={registerHit} position={[-0.05, 0.1, -0.75 - ex * 0.9]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.7, 4.4, 0.55]} />
        <meshStandardMaterial {...metal("#464d57")} />
      </HitMesh>

      {/* Illuminator / light source */}
      <HitMesh id="illuminator" group="optics" registerHit={registerHit} position={[0, -1.6 - ex * 0.5, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.25, 24]} />
        <meshStandardMaterial {...tissue("#fff7d6")} emissive={new THREE.Color("#fff2b0")} emissiveIntensity={0.9} />
      </HitMesh>

      {/* Diaphragm */}
      <HitMesh id="diaphragm" group="optics" registerHit={registerHit} position={[0, -1.15 - ex * 0.25, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.12, 24]} />
        <meshStandardMaterial {...metal("#2c3138")} />
      </HitMesh>

      {/* Stage + slide + clips */}
      <group position={[0, -0.55, 0]}>
        <HitMesh id="stage" group="frame" registerHit={registerHit} position={[0, 0, 0]}>
          <boxGeometry args={[2.2, 0.14, 1.6]} />
          <meshStandardMaterial {...metal("#3a4048")} />
        </HitMesh>
        <mesh position={[0, 0.11, 0.15]}>
          <boxGeometry args={[1.0, 0.03, 0.5]} />
          <meshStandardMaterial {...glass} />
        </mesh>
        <HitMesh id="stageClip" group="frame" registerHit={registerHit} position={[0.45, 0.16, 0.15]}>
          <boxGeometry args={[0.5, 0.05, 0.12]} />
          <meshStandardMaterial {...metal("#8b93a0")} />
        </HitMesh>
      </group>

      {/* Revolving nosepiece + objective lenses */}
      <group position={[0, 0.85 + ex * 0.6, 0]}>
        <HitMesh id="revolvingNosepiece" group="optics" registerHit={registerHit}>
          <cylinderGeometry args={[0.5, 0.5, 0.28, 28]} />
          <meshStandardMaterial {...metal("#2c3138")} />
        </HitMesh>
        {[-0.28, 0, 0.28].map((x, i) => (
          <HitMesh
            key={i}
            id="objectiveLens"
            group="optics"
            registerHit={registerHit}
            position={[x, -0.35 - i * 0.06, 0.12]}
          >
            <cylinderGeometry args={[0.1, 0.07, 0.55 + i * 0.15, 18]} />
            <meshStandardMaterial {...metal(i === 1 ? "#c0392f" : "#5a6470")} />
          </HitMesh>
        ))}
      </group>

      {/* Body tube */}
      <HitMesh id="bodyTube" group="optics" registerHit={registerHit} position={[0, 1.7 + ex * 1.1, 0]}>
        <cylinderGeometry args={[0.3, 0.32, 1.3, 24]} />
        <meshStandardMaterial {...metal("#464d57")} />
      </HitMesh>

      {/* Eyepiece / ocular lens */}
      <HitMesh id="eyepiece" group="optics" registerHit={registerHit} position={[0, 2.65 + ex * 1.7, -0.15]} rotation={[-0.3, 0, 0]}>
        <cylinderGeometry args={[0.24, 0.3, 0.7, 24]} />
        <meshStandardMaterial {...metal("#2c3138")} />
      </HitMesh>

      {/* Coarse + fine focus knobs */}
      <HitMesh id="coarseFocus" group="controls" registerHit={registerHit} position={[0.55 + ex * 0.8, 0.1, -0.7]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.2, 28]} />
        <meshStandardMaterial {...metal("#5a6470")} />
      </HitMesh>
      <HitMesh id="fineFocus" group="controls" registerHit={registerHit} position={[0.55 + ex * 1.1, 0.1, -0.55]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.16, 24]} />
        <meshStandardMaterial {...metal("#8b93a0")} />
      </HitMesh>
    </group>
  );
}

export const microscopePractical: Practical = {
  id: "microscope",
  title: "Virtual Microscope",
  tagline: "Master the compound light microscope — every part, every function.",
  emoji: "🔭",
  discipline: "Laboratory Skills",
  difficulty: "Foundation",
  durationMin: 9,
  camera: { position: [0.6, 0.6, 8.5], target: [0, 0, 0] },
  aiContext:
    "A compound light microscope. Optical path: illuminator → diaphragm (controls light) → specimen on the stage → objective lens (on the revolving nosepiece; typically 4×, 10×, 40×) → body tube → eyepiece/ocular lens (usually 10×). Total magnification = objective × eyepiece. Focus with the coarse knob (large movements) then the fine knob (sharp focus). Structural parts: arm and base support the instrument; stage clips hold the slide.",
  objectives: [
    "Name every part of the compound microscope",
    "State the function of each part",
    "Calculate total magnification",
  ],
  structures: [
    { id: "eyepiece", name: "Eyepiece (Ocular Lens)", position: [0, 2.7, 0.4], accent: "#8b93a0", group: "optics", description: "The lens you look through, usually ×10. It magnifies the image formed by the objective lens." },
    { id: "bodyTube", name: "Body Tube", position: [0.5, 1.7, 0.3], accent: "#464d57", group: "optics", description: "Connects the eyepiece to the objective lenses, maintaining the correct optical distance." },
    { id: "revolvingNosepiece", name: "Revolving Nosepiece", position: [0.7, 0.85, 0.4], accent: "#2c3138", group: "optics", description: "The rotating turret that holds the objective lenses and lets you switch magnification." },
    { id: "objectiveLens", name: "Objective Lens", position: [0.5, 0.35, 0.6], accent: "#c0392f", group: "optics", description: "The lens closest to the specimen (e.g. ×4, ×10, ×40). It gathers light and forms the primary magnified image." },
    { id: "stage", name: "Stage", position: [1.3, -0.55, 0.4], accent: "#3a4048", group: "frame", description: "The flat platform where the microscope slide is placed for viewing, with a hole to let light through." },
    { id: "stageClip", name: "Stage Clip", position: [0.9, -0.4, 0.4], accent: "#8b93a0", group: "frame", description: "Holds the slide firmly in position so it doesn't move while you focus." },
    { id: "diaphragm", name: "Diaphragm", position: [0.6, -1.15, 0.4], accent: "#2c3138", group: "optics", description: "An adjustable opening beneath the stage that controls how much light reaches the specimen." },
    { id: "illuminator", name: "Illuminator", position: [0.0, -1.75, 0.5], accent: "#fff2b0", group: "optics", description: "The light source that shines up through the specimen so you can see it." },
    { id: "coarseFocus", name: "Coarse Focus Knob", position: [1.35, 0.1, -0.6], accent: "#5a6470", group: "controls", description: "Moves the stage up and down over large distances to bring the specimen roughly into focus." },
    { id: "fineFocus", name: "Fine Focus Knob", position: [1.5, -0.2, -0.4], accent: "#8b93a0", group: "controls", description: "Makes tiny adjustments for a crisp, sharp final image — used especially at high magnification." },
    { id: "arm", name: "Arm", position: [-0.7, 0.4, -0.6], accent: "#464d57", group: "frame", description: "The curved support connecting the head to the base; used to carry the microscope." },
    { id: "base", name: "Base", position: [-0.8, -2.3, 0.3], accent: "#3a4048", group: "frame", description: "The bottom of the microscope that supports the entire instrument and often houses the light." },
  ],
  supportsDissection: false,
  guided: [
    { id: "g1", title: "The whole instrument", narration: "This is a compound light microscope. Pinch and rotate it to view it from every angle before we name its parts.", action: "Pinch → grab · move to rotate", advanceOn: { type: "next" } },
    { id: "g2", title: "What you look through", narration: "Point at the topmost lens — the eyepiece, or ocular lens, usually ×10.", focusStructureId: "eyepiece", advanceOn: { type: "select", structureId: "eyepiece" } },
    { id: "g3", title: "Separate the parts", narration: "Use the exploded-view control to pull the microscope apart, then find the objective lens closest to the specimen.", focusStructureId: "objectiveLens", advanceOn: { type: "select", structureId: "objectiveLens" } },
    { id: "g4", title: "Bringing it into focus", narration: "Point at the large coarse focus knob. In a real practical you'd use this first, then the fine knob for a sharp image.", focusStructureId: "coarseFocus", advanceOn: { type: "select", structureId: "coarseFocus" } },
    { id: "g5", title: "Ready", narration: "You now know the whole microscope. Take the assessment, then prove your understanding in the AI viva.", advanceOn: { type: "next" } },
  ],
  assessment: [
    { id: "a1", instruction: "Identify the Eyepiece.", requires: { type: "identify", structureId: "eyepiece" }, hint: "The lens at the very top you look through.", successNote: "Correct — the ocular lens." },
    { id: "a2", instruction: "Identify the Objective Lens.", requires: { type: "identify", structureId: "objectiveLens" }, hint: "On the revolving nosepiece, closest to the slide.", successNote: "Yes — forms the primary image." },
    { id: "a3", instruction: "Identify the Stage.", requires: { type: "identify", structureId: "stage" }, hint: "The flat platform holding the slide.", successNote: "Correct." },
    { id: "a4", instruction: "Identify the Coarse Focus Knob.", requires: { type: "identify", structureId: "coarseFocus" }, hint: "The larger of the two focus knobs.", successNote: "Yes — for large focus adjustments." },
  ],
  viva: [
    { id: "v1", prompt: "If the eyepiece is ×10 and the objective lens is ×40, what is the total magnification, and how did you work it out?", expectedConcepts: ["400", "multiply", "eyepiece", "objective"], idealAnswer: "Total magnification = eyepiece × objective = 10 × 40 = ×400. You multiply the two lens magnifications together." },
    { id: "v2", prompt: "Why should you always focus using the coarse knob before the fine knob, especially on high power?", expectedConcepts: ["avoid", "crack", "slide", "close", "sharp"], idealAnswer: "The coarse knob makes large movements, so you use it first at low power to get roughly in focus without driving the objective into and cracking the slide. The fine knob then makes small adjustments for a sharp image, which matters most on high power where the lens is very close to the slide." },
  ],
  Model: MicroscopeModel,
};
