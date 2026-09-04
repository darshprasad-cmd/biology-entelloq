# Analytics contract

No canonical PostHog instrumentation was found on the default branch when this document was created. Do not mix analytics capture into the lab, universe, shaders, or lesson engines.

If analytics is introduced:
- use one adapter with a no-op/offline path;
- document consent and retention;
- never capture camera frames, landmarks, specimen imagery, prompts, free-form answers, health-related input, or direct identity;
- use lowercase `object_action` names and `snake_case` properties;
- catalog every event before implementation.

## Event catalog
| Event | Trigger | Properties | Owner | Status |
|---|---|---|---|---|
| _None yet_ | | | | |

Event renames or semantic changes require an entry in `docs/DECISIONS.md`.
