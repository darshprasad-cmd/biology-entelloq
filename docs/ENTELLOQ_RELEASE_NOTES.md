# Biology product release candidate

The release candidate makes the existing experiments easier to find, manipulate and keep. It retains the original learning documents, engines, portable HTML delivery and all legacy destinations.

Current runtime: `87df88b0117c1b54fa2c0c8667343c1e3bd1f435`, integrated 2026-11-20. The candidate includes released questionnaire/mobile improvements, the synthetic pollen bench and the released Class 11 chromatography bench at its existing practical route. Chromatography retains the released setup checks, distance/Rf readings, local persistence and CSV export; its datasets are explicitly synthetic. The product guest route and original questionnaire route are both validated. [Current integration evidence](product-excellence/chromatography-integration-20261120/README.md) records the artifact and complete local check results.

- Shared five-destination navigation, accessible mobile search and a direct Physics subject link.
- Guest osmosis entry before optional study preferences; registration remains optional.
- Deterministic search across the exported Physics/Biology catalogues and locally saved experiments, with synonyms, direct destinations and keyboard navigation.
- Scientific workspace actions, local-only save feedback, paused-state resume for six supported process models and explicit evidence-only saving elsewhere.
- Persistent trial-graph selection, CSV and printable/PDF reports, readable mobile controls and scrollable graph/data views.
- Model classification, existing assumptions and limitations alongside experiment evidence.
- Separate classroom pilot with assignment worksheets, canonical experiment matching, submission files and local teacher review; no cloud inbox or automatic transmission.
- Fixed stale child-context events overwriting the active catalogue/reading route.
- Preserved pending reading-load recovery during label refresh and rejected delayed navigation from replaced or hidden child documents, while retaining legitimate startup routing.

The original dissection artifact, specimens, hand-tracking code and immutable preservation fixture are unchanged. No new production framework or rendering dependency was introduced. Shared code and catalogue contracts remain usable by the separately owned native shell.

Enable on local staging with `?excellence=1`; `excellence=0` restores the original product flow. Classroom additionally requires `classroom=1`. Existing local notebook/history keys are preserved; clearing browser data still removes device-local work, so exports remain necessary backups.

Validation and screenshots are indexed in `ENTELLOQ_TEST_REPORT.md`. Real-student studies, real-camera/device validation, school privacy approval, hosted release checks and production deployment are not claimed. Production deployment requires explicit user approval; rollback instructions are in `BIOLOGY_ENGINEERING.md`.
