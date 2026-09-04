# Critical areas

## High-risk areas
- Camera permissions, MediaPipe hand tracking, landmarks, gesture/tool mapping, and dissection controls
- Anatomy, physiology, pathology, ecology, molecular models, and educational/scientific claims
- Lab constraints, cutting, soft-body behavior, specimen state, and saved progress
- Universe scale transitions, scientific data, coordinate systems, and stage boundaries
- Authentication injection, privacy, analytics, or production API keys
- Shared Living Field shader, app-shell routing, embed guards, and link rewriting
- Assemblers, generated root HTML, offline vendoring, and source/artifact synchronization
- GitHub Pages workflow, `CNAME`, `.nojekyll`, and deployment configuration

Changes in a high-risk area require all of the following before merge:

1. Explain current behavior and ownership boundaries.
2. Propose the smallest modification and list affected files.
3. Describe regression, security, privacy, scientific, and operational risks.
4. Add or update meaningful tests, or document why automation is not currently possible.
5. Run every relevant repository check.
6. Report unexpected side effects considered.
7. Receive explicit human review. Codex must not merge or deploy these changes autonomously.

Camera-based changes must include deterministic unit coverage for pure landmark/gesture logic where feasible plus manual tests for permission denial, tracking loss, rapid movement, and unsupported devices. Never store or transmit frames without an explicit reviewed privacy design.
