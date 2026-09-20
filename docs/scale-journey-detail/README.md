# Scale journey detail and lab exit QA

Release verification · 20 September 2026. The existing dissection layout and workflows are preserved; this release targets exit ownership and a more detailed, inspectable scale journey.

## Requested scope

Resolve overlapping exits when the dissection lab runs inside the app launcher, and make the scale journey substantially more detailed and inspectable. Preserve the accepted dissection-lab appearance, specimen workflows and existing tools. This is an upgrade to the scale viewer and its entry/exit integration, not a redesign of the lab or a new dissection simulation.

| Before | After | Why |
| --- | --- | --- |
| The outer launcher exit could overlap a child lab dialog's close control. | The current same-origin lab iframe reports modal ownership; the outer exit and floating app controls are hidden while a lab modal is active. The viewer uses “Back to lab”; the outer control uses “Exit lab”. | Keep the immediate action reachable and distinguish leaving a viewer from leaving the lab. |
| Direct entry through `app.html#lab` duplicated history and Exit could reopen the lab. | Restored routes do not push another history entry; Lab Exit uses the existing close routine without an unknown-history traversal. | Make the visible exit reliably leave the lab while retaining its current attempt. |
| Five broad stages: tissue, cell, nucleus, DNA and atom. | Eight stages, with 40 named, selectable 3D parts and model notes/sources. | Make the intermediate biological organization inspectable rather than only adding explanatory text. |
| A generic decorative DNA helix and orbiting electron dots. | Coordinate-derived DNA/base-pair views and a qualitative carbon-12 orbital-probability illustration. | Improve structural honesty while making approximations explicit. |
| Navigation relied heavily on wheel/drag interaction. | Visible stage buttons, previous/next controls, a scale slider, optional rotation/motion, keyboard navigation and a compact phone inspection panel. | Support mouse, touch and keyboard without covering the model or close control. |

## Stage inventory

Spans below are the current `STAGE_SCALE_M` values, converted to readable units. They are representative teaching spans, **not calibrated screen fields of view**, measurements of the selected specimen, or a claim that every structure has a fixed size. The scale readout interpolates between them.

| Stage | Representative span | Inspectable parts |
| --- | --- | ---: |
| Tissue | 300 µm | 3 |
| Cell | 20 µm | 10 |
| Nucleus | 5 µm | 5 |
| Chromatin | 100 nm | 3 |
| Nucleosome | 11 nm | 5 |
| DNA | 4.1 nm | 5 |
| Base pair | 2 nm | 5 |
| Carbon atom | 0.15 nm | 4 |
| Total | 8 stages | 40 |

The cell includes organelle inspection; this does not imply that the nuclear-DNA route passes through a mitochondrion. “From [structure] · reference anatomy” records the entry context only. No selected-specimen tissue is sampled, scanned or reconstructed.

## Scientific basis and limits

- Tissue, cell and nucleus are generic teaching models. Stain-inspired colours, organelle populations, proportions and cutaway openings are illustrative. The nucleus depicts interphase organization, not a normal nucleus filled with condensed X-shaped chromosomes.
- Chromatin is shown as irregular nucleosome packing with linker DNA. It is not a measured chromatin map or a universal rigid 30-nm fibre. The primary [ChromEMT study](https://pubmed.ncbi.nlm.nih.gov/28751582/) reports heterogeneous 5–24-nm chromatin chains in the investigated cells.
- The nucleosome depicts two copies each of H2A, H2B, H3 and H4, with approximately 147 base pairs and 1.65 DNA superhelical turns. The protein lobes and DNA path are schematic. [PDB 1AOI and its primary crystallographic study](https://www.rcsb.org/structure/1AOI) establish the histone-octamer/wrapped-DNA structure; that deposited structure contains 146 base pairs. [Argonne's nucleosome research description](https://www.alcf.anl.gov/science/projects/computational-studies-nucleosome-stability) gives the typical approximately 147-bp, 11-nm particle.
- DNA reuses the exact local **486 DNA heavy-atom coordinates** already validated in `src/universe/stage_molecular.js`, from [PDB 1BNA / Drew et al., 1981](https://www.rcsb.org/structure/1BNA). The rendered fragment has 24 residues, 12 base pairs and two antiparallel covalent strands. The A–T detail uses the same structure's A6/B19 residues: 41 heavy atoms and two hydrogen-bond guides. Coordinate units are ångströms; display normalization uses rotation, translation and uniform scaling only.
- The original 1BNA PDB source SHA-256 is `df42f1506792f191b957227b061360652adcf6f813eb69d9ec553067ea584670`. The local DNA subset omits 80 waters; hydrogens and bond orders are not rendered. Ball sizes, colours and sticks aid interpretation, and dashed donor/acceptor guides are not covalent bonds. This synthetic crystal fragment is not the selected animal's sequence. Its local twist varies; the geometry is not forced to an ideal 10.5 base pairs per turn.
- Carbon-12 has six protons and six neutrons; the neutral-atom reference configuration is 1s² 2s² 2p² ([NIST carbon data](https://www.physics.nist.gov/PhysRefData/Handbook/Tables/carbontable1.htm)). The clouds are deterministic qualitative probability illustrations, not classical electron trajectories or a solved many-electron carbon wavefunction. Dots are probability samples, not individual electrons. The nucleus is enormously enlarged. The 0.15-nm teaching span is not a sharp physical atomic boundary. See [IUPAC's orbital definition](https://goldbook.iupac.org/terms/view/O04317).

Additional authoritative context: [cell dimensions and microscopy](https://www.ncbi.nlm.nih.gov/books/NBK26880/), [nuclear organization](https://www.ncbi.nlm.nih.gov/books/NBK26932/). These models do not claim photorealism or tissue-specific diagnostic accuracy.

## Integration and preservation boundary

- `src/lab/zoomverse.js` owns the eight-stage scene, inspection controls, responsive layout, motion preferences and viewer lifecycle. Repetitive molecular geometry uses instancing; meshes, materials and geometry participate in explicit disposal.
- `app.html` and `src/lab/main.js` provide the narrow launcher/modal bridge. Messages require the exact current iframe/parent source, same origin and a boolean modal state. Other launcher destinations must keep their normal exit behavior.
- Four exact approved routing snippets are normalized back to their original form before the immutable app-region fingerprint check. The test rejects missing or duplicated approved snippets. The original region fingerprint was not regenerated; unrelated launcher bytes remain protected.
- The user explicitly authorized adding **only `zoomverse.js` as the new assembled source slot** in `scripts/build-dissection.py`. Previously approved dissection slots remain approved; this is not permission to alter the rest of the lab shell or add arbitrary runtime modules.
- The updated `tests/fixtures/dissection-shell.sha256` was generated from **the original `BASE:lab.html` at `4dcb67d2b1654d74d065b588acbde7831e6f5737`**, retaining the existing approved-slot exclusions and excluding only the newly approved `zoomverse.js` slot in addition. It was **not** generated from the modified assembled artifact. The original `dissection-original.json` inventory remains the preservation reference. All other shell bytes stay protected.
- Current shell fixture: `76c6cb7fa99f53dbce1809d84bfee9796d1ddf45c6f35da628eba32d00ec8dba`. The release checks must verify that the assembled `lab.html` matches its approved source slots and the protected shell fingerprint.
- No new runtime dependencies, authentication/provider changes, camera acquisition changes or hand-tracking changes are part of this work. Browser checks keep the physical camera off; they do not establish real hand-hardware coverage.

## QA matrix

The preview serves this worktree at `http://127.0.0.1:3006`. Browser checks use software WebGL and an emulated touch viewport; they are not a physical-device, camera, or medical-validation claim.

| Check | Intended evidence | Final status |
| --- | --- | --- |
| `node --test tests/zoomverse-detail.test.cjs tests/zoomverse-molecular.test.cjs` | All eight builders; 40 real scene-backed parts; finite/bounded geometry; interphase nucleus; connected cristae/linkers; histone composition; exact DNA coordinates/connectivity; isolated highlighting; owned instance-buffer disposal. | Pass as part of full suite |
| `node --test tests/launcher-exit-bridge.test.cjs tests/prepared-startup.test.cjs` | Exact-origin/source modal messages, malformed-message rejection, warm reopen/reset behavior, launcher and startup contracts. | Pass as part of full suite |
| `python scripts/build-dissection.py --check` and `python -m unittest discover -s tests -p test_lab_unchanged.py` | Source/artifact synchronization; original-BASE shell preservation; no unapproved dissection runtime files. | Pass; 5 protected-contract tests |
| `node tests/check-app-lab-exits.cjs` | Cross-document exit hit testing in the real app launcher, using a focused child harness. The scale scene is represented by its actual CSS/close markup here, not full WebGL. | Pass: five sizes, direct entry and normal entry, no page errors |
| `node tests/check-lab-feature-controls.cjs` | Existing feature controls, focus, touch targets and modal closes. | Pass: five sizes, no page errors |
| `node scripts/check-learning.cjs` | Complete required local regression command, including all JS unit files and source/build boundaries. | Pass: 13/13 groups |
| `node scripts/check-scale-journey-browser.cjs` | Actual `app.html → lab.html` iframe and rendered scenes; artifact byte match; all eight stages and 40 part controls; nested exits; pointer rotation; keyboard navigation; reduced motion; 390/320-pixel portrait and 844-pixel landscape; no page errors or camera requests. | Pass: `preview/report.json`, `complete: true` |
| `node scripts/check-lab-feature-buttons-browser.cjs` | Actual existing microscope, reference-slide library, focus restoration, isolated lab shortcuts, X-ray/MRI, record and Viva controls. | Pass: `feature-regression/report.json`, no errors or camera requests |
| Screenshot review | Rendered cell, chromatin, nucleosome, DNA/base pair and portrait/landscape phone layouts; no faded-stage depth occlusion or model/control/exit overlap. | Reviewed final preview images |
| Required CI / production | Static site checks must pass before merge; Pages deployment and live artifact/interaction smoke must pass before claiming deployment. | Release gate, not covered by local tests |

Browser scripts use the existing Playwright installation, `BIOLOGY_PREVIEW_URL` for the served preview, and optionally `BIOLOGY_PLAYWRIGHT_MODULES`. `scripts/check-scale-journey-browser.cjs` writes its report/screenshots under `docs/scale-journey-detail/preview` by default; inspect `report.json` and require `complete: true` for the final run. An interrupted report or earlier screenshot is not a passing result.

Evidence is captured from branch `codex/scale-journey-detail`; the browser verifies exact `app.html` and `lab.html` bytes before interaction. The committed preview report/screenshots belong to this source snapshot. Production verification is a separate post-deploy run with `BIOLOGY_PREVIEW_URL=https://biology.entelloq.com` and a separate output directory; local evidence alone does not claim a deployed release.
