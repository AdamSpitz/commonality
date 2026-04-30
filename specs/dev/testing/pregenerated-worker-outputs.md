# Pre-generated Worker Outputs for Local Dev Seeding

## Problem

The AI worker services (implication finder, explorer curator, nudgers, bridge creator) are disabled by default in local dev because running them continuously burns OpenRouter API credits and isn't necessary for most development. But this means a developer who runs `./scripts/data.sh --seed` gets a sparse experience: statements and beliefs exist, but the Explorer page shows an empty state, no nudges appear, and the implication-discovery layer is inert.

## Existing Pattern (Implication Evaluations)

We already solve this problem for implication attestations. The `fake-data-generation/` scripts pre-generate LLM evaluations for the seed statement pairs and store them in `data/seed-implication-evaluations.*.json` (checked into the repo). During seeding, those results are replayed on-chain without calling the LLM again.

## Proposed Extension

Apply the same pattern to the other worker services:

**Explorer curator** — Pre-generate a curated collection from the seed statements and store it as `data/seed-explorer-collection.json`. During seeding, replay it on-chain (publish the curation transaction) without calling the LLM.

**Nudgers** — Pre-generate a set of nudge publications (implication-graph nudger, bridge creator) for the seed statements. Store as `data/seed-nudges.json`. Replay during seeding.

**Implication finder** — Pre-generate the set of statement pairs the finder would have discovered and queued for attestation. Store as `data/seed-finder-pairs.json`. Replay during seeding.

## Key Insight

The seed statements are content-addressed (stable CIDs, checked in). So the pre-generated worker outputs reference specific statement CIDs that will always exist in the seeded local chain. The outputs are "not-quite-real-but-sorta-real": they were computed at a point in time against the seed statements, possibly without the full belief graph of a real deployment. For local dev, that's fine — you need *something* in the explorer and nudge surfaces, not a perfectly personalized result.

This is analogous to Nix-style derivation caching: given known inputs (the seed statements), you pre-compute and store the output, then replay it deterministically without re-running the derivation.

## New Scripts

- `npm run gen:seed:explorer` — run explorer curator against seed statements, save curated collection to `data/seed-explorer-collection.json`
- `npm run gen:seed:nudges` — run nudgers/bridge-creator against seed statements, save to `data/seed-nudges.json`
- `npm run gen:seed:finder-pairs` — run implication finder against seed statements, save discovered pairs to `data/seed-finder-pairs.json`

All scripts should be resume-safe (skip already-generated entries) and write metadata files recording which model and prompt version was used (so we know when to regenerate after prompt changes).

## Seeding Integration

Update `./scripts/data.sh --seed` (or the underlying seed script) to replay the pre-generated outputs on-chain after the fake universe is populated, the same way implication attestations are replayed today.

## Regeneration

Pre-generated outputs need to be regenerated when:
- Seed statement content changes (CIDs change)
- The worker's prompt changes materially
- You want a fresh perspective (occasional manual refresh)

The metadata files (model name, prompt fingerprint, generated-at timestamp) make it easy to detect staleness.
