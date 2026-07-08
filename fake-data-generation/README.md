# Generative Testing Suite

This directory contains scripts for generative testing of the Commonality smart contracts. The goal is to validate the system through automated simulation with randomly generated users and actions.

## Overview

The generative testing suite consists of:

1. **Universe Configuration** (`universe.json`) - Defines domains (politics, crypto, religion, music, climate, technology) and statement templates
2. **User Generator** (`generateUsers.js`) - Creates random users with Ethereum addresses, interests, engagement levels, and wealth distribution
3. **Statement Generator** (`generateStatements.js`) - Generates statements from the universe configuration
4. **Attester Generator** (`generateAttesters.js`) - Creates implication attesters with different evaluation strategies (neutral, strict, lenient, biased, malicious)
5. **OpenRouter Integration** (`openrouter.js`) - LLM-based implication evaluation using OpenRouter API
6. **LLM Attester** (`llmAttester.js`) - Integrates attesters with LLM evaluation for intelligent implication testing
7. **Simulation Runner** (`runSimulation.js`) - Main test orchestrator that deploys contracts and executes random user actions
8. **Utilities** (`utils.js`) - Helper functions for the test suite

## Important: Hardhat dependency

The simulation scripts (`runSimulation.js`, `fundingAndDelegationActions.js`) import the Hardhat runtime environment (`import hre from 'hardhat'`) to deploy and interact with smart contracts. This means scripts must be run from the `hardhat/` directory so that Hardhat can find its config file (`hardhat.config.cjs`) and compiled contract artifacts.

## Quick Start

### Running with npm scripts

From the fake-data-generation directory (installs dependencies first):

```bash
cd /home/adam/Projects/commonality/fake-data-generation
npm install

# Run the simulation (will auto-generate data if needed)
npm run gen:simulate

# Or with custom parameters
npm run gen:tiny        # 5 users, 1 round, 12 statements, capped actions, no invariant pass
npm run gen:small       # 10 users, 3 rounds
npm run gen:seed:local  # 10 users, 3 rounds, formal seed content, Alignment Explorer/nudge fixtures
npm run gen:medium      # 50 users, 5 rounds
npm run gen:large       # 100 users, 10 rounds
```

### Generate data separately:

```bash
# Generate users
npm run gen:users

# Generate statements
npm run gen:statements

# Generate a universe.json-compatible file from the formal seed-content JSON
npm run gen:seed:universe

# Generate the human-readable markdown docs from the formal seed-content JSON
npm run gen:seed:markdown

# Convert the formal seed-content JSON into real Conceptspace statement documents
npm run gen:seed:statements

# Upload those statement documents to IPFS (requires IPFS_API or SHOULD_USE_MOCK_IPFS=true)
npm run gen:seed:upload

# Generate attesters
npm run gen:attesters

# Regenerate checked-in local-dev Alignment Explorer/nudge/finder fixtures
npm run gen:seed:worker-outputs
npm run test:seed:worker-outputs
```

## File Layout

Generated files are split into two directories to make their lifecycle explicit:

**`data/`** — Pre-generated inputs, produced once and reused across simulation runs:
- `data/users.json` — User profiles with addresses and private keys (gitignored, cheap to regen, but we pre-generate so that they'll stay stable across runs and so that we can use the private keys when debugging)
- `data/statements.json` — Statements from the universe (gitignored, cheap to regen)
- `data/attesters.json` — Implication attesters with evaluation strategies (committed, stable reference)
- `data/attestations.json` — LLM-evaluated implication pairs (committed, expensive to reproduce)
- `data/attestations.metadata.json` — Generation metadata for the above

**`output/`** — Per-simulation-run outputs, produced fresh each time (gitignored):
- `output/actions.json` — Log of all actions performed during simulation
- `output/metrics.json` — Gas usage statistics and performance metrics

`universe.json` at the root is the hand-authored source configuration that drives generation.

## Formal Seed Content

The curated seed statements for the real system now live in `seed-content/*.json` using a small formal schema:

- one JSON file per seed-content purpose (`fundable-projects`, `hidden-majority`, `meta`, `content-funding`)
- collection-level and group-level notes so the rationale from the specs is not lost
- per-statement IDs, optional roles (for example `commonality`, `normal-left`, `pole-right`), and optional `createdDate` when a seed statement needs a stable well-known CID

Two scripts sit on top of that source:

- `npm run gen:seed:universe` writes `output/seed-universe.json`, which matches the `universe.json` shape expected by the fake-data generators
- `npm run gen:seed:markdown` rewrites `../specs/tech/subsystems/conceptspace/seed-content/*.md` so the prose docs stay aligned with the JSON source of truth
- `npm run gen:seed:statements` writes `output/seed-statements.json`, which contains real Conceptspace `DisplayableDocument` objects ready for inspection or upload
- `npm run gen:seed:upload` uploads those statement documents to IPFS and writes the resulting CIDs to `output/seed-statements.uploads.json`
- `npm run gen:seed:implications` evaluates ordered S1→S2 pairs from the seed-content corpus with the real implication-attester prompt and writes the decisions to `data/seed-implication-evaluations.<scope>.json`
- `npm run gen:seed:worker-outputs` regenerates checked-in local-dev Alignment Explorer/nudge/implication-finder fixtures in `data/seed-worker-outputs.json`
- `npm run test:seed:worker-outputs` checks that those seed worker fixtures still match the current seed content and deterministic generator
- `npm run test:seed:implication-regression` checks that the saved implication-decision corpus still matches the current statement IDs and statement text
- `npm run gen:seed:implications:verify` is the same verifier with extra operator options, including optional live rechecks and focused human-review packet output
- `npm run gen:proliferation` writes `seed-content/proliferation.json`, a large set of similar-but-distinct variants of every seed statement (see below)

### Proliferated statement variants

`npm run gen:proliferation` calls an LLM to generate 5 variants of every seed statement and writes them to `seed-content/proliferation.json` (same `commonality-seed-content-v1` format). The variants are intentionally spread across three similarity levels:

- **`variant-close`** — different phrasing, same position; an implication arrow to the original is almost certain
- **`variant-medium`** — same topic, somewhat different framing; an implication arrow may or may not be appropriate
- **`variant-distant`** — related topic, meaningfully different position; an implication arrow probably does not apply

The file is used to test the implication-attester and implication-finder: run the real implication-attester prompt over the seed/proliferation pair set and verify the decisions look sensible before using them as fake data.

Requires `OPENROUTER_API_KEY` in `.env` (or the environment). The script is resume-safe — re-running it skips already-completed groups.

```bash
# Add to .env or export first:
#   OPENROUTER_API_KEY=sk-or-...
npm run gen:proliferation
```

### Pre-generated Seed Worker Outputs

`./scripts/data.sh --seed=demo` replays checked-in worker outputs from `data/seed-worker-outputs.json` after publishing the formal seed-content universe. This gives local dev an Alignment `/explore` Fundable Project Explorer collection, statement nudges, a small implication graph, and deterministic project↔statement alignment attestations without running continuous AI workers or making live LLM calls. Tally intentionally has no `/explore` route yet.

Regenerate the fixture when the formal seed content changes:

```bash
cd /home/adam/Projects/commonality/fake-data-generation
npm run gen:seed:worker-outputs
npm run test:seed:worker-outputs
```

The fixture records a seed-content fingerprint. The verification command fails if statement IDs/text have changed without regenerating the outputs.

### Pre-generated Seed Implication Decisions

To pre-generate implication decisions for the curated seed corpus plus proliferation variants, use:

```bash
cd /home/adam/Projects/commonality/fake-data-generation

# Default scope: same original group/category, with proliferation variants folded
# back into their source group.
npm run gen:seed:implications

# Other scopes:
#   -- --scope family      # one original statement plus its variants
#   -- --scope original-variants  # original<->variant pairs only
#   -- --scope collection  # whole source collection
#   -- --scope all         # full ordered cross-product (very large)
```

The generator writes:
- `data/seed-implication-evaluations.<scope>.json` — one record per ordered pair, including negative decisions
- `data/seed-implication-evaluations.<scope>.metadata.json` — scope/model/prompt fingerprint metadata

The default `group` scope is the practical replacement for the old “same category” idea from `universe.json`: every statement is bucketed by its original seed-content group, and proliferation variants are folded back into the group of the statement they were generated from.

If you only want each real seed statement compared against its own five proliferation variants, use `--scope original-variants`. That scope emits only `original -> variant` and `variant -> original` pairs, skipping original-original and variant-variant comparisons.

To verify the saved corpus:

```bash
# Check for new, obsolete, or stale saved pairs after statement edits
npm run test:seed:implication-regression

# Re-run the live evaluator on the saved corpus to look for prompt regressions
npm run gen:seed:implications:verify -- --recheck-decisions

# Or limit the live recheck while iterating on the prompt
npm run gen:seed:implications:verify -- --recheck-decisions --limit 100

# Emit only the new/changed pairs that need human review after statement edits
npm run gen:seed:implications:verify -- --review-output output/seed-implication-review.json
```

The offline regression check intentionally compares the saved `from`/`to` statement content and metadata, not just pair IDs. If a seed statement keeps the same ID but changes text, the verifier fails and the review packet includes only the affected saved decision(s), so a human does not need to re-read the whole corpus.

## Configuration

### User Properties

Users are generated with:
- **Ethereum address and private key** - For blockchain transactions
- **Engagement level** - LURKER (40%), CASUAL (35%), ACTIVE (20%), POWER_USER (5%)
- **Wealth** - Power law distribution (1% whales, 9% large holders, 90% small holders)
- **Interests** - 1-4 domains they care about with specific positions
- **Trust network** - 0-5 other users they might delegate to

### Attester Types

Implication attesters are specialized accounts that evaluate whether statement S1 implies statement S2:

- **NEUTRAL** (30%) - Balanced evaluation with 0.8 threshold requiring clear logical connection
- **STRICT** (20%) - Very high 0.95 threshold, only obvious logical entailments
- **LENIENT** (20%) - Permissive 0.6 threshold, allows loose connections
- **POLITICAL_LEFT** (10%) - Left-leaning political lens for evaluation
- **POLITICAL_RIGHT** (10%) - Right-leaning political lens for evaluation
- **MALICIOUS** (10%) - Random evaluations for testing system robustness

Each attester has:
- **Ethereum address and private key** - For signing attestations
- **Evaluation threshold** - Confidence score required to attest implication
- **Bias** - Some attesters have political or other biases affecting evaluation
- **Statistics tracking** - Counts of attestations made

### Simulation Actions

For fast UI/review setup from the repository root, prefer `./scripts/data.sh --seed=tiny`. It intentionally reuses only a cut-down slice of the fake universe while still leaving enough data for representative statement/project/content-funding pages.

The simulation performs these actions:

### Belief & Implication Actions
- `setBelief` - User expresses belief/disbelief in a statement (35% weight)
- `setBeliefsInBatch` - User signs multiple statements at once (15% weight)
- `attestImplication` - Attester publishes S1→S2 relationship (10% weight)
- `attestAlignment` - Attest that a subject (e.g., project) aligns with a statement (10% weight)

### Funding Actions
- `createProject` - Create a new LazyGiving project with ERC1155 tokens (5% weight)
- `purchaseFromPrimaryMarket` - Buy tokens from project's primary market (8% weight)
- `createSecondaryMarketListing` - List tokens on secondary marketplace (5% weight)

### Delegation Actions
- `depositToNote` - Deposit ETH to create a delegatable note (6% weight)
- `delegateNote` - Delegate note ownership to another user (4% weight)
- `revokeDelegation` - Revoke a delegation and reclaim note ownership (2% weight)

## Metrics Collected

- **Gas usage** - mean, median, p95, max per action type
- **Action counts** - how many of each action type were performed
- **Errors** - any failures during execution
- **Block numbers** - timeline of actions

## LLM-Based Implication Evaluation (OpenRouter)

The generative testing suite now supports intelligent implication evaluation using Large Language Models via the OpenRouter API. This allows attesters to use actual reasoning rather than random decisions.

### Features

- **LLM Evaluation**: Uses Claude 3.5 Haiku (or other models) to evaluate whether S1 implies S2
- **Attester Integration**: Different attester types apply their thresholds and biases to LLM results
- **Batch Processing**: Evaluate multiple implication pairs efficiently
- **Cost Estimation**: Built-in tools to estimate API costs before running large batches

### Configuration

Set your OpenRouter API key as an environment variable:

```bash
export OPENROUTER_API_KEY=sk-or-your-key-here
export OPENROUTER_MODEL=anthropic/claude-3.5-haiku  # Optional, defaults to haiku
```

Get an API key at: https://openrouter.ai/keys

### Testing the Integration

Run the test script from the hardhat directory (needed for hardhat runtime):

```bash
# From the hardhat directory (needed for hardhat runtime)
cd /home/adam/Projects/commonality/hardhat

# Run 3 test evaluations
node ../fake-data-generation/testOpenRouter.js 3

# Run more tests
node ../fake-data-generation/testOpenRouter.js 10
```

The test script will:
1. Validate your OpenRouter setup
2. Run single evaluations with different attester types
3. Run batch evaluations
4. Show cost estimates

### Using in Simulations

To use LLM-based evaluation in your simulation, modify the simulation runner to use the `llmAttester.js` module:

```javascript
import { evaluateImplicationWithAttester } from './llmAttester.js';

// Instead of random evaluation:
const result = await evaluateImplicationWithAttester(
  attester,
  statement1,
  statement2,
  process.env.OPENROUTER_API_KEY
);

if (result.implies) {
  // Publish attestation
}
```

### Cost Estimation

Estimate costs before running large batches:

```javascript
import { estimateEvaluationCost } from './llmAttester.js';

const estimate = estimateEvaluationCost(100); // 100 evaluations
console.log(`Estimated cost: $${estimate.totalCostUsd}`);
// Output: Estimated cost: $0.20
```

Typical costs (Claude 3.5 Haiku):
- Per evaluation: ~$0.002 USD
- 100 evaluations: ~$0.20 USD
- 1000 evaluations: ~$2.00 USD

### Pre-generated Attestations for Cost Savings

To avoid calling OpenRouter on every test run, you can pre-generate attestations once and save them. First ensure dependencies are installed, then run:

```bash
# Generate pre-computed attestations (requires OPENROUTER_API_KEY)
cd /home/adam/Projects/commonality/fake-data-generation
npm install
export OPENROUTER_API_KEY=sk-or-your-key-here

# Generate 50 pairs per domain (default)
npm run gen:attestations

# Or specify number of pairs per domain
npm run gen:attestations 100
```

This creates:
- `data/attestations.json` - Pre-computed implication attestations
- `data/attestations.metadata.json` - Generation metadata

**Running simulations:**
```bash
# Use pre-generated attestations (default)
npm run gen:simulate

# Use random attestions instead (no LLM)
npm run gen:simulate -- --no-pregenerated
```

The simulation will use pre-generated attestations when available, falling back to random decisions otherwise.

### API Reference

**`evaluateImplicationWithLLM(statement1, statement2, apiKey, model)`**
- Evaluates a single implication pair using LLM
- Returns: `{ implies, confidence, reasoning, model, usage }`

**`evaluateImplicationWithAttester(attester, statement1, statement2, apiKey)`**
- Evaluates with attester-specific thresholds and biases applied
- Returns: `{ implies, confidence, llmConfidence, reasoning, attesterId, ... }`

**`batchEvaluateImplications(pairs, apiKey, model, options)`**
- Batch evaluation with rate limiting
- Options: `{ delayMs, onProgress }`

**`batchAttesterEvaluations(attesters, pairs, apiKey, options)`**
- Evaluate multiple attesters across multiple pairs
- Options: `{ maxPairsPerAttester, delayBetweenCalls, onProgress }`

## Indexer Integration Tests

Indexer integration tests live in the top-level `integration-tests/` package because they exercise multiple subsystems together (Hardhat contracts, the indexer/event cache, and SDK queries).

Run them from the project root:

```bash
npm run integration-tests              # verifier-recorded full integration check
npm run integration-tests:test:harness # verifier-recorded harness/unit check
npm run integration-tests:verbose      # raw verbose integration run
npm run test --workspace=integration-tests
```

See [`../integration-tests/README.md`](../integration-tests/README.md) for the current entrypoints and test layout.

## Future Enhancements

This is a basic version. The full generative testing plan includes:

- [x] **Attester generation** - ✓ Completed: Generate implication attesters with different evaluation strategies
- [x] **OpenRouter integration** - ✓ Completed: Use LLMs via OpenRouter API to evaluate implications with intelligent reasoning
- [x] **Funding actions** - ✓ Completed: Create projects, purchase tokens from primary/secondary markets
- [x] **Delegation actions** - ✓ Completed: Create notes, delegate to users, revoke delegations
- [x] **Attack scenarios** - ✓ Completed: Sybil attacks, spam, malicious attester, commission exploitation
- [x] **Invariant checking** - ✓ Completed: Validate contract state consistency
- [x] **Pre-generated data** - ✓ Completed: Generate attestations once, reuse for deterministic test runs
- **Scale testing** - Run with 1000+ users
- **Visualization** - Generate graphs of the belief network and funding flows
- **Deep data validation** - Compare every blockchain event with indexed records
- **Performance benchmarks** - Measure indexer throughput and query response times

## Notes

- Currently uses mock statement IDs (keccak256 hashes) instead of real IPFS CIDs
- Implication attestations can now use LLM evaluation via OpenRouter (set OPENROUTER_API_KEY to enable)
- Project addresses are randomly generated for testing
- All tests run on Hardhat's local network (deterministic for reproducibility)

## Example Output

```
=== Initializing Simulation ===

Deploying contracts...
  Beliefs: 0x5FbDB2315678afecb367f032d93F642f64180aa3
  Implications: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  AlignmentAttestations: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

Generating users...
Generated 50 users
Engagement distribution:
  LURKER: 20 (40.0%)
  CASUAL: 18 (36.0%)
  ACTIVE: 10 (20.0%)
  POWER_USER: 2 (4.0%)
Average wealth: 2.34 ETH

Generating statements...
Generated 63 statements
  Simple: 43
  Coalitions: 10
  Commonality: 10

Funding user accounts...
  Funded 50 users

=== Initialization Complete ===

=== Running Simulation ===

--- Round 1/5 ---
  Completed 247 total actions

--- Round 2/5 ---
  Completed 494 total actions

...

=== Simulation Complete ===

Results Summary:
  Total actions: 1235
  Action breakdown:
    setBelief: 617
    setBeliefsInBatch: 247
    attestImplication: 185
    attestAlignment: 186

  Gas usage:
    setBelief: mean=45231, p95=45876, max=46123
    setBeliefsInBatch: mean=78456, p95=92341, max=108234
    attestImplication: mean=56789, p95=57234, max=58123
    attestAlignment: mean=52341, p95=53123, max=54234
```
