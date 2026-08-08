# Implication Finder

This service automatically discovers candidate implication pairs between statements and submits them to the [implication-attester](../implication-attester/README.md) for evaluation.

It is now the implication-specific implementation on top of the shared [finder-core](../finder-core/README.md) package.

## Role in the AI-service ecosystem

- **Family:** Finder.
- **Primary UI domains:** Conceptspace and Tally, because it enriches the implication graph they expose.
- **Trust boundary:** The finder is not the final trust boundary; it selects candidate pairs, and the implication attester decides whether to publish an attestation.
- **Output:** Candidate submissions to `implication-attester`; it does not write attestations directly.
- **Related services:** `implication-attester` evaluates candidates; `implication-graph-nudger` uses the completed graph for recommendations.

## What problem does it solve?

The attester service is purely reactive, not proactive: it has an API that lets others ask it to evaluate whether believing statement S1 implies believing statement S2, but it doesn't proactively go out looking for (S1, S2) pairs to evaluate. The attester's role in the system is that people trust its evaluations; it's not intended to actually go out into the big wide world of all possible pairs of statements and figure out which ones to look at.

That's what this finder service is for: it watches what statements people actually believe, finds pairs that haven't been evaluated yet and seem like they should have an implication link, and asks the attester to check them.

## How it works

Each poll cycle:

1. **Fetch all DirectSupport events** from the event cache (belief changes by any user).
2. **Find new statements** — CIDs that appeared since the last run.
3. **Fetch existing implications** — to avoid re-evaluating pairs already attested on-chain.
4. **Build a popularity map** — using `foldAllStatements` to count current believers per statement.
5. **Select candidate pairs** — for each new statement, pair it with each "popular" statement in both directions (`new → popular` and `popular → new`). Skip self-pairs and already-evaluated pairs.
6. **Send to the attester** — via `POST /evaluate-implications-batch`, in batches of 10.
7. **Persist state** — saves `lastBlockSeen` and the set of `evaluatedPairs` to a JSON file.

The logic is intentionally conservative: only statements that meet the `MIN_BELIEVER_THRESHOLD` (default: 2) are considered "popular". The `TOP_N_STATEMENTS` cap (default: 20) limits the combinatorial explosion.

## Configuration (environment variables)

| Variable | Required | Default | Description |
|---|---|---|---|
| `EVENT_CACHE_URL` | Yes | — | URL of the Ponder event cache (e.g. `http://localhost:42069`) |
| `ATTESTER_URL` | Yes | — | URL of the attester service |
| `ATTESTER_FINDER_KEY` | Yes | — | API key sent as `X-Finder-Key` header to the attester |
| `BELIEFS_CONTRACT_ADDRESS` | Yes | — | Address of the deployed Beliefs contract |
| `IMPLICATIONS_CONTRACT_ADDRESS` | Yes | — | Address of the deployed Implications contract |
| `POLL_INTERVAL_MS` | No | `30000` | How often to poll (milliseconds) |
| `TOP_N_STATEMENTS` | No | `20` | Max number of "popular" statements to use for pairing |
| `MIN_BELIEVER_THRESHOLD` | No | `2` | Minimum believers for a statement to be considered popular |
| `STATE_FILE_PATH` | No | `./finder-state.json` | Path to the JSON state file |

## State file

The finder persists its progress to avoid re-processing old events on restart:

```json
{
  "lastBlockSeen": "12345",
  "evaluatedPairs": ["<fromCid>:<toCid>", ...]
}
```

If the file doesn't exist, the finder starts from block 0 (full history).

## How it fits in the system

```
Blockchain (Beliefs contract)
    ↓ events
Ponder indexer (event cache)
    ↓ REST: /api/events
Finder
    ↓ POST /evaluate-implications-batch
Attester
    ↓ writes ImplicationAttestation on-chain
Blockchain (Implications contract)
```

The finder only *reads* from the event cache and *delegates* the actual LLM evaluation + on-chain attestation to the attester. It does not write to the blockchain directly.

## Running locally

For bundled deployments, run this logical service through `service-host` with `IMPLICATION_FINDER_ENABLED=true` (or a JSON service-host config entry). For narrow local debugging, run the package directly with the environment variables above.
