# Cause assist

LLM-backed helpers for CauseStarter, defaulting to **Grok 4.5** via the xAI API:

1. **Atomizer** — turn a rough cause description or bundle label into independent, signable planks.
2. **Plank sharpener** — make a plank attestable without making it vague or unnatural to sign.
3. **Anchor drafter** — promote established planks into an explicitly enumerated disjunctive anchor.
4. **Legacy statement suggester** — preserve the main → supporting workflow for existing causes.
5. **Implication check and safety filter** — verify arrows and apply operational acceptable-use rules.
6. **Coherence check** — construction-only roster judgment (planks match summary, no riders); separate prompt and model config from generation.

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
| POST | `/sharpen-plank` | `{ plank, causeDescription? }` | Reword one plank against the attestable + signable bar |
| POST | `/draft-anchor` | `{ planks[] }` | Deterministic disjunctive anchor with verbatim planks and plank→anchor check payloads |
| POST | `/suggest-mediator-scaffold` | `{ foundingStatement, name? }` | Editable mediator identity, side labels, and complete starting anchor triples; never a strategy prompt |
| POST | `/check-implications` | `{ mainStatement, supportingStatements[] }` | Per-pair implies / confidence / reasoning |
| POST | `/safety-check` | `{ items: [{ text, fieldLabel? }] }` | Per-item allow/deny + user-facing explanation |
| POST | `/check-coherence` | `{ rosterCid, title, summary, planks[], mediatorBlurb? }` | Positive-only construction check for a would-be roster CID |

Without an API key, the suggester uses conservative local templates, implication checks are low-confidence heuristics, the safety filter uses heuristics only, and coherence uses a narrow heuristic (no merit judgment).

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
| `PORT` / `CAUSE_ASSIST_PORT` | `3002` | HTTP port |

## Run

```bash
# from repo root — put XAI_API_KEY in .env.secrets, then regenerate .env
./scripts/setup-env.sh localhost
set -a; [ -f .env ] && source .env; set +a
npm run build --workspace=@commonality/attester-core
npm run build --workspace=@commonality/cause-assist
npm run start --workspace=@commonality/cause-assist
```

Typecheck / test:

```bash
npm run typecheck --workspace=@commonality/cause-assist
npm run test --workspace=@commonality/cause-assist
```

Or with the CauseStarter stack:

```bash
./scripts/deploy-causestarter.sh
# or included in: ./scripts/services.sh --start
```

## Legal posture notes

- Suggestions are **drafts**; the user must adopt/edit them. Publication remains the user's signed on-chain act.
- The filter is an operated-UI gate (hide / refuse to save in CauseStarter), not chain-level censorship.
