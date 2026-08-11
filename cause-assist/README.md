# Cause assist

LLM-backed helpers for CauseStarter, defaulting to **Grok 4.5** via the xAI API:

1. **Atomizer** — turn a rough cause description or bundle label into independent, signable planks (available as an API; CauseStarter's founder UI does **not** pre-fill form fields from this).
2. **Plank sharpener** — critique/reword a plank against the attestable + signable bar. CauseStarter uses this for **feedback** and shows any rewording as an opt-in example, not an automatic field overwrite.
3. **Anchor drafter** — promote established planks into an explicitly enumerated disjunctive anchor.
4. **Legacy statement suggester** — preserve the main → supporting workflow for existing causes.
5. **Implication check and safety filter** — verify arrows and apply operational acceptable-use rules.
6. **Coherence check + operator attestation** — construction-only roster judgment (planks match summary, no riders); separate prompt and model config from generation. When configured with an Ethereum keypair, positive-only on-chain badges are written as the **CauseStarter site operator** (`msg.sender`), never the founder.

The three plank-first capabilities run as cause-assist-owned strategies on the shared bridge-creator statement engine. They share execution machinery and pattern techniques with bridge creation, but never its mediation strategy prompt.

Uses the shared OpenAI-compatible client from `@commonality/attester-core` (configurable `baseUrl`).

## What statements should look like

- A statement is something a supporter would sincerely say **“yes, I believe this”** to, and sign in public.
- Specific, self-contained, unambiguous — no slogans or claims that need unstated background.
- Supporting statements must be **clearly and unambiguously implied** by the main statement (subset, rephrase, safe generalization, etc.). New policy, framing, beneficiaries, or scope fail the check.

See `src/statementGuidance.ts` and the Implication Attester evaluator prompt for the full bar.

## Endpoints

| Method | Path | Body | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | — | Liveness + whether an API key is configured |
| POST | `/suggest-statements` | `{ goal, existingStatements?, count? }` | 1–5 suggestions (filtered by implication check when LLM is on) |
| POST | `/atomize` | `{ description, existingPlanks?, count? }` | Rough cause description → 1–5 independent candidate planks |
| POST | `/sharpen-plank` | `{ plank, causeDescription? }` | Critique + optional reword against the attestable + signable bar (callers should treat `plank` as a suggestion, not auto-apply) |
| POST | `/draft-anchor` | `{ planks[] }` | Deterministic disjunctive anchor with verbatim planks and plank→anchor check payloads |
| POST | `/suggest-mediator-scaffold` | `{ foundingStatement, name? }` | Editable mediator identity, side labels, and complete starting anchor triples; never a strategy prompt |
| POST | `/check-implications` | `{ mainStatement, supportingStatements[] }` | Per-pair implies / confidence / reasoning |
| POST | `/safety-check` | `{ items: [{ text, fieldLabel? }] }` | Per-item allow/deny + user-facing explanation |
| POST | `/check-coherence` | `{ rosterCid, title, summary, planks[], mediatorBlurb? }` | Positive-only construction check for a would-be roster CID (preview; no chain write; may use heuristic without an API key) |
| POST | `/attest-coherence` | `{ rosterCid, title, summary, plankCids[], mediatorBlurb? }` | Binds structure by recomputing the roster CID and loads each plank’s text by CID, then re-judges with the **LLM only**. If coherent and operator key is configured, writes `AlignmentAttestations` from the **operator** wallet. Silence (`attested: false`) on mismatch, unloadable planks, heuristic-only judgment, not coherent, or attester not configured — never a negative chain write |

Without an API key, the suggester uses conservative local templates, implication checks are low-confidence heuristics, the safety filter uses heuristics only, and `/check-coherence` uses a narrow heuristic (no merit judgment). **`/attest-coherence` never mints a badge from the heuristic** — LLM judgment is required. Without a coherence attester private key / RPC / contract address, it never writes on chain.

## Configuration

| Env | Default | Notes |
| --- | --- | --- |
| `XAI_API_KEY` | — | xAI key — set in repo-root `.env.secrets`, then `./scripts/setup-env.sh` |
| `OPENROUTER_API_KEY` | — | Legacy fallback if no xAI/Grok key; pairs with OpenRouter base URL + `x-ai/grok-4.5` model defaults |
| `CAUSE_ASSIST_API_BASE_URL` | `https://api.x.ai/v1` (or OpenRouter when only `OPENROUTER_API_KEY` is set) | OpenAI-compatible base URL |
| `CAUSE_ASSIST_SUGGEST_MODEL` | `grok-4.5` (or `x-ai/grok-4.5` for OpenRouter-only) | Suggester model id |
| `CAUSE_ASSIST_COHERENCE_MODEL` | same as safety/suggest | Roster coherence model (own slot so it is not generation's model by accident) |
| `CAUSE_ASSIST_SAFETY_MODEL` | `grok-4.5` (or `x-ai/grok-4.5` for OpenRouter-only) | Safety filter model id |
| `CAUSE_ASSIST_IMPLICATION_MODEL` | same as suggest model | Implication check model id |
| `CAUSE_ASSIST_COHERENCE_ATTESTER_PRIVATE_KEY` | — | Operator key for on-chain coherence badges (local Compose defaults to Hardhat account #9) |
| `ETHEREUM_RPC_URL` / `CAUSE_ASSIST_ETHEREUM_RPC_URL` | — | RPC used for `attestAlignment` and document resolution |
| `ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS` | — | AlignmentAttestations deployment |
| `CAUSE_ASSIST_IPFS_GATEWAY_URL` / `IPFS_GATEWAY` | — | Gateway for loading plank documents by CID (Compose: `http://ipfs:8080/ipfs`) |
| `EVENT_CACHE_URL` | — | Indexer/event-cache base for PublishedData reads |
| `PUBLISHED_DATA_CONTRACT_ADDRESS` | — | PublishedData deployment (document reads) |
| `PORT` / `CAUSE_ASSIST_PORT` | `3002` | HTTP port |

`GET /health` includes `coherenceAttesterAddress` and `coherenceAttesterConfigured` so viewers can trust who authors the badge.

## Run (default: Docker Compose)

**Normal path:** start with the rest of the local stack. No separate host process.

```bash
# Full stack (includes cause-assist on 127.0.0.1:3002)
./scripts/services.sh --start

# Or CauseStarter + cause-assist only
./scripts/deploy-causestarter.sh

# Health
curl -s http://127.0.0.1:3002/health
```

- Compose service name: `cause-assist` (`commonality-cause-assist` container)
- Host port: **127.0.0.1:3002** (loopback) so Vite can proxy without host npm
- In-network: `http://cause-assist:3002` (CauseStarter nginx `/api/cause-assist/`)

Env/keys: put `XAI_API_KEY` in repo-root `.env.secrets`, then `./scripts/setup-env.sh localhost`. Compose loads root `.env`.

### Host process (only when changing this package)

Stop the container first so port 3002 is free, then:

```bash
docker compose stop cause-assist
# from repo root — put XAI_API_KEY in .env.secrets, then regenerate .env
./scripts/setup-env.sh localhost
set -a; [ -f .env ] && source .env; set +a
npm run build --workspace=@commonality/attester-core
npm run build --workspace=@commonality/cause-assist
npm run start --workspace=@commonality/cause-assist
# or: npm run cause-assist:dev
```

Typecheck / test:

```bash
npm run typecheck --workspace=@commonality/cause-assist
npm run test --workspace=@commonality/cause-assist
```

## Legal posture notes

- Suggestions are **drafts**; the user must adopt/edit them. Publication remains the user's signed on-chain act.
- The filter is an operated-UI gate (hide / refuse to save in CauseStarter), not chain-level censorship.
