# Pre-generated Worker Outputs for Local Dev Seeding

## Problem

The AI worker services (implication finder, explorer curator, nudgers, bridge creator) are disabled by default in local dev because running them continuously burns OpenRouter API credits and isn't necessary for most development. But this means a developer who runs `./scripts/data.sh --seed` gets a sparse experience: statements and beliefs exist, but the Explorer page shows an empty state, no nudges appear, and the implication-discovery layer is inert.

## Existing Pattern (Implication Evaluations)

We already solve this problem for implication attestations. The `fake-data-generation/` scripts pre-generate LLM evaluations for the seed statement pairs and store them in `data/seed-implication-evaluations.*.json` (checked into the repo). During seeding, those results are replayed on-chain without calling the LLM again.

## Current Implementation

The local-dev fixture lives in `fake-data-generation/data/seed-worker-outputs.json` and is replayed by `./scripts/data.sh --seed=demo`.

**Explorer curator** — Stores a curated collection from the formal seed statements. During seeding, the local seed nudger signs those statements and publishes a `curated-collection` nudger publication on-chain.

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

`./scripts/data.sh --seed=demo` runs `fake-data-generation` with `--publish-seed-worker-outputs`, which replays the pre-generated outputs on-chain after the fake universe is populated.

## Regeneration

Pre-generated outputs need to be regenerated when:
- Seed statement content changes (CIDs change)
- The worker's prompt changes materially
- You want a fresh perspective (occasional manual refresh)

The metadata files (model name, prompt fingerprint, generated-at timestamp) make it easy to detect staleness.
