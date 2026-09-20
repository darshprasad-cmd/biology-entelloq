# Dissection action Undo

Undo in the existing lab reverses the last pin, incision, or forceps access-layer
pull. Use the native Undo button or Ctrl/Cmd+Z. A current gesture can also be
cancelled; its held mouse button, touch, or pinch must be released before another
action starts. Typing in an input retains the browser's normal text undo.

The engine retains at most 24 action records with an 8 MiB estimated retention
budget. Records preserve the actual part meshes, transforms, material properties,
pin markers, incision metadata, layer visibility, and picking eligibility.
The cutting engine saves its local incision path and immutable rest geometry,
then disposes the affected wound/remnant and rebuilds that previous cut on Undo.
It does not reload the specimen or retain copies of GPU meshes. Prepared frog
and cockroach access-window rules are unchanged; original authored vertex normals
are restored when an incision is removed.

Undo is unavailable while specimen preparation, camera startup, imaging,
histology, or a scale journey owns the interaction. A new specimen, reset, or
pathology case starts fresh history. Organ extraction, divided/torn attachments,
and physiological injury also end the history: restoring their geometry without
repairing their simulation state would misrepresent the result. This control is
for tissue actions; it does not rewind elapsed physiology, assessment answers, or
the learning record. Successful Undo clears transient blood and announces:
“Dissection action restored; live simulation continues.” Objectives are evaluated
again against the restored attempt; earlier observations remain in the record.

## Verification

`node --test tests/dissection-undo.test.cjs` exercises the real shipped frog GLB
and the production dissection, soft-body, and cutting engines. It checks one-pin
rollback, held-input release, cancellation of a live cut preview, replacement
incision restoration, forceps removal rollback, original mesh/material/texture
identity, exact original indices/normals/rest positions, hidden deeper layers,
finite geometry, bounded history, shortcut/loading gates, and irreversible-action
boundaries. All four frog access layers are individually undone and removed again,
with earlier removed layers preserved. Repeating forceps removal after Undo checks 40 optical rays across
the prepared frog abdomen for residual upper-skin obstruction.

This CPU and synthetic-input evidence does not establish physical webcam hand
recognition, tissue biomechanics, or clinical simulation accuracy. The existing
cutting and prepared-asset regression tests remain required alongside browser
verification of the visible button and mobile layout.
