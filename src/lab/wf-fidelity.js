export const meta = {
  name: 'bioq-fidelity',
  description: 'Push realism and accuracy: wet subsurface tissue materials in the toolkit, plus an accuracy audit of both specimens against real dissection photos',
  phases: [{ title: 'Fidelity', detail: 'materials toolkit + accuracy audit' }],
}

const B = 'C:\\Users\\darsh\\biology-entelloq\\_build'

phase('Fidelity')

const jobs = [
  {
    label: 'materials — wet tissue toolkit',
    schema: {
      type: 'object',
      required: ['file', 'summary', 'helperSignaturesPreserved', 'organTypes'],
      properties: {
        file: { type: 'string' },
        summary: { type: 'string' },
        helperSignaturesPreserved: { type: 'boolean' },
        organTypes: { type: 'array', items: { type: 'string' } },
      },
    },
    brief: `Rewrite \`${B}\\anatomy.js\` — the shared geometry+material toolkit — to make everything
built with it look like WET, LIVING DISSECTED TISSUE instead of matte plastic. This single change
lifts every organ in frog.js and heart.js at once, because they all call these helpers. This is the
biggest realism lever in the whole app; spend the effort here.

### READ FIRST
Read the current \`${B}\\anatomy.js\` in full. It defines: value-noise (\`vhash/vnoise/fbm/smooth\`),
\`displace\`, \`seal\`, \`bendZX\`, \`mat\`, \`organ\`, \`lobe\`, \`bean\`, \`bag\`, \`sac\`, \`tube\`,
\`vessel\`, \`childMesh\`, then \`SPECIMENS\` (KEEP its \`requiresPinning\` fields — frog true, heart
false) and \`buildSpecimen\`. Also read \`${B}\\frog.js\` and \`${B}\\heart.js\` to see every way the
helpers are called, so you do NOT break a call site.

### Hard contract — do not break the call sites
- Keep EVERY helper's name and existing positional signature working:
  \`mat(THREE, color, opts)\`, \`organ(THREE, color, rx, ry, rz, opts)\`,
  \`lobe(THREE, color, len, wide, thick, opts)\`, \`bean(THREE,color,len,rad,thick,opts)\`,
  \`bag(THREE,color,len,rad,opts)\`, \`sac(THREE,color,len,rad,opts)\`,
  \`tube(THREE,color,pts,r,opts)\`, \`vessel(THREE,color,pts,r0,r1,opts)\`,
  \`childMesh(parent,mesh,x,y,z,rx,ry,rz)\`, \`displace\`, \`seal\`, \`bendZX\`,
  \`vnoise/fbm\`. Existing opts keys must keep working. You MAY ADD new optional opts keys.
- Keep \`export const SPECIMENS\` (with requiresPinning) and \`export function buildSpecimen\`.
- NO \`import\`. \`THREE\` is a parameter. three r0.160 only. No new top-level identifier may collide
  with names in the other modules (a build guard rejects collisions). After ANY vertex mutation,
  \`computeBoundingSphere()\` + \`computeBoundingBox()\` (keep this in seal/displace/organ).
- Every part.mesh must stay a single pickable Mesh — do not turn organs into Groups.

### The fidelity upgrade — do all of this
1. **Subsurface scattering (the #1 realism cue for organs).** Give \`mat\` a \`tissue\` option that
   drives \`MeshPhysicalMaterial\` transmission + thickness + attenuationColor/attenuationDistance so
   light passes THROUGH thin tissue (lung, mesentery, valve leaflets, gall bladder, fat) and glows
   in thick tissue (liver, myocardium). Tune per an \`opts.tissue\` type — at minimum:
   \`'parenchyma'\` (liver/kidney: dense, low transmission, deep red attenuation),
   \`'muscle'\` (myocardium/wall: fibrous, slight translucency),
   \`'hollow'\` (stomach/intestine: thin wall, moderate translucency),
   \`'serous'\` (lung/mesentery/pericardium: highly translucent, thin),
   \`'valve'\` (leaflets/cusps: thin, pale, translucent),
   \`'fat'\` (fat body/epicardial: soft waxy subsurface, warm),
   \`'vessel'\` (aorta/veins: elastic sheen),
   \`'skin'\` (moist mottled). Pick sensible defaults so existing calls without \`tissue\` still look
   good (infer from colour if you must, but a default wet organ look is fine).
2. **A wet specular coat.** Real organs glisten. Use clearcoat + a low base roughness with a
   procedurally-varied roughness map so highlights break up naturally rather than a plastic sheen.
3. **Procedural surface detail via canvas textures.** Generate small tiling normal + roughness (and
   optionally a subtle albedo mottle / AO) maps per tissue type, from your value-noise, so surfaces
   carry micro-relief: the liver's capsule and lobulation, muscle striations on the myocardium/wall,
   the glossy serosa of the gut, the pebbled skin. Cache/generate once and reuse — do NOT create a
   new 512² canvas per organ (that will blow memory); build a small set of shared textures keyed by
   tissue type and reuse them. Keep total texture memory modest (a handful of ≤256² maps).
4. **Better geometry defaults.** Raise segment counts a little for smoother silhouettes and let
   \`displace\`/\`organ\` add gentler, more organic lumps (multi-octave fbm you already have). Stay
   under a few-hundred-k triangles total for a school laptop.
5. **Colour realism.** Slightly desaturate and deepen the reds toward real fixed-specimen tones;
   avoid candy colours. Keep them distinguishable per organ.

### Verify before returning
Re-read your file; confirm it parses, every helper signature is intact, SPECIMENS still has
requiresPinning, no import statements, textures are shared not per-organ, and bounding volumes are
recomputed after vertex edits. Return the list of \`tissue\` types you support.`,
  },

  {
    label: 'accuracy audit',
    schema: {
      type: 'object',
      required: ['frogFindings', 'heartFindings', 'sources', 'summary'],
      properties: {
        summary: { type: 'string' },
        sources: { type: 'array', items: { type: 'string' } },
        frogFindings: {
          type: 'array',
          items: {
            type: 'object',
            required: ['partId', 'issue', 'fix', 'severity'],
            properties: {
              partId: { type: 'string' },
              issue: { type: 'string', description: 'what is anatomically wrong now' },
              fix: { type: 'string', description: 'the specific correction: exact colour hex, position delta, scale, shape, or relationship' },
              severity: { type: 'string', description: 'high | medium | low' },
            },
          },
        },
        heartFindings: {
          type: 'array',
          items: {
            type: 'object',
            required: ['partId', 'issue', 'fix', 'severity'],
            properties: {
              partId: { type: 'string' },
              issue: { type: 'string' },
              fix: { type: 'string' },
              severity: { type: 'string' },
            },
          },
        },
      },
    },
    brief: `Audit the anatomical accuracy of the two specimens and produce a precise, actionable
correction list. You are NOT editing files — you are the expert eye that says exactly what is wrong.

### Method
- Read \`${B}\\frog.js\` and \`${B}\\heart.js\` closely: for each part note its colour (hex), position
  (x,y,z), scale/shape, and how it relates to neighbours.
- Use WebSearch / WebFetch to pull up REAL labelled dissection PHOTOGRAPHS and atlas plates for the
  frog (Rana) internal anatomy and the mammalian (sheep/human teaching) heart. Compare part by part.
- For every meaningful discrepancy, write a finding with the EXACT fix: the corrected colour hex, the
  position/scale change, the shape correction, or the spatial-relationship fix — specific enough that
  an engineer can apply it without further research. Prioritise the things a biology teacher would
  actually flag: wrong organ colour, wrong position, wrong relative size, wrong count, a structure in
  the wrong layer, or a relationship that reads wrong (e.g. liver not actually covering the stomach).

### What to check hardest
- Frog: liver lobation and that it truly OVERLIES the stomach; gall-bladder colour/position; the
  three-chambered heart form + conus arteriosus; lungs translucency/position; the coiled ileum and
  U-loop duodenum; kidneys dorsal/retroperitoneal with adrenal streaks and the dorsal aorta between
  them; fat bodies genuinely finger-like and the right orange; spleen a dark bead; realistic
  fixed-specimen colours (not bright greens/reds).
- Heart: base-to-apex orientation; LV wall clearly thicker than RV; great-vessel arrangement
  (pulmonary trunk anterior, aorta behind, SVC/IVC to the right atrium, pulmonary veins to the left);
  auricles as ear-flaps; coronary vessels sitting IN the grooves (LAD anterior IV groove, RCA right
  AV groove, circumflex left AV groove, PDA posterior); internal septum/chordae/papillary/valve
  layout when opened; fixed-myocardium colour.

Cite the reference photos/atlases you used. Be exact; vague findings are useless.`,
  },
]

const results = await parallel(jobs.map((j) => () =>
  agent(
    (j.label.startsWith('materials')
      ? j.brief
      : j.brief),
    { label: j.label, phase: 'Fidelity', effort: 'high', schema: j.schema }
  )
))

const [materials, audit] = results
log(`materials: ${materials ? 'done' : 'FAILED'} · audit: ${audit ? (audit.frogFindings || []).length + (audit.heartFindings || []).length + ' findings' : 'FAILED'}`)

return {
  materials: materials ? { file: materials.file, preserved: materials.helperSignaturesPreserved, tissues: materials.organTypes, summary: String(materials.summary).slice(0, 400) } : null,
  audit: audit ? {
    sources: audit.sources,
    frog: (audit.frogFindings || []).filter((f) => /high|med/i.test(f.severity)),
    heart: (audit.heartFindings || []).filter((f) => /high|med/i.test(f.severity)),
    frogCount: (audit.frogFindings || []).length,
    heartCount: (audit.heartFindings || []).length,
  } : null,
}
