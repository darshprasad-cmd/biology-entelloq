# Dissection tissue realism

This change is available on the `codex/dissection-tissue-realism` branch and in the local preview. It has not been published to production.

## What changed

- Accepted incisions create fluid at the contacted tissue. Refused cuts, hovering, stationary contact and cursor motion over empty space do not create blood.
- Preserved specimens show limited cut-edge residue. Fresh excised tissue shows brief passive seepage. The separate optional frog/heart circulation demonstration can show pulsatile flow. Cockroach hemolymph is pale in every condition. Fish, earthworm and cockroach no longer inherit the frog physiology fallback.
- The console offers shallow, controlled and deep blade settings. A stroke retains its initial selection. Shallow scores do not release flaps; deep injury requires a bounded inward ray intersection with retained tissue. These are relative teaching controls, not calibrated blade depths or forces.
- Cut faces show only reached layers with tissue-specific depth, opening, surface relief and moisture. Frog skin has amphibian layers, fascia stays connective tissue, and insect cuticle stays firm. Tissue pigmentation does not fabricate a universal red pool.
- The frog small intestine has separated folds and meets the rectum; the rectum meets the cloaca. A folded mesentery attaches to the bowel instead of floating as a rectangular sheet. Existing part IDs and major organ anchors remain.
- Peeling clears fluid associated with the removed access sheet. Undo restores incision depth and flap access. Blood shortcuts and visible controls stay synchronized.

## Review in the lab

Open the Blood control at the lower right. Select a specimen condition and blade depth. Pin the frog, choose the scalpel, and draw a stroke. Compare a shallow score with a controlled cut, then use forceps to pull the opened layer. Repeat through skin, fascia, muscle and peritoneum to examine the revised gut. The Blood Off setting, swab tool and Undo remain available.

## Verification boundaries

Source and geometry tests cover cut access, surface topology, layer reach, depth snapshots, Undo, blood contexts, bounded deep injury and frog gut connections. Browser scripts exercise real UI plus the existing synthetic hand-input route; stationary touch checks use native touch events. They do not validate a physical webcam, hand-tracker accuracy or clinical technique.

An initial local full check timed out while other graphical checks were running; its non-unit checks passed. The first CI run completed all 456 unit tests and found one obsolete whole-gut preservation checksum. The updated preservation check must retain baseline protection for every unchanged organ while explicitly allowing the two revised gut meshes. Final CI and browser results are recorded below when complete.

## Limits

The five specimens retain generalized teaching anatomy. This is a bounded improvement, not complete species-specific reconstruction or validated biomechanics. A coarse scanned skin mesh can leave angular incision margins. Each tissue currently retains one active incision path; a new stroke replaces that path, and Undo restores the previous one. The continuous gut lumen, complete vascular/duct anatomy, species fidelity and organ collisions during dragging are not validated by these changes.

The original page-shell fingerprint is retained. The blood module's newly authorized scope has a separate fingerprint derived from the immutable original Git commit, with only that additional source slot masked. No dependency, camera permission, provider boundary or deployment configuration was changed.

See [anatomical sources](ANATOMY-SOURCES.md) and [cut-face details](CUTS.md).
