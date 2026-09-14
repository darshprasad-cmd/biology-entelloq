import { lazy } from "react";
import type { Practical } from "@/lib/engine/types";

const HeartModel = lazy(async () => {
  const heartRenderer = await import("./heart");
  return { default: heartRenderer.HeartModel };
});

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
