# Specimen surface and attachment refinement

## Reference direction and limits

The five user-supplied photographs were viewed for visual direction only. No
photograph, crop, extracted texture, or external asset is distributed with the
application. Their species, preparation method, preservation chemistry, lighting,
and reuse rights are not verified. Colour choices are therefore art direction,
not a claim that these models match a particular species or fixative.

The models remain generalized teaching approximations. This change does not
certify anatomy, replace an educator's review, or add a scan-derived specimen.
Known species and anatomical limits remain in
[ANATOMY.md](../dissection-realism/ANATOMY.md).

| Specimen | Restrained visual direction |
| --- | --- |
| Frog | Muted olive/ochre hide, cream belly retained, quieter gray-olive/tan viscera; broad proximal limbs taper to the existing hands and feet. |
| Bony fish | Brown-silver hide with subtle procedural scale relief; pale visceral tissue, existing dorsal-to-ventral gradient retained. |
| Cockroach | Amber-brown chitin with localized reflections; pale fat and gut surfaces. |
| Earthworm | Pink-brown body finish; existing annular grooves, segmentation and dorsal/ventral colouring retained. |
| Heart | Muted tan-brown myocardium and pale cream fat; named vessel colours remain distinguishable. |

## What changed

- Frog shoulders and hips now begin inside the actual deformed trunk surface.
  Every proximal ring is concealed inside the body. The upper limbs taper to
  narrower wrists/ankles, and the terminal tube centres extend into the original
  hands/feet. Four existing pinnable part IDs and all dissection flags remain.
  Sixteen-sided limb cross-sections reduce visible angular bends: all four tubes
  total 5,120 triangles, an increase of 2,240 over the original nine-sided tubes.
- The former organ sheen pass could raise clearcoat to 0.52–0.86 after builder
  materials had been set. It is replaced with per-tissue clearcoat of 0.12–0.34
  and rougher coats, rather than uniform lacquered organs.
  The 10%-opacity heart sac is an explicit clearer-membrane exception so it does
  not frost over the myocardium; opaque peritoneal access tissue is not made glassy.
- Tiny deterministic procedural maps provide mottling and spatially varying
  roughness. Fish hide also gets subtle scale-shaped normal relief. Maps are
  generated once per finish class per loaded specimen, with no per-frame work,
  network access, photographic assets, new dependency, or added model triangles.
- Finish materials are cloned per mesh. Original opacity, transmission,
  educational colour differences, vertex-colour gradients and selection emissive
  channels are preserved. Only known same-tissue frog limb/fat children inherit
  the finish; eyes and unrelated decorative structures are not broadly recoloured.
- Repeated application and detail-density changes do not tint materials twice.
  Teardown restores the exact builder material and disposes only finish-owned
  materials/textures, not shared builder textures.

## Verification boundary

`tests/specimen-surfaces.test.cjs` checks all four actual proximal frog rings
against the trunk, distal attachment bounds, taper, finite geometry, five
specimen finish contracts, unchanged part IDs/flags/gradients, procedural-map
determinism, cross-part material isolation, and resource restoration/disposal.
The existing anatomy-positioning suite remains applicable.

These are geometry and rendering-state checks, not proof of photorealism. Browser
review under the lab's actual lighting is still required for visual acceptance,
including intact and exposed layers, pinning, selection, specimen switching,
and weaker-device performance.
