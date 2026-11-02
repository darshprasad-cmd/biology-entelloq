# Shared scientific experience

29 October 2026. This is an additive contract for the existing static applications, not a framework migration. Physics retains its observatory identity; Biology retains its specimen identity. Scientific engines remain the source of their own calculations.

## Implementation

`assets/entelloq-science.js` supplies deterministic discovery, versioned local notebook records and export serialization. `assets/entelloq-science.css` supplies spacing, 44 px touch targets, focus outlines, tabular readings, responsive dialogs and reduced-motion behavior. `assets/entelloq-classroom.js` is a separate local classroom pilot. The two repos carry byte-identical copies, verified by the integration check; no package-manager runtime dependency is introduced.

The subject integration owns navigation, experiment mounting, legacy deep-link compatibility, controls and scientific context. Do not put model equations into the shared interface layer. Each subject catalog is generated from the actual registry and includes a stable subject, ID, kind, title, description, tags and valid URL. Saved notebook records are searched locally and never sent to the other subject website.

## Navigation and discovery

Use the same primary labels at each breakpoint. Keep scientific capabilities reachable through intent-oriented groups and secondary navigation. Search is available through a visible control and Ctrl/Cmd+K; Escape closes and focus returns to its trigger. Results identify subject and type. Cross-subject navigation uses verified catalog URLs; no AI request is needed for search. Matching uses authored synonyms and common question-word removal, not arbitrary natural-language reasoning.

## Scientific workspace

Put the running experiment before optional tools and long explanation. Keep parameter labels and numerical values visible together. Show only applicable controls. Use contextual guidance: predict, change one parameter, observe, explain. Distinguish a restored parameter configuration from an exact simulation checkpoint. Preserve engine-owned play/reset/timeline semantics and all camera permission boundaries.

## Persistence and export

Every new save requires confirmed storage readback. Failed, full or corrupt storage must display failure. Never imply cloud synchronization. Cross-window stale edits must produce a conflict, not silent replacement. Configurations, unit-bearing readings, graph data, observations, model assumptions and provenance are part of the record when the underlying adapter supplies them. Export CSV as text-safe cells. Printable reports escape user text. Native PDF/share is owned by the unified mobile app; browser printing is not a native export implementation.

## Feature flags

`?excellence=1` enables the product preview; loopback staging enables it by default. `?excellence=0` preserves the previous experience for comparison. Public origins keep the redesign disabled without the explicit flag. `?classroom=1` additionally enables the local classroom pilot. Flags resolve from the top document in portable srcdoc frames. Native packaging must explicitly enable reviewed features and disclose them for store review; do not ship hidden undocumented functionality.

## Classroom pilot boundaries

Teachers create a catalog-backed assignment and printable structured worksheet. Students open the assignment, complete an experiment, save an observation and export a submission JSON file. Teachers import that file and save local review notes. This is manual file exchange: no roster, upload service, private inbox, automatic marking, authentication or cloud synchronization. Prefer anonymous participant codes. Scientific contents imported from another person are not independently verified by the app.

## Acceptance

Inspect Physics and Biology separately at desktop and mobile widths, including reduced motion, keyboard focus, touch-target dimensions, storage denial and recovery. Capture the actual viewport before and after. Automated browser timings are lab evidence only; the 30-second student target remains unverified until real-student sessions are recorded.
