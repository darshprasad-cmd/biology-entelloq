# Universe structural-completeness review

Scope: improve the existing thirteen-stage Universe, preserving the dark-green
HUD, zoom/gesture engine, keyboard controls, reduced motion, offline import map
and ecosystem launcher. No new runtime dependencies or asynchronous model-loading
architecture are introduced. The same release adds narrowly scoped lab Undo and
mobile close controls; it does not replace the dissection specimens or layout.

The engineering review found incomplete structures, not merely insufficient
gloss. The design review therefore favours connected geometry, legible material
separation and explicit model limitations. These are educational visualisations,
not photogrammetry, clinical scans or validated physical simulations.

## All-stage inspection

| Stage | Before | After / current scope | Why |
| --- | --- | --- | --- |
| Universe | White sphere erased the galaxy nucleus; bright composited sky | Photographic centre retained; dimmer contextual sky; feathered nebula masks | Preserve image detail and avoid pasted rectangular plates |
| Earth | Existing NASA-map globe and restrained atmosphere | Existing visual retained; archived-map/weather limitations clarified | Already complete as a globe; it is not live weather |
| Biome | Repeated faceted crowns on bare cylinders; clipped ground | Rooted forest diorama with branches, attached individual leaves, understory, litter and water | Restore missing forest layers and a bounded composition |
| Ecosystem | Four floating bubble clusters | Plant, connected larva, eight-legged spider and fungi/log; separate energy and nutrient paths | Put recognisable organisms behind the food-web concepts |
| Organism | Capsule mannequin with disconnected limbs and radial vessel spokes | Profiled body, connected limbs/hands/feet, rib cage, axial skeleton and selected organs/vessel branches | Restore a coherent whole-organism silhouette and systems context |
| Organ | Smooth wall hid every coronary; few cut pipes | Surface-projected coronaries, connected arch branches/pulmonary/caval entries, visible vessel openings | Correct occlusion and complete major external landmarks |
| Tissue | Separated sausage rows; free-floating striation rings | Joined branching fibres, surface stripes/discs, nuclei and biconcave capillary red cells | Make the tissue visibly interconnected |
| Cell | Populated but simplified capsule organelles and tube-like ER | Open nuclear envelope with pores, chromatin/nucleolus, flattened connected ER/Golgi, lysosome, centrosome and 15 anchored subparts | Expose meaningful compartments without hiding structures inside an opaque ball |
| Organelle | Disconnected torus loops stood in for membrane folds | Continuous folded inner membrane, outer membrane/intermembrane space, matrix-facing synthases, circular mtDNA and eight anchored subparts | Show membrane continuity and distinguish the mitochondrial compartments |
| Protein | Two detached springs, an incorrect beta sheet and a floating heme | Complete deposited four-chain haemoglobin C-alpha trace and four heme heavy-atom groups | Replace a generic symbol with a real structural dataset |
| DNA | Misoriented one-colour rungs and an idealised coil | Complete coordinate-derived 12-base-pair duplex with explicit chemical connectivity | Preserve measured groove/twist geometry and separate covalent/hydrogen links |
| Nucleotide | Wrong ring topology and disconnected oxygen atoms | Coordinate-derived A–T pair with fused adenine rings, full pentose rings and two dashed hydrogen-bond contacts | Correct the underlying chemistry, not only its appearance |
| Atom | Planetary rings with six orbiting balls | Stationary qualitative s/p-shaped clouds and an enlarged carbon-12 nucleus | Stop depicting electron trajectories as physical orbits |

All model notes live in `src/universe/data.js` and appear in the existing detail
panel. The atom explicitly says its clouds are not a solved/measured carbon
wavefunction. The heart does not pretend to expose internal valve leaflets.

## Interaction design review

| Before | After | Why |
| --- | --- | --- |
| Only moving projected markers exposed many structures | A persistent Subparts list, previous/next structure controls, source/model notes and 81 scene-anchored entries | Every named part remains reachable even when its marker is behind the model |
| Scroll/drag always changed biological scale | Inspect 3D mode orbits and zooms a selected model; views persist per scale; Reset view and motion control | Separate travelling through scales from examining a structure |
| Hidden mobile rail and keyboard-led help | All-scales selector, touch help, 44px controls and sticky visible X buttons | Phone users need no physical Escape key |
| Marker labels changed hit-box centre and captured wheel events while invisible | Fixed-size centred markers with non-intercepting labels | Keep geometry anchors precise and empty canvas responsive |

Specimen rotation is a viewing aid, not a claim that cell interiors move as a rigid
body. Reduced-motion mode freezes idle model motion; manual inspection remains
available. See [cell topology and limits](CELL.md) and
[lab Undo boundaries](../dissection-interactions/UNDO.md).

## Molecular data provenance

The compact coordinates embedded in `stage_molecular.js` are derived from wwPDB
PDB files. Only rigid transforms and uniform display scaling are applied at
runtime. Atom colours/radii, sticks, spline interpolation and representation
choices are illustrative. Source coordinates remain at their deposited decimal
precision in ångströms.

- **4HHB**, human deoxyhaemoglobin: chains A/C have 141 C-alpha positions each;
  B/D have 146 each. Four hemes have 43 heavy atoms each; their links come from
  deposited `CONECT` records. No invented beta sheet or bound oxygen. Source:
  [Fermi, Perutz, Shaanan & Fourme (1984), J. Mol. Biol. 175, 159–174](https://doi.org/10.1016/0022-2836(84)90472-8),
  [PDB 4HHB](https://www.rcsb.org/structure/4HHB).
- **1BNA**, Dickerson DNA dodecamer: 24 residues, 486 DNA heavy atoms, explicit
  covalent topology and 32 base-pair hydrogen-bond contacts. The enlarged A6/B19
  pair has 41 heavy atoms and is an extracted backbone fragment, not two capped
  free nucleotides. Hydrogens, water and bond orders are not rendered. Source:
  [Drew et al. (1981), PNAS 78, 2179–2183](https://doi.org/10.1073/pnas.78.4.2179),
  [PDB 1BNA](https://www.rcsb.org/structure/1BNA).

PDB archive data are available under CC0/public-domain terms; these are newly
rendered views of coordinate data, not copied molecular illustrations. See
[PDBe public-data statement](https://www.ebi.ac.uk/pdbe/about/public-data-access-statement)
and [RCSB citation policies](https://www.rcsb.org/pages/policies). The underlying
archive is described by [Berman et al. (2000), The Protein Data Bank](https://doi.org/10.1093/nar/28.1.235).

Downloaded source SHA-256, 2026-09-14:

```text
4HHB.pdb  abf382e0fd84b53bd4c08b373d37c0d7fe9fbe1a9a9c3851b2f5f2fbbe627101
1BNA.pdb  df42f1506792f191b957227b061360652adcf6f813eb69d9ec553067ea584670
```

The raw intake PDB files stay outside the repository. Regeneration is deterministic:

```text
python scripts/prepare-universe-molecules.py <4HHB.pdb> <1BNA.pdb> --check
```

Omit `--check` to mechanically update only the marked generated-coordinate block.
There is no runtime request to RCSB and no new dependency.

## Scientific references and limits

- Carbon ground state `1s² 2s² 2p²`:
  [NIST atomic data](https://physics.nist.gov/PhysRefData/Handbook/Tables/carbontable1.htm).
  Cloud point counts are display samples, not electron counts or quantitative
  probability densities. The nucleus is intentionally enlarged.
- External cardiac connections and coronary grooves:
  [OpenStax heart anatomy](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy).
  The procedural heart is not an anatomically certified 3D asset; its motion is
  explanatory and not a haemodynamic calculation.
- Branching, striation and intercalated discs:
  [OpenStax cardiac muscle](https://openstax.org/books/anatomy-and-physiology-2e/pages/10-7-cardiac-muscle-tissue).
  Exposed nuclei are teaching cutaways; no calibrated microscopy is claimed.
- Axial skeleton context:
  [OpenStax vertebral column](https://openstax.org/books/anatomy-and-physiology-2e/pages/7-3-the-vertebral-column).
  The human systems view remains simplified, not a complete skeletal atlas.
- Food-web energy versus nutrient cycling and chemosynthetic exceptions:
  [OpenStax energy flow](https://openstax.org/books/biology-2e/pages/46-2-energy-flow-through-ecosystems).
  Organisms are representative and not to scale; no measured trophic efficiencies
  are implied by the animated dots.
- Hubble fields are views of small sky regions, not whole-universe maps:
  [NASA Hubble deep fields](https://science.nasa.gov/mission/hubble/science/universe-uncovered/hubble-deep-fields/).
  Early hydrogen versus stellar element production:
  [NASA Big Bang](https://science.nasa.gov/universe/the-big-bang/).

## Protected-source workflow

The narrow builder now allows `kit.js`, `core.js`, `data.js`, `stage_cosmic.js`,
`stage_body.js`, `stage_cell.js`, `stage_molecular.js` and `ui.js`. The widened
fingerprint was recomputed from the **original, unmodified**
`98ac20c5ba0194d5fa85a570c3b0bf6845076acd:universe.html`, never from dirty output:

```text
ccded4559b8a65aee8098693b309ae32e50275253c20d46f6d13a5089d8f7d00
```

The import map, base64 Three.js runtime, `_textures.js`, `main.js`, shell and shared
launcher remain protected. Do not execute the legacy full assembler. Use:

```text
python scripts/build-universe.py
python scripts/build-universe.py --check
node --test tests/universe-build.test.cjs tests/universe-controls.test.cjs tests/universe-structures.test.cjs
```

The structures suite checks deposited chain continuity, full heme connectivity,
DNA’s two covalent components, measured bond lengths, A/T ring cycle ranks, all
thirteen factory constructions, bounded finite geometry and valid hotspots.

The browser harness asserts the served artifact hash and all thirteen actual
stage roots, captures every stage, and tests pointer pinch, wheel, immediate
keyboard navigation, live reduced motion, panels and responsive layouts. Reports
must be regenerated against the final integrated artifact; a passing earlier
hash is not release evidence for later source changes. It is software WebGL
evidence, not physical touch-device, real-GPU-performance or scientific validation.
