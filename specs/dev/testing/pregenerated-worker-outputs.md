# Pre-generated Worker Outputs for Local Dev Seeding

## Problem

The AI worker services (implication finder, explorer curator, nudgers, bridge creator) are disabled by default in local dev because running them continuously burns OpenRouter API credits and isn't necessary for most development. But this means a developer who runs `./scripts/data.sh --seed` gets a sparse experience: statements and beliefs exist, but the Explorer page shows an empty state, no nudges appear, and the implication-discovery layer is inert.

## Existing Pattern (Implication Evaluations)

We already solve this problem for implication attestations. The `fake-data-generation/` scripts pre-generate LLM evaluations for the seed statement pairs and store them in `data/seed-implication-evaluations.*.json` (checked into the repo). During seeding, those results are replayed on-chain without calling the LLM again.

## Current Implementation

The local-dev fixture lives in `fake-data-generation/data/seed-worker-outputs.json` and is replayed by `./scripts/data.sh --seed=demo`.

**Fundable Project Explorer curator** — Stores a curated collection from the formal seed statements for stream `fundable-project-explorer`. This is the Alignment `/explore` map of causes with cause boards, not a generic Tally explorer. During seeding, the local seed nudger signs those statements and publishes a `curated-collection` nudger publication on-chain.

**Nudgers** — Stores a deterministic nudge batch for seed statement pairs. During seeding, the local seed nudger publishes it as a `nudge-batch` publication.

**Implication finder** — Stores deterministic same-group implication-finder pairs. During seeding, the local seed nudger replays those pairs as `ImplicationAttestation` events so the implication graph is non-empty without running the finder/attester workers.

## Key Insight

The seed statements are content-addressed (stable CIDs, checked in). So the pre-generated worker outputs reference specific statement CIDs that will always exist in the seeded local chain. The outputs are "not-quite-real-but-sorta-real": they were computed at a point in time against the seed statements, possibly without the full belief graph of a real deployment. For local dev, that's fine — you need *something* in the explorer and nudge surfaces, not a perfectly personalized result.

This is analogous to Nix-style derivation caching: given known inputs (the seed statements), you pre-compute and store the output, then replay it deterministically without re-running the derivation.

## Scripts

- `npm run gen:seed:worker-outputs --workspace=fake-data-generation` — regenerate the checked-in fixture.
- `npm run test:seed:worker-outputs --workspace=fake-data-generation` — verify the fixture still matches current seed content and the deterministic generator.

The fixture records the generation algorithm and a seed-content fingerprint. The current fixture is deterministic rather than live-LLM-generated; that keeps the local-dev command cheap and stable. If/when the real worker prompts need to be used, this file is the place to add model and prompt fingerprints.

## Seeding Integration

`./scripts/data.sh --seed=demo` runs `fake-data-generation` with `--publish-seed-worker-outputs`, which replays the pre-generated outputs on-chain after the fake universe is populated. The UI consumes this collection from Alignment `/explore`; Tally intentionally does not expose `/explore` yet.

## Status as of 2026-05-01

This work is implemented and live-smoke-tested for the local demo seed path for the seeded worker outputs themselves. The remaining product/UI question is making sure Alignment `/explore` presents this fundable-project map clearly and that testnet seeding also includes real project-alignment attestations.

Validated commands:

- `npm run test:seed:worker-outputs --workspace=fake-data-generation`
- `./scripts/services.sh --start`
- `./scripts/data.sh --seed=demo`

The demo seed run successfully replayed the fixture and reported:

- 40 curated Explorer statements signed by the local seed nudger
- 40 pre-generated implication-finder pairs replayed
- 1 Explorer `curated-collection` publication with 40 entries
- 1 `nudge-batch` publication with 25 nudges
- all simulation invariant checks passing

A follow-up SDK/event-cache smoke confirmed that the replayed outputs are queryable by local clients:

- trusted local nudger publications are visible
- folded Explorer collection count is 1, with 40 entries
- folded nudge batch has 25 nudges
- seed nudger `DirectSupport` events and implication attestations are present in the event cache

So the remaining work is not implementation-planning; the feature is usable for local development.

## Suggested Further Work

Useful optional follow-ups:

- Do a real UI pass against Alignment `/explore` and statement-detail suggestion surfaces after `./scripts/data.sh --seed=demo`, checking that the seeded data is not merely queryable but presented clearly to a developer using the app.
- Add a small automated smoke test for the demo seed path, if feasible without making the suite too slow. The important assertion is that the event cache exposes the seeded `curated-collection`, `nudge-batch`, seed nudger signatures, and implication attestations.
- Decide whether deterministic fixtures are sufficient long-term. They are cheap and stable, which is good for local dev. If we later want more realistic outputs, add a separate live-LLM refresh workflow with explicit model and prompt fingerprints rather than making ordinary local seeding call an LLM.
- If real worker prompts become part of fixture generation, record prompt/model fingerprints in the fixture metadata and make the verifier detect prompt drift separately from seed-content drift.

## Regeneration

Pre-generated outputs need to be regenerated when:
- Seed statement content changes (CIDs change)
- The worker's prompt changes materially
- You want a fresh perspective (occasional manual refresh)

The metadata files (model name, prompt fingerprint, generated-at timestamp) make it easy to detect staleness.
