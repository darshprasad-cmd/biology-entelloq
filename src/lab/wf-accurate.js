export const meta = {
  name: 'bioq-accuracy',
  description: 'Rebuild the frog and heart to genuine dissection accuracy, each grounded in real anatomical references',
  phases: [{ title: 'Anatomy', detail: 'frog + heart, researched against real specimens' }],
}

const B = 'C:\\Users\\darsh\\biology-entelloq\\_build'

const SHARED = `
## Goal
Make the specimen ANATOMICALLY ACCURATE — accurate enough that a biology teacher or a demonstrator
looking at it says "yes, that is right", not "close enough". The user's instruction is literally
"make it even more accurate". Accuracy beats prettiness; get the SHAPES, PROPORTIONS, POSITIONS,
COLOURS and SPATIAL RELATIONSHIPS right, grounded in real references, not from vague memory.

## Research first (do not skip — this is the whole point)
Use WebSearch / WebFetch to pull up real dissection references BEFORE you touch geometry: labelled
dissection photographs, teaching-lab manuals, and anatomy atlases for THIS specimen. Confirm, with
sources, the true count, shape, size, colour and position of every structure, and the spatial
relationships a dissection reveals (what lies over what, what is retroperitoneal, what is hidden
until something is moved). Cite what you used in your return.

## The build contract (this file concatenates into ONE module scope with anatomy.js)
- NO \`import\` statements. \`THREE\` is a function parameter to your builder.
- **anatomy.js is concatenated BEFORE your file and provides a shared toolkit you MUST reuse**
  (do not redefine them — that is a duplicate-declaration crash):
  \`mat(THREE,color,opts)\`, \`organ(THREE,color,rx,ry,rz,opts)\`, \`lobe(...)\`, \`bean(...)\`,
  \`bag(...)\`, \`sac(...)\`, \`tube(THREE,color,pts,r,opts)\`, \`vessel(THREE,color,pts,r0,r1,opts)\`,
  \`childMesh(parent,mesh,x,y,z,rx,ry,rz)\`, \`displace(THREE,geo,amp,freq,seed)\`,
  \`fbm/vnoise\`, \`seal(geo)\`, \`bendZX(THREE,geo,k)\`. READ anatomy.js first to see their exact
  signatures. You MAY add new local helpers, but give them unique names (a build-time collision
  guard will reject any name already declared in another module).
- three.js r0.160 only. \`Object3D.position\` is read-only — \`.position.set()\`.
- After ANY direct vertex mutation you MUST call \`geometry.computeBoundingSphere()\` and
  \`computeBoundingBox()\`, or the raycaster's bounding-sphere reject makes the part unpickable.
  (The toolkit helpers already do this; only your own vertex edits need it.)

## The picking + layering contract (dissect.js depends on it — do NOT break it)
- Every \`part.mesh\` is ONE pickable Mesh with real geometry. Extra visual detail (eyes, nostrils,
  branches, lob's sub-features, mesentery, hilum, etc.) must be attached as decorative CHILD meshes
  via \`childMesh(parent.mesh, ...)\` so they are NEVER in the raycast pick list yet inherit the
  parent's visibility. Do not add standalone meshes to the group that aren't registered parts.
- Set \`mesh.userData.partId\` (the toolkit \`add()\` pattern already does). Parts with \`layer > 0\`
  start hidden; the engine reveals them.
`

phase('Anatomy')

const JOBS = [
  {
    file: 'frog.js',
    label: 'frog — accurate',
    brief: `Rewrite \`${B}\\frog.js\` (the \`buildFrog(THREE)\` function) to genuine amphibian-dissection
accuracy. Research REAL frog (Rana) internal anatomy first.

### Keep these exact part IDs (shell.js objectives + dissect.js reference them)
skin, muscle-wall, ventral-abdominal-vein, forelimb-left, forelimb-right, hindlimb-left,
hindlimb-right, liver-left, liver-right, liver-median, gall-bladder, frog-heart, lung-left,
lung-right, stomach, small-intestine, large-intestine, cloaca, spleen, fat-body-left,
fat-body-right, kidney-left, kidney-right, dorsal-aorta, vertebral-column. You MAY add extra
DECORATIVE child detail, and you may add a FEW new parts if anatomy demands it (e.g. oesophagus,
pancreas, oviducts, urinary bladder, truncus arteriosus) — but keep every ID above.

### Accuracy targets to verify against references and get right
- **Body form**: a real frog is markedly dorso-ventrally FLATTENED and pinned SUPINE (ventral up).
  The head is a broad triangle, not a sharp cone; eyes bulge dorsally (so from the ventral view they
  are low domes at the sides), the tympanum sits behind each eye. Forelimbs are short with 4 digits,
  hindlimbs long and folded with 5 webbed digits — a frog at rest is not a starfish; the limbs fold.
- **Liver**: large, dark red-brown, DOMINATES the anterior cavity and hides the stomach. Three
  lobes: right and left lobes plus a smaller median lobe; the GALL BLADDER (small, green) sits
  between the right and median lobes, revealed only when the liver is lifted.
- **Heart**: small, anterior, in the midline between the liver lobes, apex pointing back; a frog
  heart is THREE-chambered (two atria, one ventricle) with a conus/truncus arteriosus leaving it —
  render that, not a mammalian four-chamber shape.
- **Lungs**: paired thin translucent sacs, dorsolateral to the heart, deflated on a fixed specimen.
- **Stomach**: a curved J-shaped bag on the animal's LEFT, continuous with the oesophagus above and
  a coiled small intestine below; only visible once the liver is reflected.
- **Small intestine**: a genuine COIL held in a translucent mesentery; leads to a wider rectum
  (large intestine) that opens into the cloaca at the posterior midline.
- **Kidneys**: paired, flattened, dark red, on the DORSAL body wall (retroperitoneal) — a pair of
  elongated ribbons either side of the midline, with the dorsal aorta between them and yellow
  adrenal streaks on their ventral face. They stay put when the gut is removed.
- **Fat bodies**: bright orange, FINGER-LIKE lobed processes near the anterior pole of each kidney/
  gonad — a signature frog structure; make them clearly finger-like, not ovoids.
- **Spleen**: a small dark-red bead in the mesentery near the junction of stomach and intestine.
- **Colours**: dorsal skin mottled olive/brown, ventral skin cream; liver dark maroon; lungs pinkish
  translucent; intestine pale tan; kidneys deep red; fat bodies saturated orange; heart red.

### Positions must respect the reveal order
Layer 0 = skin + limbs; layer 1 = muscle wall + ventral abdominal vein (in the wall's midline);
layer 2 = all viscera (liver over stomach/intestine, heart anterior, lungs dorsolateral); layer 3
= kidneys + dorsal aorta + spine on the dorsal wall. The liver must physically sit OVER the stomach
so lifting it reveals the stomach, exactly as in a real dissection.

Rewrite the whole \`frog.js\`, reusing anatomy.js helpers. Return with the sources you used and the
final part count.`,
  },

  {
    file: 'heart.js',
    label: 'heart — accurate',
    brief: `Rewrite \`${B}\\heart.js\` (the \`buildHeart(THREE)\` function) to genuine mammalian-heart
accuracy. Research REAL mammalian (sheep/human teaching) heart anatomy first.

### Keep these exact part IDs
pericardium, epicardial-fat, lv-free-wall, rv-free-wall, aorta, pulmonary-trunk, svc, lad, rca,
circumflex, septum, papillary-a, chordae-1, chordae-2, chordae-3, chordae-4, chordae-5,
mitral-leaflet, aortic-cusp-1, aortic-cusp-2, aortic-cusp-3. You MAY add: ivc, left/right atrium,
left/right auricle, pulmonary veins, tricuspid leaflets, papillary-b, moderator band, coronary
sinus, posterior interventricular branch — real structures that improve accuracy — but keep every
ID above.

### Accuracy targets
- **External form**: a real heart is a blunt cone — broad base (superior, where the great vessels
  emerge) tapering to the apex (inferior-left). The LEFT ventricle wall is markedly THICKER and
  firmer than the right; the RV wraps around the front-right. Get the base-to-apex orientation and
  the LV/RV asymmetry right rather than a symmetric lump.
- **Great vessels at the base, correctly arranged**: the AORTA arching centrally with the brachio-
  cephalic trunks, the PULMONARY TRUNK anterior to it and spiralling, the SVC and IVC entering the
  right atrium, pulmonary veins entering the left atrium. The two auricles (left, right) are the
  ear-like flaps over the atria.
- **Coronary tree on the surface, in the grooves**: LAD in the anterior interventricular groove,
  the RCA in the right atrioventricular groove running to the crux, the circumflex in the left AV
  groove, and the posterior interventricular branch at the back — these define coronary dominance.
- **Internal (revealed when the LV opens)**: the interventricular SEPTUM (thick, muscular, complete);
  the MITRAL (bicuspid) valve with its leaflets held by CHORDAE TENDINEAE in discrete groups running
  to the PAPILLARY MUSCLES; the AORTIC valve's three semilunar CUSPS at the aortic root; ideally the
  tricuspid leaflets and a moderator band in the RV.
- **Colours**: myocardium deep brownish-red, thicker/darker on the LV; epicardial fat pale yellow in
  the grooves; coronary arteries brighter red; endocardium and valve leaflets pale cream; great
  vessels — aorta pale elastic buff, pulmonary/venous vessels duskier.

### Layering respects the reveal order
Layer 0 = pericardium + epicardial fat; layer 1 = myocardium (lv/rv walls, kept visible as the
specimen surface) + great vessels + coronary tree; layer 2 = internal septum, valves, chordae,
papillary muscles, cusps (revealed when the LV is opened).

Rewrite the whole \`heart.js\`, reusing anatomy.js helpers. Return the sources you used and the
final part count.`,
  },
]

const results = await parallel(JOBS.map((j) => () =>
  agent(
    `${SHARED}

## Your file
${j.brief}

Write the file with the Write tool. Then RE-READ it and confirm: it parses; it references anatomy.js
helpers rather than redefining them; every required part ID is present; decorative detail is CHILD
meshes only; every part sets userData.partId and layer>0 starts hidden. Return a precise summary
with your sources.`,
    { label: j.label, phase: 'Anatomy', effort: 'high', schema: {
      type: 'object',
      required: ['file', 'partCount', 'partIds', 'sources', 'summary', 'contractPreserved'],
      properties: {
        file: { type: 'string' },
        partCount: { type: 'integer' },
        partIds: { type: 'array', items: { type: 'string' } },
        sources: { type: 'array', items: { type: 'string' } },
        contractPreserved: { type: 'boolean' },
        summary: { type: 'string' },
      },
    } }
  )
))

const ok = results.filter(Boolean)
log(`${ok.length}/${JOBS.length} specimens rebuilt`)
return {
  built: ok.map((r) => ({ file: r.file, parts: r.partCount, preserved: r.contractPreserved, sources: r.sources, summary: String(r.summary).slice(0, 400) })),
  failed: JOBS.length - ok.length,
}
