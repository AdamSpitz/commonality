# Architecture

## Artifacts

### Core platform

  - [Smart contracts](../../hardhat/README.md) (`hardhat/`)
  - [SDK](../../sdk/README.md) — used by integration-tests, ui, and AI services
  - [Indexer](../../indexer/README.md) — thin Ponder event cache; no business logic
  - [UI](../../ui/README.md) — multiple branded surfaces from one Vite/React codebase
  - [Integration tests](../../integration-tests/README.md)
  - [Fake-data generation](../../fake-data-generation/README.md)

### AI Service Ecosystem

The core pipeline (attesters, finders, nudgers, explorer) is implemented and under active validation — not yet deployed to mainnet. See `specs/product/ai-assistance.md` for the ecosystem overview and `specs/product/` and `specs/tech/subsystems/` for individual specs.

**AI services — attesters** (evaluate claims and publish on-chain attestations):
  - [Attester Core](../../attester-core/README.md) — shared library for all attester services
  - [Implication Attester](../../implication-attester/README.md) — evaluates whether S1 implies S2
  - [Content Attester](../../content-attester/README.md) — evaluates whether a content item aligns with a statement

**AI services — finders** (proactively discover candidates for attestation):
  - [Finder Core](../../finder-core/README.md) — shared library for all finder services
  - [Implication Finder](../../implication-finder/README.md) — discovers statement pairs for the implication attester
  - [Content Finder](../../content-finder/README.md) — processes a submission queue for the content attester

**AI services — nudgers** (suggest statements to users based on what they already believe):
  - [Nudger Core](../../nudger-core/README.md) — shared library for all nudger services
  - [Implication Graph Nudger](../../implication-graph-nudger/README.md) — suggests statements implied by ones you already signed
  - [Bridge Creator](../../bridge-creator/README.md) — synthesizes common-ground statements between opposing views
  - [Explorer Curator](../../explorer-curator/README.md) — maintains a curated collection for goal-oriented exploration; personalizes per user

**AI services — beat agents** (follow a configured slice of discourse and expose multiple capabilities depending on declared purposes):
  - [Beat Agent](../../beat-agent/README.md) — ingests and remembers a beat; may act as attester (civility evaluation), finder (push-discovery), context provider (for bridge-creator), or any combination

**AI service hosting**:
  - [Service Host](../../service-host/README.md) — unified host that runs multiple AI logical services (attesters, finders, nudgers) in one supervised Node process with a shared Express listener

### Platform API service

  - [Platform API Service](../../platform-api-service/README.md) — resolves creator handles and content URLs; handles channel verification (Twitter, YouTube)

### Edge gateways (Cloudflare Workers)

Cloudflare is the public edge/naming layer; Render is compute. See [deployment instructions](../../workflow/deployment.md) for how these are deployed.

  - [Cloudflare service gateway](../../cloudflare-service-gateway/README.md) — exposes backend services (indexer, platform API, attesters) through one gateway hostname per environment, proxying to Render
  - [Cloudflare UI gateway](../../cloudflare-ui-gateway/README.md) — serves IPFS/IPNS-published UI builds under `*.commonality.works`

## Other things worth noting

### Unusual architecture: Client-Side Folding

The indexer is intentionally dumb — it's a thin event cache that stores raw blockchain events and nothing else. All state computation ("folding") happens client-side in the SDK. If you're wondering why the indexer has no business logic, this is why. See [specs/tech/indexer/README.md](../../specs/tech/indexer/README.md).
