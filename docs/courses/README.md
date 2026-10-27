# Curriculum workspace and field investigations

The workspace now follows Home → Learn → Labs → Practice → Progress on desktop
and mobile. Learn contains 44 authored chapter guides: 5 for Class 9, 5 for Class
10, 20 for Class 11 and 14 for Class 12. Their 137 explanation sections connect
to the existing 109-concept library, the lab registry and local reflections.

| Previous behaviour | Current behaviour |
| --- | --- |
| Three competing Learn catalogues | Class → unit → chapter, with the complete concept library available separately |
| Mobile Lab opened only dissection | Mobile Labs opens all 25 investigations; dissection retains its own entry |
| Section hashes visible during navigation | Clean physical address, history restoration, explicit Share link and legacy-link import |
| Home and map counts used different collections | Concept counts derive from the canonical library |
| Tools appeared before the Learn/Labs catalogue | Additional tools follow the catalogue and retain their focused workspace |
| No chapter-level reasoning record | Exportable local reflections and a student-selected review list |

`src/courses/data.js` owns curriculum content and scope; `workspace.js` owns the
reading interface and additive `bioq.courses.v1` storage. `build-library.py`
embeds the authored sources. The portable builder still emits one physical HTML
application, including all local lesson, lab and specimen dependencies.

The new stomatal-transpiration and quadrat-sampling benches use the existing
registry, notebook snapshots, exports and disposal contract. Their models keep
units, assumptions and provenance with each observation. They are educational
models, not plant calibration data or evidence of a real field survey.

Validation includes the repository's 14 check groups; new content/model/state
contracts; packaged course flows at desktop, tablet and mobile widths; blocked
storage; shared links; exact chapter/lens restoration after leaving dissection;
and the existing standalone/portable learning tools, practical guides, answer
feedback, protein viewer and immersive-world suites. Run the browser scripts
listed in `.github/workflows/ci.yml` for the full release check. CI stores rendered
evidence under its browser-evidence artifact.

The dissection simulation source and `lab.html` are unchanged. One narrowly
allowlisted launcher history statement now retains the source chapter/concept;
the original dissection/launcher fingerprint fixture is unchanged. No existing
student records are migrated or deleted.

Scope labels distinguish formative chapters and Class 10 assessment ambiguity.
These guides add substantial explanations and evidence tasks, but do not claim
an independently reviewed, exhaustive course or replace school practical work.
Browser checks do not establish real-camera accuracy, live AI availability,
hardware performance or production deployment.
