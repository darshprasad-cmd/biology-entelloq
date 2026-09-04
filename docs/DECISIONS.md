# Architecture decisions

Use this file for durable choices. Each new entry should include status, context, decision, alternatives, consequences, and date.

## Accepted: source and committed deployable artifacts coexist
Authoring modules live under `src/`; generated root HTML is committed and published. Behavioral edits belong in source and must be regenerated to avoid drift.

## Accepted: concatenation and offline-first delivery
Lab and universe modules are concatenated into self-contained pages with vendored/inlined dependencies. New imports or network-only runtime dependencies require an explicit migration decision.

## Accepted: the app shell embeds standalone products
Pillar pages must continue to work alone and inside `app.html`. Filename-to-slug rewriting and embed guards are one coupled routing contract.

## Accepted: no gamification
Progress exists to help the learner, without points, streaks, badges, or leaderboards.

## Testing gap: camera tracking golden cases
Pure landmark-to-gesture/tool logic should be separated from camera acquisition before the next significant tracking change. Add anonymized synthetic landmark fixtures covering steady movement, rapid movement, tracking loss, and reacquisition. Do not record or commit real camera frames.

## Proposed decisions
Record decisions before changing auth, analytics, camera-data handling, scientific models, the generation pipeline, deployment, or the offline guarantee.
