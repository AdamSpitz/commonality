# CauseStarter API map (for LLMs)

Task-oriented index for agents. Signatures live in generated TypeDoc; this page only maps **jobs → imports / HTTP**. Do not treat CauseStarter screens as an API — they will change.

Human briefing: [CauseStarter](./index.md). Concept orientation: [tldr-for-llms.md](../tldr-for-llms.md).

## Generated references (regenerate, don’t hand-write)

On a deployed site these are static files (not React routes):

- **SDK TypeDoc:** [/api-docs/sdk/](/api-docs/sdk/)
- **Solidity contract docs:** [/api-docs/contracts/index.md](/api-docs/contracts/index.md)

Regenerate with `npm run build:docs` at the repo root (`typedoc` on `sdk/`, solc docs on `hardhat/`). Local Vite (`causestarter:dev` on :5174) serves the same trees at those paths when the generated folders exist.

There is **no CauseStarter REST API**. The UI is a lens over the SDK plus a few helper HTTP services.

## What is already in the SDK (including IPFS)

Import subpaths of `@commonality/sdk` (no flat barrel). Construct machinery with `createSDKMachinery` from `@commonality/sdk/machinery`. Node env helpers: `@commonality/sdk/node` (`createIPFSConfigInNodeJSFromTheUsualEnvVars`).

| Job | Import | Functions |
| --- | --- | --- |
| Fetch / upload IPFS | `@commonality/sdk/utils` | `fetchFromIPFS`, `uploadToIPFS`, `uploadBlobToIPFS`. Upload needs `ipfsConfig.apiUrl` (Kubo `/api/v0/add`). Fetch needs `gatewayUrl`. |
| Publish statement bytes on-chain | `@commonality/sdk/published-data` | `publishData`, resolvers. Content-addressed documents also go through displayable-documents. |
| Create a signable statement and sign it | `@commonality/sdk/conceptspace` | `createAndSignStatement` (upload + PublishedData + `believeStatement`). Also `believeStatement` / `disbelieveStatement` / `clearOpinion`. |
| Read a statement | `@commonality/sdk/conceptspace` | `getStatement`, `getStatementWithContent`, `getUserBelief`, believer-set helpers. |
| Implication graph | `@commonality/sdk/conceptspace` | `getImplicationsFrom`, `getImplicationsTo`, `getImplication`. On-chain attest is `attestImplication` (usually an attester service, not a donor). |
| Cause board as a named ref | `@commonality/sdk/mutable-refs` | `getUserRef`, `getUserRefs`. Organizers publish a roster document and point a named ref at it. |
| Projects / pledges | `@commonality/sdk/lazy-giving`, `@commonality/sdk/fundingportals`, `@commonality/sdk/delegation` | `getProject`; alignment/success vouches; notes and standing pledges. |
| Indexer | `@commonality/sdk/utils` event-cache client; `@commonality/sdk/indexer-sync` | Raw events only. Fold in the SDK. `GET {EVENT_CACHE_URL}/status`. |

Local defaults after a stack start: `IPFS_API` → localhost:5001, `IPFS_GATEWAY` → localhost:8080/ipfs, `EVENT_CACHE_URL` → localhost:42069, plus the usual `*_CONTRACT_ADDRESS` env vars.

## HTTP services that are *not* the SDK

These are optional operators. Anyone can run their own. Users trust *identities* (attester / nudger addresses), not “the platform.”

| Service | Typical local URL | What an agent calls | Notes |
| --- | --- | --- | --- |
| **Cause assist** | localhost:3002 | `POST /atomize`, `/sharpen-plank`, `/draft-anchor`, `/check-implications`, `/safety-check`, `/check-coherence`, bridge-cluster draft verbs | Wording help only. **No chain writes.** See `cause-assist/README.md`. |
| **Implication attester** | localhost:3006/implication-attester (compose path) | `POST /evaluate-implication`, `POST /evaluate-implications-batch`, `GET /health`, `/quote`, `/attester-status` | x402 payment on evaluate. Positive evaluations publish on-chain. |
| **Content attester** | content-attester package | `POST /evaluate-content` (batch too) | Same attester-core HTTP shape; different prompt/domain. |
| **Finders** | implication-finder, content-finder | Usually **no public “please find” API** | Poll event cache, POST candidates to an attester. |
| **Nudgers** | implication-graph-nudger, explorer-curator, bridge-creator | `GET /.well-known/nudger.json`, `POST /suggest` (curator), `POST /propose-bridge` (bridge-creator) | Suggestions are signed publications; users opt in. |
| **Platform API** | localhost:3001 | onramp, sponsored gas, policy content | Ops for the operated UIs, not the protocol. |
| **Coherence badge worker** | worker package | operator-only chain write | CauseStarter site operator mints badges; cause-assist HTTP must not hold that key. |

Attester-core shared routes: `GET /health`, `GET /quote`, plus a per-service status path.

## MCP in this repo

Package `@commonality/mcp` (`mcp/`). Stdio server wrapping the SDK reads (and optional writes) plus the HTTP helpers above.

```bash
npm run mcp --workspace=@commonality/mcp
```

Grok:

```toml
[mcp_servers.commonality]
command = "npm"
args = ["run", "mcp", "--workspace=@commonality/mcp"]
```

Writes (`upload_ipfs`, `believe_statement`) stay off unless `COMMONALITY_MCP_WRITES=1` and a key is set. Implication evaluate may still return HTTP 402 (x402).

## Rules of thumb

- Prefer SDK queries over scraping CauseStarter.
- Prefer `getStatementWithContent` over raw gateway fetches when you want displayable JSON.
- Do not invent a cause directory; you need an owner address + slug/ref name, or a statement CID.
- Do not treat an attester HTTP 200 as “the protocol agrees.” It is one identity’s attestation, filtered by the viewer’s trust graph.
