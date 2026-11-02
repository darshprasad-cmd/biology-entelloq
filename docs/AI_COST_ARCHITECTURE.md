# AI cost and evidence architecture

Audited 29 October 2026 against Physics base `63a86b4` and Biology base `a8c303c` plus this branch's interface additions.

## Verified existing behavior

- Both applications call the existing shared server-side Worker. Provider credentials are not added to these changes. Physics `index.html` owns `aiURL`, request headers, model selection and several AI callers. Biology centralizes request handling in `src/ai/biology-ai.js`.
- The inspected Physics tutor uses an AbortController with a 45-second timeout, eight recent messages, 2048 maximum completion tokens and bounded streamed output. It rejects incomplete streams and presents an authored lesson fallback.
- The inspected Biology adapter bounds the question (4000 characters), context (6000), six history turns and returned answer (16000); it requests 2048 maximum completion tokens, times out after 45 seconds, handles 429/offline/cancellation and renders text safely.
- Biology grounds dissection help in current specimen, procedure and question while explicitly forbidding invented visual findings. Local assessment rubrics remain deterministic.
- The new navigation, search, notebook, assignment exchange, exports and scientific parameter restoration require zero AI requests. Existing numerical engines continue to compute measurements.

## Implementation boundary

The new search points directly to authored concepts and existing tools before a user elects to open an existing assistant. Search queries and notebook data are not logged to a new service or sent to a model. No new provider, paid request, retry loop, cache or analytics vendor has been introduced.

## Unverified server controls and exact blocker

The shared Worker implementation, provider billing account and production observability are not part of these two subject checkouts. Consequently this work cannot verify or claim enforced account quotas, authenticated authorization, pricing, token usage aggregation, monthly spending alerts or cache isolation on the deployed Worker. Client-side budgets are bypassable and would not satisfy those controls. Production configuration and secrets are intentionally untouched.

A server-side follow-up needs the actual Worker repository and staging environment. It should enforce bounded input/output, explicit feature/model allowlists, per-account quotas and a global budget, cancellation/timeouts, privacy-safe request counters, provider usage reconciliation and alerts. Authored answers can be cached by content/model version; personal questions and notebook context must not enter a shared cache. Never infer dollar spend from request counts without verified provider usage and current pricing.

## Validation

Existing AI request/stream/format tests remain required. Browser journeys for navigation, search, experiment, save and export should run with provider/network failures and still work. They do not constitute live provider validation. Native packaging must audit the `capacitor://localhost` origin separately; expanding CORS is not an authentication solution and must not be done globally.
