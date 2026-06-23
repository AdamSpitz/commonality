# AI service watchlist

Use this watchlist when testnet starts running real AI services against real inputs from X, YouTube, Substack, and the onchain graph. The goal is not to prove semantic quality automatically; it is to make the important human/LLM review questions explicit and make sure verifier work keeps turning repeated observations into cheap deterministic checks.

## How to use this

- Review these questions during AI-service validation passes (runbook in [`DESIGN.md`](./DESIGN.md); the AI-service roster lives in [`coverage/validation-roster.json`](./coverage/validation-roster.json)).
- When an item becomes objective and repeatedly checkable, promote it into a verifier check or fixture under [`checks/`](./checks/), usually extending `ai-fixtures.deterministic` or adding a targeted service check.
- Treat real-world social inputs as adversarial by default: confusing context, sarcasm, slurs quoted for criticism, bot spam, stale URLs, and prompt-injection text are normal cases, not edge cases.
- Record service-specific findings in the validation pass report; record persistent verifier gaps in [`PLAN.md`](./PLAN.md).

## Cross-service things to watch

- **Input provenance:** can a reviewer see which external posts, statements, attestations, or prior memories influenced the output?
- **Trust boundary clarity:** is it obvious whether the service is an attester, finder, nudger/explorer, beat/context provider, or platform resolver, and what users are trusting it for?
- **Schema and publication shape:** does every emitted onchain/IPFS artifact match the expected schema, contain stable IDs, and remain discoverable by the SDK/UI?
- **Prompt-injection resistance:** does untrusted social/content text stay quoted as data rather than becoming instructions to the service?
- **Abstention behavior:** does the service decline or defer when context is thin, conflicting, stale, or outside its mandate?
- **Operator observability:** are logs/artifacts enough to explain why a surprising output was produced without exposing secrets?
- **Budget control:** can one bad queue, trending topic, or spam cluster drive unbounded model calls, gas spend, or publication volume?
- **Downstream safety:** if the service emits bad-but-well-formed output, does the UI make provenance/trust visible and avoid silently laundering it into authoritative truth?

## Service-specific questions

### Implication attester

- Are implication decisions conservative enough that support counts do not feel magical or overclaimed?
- Are negation, quantifiers, sarcasm, and near-duplicate wording handled without creating misleading implication edges?
- Do rejected/low-confidence cases leave enough evidence for corpus improvement?

### Content attester

- Does the attestation cite the actual content item and the exact statement/criterion being judged?
- Does it distinguish agreement with a claim from reporting, quoting, parodying, or criticizing that claim?
- For Civility/noninflammatory use, are politically loaded examples judged by visible criteria rather than hidden partisan preference?

### Beat agent

- Are beat summaries faithful to source material, or do they over-generalize from a few loud posts?
- Does long-lived memory improve context without fossilizing early mistakes or stale narratives?
- Are evaluations explicitly scoped to the beat purpose (for example US-politics civility vs. generic content quality)?
- Does the agent surface uncertainty when new real-world facts supersede earlier context?

### Implication finder

- Are candidate pairs useful enough to justify attester budget, or mostly near-duplicate/noisy pairs?
- Does queue growth stay bounded when the statement graph gets dense or spammy?
- Does it avoid amplifying low-quality statements simply because they are connected to many others?

### Content finder

- Does it find content relevant to configured statements/channels without crawling unrelated or private material?
- Are unsupported, deleted, unavailable, or rate-limited external URLs handled as ordinary states?
- Does candidate priority reflect likely value rather than recency alone?

### Implication-graph nudger

- Do nudges feel like helpful next statements rather than manipulative pressure to agree with a broader agenda?
- Are clarifying nudges clearly distinguished from stronger/more-popular implication nudges?
- Can users understand why a nudge appeared and ignore/distrust that nudger?

### Bridge-creator nudger

- Would a fair-minded person on each side recognize the bridge statement as non-strawman?
- Does it avoid smoothing over real disagreement into vague consensus language?
- Are generated statements precise enough to sign, fund, or discuss on Tally/CSM?
- Does it preserve traceability to the source disagreement without exposing private or irrelevant context?

### Explorer curator

- Do curated cause areas make sense to a first-time user, or are they insider taxonomy artifacts?
- Are emerging/high-signal statements surfaced without letting spam or duplicate attestations dominate?
- Does personalization help users explore instead of narrowing them prematurely into a filter bubble?

### Platform API service

- Are canonical identities stable across renamed accounts, deleted content, URL variants, and platform redirects?
- Are ambiguous or conflicting identity mappings rejected or flagged rather than normalized incorrectly?
- Does the service separate resolver failures from content-attestation failures so downstream UI can explain the right problem?

## Verifier promotion candidates

Promote these first because they are objective enough to automate:

- fixture corpora for quoted/hostile/prompt-injection social text across content-attester, beat-agent, bridge-creator, and nudger services;
- queue-size and budget-cap tests for finder services;
- publication-shape and SDK-discoverability checks for every service that emits onchain/IPFS artifacts;
- platform identity fixtures for renamed, deleted, ambiguous, and conflicting accounts;
- rendered-UI provenance checks showing attester/nudger/beat-agent identity next to AI-derived outputs.
