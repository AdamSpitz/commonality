# Cause assist

Two LLM-backed helpers for CauseStarter, defaulting to **Grok 4.5** via the xAI API:

1. **Statement suggester** — given a cause **goal**, propose short supporting statements that explain the goal and its drivers.
2. **Safety filter** — review goals, statements, and other free text against operational acceptable-use themes from the legal specs.

Uses the shared OpenAI-compatible client from `@commonality/attester-core` (configurable `baseUrl`; OpenRouter defaults remain for implication/content attesters).

## Endpoints

| Method | Path | Body | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | — | Liveness + whether an API key is configured |
| POST | `/suggest-statements` | `{ goal, existingStatements?, count? }` | 1–5 suggestions |
| POST | `/safety-check` | `{ items: [{ text, fieldLabel? }] }` | Per-item allow/deny + user-facing explanation |

Without an API key, the suggester uses local templates and the safety filter uses heuristics only. `.env.grok` is optional.

## Configuration

| Env | Default | Notes |
| --- | --- | --- |
| `XAI_API_KEY` / `GROK_API_KEY` / `GROK_API_Key` | — | xAI key (optional repo local file: `.env.grok`) |
| `OPENROUTER_API_KEY` | — | Legacy fallback if only OpenRouter is configured |
| `CAUSE_ASSIST_API_BASE_URL` | `https://api.x.ai/v1` | OpenAI-compatible base URL |
| `CAUSE_ASSIST_SUGGEST_MODEL` | `grok-4.5` | Suggester model id |
| `CAUSE_ASSIST_SAFETY_MODEL` | `grok-4.5` | Safety filter model id |
| `PORT` / `CAUSE_ASSIST_PORT` | `3002` | HTTP port |

## Run

```bash
# from repo root — optional .env.grok for live LLM calls
set -a; [ -f .env.grok ] && source .env.grok; set +a
export XAI_API_KEY="${XAI_API_KEY:-${GROK_API_KEY:-$GROK_API_Key}}"
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
