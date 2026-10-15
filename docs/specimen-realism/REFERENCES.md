# Specimen realism: anatomy and asset references

Checked 30 September 2026. These references guide the heart's authored shape and materials. **No heart scan, scan texture, or external heart mesh was downloaded or imported for this upgrade.** The interactive heart remains a generalized mammalian teaching model with illustrative human arch branches, not a patient reconstruction or a validated sheep specimen.

## Anatomical references

- [University of Minnesota Visible Heart Laboratories: comparative external anatomy](https://www.vhlab.umn.edu/atlas/comparative-anatomy-tutorial/external-anatomy.shtml) presents actual preserved human, canine, ovine and porcine specimens. Human hearts vary in outline; sheep have a more pointed apex. A sheep scan therefore cannot silently establish the proportions of a generalized or human heart. This supports an asymmetric ventricular mass with an offset apex rather than a rotationally uniform oval.
- [UMN: anterior external anatomy](https://www.vhlab.umn.edu/atlas/external-images/anterior/) shows the prominent anterior right-sided chambers, right atrial appendage over the aortic root, and projecting left appendage. These relationships guide the relative bulk of the ventricles, posterior placement of the left atrium, and unequal folded auricles.
- [Mori et al., *What is the real cardiac anatomy?*, Clinical Anatomy 32 (2019), DOI 10.1002/ca.23340](https://onlinelibrary.wiley.com/doi/full/10.1002/ca.23340) includes clinical CT reconstructions and virtual dissections. Figures 4–8 show the central aortic root and the pulmonary root anterior and leftward to it. Figure 5 places coronary branches in atrioventricular and interventricular grooves; figure 15 shows fibroadipose tissue at the atrioventricular junctions. These guide vessel placement and localized fat rather than a uniform spherical covering. An explanted teaching pose is not the heart's orientation within the chest.
- [UMN: comparative ventricles](https://www.vhlab.umn.edu/atlas/comparative-anatomy-tutorial/ventricles.shtml) documents thicker left ventricular walls, trabeculae, papillary muscles and species differences. Surface realism alone does not establish correct internal wall thickness or chamber connections.

The UMN atlas pages are reference sources, not a blanket asset license: their footer reserves rights. The individual model licenses below were checked separately.

## Reusable scan candidates inspected, not imported

All four candidates are published by **VisibleHeartLabs, University of Minnesota**. Live public Sketchfab metadata reported `isDownloadable: true`, **Creative Commons Attribution 4.0**, and permission for commercial use with author credit. A future import must preserve attribution, the license link, and a notice describing modifications. Sizes below are advertised GLB sizes; archives were not downloaded.

| Candidate | Verified metadata | Use and limitation |
| --- | --- | --- |
| [Plastinated Whole Sheep Heart, Ovine0004](https://sketchfab.com/3d-models/plastinated-whole-sheep-heart-bf437f9641ba49e1928c39b13f42dcd0) | [License metadata](https://api.sketchfab.com/v3/models/bf437f9641ba49e1928c39b13f42dcd0); 400,000 faces; about 18.7 MB | Preserved exterior reference. The aorta was removed, and the pointed sheep shape is species-specific. |
| [Whole Cow Heart Fixed](https://sketchfab.com/3d-models/whole-cow-heart-fixed-c49f873ba4be4193b880bdf624957dc4) | [License metadata](https://api.sketchfab.com/v3/models/c49f873ba4be4193b880bdf624957dc4); 400,000 faces; one texture; about 19.8 MB | Artec scan of a perfusion-fixed bovine heart; useful surface detail, different species proportions. |
| [Adult Heart0475](https://sketchfab.com/3d-models/adult-heart-0475-45c24c6b1c004c7097b7927150414e03) | [License metadata](https://api.sketchfab.com/v3/models/45c24c6b1c004c7097b7927150414e03); 728,762 faces; no textures; about 20.4 MB | Donated human heart geometry; cardiac history unknown. It provides no phototexture. |
| [Plastinated Sheep Heart0003](https://sketchfab.com/3d-models/plastinated-sheep-heart-0003-4fec653374214057a3d426720b6931ca) | [License metadata](https://api.sketchfab.com/v3/models/4fec653374214057a3d426720b6931ca); 700,000 faces; two textures; about 34.5 MB | Two coronal halves expose internal anatomy, but do not constitute independently segmented simulation structures. |

The phototextured human **Fresh Heart0614**, **Heart598**, and **Plastinated Heart0142** were instead marked **CC BY-NC**. They were excluded from import candidates for commercial deployment. No suitable verified CC0 specimen scan was established in this bounded search.

## Integration and scientific limits

None of these assets was verified as a ready replacement for independently cuttable walls, vessels, valves and covering tissues. Adoption would require mesh inspection, decimation, anatomical segmentation, interior reconstruction and remapping of interaction targets. A scan overlaid on the existing model could hide incisions and break removal relationships. The present authored geometry and pigment are illustrative; their appearance does not establish measured tissue mechanics, exact fixation chemistry or anatomical validation.
