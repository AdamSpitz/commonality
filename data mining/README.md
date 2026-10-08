# Data mining

Local workbench for collecting **real-world examples** of Commonality artifacts — causes, goals, beliefs, planks, statements, projects — from public sources. This is research input for CauseStarter wording, not a product UI and not the fake-data simulator.

Existing corpus (moved here from the repo-root `mined data/` folder):

- [`mined data/causestarter-statement-examples.md`](./mined%20data/causestarter-statement-examples.md)
- [`mined data/statement-rewrites.md`](./mined%20data/statement-rewrites.md)

Accepted new rows are appended under `mined data/runs/YYYY-MM-DD.jsonl`.

## Run

From the repo root (uses hoisted `tsx` / `express`):

```bash
npm run data-mining:dev
```

Or:

```bash
cd "data mining"
npx tsx src/server.ts
```

Open **http://localhost:5180/**.

## What you pick

**Mine for** (multi-select):

| Type | Meaning here |
|---|---|
| Cause | Named board / campaign title or summary |
| Goal | Desired outcome |
| Belief | Signable proposition |
| Plank | One independently signable civic claim |
| Statement | Generic signable issue-statement |
| Project | Concrete work, not a funding mechanism |

**Geographic level** (multi-select filter). Leave all checked for any scale. Uncheck to keep only that tier:

| Level | Meaning here |
|---|---|
| Global | Planet-wide or multi-country (UN, treaties) |
| National | Country-scale / federal |
| State / province | Statewide or provincial |
| County / parish | County, civil parish, or equivalent |
| Town | City or town / municipal |
| Neighborhood | Neighborhood, block, street, community board |

The filter biases search queries and Grok/X/Google prompts, then drops rows that clearly belong to another scale. Unclear-scale claims are kept.

**Sources** (multi-select):

| Source | Key |
|---|---|
| X | `X_BEARER_TOKEN` or `X_API_BEARER_TOKEN` (API v2 recent search). If those are missing, uses xAI `x_search` when an xAI key is set. |
| Google Search | `GOOGLE_API_KEY` + `GOOGLE_CSE_ID`. If those are missing, uses xAI `web_search` when an xAI key is set. |
| Grok | `XAI_API_KEY` / `GROK_API_KEY` / `grok_api_key`. Quotes published claims from model knowledge (not live X/web search). |
| DuckDuckGo | none |
| Wikipedia | none |
| Open URL | none (paste a page) |
| Local corpus | none (searches files in `mined data/`) |

Put keys in the repo-root `.env` or `.env.grok`. Accepted xAI aliases: `XAI_API_KEY`, `GROK_API_KEY`, `grok_api_key`. Sources without keys still show in the UI and return a clear error if you select them anyway.

Extraction is heuristic first (signable sentences; drops questionnaire stems and ALL-CAPS slogans). It follows the same bar as CauseStarter statement guidance: one claim a person could sign, not a petition tagline.

## Tests

```bash
npm run data-mining:test
```
