# Protein Atlas inside Biology Entelloq

Open Explore → **Open Protein Atlas**, or find **Protein Atlas** in the existing command palette. The deployed route is `#explore/proteins`; the authoring route is `app.html#explore/proteins`. The existing Biology shell, shared theme, Learn deep links, CBSE entry, Universe, and Dissection Lab retain their routes.

The viewer shows actual experimental coordinates through Mol* 5.13.1. It offers fold/ligand, atomic-detail and molecular-surface representations, camera reset, and ligand selection/focus. The displayed atom count comes from the parsed Mol* structure. Rendering requires WebGL; loading and failure states never report a structure as loaded.

## Sources and scientific boundaries

- [1CRN — Crambin](https://www.rcsb.org/structure/1CRN): X-ray diffraction, 1.50 Å, *Crambe hispanica*. The original RCSB PDB coordinate file, including its deposition/citation metadata, is included as `assets/protein/1CRN.pdb.txt` (327 ATOM records).
- [1STP — Streptavidin and biotin](https://www.rcsb.org/structure/1STP): X-ray diffraction, 2.60 Å, *Streptomyces avidinii*. BTN is the deposited biotin ligand.
- [1HHO — Human oxyhaemoglobin](https://www.rcsb.org/structure/1HHO): X-ray diffraction, 2.10 Å, *Homo sapiens*. HEM identifies the deposited heme groups.
- [Mol* viewer documentation](https://molstar.org/viewer-docs/), [Mol* source](https://github.com/molstar/molstar), [RCSB data usage policy](https://www.rcsb.org/pages/policies).

Each view uses the first deposited model. Biological assemblies are not generated automatically: for example, the 1HHO deposited model has an alpha and a beta chain rather than the full haemoglobin tetramer. The ribbon and surface are visual representations derived from coordinates. Colours are explanatory conventions. This is not protein-folding prediction, molecular dynamics, a binding-affinity calculation or an experimentally observed animation. Coordinate models have experimental uncertainty; resolution is one piece of evidence, and the linked RCSB validation report supplies more context.

Crambin, the engine and its stylesheet are bundled inside the single-file output. Opening it does not request a CDN or structure service. 1STP and 1HHO are explicitly online examples fetched only when chosen from `https://files.rcsb.org/download/`. Offline failure offers retry or a return to included Crambin. Remote loads have a 20-second request deadline and a five-million-character validation bound. Only the three curated IDs are accepted by the UI. Local engine loading is deferred until the viewer is opened; all existing Explore content can be used without initializing Mol*.

## Source and packaging

The native JavaScript implementation lives in `src/protein/atlas.js`, markup in `atlas.html`, and token-based styles in `atlas.css`. `scripts/build-protein.py` writes only marked slots in `explore.html`; it does not rebuild other pillars, the shared shell or Dissection Lab. `app.html` has a command-palette entry for the same existing Explore subroute. No React shell, additional application route or separate server is introduced.

The existing portable packager discovers the literal local JS, CSS and coordinate paths. The `.txt` suffix on the preserved PDB content uses its existing text-resource support. Mol* is placed after the running workspace through the same deferred payload mechanism used for specimen scans, then fetched and decoded only when Protein Atlas opens. The existing startup-size threshold remains unchanged. The included 5.13.1 Mol* viewer files come from the npm distribution, with its MIT licence preserved in `assets/protein/vendor/MOLSTAR-LICENSE.txt`. No other packages are needed to build or run the addition.

Vendor/source SHA-256:

| File | SHA-256 |
| --- | --- |
| molstar.js | `4fc6493c2471db8834dcc391151b344d7017e4eb8a4eb76c152be5f9dbd23874` |
| molstar.css | `22fbf73b75c11ef57687d08437c95dbfe8430ea895264f6da2b9b01e28bacc49` |
| 1CRN.pdb.txt | `42199a30a0701864a2a5cc76cd7f35cc544cd0e65fbcf63e03c166543249b811` |

## Verification commands

```text
python scripts/build-protein.py
python scripts/build-protein.py --check
node scripts/check-learning.cjs
python scripts/build-single-file.py
python scripts/build-single-file.py --check
node scripts/check-protein-browser.cjs
```

The browser check uses the same Playwright module configuration as existing checks (`BIOLOGY_PLAYWRIGHT_MODULES`). It exercises the actual portable artifact, the included coordinate model with no resource server, representations, curated online models, ligand focus, blocked-network recovery, keyboard reset, responsive layout and return to existing Learn content. CI also keeps the existing single-file, opening, exam-answer and AI-formatting browser checks. Browser evidence is saved to this folder; software WebGL checks do not verify physical GPU performance or touch hardware.
