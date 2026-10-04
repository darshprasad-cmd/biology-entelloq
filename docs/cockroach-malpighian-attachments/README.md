# Cockroach Malpighian attachment and tool-contact correction

## Scope

Only `malpighian-tubules` changes in the cockroach builder. The former central
carrier lump and fourteen decorative children are replaced by six small
ampullary forms and eighteen representative blind-ended tubules in one actual
pickable mesh. The other 26 cockroach parts, the other species, prepared assets,
layout, camera/hand implementation and deployment configuration are unchanged.
`lab.html` is synchronized through the existing narrow dissection builder;
the original fingerprint fixtures remain untouched.

The reference basis and scientific limits are recorded in
[`ANATOMY.md`](../dissection-realism/ANATOMY.md). Six ampullae at the gut junction
are supported by the P. americana references. Three tubules per ampulla, their
shortened routes, spacing and dimensions are illustrative, not an adult count,
measured reconstruction or physiological simulation. Each closed root overlaps
its receiving wall; no continuous lumen is claimed. Moving the group as a unit
is an exploration aid, not a realistic extraction procedure.

## Regression coverage

- Eight dedicated tests discover the 24 closed surfaces from indexed triangles,
  check topology, finite geometry, bounded cost, actual root/wall intersections,
  nonrecursive picking on every strand, layer and visibility gates, refused
  scalpel contact, forceps removal without residue, engine Undo and disposal.
- The clearance test checks every free strand vertex against actual midgut and
  hindgut triangles. Only points physically inside an ampulla are excluded;
  a longitudinal cutoff cannot hide an early root-path collision. This caught
  and rejected an initial route that pierced the returning midgut.
- The old accepted model fails the new geometry/interaction tests. Restoring
  the rejected diagonal route in memory fails the new clearance test.
- Exact preservation hashes are independently derived from accepted commit
  `8dc2dae768bb395c02827c120f867d06e887f370`, excluding only this revised organ.
  Earlier hashes remain in the test record; exemptions do not accumulate.

## Browser evidence

`scripts/check-cockroach-malpighian-browser.cjs` renders a deliberately exposed
gut/attachment view and then isolates the excretory subset. It discovers each
thread's triangles, directly probes all eighteen, checks scalpel refusal,
extracts the complete subset from a distal thread and checks residual picking.
It also preserves the application's existing restriction on undoing organ
extraction (the lower-level engine Undo test is a separate boundary).

The diagnostic is **not the normal dissection sequence**. Run the existing
five-specimen interaction and bench checks separately, along with the responsive
hand-panel and complete single-file browser suites. Camera access is forbidden
during these checks. Synthetic inputs and shell-state checks do not validate
webcam tracking, physical touch accuracy or hardware performance.

The packaged diagnostic accepts `BIOLOGY_DEPLOYED_ARTIFACT` for exact comparison
against an independently downloaded GitHub deployment artifact; this preserves
byte verification across platform-dependent compression streams.

Qualified educator review remains necessary. The tests do not certify complete
cavity fit, every neighboring tissue, anatomical accuracy or clinical validity.
