# Cockroach midgut — bounded routing correction

September 30, 2026. Base: `87ab30281cec1ba5e2ba09d4afc4ce3c7bf3ad78`.

## Cause, scope and preservation

The mesenteron was a straight axial tube with separated ends. It omitted the
asymmetric returning route described for *Periplaneta americana*. The new
surface follows a rightward loop, turns anteriorly and ventrally, then returns
posteriorly/dorsally to the midline hindgut. Its ends overlap the existing
gizzard and ileum surfaces. The final neck aligns with the hindgut and tapers
gradually inside it, covering both rendered rims rather than leaving a side
junction with an exposed open stub.
The anterior neck retains the caecal attachment
region; the Malpighian junction and all other organs are unchanged.

Runtime scope is only `src/lab/cockroach.js` and its approved generated slot
in `lab.html`. Layout, controls, camera consent, other specimen builders,
shared assets, launcher and deployment settings are unchanged. Exact contract
and internal-vertex hashes preserve the other 26 parts, including the caecal
correction from the accepted base above. The original fingerprint fixture
is unchanged. Behavioral tests cover the revised part rather than accepting
a new whole-model snapshot.

## Reference and limits

[Richard Fox's Lander University dissection guide](https://lanwebs.lander.edu/faculty/rsfox/invertebrates/periplaneta.html)
describes the adult *P. americana* midgut's asymmetric directional sequence
and its junction with the ileum. It does not specify this model's dimensions,
curvature or proportions. No photograph, commercial image or diagram was
copied or incorporated.

This is a generalized teaching model, not a species-certified reconstruction.
The surfaces overlap at their ends; they do not simulate a continuous lumen.
The pre-existing procedural shell does not enclose the whole gut. Tests check
selected clearances and prevent extending below the existing digestive floor,
not complete cavity fit or every fine tracheal connection. Sex-specific
reproductive anatomy and other omissions remain documented in
`../dissection-realism/ANATOMY.md`. Qualified educator review is still required.

## Verification

- `python scripts/build-dissection.py --check`: approved-slot synchronization.
- `node scripts/check-learning.cjs`: fast checks, original boundaries, source
  drift and all headless tests. Run separately from software-GPU browsers.
- `node --test tests/cockroach-midgut.test.cjs`: actual continuous mesh,
  directional route, curvature, nonlocal separation, selected neighbouring
  structures, inlet intersection, mutual containment of the midgut outlet
  and hindgut inlet rims, and real dissection-engine actions.
- `node --test tests/cockroach-caeca.test.cjs`: unchanged eight-pouch anatomy,
  wall attachments and probe/scalpel/forceps behavior.
- `node scripts/check-cockroach-midgut-browser.cjs`: prepared real-render
  diagnostic with deliberately exposed digestive structures, probing and
  retention of the non-detachable midgut contract. Not a normal access sequence.
- `node scripts/check-dissection-interactions-browser.cjs`: all five actual
  rendered opening sequences through production input, plus access-layer Undo.
- `node scripts/check-dissection-browser.cjs`: all five loaded specimens,
  table contact, orientation and idle stability.
- `node scripts/check-hand-layout-browser.cjs`: 60 synthetic hand-panel states
  over six viewport families. This does not validate real webcam tracking.

Preview: `BIOLOGY_PREVIEW_URL=http://127.0.0.1:3008`. Use the evidence-output
environment variables to write all reports within this folder. All reports
must say `complete: true` and have no unexpected page errors; real-render
reports also identify the tested artifact. Camera requests are denied and
counted in the rendered app checks; the hand-layout harness loads no tracker.
Local screenshots
are not deployment evidence; after green checks and merge, compare production
HTTPS bytes with the merged commit and repeat the focused browser check live.

## Final-revision headless results

- All 436 unit tests passed in the direct two-worker run (101.8 seconds),
  including eight new midgut regressions and the existing caecal/other-specimen
  checks. No assertions failed or were skipped.
- The local aggregate wrapper passed 12/13 groups but hit its unchanged
  90-second unit-group limit. This is not recorded as a passing aggregate run.
  Required remote CI must pass the unmodified `check-learning.cjs` command
  before merge; neither its timeout nor workflow configuration was relaxed.
- The focused real-render check passed against the final artifact, including
  direct probes on three regions, the non-detachable contract, zero unexpected
  page errors and zero camera requests. Visual review caught and corrected both
  an exposed outlet rim and a complementary open inlet stub before this version.
- Exact line/arc construction avoids interpolation-induced tight bends. The
  eight midgut tests also passed a separate three-times-denser curve sampling
  check; the committed routine tests remain bounded for regular CI.
- The unchanged fast-check command passed in the required Node 22 Linux CI on
  source commit `58057c718b8654221650656374aad8f935963018`
  ([CI run 42](https://github.com/darshprasad-cmd/biology-entelloq/actions/runs/36693064036)).
  The final evidence commit must also receive a green check before merge.

## Final rendered and responsive results

- All five normal rendered cut/forceps access sequences passed, including the
  frog's native phone-tap and keyboard access-layer Undo checks. Removed access
  coverings did not remain as blocking ray targets.
- All five loaded specimens passed table-contact and dissection-axis checks;
  preserved tissue stayed still with physiology off.
- All 60 hand-shell observations across six viewport families passed, with no
  reported overlaps, inaccessible hand targets or page errors. This is a shell
  harness, not a rendered specimen view or a webcam test.
- All three real-render reports are complete, with zero page errors and zero
  camera requests. They check the same `lab.html` SHA-256:
  `8ad5f694368a960f79baa4eba8e2edb9f27efa83fd1f53ad1b129e72fca0c983`.

Complete JSON reports and representative screenshots are included. Optional
remote bloom addons are intentionally blocked in these checks; the vendored
core renderer remains in use. Software-GPU screenshot stall warnings are
recorded, not presented as a frame-rate benchmark. Deployment verification
still requires green final CI, merge, HTTPS byte comparison and a live probe run.
