/*
 * histology.js — the microscope. Organ -> tissue -> cell, without leaving the bench.
 *
 * The whole module rests on one decision: EVERYTHING IS DRAWN IN MICROMETRES.
 * The canvas transform is set so one user unit is one µm of real tissue, and the
 * objective simply changes how many µm fit across the field. A hepatocyte is 22 µm
 * at every power; it is not "scaled up" at 400x, there is just less field around it.
 * That is why the scale bar can be trusted, why a student can measure a glomerulus
 * and get ~200 µm, and why low power automatically shows architecture while high
 * power automatically shows cells. Fake it with a zoom factor and every dimension
 * in the slide becomes a lie a professor will catch in one glance.
 *
 * Field of view follows the real optics: FOV diameter = field number / objective
 * magnification. With the usual FN20 eyepiece that is 5.0 mm at 4x (total 40x),
 * 2.0 mm at 10x (100x) and 0.5 mm at 40x (400x). Those three numbers drive
 * everything else in the file.
 *
 * Stain is H&E and is treated as a real stain, not a colour scheme: haematoxylin
 * is basic and binds acidic things (DNA, RNA, ribosome-rich cytoplasm) -> blue /
 * purple; eosin is acidic and binds basic things (most cytoplasmic protein,
 * collagen, keratin) -> pink. Anything drawn blue in here has to have a reason to
 * be basophilic. Fat and glycogen dissolve in processing and come out WHITE.
 *
 * Slides are seeded per (partId, power) so the same specimen always yields the
 * same field — a student who points at "that cell" must be able to find it again
 * tomorrow. Regenerating rather than rescaling is a hard requirement: each power
 * runs a different branch of its generator.
 *
 * Two canvases: `slide` (redrawn only on open / power / resize — it is expensive)
 * and `hud` (full-viewport, redrawn on hover — it is cheap). Never redraw the
 * slide on pointermove; a 5 mm field of liver is ~9000 primitives.
 */

/* ---- stain palette ---------------------------------------------------------
 * Authored as sRGB integers so HIS_css can jitter them per cell. Every real H&E
 * section is unevenly stained; a flat fill reads as a diagram, not a slide. */
const HIS_PAL = {
  glass:    0xf7f1f4,   // empty slide / lumen / airspace — mounting medium, faintly warm
  eos:      0xe6a3b3,   // ordinary eosinophilic cytoplasm
  eosDeep:  0xd0697f,   // strongly eosinophilic: muscle, parietal cells, keratin
  eosPale:  0xf2ccd7,   // collagen, matrix, oedema fluid
  eosWash:  0xefbcc8,   // background wash
  hem:      0x5b3f86,   // ordinary nucleus
  hemDense: 0x35205c,   // condensed chromatin, lymphocyte, pyknotic nucleus
  hemPale:  0x8f77b2,   // vesicular (open, active) nucleus
  baso:     0x9d8fc4,   // basophilic cytoplasm: chief cells, plasma cells, RER-rich
  rbc:      0xd8503c,   // erythrocyte — eosin at its most intense
  rbcDeep:  0xb03828,
  keratin:  0xefc9a6,   // anucleate keratin — orange-pink, refractile
  bile:     0xc2ab48,
  pigment:  0x2f241c,   // melanin / melanomacrophage / anthracotic pigment
  cartilage:0xc2aed6,   // hyaline matrix is BASOPHILIC — sulfated GAGs bind haematoxylin
  cartTerr: 0xa38dc0,   // territorial matrix, more basophilic still
  bone:     0xe0a292,   // decalcified bone matrix — deeply eosinophilic
  elastic:  0xcf7f8f,   // elastic lamellae — refractile, slightly darker than collagen
  muscleSm: 0xdc94a0,   // smooth muscle
  ink:      0x3a2b45,
};

/* Objective turret. `fov` is the field diameter in µm — the single number that
 * makes the whole module honest. `spread` is how far apart marks may sit before
 * the hover test stops treating them as the same structure. */
const HIS_POWERS = [
  { total: 40,  obj: '4×',  fov: 5000, name: 'Scanning',  reads: 'architecture — landmarks, layers, whole units' },
  { total: 100, obj: '10×', fov: 2000, name: 'Low power', reads: 'tissue organisation — how the units are built' },
  { total: 400, obj: '40×', fov: 500,  name: 'High dry',  reads: 'cells — cytoplasm, nuclei, nucleoli' },
];
const HIS_BARS = [2000, 1000, 500, 200, 100, 50, 20, 10, 5];

/* ---- the teaching content --------------------------------------------------
 * key -> [name, one-line definition]. Every mark a generator makes resolves
 * through here, so the vocabulary is written once and can be audited in one
 * place. These sentences are what the student actually takes away; they are
 * meant to be true as written, not approximately true. */
const HIS_DEF = {
  /* general */
  'erythrocyte':        ['Erythrocyte', 'Red cell — anucleate biconcave disc, 7.5 µm; stains intensely with eosin and is the ruler you measure everything else against.'],
  'erythrocyte-nuc':    ['Erythrocyte (nucleated)', 'Amphibian red cell — a large oval nucleated disc ~22 × 15 µm; only mammals discard the nucleus.'],
  'capillary':          ['Capillary', 'A single endothelial cell rolled into a tube, 5–10 µm wide — just wide enough for a red cell to pass in single file.'],
  'lymphocyte':         ['Lymphocyte', 'Small round cell, ~7 µm, almost all nucleus — dense dark chromatin with a barely visible rim of cytoplasm.'],
  'fibroblast':         ['Fibroblast', 'The cell that makes and maintains collagen; spindle-shaped with a pale elongated nucleus when active.'],
  'fibrocyte':          ['Fibrocyte', 'A quiescent fibroblast — the nucleus is thin, dark and flattened between the collagen bundles it once made.'],
  'dense-irregular':    ['Dense irregular connective tissue', 'Collagen bundles running in every direction at once, so the tissue resists pull from any angle — dermis, capsules, submucosa.'],
  'dense-regular':      ['Dense regular connective tissue', 'All bundles parallel to one axis — maximum strength in one direction only. Tendon and ligament.'],
  'collagen-bundle':    ['Collagen bundle', 'Type I collagen in wavy eosinophilic bundles; the waviness (crimp) is real slack that lets the tissue stretch before the fibres take load.'],
  'elastic-fibre':      ['Elastic fibre', 'Thin, refractile, branching fibre that recoils after stretch; in H&E it is only faintly distinguishable from collagen.'],
  'basement-membrane':  ['Basement membrane', 'The thin extracellular sheet every epithelium sits on — it defines the boundary a carcinoma must cross to become invasive.'],
  'lamina-propria':     ['Lamina propria', 'Loose connective tissue immediately beneath a mucosal epithelium, carrying its capillaries, lymphatics and immune cells.'],
  'submucosa':          ['Submucosa', 'Denser connective tissue beneath the muscularis mucosae, carrying the larger vessels and the submucosal (Meissner) nerve plexus.'],
  'muscularis-mucosae': ['Muscularis mucosae', 'A thin smooth-muscle sheet that moves the mucosa itself; it marks the outer limit of the mucosa.'],
  'circular-muscle':    ['Inner circular muscle', 'Smooth muscle running around the tube — its contraction narrows the lumen and drives the peristaltic wave.'],
  'longitudinal-muscle':['Outer longitudinal muscle', 'Smooth muscle running along the tube — its contraction shortens the segment ahead of the bolus.'],
  'myenteric-plexus':   ['Myenteric (Auerbach) plexus', 'Ganglion cells between the two muscle layers; they generate peristalsis without any input from the brain.'],
  'serosa':             ['Serosa', 'Thin connective tissue plus a single squamous mesothelial layer — the slippery outer coat of an intraperitoneal organ.'],
  'artefact-fold':      ['Section fold (artefact)', 'The 5 µm ribbon wrinkled on the water bath; a doubled thickness stains darker. Processing, not pathology.'],
  'knife-chatter':      ['Knife chatter (artefact)', 'Regular parallel ripples from microtome vibration — recognise it so it is never reported as a real structure.'],
  'shrinkage-artefact': ['Shrinkage artefact', 'Cells pulled away from their matrix during dehydration, leaving a clear halo — expected, not a lesion.'],

  /* epidermis / skin */
  'stratum-corneum':    ['Stratum corneum', 'Dead anucleate keratin-filled squames in a basket-weave; the actual barrier between the animal and the world.'],
  'stratum-granulosum': ['Stratum granulosum', 'Two or three flattened layers packed with deeply basophilic keratohyalin granules — the last living layer.'],
  'stratum-spinosum':   ['Stratum spinosum', 'Polygonal keratinocytes joined by desmosomes; the "spines" are the shrunken intercellular bridges left after processing.'],
  'stratum-basale':     ['Stratum basale', 'A single palisade of cuboidal-to-columnar stem cells on the basement membrane — every keratinocyte above it started here.'],
  'melanocyte':         ['Melanocyte', 'Pigment cell in the basal layer; it looks clear in H&E because its melanin is exported into the keratinocytes around it.'],
  'melanophore':        ['Melanophore', 'Amphibian dermal pigment cell — a black stellate cell that redistributes melanin to change the animal\'s colour.'],
  'dermal-papilla':     ['Dermal papilla', 'An upward finger of dermis interlocking with the epidermal rete ridges; the interlock resists shearing.'],
  'papillary-dermis':   ['Papillary dermis', 'Loose collagen just beneath the epidermis, carrying the capillary loops that feed an avascular epithelium.'],
  'mucous-gland':       ['Mucous gland', 'Amphibian alveolar gland with a pale, foamy secretion — keeps the skin wet, which is what makes cutaneous gas exchange possible.'],
  'granular-gland':     ['Granular (poison) gland', 'Larger amphibian gland filled with coarse eosinophilic granules of defensive peptides, wrapped in myoepithelium.'],
  'myoepithelium':      ['Myoepithelial cell', 'Contractile basket cell around a gland acinus — it squeezes secretion out of the acinus into the duct.'],
  'stratum-compactum':  ['Stratum compactum', 'Dense horizontal collagen lamellae in the deep amphibian dermis, giving the skin its tensile strength.'],
  'keratinocyte':       ['Keratinocyte', 'The working cell of the epidermis; it climbs from the basal layer to the surface and dies there, full of keratin.'],

  /* gut */
  'villus':             ['Villus', 'A finger of mucosa projecting into the lumen — the first of three multipliers that take gut surface area to ~200 m² in a human.'],
  'mucosal-fold':       ['Mucosal fold', 'A low longitudinal ridge of mucosa; amphibians enlarge gut surface with folds rather than true mammalian villi.'],
  'brush-border':       ['Brush border (striated border)', 'A hairline of packed microvilli on the apical enterocyte surface — the third area multiplier, and where the digestive enzymes live.'],
  'goblet-cell':        ['Goblet cell', 'A unicellular mucous gland — mucin fills the apex into a goblet shape and crushes the nucleus to the base.'],
  'enterocyte':         ['Enterocyte', 'The absorptive cell: tall columnar, basal oval nucleus, brush border on top.'],
  'crypt':              ['Crypt of Lieberkühn', 'A simple tubular gland at the base of the mucosa — the stem-cell compartment that renews the whole epithelium every few days.'],
  'paneth-cell':        ['Paneth cell', 'Cell at the crypt base with large intensely eosinophilic apical granules of antimicrobial defensins.'],
  'lacteal':            ['Lacteal', 'The blind-ended lymphatic in the core of a villus; absorbed fat leaves by this route, not by the capillaries.'],

  /* stomach */
  'surface-mucous':     ['Surface mucous cell', 'Tall columnar cell with a pale mucin-filled apex; its alkaline mucus is the only thing between the stomach and its own acid. Note: no goblet cells here.'],
  'gastric-pit':        ['Gastric pit (foveola)', 'An infolding of the surface epithelium; the gastric glands empty into its base.'],
  'gastric-gland':      ['Gastric gland', 'A straight tubular gland in the mucosa, with parietal cells above and chief cells below.'],
  'parietal-cell':      ['Parietal (oxyntic) cell', 'Large round intensely eosinophilic cell with a central nucleus — packed with mitochondria; it secretes HCl and intrinsic factor.'],
  'chief-cell':         ['Chief (zymogenic) cell', 'Basophilic cell at the gland base — its blue cytoplasm is rough ER making pepsinogen.'],

  /* liver */
  'central-vein':       ['Central vein', 'The terminal hepatic venule at the hub of the lobule; every sinusoid drains into it, so blood flows portal triad -> centre.'],
  'hepatic-cord':       ['Hepatocyte cord (plate)', 'Hepatocytes stacked one or two cells thick, radiating from the central vein like spokes.'],
  'sinusoid':           ['Sinusoid', 'A wide, leaky capillary between the cords; its fenestrated endothelium lets plasma bathe the hepatocytes directly.'],
  'hepatocyte':         ['Hepatocyte', 'Polygonal cell, ~20–25 µm, with a round central nucleus and a prominent nucleolus — the busiest cell in the body.'],
  'binucleate':         ['Binucleate hepatocyte', 'Two nuclei in one cell — normal in liver, and a sign of its extraordinary regenerative capacity.'],
  'kupffer-cell':       ['Kupffer cell', 'The resident macrophage, sitting inside the sinusoid lumen and clearing gut-derived bacteria from portal blood.'],
  'portal-triad':       ['Portal triad', 'Bile duct, hepatic artery branch and portal vein branch travelling together at the corner of the lobule.'],
  'bile-duct':          ['Bile duct', 'Simple cuboidal epithelium with distinct, evenly spaced round nuclei — bile leaves the liver against the direction of blood flow.'],
  'portal-vein':        ['Portal venule', 'The largest, thinnest-walled profile in the triad; it brings nutrient-rich blood straight from the gut.'],
  'hepatic-artery':     ['Hepatic arteriole', 'Small, round, thick muscular wall — supplies the oxygenated fraction of hepatic blood.'],
  'melanomacrophage':   ['Melanomacrophage centre', 'Cluster of pigment-laden macrophages, abundant in amphibian liver and spleen — a cold-blooded animal\'s substitute for germinal centres.'],
  'nucleolus':          ['Nucleolus', 'The dark round body where ribosomal RNA is transcribed; prominence tracks how hard the cell is synthesising protein.'],
  'bile-canaliculus':   ['Bile canaliculus', 'A groove sealed between two adjacent hepatocytes — a lumen with no wall of its own.'],

  /* cardiac / skeletal / smooth muscle */
  'cardiac-fibre':      ['Cardiac muscle fibre', 'A branching, anastomosing chain of cells ~15 µm across — branching is the single most reliable way to tell cardiac from skeletal.'],
  'intercalated-disc':  ['Intercalated disc', 'The dark step-shaped junction between two cardiac cells — desmosomes hold them together, gap junctions let the impulse pass.'],
  'central-nucleus':    ['Central nucleus', 'One (occasionally two) oval nucleus in the middle of the fibre — cardiac. Skeletal muscle puts its many nuclei at the edge.'],
  'perinuclear-halo':   ['Perinuclear halo', 'A clear zone around the cardiac nucleus where glycogen sat before processing dissolved it.'],
  'striation':          ['Cross-striations', 'Alternating A and I bands with a ~2.5 µm sarcomere period — the register of the contractile machinery itself.'],
  'endomysium':         ['Endomysium', 'Delicate connective tissue around a single fibre, carrying its capillary.'],
  'perimysium':         ['Perimysium', 'Connective tissue wrapping a fascicle — the plane the larger vessels and nerves travel in.'],
  'fascicle':           ['Fascicle', 'A bundle of muscle fibres; fascicle size is what gives a meat its visible grain.'],
  'cardiac-cross':      ['Cardiac muscle, cross-section', 'Rounded profiles of very unequal diameter (fibres branch), a few with a central nucleus, endomysial capillaries between.'],
  'skeletal-fibre':     ['Skeletal muscle fibre', 'A single cell up to 100 µm wide and centimetres long, formed by myoblast fusion — hence many nuclei.'],
  'peripheral-nucleus': ['Peripheral nucleus', 'Nuclei flattened against the sarcolemma at the edge of the fibre — the diagnostic feature of skeletal muscle.'],
  'satellite-cell':     ['Satellite cell', 'A muscle stem cell hugging the fibre inside its basal lamina; it repairs and rebuilds damaged fibres.'],
  'smooth-long':        ['Smooth muscle, longitudinal', 'Fusiform cells with a single central cigar-shaped nucleus and no striations at all.'],
  'smooth-cross':       ['Smooth muscle, cross-section', 'Round profiles of unequal size — only the ones cut through the middle show a nucleus, because the cell tapers at both ends.'],
  'cigar-nucleus':      ['Cigar-shaped nucleus', 'Blunt-ended elongated nucleus; when the cell contracts it corkscrews into a characteristic spiral.'],

  /* adipose */
  'adipocyte':          ['Adipocyte', 'A cell that is almost entirely one lipid droplet; the fat dissolves in xylene, so H&E shows an empty ring.'],
  'adipocyte-rim':      ['Cytoplasmic rim', 'The thin eosinophilic band left when the droplet is removed — all the working cytoplasm the cell has.'],
  'signet-ring':        ['Signet-ring nucleus', 'Nucleus flattened and shoved to the edge by the droplet — the shape that names the cell.'],
  'adipose-septum':     ['Fibrous septum', 'Collagen dividing fat into lobules and carrying the vessels; fat is highly vascular, not inert.'],

  /* lung */
  'alveolus':           ['Alveolus', 'A 200–300 µm air pocket; the barrier between its air and the blood is under 1 µm thick.'],
  'alveolar-septum':    ['Alveolar septum', 'The shared wall between two alveoli — two epithelial layers with a capillary bed sandwiched between.'],
  'type-i':             ['Type I pneumocyte', 'Extremely flattened cell covering ~95% of the alveolar surface; only the bulge of its nucleus is visible.'],
  'type-ii':            ['Type II pneumocyte', 'Rounded, vacuolated cell in the alveolar corner; it makes surfactant and is the stem cell of the alveolus.'],
  'alveolar-macrophage':['Alveolar macrophage (dust cell)', 'A free macrophage in the airspace, often carrying dark inhaled particles.'],
  'pore-of-kohn':       ['Pore of Kohn', 'A hole in the septum allowing collateral ventilation between adjacent alveoli.'],
  'bronchiole':         ['Bronchiole', 'Conducting airway under 1 mm with no cartilage and no glands, but a complete ring of smooth muscle.'],
  'resp-epithelium':    ['Respiratory epithelium', 'Pseudostratified ciliated columnar with goblet cells — every nucleus sits on the basement membrane even though the layer looks stratified.'],
  'faveolus':           ['Faveolus', 'The gas-exchange chamber of an amphibian lung — a shallow pocket in the sac wall, far larger and simpler than a mammalian alveolus.'],
  'faveolar-septum':    ['Faveolar septum (trabecula)', 'A ridge of the sac wall carrying smooth muscle and a dense capillary net, dividing the lumen into faveoli.'],
  'lung-lumen':         ['Central lumen', 'The frog lung is one large sac, not a branching tree — air fills the middle and exchange happens at the wall.'],

  /* kidney */
  'glomerulus':         ['Glomerulus', 'A tuft of fenestrated capillaries, ~200 µm across, where plasma is filtered under pressure.'],
  'bowman-space':       ['Bowman\'s space', 'The clear gap that receives the filtrate; it is continuous with the lumen of the proximal tubule.'],
  'bowman-capsule':     ['Bowman\'s capsule (parietal layer)', 'A thin outer shell of simple squamous epithelium enclosing the corpuscle.'],
  'podocyte':           ['Podocyte', 'Visceral epithelial cell wrapping the capillaries with interdigitating foot processes — the final, selective filtration barrier.'],
  'macula-densa':       ['Macula densa', 'A crowded patch of tall narrow cells where the distal tubule touches its own glomerulus; it senses filtrate NaCl and adjusts filtration.'],
  'pct':                ['Proximal convoluted tubule', 'Deeply eosinophilic cuboidal cells with a brush border that fills the lumen; fewer nuclei per profile. Reabsorbs the bulk of the filtrate.'],
  'dct':                ['Distal convoluted tubule', 'Paler, smaller cells, no brush border, a wide clear lumen and more nuclei per profile — the hormone-controlled fine tuning.'],
  'collecting-duct':    ['Collecting duct', 'Pale cuboidal-to-columnar cells with strikingly distinct lateral borders; ADH acts here to concentrate urine.'],
  'renal-capsule':      ['Renal capsule', 'Dense fibrous coat over the cortex.'],
  'interlobular-artery':['Interlobular artery', 'A cortical artery running towards the capsule and giving off afferent arterioles.'],
  'nephrostome':        ['Nephrostome', 'A ciliated peritoneal funnel opening from the coelom into an amphibian kidney tubule — a feature no mammalian kidney has.'],
  'mesonephric-tubule': ['Mesonephric tubule', 'The functional tubule of an amphibian (mesonephric) kidney; often ciliated, and not organised into cortex and medulla.'],

  /* serosa / cartilage / bone */
  'mesothelium':        ['Mesothelium', 'A single layer of extremely flattened cells, ~1 µm thick over most of its extent — visible as little more than a line with occasional nuclear bulges.'],
  'mesothelial-nucleus':['Mesothelial nucleus', 'A flattened nucleus bulging slightly into the coelom; it is the only part of the cell thick enough to see.'],
  'subserous':          ['Subserous connective tissue', 'Thin loose layer binding the mesothelium to the organ, carrying its vessels and often a little fat.'],
  'chondrocyte':        ['Chondrocyte', 'The cartilage cell, sitting alone or in a small nest inside a lacuna it has hollowed out of its own matrix.'],
  'lacuna':             ['Lacuna', 'The space in the matrix occupied by a chondrocyte (or, in bone, an osteocyte).'],
  'isogenous-group':    ['Isogenous group', 'Two to four chondrocytes in one lacuna — daughters of a single division that could not move apart through solid matrix.'],
  'territorial-matrix': ['Territorial matrix', 'The intensely basophilic rim around a nest — freshly made, sulfate-rich, so it binds more haematoxylin.'],
  'interterritorial':   ['Interterritorial matrix', 'Older, paler matrix between the nests; hyaline matrix is glassy because its collagen II fibrils match its ground substance refractive index.'],
  'perichondrium':      ['Perichondrium', 'Dense fibrous outer layer with a chondrogenic inner layer — cartilage is avascular, so everything it needs diffuses in from here.'],
  'osteon':             ['Osteon (Haversian system)', 'A cylinder of concentric lamellae around a central canal; the unit of compact bone.'],
  'haversian-canal':    ['Haversian canal', 'The central channel carrying the vessel and nerve that keep the osteon alive.'],
  'lamella':            ['Concentric lamella', 'A layer of bone matrix with its collagen laid in one direction, alternating with the next — plywood, in bone.'],
  'canaliculus':        ['Canaliculus', 'A hair-fine channel connecting lacunae; osteocyte processes meet through them, because nothing diffuses through mineralised matrix.'],
  'interstitial-lamella':['Interstitial lamella', 'Fragments of older osteons left behind by remodelling — bone is continuously rebuilt.'],
  'volkmann-canal':     ['Volkmann\'s canal', 'A transverse canal linking Haversian canals to the periosteal surface.'],
  'periosteum':         ['Periosteum', 'Fibrous sheath with an inner osteogenic layer; strip it and the bone beneath it dies.'],
  'osteocyte':          ['Osteocyte', 'A retired osteoblast walled into its own matrix; it senses strain and directs remodelling.'],
  'marrow':             ['Marrow cavity', 'Haemopoietic and fatty tissue inside the shaft.'],

  /* vessels / valve / spleen / urothelium */
  'tunica-intima':      ['Tunica intima', 'Endothelium plus a trace of subendothelial connective tissue — one cell thick where it matters.'],
  'iel':                ['Internal elastic lamina', 'A wavy, refractile elastic sheet at the inner edge of the media — the single most reliable way to identify a muscular artery.'],
  'tunica-media':       ['Tunica media', 'Concentric smooth muscle (and elastin); its thickness relative to the lumen is what distinguishes artery from vein at a glance.'],
  'eel':                ['External elastic lamina', 'The outer elastic boundary of the media, usually fainter than the internal lamina.'],
  'tunica-adventitia':  ['Tunica adventitia', 'Outer collagenous coat carrying vasa vasorum and nerves; in a vein it is the thickest layer of the wall.'],
  'endothelium':        ['Endothelium', 'The single squamous layer lining every vessel and heart chamber — thromboresistant until it is damaged.'],
  'elastic-lamella':    ['Fenestrated elastic lamella', 'A concentric window-perforated elastic sheet; the aorta stacks dozens of them so it can store systolic energy and release it in diastole.'],
  'vasa-vasorum':       ['Vasa vasorum', 'Small vessels supplying the outer wall of a large vessel — too thick to feed itself by diffusion from its own lumen.'],
  'vessel-lumen':       ['Lumen', 'The space blood travels in; a collapsed, folded outline suggests a vein, a round patent one an artery.'],
  'fibrosa':            ['Fibrosa', 'Dense collagen on the outflow side of a valve leaflet — the load-bearing layer that takes the closing pressure.'],
  'spongiosa':          ['Spongiosa', 'Loose GAG-rich middle layer that acts as a shock absorber and lets the layers shear over one another.'],
  'ventricularis':      ['Ventricularis (atrialis)', 'Elastin-rich inflow layer that recoils the leaflet back to shape after each beat.'],
  'valve-endothelium':  ['Valve endothelium', 'The continuous endothelial sheet covering both faces of the leaflet; the valve is avascular, so this surface is also its supply line.'],
  'valve-interstitial': ['Valve interstitial cell', 'Fibroblast-like resident cell that maintains the leaflet matrix; valves are avascular and depend on them entirely.'],
  'chorda':             ['Chorda tendinea', 'A cord of dense parallel collagen, endothelium-covered, tethering the leaflet so it cannot invert.'],
  'white-pulp':         ['White pulp', 'Lymphoid sheath around a central arteriole — basophilic because it is packed with lymphocyte nuclei.'],
  'red-pulp':           ['Red pulp', 'Cords and sinusoids stuffed with red cells; worn-out erythrocytes are culled here.'],
  'central-arteriole':  ['Central arteriole', 'The arteriole the white pulp is built around; finding it identifies the white pulp with certainty.'],
  'germinal-centre':    ['Germinal centre', 'Pale zone of proliferating B cells inside a follicle — an antibody response caught in the act.'],
  'splenic-cord':       ['Splenic cord (of Billroth)', 'The macrophage-rich tissue between the sinusoids; red cells must squeeze from cord into sinusoid, and the stiff ones do not make it.'],
  'splenic-sinusoid':   ['Splenic sinusoid', 'A vessel with deliberately gapped endothelium; a red cell too stiff to squeeze through is eaten instead.'],
  'trabecula':          ['Trabecula', 'A fibromuscular strut running in from the capsule, carrying the trabecular vessels.'],
  'capsule':            ['Capsule', 'The dense fibrous coat of the organ.'],
  'umbrella-cell':      ['Umbrella (dome) cell', 'Large, often binucleate superficial urothelial cell with a thickened luminal membrane that makes the bladder waterproof.'],
  'intermediate-cell':  ['Intermediate cell', 'Pear-shaped urothelial cell; the layer slides over itself as the bladder fills, so the epithelium looks thinner when distended.'],
  'basal-cell':         ['Basal cell', 'Small cuboidal stem cell on the basement membrane of the urothelium.'],
  'urothelium':         ['Urothelium (transitional epithelium)', 'Stratified epithelium unique to the urinary tract — it changes apparent thickness with distension and resists urine.'],
  'detrusor':           ['Detrusor muscle', 'Interlacing bundles of smooth muscle in three ill-defined layers that empty the bladder.'],
};

/* Which slide a part yields. Explicit ids win; anything unmatched falls through
 * to HIS_slideFor's pattern + tissue-class inference, so new parts still open. */
const HIS_MAP = {
  'skin': 'epidermis', 'oesophagus': 'squamous-mucosa',
  'muscle-wall': 'skeletal', 'vertebral-column': 'bone',
  'small-intestine': 'intestine', 'large-intestine': 'intestine',
  'stomach': 'gastric', 'cloaca': 'urothelium', 'urinary-bladder': 'urothelium',
  'gall-bladder': 'gallbladder', 'spleen': 'spleen',
  'frog-heart': 'cardiac', 'dorsal-aorta': 'artery', 'ventral-abdominal-vein': 'vein',
  'pericardium': 'fibrous', 'epicardial-fat': 'adipose',
  // Free walls are myocardium. Without these two the pattern list falls through
  // to 'fibrous', which would put dense collagen where the heart muscle is.
  'lv-free-wall': 'cardiac', 'rv-free-wall': 'cardiac',
  'aorta': 'elastic-artery', 'pulmonary-trunk': 'elastic-artery',
  'svc': 'vein', 'ivc': 'vein', 'pulmonary-veins': 'vein', 'coronary-sinus': 'vein',
  'mitral-leaflet': 'valve', 'tricuspid-leaflet': 'valve',
  'moderator-band': 'cardiac', 'septum': 'cardiac',
  'papillary-a': 'cardiac', 'papillary-b': 'cardiac',
};
/* Fallback by part-id pattern, tried in order. */
const HIS_PATTERNS = [
  [/liver/, 'liver'], [/lung/, 'lung'], [/kidney/, 'kidney'],
  [/fat-body|adipos|fat/, 'adipose'], [/chordae/, 'chorda'], [/cusp|leaflet|valve/, 'valve'],
  [/ventricle|atrium|auricle|myocard|papillar|heart|septum/, 'cardiac'],
  [/aorta|arter|trunk/, 'artery'], [/vein|vena|cava|sinus/, 'vein'],
  [/intestine|duoden|ileum|jejun/, 'intestine'], [/stomach|gastr/, 'gastric'],
  [/bladder|cloaca|ureter/, 'urothelium'], [/limb|muscle/, 'skeletal'],
  [/cartilage|column|vertebr|bone/, 'bone'], [/spleen/, 'spleen'],
  [/pericard|capsule|mesenter/, 'fibrous'], [/skin|integ/, 'epidermis'],
];
/* Last resort: the anatomy.js tissue class the part already carries. */
const HIS_BY_TISSUE = {
  parenchyma: 'liver', muscle: 'cardiac', hollow: 'intestine', serous: 'mesothelium',
  valve: 'valve', fat: 'adipose', vessel: 'artery', skin: 'epidermis',
};
/* Frog part ids — amphibian histology genuinely differs (nucleated red cells,
 * faveolar lung, mesonephric kidney, glandular dermis) and pretending otherwise
 * is the kind of shortcut this app exists to avoid. */
const HIS_FROG_RE = /^(skin|muscle-wall|ventral-abdominal-vein|liver-|gall-bladder|frog-heart|lung-|stomach|oesophagus|small-intestine|large-intestine|cloaca|urinary-bladder|spleen|fat-body|kidney-|dorsal-aorta|vertebral-column|forelimb|hindlimb)/;

/* ---- deterministic randomness ---------------------------------------------
 * Seeded per (partId, power). A student pointing at "that binucleate hepatocyte
 * near the central vein" must find it there again next week, so nothing in a
 * slide may come from Math.random. */
function HIS_hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function HIS_rand(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---- colour ----------------------------------------------------------------
 * Every fill gets a small per-cell jitter. Real sections are unevenly stained and
 * a flat fill is the single loudest tell that something was drawn rather than
 * cut, mounted and photographed. */
function HIS_css(hex, k, alpha) {
  const r = Math.max(0, Math.min(255, Math.round(((hex >> 16) & 255) * (k || 1))));
  const g = Math.max(0, Math.min(255, Math.round(((hex >> 8) & 255) * (k || 1))));
  const b = Math.max(0, Math.min(255, Math.round((hex & 255) * (k || 1))));
  return alpha == null ? 'rgb(' + r + ',' + g + ',' + b + ')'
                       : 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
function HIS_vary(hex, rng, amt, alpha) {
  return HIS_css(hex, 1 + (rng() - 0.5) * (amt == null ? 0.14 : amt), alpha);
}
function HIS_mixHex(a, b, t) {
  const m = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}

/* ---- geometry helpers (all coordinates in µm) ------------------------------ */
/* A closed, gently irregular blob. `wob` is fractional radius wobble. Cells are
 * never circles; a field of perfect circles reads as bubbles. */
function HIS_blob(ctx, x, y, rx, ry, sides, wob, rng, rot) {
  ctx.beginPath();
  const n = sides || 9, a0 = rot || 0;
  for (let i = 0; i <= n; i++) {
    const a = a0 + (i / n) * Math.PI * 2;
    const k = 1 + (rng() - 0.5) * (wob == null ? 0.18 : wob);
    const px = x + Math.cos(a) * rx * k, py = y + Math.sin(a) * ry * k;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
/* Band between two boundary functions of x, sampled across the whole field. Used
 * for every layered structure (skin, gut wall, vessel wall, valve). */
function HIS_band(g, topFn, botFn, fill) {
  const ctx = g.ctx, h = g.h * 1.06, s = g.h / 70;
  ctx.beginPath();
  for (let x = -h; x <= h; x += s) ctx.lineTo(x, topFn(x));
  for (let x = h; x >= -h; x -= s) ctx.lineTo(x, botFn(x));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
/* Deterministic multi-octave undulation — the boundary between two tissue layers
 * is never a straight line and never a clean sine. */
function HIS_wave(a, f, p) {
  return function (x) { return a * (Math.sin(x * f + p) * 0.64 + Math.sin(x * f * 2.41 + p * 1.7) * 0.36); };
}
function HIS_at(fn, y) { return function (x) { return y + fn(x); }; }

/* Walk a polyline at fixed spacing, handing back position and outward normal.
 * This is how every epithelium in the file is laid onto its basement membrane —
 * cells stand perpendicular to the surface they sit on, which is what makes a
 * villus look like a villus rather than a bumpy stripe. */
function HIS_walk(pts, spacing, sign, cb) {
  let carry = 0, idx = 0;
  for (let k = 1; k < pts.length; k++) {
    const ax = pts[k - 1][0], ay = pts[k - 1][1];
    const dx = pts[k][0] - ax, dy = pts[k][1] - ay;
    const L = Math.hypot(dx, dy);
    if (L < 1e-6) continue;
    const ux = dx / L, uy = dy / L;
    let s = carry;
    while (s < L) {
      cb(ax + ux * s, ay + uy * s, -uy * sign, ux * sign, idx++, ux, uy);
      s += spacing;
    }
    carry = s - L;
  }
  return idx;
}
function HIS_path(ctx, pts, close) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}

/* ---- the nucleus -----------------------------------------------------------
 * The most-drawn object in the file, so it decides how the whole slide reads.
 * Detail is gated on APPARENT size, not on power: below about one device pixel a
 * nucleus is physically unresolvable and must be a speck, which is exactly what
 * a 4x objective shows. Drawing crisp nuclear membranes at scanning power is the
 * classic giveaway of a fake histology image. */
function HIS_nucleus(g, x, y, rx, ry, ang, o) {
  const ctx = g.ctx, opt = o || {};
  const px = rx * g.upx;                                  // apparent radius, device px
  const tone = opt.tone == null ? HIS_PAL.hem : opt.tone;
  if (px < 0.9) {                                          // unresolvable: a grain of chromatin
    const w = Math.max(g.px, rx * 1.7);
    ctx.fillStyle = HIS_css(tone, 1, 0.85);
    ctx.fillRect(x - w / 2, y - w / 2, w, w);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  if (ang) ctx.rotate(ang);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  if (px > 5) {
    // Chromatin is denser against the nuclear membrane; a flat disc looks printed.
    const gr = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
    if (opt.vesicular) { gr.addColorStop(0, HIS_css(HIS_PAL.hemPale, 1.06)); gr.addColorStop(1, HIS_css(tone, 0.96)); }
    else { gr.addColorStop(0, HIS_css(tone, 1.1)); gr.addColorStop(0.68, HIS_css(tone, 0.98)); gr.addColorStop(1, HIS_css(HIS_PAL.hemDense, 1)); }
    ctx.fillStyle = gr;
  } else ctx.fillStyle = HIS_css(tone, 1, 0.94);
  ctx.fill();
  if (px > 8) {
    const rng = opt.rng || g.rng;
    // chromatin clumps
    for (let i = 0; i < 5; i++) {
      const a = rng() * 6.283, r = Math.sqrt(rng()) * 0.72;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * rx * r, Math.sin(a) * ry * r, rx * 0.15, ry * 0.13, a, 0, 6.283);
      ctx.fillStyle = HIS_css(HIS_PAL.hemDense, 1, 0.5);
      ctx.fill();
    }
    if (opt.nucleolus !== false) {                         // rRNA factory: dark, round, offset
      ctx.beginPath();
      ctx.ellipse(rx * 0.16, -ry * 0.12, rx * 0.24, ry * 0.24, 0, 0, 6.283);
      ctx.fillStyle = HIS_css(HIS_PAL.hemDense, 0.85);
      ctx.fill();
    }
    ctx.beginPath();                                       // nuclear envelope
    ctx.ellipse(0, 0, rx, ry, 0, 0, 6.283);
    ctx.lineWidth = g.px * 0.9;
    ctx.strokeStyle = HIS_css(HIS_PAL.hemDense, 1, 0.55);
    ctx.stroke();
  }
  ctx.restore();
}

/* ---- erythrocyte -----------------------------------------------------------
 * The internal ruler. Mammalian: 7.5 µm anucleate biconcave, so its centre is
 * pale. Amphibian: a big nucleated ellipse, ~22 x 15 µm — three times the area,
 * which is why frog capillaries are visibly wider than mammalian ones. */
function HIS_rbc(g, x, y, ang, rng) {
  const ctx = g.ctx;
  if (g.species === 'frog') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 7.5, 0, 0, 6.283);
    ctx.fillStyle = HIS_vary(HIS_PAL.rbc, rng || g.rng, 0.12); ctx.fill();
    HIS_nucleus(g, 0, 0, 4.2, 2.8, 0, { tone: HIS_PAL.hemDense, nucleolus: false });
    ctx.restore();
    return;
  }
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.arc(0, 0, 3.75, 0, 6.283);
  if (g.upx * 3.75 > 4) {
    const gr = ctx.createRadialGradient(0, 0, 0.4, 0, 0, 3.75);
    gr.addColorStop(0, HIS_css(HIS_PAL.rbc, 1.16));        // central pallor: it is a disc, not a ball
    gr.addColorStop(1, HIS_css(HIS_PAL.rbcDeep, 1));
    ctx.fillStyle = gr;
  } else ctx.fillStyle = HIS_vary(HIS_PAL.rbc, rng || g.rng, 0.12);
  ctx.fill();
  ctx.restore();
}
/* Fill an arbitrary current path region with packed red cells. */
function HIS_bloodFill(g, x, y, r, density, rng) {
  const n = Math.min(260, Math.max(2, Math.round(r * r * density)));
  for (let i = 0; i < n; i++) {
    const a = rng() * 6.283, d = Math.sqrt(rng()) * r;
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    HIS_rbc(g, px, py, rng() * 3.14, rng);
    // Red cells are the scale reference on every slide, so they must be
    // hoverable wherever blood appears — that is one mark, not one per cell.
    if (g.mark && g.upx * 4 > 3 && rng() < 0.02) {
      g.mark(px, py, g.species === 'frog' ? 11 : 4,
        g.species === 'frog' ? 'erythrocyte-nuc' : 'erythrocyte');
    }
  }
}

/* ---- wavy collagen ---------------------------------------------------------
 * Collagen bundles are never straight: the crimp is real slack, and drawing them
 * straight makes connective tissue look like hatching. */
function HIS_collagen(g, x0, y0, x1, y1, count, rng, o) {
  const ctx = g.ctx, opt = o || {};
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const span = opt.span == null ? 40 : opt.span;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const off = (rng() - 0.5) * 2 * span;
    const amp = (opt.crimp == null ? 5 : opt.crimp) * (0.5 + rng());
    const per = (opt.period == null ? 60 : opt.period) * (0.7 + rng() * 0.6);
    const ph = rng() * 6.283;
    ctx.beginPath();
    const steps = Math.max(6, Math.round(L / 12));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, d = t * L;
      const w = Math.sin(d / per * 6.283 + ph) * amp;
      const px = x0 + ux * d + nx * (off + w), py = y0 + uy * d + ny * (off + w);
      if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineWidth = Math.max(g.px * 0.8, (opt.w == null ? 3 : opt.w) * (0.6 + rng() * 0.8));
    ctx.strokeStyle = HIS_vary(opt.tone == null ? HIS_PAL.eosPale : opt.tone, rng, 0.2, 0.55 + rng() * 0.35);
    ctx.stroke();
  }
}

/* ---- background grain ------------------------------------------------------
 * Scattered nuclei of cells too small or too numerous to draw individually. At
 * scanning power this IS the tissue: what a 4x objective resolves is a texture of
 * nuclear dots, not cells. Capped so a 5 mm field cannot cost a second. */
function HIS_grain(g, x0, y0, x1, y1, perArea, rng, tone, size) {
  const area = Math.abs((x1 - x0) * (y1 - y0));
  const n = Math.min(6500, Math.round(area * perArea));
  const ctx = g.ctx, s = size == null ? 3 : size;
  for (let i = 0; i < n; i++) {
    const x = x0 + rng() * (x1 - x0), y = y0 + rng() * (y1 - y0);
    const r = s * (0.7 + rng() * 0.6);
    if (r * g.upx < 0.9) {
      const w = Math.max(g.px, r * 1.6);
      ctx.fillStyle = HIS_css(tone == null ? HIS_PAL.hem : tone, 0.9 + rng() * 0.25, 0.8);
      ctx.fillRect(x, y, w, w);
    } else {
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.6 + rng() * 0.5), rng() * 3.14, 0, 6.283);
      ctx.fillStyle = HIS_vary(tone == null ? HIS_PAL.hem : tone, rng, 0.2, 0.9);
      ctx.fill();
    }
  }
}

/* A tubular gland / tubule cut across: outer boundary, cells, lumen. Reused by
 * kidney, gastric glands, crypts and bile ducts — they differ in cell height,
 * lumen size and whether there is a brush border, not in construction. */
function HIS_tubule(g, cx, cy, rOut, rLum, o, rng) {
  const ctx = g.ctx, opt = o || {};
  const cells = Math.max(4, Math.round(Math.PI * 2 * ((rOut + rLum) / 2) / (opt.cellW || 9)));
  HIS_blob(ctx, cx, cy, rOut, rOut * (opt.squash || 1), 12, 0.1, rng);
  ctx.fillStyle = HIS_vary(opt.tone == null ? HIS_PAL.eos : opt.tone, rng, 0.12);
  ctx.fill();
  if (opt.border !== false && rOut * g.upx > 6) {
    ctx.lineWidth = g.px; ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.35); ctx.stroke();
  }
  // brush border: a dense eosinophilic fringe that all but fills a PCT lumen
  if (opt.brush && rLum > 0) {
    ctx.beginPath(); ctx.arc(cx, cy, rLum * 1.5, 0, 6.283);
    ctx.fillStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.5); ctx.fill();
  }
  if (rLum > 0) {
    HIS_blob(ctx, cx, cy, rLum, rLum * (opt.squash || 1), 10, 0.22, rng);
    ctx.fillStyle = HIS_css(HIS_PAL.glass, 1, opt.brush ? 0.72 : 1); ctx.fill();
  }
  const nr = (rOut + rLum) / 2 * (opt.nucRing == null ? 1 : opt.nucRing);
  if (opt.noNuc) return cells;                     // low power: nuclei come from a grain pass instead
  // Cells around a real tubule are NOT evenly spaced, and not every profile cuts
  // a nucleus. Evenly stepping the angle produced a ring of identical dots — the
  // "daisy" look that instantly reads as a diagram. Jitter angle, radius and
  // size, and skip roughly one in six.
  const nR = opt.nucR || 3.2;
  for (let i = 0; i < cells; i++) {
    if (rng() < 0.16) continue;
    const a = (i / cells) * 6.283 + (rng() - 0.5) * (6.283 / cells) * 0.85;
    const rr = nr * (1 + (rng() - 0.5) * 0.18);
    const k = 0.78 + rng() * 0.44;
    HIS_nucleus(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr,
      nR * k, nR * k * (opt.nucFlat || 0.92) * (0.85 + rng() * 0.3), a + 1.5708 + (rng() - 0.5) * 0.5,
      { tone: opt.nucTone, vesicular: opt.vesicular, rng: rng });
  }
  return cells;
}

/* Annulus with independently irregular inner and outer boundaries. Hollow organs
 * are TUBES, and at scanning power the honest view of a tube is a ring — that is
 * the image in every atlas, and a flat stripe would misrepresent the geometry. */
function HIS_annulus(g, cx, cy, rIn, rOut, fill, wIn, wOut) {
  const ctx = g.ctx, N = 220;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = i / N * 6.283, r = rOut + (wOut ? wOut(a * 57.3) : 0);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  for (let i = N; i >= 0; i--) {
    const a = i / N * 6.283, r = rIn + (wIn ? wIn(a * 57.3) : 0);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
/* Points around a circle, for walking an epithelium onto a luminal surface. */
function HIS_ring(cx, cy, r, n, wob) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = i / n * 6.283, rr = r + (wob ? wob(a * 57.3) : 0);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

/* ============================ EPIDERMIS / SKIN =============================
 * Two genuinely different animals. Mammalian skin is a thick keratinised
 * stratified squamous epithelium over a collagenous dermis. Amphibian skin is
 * thin — three or four cell layers — because it has to let oxygen through, and
 * its dermis is crowded with mucous glands (which keep it wet enough for that to
 * work) and granular poison glands. Drawing a frog with human skin would be the
 * exact failure this module exists to avoid. */
function HIS_drawEpidermis(g) {
  const ctx = g.ctx, rng = g.rng, frog = g.species === 'frog' && !g.opt.mucosa;
  const muc = !!g.opt.mucosa;                       // oesophagus: non-keratinised
  const top = g.power === 400 ? -70 : g.power === 100 ? -300 : -1100;
  g.shift(0, -top - g.h);
  const bend = g.power === 40 ? function (x) { return x * x / 26000; } : function () { return 0; };
  const rete = HIS_wave(frog ? 5 : (muc ? 30 : 22), frog ? 0.05 : 0.028, 1.2);

  // thickness of each stratum, µm — amphibian epidermis is ~1/4 of mammalian
  const cor = frog ? 4 : (muc ? 0 : 18);
  const gran = frog ? 0 : (muc ? 0 : 9);
  const spin = frog ? 14 : (muc ? 150 : 30);
  const bas = frog ? 8 : 10;
  const epiBot = cor + gran + spin + bas;
  const surf = function (x) { return bend(x) + rete(x) * 0.25; };
  const junction = function (x) { return bend(x) + epiBot + rete(x); };

  ctx.fillStyle = HIS_css(HIS_PAL.glass, 1);        // everything above the surface is mountant
  ctx.fillRect(-g.h * 1.1, top - 10, g.h * 2.2, 4000);

  /* --- dermis / lamina propria --------------------------------------------- */
  const deepTone = muc ? HIS_PAL.eosPale : HIS_PAL.eosPale;
  HIS_band(g, junction, function () { return frog ? 330 : (muc ? 420 : 900); }, HIS_css(deepTone, 1));
  HIS_collagen(g, -g.h, junction(0) + 60, g.h, junction(0) + 60,
    g.power === 400 ? 90 : 260, rng, { span: frog ? 120 : 300, w: 3.4, crimp: 7, tone: HIS_PAL.eosPale });
  g.mark(0, junction(0) + 50, 60, muc ? 'lamina-propria' : 'papillary-dermis');

  if (frog) {
    // stratum compactum: horizontal collagen lamellae, unmistakably layered
    HIS_band(g, HIS_at(HIS_wave(6, 0.01, 0.4), 330), function () { return 440; }, HIS_css(HIS_PAL.eosPale, 0.94));
    for (let y = 334; y < 438; y += 7) {
      ctx.beginPath();
      for (let x = -g.h; x <= g.h; x += 24) ctx.lineTo(x, y + Math.sin(x * 0.012 + y) * 2.2);
      ctx.lineWidth = g.px * 1.1; ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.28); ctx.stroke();
    }
    g.mark(-g.h * 0.5, 385, 50, 'stratum-compactum');
    // glands, alternating mucous and granular, sitting in the spongy dermis
    const step = 360;
    for (let x = -g.h - 120; x < g.h + 120; x += step) {
      const gx = x + rng() * 90, granular = ((Math.round(x / step) % 2) + 2) % 2 === 0;
      const gy = 150 + rng() * 45, R = granular ? 82 : 58;
      if (gy - R > 330) continue;
      HIS_blob(ctx, gx, gy, R, R * 0.92, 14, 0.12, rng);
      ctx.fillStyle = HIS_css(granular ? HIS_PAL.eosDeep : HIS_PAL.eosPale, granular ? 1 : 1.03, granular ? 0.85 : 1);
      ctx.fill();
      ctx.lineWidth = g.px; ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.35); ctx.stroke();
      if (granular) {                                   // coarse secretory granules
        for (let i = 0; i < (g.power === 40 ? 40 : 150); i++) {
          const a = rng() * 6.283, d = Math.sqrt(rng()) * R * 0.9;
          ctx.beginPath(); ctx.arc(gx + Math.cos(a) * d, gy + Math.sin(a) * d, 2.6 + rng() * 2.2, 0, 6.283);
          ctx.fillStyle = HIS_vary(HIS_PAL.eosDeep, rng, 0.2, 0.8); ctx.fill();
        }
      } else {                                          // pale foamy mucus, flat basal nuclei
        HIS_blob(ctx, gx, gy, R * 0.72, R * 0.66, 12, 0.16, rng);
        ctx.fillStyle = HIS_css(HIS_PAL.glass, 1, 0.85); ctx.fill();
      }
      const nCells = Math.round(6.283 * R / 12);
      for (let i = 0; i < nCells; i++) {
        const a = i / nCells * 6.283;
        HIS_nucleus(g, gx + Math.cos(a) * R * 0.9, gy + Math.sin(a) * R * 0.9, 3, 1.9, a + 1.57, { rng: rng });
      }
      g.mark(gx, gy, R * 0.8, granular ? 'granular-gland' : 'mucous-gland');
      if (g.power !== 40) g.mark(gx + R * 0.9, gy, 8, 'myoepithelium');
    }
    // melanophores: black stellate cells under the epidermis
    for (let i = 0; i < 26; i++) {
      const mx = (rng() - 0.5) * g.h * 2, my = junction(mx) + 6 + rng() * 26;
      ctx.save(); ctx.translate(mx, my);
      for (let k = 0; k < 6; k++) {
        const a = rng() * 6.283, L = 6 + rng() * 14;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L);
        ctx.lineWidth = Math.max(g.px, 1.6); ctx.strokeStyle = HIS_css(HIS_PAL.pigment, 1, 0.85); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, 6.283); ctx.fillStyle = HIS_css(HIS_PAL.pigment, 1); ctx.fill();
      ctx.restore();
      if (i % 7 === 0) g.mark(mx, my, 12, 'melanophore');
    }
  }

  /* --- the epithelium itself ----------------------------------------------- */
  HIS_band(g, HIS_at(surf, cor + gran), junction, HIS_css(HIS_PAL.eos, 1.02));   // spinosum + basale bed
  // basal palisade: one row of nuclei standing on the basement membrane
  const jpts = [];
  for (let x = -g.h * 1.05; x <= g.h * 1.05; x += 8) jpts.push([x, junction(x)]);
  HIS_walk(jpts, frog ? 8 : 9, 1, function (x, y, nx, ny, i) {
    HIS_nucleus(g, x - nx * (bas * 0.55), y - ny * (bas * 0.55), 3.1, 4.2,
      Math.atan2(ny, nx) + 1.5708, { rng: rng, vesicular: true });
    if (i % 40 === 5 && !frog) {                        // clear-cell melanocyte among them
      ctx.beginPath(); ctx.arc(x - nx * bas * 0.5, y - ny * bas * 0.5, 5.4, 0, 6.283);
      ctx.fillStyle = HIS_css(HIS_PAL.glass, 1, 0.75); ctx.fill();
      HIS_nucleus(g, x - nx * bas * 0.5, y - ny * bas * 0.5, 2.4, 2.4, 0, { tone: HIS_PAL.hemDense, rng: rng });
      g.mark(x - nx * bas * 0.5, y - ny * bas * 0.5, 8, 'melanocyte');
    }
  });
  g.mark(-g.h * 0.2, junction(-g.h * 0.2) - bas * 0.5, 10, 'stratum-basale');
  g.mark(g.h * 0.1, junction(g.h * 0.1), 6, 'basement-membrane');
  if (!frog && !muc) g.mark(g.h * 0.45, junction(g.h * 0.45) + 18, 26, 'dermal-papilla');

  // spinous layer: polygonal keratinocytes, progressively flattened towards the top
  const rows = frog ? 2 : (muc ? 9 : 5);
  for (let r = 0; r < rows; r++) {
    const t = (r + 0.5) / rows;
    for (let x = -g.h * 1.05; x < g.h * 1.05; x += frog ? 11 : 13) {
      const yy = cor + gran + spin * (1 - t) + surf(x) + spin * 0.0;
      const cy = surf(x) + cor + gran + spin * t;
      const w = (frog ? 5 : 6) * (1 + t * 0.5), hh = (frog ? 4 : 5.4) * (1 - t * 0.45);
      HIS_nucleus(g, x + rng() * 6, cy, w * 0.55, hh * 0.75, 0, { rng: rng, vesicular: !muc });
    }
  }
  g.mark(0, surf(0) + cor + gran + spin * 0.5, 14, muc ? 'urothelium' : 'stratum-spinosum');
  if (!muc) g.mark(g.h * 0.3, surf(g.h * 0.3) + cor + gran + spin * 0.45, 10, 'keratinocyte');

  if (gran) {                                          // keratohyalin: intensely basophilic
    HIS_band(g, HIS_at(surf, cor), HIS_at(surf, cor + gran), HIS_css(HIS_PAL.baso, 0.92));
    for (let x = -g.h; x < g.h; x += 6) {
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(x + rng() * 5, surf(x) + cor + rng() * gran, 0.9 + rng() * 1.1, 0, 6.283);
        ctx.fillStyle = HIS_css(HIS_PAL.hemDense, 1, 0.85); ctx.fill();
      }
    }
    g.mark(-g.h * 0.4, surf(-g.h * 0.4) + cor + gran * 0.5, 8, 'stratum-granulosum');
  }
  if (cor) {                                           // anucleate keratin, basket-weave
    HIS_band(g, surf, HIS_at(surf, cor), HIS_css(HIS_PAL.keratin, 1));
    for (let y = 1; y < cor; y += frog ? 2 : 3.4) {
      ctx.beginPath();
      for (let x = -g.h; x <= g.h; x += 14) ctx.lineTo(x, surf(x) + y + Math.sin(x * 0.05 + y) * 1.1);
      ctx.lineWidth = g.px; ctx.strokeStyle = HIS_css(HIS_PAL.keratin, 0.82, 0.7); ctx.stroke();
    }
    g.mark(g.h * 0.55, surf(g.h * 0.55) + cor * 0.5, 10, 'stratum-corneum');
  }
  if (muc) {                                           // surface cells keep pyknotic nuclei
    for (let x = -g.h; x < g.h; x += 14) HIS_nucleus(g, x, surf(x) + 6, 3.2, 1.5, 0, { tone: HIS_PAL.hemDense, rng: rng });
  }
}

/* ============================== SMALL INTESTINE ============================
 * Surface area is the whole story: plicae (folds) x villi x microvilli. The
 * amphibian gut gets there with folds and a very tall brush border but has no
 * true villi and no crypts of Lieberkühn, so the frog slide is drawn with folds
 * and is labelled as such. */
function HIS_drawIntestine(g) {
  const ctx = g.ctx, rng = g.rng, frog = g.species === 'frog';
  const villusH = frog ? 240 : 520, villusW = frog ? 150 : 130;

  if (g.power === 40) {
    /* Scanning power: the tube in cross-section — the classic orientation view. */
    const R = 1500, cx = 0, cy = 0;
    const wob = HIS_wave(45, 0.9, 0.7);
    HIS_annulus(g, cx, cy, R + 320, R + 336, HIS_css(HIS_PAL.eosPale, 0.95));            // serosa
    g.mark(0, -(R + 328), 40, 'serosa');
    HIS_annulus(g, cx, cy, R + 210, R + 320, HIS_css(HIS_PAL.muscleSm, 0.96));           // longitudinal
    g.mark(R * 0.7, R * 0.72, 60, 'longitudinal-muscle');
    HIS_annulus(g, cx, cy, R + 60, R + 210, HIS_css(HIS_PAL.muscleSm, 1.02));            // circular
    g.mark(-R * 0.75, R * 0.7, 70, 'circular-muscle');
    HIS_annulus(g, cx, cy, R + 20, R + 60, HIS_css(HIS_PAL.eosPale, 1.02));              // submucosa
    g.mark(0, R + 40, 30, 'submucosa');
    HIS_annulus(g, cx, cy, R + 12, R + 20, HIS_css(HIS_PAL.muscleSm, 0.9));              // muscularis mucosae
    g.mark(R + 16, 0, 16, 'muscularis-mucosae');
    HIS_annulus(g, cx, cy, R - (frog ? 40 : 200), R + 12, HIS_css(HIS_PAL.eos, 1.04), wob);  // mucosa
    // nuclear texture of the whole wall, then the projecting folds/villi
    HIS_grain(g, -R - 340, -R - 340, R + 340, R + 340, 0.00016, rng, HIS_PAL.hem, 3);
    const nV = frog ? 26 : 40;
    for (let i = 0; i < nV; i++) {
      const a = i / nV * 6.283 + rng() * 0.04, r0 = R + wob(a * 57.3);
      const h = villusH * (0.75 + rng() * 0.5), w = villusW * (0.8 + rng() * 0.4);
      const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
      const bx = cx + ux * r0, by = cy + uy * r0;
      const tipx = bx - ux * h, tipy = by - uy * h;
      ctx.beginPath();
      ctx.moveTo(bx + nx * w / 2, by + ny * w / 2);
      ctx.quadraticCurveTo(tipx + nx * w * 0.55, tipy + ny * w * 0.55, tipx, tipy);
      ctx.quadraticCurveTo(tipx - nx * w * 0.55, tipy - ny * w * 0.55, bx - nx * w / 2, by - ny * w / 2);
      ctx.closePath();
      ctx.fillStyle = HIS_css(HIS_PAL.eos, 1.05); ctx.fill();
      ctx.lineWidth = g.px * 1.6; ctx.strokeStyle = HIS_css(HIS_PAL.hem, 1, 0.55); ctx.stroke();
      if (i === 3) g.mark(tipx, tipy, w, frog ? 'mucosal-fold' : 'villus');
    }
    ctx.beginPath(); ctx.arc(cx, cy, R - (frog ? 45 : 205), 0, 6.283);
    ctx.fillStyle = HIS_css(HIS_PAL.glass, 1); ctx.fill();
    if (!frog) { g.mark(-R * 0.2, R - 120, 50, 'crypt'); }
    return;
  }

  /* 100x and 400x: a flat block of wall, lumen at the top. */
  const top = g.power === 400 ? -villusH - 60 : -villusH - 260;
  g.shift(0, -top - g.h);
  ctx.fillStyle = HIS_css(HIS_PAL.glass, 1);
  ctx.fillRect(-g.h * 1.1, top - 20, g.h * 2.2, 6000);

  const cryptTop = 0, cryptBot = frog ? 40 : 230;
  const mmTop = cryptBot + 10, mmBot = mmTop + 22;
  HIS_band(g, function () { return 0; }, function () { return mmTop; }, HIS_css(HIS_PAL.eos, 1.03));
  HIS_band(g, function () { return mmTop; }, function () { return mmBot; }, HIS_css(HIS_PAL.muscleSm, 0.95));
  HIS_band(g, function () { return mmBot; }, function () { return mmBot + 300; }, HIS_css(HIS_PAL.eosPale, 1.02));
  HIS_band(g, function () { return mmBot + 300; }, function () { return mmBot + 640; }, HIS_css(HIS_PAL.muscleSm, 1.0));
  g.mark(0, mmTop + 11, 12, 'muscularis-mucosae');
  g.mark(-g.h * 0.5, mmBot + 150, 70, 'submucosa');
  g.mark(g.h * 0.4, mmBot + 460, 80, 'circular-muscle');
  // outer longitudinal coat, and between the two coats the myenteric plexus —
  // the ganglia that generate peristalsis with no input from the brain at all
  HIS_band(g, function () { return mmBot + 640; }, function () { return mmBot + 900; }, HIS_css(HIS_PAL.muscleSm, 0.95));
  g.mark(-g.h * 0.3, mmBot + 770, 70, 'longitudinal-muscle');
  for (let px = -g.h; px < g.h; px += 700) {
    const gx = px + rng() * 200, gy = mmBot + 640;
    HIS_blob(ctx, gx, gy, 46, 26, 11, 0.18, rng);
    ctx.fillStyle = HIS_css(HIS_PAL.eosPale, 1.03); ctx.fill();
    for (let k = 0; k < 5; k++) {                       // ganglion cells: big, pale, big nucleolus
      const nx2 = gx + (rng() - 0.5) * 60, ny2 = gy + (rng() - 0.5) * 30;
      ctx.beginPath(); ctx.arc(nx2, ny2, 9, 0, 6.283);
      ctx.fillStyle = HIS_vary(HIS_PAL.baso, rng, 0.12, 0.85); ctx.fill();
      HIS_nucleus(g, nx2, ny2, 4, 4, 0, { rng: rng, vesicular: true });
    }
    if (Math.abs(gx) < 700) g.mark(gx, gy, 44, 'myenteric-plexus');
  }
  HIS_collagen(g, -g.h, mmBot + 150, g.h, mmBot + 150, 70, rng, { span: 120, tone: HIS_PAL.eosPale });
  HIS_grain(g, -g.h, 0, g.h, mmBot + 640, 0.00035, rng, HIS_PAL.hem, 3);

  // crypts (mammal only — the frog mucosa has none, and inventing them would be a lie)
  if (!frog) {
    for (let x = -g.h - 60; x < g.h + 60; x += 78) {
      const cx2 = x + rng() * 20;
      HIS_band(g, function () { return cryptTop; }, function () { return cryptBot; }, HIS_css(HIS_PAL.eos, 1.03));
      ctx.beginPath();
      ctx.moveTo(cx2 - 16, cryptTop); ctx.lineTo(cx2 - 12, cryptBot - 14);
      ctx.quadraticCurveTo(cx2, cryptBot, cx2 + 12, cryptBot - 14); ctx.lineTo(cx2 + 16, cryptTop);
      ctx.closePath(); ctx.fillStyle = HIS_css(HIS_PAL.glass, 1, 0.92); ctx.fill();
      for (let y = cryptTop + 8; y < cryptBot - 6; y += 11) {
        HIS_nucleus(g, cx2 - 21, y, 3, 4, 0, { rng: rng }); HIS_nucleus(g, cx2 + 21, y, 3, 4, 0, { rng: rng });
      }
      if (Math.abs(cx2) < 90) {
        g.mark(cx2, cryptBot - 60, 26, 'crypt');
        ctx.beginPath(); ctx.arc(cx2 - 14, cryptBot - 8, 6, 0, 6.283);
        ctx.fillStyle = HIS_css(HIS_PAL.eosDeep, 1); ctx.fill();
        g.mark(cx2 - 14, cryptBot - 8, 8, 'paneth-cell');
      }
    }
  }

  // villi / folds
  const pitch = villusW * 1.9;
  for (let x = -g.h - pitch; x < g.h + pitch; x += pitch) {
    const bx = x + rng() * 30, h = villusH * (0.85 + rng() * 0.3), w = villusW * (0.85 + rng() * 0.3);
    const out = [];
    const steps = 26;
    for (let i = 0; i <= steps; i++) {                 // one side up, round the tip, other side down
      const t = i / steps, ang = Math.PI * t;
      out.push([bx - Math.cos(ang) * w / 2 * (1 - 0.12 * Math.sin(ang)), -Math.sin(ang) * h]);
    }
    const core = out.slice();
    HIS_path(ctx, [[bx - w / 2, 0]].concat(core, [[bx + w / 2, 0]]), true);
    ctx.fillStyle = HIS_css(HIS_PAL.eosPale, 1.02); ctx.fill();
    // lamina propria core: lymphocytes and the central lacteal
    HIS_grain(g, bx - w / 2, -h, bx + w / 2, 0, 0.0016, rng, HIS_PAL.hemDense, 3.2);
    ctx.beginPath(); ctx.ellipse(bx, -h * 0.45, w * 0.13, h * 0.3, 0, 0, 6.283);
    ctx.fillStyle = HIS_css(HIS_PAL.glass, 1, 0.85); ctx.fill();
    if (Math.abs(bx) < pitch) {
      g.mark(bx, -h * 0.45, w * 0.14, 'lacteal');
      g.mark(bx, -h * 0.72, w * 0.2, 'lamina-propria');
      g.mark(bx, -h * 0.95, w * 0.4, frog ? 'mucosal-fold' : 'villus');
      g.mark(bx + w * 0.2, -h * 0.2, 6, 'lymphocyte');
    }
    // the epithelium, standing perpendicular to the surface all the way round
    const cellH = frog ? 30 : 26, cellW = 8;
    HIS_walk([[bx - w / 2, 0]].concat(core, [[bx + w / 2, 0]]), cellW, -1,
      function (px, py, nx, ny, i) {
        const goblet = (i % (frog ? 5 : 7)) === 3;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + nx * cellH, py + ny * cellH);
        ctx.lineWidth = cellW * 1.05;
        ctx.strokeStyle = goblet ? HIS_css(HIS_PAL.glass, 1, 0.95) : HIS_vary(HIS_PAL.eos, rng, 0.1);
        ctx.stroke();
        if (goblet) {                                  // mucin cup at the apex, nucleus crushed to the base
          ctx.beginPath();
          ctx.ellipse(px + nx * cellH * 0.72, py + ny * cellH * 0.72, cellW * 0.62, cellH * 0.3,
            Math.atan2(ny, nx) + 1.5708, 0, 6.283);
          ctx.fillStyle = HIS_css(HIS_PAL.glass, 1); ctx.fill();
          ctx.lineWidth = g.px; ctx.strokeStyle = HIS_css(HIS_PAL.baso, 1, 0.5); ctx.stroke();
          HIS_nucleus(g, px + nx * cellH * 0.18, py + ny * cellH * 0.18, 2.6, 3.4,
            Math.atan2(ny, nx), { tone: HIS_PAL.hemDense, rng: rng });
          if (i % 21 === 3 && Math.abs(px) < g.h * 0.55) g.mark(px + nx * cellH * 0.6, py + ny * cellH * 0.6, 7, 'goblet-cell');
        } else {
          HIS_nucleus(g, px + nx * cellH * 0.28, py + ny * cellH * 0.28, 2.8, 4.2,
            Math.atan2(ny, nx), { rng: rng, vesicular: true });
          if (i % 24 === 8 && Math.abs(px) < g.h * 0.5) g.mark(px + nx * cellH * 0.5, py + ny * cellH * 0.5, 6, 'enterocyte');
        }
        // brush border: a hairline of microvilli, only resolvable at high dry
        ctx.beginPath();
        ctx.moveTo(px + nx * cellH, py + ny * cellH);
        ctx.lineTo(px + nx * (cellH + 2.4), py + ny * (cellH + 2.4));
        ctx.lineWidth = cellW * 1.05; ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.8); ctx.stroke();
      });
    if (Math.abs(bx) < pitch && g.power === 400) g.mark(bx, -h - 28, 10, 'brush-border');
  }
}

/* ================================= STOMACH =================================
 * The examinable contrast with intestine: NO goblet cells and NO villi. Instead
 * a uniform sheet of surface mucous cells dipping into gastric pits, and beneath
 * them straight tubular glands with intensely eosinophilic parietal cells in the
 * upper half and basophilic chief cells at the base. */
function HIS_drawGastric(g) {
  const ctx = g.ctx, rng = g.rng;
  const pitD = 180, glandBot = 700;
  const top = g.power === 400 ? -40 : g.power === 100 ? -120 : -300;
  g.shift(0, -top - g.h);
  ctx.fillStyle = HIS_css(HIS_PAL.glass, 1);
  ctx.fillRect(-g.h * 1.1, top - 20, g.h * 2.2, 6000);

  HIS_band(g, HIS_at(HIS_wave(8, 0.02, 0.6), 0), function () { return glandBot; }, HIS_css(HIS_PAL.eos, 1.03));
  HIS_band(g, function () { return glandBot; }, function () { return glandBot + 26; }, HIS_css(HIS_PAL.muscleSm, 0.94));
  HIS_band(g, function () { return glandBot + 26; }, function () { return glandBot + 320; }, HIS_css(HIS_PAL.eosPale, 1.02));
  HIS_band(g, function () { return glandBot + 320; }, function () { return glandBot + 900; }, HIS_css(HIS_PAL.muscleSm, 1.0));
  g.mark(g.h * 0.6, glandBot + 13, 12, 'muscularis-mucosae');
  g.mark(-g.h * 0.4, glandBot + 170, 70, 'submucosa');
  g.mark(0, glandBot + 560, 90, 'circular-muscle');
  HIS_grain(g, -g.h, 0, g.h, glandBot + 900, 0.0003, rng, HIS_PAL.hem, 3);

  const pitch = 120;
  for (let x = -g.h - pitch; x < g.h + pitch; x += pitch) {
    const cx = x + rng() * 14;
    // gastric pit: a funnel of surface epithelium
    ctx.beginPath();
    ctx.moveTo(cx - 26, 0); ctx.lineTo(cx - 11, pitD); ctx.lineTo(cx + 11, pitD); ctx.lineTo(cx + 26, 0);
    ctx.closePath(); ctx.fillStyle = HIS_css(HIS_PAL.glass, 1, 0.9); ctx.fill();
    if (Math.abs(cx) < pitch) g.mark(cx, pitD * 0.5, 16, 'gastric-pit');
    // surface + pit lining: tall columnar, pale mucous apex, basal nucleus
    for (const side of [-1, 1]) {
      for (let t = 0; t <= 1.001; t += 0.14) {
        const px = cx + side * (26 - 15 * t), py = pitD * t;
        HIS_nucleus(g, px + side * 12, py + 6, 2.7, 4, 0, { rng: rng });
        ctx.beginPath(); ctx.ellipse(px + side * 4, py + 4, 4, 6, 0, 0, 6.283);
        ctx.fillStyle = HIS_css(HIS_PAL.glass, 1, 0.65); ctx.fill();
      }
    }
    if (Math.abs(cx) < pitch) g.mark(cx + 22, 14, 8, 'surface-mucous');
    // the gland below: parietal cells above, chief cells at the base
    const gTop = pitD, gBot = glandBot - 20;
    ctx.beginPath();
    ctx.moveTo(cx - 12, gTop); ctx.lineTo(cx - 5, gBot); ctx.lineTo(cx + 5, gBot); ctx.lineTo(cx + 12, gTop);
    ctx.closePath(); ctx.fillStyle = HIS_css(HIS_PAL.glass, 1, 0.5); ctx.fill();
    for (let y = gTop + 10; y < gBot; y += 16) {
      const deep = (y - gTop) / (gBot - gTop);
      for (const side of [-1, 1]) {
        const px = cx + side * (26 - 8 * deep) + rng() * 4;
        if (deep < 0.55 && rng() < 0.55) {              // parietal: big, round, fried-egg eosinophilia
          ctx.beginPath(); ctx.arc(px, y, 8.5, 0, 6.283);
          ctx.fillStyle = HIS_vary(HIS_PAL.eosDeep, rng, 0.12); ctx.fill();
          HIS_nucleus(g, px, y, 3.1, 3.1, 0, { rng: rng, vesicular: true });
          if (Math.abs(cx) < pitch && Math.abs(deep - 0.3) < 0.06) g.mark(px, y, 10, 'parietal-cell');
        } else {                                        // chief: basophilic (rough ER making pepsinogen)
          ctx.beginPath(); ctx.ellipse(px, y, 6.5, 7, 0, 0, 6.283);
          ctx.fillStyle = HIS_vary(HIS_PAL.baso, rng, 0.14, 0.9); ctx.fill();
          HIS_nucleus(g, px, y + 3.5, 2.8, 2.8, 0, { rng: rng });
          if (Math.abs(cx) < pitch && deep > 0.82) g.mark(px, y, 9, 'chief-cell');
        }
      }
    }
    if (Math.abs(cx) < pitch) g.mark(cx, (gTop + gBot) / 2, 20, 'gastric-gland');
  }
}

/* ================================== LIVER ==================================
 * The classical lobule: hepatocyte plates radiating from a central vein like
 * spokes, sinusoids in the gaps, portal triads at the hexagon corners. Blood
 * runs triad -> centre; bile runs centre -> triad, in canaliculi between the
 * cells. At 4x you cannot resolve a hepatocyte (22 µm is ~3 px) so the slide is
 * drawn as radial cord texture — which is exactly what a 4x objective shows. */
function HIS_drawLiver(g) {
  const ctx = g.ctx, rng = g.rng, frog = g.species === 'frog';
  const lobR = 700;                                    // lobule radius, ~1.4 mm across

  ctx.fillStyle = HIS_css(HIS_PAL.eos, 1.02);
  ctx.fillRect(-g.h * 1.1, -g.h * 1.1, g.h * 2.2, g.h * 2.2);

  function portalTriad(px, py, scale) {
    const s = scale || 1;
    HIS_blob(ctx, px, py, 62 * s, 54 * s, 11, 0.16, rng);
    ctx.fillStyle = HIS_css(HIS_PAL.eosPale, 1.02); ctx.fill();
    HIS_collagen(g, px - 50 * s, py, px + 50 * s, py, 14, rng, { span: 34 * s, w: 2.4, tone: HIS_PAL.eosPale });
    // portal vein: biggest, thinnest-walled
    HIS_blob(ctx, px - 14 * s, py + 10 * s, 30 * s, 22 * s, 10, 0.2, rng);
    ctx.fillStyle = HIS_css(HIS_PAL.glass, 1); ctx.fill();
    ctx.lineWidth = g.px; ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.4); ctx.stroke();
    if (g.power !== 40) HIS_bloodFill(g, px - 14 * s, py + 10 * s, 20 * s, 0.02, rng);
    // hepatic arteriole: small, round, thick muscular wall
    ctx.beginPath(); ctx.arc(px + 22 * s, py + 16 * s, 11 * s, 0, 6.283);
    ctx.fillStyle = HIS_css(HIS_PAL.muscleSm, 1); ctx.fill();
    ctx.beginPath(); ctx.arc(px + 22 * s, py + 16 * s, 5 * s, 0, 6.283);
    ctx.fillStyle = HIS_css(HIS_PAL.glass, 1); ctx.fill();
    // bile duct: cuboidal epithelium, evenly spaced round nuclei
    HIS_tubule(g, px + 20 * s, py - 18 * s, 15 * s, 7 * s, { tone: HIS_PAL.eosPale, cellW: 8 * s, nucR: 2.8 * s, vesicular: true }, rng);
    g.mark(px, py, 60 * s, 'portal-triad');
    if (g.power !== 40) {
      g.mark(px + 20 * s, py - 18 * s, 15 * s, 'bile-duct');
      g.mark(px - 14 * s, py + 10 * s, 26 * s, 'portal-vein');
      g.mark(px + 22 * s, py + 16 * s, 11 * s, 'hepatic-artery');
    }
  }

  function lobule(cx, cy) {
    const cvR = g.power === 40 ? 55 : 70;
    // radial cords + sinusoids. Density is set so cords land ~22 µm apart at the
    // rim, which is one hepatocyte — the plate width the tissue actually has.
    const spokes = Math.round(6.283 * lobR / 26);
    for (let i = 0; i < spokes; i++) {
      const a = i / spokes * 6.283 + rng() * 0.02;
      const wob = rng() * 0.5;
      ctx.beginPath();
      for (let r = cvR; r <= lobR; r += 24) {
        const aa = a + Math.sin(r * 0.012 + wob) * 0.03;
        ctx.lineTo(cx + Math.cos(aa) * r, cy + Math.sin(aa) * r);
      }
      ctx.lineWidth = Math.max(g.px, 11);
      ctx.strokeStyle = HIS_vary(HIS_PAL.eos, rng, 0.16);
      ctx.stroke();
      ctx.lineWidth = Math.max(g.px, 4.5);              // the sinusoid alongside it
      ctx.strokeStyle = HIS_css(HIS_PAL.glass, 1, 0.55);
      ctx.stroke();
    }
    HIS_grain(g, cx - lobR, cy - lobR, cx + lobR, cy + lobR, 0.0011, rng, HIS_PAL.hem, 3.6);
    // central vein: a big thin-walled hole with a flat endothelial lining
    ctx.beginPath(); ctx.arc(cx, cy, cvR, 0, 6.283);
    ctx.fillStyle = HIS_css(HIS_PAL.glass, 1); ctx.fill();
    ctx.lineWidth = Math.max(g.px, 2.5); ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.45); ctx.stroke();
    const nEnd = Math.round(6.283 * cvR / 14);
    for (let i = 0; i < nEnd; i++) {
      const a = i / nEnd * 6.283;
      HIS_nucleus(g, cx + Math.cos(a) * cvR * 0.94, cy + Math.sin(a) * cvR * 0.94, 3.4, 1.6, a + 1.5708, { rng: rng });
    }
    if (g.power !== 40) HIS_bloodFill(g, cx, cy, cvR * 0.8, 0.006, rng);
    g.mark(cx, cy, cvR, 'central-vein');
    g.mark(cx + lobR * 0.5, cy, 40, 'hepatic-cord');
    g.mark(cx - lobR * 0.5, cy + 12, 20, 'sinusoid');
    for (let i = 0; i < 6; i++) {                       // triads at the hexagon corners
      const a = i / 6 * 6.283 + 0.5;
      portalTriad(cx + Math.cos(a) * lobR, cy + Math.sin(a) * lobR, g.power === 40 ? 0.9 : 1);
    }
    if (frog) {                                         // melanomacrophage centres — an amphibian hallmark
      for (let i = 0; i < 7; i++) {
        const a = rng() * 6.283, d = 120 + rng() * (lobR - 200);
        const mx = cx + Math.cos(a) * d, my = cy + Math.sin(a) * d;
        for (let k = 0; k < 26; k++) {
          ctx.beginPath();
          ctx.arc(mx + (rng() - 0.5) * 46, my + (rng() - 0.5) * 46, 2 + rng() * 4, 0, 6.283);
          ctx.fillStyle = HIS_css(HIS_PAL.pigment, 0.9 + rng() * 0.5, 0.85); ctx.fill();
        }
        if (i === 1) g.mark(mx, my, 26, 'melanomacrophage');
      }
    }
  }

  if (g.power === 40) {
    // several lobules tiled — the architecture lesson, and the only power where
    // you can see that the triads really do sit where two lobules meet.
    for (let ly = -1; ly <= 1; ly++) {
      for (let lx = -1; lx <= 1; lx++) {
        lobule(lx * lobR * 1.75 + (ly % 2 ? lobR * 0.87 : 0), ly * lobR * 1.5);
      }
    }
    return;
  }
  if (g.power === 100) { lobule(0, 0); return; }

  /* 400x: individual hepatocytes. Plates one to two cells thick with sinusoids
   * between them; polygonal cells, round central nuclei, prominent nucleoli, a
   * scatter of binucleate cells, Kupffer cells sitting IN the sinusoid lumen. */
  // Figure and ground must be the other way round: the SINUSOIDS are the pale
  // spaces and the cords are the solid pink. Painting an eosin background and
  // then eosin cells on top of it made both invisible — the architecture only
  // reads if the gaps between the plates are genuinely lighter.
  ctx.fillStyle = HIS_css(HIS_PAL.eosPale, 1.06);
  ctx.fillRect(-g.h * 1.1, -g.h * 1.1, g.h * 2.2, g.h * 2.2);
  const cvR = 90;
  ctx.beginPath(); ctx.arc(-g.h * 0.72, -g.h * 0.62, cvR, 0, 6.283);
  ctx.fillStyle = HIS_css(HIS_PAL.glass, 1); ctx.fill();
  g.mark(-g.h * 0.72, -g.h * 0.62, cvR, 'central-vein');
  const ox = -g.h * 0.72, oy = -g.h * 0.62;
  const cordW = 46;                                     // two hepatocytes wide
  for (let r = cvR; r < g.h * 3; r += cordW) {
    const n = Math.max(8, Math.round(6.283 * r / 24));
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.283;
      const cx = ox + Math.cos(a) * (r + (rng() - 0.5) * 8);
      const cy = oy + Math.sin(a) * (r + (rng() - 0.5) * 8);
      if (Math.abs(cx) > g.h * 1.1 || Math.abs(cy) > g.h * 1.1) continue;
      const inSinusoid = (i % 6) === 0;
      if (inSinusoid) continue;                          // leave the gap: that IS the sinusoid
      // Polygonal, and abutting its neighbours — hepatocytes are packed solid
      // within a plate, so the cell is drawn slightly oversized to close the
      // gaps and the border carries the definition.
      HIS_blob(ctx, cx, cy, 13.5, 13, 7, 0.16, rng, a);
      ctx.fillStyle = HIS_vary(HIS_PAL.eos, rng, 0.13); ctx.fill();
      ctx.lineWidth = Math.max(g.px, 1.1); ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.55); ctx.stroke();
      const bi = rng() < 0.11;                           // binucleate: normal, and diagnostic of liver
      if (bi) {
        HIS_nucleus(g, cx - 4.5, cy, 3.6, 3.6, 0, { rng: rng, vesicular: true });
        HIS_nucleus(g, cx + 4.5, cy, 3.6, 3.6, 0, { rng: rng, vesicular: true });
        if (rng() < 0.35) g.mark(cx, cy, 12, 'binucleate');
      } else {
        HIS_nucleus(g, cx, cy, 4.4, 4.4, 0, { rng: rng, vesicular: true });
        if (rng() < 0.06) g.mark(cx, cy, 12, 'hepatocyte');
        if (rng() < 0.03) g.mark(cx + 0.7, cy - 0.5, 2.2, 'nucleolus');
      }
      if (rng() < 0.04) g.mark(cx + 11, cy, 3, 'bile-canaliculus');
    }
    // sinusoid contents: red cells in single file plus the odd Kupffer cell
    const m = Math.max(4, Math.round(6.283 * r / 60));
    for (let i = 0; i < m; i++) {
      const a = (i + 0.5) / m * 6.283;
      const sx = ox + Math.cos(a) * (r + cordW * 0.5), sy = oy + Math.sin(a) * (r + cordW * 0.5);
      if (Math.abs(sx) > g.h || Math.abs(sy) > g.h) continue;
      if (rng() < 0.55) HIS_rbc(g, sx, sy, a, rng);
      else if (rng() < 0.3) {
        HIS_blob(ctx, sx, sy, 8, 5, 8, 0.3, rng, a);
        ctx.fillStyle = HIS_css(HIS_PAL.baso, 1, 0.75); ctx.fill();
        HIS_nucleus(g, sx, sy, 3, 2, a, { tone: HIS_PAL.hemDense, rng: rng });
        if (rng() < 0.4) g.mark(sx, sy, 9, 'kupffer-cell');
      }
      if (rng() < 0.08) g.mark(sx, sy, 10, 'sinusoid');
    }
  }
  if (frog) {
    for (let i = 0; i < 3; i++) {
      const mx = (rng() - 0.5) * g.h * 1.6, my = (rng() - 0.5) * g.h * 1.6;
      // Fine granular pigment inside a cluster of macrophages — coarse opaque
      // blobs read as ink spills, not as intracellular melanin.
      for (let k = 0; k < 90; k++) {
        const a = rng() * 6.283, d = Math.sqrt(rng()) * 34;
        ctx.beginPath(); ctx.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d, 0.7 + rng() * 1.6, 0, 6.283);
        ctx.fillStyle = HIS_css(HIS_PAL.pigment, 0.9 + rng() * 0.5, 0.55 + rng() * 0.35); ctx.fill();
      }
      g.mark(mx, my, 32, 'melanomacrophage');
    }
  }
}

/* ============================== CARDIAC MUSCLE =============================
 * Three features, and all three must be right or the slide is worthless:
 * fibres BRANCH and anastomose; each cell has ONE CENTRAL nucleus with a clear
 * perinuclear halo; and INTERCALATED DISCS cross the fibre as dark steps.
 * Cross-striations are present but fainter than in skeletal muscle. */
function HIS_drawCardiac(g) {
  const ctx = g.ctx, rng = g.rng;
  ctx.fillStyle = HIS_css(HIS_PAL.eosPale, 1.02);
  ctx.fillRect(-g.h * 1.1, -g.h * 1.1, g.h * 2.2, g.h * 2.2);

  if (g.power === 40) {
    // Myocardium is a continuous helical mass, so one section cuts it in every
    // plane at once: longitudinal here, oblique there, transverse over there.
    const cells = 7, cw = g.h * 2 / cells;
    let markedCross = 0, markedLong = 0;
    for (let iy = 0; iy < cells; iy++) {
      for (let ix = 0; ix < cells; ix++) {
        const x0 = -g.h + ix * cw, y0 = -g.h + iy * cw;
        const ang = (rng() - 0.5) * 3.14;
        const transverse = rng() < 0.3;
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, cw, cw); ctx.clip();
        ctx.fillStyle = HIS_vary(HIS_PAL.eos, rng, 0.1); ctx.fillRect(x0, y0, cw, cw);
        if (transverse) {
          for (let y = y0; y < y0 + cw; y += 19) {
            for (let x = x0; x < x0 + cw; x += 19) {
              HIS_blob(ctx, x, y, 8.5, 8.5, 6, 0.3, rng);
              ctx.fillStyle = HIS_vary(HIS_PAL.eos, rng, 0.14); ctx.fill();
              if (rng() < 0.35) HIS_nucleus(g, x, y, 3, 3, 0, { rng: rng });
            }
          }
          // mark the FIRST transverse block, whichever it turns out to be —
          // tying it to fixed grid indices meant the label vanished on most seeds
          if (!markedCross) { markedCross = 1; g.mark(x0 + cw / 2, y0 + cw / 2, cw * 0.4, 'cardiac-cross'); }
        } else {
          ctx.translate(x0 + cw / 2, y0 + cw / 2); ctx.rotate(ang);
          for (let y = -cw; y < cw; y += 17) {
            ctx.beginPath(); ctx.moveTo(-cw, y); ctx.lineTo(cw, y);
            ctx.lineWidth = 13; ctx.strokeStyle = HIS_vary(HIS_PAL.eos, rng, 0.14); ctx.stroke();
            ctx.lineWidth = 2.4; ctx.strokeStyle = HIS_css(HIS_PAL.eosPale, 1, 0.6); ctx.stroke();
            for (let x = -cw; x < cw; x += 60) if (rng() < 0.5) HIS_nucleus(g, x, y, 4.5, 2.6, 0, { rng: rng });
          }
          if (!markedLong) { markedLong = 1; g.mark(x0 + cw / 2, y0 + cw / 2, cw * 0.4, 'cardiac-fibre'); }
        }
        ctx.restore();
      }
    }
    g.mark(0, 0, 40, 'endomysium');
    return;
  }

  /* 100x / 400x: a longitudinal block. Fibres are laid as chains of cells that
   * split and rejoin — the branching is drawn explicitly, not implied. */
  const fibW = 15, pitch = fibW + (g.power === 400 ? 7 : 5);
  const detail = g.power === 400;
  for (let y = -g.h - pitch; y < g.h + pitch; y += pitch) {
    const drift = HIS_wave(pitch * 0.5, 0.0035, rng() * 6.283);
    const branchAt = -g.h + rng() * g.h * 2;
    ctx.beginPath();
    for (let x = -g.h * 1.1; x <= g.h * 1.1; x += 12) ctx.lineTo(x, y + drift(x));
    ctx.lineWidth = fibW; ctx.strokeStyle = HIS_vary(HIS_PAL.eos, rng, 0.13); ctx.stroke();
    // A branch peeling off toward the neighbouring fibre and fusing with it.
    // Stroked with a round cap and a constant width: a thick quadratic with a
    // butt cap produced hard tapering wedges that looked like cut paper.
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(branchAt, y + drift(branchAt));
    ctx.quadraticCurveTo(branchAt + 60, y + drift(branchAt) + pitch * 0.5,
      branchAt + 130, y + drift(branchAt) + pitch);
    ctx.lineWidth = fibW * 0.72; ctx.strokeStyle = HIS_vary(HIS_PAL.eos, rng, 0.1); ctx.stroke();
    ctx.restore();
    if (Math.abs(y) < pitch * 1.5) g.mark(branchAt + 65, y + drift(branchAt) + pitch * 0.35, 22, 'cardiac-fibre');

    if (detail) {                                        // cross-striations: ~2.5 µm sarcomere
      ctx.save();
      ctx.beginPath();
      for (let x = -g.h * 1.1; x <= g.h * 1.1; x += 12) ctx.lineTo(x, y + drift(x));
      ctx.lineWidth = fibW; ctx.strokeStyle = 'rgba(0,0,0,0)'; ctx.stroke();
      for (let x = -g.h * 1.1; x < g.h * 1.1; x += 2.5) {
        ctx.beginPath();
        ctx.moveTo(x, y + drift(x) - fibW / 2); ctx.lineTo(x, y + drift(x) + fibW / 2);
        ctx.lineWidth = g.px * 0.8; ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.22); ctx.stroke();
      }
      ctx.restore();
      if (Math.abs(y) < pitch) g.mark(g.h * 0.3, y + drift(g.h * 0.3), 8, 'striation');
    }
    // intercalated discs: dark transverse steps every ~110 µm (one cell length)
    for (let x = -g.h - 60 + rng() * 110; x < g.h + 60; x += 95 + rng() * 45) {
      const yy = y + drift(x);
      // A disc is a shallow STEP right across the fibre, not a lightning bolt.
      // The first version's tall zigzag sat inside the fibre and read as a
      // squiggle floating in the cytoplasm; it must span the full width and
      // hug the transverse plane.
      const st = fibW * 0.22;
      ctx.beginPath();
      ctx.moveTo(x - st * 0.5, yy - fibW / 2);
      ctx.lineTo(x - st * 0.5, yy - fibW / 6);
      ctx.lineTo(x + st * 0.5, yy - fibW / 6);
      ctx.lineTo(x + st * 0.5, yy + fibW / 6);
      ctx.lineTo(x - st * 0.5, yy + fibW / 6);
      ctx.lineTo(x - st * 0.5, yy + fibW / 2);
      ctx.lineWidth = Math.max(g.px, detail ? 1.5 : 1);
      ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 0.62, detail ? 0.9 : 0.7); ctx.stroke();
      if (rng() < (detail ? 0.14 : 0.06)) g.mark(x, yy, 9, 'intercalated-disc');
    }
    // one central nucleus per cell, in a clear glycogen halo
    for (let x = -g.h - 40 + rng() * 120; x < g.h + 40; x += 105 + rng() * 60) {
      const yy = y + drift(x);
      if (detail) {
        // A soft lens of cleared glycogen, not a hard white ring: the opaque
        // ellipse made every nucleus look like a printed eye.
        const hg = ctx.createRadialGradient(x, yy, 3, x, yy, 11);
        hg.addColorStop(0, HIS_css(HIS_PAL.glass, 1, 0.42));
        hg.addColorStop(1, HIS_css(HIS_PAL.glass, 1, 0));
        ctx.beginPath(); ctx.ellipse(x, yy, 11, 6.5, 0, 0, 6.283);
        ctx.fillStyle = hg; ctx.fill();
        if (rng() < 0.2) g.mark(x + 8, yy, 5, 'perinuclear-halo');
      }
      HIS_nucleus(g, x, yy, 5.4 * (0.85 + rng() * 0.3), 3.1 * (0.85 + rng() * 0.3),
        (rng() - 0.5) * 0.2, { rng: rng, vesicular: true });
      if (rng() < 0.16) g.mark(x, yy, 7, 'central-nucleus');
    }
    // endomysium between fibres: a capillary and a flat fibroblast nucleus
    const capX = -g.h + rng() * g.h * 2;
    if (rng() < 0.8) {
      HIS_rbc(g, capX, y + drift(capX) + pitch * 0.5, 0, rng);
      if (rng() < 0.3) g.mark(capX, y + drift(capX) + pitch * 0.5, 8, 'capillary');
    }
    HIS_nucleus(g, capX + 70, y + drift(capX) + pitch * 0.5, 4.5, 1.3, 0, { tone: HIS_PAL.hemDense, rng: rng });
  }
  g.mark(-g.h * 0.6, pitch * 0.5, 6, 'endomysium');
}

/* ============================= SKELETAL MUSCLE =============================
 * The counterpart slide. Fibres are huge (up to 100 µm), unbranched, parallel,
 * and their many nuclei are pressed against the sarcolemma at the PERIPHERY —
 * the single feature that separates it from cardiac in an exam. Striations are
 * sharper than cardiac because the sarcomeres are in tighter register. */
function HIS_drawSkeletal(g) {
  const ctx = g.ctx, rng = g.rng;
  ctx.fillStyle = HIS_css(HIS_PAL.eosPale, 1.02);
  ctx.fillRect(-g.h * 1.1, -g.h * 1.1, g.h * 2.2, g.h * 2.2);

  if (g.power === 40) {
    // fascicles: bundles wrapped in perimysium, with a neurovascular bundle in it
    const fasc = 520;
    for (let fy = -g.h - fasc; fy < g.h + fasc; fy += fasc) {
      for (let fx = -g.h - fasc; fx < g.h + fasc; fx += fasc) {
        const cx = fx + rng() * 60, cy = fy + rng() * 60;
        HIS_blob(ctx, cx, cy, fasc * 0.44, fasc * 0.4, 12, 0.16, rng);
        ctx.fillStyle = HIS_vary(HIS_PAL.eos, rng, 0.1); ctx.fill();
        ctx.lineWidth = Math.max(g.px, 6); ctx.strokeStyle = HIS_css(HIS_PAL.eosPale, 1); ctx.stroke();
        for (let y = cy - fasc * 0.4; y < cy + fasc * 0.4; y += 44) {
          for (let x = cx - fasc * 0.4; x < cx + fasc * 0.4; x += 44) {
            if (Math.hypot(x - cx, y - cy) > fasc * 0.4) continue;
            HIS_blob(ctx, x, y, 19, 19, 6, 0.22, rng);   // polygonal fibre profiles
            ctx.fillStyle = HIS_vary(HIS_PAL.eos, rng, 0.16); ctx.fill();
            ctx.lineWidth = g.px; ctx.strokeStyle = HIS_css(HIS_PAL.eosPale, 1, 0.8); ctx.stroke();
            for (let k = 0; k < 3; k++) {                 // nuclei at the RIM of each profile
              const a = rng() * 6.283;
              HIS_nucleus(g, x + Math.cos(a) * 17, y + Math.sin(a) * 17, 3, 2, a, { rng: rng });
            }
          }
        }
        if (Math.abs(cx) < fasc && Math.abs(cy) < fasc) {
          g.mark(cx, cy, fasc * 0.35, 'fascicle');
          g.mark(cx + fasc * 0.46, cy, 20, 'perimysium');
        }
      }
    }
    return;
  }

  const fibW = g.power === 400 ? 62 : 55, pitch = fibW + 7;
  for (let y = -g.h - pitch; y < g.h + pitch; y += pitch) {
    const wob = HIS_wave(3, 0.004, rng() * 6.283);
    ctx.beginPath();
    for (let x = -g.h * 1.1; x <= g.h * 1.1; x += 14) ctx.lineTo(x, y + wob(x));
    ctx.lineWidth = fibW; ctx.strokeStyle = HIS_vary(HIS_PAL.eos, rng, 0.1); ctx.stroke();
    // cross-striations, in register across the whole fibre
    const ph = rng() * 2.5;
    for (let x = -g.h * 1.1; x < g.h * 1.1; x += 2.5) {
      const yy = y + wob(x);
      ctx.beginPath(); ctx.moveTo(x + ph, yy - fibW / 2 + 1); ctx.lineTo(x + ph, yy + fibW / 2 - 1);
      ctx.lineWidth = Math.max(g.px * 0.7, 0.9);
      ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, g.power === 400 ? 0.3 : 0.18); ctx.stroke();
    }
    // the diagnostic feature: many nuclei, all at the edge
    for (let x = -g.h - 40 + rng() * 90; x < g.h + 40; x += 55 + rng() * 45) {
      const side = rng() < 0.5 ? -1 : 1;
      const yy = y + wob(x) + side * (fibW / 2 - 3.4);
      HIS_nucleus(g, x, yy, 6, 2.6, 0, { rng: rng, vesicular: true });
      if (rng() < 0.09) g.mark(x, yy, 8, 'peripheral-nucleus');
    }
    if (rng() < 0.5) {                                   // satellite cell: smaller, darker, on the fibre
      const sx = -g.h + rng() * g.h * 2;
      HIS_nucleus(g, sx, y + wob(sx) - fibW / 2 - 1.5, 4, 2, 0, { tone: HIS_PAL.hemDense, rng: rng });
      if (rng() < 0.3) g.mark(sx, y + wob(sx) - fibW / 2 - 1.5, 6, 'satellite-cell');
    }
    if (Math.abs(y) < pitch) {
      g.mark(-g.h * 0.35, y + wob(-g.h * 0.35), fibW * 0.3, 'skeletal-fibre');
      g.mark(g.h * 0.55, y + wob(g.h * 0.55), 8, 'striation');
      g.mark(0, y + wob(0) + pitch * 0.5, 5, 'endomysium');
    }
  }
}

/* ============================== SMOOTH MUSCLE ==============================
 * The point of this slide is the two orientations meeting: in longitudinal
 * section, fusiform cells with one central cigar nucleus; in cross-section,
 * circles of very unequal diameter of which only the ones cut through the middle
 * show a nucleus — because the cell tapers away to nothing at both ends. */
function HIS_drawSmooth(g) {
  const ctx = g.ctx, rng = g.rng;
  const split = -g.h * 0.05;
  ctx.fillStyle = HIS_css(HIS_PAL.muscleSm, 1.02);
  ctx.fillRect(-g.h * 1.1, -g.h * 1.1, g.h * 2.2, g.h * 2.2);
  // upper half: longitudinally cut cells
  ctx.save(); ctx.beginPath(); ctx.rect(-g.h * 1.1, -g.h * 1.1, g.h * 2.2, split + g.h * 1.1); ctx.clip();
  const cellL = 120, cellW = 7;
  for (let y = -g.h * 1.1; y < split; y += cellW + 1.6) {
    for (let x = -g.h * 1.1; x < g.h * 1.1; x += cellL * 0.85) {
      const cx = x + rng() * 30, wob = (rng() - 0.5) * 6;
      ctx.beginPath();
      ctx.moveTo(cx - cellL / 2, y + wob);
      ctx.quadraticCurveTo(cx, y - cellW * 0.5 + wob, cx + cellL / 2, y + wob);
      ctx.quadraticCurveTo(cx, y + cellW * 0.5 + wob, cx - cellL / 2, y + wob);
      ctx.closePath();
      ctx.fillStyle = HIS_vary(HIS_PAL.muscleSm, rng, 0.14); ctx.fill();
      HIS_nucleus(g, cx, y + wob, 9, 2.4, 0, { rng: rng, vesicular: true });
      if (rng() < 0.03) g.mark(cx, y + wob, 9, 'cigar-nucleus');
    }
  }
  ctx.restore();
  g.mark(-g.h * 0.5, split - g.h * 0.4, 40, 'smooth-long');
  // lower half: the same tissue cut across
  ctx.save(); ctx.beginPath(); ctx.rect(-g.h * 1.1, split, g.h * 2.2, g.h * 1.1 - split); ctx.clip();
  ctx.fillStyle = HIS_css(HIS_PAL.muscleSm, 0.98);
  ctx.fillRect(-g.h * 1.1, split, g.h * 2.2, g.h * 1.1 - split);
  // A 6 µm cell profile is 0.8 px at 4x and 3 px at 10x: individually drawing a
  // quarter of a million of them costs seconds and resolves to noise anyway. So
  // below 400x the transverse block is a nuclear texture, which is honestly what
  // the objective delivers. Only high dry draws real profiles.
  if (g.power === 400) {
    for (let y = split; y < g.h * 1.1; y += 9) {
      for (let x = -g.h * 1.1; x < g.h * 1.1; x += 9) {
        const r = 1.6 + rng() * 3.4;                     // unequal: the cell is a spindle
        HIS_blob(ctx, x, y, r, r, 6, 0.25, rng);
        ctx.fillStyle = HIS_vary(HIS_PAL.muscleSm, rng, 0.16); ctx.fill();
        ctx.lineWidth = g.px * 0.7; ctx.strokeStyle = HIS_css(HIS_PAL.eosPale, 1, 0.55); ctx.stroke();
        if (r > 3.6) HIS_nucleus(g, x, y, 2, 2, 0, { rng: rng });  // only the widest profiles
      }
    }
  } else {
    HIS_grain(g, -g.h * 1.1, split, g.h * 1.1, g.h * 1.1, g.power === 100 ? 0.0009 : 0.00022, rng, HIS_PAL.hem, 2.4);
    for (let i = 0; i < (g.power === 100 ? 220 : 90); i++) {
      const x = (rng() - 0.5) * g.h * 2.2, y = split + rng() * (g.h * 1.1 - split);
      const r = 2.4 + rng() * 3.6;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283);
      ctx.fillStyle = HIS_vary(HIS_PAL.muscleSm, rng, 0.18); ctx.fill();
      ctx.lineWidth = g.px * 0.8; ctx.strokeStyle = HIS_css(HIS_PAL.eosPale, 1, 0.5); ctx.stroke();
    }
  }
  ctx.restore();
  g.mark(g.h * 0.5, split + g.h * 0.5, 40, 'smooth-cross');
  ctx.beginPath(); ctx.moveTo(-g.h * 1.1, split); ctx.lineTo(g.h * 1.1, split);
  ctx.lineWidth = Math.max(g.px, 3); ctx.strokeStyle = HIS_css(HIS_PAL.eosPale, 1, 0.9); ctx.stroke();
  HIS_collagen(g, -g.h, split, g.h, split, 16, rng, { span: 8, w: 2, tone: HIS_PAL.eosPale });
}

/* ================================= ADIPOSE =================================
 * Signet rings. The lipid dissolves in the xylene used to clear the block, so
 * what survives is an empty vacuole with a thin eosinophilic rim and a nucleus
 * flattened against it. Drawing fat as anything other than white holes would be
 * wrong for an H&E paraffin section. */
function HIS_drawAdipose(g) {
  const ctx = g.ctx, rng = g.rng;
  const D = 80;                                          // adipocyte diameter, µm
  ctx.fillStyle = HIS_css(HIS_PAL.eosPale, 1.03);
  ctx.fillRect(-g.h * 1.1, -g.h * 1.1, g.h * 2.2, g.h * 2.2);

  const lob = g.power === 40 ? 1100 : 4000;              // fibrous septa divide fat into lobules
  for (let sy = -g.h - lob; sy < g.h + lob; sy += lob) {
    for (let sx = -g.h - lob; sx < g.h + lob; sx += lob) {
      const cells = [];
      // Pack the cells: fat is a foam, so cells are polygonal where they press
      // on each other, not circles floating in space.
      for (let y = sy + 20; y < sy + lob - 20; y += D * 0.92) {
        for (let x = sx + 20; x < sx + lob - 20; x += D * 0.92) {
          const jx = x + (rng() - 0.5) * D * 0.3, jy = y + (rng() - 0.5) * D * 0.3;
          if (Math.abs(jx) > g.h * 1.15 || Math.abs(jy) > g.h * 1.15) continue;
          cells.push([jx, jy, D * (0.72 + rng() * 0.5) / 2]);
        }
      }
      cells.forEach(function (c) {
        HIS_blob(ctx, c[0], c[1], c[2], c[2] * (0.85 + rng() * 0.3), 8, 0.16, rng);
        ctx.fillStyle = HIS_css(HIS_PAL.glass, 1); ctx.fill();
        ctx.lineWidth = Math.max(g.px, g.power === 400 ? 2.6 : 1.4);
        ctx.strokeStyle = HIS_vary(HIS_PAL.eos, rng, 0.14, 0.95); ctx.stroke();
        const a = rng() * 6.283;                          // nucleus squeezed onto the rim
        const nx = c[0] + Math.cos(a) * c[2] * 0.94, ny = c[1] + Math.sin(a) * c[2] * 0.94;
        HIS_nucleus(g, nx, ny, 4.2, 1.8, a + 1.5708, { rng: rng });
        if (rng() < 0.035) g.mark(nx, ny, 6, 'signet-ring');
        if (rng() < 0.03) g.mark(c[0], c[1], c[2] * 0.8, 'adipocyte');
        if (rng() < 0.02) g.mark(c[0] + c[2], c[1], 4, 'adipocyte-rim');
      });
      // septum + its vessel
      ctx.beginPath();
      ctx.moveTo(sx, sy - 10); ctx.lineTo(sx + 8, sy + lob + 10);
      ctx.lineWidth = 22; ctx.strokeStyle = HIS_css(HIS_PAL.eosPale, 1.02); ctx.stroke();
      HIS_collagen(g, sx, sy, sx + 8, sy + lob, 10, rng, { span: 9, w: 2.4, tone: HIS_PAL.eosPale });
      const vy = sy + lob * 0.4;
      HIS_tubule(g, sx + 4, vy, 22, 15, { tone: HIS_PAL.eosPale, cellW: 12, nucR: 2.4, nucFlat: 0.5 }, rng);
      HIS_bloodFill(g, sx + 4, vy, 12, 0.03, rng);
      if (Math.abs(sx) < lob) { g.mark(sx + 4, sy + lob * 0.7, 14, 'adipose-septum'); g.mark(sx + 4, vy, 16, 'capillary'); }
    }
  }
}

/* =================================== LUNG ==================================
 * Two completely different organs. A mammalian lung is a branching tree ending
 * in 200–300 µm alveoli — a sponge of air with a blood film stretched over it.
 * A frog lung is ONE SAC whose wall carries ridges (trabeculae) dividing it into
 * shallow faveoli; there is no bronchial tree and no alveolus. A frog drawn with
 * mammalian alveoli would be a straightforward factual error. */
function HIS_drawLung(g) {
  const ctx = g.ctx, rng = g.rng, frog = g.species === 'frog';
  ctx.fillStyle = HIS_css(HIS_PAL.glass, 1);
  ctx.fillRect(-g.h * 1.1, -g.h * 1.1, g.h * 2.2, g.h * 2.2);

  /* Draw one septum: two epithelial surfaces with a capillary bed between them.
   * The whole point of the lung is that this is under a micrometre thick. */
  function septum(pts, thick, capillaries) {
    ctx.beginPath();
    HIS_path(ctx, pts, false);
    ctx.lineWidth = thick; ctx.lineCap = 'round';
    ctx.strokeStyle = HIS_vary(HIS_PAL.eosPale, rng, 0.1); ctx.stroke();
    HIS_walk(pts, g.power === 400 ? 13 : 26, 1, function (x, y, nx, ny, i) {
      if (capillaries && rng() < 0.55) HIS_rbc(g, x, y, Math.atan2(ny, nx), rng);
      // type I pneumocyte: only the nuclear bulge is thick enough to see
      if (rng() < 0.5) HIS_nucleus(g, x + nx * thick * 0.35, y + ny * thick * 0.35, 3.4, 1.4, Math.atan2(ny, nx) + 1.5708, { rng: rng });
      if (rng() < 0.05 && g.power === 400) {              // type II: rounded, vacuolated, in a corner
        ctx.beginPath(); ctx.arc(x, y, 5.2, 0, 6.283);
        ctx.fillStyle = HIS_css(HIS_PAL.eos, 1.04); ctx.fill();
        ctx.beginPath(); ctx.arc(x - 1.5, y - 1.5, 1.8, 0, 6.283);
        ctx.fillStyle = HIS_css(HIS_PAL.glass, 1, 0.8); ctx.fill();
        HIS_nucleus(g, x + 1, y + 1, 2.6, 2.4, 0, { rng: rng, vesicular: true });
        g.mark(x, y, 6, 'type-ii');
      }
    });
  }

  if (frog) {
    /* The sac. At 40x the lumen dominates and the wall is a rim of faveoli. */
    const wallR = g.power === 40 ? 2100 : 6000;
    const inner = g.power === 40 ? 1250 : 900;
    ctx.beginPath();
    ctx.arc(0, g.power === 40 ? 0 : g.h * 1.3, inner, 0, 6.283);
    ctx.fillStyle = HIS_css(HIS_PAL.glass, 1); ctx.fill();
    const ccy = g.power === 40 ? 0 : g.h * 1.3;
    g.mark(0, ccy, inner * 0.55, 'lung-lumen');
    // faveoli: shallow pockets around the rim, walls thick with capillaries
    const fav = frog ? 420 : 300;
    const n = Math.round(6.283 * inner / fav);
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.283;
      const bx = Math.cos(a) * inner, by = ccy + Math.sin(a) * inner;
      const depth = fav * (0.6 + rng() * 0.5);
      // the trabecula between two faveoli — a ridge standing into the lumen
      const tx = Math.cos(a + 3.14 / n) , ty = Math.sin(a + 3.14 / n);
      const rx = Math.cos(a + 3.14 / n) * inner, ry = ccy + Math.sin(a + 3.14 / n) * inner;
      septum([[rx, ry], [rx - tx * depth * 0.55, ry - ty * depth * 0.55]], g.power === 400 ? 14 : 9, true);
      // faveolar pocket wall
      const pts = [];
      for (let k = 0; k <= 12; k++) {
        const aa = a + (k / 12 - 0.5) * (6.283 / n) * 0.95;
        const rr = inner + depth * Math.sin((k / 12) * Math.PI) * 1.0;
        pts.push([Math.cos(aa) * rr, ccy + Math.sin(aa) * rr]);
      }
      septum(pts, g.power === 400 ? 16 : 10, true);
      if (i % 5 === 0) {
        g.mark(bx + Math.cos(a) * depth * 0.5, by + Math.sin(a) * depth * 0.5, depth * 0.4, 'faveolus');
        g.mark(rx - tx * depth * 0.3, ry - ty * depth * 0.3, 12, 'faveolar-septum');
      }
    }
    // smooth muscle in the trabecular ridges — frogs actively narrow the faveoli
    for (let i = 0; i < 14; i++) {
      const a = rng() * 6.283, rr = inner + 40 + rng() * 200;
      HIS_nucleus(g, Math.cos(a) * rr, ccy + Math.sin(a) * rr, 7, 2, a + 1.5708, { rng: rng });
    }
    HIS_grain(g, -g.h, ccy - g.h, g.h, ccy + g.h, 0.00004, rng, HIS_PAL.hemDense, 3);
    return;
  }

  /* Mammalian: alveolar sponge, with a bronchiole and its artery. */
  const alv = 260;
  for (let y = -g.h - alv; y < g.h + alv; y += alv * 0.86) {
    for (let x = -g.h - alv; x < g.h + alv; x += alv * 0.86) {
      const cx = x + (rng() - 0.5) * alv * 0.4, cy = y + (rng() - 0.5) * alv * 0.4;
      const r = alv * (0.34 + rng() * 0.2);
      const pts = HIS_ring(cx, cy, r, 16, HIS_wave(r * 0.12, 3, rng() * 6.283));
      septum(pts, g.power === 400 ? 9 : 5, true);
      if (rng() < 0.04) g.mark(cx, cy, r * 0.7, 'alveolus');
      if (rng() < 0.03) g.mark(cx + r, cy, 8, 'alveolar-septum');
      if (rng() < 0.02 && g.power !== 40) {               // dust cell, free in the airspace
        HIS_blob(ctx, cx, cy, 9, 8, 9, 0.2, rng);
        ctx.fillStyle = HIS_css(HIS_PAL.eos, 1, 0.9); ctx.fill();
        for (let k = 0; k < 6; k++) {
          ctx.beginPath(); ctx.arc(cx + (rng() - 0.5) * 9, cy + (rng() - 0.5) * 9, 1.2, 0, 6.283);
          ctx.fillStyle = HIS_css(HIS_PAL.pigment, 1, 0.8); ctx.fill();
        }
        HIS_nucleus(g, cx, cy, 3, 2.6, 0, { rng: rng });
        g.mark(cx, cy, 9, 'alveolar-macrophage');
      }
      if (rng() < 0.03 && g.power === 400) g.mark(cx + r * 0.7, cy + r * 0.7, 4, 'pore-of-kohn');
      if (rng() < 0.03) g.mark(cx - r * 0.9, cy, 4, 'type-i');
    }
  }
  if (g.power !== 400) {                                  // a bronchiole with its companion artery
    const bx = -g.h * 0.4, by = g.h * 0.3, bR = g.power === 40 ? 420 : 300;
    ctx.beginPath(); ctx.arc(bx, by, bR * 1.16, 0, 6.283);
    ctx.fillStyle = HIS_css(HIS_PAL.eosPale, 1.02); ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by, bR, 0, 6.283);
    ctx.fillStyle = HIS_css(HIS_PAL.muscleSm, 1); ctx.fill();
    const lum = HIS_ring(bx, by, bR * 0.78, 40, HIS_wave(bR * 0.08, 9, 1.1));
    HIS_path(ctx, lum, true); ctx.fillStyle = HIS_css(HIS_PAL.glass, 1); ctx.fill();
    HIS_walk(lum, 11, -1, function (x, y, nx, ny) {       // ciliated columnar lining
      HIS_nucleus(g, x + nx * 9, y + ny * 9, 2.8, 4.4, Math.atan2(ny, nx), { rng: rng });
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - nx * 3, y - ny * 3);
      ctx.lineWidth = 9; ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.45); ctx.stroke();
    });
    g.mark(bx, by, bR * 0.6, 'bronchiole');
    g.mark(bx, by - bR * 0.85, 14, 'resp-epithelium');
    const ax = bx + bR * 1.9, ay = by + bR * 0.3, aR = bR * 0.5;
    HIS_tubule(g, ax, ay, aR, aR * 0.55, { tone: HIS_PAL.muscleSm, cellW: 14, nucR: 3, nucFlat: 0.45 }, rng);
    HIS_bloodFill(g, ax, ay, aR * 0.5, 0.02, rng);
    g.mark(ax, ay, aR, 'tunica-media');
  }
}

/* ============================== KIDNEY CORTEX ==============================
 * Renal corpuscles scattered in a field of tubule profiles. The examinable skill
 * is telling PCT from DCT: proximal is darker, has a brush border that nearly
 * fills the lumen, and shows fewer nuclei per profile because its cells are much
 * larger. The amphibian kidney is a mesonephros — no cortex/medulla division,
 * ciliated tubules, and peritoneal funnels that no mammal has. */
function HIS_drawKidney(g) {
  const ctx = g.ctx, rng = g.rng, frog = g.species === 'frog';
  ctx.fillStyle = HIS_css(HIS_PAL.eosPale, 1.02);
  ctx.fillRect(-g.h * 1.1, -g.h * 1.1, g.h * 2.2, g.h * 2.2);

  const glomR = frog ? 80 : 105;                          // corpuscle radius (~200 µm across)

  function corpuscle(cx, cy, detail) {
    ctx.beginPath(); ctx.arc(cx, cy, glomR, 0, 6.283);
    ctx.fillStyle = HIS_css(HIS_PAL.glass, 1); ctx.fill();     // Bowman's space
    ctx.lineWidth = Math.max(g.px, 1.6); ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.4); ctx.stroke();
    const nCap = Math.round(6.283 * glomR / 12);
    for (let i = 0; i < nCap; i++) {                       // parietal layer: simple squamous
      if (rng() < 0.2) continue;                           // not every cell is cut through its nucleus
      const a = i / nCap * 6.283 + (rng() - 0.5) * (6.283 / nCap) * 0.9;
      HIS_nucleus(g, cx + Math.cos(a) * glomR * (1 + (rng() - 0.5) * 0.03),
        cy + Math.sin(a) * glomR * (1 + (rng() - 0.5) * 0.03),
        3 * (0.8 + rng() * 0.45), 1.3 * (0.8 + rng() * 0.5), a + 1.5708, { rng: rng });
    }
    const tuft = glomR * 0.78;
    HIS_blob(ctx, cx, cy, tuft, tuft, 14, 0.12, rng);
    ctx.fillStyle = HIS_css(HIS_PAL.eos, 1.02); ctx.fill();
    // capillary loops packed with red cells; podocyte nuclei on their outside
    for (let i = 0; i < (detail ? 26 : 14); i++) {
      const a = rng() * 6.283, d = Math.sqrt(rng()) * tuft * 0.85;
      const lx = cx + Math.cos(a) * d, ly = cy + Math.sin(a) * d;
      ctx.beginPath(); ctx.arc(lx, ly, detail ? 9 : 7, 0, 6.283);
      ctx.fillStyle = HIS_css(HIS_PAL.glass, 1, 0.75); ctx.fill();
      if (detail) HIS_bloodFill(g, lx, ly, 6, 0.06, rng); else HIS_rbc(g, lx, ly, a, rng);
      HIS_nucleus(g, lx + 8, ly + 5, 3, 2.6, 0, { rng: rng, vesicular: true });
      if (detail && rng() < 0.12) g.mark(lx + 8, ly + 5, 5, 'podocyte');
    }
    g.mark(cx, cy, tuft, 'glomerulus');
    g.mark(cx + glomR * 0.88, cy - glomR * 0.3, 10, 'bowman-space');
    g.mark(cx - glomR, cy, 6, 'bowman-capsule');
    if (detail) {                                          // macula densa at the vascular pole
      const a = 2.2;
      for (let k = -3; k <= 3; k++) {
        const aa = a + k * 0.055;
        HIS_nucleus(g, cx + Math.cos(aa) * (glomR + 9), cy + Math.sin(aa) * (glomR + 9), 2.2, 3.4, aa + 1.5708,
          { tone: HIS_PAL.hemDense, rng: rng });
      }
      g.mark(cx + Math.cos(a) * (glomR + 9), cy + Math.sin(a) * (glomR + 9), 12, 'macula-densa');
    }
  }

  if (g.power === 400) {
    corpuscle(-g.h * 0.35, -g.h * 0.2, true);
    // a ring of tubules around it: PCT dark with brush border, DCT pale and open
    for (let y = -g.h; y < g.h; y += 58) {
      for (let x = -g.h; x < g.h; x += 58) {
        if (Math.hypot(x + g.h * 0.35, y + g.h * 0.2) < glomR + 40) continue;
        const jx = x + (rng() - 0.5) * 18, jy = y + (rng() - 0.5) * 18;
        const prox = rng() < 0.6;
        HIS_tubule(g, jx, jy, 27, prox ? 5 : 11, {
          tone: prox ? HIS_PAL.eosDeep : HIS_PAL.eos, brush: prox, cellW: prox ? 15 : 10,
          nucR: 3.6, nucRing: 0.62, vesicular: true,
        }, rng);
        if (rng() < 0.1) g.mark(jx, jy, 24, prox ? 'pct' : 'dct');
      }
    }
    if (frog) {                                            // ciliated nephrostome
      const nx = g.h * 0.6, ny = g.h * 0.55;
      HIS_tubule(g, nx, ny, 34, 18, { tone: HIS_PAL.eos, cellW: 9, nucR: 3 }, rng);
      for (let i = 0; i < 26; i++) {
        const a = i / 26 * 6.283;
        ctx.beginPath();
        ctx.moveTo(nx + Math.cos(a) * 18, ny + Math.sin(a) * 18);
        ctx.lineTo(nx + Math.cos(a) * 12, ny + Math.sin(a) * 12);
        ctx.lineWidth = g.px; ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.7); ctx.stroke();
      }
      g.mark(nx, ny, 30, 'nephrostome');
    }
    return;
  }

  // 40x / 100x: the cortex as a whole — corpuscles scattered in a tubular field.
  // At 4x a tubule is ~6 px across, so its nuclei are drawn as a single grain
  // pass over the whole field rather than ~140 000 individual ellipses.
  const step = g.power === 40 ? 52 : 52;
  const lowP = g.power === 40;
  for (let y = -g.h - step; y < g.h + step; y += step) {
    for (let x = -g.h - step; x < g.h + step; x += step) {
      const jx = x + (rng() - 0.5) * 16, jy = y + (rng() - 0.5) * 16;
      const prox = rng() < 0.6;
      HIS_tubule(g, jx, jy, 22, prox ? 4 : 9, {
        tone: prox ? HIS_PAL.eosDeep : HIS_PAL.eos, brush: prox && !lowP,
        cellW: 12, nucR: 3, nucRing: 0.6, border: !lowP, noNuc: lowP,
      }, rng);
      if (rng() < 0.015) g.mark(jx, jy, 20, prox ? 'pct' : 'dct');
    }
  }
  if (lowP) HIS_grain(g, -g.h, -g.h, g.h, g.h, 0.00024, rng, HIS_PAL.hem, 3.2);
  // a collecting duct and the interlobular artery that runs out to the capsule
  const cdx = g.h * 0.35, cdy = g.h * 0.55;
  HIS_tubule(g, cdx, cdy, 34, 18, { tone: HIS_PAL.eosPale, cellW: 13, nucR: 3.2, vesicular: true }, rng);
  g.mark(cdx, cdy, 32, 'collecting-duct');
  const iax = -g.h * 0.6, iay = -g.h * 0.1;
  HIS_tubule(g, iax, iay, 52, 26, { tone: HIS_PAL.muscleSm, cellW: 14, nucR: 3, nucFlat: 0.45 }, rng);
  HIS_bloodFill(g, iax, iay, 22, 0.02, rng);
  g.mark(iax, iay, 50, 'interlobular-artery');
  const spacing = frog ? 620 : 460;
  for (let y = -g.h; y < g.h + spacing; y += spacing) {
    for (let x = -g.h; x < g.h + spacing; x += spacing) {
      corpuscle(x + (rng() - 0.5) * 180, y + (rng() - 0.5) * 180, g.power === 100);
    }
  }
  if (g.power === 40 && !frog) {
    HIS_band(g, HIS_at(HIS_wave(30, 0.002, 0.3), -g.h * 0.86), HIS_at(HIS_wave(30, 0.002, 0.3), -g.h * 0.78),
      HIS_css(HIS_PAL.eosPale, 0.96));
    HIS_collagen(g, -g.h, -g.h * 0.82, g.h, -g.h * 0.82, 40, rng, { span: 26, tone: HIS_PAL.eosPale });
    g.mark(0, -g.h * 0.82, 30, 'renal-capsule');
  }
  if (frog) g.mark(g.h * 0.4, g.h * 0.4, 22, 'mesonephric-tubule');
}

/* ======================= DENSE FIBROUS CONNECTIVE TISSUE ===================
 * Almost acellular: wavy eosinophilic collagen with the flattened dark nuclei of
 * quiescent fibrocytes trapped between the bundles. Dense IRREGULAR (capsules,
 * dermis) has bundles running in every plane at once, so some are cut across and
 * appear as pale islands. Dense REGULAR (tendon) has them all parallel. */
function HIS_drawFibrous(g) {
  const ctx = g.ctx, rng = g.rng;
  ctx.fillStyle = HIS_css(HIS_PAL.eosPale, 1.03);
  ctx.fillRect(-g.h * 1.1, -g.h * 1.1, g.h * 2.2, g.h * 2.2);

  // irregular in the upper two thirds, regular below — one slide, both patterns
  const split = g.h * 0.25;
  ctx.save(); ctx.beginPath(); ctx.rect(-g.h * 1.1, -g.h * 1.1, g.h * 2.2, split + g.h * 1.1); ctx.clip();
  for (let i = 0; i < (g.power === 400 ? 60 : 140); i++) {
    const a = rng() * 3.14, L = g.h * (0.6 + rng() * 0.9);
    const cx = (rng() - 0.5) * g.h * 2, cy = -g.h * 0.5 + (rng() - 0.5) * g.h * 1.2;
    HIS_collagen(g, cx - Math.cos(a) * L / 2, cy - Math.sin(a) * L / 2,
      cx + Math.cos(a) * L / 2, cy + Math.sin(a) * L / 2, 6, rng,
      { span: 14, w: g.power === 400 ? 5 : 3, crimp: 7, period: 90, tone: HIS_PAL.eosPale });
  }
  for (let i = 0; i < (g.power === 400 ? 20 : 60); i++) {   // bundles cut across: pale islands
    const cx = (rng() - 0.5) * g.h * 2, cy = -g.h * 0.5 + (rng() - 0.5) * g.h * 1.2;
    HIS_blob(ctx, cx, cy, 12 + rng() * 14, 10 + rng() * 12, 9, 0.25, rng);
    ctx.fillStyle = HIS_css(HIS_PAL.eosPale, 1.06); ctx.fill();
    ctx.lineWidth = g.px; ctx.strokeStyle = HIS_css(HIS_PAL.eos, 1, 0.4); ctx.stroke();
  }
  ctx.restore();
  g.mark(-g.h * 0.4, -g.h * 0.55, 60, 'dense-irregular');
  g.mark(g.h * 0.3, -g.h * 0.3, 20, 'collagen-bundle');
  // a few plump active fibroblasts among the flat quiescent fibrocytes
  for (let i = 0; i < 10; i++) {
    const fx = (rng() - 0.5) * g.h * 1.9, fy = -g.h * 0.5 + (rng() - 0.5) * g.h;
    HIS_nucleus(g, fx, fy, 7, 2.6, (rng() - 0.5) * 1.2, { rng: rng, vesicular: true });
    if (i === 3) g.mark(fx, fy, 8, 'fibroblast');
  }

  ctx.save(); ctx.beginPath(); ctx.rect(-g.h * 1.1, split, g.h * 2.2, g.h * 1.1 - split); ctx.clip();
  HIS_collagen(g, -g.h * 1.2, split + g.h * 0.4, g.h * 1.2, split + g.h * 0.4,
    g.power === 400 ? 70 : 200, rng, { span: g.h * 0.6, w: g.power === 400 ? 6 : 3, crimp: 9, period: 140, tone: HIS_PAL.eosPale });
  // fibrocytes in rows, squeezed flat between the bundles
  for (let y = split + 12; y < g.h * 1.1; y += g.power === 400 ? 26 : 34) {
    for (let x = -g.h * 1.1; x < g.h * 1.1; x += g.power === 400 ? 40 : 55) {
      HIS_nucleus(g, x + rng() * 20, y + Math.sin(x * 0.01) * 5, 6, 1.4, Math.sin(x * 0.01) * 0.12,
        { tone: HIS_PAL.hemDense, rng: rng });
    }
  }
  ctx.restore();
  g.mark(0, split + g.h * 0.4, 60, 'dense-regular');
  g.mark(g.h * 0.2, split + 30, 8, 'fibrocyte');
  if (g.power === 400) {
    for (let i = 0; i < 8; i++) {
      const ex = (rng() - 0.5) * g.h * 1.8, ey = -g.h * 0.6 + rng() * g.h * 0.6;
      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.1) ctx.lineTo(ex + t * 120, ey + Math.sin(t * 9) * 9);
      ctx.lineWidth = 2.2; ctx.strokeStyle = HIS_css(HIS_PAL.elastic, 1, 0.75); ctx.stroke();
      if (i === 2) g.mark(ex + 60, ey, 10, 'elastic-fibre');
    }
  }
}

/* ========================= MESOTHELIUM / SEROSA ===========================
 * A lesson in scale. The lining of the coelom is ONE layer of cells about a
 * micrometre thick over most of their extent — at 4x it is not visible at all,
 * at 40x it is a line with occasional nuclear bulges. Drawing it as a plump
 * epithelium would misteach the single most important thing about it. */
function HIS_drawMesothelium(g) {
  const ctx = g.ctx, rng = g.rng;
  const top = g.power === 400 ? -120 : g.power === 100 ? -400 : -1200;
  g.shift(0, -top - g.h);
  ctx.fillStyle = HIS_css(HIS_PAL.glass, 1);              // the coelomic cavity
  ctx.fillRect(-g.h * 1.1, top - 20, g.h * 2.2, 8000);
  const surf = HIS_at(HIS_wave(g.power === 400 ? 6 : 26, 0.004, 0.9), 0);

  // the organ underneath — this is most of what the field actually contains
  HIS_band(g, HIS_at(HIS_wave(g.power === 400 ? 6 : 26, 0.004, 0.9), 34),
    function () { return 6000; }, HIS_css(HIS_PAL.eos, 1.02));
  HIS_grain(g, -g.h * 1.1, 40, g.h * 1.1, top + g.h * 2, 0.0005, rng, HIS_PAL.hem, 3.4);
  // subserous connective tissue: thin, loose, with the vessels
  HIS_band(g, surf, HIS_at(HIS_wave(g.power === 400 ? 6 : 26, 0.004, 0.9), 34), HIS_css(HIS_PAL.eosPale, 1.03));
  HIS_collagen(g, -g.h, 18, g.h, 18, g.power === 400 ? 40 : 90, rng,
    { span: 12, w: 2, crimp: 4, period: 60, tone: HIS_PAL.eosPale });
  g.mark(-g.h * 0.3, 20, 14, 'subserous');
  g.mark(g.h * 0.5, 120, 40, 'serosa');

  // the mesothelium itself: a hairline, with nuclei bulging into the cavity
  const pts = [];
  for (let x = -g.h * 1.1; x <= g.h * 1.1; x += 6) pts.push([x, surf(x)]);
  ctx.beginPath(); HIS_path(ctx, pts, false);
  ctx.lineWidth = Math.max(g.px * 1.2, g.power === 400 ? 1.6 : 0.8);
  ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.85); ctx.stroke();
  HIS_walk(pts, g.power === 400 ? 22 : 40, -1, function (x, y, nx, ny, i) {
    HIS_nucleus(g, x + nx * 1.6, y + ny * 1.6, 4.4, 1.5, Math.atan2(ny, nx), { rng: rng, vesicular: true });
    if (g.power === 400 && i % 3 === 0) {                  // faint lateral cell boundaries
      ctx.beginPath(); ctx.moveTo(x, y - 1.5); ctx.lineTo(x, y + 3);
      ctx.lineWidth = g.px * 0.8; ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.4); ctx.stroke();
    }
    if (i % 9 === 2) g.mark(x, y, 7, 'mesothelial-nucleus');
  });
  g.mark(0, surf(0), 8, 'mesothelium');
  if (g.power === 400) {
    for (let i = 0; i < 5; i++) {                          // a little fat in the subserosa
      const fx = (rng() - 0.5) * g.h * 1.8;
      ctx.beginPath(); ctx.arc(fx, 90 + rng() * 60, 26, 0, 6.283);
      ctx.fillStyle = HIS_css(HIS_PAL.glass, 1); ctx.fill();
      ctx.lineWidth = g.px * 1.4; ctx.strokeStyle = HIS_css(HIS_PAL.eos, 1); ctx.stroke();
    }
  }
}

/* ============================ HYALINE CARTILAGE ============================
 * Matrix is BASOPHILIC — its sulfated glycosaminoglycans bind haematoxylin —
 * which is why cartilage is the one "connective tissue" that is not pink. The
 * territorial matrix immediately around each nest is newer and darker still.
 * Chondrocytes shrink away from their lacuna walls in processing; that gap is an
 * artefact and a student should be told so rather than left to invent a reason. */
function HIS_drawCartilage(g) {
  const ctx = g.ctx, rng = g.rng;
  ctx.fillStyle = HIS_css(HIS_PAL.cartilage, 1.02);
  ctx.fillRect(-g.h * 1.1, -g.h * 1.1, g.h * 2.2, g.h * 2.2);
  // faint matrix mottling — hyaline matrix is glassy but never perfectly even
  for (let i = 0; i < 240; i++) {
    const x = (rng() - 0.5) * g.h * 2.2, y = (rng() - 0.5) * g.h * 2.2;
    ctx.beginPath(); ctx.arc(x, y, g.h * 0.06 * rng(), 0, 6.283);
    ctx.fillStyle = HIS_css(HIS_PAL.cartilage, 0.97 + rng() * 0.08, 0.35); ctx.fill();
  }

  const edge = g.h * 0.82;                                 // perichondrium top and bottom
  [-1, 1].forEach(function (s) {
    const yEdge = s * edge;
    HIS_band(g, HIS_at(HIS_wave(g.h * 0.02, 0.006, s), yEdge - (s < 0 ? g.h * 0.3 : 0)),
      HIS_at(HIS_wave(g.h * 0.02, 0.006, s), yEdge + (s > 0 ? g.h * 0.3 : 0)),
      HIS_css(HIS_PAL.eosPale, 1.02));
    HIS_collagen(g, -g.h, yEdge + s * g.h * 0.1, g.h, yEdge + s * g.h * 0.1,
      g.power === 400 ? 40 : 90, rng, { span: g.h * 0.08, w: 2.6, crimp: 5, tone: HIS_PAL.eosPale });
    for (let x = -g.h; x < g.h; x += 34) {
      HIS_nucleus(g, x + rng() * 16, yEdge + s * (g.h * 0.06 + rng() * g.h * 0.14), 5, 1.5, 0,
        { tone: HIS_PAL.hemDense, rng: rng });
    }
    g.mark(s * g.h * 0.4, yEdge + s * g.h * 0.14, g.h * 0.08, 'perichondrium');
  });

  /* Cell size and grouping change with depth: flattened and single near the
   * perichondrium (young, just recruited), large and in nests in the middle. */
  const nestPitch = g.power === 400 ? 110 : g.power === 100 ? 130 : 150;
  for (let y = -edge + nestPitch * 0.6; y < edge; y += nestPitch) {
    for (let x = -g.h - nestPitch; x < g.h + nestPitch; x += nestPitch) {
      const depth = 1 - Math.abs(y) / edge;                 // 0 at surface, 1 at centre
      const cx = x + (rng() - 0.5) * nestPitch * 0.35, cy = y + (rng() - 0.5) * nestPitch * 0.3;
      const nCells = depth > 0.45 ? (rng() < 0.5 ? 2 : (rng() < 0.6 ? 3 : 4)) : 1;
      const cellR = (depth > 0.45 ? 15 : 9) * (0.85 + rng() * 0.3);
      const flat = depth > 0.45 ? 0.88 : 0.42;
      // territorial matrix: an intensely basophilic collar around the nest
      HIS_blob(ctx, cx, cy, cellR * (nCells > 1 ? 2.5 : 1.9), cellR * flat * (nCells > 1 ? 2.5 : 2.4), 11, 0.14, rng);
      ctx.fillStyle = HIS_css(HIS_PAL.cartTerr, 1, 0.55); ctx.fill();
      for (let k = 0; k < nCells; k++) {
        const off = nCells === 1 ? 0 : (k - (nCells - 1) / 2) * cellR * 1.9;
        const lx = cx + off * (nCells > 2 && k % 2 ? 0.4 : 1), ly = cy + (nCells > 2 && k % 2 ? cellR * 1.7 : 0);
        // the lacuna, then the shrunken cell inside it
        HIS_blob(ctx, lx, ly, cellR, cellR * flat, 10, 0.12, rng);
        ctx.fillStyle = HIS_css(HIS_PAL.glass, 1); ctx.fill();
        ctx.lineWidth = g.px; ctx.strokeStyle = HIS_css(HIS_PAL.cartTerr, 0.9, 0.6); ctx.stroke();
        HIS_blob(ctx, lx, ly, cellR * 0.74, cellR * flat * 0.74, 9, 0.2, rng);
        ctx.fillStyle = HIS_vary(HIS_PAL.eos, rng, 0.12, 0.95); ctx.fill();
        HIS_nucleus(g, lx, ly, cellR * 0.3, cellR * flat * 0.34, 0, { rng: rng, vesicular: true });
      }
      if (rng() < 0.09) g.mark(cx, cy, cellR * 1.6, nCells > 1 ? 'isogenous-group' : 'chondrocyte');
      if (rng() < 0.05) g.mark(cx, cy, cellR, 'lacuna');
      if (rng() < 0.05) g.mark(cx + cellR * 2.2, cy, cellR * 0.5, 'territorial-matrix');
      if (rng() < 0.04 && g.power === 400) g.mark(cx, cy + cellR * 0.85, 3, 'shrinkage-artefact');
    }
  }
  g.mark(g.h * 0.6, 0, 30, 'interterritorial');
}

/* ================================ VESSELS ==================================
 * One generator, three walls. A muscular artery is identified by its wavy
 * INTERNAL ELASTIC LAMINA; an elastic artery (aorta, pulmonary trunk) by dozens
 * of concentric fenestrated elastic lamellae in a very thick media; a vein by a
 * thin media, a wide folded lumen and an adventitia that is the thickest layer
 * of its wall. Comparing media thickness to lumen is the diagnostic move. */
function HIS_drawVessel(g) {
  const ctx = g.ctx, rng = g.rng;
  const kind = g.opt.kind || 'muscular';
  const elastic = kind === 'elastic', vein = kind === 'vein';
  ctx.fillStyle = HIS_css(HIS_PAL.eosPale, 1.03);
  ctx.fillRect(-g.h * 1.1, -g.h * 1.1, g.h * 2.2, g.h * 2.2);

  if (g.power !== 400) {
    /* Cross-section: the proportions ARE the identification. */
    const lum = g.power === 40 ? (vein ? 1500 : 900) : (vein ? 700 : 380);
    const media = elastic ? lum * 0.55 : vein ? lum * 0.09 : lum * 0.55;
    const adv = vein ? media * 4.2 : media * 0.5;
    const fold = vein ? HIS_wave(lum * 0.09, 5, 0.6) : HIS_wave(lum * 0.02, 7, 0.2);
    HIS_annulus(g, 0, 0, lum + media, lum + media + adv, HIS_css(HIS_PAL.eosPale, 1.02));
    HIS_collagen(g, -lum - media - adv * 0.5, 0, lum + media + adv * 0.5, 0, 90, rng,
      { span: lum, w: 2.6, crimp: 6, tone: HIS_PAL.eosPale });
    g.mark(0, -(lum + media + adv * 0.55), adv * 0.4, 'tunica-adventitia');
    HIS_annulus(g, 0, 0, lum, lum + media, HIS_css(HIS_PAL.muscleSm, 1), fold);
    g.mark(lum + media * 0.5, 0, media * 0.4, 'tunica-media');
    // concentric smooth-muscle / elastic lamellae
    const rings = elastic ? 26 : vein ? 3 : 9;
    for (let i = 1; i < rings; i++) {
      const r = lum + media * i / rings;
      ctx.beginPath();
      for (let k = 0; k <= 200; k++) {
        const a = k / 200 * 6.283, rr = r + fold(a * 57.3) * (1 - i / rings) + Math.sin(a * 22 + i) * (elastic ? 3 : 1.2);
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.lineWidth = Math.max(g.px, elastic ? 3.2 : 2);
      ctx.strokeStyle = HIS_css(elastic ? HIS_PAL.elastic : HIS_PAL.eosPale, 1, elastic ? 0.85 : 0.6);
      ctx.stroke();
      if (elastic && i === 8) g.mark(Math.cos(1.1) * r, Math.sin(1.1) * r, 14, 'elastic-lamella');
    }
    if (!elastic && !vein) {                               // the internal elastic lamina
      ctx.beginPath();
      for (let k = 0; k <= 260; k++) {
        const a = k / 260 * 6.283, rr = lum + fold(a * 57.3) + Math.sin(a * 34) * 7;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.lineWidth = Math.max(g.px * 1.6, 6); ctx.strokeStyle = HIS_css(HIS_PAL.elastic, 0.95); ctx.stroke();
      g.mark(Math.cos(2.4) * lum, Math.sin(2.4) * lum, 16, 'iel');
    }
    const inner = HIS_ring(0, 0, lum, 120, fold);
    HIS_path(ctx, inner, true); ctx.fillStyle = HIS_css(HIS_PAL.glass, 1); ctx.fill();
    HIS_walk(inner, 16, -1, function (x, y, nx, ny) {
      HIS_nucleus(g, x + nx * 3, y + ny * 3, 3.4, 1.5, Math.atan2(ny, nx), { rng: rng });
    });
    g.mark(0, 0, lum * 0.6, 'vessel-lumen');
    g.mark(Math.cos(0.4) * lum, Math.sin(0.4) * lum, 8, 'endothelium');
    HIS_bloodFill(g, 0, 0, lum * 0.85, vein ? 0.02 : 0.006, rng);
    // vasa vasorum out in the adventitia
    for (let i = 0; i < 4; i++) {
      const a = rng() * 6.283, r = lum + media + adv * (0.3 + rng() * 0.5);
      HIS_tubule(g, Math.cos(a) * r, Math.sin(a) * r, 26, 16, { tone: HIS_PAL.eosPale, cellW: 12, nucR: 2.4 }, rng);
      if (i === 1) g.mark(Math.cos(a) * r, Math.sin(a) * r, 26, 'vasa-vasorum');
    }
    return;
  }

  /* 400x: the wall laid flat, lumen at the top — layer by layer. */
  g.shift(0, -g.h * 0.75);
  ctx.fillStyle = HIS_css(HIS_PAL.glass, 1);
  ctx.fillRect(-g.h * 1.1, -g.h, g.h * 2.2, 60);
  HIS_bloodFill(g, 0, 10, g.h * 0.9, 0.004, rng);
  const wob = HIS_wave(4, 0.02, 0.4);
  HIS_band(g, HIS_at(wob, 60), HIS_at(wob, 74), HIS_css(HIS_PAL.eosPale, 1.04));
  for (let x = -g.h; x < g.h; x += 22) HIS_nucleus(g, x, 64 + wob(x), 4, 1.5, 0, { rng: rng });
  g.mark(0, 66, 8, 'endothelium');
  g.mark(g.h * 0.4, 70, 10, 'tunica-intima');
  if (!vein) {                                             // IEL / first elastic lamella
    ctx.beginPath();
    for (let x = -g.h * 1.1; x <= g.h * 1.1; x += 6) ctx.lineTo(x, 80 + Math.sin(x * 0.09) * 6 + wob(x));
    ctx.lineWidth = 5; ctx.strokeStyle = HIS_css(HIS_PAL.elastic, 0.95); ctx.stroke();
    g.mark(-g.h * 0.3, 80, 10, elastic ? 'elastic-lamella' : 'iel');
  }
  HIS_band(g, HIS_at(wob, 86), HIS_at(wob, 86 + (elastic ? 500 : vein ? 90 : 300)), HIS_css(HIS_PAL.muscleSm, 1));
  const mBot = 86 + (elastic ? 500 : vein ? 90 : 300);
  for (let y = 96; y < mBot; y += elastic ? 34 : 22) {
    if (elastic) {                                          // lamella / muscle / lamella sandwich
      ctx.beginPath();
      for (let x = -g.h * 1.1; x <= g.h * 1.1; x += 6) ctx.lineTo(x, y + Math.sin(x * 0.07 + y) * 5);
      ctx.lineWidth = 4.2; ctx.strokeStyle = HIS_css(HIS_PAL.elastic, 1, 0.9); ctx.stroke();
    }
    for (let x = -g.h * 1.1; x < g.h * 1.1; x += 26) {
      HIS_nucleus(g, x + rng() * 12, y + (elastic ? 16 : 10) + rng() * 5, 7, 2, 0.06, { rng: rng, vesicular: true });
    }
  }
  g.mark(0, (86 + mBot) / 2, 40, 'tunica-media');
  if (!vein && !elastic) {
    ctx.beginPath();
    for (let x = -g.h * 1.1; x <= g.h * 1.1; x += 6) ctx.lineTo(x, mBot + 4 + Math.sin(x * 0.06) * 4);
    ctx.lineWidth = 3; ctx.strokeStyle = HIS_css(HIS_PAL.elastic, 1, 0.7); ctx.stroke();
    g.mark(g.h * 0.2, mBot + 4, 8, 'eel');
  }
  HIS_band(g, HIS_at(wob, mBot + 10), function () { return mBot + 900; }, HIS_css(HIS_PAL.eosPale, 1.02));
  HIS_collagen(g, -g.h, mBot + 120, g.h, mBot + 120, 90, rng, { span: 90, w: 3, crimp: 7, tone: HIS_PAL.eosPale });
  for (let i = 0; i < 30; i++) {
    HIS_nucleus(g, (rng() - 0.5) * g.h * 2, mBot + 20 + rng() * 260, 5, 1.4, (rng() - 0.5) * 0.6,
      { tone: HIS_PAL.hemDense, rng: rng });
  }
  g.mark(-g.h * 0.5, mBot + 140, 50, 'tunica-adventitia');
}

/* ============================== VALVE LEAFLET ==============================
 * Three layers with three jobs: fibrosa (dense collagen) takes the closing load
 * on the outflow side, spongiosa (loose GAG) lets the layers shear, ventricularis
 * (elastin) pulls the leaflet back into shape. Endothelium on both faces, and no
 * blood vessels anywhere inside — a valve feeds by diffusion from the blood
 * washing over it, which is why valve interstitial cells matter so much. */
function HIS_drawValve(g) {
  const ctx = g.ctx, rng = g.rng, chorda = !!g.opt.chorda;
  ctx.fillStyle = HIS_css(HIS_PAL.glass, 1);
  ctx.fillRect(-g.h * 1.1, -g.h * 1.1, g.h * 2.2, g.h * 2.2);
  HIS_bloodFill(g, 0, -g.h * 0.75, g.h * 0.9, 0.002, rng);
  HIS_bloodFill(g, 0, g.h * 0.8, g.h * 0.9, 0.002, rng);

  if (chorda) {                                            // a cord: dense parallel collagen
    const R = g.power === 400 ? 190 : g.power === 100 ? 150 : 120;
    HIS_band(g, HIS_at(HIS_wave(R * 0.06, 0.004, 0.3), -R), HIS_at(HIS_wave(R * 0.06, 0.004, 1.1), R),
      HIS_css(HIS_PAL.eosPale, 1.03));
    HIS_collagen(g, -g.h * 1.2, 0, g.h * 1.2, 0, g.power === 400 ? 80 : 200, rng,
      { span: R * 0.85, w: g.power === 400 ? 5 : 2.6, crimp: 6, period: 160, tone: HIS_PAL.eosPale });
    for (let x = -g.h; x < g.h; x += 44) {
      HIS_nucleus(g, x + rng() * 20, (rng() - 0.5) * R * 1.5, 6, 1.4, 0, { tone: HIS_PAL.hemDense, rng: rng });
    }
    [-1, 1].forEach(function (s) {
      const pts = [];
      for (let x = -g.h * 1.1; x <= g.h * 1.1; x += 8) pts.push([x, s * R + HIS_wave(R * 0.06, 0.004, s > 0 ? 1.1 : 0.3)(x)]);
      HIS_path(ctx, pts, false);
      ctx.lineWidth = Math.max(g.px, 2); ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.6); ctx.stroke();
      HIS_walk(pts, 26, s, function (x, y, nx, ny) {
        HIS_nucleus(g, x + nx * 2, y + ny * 2, 3.6, 1.4, Math.atan2(ny, nx), { rng: rng });
      });
    });
    g.mark(0, 0, R * 0.7, 'chorda');
    g.mark(g.h * 0.4, -R, 8, 'endothelium');
    g.mark(-g.h * 0.3, 0, 8, 'fibrocyte');
    return;
  }

  const T = g.power === 400 ? 210 : g.power === 100 ? 170 : 130;   // leaflet half-thickness
  const wav = HIS_wave(T * 0.12, 0.003, 0.7);
  // ventricularis (inflow, top): elastin-rich
  HIS_band(g, HIS_at(wav, -T), HIS_at(wav, -T * 0.45), HIS_css(HIS_PAL.eosPale, 0.98));
  for (let i = 0; i < (g.power === 400 ? 26 : 60); i++) {
    const y = -T + rng() * T * 0.5;
    ctx.beginPath();
    for (let x = -g.h * 1.1; x <= g.h * 1.1; x += 20) ctx.lineTo(x, y + wav(x) + Math.sin(x * 0.02 + y) * 5);
    ctx.lineWidth = Math.max(g.px, 2.4); ctx.strokeStyle = HIS_css(HIS_PAL.elastic, 1, 0.6); ctx.stroke();
  }
  g.mark(-g.h * 0.4, -T * 0.72, T * 0.25, 'ventricularis');
  // spongiosa: pale, loose, GAG-rich — the shear layer
  HIS_band(g, HIS_at(wav, -T * 0.45), HIS_at(wav, T * 0.15), HIS_css(HIS_PAL.cartilage, 1.06, 0.55));
  g.mark(g.h * 0.2, -T * 0.15, T * 0.25, 'spongiosa');
  // fibrosa: dense collagen on the outflow face
  HIS_band(g, HIS_at(wav, T * 0.15), HIS_at(wav, T), HIS_css(HIS_PAL.eosPale, 1.03));
  HIS_collagen(g, -g.h * 1.2, T * 0.6, g.h * 1.2, T * 0.6, g.power === 400 ? 60 : 150, rng,
    { span: T * 0.35, w: g.power === 400 ? 4.5 : 2.6, crimp: 8, period: 150, tone: HIS_PAL.eosPale });
  g.mark(0, T * 0.6, T * 0.3, 'fibrosa');
  // interstitial cells scattered through all three layers
  for (let i = 0; i < (g.power === 400 ? 40 : 90); i++) {
    const x = (rng() - 0.5) * g.h * 2.2, y = (rng() - 0.9) * T * 0.95 + T * 0.05;
    HIS_nucleus(g, x, y + wav(x), 5, 1.6, (rng() - 0.5) * 0.4, { tone: HIS_PAL.hemDense, rng: rng });
    if (rng() < 0.05) g.mark(x, y + wav(x), 7, 'valve-interstitial');
  }
  [-1, 1].forEach(function (s) {                            // endothelium on both faces
    const pts = [];
    for (let x = -g.h * 1.1; x <= g.h * 1.1; x += 8) pts.push([x, s * T + wav(x)]);
    HIS_path(ctx, pts, false);
    ctx.lineWidth = Math.max(g.px, 2); ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.55); ctx.stroke();
    HIS_walk(pts, g.power === 400 ? 22 : 40, s, function (x, y, nx, ny, i) {
      HIS_nucleus(g, x + nx * 2, y + ny * 2, 4, 1.4, Math.atan2(ny, nx), { rng: rng });
      if (i === 4 && s < 0) g.mark(x, y, 7, 'valve-endothelium');
    });
  });
}

/* ================================= SPLEEN ==================================
 * Two tissues in one organ: white pulp (lymphocytes sleeved around a central
 * arteriole — basophilic because it is almost all nuclei) islanded in red pulp
 * (cords and sinusoids stuffed with red cells). Finding the central arteriole is
 * what proves a pale nodule is splenic white pulp and not something else. */
function HIS_drawSpleen(g) {
  const ctx = g.ctx, rng = g.rng, frog = g.species === 'frog';
  ctx.fillStyle = HIS_css(HIS_PAL.eos, 1.0);
  ctx.fillRect(-g.h * 1.1, -g.h * 1.1, g.h * 2.2, g.h * 2.2);
  // red pulp: cords of Billroth between wide, gapped sinusoids
  HIS_bloodFill(g, 0, 0, g.h * 1.5, g.power === 40 ? 0.0006 : 0.004, rng);
  HIS_grain(g, -g.h * 1.1, -g.h * 1.1, g.h * 1.1, g.h * 1.1, g.power === 40 ? 0.00012 : 0.0006, rng, HIS_PAL.hem, 3.2);
  for (let i = 0; i < (g.power === 40 ? 60 : 26); i++) {     // sinusoids: elongated pale channels
    const x = (rng() - 0.5) * g.h * 2, y = (rng() - 0.5) * g.h * 2, a = rng() * 3.14;
    const L = g.h * (0.1 + rng() * 0.2);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, 0, L, g.h * 0.022, 0, 0, 6.283);
    ctx.fillStyle = HIS_css(HIS_PAL.glass, 1, 0.5); ctx.fill();
    ctx.lineWidth = g.px; ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.3); ctx.stroke();
    ctx.restore();
    if (i === 3) g.mark(x, y, g.h * 0.06, 'splenic-sinusoid');
  }
  g.mark(g.h * 0.55, -g.h * 0.5, g.h * 0.12, 'red-pulp');
  g.mark(-g.h * 0.6, g.h * 0.5, g.h * 0.06, 'splenic-cord');

  const nodR = frog ? g.h * 0.16 : g.h * 0.22;
  const pitch = nodR * 3.4;
  for (let y = -g.h; y < g.h + pitch; y += pitch) {
    for (let x = -g.h; x < g.h + pitch; x += pitch) {
      const cx = x + (rng() - 0.5) * pitch * 0.4, cy = y + (rng() - 0.5) * pitch * 0.4;
      const R = nodR * (0.75 + rng() * 0.5);
      HIS_blob(ctx, cx, cy, R, R * 0.92, 14, 0.14, rng);
      ctx.fillStyle = HIS_css(HIS_PAL.baso, 0.9, 0.92); ctx.fill();
      // lymphocytes: tiny, almost all nucleus
      const n = Math.min(2600, Math.round(R * R * 0.012));
      for (let i = 0; i < n; i++) {
        const a = rng() * 6.283, d = Math.sqrt(rng()) * R;
        HIS_nucleus(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 3, 3, 0, { tone: HIS_PAL.hemDense, rng: rng });
      }
      if (!frog && rng() < 0.6) {                            // germinal centre: paler, proliferating
        ctx.beginPath(); ctx.arc(cx - R * 0.2, cy, R * 0.42, 0, 6.283);
        ctx.fillStyle = HIS_css(HIS_PAL.baso, 1.18, 0.55); ctx.fill();
        g.mark(cx - R * 0.2, cy, R * 0.35, 'germinal-centre');
      }
      // the central arteriole — eccentric, which is the giveaway
      const ax = cx + R * 0.4, ay = cy + R * 0.2;
      HIS_tubule(g, ax, ay, R * 0.2, R * 0.09, { tone: HIS_PAL.muscleSm, cellW: R * 0.1, nucR: R * 0.035 }, rng);
      g.mark(ax, ay, R * 0.2, 'central-arteriole');
      g.mark(cx, cy, R * 0.8, 'white-pulp');
      if (rng() < 0.4) g.mark(cx + R * 0.5, cy - R * 0.5, 5, 'lymphocyte');
    }
  }
  if (frog) {                                                // melanomacrophage centres again
    for (let i = 0; i < 10; i++) {
      const mx = (rng() - 0.5) * g.h * 2, my = (rng() - 0.5) * g.h * 2;
      for (let k = 0; k < 30; k++) {
        ctx.beginPath();
        ctx.arc(mx + (rng() - 0.5) * g.h * 0.06, my + (rng() - 0.5) * g.h * 0.06, g.h * 0.004 + rng() * g.h * 0.005, 0, 6.283);
        ctx.fillStyle = HIS_css(HIS_PAL.pigment, 1, 0.85); ctx.fill();
      }
      if (i === 2) g.mark(mx, my, g.h * 0.04, 'melanomacrophage');
    }
  }
  // capsule + a trabecula running in from it
  HIS_band(g, function () { return -g.h * 0.99; }, function () { return -g.h * 0.9; }, HIS_css(HIS_PAL.eosPale, 1.02));
  HIS_collagen(g, -g.h, -g.h * 0.945, g.h, -g.h * 0.945, 40, rng, { span: g.h * 0.03, w: 2.6, tone: HIS_PAL.eosPale });
  g.mark(0, -g.h * 0.945, g.h * 0.05, 'capsule');
  ctx.beginPath();
  ctx.moveTo(-g.h * 0.3, -g.h * 0.9);
  ctx.quadraticCurveTo(-g.h * 0.15, -g.h * 0.3, -g.h * 0.25, g.h * 0.2);
  ctx.lineWidth = g.h * 0.05; ctx.strokeStyle = HIS_css(HIS_PAL.eosPale, 1.02); ctx.stroke();
  g.mark(-g.h * 0.2, -g.h * 0.4, g.h * 0.05, 'trabecula');
}

/* ================================== BONE ===================================
 * Decalcified compact bone. The osteon is the unit: concentric lamellae round a
 * central canal, osteocytes in lacunae with canaliculi radiating between them —
 * because nothing diffuses through mineralised matrix, every cell has to be
 * plumbed. Interstitial lamellae between osteons are the wreckage of older
 * osteons, which is the visible evidence that bone is continuously rebuilt. */
function HIS_drawBone(g) {
  const ctx = g.ctx, rng = g.rng;
  ctx.fillStyle = HIS_css(HIS_PAL.bone, 1.0);
  ctx.fillRect(-g.h * 1.1, -g.h * 1.1, g.h * 2.2, g.h * 2.2);
  for (let i = 0; i < 300; i++) {                            // interstitial lamellae as a background weave
    const x = (rng() - 0.5) * g.h * 2.2, y = (rng() - 0.5) * g.h * 2.2, a = rng() * 3.14;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(-g.h * 0.14, 0); ctx.lineTo(g.h * 0.14, 0);
    ctx.lineWidth = Math.max(g.px, g.h * 0.006);
    ctx.strokeStyle = HIS_css(HIS_PAL.bone, 0.9 + rng() * 0.16, 0.5); ctx.stroke();
    ctx.restore();
  }
  g.mark(g.h * 0.7, -g.h * 0.7, g.h * 0.1, 'interstitial-lamella');

  const osR = g.power === 400 ? 220 : 140;                   // osteon radius ~150 µm (300 µm across)
  const pitch = osR * 2.3;
  for (let y = -g.h - pitch; y < g.h + pitch; y += pitch * 0.92) {
    for (let x = -g.h - pitch; x < g.h + pitch; x += pitch) {
      const cx = x + (rng() - 0.5) * pitch * 0.3 + ((Math.round(y / pitch) % 2) ? pitch * 0.5 : 0);
      const cy = y + (rng() - 0.5) * pitch * 0.3;
      const R = osR * (0.8 + rng() * 0.4);
      HIS_blob(ctx, cx, cy, R, R * 0.95, 16, 0.07, rng);
      ctx.fillStyle = HIS_vary(HIS_PAL.bone, rng, 0.07); ctx.fill();
      ctx.lineWidth = Math.max(g.px, 2.2);                    // cement line
      ctx.strokeStyle = HIS_css(HIS_PAL.hem, 1, 0.35); ctx.stroke();
      const nLam = 7;
      for (let k = 1; k <= nLam; k++) {
        const rr = R * (1 - k / (nLam + 1.4));
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.283);
        ctx.lineWidth = Math.max(g.px, 1.6);
        ctx.strokeStyle = HIS_css(HIS_PAL.bone, 0.86, 0.65); ctx.stroke();
        // osteocytes sit between the lamellae, their long axis following them
        const nOc = Math.max(4, Math.round(6.283 * rr / (g.power === 400 ? 46 : 60)));
        for (let i = 0; i < nOc; i++) {
          const a = i / nOc * 6.283 + rng() * 0.2;
          const lx = cx + Math.cos(a) * rr, ly = cy + Math.sin(a) * rr;
          if (g.power === 400) {                              // canaliculi radiating from the lacuna
            for (let c = 0; c < 8; c++) {
              const ca = a + (c / 8) * 6.283;
              ctx.beginPath(); ctx.moveTo(lx, ly);
              ctx.lineTo(lx + Math.cos(ca) * 13, ly + Math.sin(ca) * 13);
              ctx.lineWidth = g.px * 0.8; ctx.strokeStyle = HIS_css(HIS_PAL.hemDense, 1, 0.35); ctx.stroke();
            }
          }
          ctx.beginPath();
          ctx.ellipse(lx, ly, 6.5, 2.8, a + 1.5708, 0, 6.283);
          ctx.fillStyle = HIS_css(HIS_PAL.hemDense, 1, 0.9); ctx.fill();
          if (rng() < 0.012) g.mark(lx, ly, 7, 'osteocyte');
          if (rng() < 0.01) g.mark(lx, ly, 7, 'lacuna');
          if (rng() < 0.008 && g.power === 400) g.mark(lx + 9, ly, 4, 'canaliculus');
        }
        if (k === 2 && rng() < 0.4) g.mark(cx + rr, cy, 6, 'lamella');
      }
      const hc = R * 0.16;                                    // Haversian canal + its vessel
      ctx.beginPath(); ctx.arc(cx, cy, hc, 0, 6.283);
      ctx.fillStyle = HIS_css(HIS_PAL.glass, 1); ctx.fill();
      ctx.lineWidth = Math.max(g.px, 1.6); ctx.strokeStyle = HIS_css(HIS_PAL.bone, 0.8, 0.8); ctx.stroke();
      HIS_rbc(g, cx, cy, rng() * 3, rng);
      g.mark(cx, cy, hc, 'haversian-canal');
      if (rng() < 0.3) g.mark(cx + R * 0.6, cy, R * 0.25, 'osteon');
    }
  }
  if (g.power === 40) {                                       // periosteum along the top edge
    HIS_band(g, function () { return -g.h * 1.05; }, HIS_at(HIS_wave(20, 0.002, 0.4), -g.h * 0.86),
      HIS_css(HIS_PAL.eosPale, 1.02));
    HIS_collagen(g, -g.h, -g.h * 0.93, g.h, -g.h * 0.93, 70, rng, { span: 50, w: 3, tone: HIS_PAL.eosPale });
    for (let x = -g.h; x < g.h; x += 40) HIS_nucleus(g, x + rng() * 20, -g.h * 0.88, 5, 1.6, 0, { rng: rng });
    g.mark(0, -g.h * 0.93, 60, 'periosteum');
    // Volkmann's canal running transversely in from the surface
    ctx.beginPath();
    ctx.moveTo(g.h * 0.1, -g.h * 0.86); ctx.quadraticCurveTo(g.h * 0.2, -g.h * 0.4, g.h * 0.12, -g.h * 0.1);
    ctx.lineWidth = 26; ctx.strokeStyle = HIS_css(HIS_PAL.glass, 1); ctx.stroke();
    g.mark(g.h * 0.17, -g.h * 0.45, 20, 'volkmann-canal');
    g.mark(-g.h * 0.7, g.h * 0.8, g.h * 0.12, 'marrow');
  }
}

/* =============================== UROTHELIUM ================================
 * Transitional epithelium — the only epithelium that changes its apparent number
 * of layers. Relaxed, it looks 5–6 cells thick with big domed umbrella cells on
 * top; distended, the layers slide over each other and it looks almost squamous.
 * The umbrella cell's thickened luminal membrane is what makes urine harmless. */
function HIS_drawUrothelium(g) {
  const ctx = g.ctx, rng = g.rng;
  const top = g.power === 400 ? -60 : g.power === 100 ? -220 : -700;
  g.shift(0, -top - g.h);
  ctx.fillStyle = HIS_css(HIS_PAL.glass, 1);
  ctx.fillRect(-g.h * 1.1, top - 20, g.h * 2.2, 7000);
  const surf = HIS_at(HIS_wave(g.power === 400 ? 14 : 40, 0.006, 0.8), 0);
  const epiH = 62;
  const bm = HIS_at(HIS_wave(g.power === 400 ? 10 : 34, 0.005, 2.1), epiH);

  HIS_band(g, bm, function () { return 620; }, HIS_css(HIS_PAL.eosPale, 1.03));
  HIS_collagen(g, -g.h, 200, g.h, 200, g.power === 400 ? 50 : 130, rng,
    { span: 130, w: 2.8, crimp: 6, tone: HIS_PAL.eosPale });
  HIS_grain(g, -g.h, epiH, g.h, 620, 0.0004, rng, HIS_PAL.hem, 3);
  g.mark(-g.h * 0.4, 200, 60, 'lamina-propria');
  HIS_band(g, function () { return 620; }, function () { return 2200; }, HIS_css(HIS_PAL.muscleSm, 1));
  for (let i = 0; i < 26; i++) {                             // detrusor: interlacing bundles
    const bx = (rng() - 0.5) * g.h * 2.2, by = 680 + rng() * 1400, a = rng() * 3.14;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, 0, 160, 46, 0, 0, 6.283);
    ctx.fillStyle = HIS_vary(HIS_PAL.muscleSm, rng, 0.12); ctx.fill();
    ctx.lineWidth = g.px * 1.2; ctx.strokeStyle = HIS_css(HIS_PAL.eosPale, 1, 0.7); ctx.stroke();
    for (let k = 0; k < 16; k++) HIS_nucleus(g, (rng() - 0.5) * 280, (rng() - 0.5) * 70, 8, 2.2, 0, { rng: rng });
    ctx.restore();
  }
  g.mark(0, 1200, 120, 'detrusor');

  HIS_band(g, surf, bm, HIS_css(HIS_PAL.eos, 1.04));
  g.mark(g.h * 0.55, epiH * 0.5, 14, 'urothelium');
  // basal cells: small cuboidal on the basement membrane
  for (let x = -g.h * 1.1; x < g.h * 1.1; x += 9) {
    HIS_nucleus(g, x, bm(x) - 5, 3, 3.2, 0, { rng: rng });
  }
  g.mark(-g.h * 0.2, bm(-g.h * 0.2) - 5, 6, 'basal-cell');
  // intermediate cells: pear-shaped, two or three rows
  for (let r = 0; r < 3; r++) {
    for (let x = -g.h * 1.1; x < g.h * 1.1; x += 12) {
      const y = bm(x) - 14 - r * 12;
      HIS_nucleus(g, x + rng() * 6, y, 3.6, 4.4, 0, { rng: rng, vesicular: true });
    }
  }
  g.mark(g.h * 0.1, epiH * 0.45, 8, 'intermediate-cell');
  // umbrella cells: big, domed, often binucleate, with a dense luminal crust
  for (let x = -g.h * 1.15; x < g.h * 1.15; x += 34) {
    const cx = x + rng() * 8, y = surf(cx);
    ctx.beginPath();
    ctx.moveTo(cx - 17, y + 16);
    ctx.quadraticCurveTo(cx, y - 5, cx + 17, y + 16);
    ctx.lineTo(cx + 17, y + 20); ctx.lineTo(cx - 17, y + 20); ctx.closePath();
    ctx.fillStyle = HIS_vary(HIS_PAL.eos, rng, 0.1); ctx.fill();
    ctx.lineWidth = g.px; ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.35); ctx.stroke();
    ctx.beginPath();                                          // the crust: thickened apical membrane
    ctx.moveTo(cx - 17, y + 16); ctx.quadraticCurveTo(cx, y - 5, cx + 17, y + 16);
    ctx.lineWidth = Math.max(g.px, g.power === 400 ? 2.6 : 1.4);
    ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 0.85, 0.9); ctx.stroke();
    if (rng() < 0.4) {
      HIS_nucleus(g, cx - 5, y + 12, 3.4, 3.4, 0, { rng: rng, vesicular: true });
      HIS_nucleus(g, cx + 5, y + 12, 3.4, 3.4, 0, { rng: rng, vesicular: true });
    } else HIS_nucleus(g, cx, y + 12, 4, 3.6, 0, { rng: rng, vesicular: true });
    if (rng() < 0.14) g.mark(cx, y + 10, 14, 'umbrella-cell');
  }
}

/* =============================== GALL BLADDER ==============================
 * Tall simple columnar with a brush border and NO goblet cells — the contrast
 * with intestine again. Deep mucosal folds, a thin lamina propria, a thin
 * irregular muscle coat, and no muscularis mucosae and no submucosa at all. */
function HIS_drawGall(g) {
  const ctx = g.ctx, rng = g.rng;
  const top = g.power === 400 ? -140 : g.power === 100 ? -520 : -1600;
  g.shift(0, -top - g.h);
  ctx.fillStyle = HIS_css(HIS_PAL.bile, 1.0, 0.16);         // bile-tinged lumen
  ctx.fillRect(-g.h * 1.1, top - 20, g.h * 2.2, 8000);
  const base = HIS_at(HIS_wave(24, 0.004, 0.5), 0);
  HIS_band(g, base, function () { return 260; }, HIS_css(HIS_PAL.eosPale, 1.03));
  HIS_band(g, function () { return 260; }, function () { return 620; }, HIS_css(HIS_PAL.muscleSm, 1));
  HIS_grain(g, -g.h, 10, g.h, 260, 0.0007, rng, HIS_PAL.hem, 3);
  g.mark(-g.h * 0.4, 130, 40, 'lamina-propria');
  g.mark(g.h * 0.3, 440, 50, 'smooth-cross');

  const pitch = 260;
  for (let x = -g.h - pitch; x < g.h + pitch; x += pitch) {   // tall branching mucosal folds
    const bx = x + rng() * 40, hgt = 200 * (0.7 + rng() * 0.7), w = 60;
    const pts = [];
    for (let i = 0; i <= 22; i++) {
      const t = i / 22, ang = Math.PI * t;
      pts.push([bx - Math.cos(ang) * w / 2, base(bx) - Math.sin(ang) * hgt]);
    }
    HIS_path(ctx, [[bx - w / 2, base(bx)]].concat(pts, [[bx + w / 2, base(bx)]]), true);
    ctx.fillStyle = HIS_css(HIS_PAL.eosPale, 1.02); ctx.fill();
    HIS_grain(g, bx - w / 2, base(bx) - hgt, bx + w / 2, base(bx), 0.0012, rng, HIS_PAL.hemDense, 3);
    HIS_walk([[bx - w / 2, base(bx)]].concat(pts, [[bx + w / 2, base(bx)]]), 8, -1,
      function (px, py, nx, ny, i) {
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + nx * 24, py + ny * 24);
        ctx.lineWidth = 8.4; ctx.strokeStyle = HIS_vary(HIS_PAL.eos, rng, 0.1); ctx.stroke();
        HIS_nucleus(g, px + nx * 7, py + ny * 7, 2.8, 4.2, Math.atan2(ny, nx), { rng: rng, vesicular: true });
        ctx.beginPath();
        ctx.moveTo(px + nx * 24, py + ny * 24); ctx.lineTo(px + nx * 26, py + ny * 26);
        ctx.lineWidth = 8.4; ctx.strokeStyle = HIS_css(HIS_PAL.eosDeep, 1, 0.7); ctx.stroke();
        if (i === 6 && Math.abs(bx) < pitch) { g.mark(px + nx * 12, py + ny * 12, 7, 'enterocyte'); }
      });
    if (Math.abs(bx) < pitch) g.mark(bx, base(bx) - hgt * 0.8, w * 0.4, 'mucosal-fold');
  }
}

/* ---- the slide catalogue ---------------------------------------------------
 * `look` is the diagnostic instruction for each power: what a student is
 * supposed to be able to say about the field they are looking at. It is shown in
 * the readout, so the microscope always answers "what am I meant to see here?"
 * even when nothing is hovered. */
const HIS_SLIDES = {
  epidermis: { name: 'Skin', stain: 'H&E', draw: HIS_drawEpidermis, opt: {},
    look: { 40: 'Find the three zones: epithelium, dermis, and what lies under the dermis.',
            100: 'Follow the wavy junction between epidermis and dermis — and count the glands.',
            400: 'Name the strata from the surface down; find the single basal row of stem cells.' } },
  'squamous-mucosa': { name: 'Oesophagus — stratified squamous mucosa', stain: 'H&E', draw: HIS_drawEpidermis, opt: { mucosa: true },
    look: { 40: 'A thick pale epithelium over a folded mucosa.',
            100: 'Note the connective-tissue papillae pushing up into the epithelium.',
            400: 'No keratin layer and no granular layer: the surface cells still have nuclei. That is what "non-keratinised" means.' } },
  intestine: { name: 'Small intestine', stain: 'H&E', draw: HIS_drawIntestine, opt: {},
    look: { 40: 'A tube. Read the wall outwards: mucosa, submucosa, two muscle coats, serosa.',
            100: 'Count the surface multipliers — folds, then villi.',
            400: 'Find the brush border and the goblet cells; these two together identify small intestine.' } },
  gastric: { name: 'Stomach — fundic mucosa', stain: 'H&E', draw: HIS_drawGastric, opt: {},
    look: { 40: 'Mucosa of straight tubular glands — no villi anywhere.',
            100: 'Pits above, glands below; the junction is the neck.',
            400: 'Pink round parietal cells high in the gland, blue chief cells at the base. No goblet cells: that rules out intestine.' } },
  liver: { name: 'Liver', stain: 'H&E', draw: HIS_drawLiver, opt: {},
    look: { 40: 'Hexagonal lobules. Central vein in the middle, portal triads at the corners.',
            100: 'Cords radiating outward and sinusoids between them — blood runs triad to centre.',
            400: 'Polygonal cells, round central nuclei, prominent nucleoli, and a scatter of binucleate cells.' } },
  cardiac: { name: 'Cardiac muscle', stain: 'H&E', draw: HIS_drawCardiac, opt: {},
    look: { 40: 'One section cuts the myocardium in every plane at once — longitudinal, oblique, transverse.',
            100: 'Watch fibres split and rejoin. Skeletal muscle never does that.',
            400: 'Intercalated discs, one central nucleus per cell, a clear perinuclear halo.' } },
  skeletal: { name: 'Skeletal muscle', stain: 'H&E', draw: HIS_drawSkeletal, opt: {},
    look: { 40: 'Fascicles wrapped in perimysium — the visible grain of meat.',
            100: 'Long parallel fibres that never branch.',
            400: 'Sharp cross-striations, and every nucleus pushed to the edge of the fibre.' } },
  smooth: { name: 'Smooth muscle', stain: 'H&E', draw: HIS_drawSmooth, opt: {},
    look: { 40: 'Two blocks of the same tissue cut at right angles to each other.',
            100: 'No striations anywhere — that alone excludes both striated muscles.',
            400: 'Longitudinal: one central cigar nucleus. Transverse: unequal circles, only the widest with a nucleus.' } },
  adipose: { name: 'Adipose tissue', stain: 'H&E', draw: HIS_drawAdipose, opt: {},
    look: { 40: 'Lobules of empty rings divided by fibrous septa carrying the vessels.',
            100: 'A foam: cells flatten against each other where they touch.',
            400: 'Signet rings — the lipid dissolved in processing and the nucleus is crushed against the rim.' } },
  lung: { name: 'Lung', stain: 'H&E', draw: HIS_drawLung, opt: {},
    look: { 40: 'Mostly air. Find the conducting airway and its companion artery.',
            100: 'The septa are the tissue; the holes are the point of the organ.',
            400: 'Flat type I cells, rounded type II cells in the corners, red cells inside the septum itself.' } },
  kidney: { name: 'Kidney — cortex', stain: 'H&E', draw: HIS_drawKidney, opt: {},
    look: { 40: 'Corpuscles scattered through a dense field of tubule profiles.',
            100: 'Each corpuscle is a tuft inside a capsule with a clear space between.',
            400: 'Proximal: darker, brush border filling the lumen, few nuclei. Distal: paler, open lumen, more nuclei.' } },
  fibrous: { name: 'Dense connective tissue', stain: 'H&E', draw: HIS_drawFibrous, opt: {},
    look: { 40: 'Almost all matrix and almost no cells.',
            100: 'Upper field: bundles in every direction (irregular). Lower field: all parallel (regular).',
            400: 'Wavy collagen with flattened dark fibrocyte nuclei trapped between the bundles.' } },
  mesothelium: { name: 'Serosa — simple squamous mesothelium', stain: 'H&E', draw: HIS_drawMesothelium, opt: {},
    look: { 40: 'The lining is not visible at this power. That is the lesson.',
            100: 'A hairline over the organ, with a thin layer of loose tissue beneath it.',
            400: 'One cell layer, about a micrometre thick; only the nuclei bulge enough to see.' } },
  cartilage: { name: 'Hyaline cartilage', stain: 'H&E', draw: HIS_drawCartilage, opt: {},
    look: { 40: 'A plate of blue-purple matrix with a fibrous perichondrium on each face.',
            100: 'Cells are flattened and single near the surface, large and grouped in the middle.',
            400: 'Chondrocytes in lacunae, nests of two to four, and a darker collar of territorial matrix.' } },
  artery: { name: 'Muscular artery', stain: 'H&E', draw: HIS_drawVessel, opt: { kind: 'muscular' },
    look: { 40: 'A round, patent lumen and a thick wall — compare that ratio with the vein slide.',
            100: 'The wavy line at the inner edge of the media is the internal elastic lamina.',
            400: 'Read the wall outwards: endothelium, elastic lamina, concentric muscle, adventitia.' } },
  'elastic-artery': { name: 'Elastic artery (aorta)', stain: 'H&E', draw: HIS_drawVessel, opt: { kind: 'elastic' },
    look: { 40: 'A very thick wall with a faintly banded media.',
            100: 'Dozens of concentric elastic lamellae — this is a pressure reservoir, not a pipe.',
            400: 'Lamella, muscle, lamella, repeated. Systolic energy is stored here and returned in diastole.' } },
  vein: { name: 'Vein', stain: 'H&E', draw: HIS_drawVessel, opt: { kind: 'vein' },
    look: { 40: 'Wide, often collapsed lumen with a thin wall.',
            100: 'The media is thin and the adventitia is the thickest layer — the reverse of an artery.',
            400: 'No convincing internal elastic lamina; only a few muscle layers.' } },
  valve: { name: 'Cardiac valve leaflet', stain: 'H&E', draw: HIS_drawValve, opt: {},
    look: { 40: 'A thin avascular flap with blood on both sides of it.',
            100: 'Three layers with different textures — dense, loose, elastic.',
            400: 'Fibrosa takes the load, spongiosa lets the layers shear, ventricularis recoils.' } },
  chorda: { name: 'Chorda tendinea', stain: 'H&E', draw: HIS_drawValve, opt: { chorda: true },
    look: { 40: 'A cord in cross-view, blood all around it.',
            100: 'Parallel collagen — this is a tension member, nothing else.',
            400: 'Flattened fibrocytes between the bundles and a continuous endothelial cover.' } },
  spleen: { name: 'Spleen', stain: 'H&E', draw: HIS_drawSpleen, opt: {},
    look: { 40: 'Blue islands in a red sea — white pulp in red pulp.',
            100: 'Find the arteriole inside each blue island; that proves it is white pulp.',
            400: 'Red pulp is packed with erythrocytes; the sinusoid walls are deliberately gapped.' } },
  bone: { name: 'Compact bone', stain: 'H&E, decalcified', draw: HIS_drawBone, opt: {},
    look: { 40: 'Concentric rings tiling the field, with periosteum at the surface.',
            100: 'Each ring set is one osteon around one canal.',
            400: 'Osteocytes in lacunae with canaliculi reaching between them — nothing diffuses through mineral.' } },
  urothelium: { name: 'Urinary bladder — urothelium', stain: 'H&E', draw: HIS_drawUrothelium, opt: {},
    look: { 40: 'A folded mucosa over thick interlacing muscle.',
            100: 'The epithelium is several cells thick and evenly so.',
            400: 'Large domed umbrella cells on top, often binucleate, with a thickened luminal membrane.' } },
  gallbladder: { name: 'Gall bladder', stain: 'H&E', draw: HIS_drawGall, opt: {},
    look: { 40: 'Deep branching mucosal folds and a thin wall.',
            100: 'No muscularis mucosae and no submucosa — unusual for a hollow viscus.',
            400: 'Tall columnar cells with a brush border and no goblet cells at all.' } },
};

/* Resolve a part to a slide. Explicit map, then id patterns, then the tissue
 * class anatomy.js already assigned — so a part added later still opens
 * something defensible rather than throwing. */
function HIS_slideFor(partId, meta) {
  const id = String(partId || '');
  // An explicit slide key in meta.tissue OVERRIDES the part map. main.js passes
  // `tissue: diseased || part.tissue`, so a pathology module naming a specific
  // section must win — otherwise a diseased liver would still show a textbook
  // one, which is the opposite of what the caller asked for.
  if (meta && meta.tissue && HIS_SLIDES[meta.tissue]) return { key: meta.tissue, rec: HIS_SLIDES[meta.tissue] };
  let key = HIS_MAP[id];
  if (!key) {
    for (let i = 0; i < HIS_PATTERNS.length; i++) {
      if (HIS_PATTERNS[i][0].test(id)) { key = HIS_PATTERNS[i][1]; break; }
    }
  }
  if (!key && meta && meta.tissue) {
    // meta.tissue may be a TIS_TISSUE class from anatomy.js, or already a slide key.
    key = HIS_BY_TISSUE[meta.tissue] || (HIS_SLIDES[meta.tissue] ? meta.tissue : null);
  }
  if (!key || !HIS_SLIDES[key]) key = 'fibrous';
  return { key: key, rec: HIS_SLIDES[key] };
}
function HIS_speciesFor(partId, meta) {
  // main.js passes the SPECIMEN id ('frog' | 'heart'), not a species name, so
  // normalise rather than trusting the string: anything that is not the frog is
  // drawn with mammalian histology.
  const s = meta && meta.species;
  if (s) return String(s).toLowerCase().indexOf('frog') === 0 ? 'frog' : 'mammal';
  return HIS_FROG_RE.test(String(partId || '')) ? 'frog' : 'mammal';
}
/* Scale bar: pick the largest round length that stays under a third of the
 * field. A bar you cannot compare against the image is decoration. */
function HIS_barFor(fov, fieldPx) {
  const perPx = fov / fieldPx;
  for (let i = 0; i < HIS_BARS.length; i++) {
    const px = HIS_BARS[i] / perPx;
    if (px < fieldPx * 0.34 && px > 54) return { um: HIS_BARS[i], px: px };
  }
  return { um: HIS_BARS[HIS_BARS.length - 1], px: HIS_BARS[HIS_BARS.length - 1] / perPx };
}

/* ---- the optics ------------------------------------------------------------
 * What separates "a drawing in a circle" from "down a microscope": the field
 * stop is a hard round edge, the periphery is genuinely out of focus (no
 * objective is flat to the edge), there is a faint blue-white halo of chromatic
 * aberration at the rim, and there is dust on the coverslip in a different focal
 * plane from the tissue. All of it is drawn once per regeneration, never per
 * frame. */
function HIS_optics(dest, art, soft, R, rng) {
  const w = dest.width, h = dest.height, cx = w / 2, cy = h / 2;
  const ctx = dest.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.clip();
  ctx.drawImage(art, 0, 0);

  // peripheral defocus: blur a copy and mask it in only towards the rim
  const s = soft.getContext('2d');
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.clearRect(0, 0, w, h);
  // A modern plan objective is close to flat: only the last few percent of the
  // field softens. The first version blurred from 0.6R with a large kernel and
  // the result read as a soap bubble rather than a slide — the tissue must be
  // crisp essentially everywhere.
  try { s.filter = 'blur(' + Math.max(0.8, R * 0.005) + 'px)'; } catch (e) { /* older engine: no filter */ }
  s.drawImage(art, 0, 0);
  try { s.filter = 'none'; } catch (e) { /* ignore */ }
  s.globalCompositeOperation = 'destination-in';
  const mask = s.createRadialGradient(cx, cy, R * 0.88, cx, cy, R);
  mask.addColorStop(0, 'rgba(0,0,0,0)');
  mask.addColorStop(1, 'rgba(0,0,0,1)');
  s.fillStyle = mask; s.fillRect(0, 0, w, h);
  s.globalCompositeOperation = 'source-over';
  ctx.drawImage(soft, 0, 0);

  // illumination falls off towards the field stop on every real condenser
  const vig = ctx.createRadialGradient(cx, cy, R * 0.62, cx, cy, R);
  vig.addColorStop(0, 'rgba(10,6,14,0)');
  vig.addColorStop(0.86, 'rgba(10,6,14,0.055)');
  vig.addColorStop(1, 'rgba(6,4,10,0.30)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);

  // dust and a fibre on the coverslip — in a different focal plane, so soft
  for (let i = 0; i < 5; i++) {
    const a = rng() * 6.283, d = Math.sqrt(rng()) * R * 0.92;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, R * (0.004 + rng() * 0.006), 0, 6.283);
    ctx.fillStyle = 'rgba(30,22,30,0.20)'; ctx.fill();
  }
  ctx.restore();

  // field stop: a hard edge with a whisper of chromatic fringing just inside it
  ctx.beginPath(); ctx.arc(cx, cy, R - 1, 0, 6.283);
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(150,215,235,0.16)'; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, 6.283);
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke();
}

/* ---- chrome ---------------------------------------------------------------
 * Injected by the module rather than added to SHELL_CSS, so histology.js drops
 * into the build without touching another file. Palette variables come from the
 * host page (:root), so the microscope matches the theatre automatically. */
const HIS_CSS = `
#his{position:fixed;inset:0;z-index:120;display:none;font-family:var(--sans);
     background:radial-gradient(58% 58% at 50% 50%,rgba(10,16,22,.92) 0%,rgba(4,7,10,.985) 62%,#020406 100%);
     -webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
#his.on{display:block}
#his .fade{opacity:0;transition:opacity .28s ease}
#his.ready .fade{opacity:1}
#hisSlide{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
     border-radius:50%;will-change:filter,transform;
     box-shadow:0 0 0 1px rgba(255,255,255,.05),0 40px 120px -30px rgba(0,0,0,.9),
                0 0 90px -20px rgba(56,224,216,.10)}
#hisHud{position:absolute;inset:0;pointer-events:none}
#hisHit{position:absolute;inset:0;cursor:crosshair;outline:none}

#his .panel{position:absolute;background:var(--glass);border:1px solid var(--line);border-radius:12px;
     backdrop-filter:blur(18px) saturate(1.1);-webkit-backdrop-filter:blur(18px) saturate(1.1);
     box-shadow:0 14px 44px -18px rgba(0,0,0,.75)}
#his .k{font-family:var(--mono);font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--faint)}
#his .k.em{color:var(--em)}

#hisTop{left:22px;top:20px;padding:12px 16px;min-width:250px;max-width:34vw}
#hisTop h3{margin:6px 0 3px;font-size:15px;font-weight:600;color:var(--ink);letter-spacing:-.01em}
#hisTop .sub{font-family:var(--mono);font-size:10px;color:var(--dim);letter-spacing:.06em}

#hisClose{position:absolute;right:22px;top:20px;width:38px;height:38px;border-radius:11px;
     display:grid;place-items:center;cursor:pointer;color:var(--dim);
     background:var(--glass);border:1px solid var(--line);transition:.15s}
#hisClose:hover,#hisClose:focus-visible{color:var(--ink);border-color:rgba(52,211,153,.45);outline:none;
     box-shadow:0 0 0 1px rgba(52,211,153,.25)}
#hisClose svg{width:15px;height:15px;stroke:currentColor;stroke-width:1.8;fill:none;stroke-linecap:round}

#hisTurret{left:22px;top:50%;transform:translateY(-50%);padding:9px;display:flex;flex-direction:column;gap:6px}
#hisTurret .obj{position:relative;width:78px;padding:9px 8px 8px;border-radius:9px;cursor:pointer;text-align:left;
     border:1px solid transparent;background:rgba(255,255,255,.02);color:var(--dim);transition:.15s}
#hisTurret .obj:hover{background:rgba(255,255,255,.06);color:var(--ink)}
#hisTurret .obj:focus-visible{outline:none;border-color:rgba(56,224,216,.5)}
#hisTurret .obj b{display:block;font-family:var(--mono);font-size:13px;font-weight:600;line-height:1.1;color:inherit}
#hisTurret .obj s{display:block;text-decoration:none;font-family:var(--mono);font-size:8.5px;
     letter-spacing:.12em;color:var(--faint);margin-top:3px}
#hisTurret .obj.on{color:var(--em);border-color:rgba(52,211,153,.45);
     background:linear-gradient(135deg,rgba(52,211,153,.17),rgba(56,224,216,.06));
     box-shadow:0 0 22px -8px rgba(52,211,153,.8)}
#hisTurret .obj.on s{color:rgba(52,211,153,.7)}

#hisScale{left:22px;bottom:22px;padding:11px 14px}
#hisBar{height:5px;border-bottom:2px solid var(--em);border-left:2px solid var(--em);
     border-right:2px solid var(--em);margin:7px 0 5px}
#hisScale .um{font-family:var(--mono);font-size:11px;color:var(--em);letter-spacing:.05em}
#hisScale .fov{font-family:var(--mono);font-size:9px;color:var(--faint);margin-top:4px}

#hisRead{right:22px;bottom:22px;width:330px;padding:14px 16px;min-height:96px}
#hisRead .name{font-size:14px;font-weight:600;color:var(--em);margin:7px 0 5px;line-height:1.3}
#hisRead .def{font-size:12px;color:var(--dim);line-height:1.6}
#hisRead .idle{font-size:12px;color:var(--dim);line-height:1.6;font-style:normal}
#hisRead .idle b{color:var(--cy);font-weight:500}

#hisFoot{left:50%;bottom:22px;transform:translateX(-50%);padding:8px 16px;display:flex;gap:16px;align-items:center}
#hisFoot span{font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;color:var(--faint);text-transform:uppercase}
#hisFoot kbd{font-family:var(--mono);font-size:9.5px;color:var(--dim);border:1px solid var(--line);
     border-radius:4px;padding:1px 5px;margin-right:5px;background:rgba(255,255,255,.03)}
#hisFocus{position:absolute;right:22px;top:50%;transform:translateY(-50%);padding:10px 8px;
     display:flex;flex-direction:column;align-items:center;gap:8px}
#hisFocusBar{width:4px;height:120px;border-radius:2px;background:rgba(255,255,255,.08);position:relative}
#hisFocusDot{position:absolute;left:50%;width:12px;height:12px;margin-left:-6px;margin-top:-6px;border-radius:50%;
     background:var(--em);box-shadow:0 0 10px rgba(52,211,153,.8);transition:top .1s}
@media (max-width:900px){#hisTop{max-width:52vw}#hisRead{width:260px}#hisFocus{display:none}}
@media (prefers-reduced-motion:reduce){#his .fade{transition:none}}
`;
let HIS_cssDone = false;
function HIS_injectCSS() {
  if (HIS_cssDone || typeof document === 'undefined') return;
  HIS_cssDone = true;
  const st = document.createElement('style');
  st.id = 'histologycss';
  st.textContent = HIS_CSS;
  document.head.appendChild(st);
}

/* Where the zoom starts from. The overlay must grow out of the point the student
 * clicked or the scale change does not read as a scale change — it reads as a
 * dialog. main.js does not pass a screen point, so track the pointer here. */
const HIS_ptr = { x: 0, y: 0, seen: false };
if (typeof window !== 'undefined') {
  addEventListener('pointermove', function (e) { HIS_ptr.x = e.clientX; HIS_ptr.y = e.clientY; HIS_ptr.seen = true; },
    { passive: true, capture: true });
  addEventListener('pointerdown', function (e) { HIS_ptr.x = e.clientX; HIS_ptr.y = e.clientY; HIS_ptr.seen = true; },
    { passive: true, capture: true });
}

/* ========================================================================== */
export function createHistology(root) {
  const host = root || (typeof document !== 'undefined' ? document.body : null);
  if (!host) return { open: function () {}, close: function () {}, isOpen: function () { return false; },
                      setPower: function () {}, catalogue: function () { return []; }, dispose: function () {} };
  HIS_injectCSS();

  let el = null, slideCv = null, hudCv = null, hitEl = null, art = null, soft = null;
  let readName = null, readDef = null, readIdle = null, titleEl = null, subEl = null;
  let barEl = null, umEl = null, fovEl = null, focusDot = null, turretBtns = [];
  let opened = false, partId = null, meta = null, power = 100;
  let marks = [], tour = [], tourIx = -1, hovered = null, focus = 0;
  let geom = { D: 0, R: 0, cx: 0, cy: 0, upxCss: 1, fov: 2000 };
  let slide = { key: 'fibrous', rec: HIS_SLIDES.fibrous };
  let species = 'mammal';
  let resizeTimer = 0, disposed = false;

  /* ---- DOM ------------------------------------------------------------- */
  function build() {
    if (el) return;
    el = document.createElement('div');
    el.id = 'his';
    // main.js ignores pointerdown inside .chrome, so borrowing that class stops
    // a click on the microscope from also driving the scalpel underneath it.
    el.className = 'chrome';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Microscope');
    el.innerHTML =
      '<canvas id="hisSlide"></canvas>' +
      '<canvas id="hisHud" class="fade"></canvas>' +
      '<div id="hisHit" tabindex="0" role="application" aria-label="Slide field. Arrow keys tour the labelled structures."></div>' +
      '<div id="hisTop" class="panel fade"><div class="k em">Microscope</div>' +
        '<h3 id="hisName">—</h3><div class="sub" id="hisSub">—</div></div>' +
      '<button id="hisClose" class="fade" aria-label="Close microscope (Escape)">' +
        '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<div id="hisTurret" class="panel fade" role="group" aria-label="Objective turret"></div>' +
      '<div id="hisFocus" class="panel fade" aria-hidden="true"><div class="k">Focus</div>' +
        '<div id="hisFocusBar"><div id="hisFocusDot" style="top:50%"></div></div></div>' +
      '<div id="hisScale" class="panel fade"><div class="k">Scale</div>' +
        '<div id="hisBar" style="width:100px"></div><div class="um" id="hisUm">—</div>' +
        '<div class="fov" id="hisFov">—</div></div>' +
      '<div id="hisRead" class="panel fade" aria-live="polite"><div class="k">Readout</div>' +
        '<div class="name" id="hisRName" hidden></div><div class="def" id="hisRDef" hidden></div>' +
        '<div class="idle" id="hisRIdle"></div></div>' +
      '<div id="hisFoot" class="panel fade">' +
        '<span><kbd>+</kbd><kbd>-</kbd>Objective</span><span><kbd>←</kbd><kbd>→</kbd>Tour structures</span>' +
        '<span><kbd>scroll</kbd>Fine focus</span><span><kbd>Esc</kbd>Close</span></div>';
    host.appendChild(el);

    slideCv = el.querySelector('#hisSlide');
    hudCv = el.querySelector('#hisHud');
    hitEl = el.querySelector('#hisHit');
    titleEl = el.querySelector('#hisName');
    subEl = el.querySelector('#hisSub');
    readName = el.querySelector('#hisRName');
    readDef = el.querySelector('#hisRDef');
    readIdle = el.querySelector('#hisRIdle');
    barEl = el.querySelector('#hisBar');
    umEl = el.querySelector('#hisUm');
    fovEl = el.querySelector('#hisFov');
    focusDot = el.querySelector('#hisFocusDot');
    art = document.createElement('canvas');
    soft = document.createElement('canvas');

    const turret = el.querySelector('#hisTurret');
    turretBtns = HIS_POWERS.map(function (p, i) {
      const b = document.createElement('button');
      b.className = 'obj';
      b.type = 'button';
      b.innerHTML = '<b>' + p.total + '×</b><s>' + p.obj + ' obj</s>';
      b.setAttribute('aria-label', p.total + ' times total magnification, ' + p.obj + ' objective — ' + p.name);
      b.addEventListener('click', function () { setPower(p.total); hitEl.focus(); });
      turret.appendChild(b);
      return b;
    });
    el.querySelector('#hisClose').addEventListener('click', function () { close(); });
    hitEl.addEventListener('pointermove', onMove);
    hitEl.addEventListener('pointerleave', function () { setHover(null); });
    hitEl.addEventListener('wheel', onWheel, { passive: false });
    addEventListener('resize', onResize);
    addEventListener('keydown', onKey, true);
  }

  /* ---- rendering -------------------------------------------------------- */
  function layout() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const D = Math.max(240, Math.min(innerWidth, innerHeight) * 0.82);
    const px = Math.round(D * dpr);
    slideCv.style.width = slideCv.style.height = D + 'px';
    slideCv.width = slideCv.height = px;
    art.width = art.height = px;
    soft.width = soft.height = px;
    hudCv.style.width = innerWidth + 'px';
    hudCv.style.height = innerHeight + 'px';
    hudCv.width = Math.round(innerWidth * dpr);
    hudCv.height = Math.round(innerHeight * dpr);
    const fov = HIS_POWERS.filter(function (p) { return p.total === power; })[0].fov;
    geom = { D: D, R: px / 2 - 2, cx: innerWidth / 2, cy: innerHeight / 2,
             upxCss: D / fov, dpr: dpr, fov: fov, Rcss: D / 2 - 2 };
  }

  function render() {
    layout();
    const seed = HIS_hash(String(partId) + '@' + power + '@' + slide.key);
    const rng = HIS_rand(seed);
    const ctx = art.getContext('2d');
    const upx = geom.R * 2 / geom.fov;                 // device px per µm — the calibration
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, art.width, art.height);
    ctx.fillStyle = HIS_css(HIS_PAL.glass, 1);
    ctx.fillRect(0, 0, art.width, art.height);
    ctx.save();
    ctx.translate(art.width / 2, art.height / 2);
    ctx.scale(upx, upx);
    ctx.lineJoin = 'round';

    marks = [];
    const g = {
      ctx: ctx, rng: rng, power: power, upx: upx, px: 1 / upx, h: geom.fov / 2,
      species: species, meta: meta || {}, opt: slide.rec.opt || {}, tx: 0, ty: 0,
      shift: function (dx, dy) { ctx.translate(dx, dy); g.tx += dx; g.ty += dy; },
      mark: function (x, y, r, key) {
        if (marks.length > 1200 || !HIS_DEF[key]) return;
        marks.push({ x: x + g.tx, y: y + g.ty, r: Math.max(r, 3), key: key });
      },
    };
    try {
      slide.rec.draw(g);
    } catch (err) {
      // A generator bug must not leave a blank circle with no explanation.
      console.warn('histology: generator failed for ' + slide.key, err);
      ctx.restore();
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = HIS_css(HIS_PAL.eosWash, 1);
      ctx.fillRect(0, 0, art.width, art.height);
    }
    ctx.restore();

    // stain unevenness across the whole section — no slide is evenly stained
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const un = ctx.createLinearGradient(0, 0, art.width, art.height);
    un.addColorStop(0, 'rgba(190,90,130,0.055)');
    un.addColorStop(0.55, 'rgba(255,255,255,0)');
    un.addColorStop(1, 'rgba(90,60,140,0.05)');
    ctx.fillStyle = un;
    ctx.fillRect(0, 0, art.width, art.height);
    // One honest processing artefact per slide, at the powers you would see it.
    // Naming artefacts is examinable: a student who cannot tell a section fold
    // from a lesion will eventually report the fold.
    if (power !== 400 && rng() < 0.72) {
      const y = rng() * art.height, a = (rng() - 0.5) * 0.5;
      const chatter = rng() < 0.4;
      ctx.save();
      ctx.translate(art.width / 2, y); ctx.rotate(a);
      if (chatter) {                                 // microtome vibration: regular ripples
        for (let i = -14; i <= 14; i++) {
          ctx.fillStyle = 'rgba(80,40,75,0.055)';
          ctx.fillRect(-art.width, i * art.height * 0.011, art.width * 2, art.height * 0.004);
        }
      } else {                                       // the ribbon wrinkled on the water bath
        ctx.fillStyle = 'rgba(90,40,80,0.13)';
        ctx.fillRect(-art.width, -art.height * 0.006, art.width * 2, art.height * 0.012);
      }
      ctx.restore();
      marks.push({ x: (rng() - 0.5) * geom.fov * 0.5, y: (y - art.height / 2) / upx,
                   r: geom.fov * 0.02, key: chatter ? 'knife-chatter' : 'artefact-fold' });
    }
    ctx.restore();

    HIS_optics(slideCv, art, soft, geom.R, HIS_rand(seed ^ 0x9e3779b9));

    // Build the keyboard tour: one representative of each distinct structure, so
    // arrowing through it is a guided round of the slide rather than 900 nuclei.
    const seen = {};
    tour = [];
    marks.forEach(function (m) { if (!seen[m.key]) { seen[m.key] = 1; tour.push(m); } });
    tourIx = -1;
    setHover(null);
    updateChrome();
    drawHud();
  }

  function updateChrome() {
    const p = HIS_POWERS.filter(function (q) { return q.total === power; })[0];
    titleEl.textContent = (meta && meta.name) || slide.rec.name;
    subEl.textContent = slide.rec.name + ' · ' + slide.rec.stain + ' · 5 µm section · '
      + (species === 'frog' ? 'Rana' : 'mammalian');
    turretBtns.forEach(function (b, i) {
      const on = HIS_POWERS[i].total === power;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const bar = HIS_barFor(geom.fov, geom.D);
    barEl.style.width = Math.round(bar.px) + 'px';
    umEl.textContent = bar.um + ' µm';
    fovEl.textContent = 'FIELD ' + (geom.fov >= 1000 ? (geom.fov / 1000) + ' mm' : geom.fov + ' µm')
      + ' · ' + p.obj + ' OBJ · ' + p.total + '× TOTAL';
    if (!hovered) {
      readName.hidden = true; readDef.hidden = true;
      readIdle.hidden = false;
      readIdle.innerHTML = '<b>' + p.name + '.</b> ' + slide.rec.look[power];
    }
  }

  /* ---- hover + the leader line ------------------------------------------ */
  function pickAt(cssX, cssY) {
    const ux = (cssX - geom.cx) / geom.upxCss, uy = (cssY - geom.cy) / geom.upxCss;
    if (Math.hypot(cssX - geom.cx, cssY - geom.cy) > geom.Rcss) return null;
    let best = null, bestScore = Infinity;
    for (let i = 0; i < marks.length; i++) {
      const m = marks[i], d = Math.hypot(m.x - ux, m.y - uy);
      if (d > m.r + 10 / geom.upxCss) continue;
      // prefer the smallest structure containing the point: hovering a nucleus
      // inside a hepatocyte inside a lobule should name the nucleus.
      const score = d <= m.r ? m.r : m.r + d * 4;
      if (score < bestScore) { bestScore = score; best = m; }
    }
    return best;
  }
  function onMove(e) {
    const m = pickAt(e.clientX, e.clientY);
    if (m !== hovered) { tourIx = -1; setHover(m); }
  }
  function setHover(m) {
    hovered = m;
    if (m && HIS_DEF[m.key]) {
      readIdle.hidden = true;
      readName.hidden = false; readDef.hidden = false;
      readName.textContent = HIS_DEF[m.key][0];
      readDef.textContent = HIS_DEF[m.key][1];
    } else {
      updateChrome();
    }
    drawHud();
  }
  function drawHud() {
    const ctx = hudCv.getContext('2d');
    ctx.setTransform(geom.dpr, 0, 0, geom.dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (!hovered) return;
    const x = geom.cx + hovered.x * geom.upxCss, y = geom.cy + hovered.y * geom.upxCss;
    const rPx = Math.max(9, Math.min(150, hovered.r * geom.upxCss));
    ctx.save();
    // the marker ring on the structure itself
    ctx.beginPath(); ctx.arc(x, y, rPx, 0, 6.283);
    ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(52,211,153,.95)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, rPx + 5, 0, 6.283);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(52,211,153,.14)'; ctx.stroke();
    // leader: radially out of the field, then a short jog into the dark surround
    const a = Math.atan2(y - geom.cy, x - geom.cx) || 0.0001;
    const ex = geom.cx + Math.cos(a) * (geom.Rcss + 26), ey = geom.cy + Math.sin(a) * (geom.Rcss + 26);
    const side = Math.cos(a) >= 0 ? 1 : -1;
    const lx = ex + side * 72, ly = ey;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (rPx + 3), y + Math.sin(a) * (rPx + 3));
    ctx.lineTo(ex, ey); ctx.lineTo(lx, ly);
    ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(52,211,153,.7)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(lx, ly, 2.6, 0, 6.283);
    ctx.fillStyle = 'rgba(52,211,153,1)'; ctx.fill();
    // the name, in the surround where it cannot cover the tissue
    const label = HIS_DEF[hovered.key][0].toUpperCase();
    ctx.font = '600 10.5px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = side > 0 ? 'left' : 'right';
    const tx = lx + side * 9;
    const w = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(4,7,10,.82)';
    ctx.fillRect(side > 0 ? tx - 5 : tx - w - 5, ly - 9, w + 10, 18);
    ctx.fillStyle = 'rgba(52,211,153,1)';
    ctx.letterSpacing = '0.08em';
    ctx.fillText(label, tx, ly);
    ctx.restore();
  }

  /* ---- controls ---------------------------------------------------------- */
  function setPower(x) {
    // 4 and 10 are unambiguous objective aliases. 40 is NOT — it is both the 40x
    // objective and 40x total — and treating it as the objective silently sent
    // setPower(40) to the 400x field, so the lowest power was unreachable from
    // the API. Totals always win; only 4 and 10 alias.
    const want = x === 4 ? 40 : x === 10 ? 100 : x;
    if (!HIS_POWERS.some(function (p) { return p.total === want; })) return;
    if (want === power && opened) return;
    power = want;
    if (!opened) return;
    render();
    // Changing objective is never parfocal in practice — the image jumps out of
    // focus and comes back. Selling that is most of why a power change feels
    // like a microscope rather than a zoom slider.
    if (slideCv.animate) {
      slideCv.animate(
        [{ filter: 'blur(9px)', opacity: 0.55 }, { filter: 'blur(0px)', opacity: 1 }],
        { duration: 340, easing: 'cubic-bezier(.2,.7,.3,1)' });
    }
    applyFocus();
  }
  function onWheel(e) {
    e.preventDefault();
    focus = Math.max(-1, Math.min(1, focus + (e.deltaY > 0 ? 0.09 : -0.09)));
    applyFocus();
  }
  function applyFocus() {
    const b = Math.abs(focus) * 4.5;
    slideCv.style.filter = b < 0.05 ? 'none' : 'blur(' + b.toFixed(2) + 'px) contrast(' + (1 - Math.abs(focus) * 0.12).toFixed(2) + ')';
    if (focusDot) focusDot.style.top = (50 + focus * 46) + '%';
  }
  function stepTour(dir) {
    if (!tour.length) return;
    tourIx = (tourIx + dir + tour.length * 2) % tour.length;
    setHover(tour[tourIx]);
  }
  function onKey(e) {
    if (!opened) return;
    const k = e.key;
    let handled = true;
    if (k === 'Escape') close();
    else if (k === '+' || k === '=') setPower(power === 40 ? 100 : 400);
    else if (k === '-' || k === '_') setPower(power === 400 ? 100 : 40);
    else if (k === '1') setPower(40);
    else if (k === '2') setPower(100);
    else if (k === '3') setPower(400);
    else if (k === 'ArrowRight' || k === 'ArrowDown') stepTour(1);
    else if (k === 'ArrowLeft' || k === 'ArrowUp') stepTour(-1);
    else if (k === 'PageUp') { focus = Math.max(-1, focus - 0.12); applyFocus(); }
    else if (k === 'PageDown') { focus = Math.min(1, focus + 0.12); applyFocus(); }
    else if (k === 'Home') { focus = 0; applyFocus(); }
    else handled = false;
    // The overlay is modal, so NOTHING may reach the app behind it: otherwise
    // pressing "3" for the 400x objective also swaps to forceps, and "4"/"5"
    // change tools invisibly under the microscope. Unhandled keys are stopped
    // but not defaulted, so Tab focus and browser shortcuts still work.
    if (e.key !== 'Tab') e.stopPropagation();
    if (handled) e.preventDefault();
  }
  function onResize() {
    if (!opened) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (opened) render(); }, 140);
  }

  /* ---- lifecycle --------------------------------------------------------- */
  function open(id, m) {
    // dispose() is one-way: it removed the window listeners and set `disposed`.
    // Without this guard, open() would call build() (which rebuilds because el is
    // null) and re-add the resize/keydown listeners, but a later dispose() would
    // early-return on the `disposed` flag and leak them. Make dispose terminal.
    if (disposed) return;
    build();
    partId = id;
    meta = m || {};
    species = HIS_speciesFor(id, meta);
    slide = HIS_slideFor(id, meta);
    focus = 0;
    opened = true;
    el.classList.add('on');
    applyFocus();
    render();
    // Grow the field out of the point that was clicked. Without this the overlay
    // is a modal; with it, it is a change of scale.
    const ox = HIS_ptr.seen ? HIS_ptr.x : innerWidth / 2;
    const oy = HIS_ptr.seen ? HIS_ptr.y : innerHeight / 2;
    const far = Math.hypot(Math.max(ox, innerWidth - ox), Math.max(oy, innerHeight - oy));
    const reduced = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (el.animate && !reduced) {
      el.animate([
        { clipPath: 'circle(0px at ' + ox + 'px ' + oy + 'px)', opacity: 0.4 },
        { clipPath: 'circle(' + far + 'px at ' + ox + 'px ' + oy + 'px)', opacity: 1 },
      ], { duration: 620, easing: 'cubic-bezier(.16,.9,.24,1)' });
      slideCv.animate([
        { transform: 'translate(calc(-50% + ' + (ox - innerWidth / 2) * 0.5 + 'px), calc(-50% + '
            + (oy - innerHeight / 2) * 0.5 + 'px)) scale(.18)', filter: 'blur(24px)', opacity: 0 },
        { transform: 'translate(-50%,-50%) scale(1)', filter: 'blur(0px)', opacity: 1 },
      ], { duration: 680, easing: 'cubic-bezier(.16,.9,.24,1)' });
    }
    requestAnimationFrame(function () { el.classList.add('ready'); });
    hitEl.focus({ preventScroll: true });
  }

  function close() {
    if (!opened) return;
    opened = false;
    setHover(null);
    el.classList.remove('ready');
    const done = function () { if (!opened && el) el.classList.remove('on'); };
    const reduced = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (el.animate && !reduced) {
      const an = slideCv.animate(
        [{ transform: 'translate(-50%,-50%) scale(1)', filter: 'blur(0px)', opacity: 1 },
         { transform: 'translate(-50%,-50%) scale(.3)', filter: 'blur(16px)', opacity: 0 }],
        { duration: 300, easing: 'cubic-bezier(.4,0,.9,.4)' });
      an.onfinish = done;
      setTimeout(done, 420);                        // belt and braces if onfinish never fires
    } else done();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    opened = false;
    clearTimeout(resizeTimer);
    removeEventListener('resize', onResize);
    removeEventListener('keydown', onKey, true);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    el = slideCv = hudCv = hitEl = art = soft = null;
    marks = []; tour = []; turretBtns = [];
  }

  function catalogue() {
    return Object.keys(HIS_SLIDES).map(function (k) {
      return { id: k, name: HIS_SLIDES[k].name, stain: HIS_SLIDES[k].stain,
               powers: HIS_POWERS.map(function (p) { return p.total; }),
               look: HIS_SLIDES[k].look };
    });
  }

  return {
    open: open,
    close: close,
    isOpen: function () { return opened; },
    setPower: setPower,
    catalogue: catalogue,
    dispose: dispose,
  };
}

