# Specimen appearance upgrade

This revision focuses on the main animal and heart models themselves. It extends the tissue-cutting draft on `codex/dissection-tissue-realism`; it has not been deployed to the public site.

## Visible changes

- **Heart:** a broad superior shoulder, an offset tapered apex and a flatter posterior face replace the rotationally symmetric body. LV and RV use complementary surfaces with a shared boundary instead of overlapping shells. Their shared edges stay closed during pressure and the circulation demonstration. Folded auricles, surface-fitted coronary paths and localized fat establish more distinct landmarks. The thin epicardial membrane follows the same profile. The septum alone was fitted inside the revised wall; the other 13 internal parts retain their original geometry.
- **Heart material:** spatial pigment crosses the chamber boundary continuously. Muted tissue tones, finer coronary branches and less uniform gloss reduce the plastic appearance. These are authored preserved-tissue cues, not measured optical properties.
- **Frog:** a 2048px tangent-space normal map is baked from the original licensed CC0 scan, with restrained relief-based roughness. Every byte of the original geometry, indices, UVs and color image remains unchanged. No anatomy was generated from the color photograph. The prepared GLB grows from 6.14 MB to 12.13 MB; decoded texture memory and loading cost increase, but vertex/triangle counts do not.
- **Fish and earthworm:** finer flank scales that fade before the head, seated radial irises, a fitted gill-cover contour, and clearer shallow worm annuli replace several overly regular surface cues. Internal anchors, geometry hashes and cutting buffers remain protected.
- **All specimens:** key-light coverage and targets now fit the actual specimen bounds. Broader neutral fill makes dark appendages readable without washing out pale tissue. The existing one-shadow-map budget remains unchanged.

## Review limits

These remain interactive teaching models. The heart is still a procedural generalized mammalian illustration, not a patient scan or a species-validated sheep heart. Frog geometry keeps the previous scan fit and pose; the new maps do not repair proportions. Fish and worm retain their documented mixed-species limitations. Small vessel branches, pigment, roughness and fat relief are authored. Cut, physiology and organ-attachment approximations described in [the tissue review](../tissue-realism/REVIEW.md) still apply.

Only anatomical references and asset license metadata were consulted for the heart; no third-party heart model was imported. See [references and licensing](REFERENCES.md), [frog bake evidence](../specimen-exteriors/prepared/frog/surface-bake.json) and [fish/worm details](../tissue-realism/FISH-WORM-EXTERIORS.md).

## Verification

The main-model changes retain independent cuttable parts and the existing interaction route. Geometry checks cover outward-facing walls, matched chamber seams, soft-body recovery, surface-fitted vessels, septal clearance, prepared scan preservation, lighting fit, and retained internal anatomy. Required workflow checks and final browser evidence are recorded when the combined build completes verification.
