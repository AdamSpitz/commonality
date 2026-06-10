# Artifacts

The system is divided into several independent subsystems, each with its own domain, smart contracts, and SDK query/fold logic. They all share a single thin event cache indexer.

The four foundational subsystems (Concept Space, LazyGiving, Marketplace, Delegation) are independent of each other. The Aligning subsystem's SDK orchestrates cross-cutting queries by calling the other subsystems' SDK query functions.

See each subsystem's directory for details:
  - [subsystems/conceptspace/](subsystems/conceptspace/README.md)
  - [subsystems/lazyGiving/](subsystems/lazyGiving/README.md) (includes secondary market/marketplace)
  - [subsystems/delegation/](subsystems/delegation/README.md)
  - [subsystems/aligning/](subsystems/aligning/README.md)

## Services

For the product-level taxonomy of AI services, why they stay logically separate, and which UI domains they belong to, see [product/ai-assistance.md](../product/ai-assistance.md).

The AI service ecosystem is organized by logical role: attesters judge claims, finders discover candidates, nudgers/explorers guide users, and platform/context services connect content workflows to external platforms and ambient context. These logical roles may be bundled into fewer physical processes via [service-host](../../service-host/README.md), but their trust identities and responsibilities remain separate.

### Attester family

Attesters evaluate claims and publish signed attestations on-chain. They are purely reactive: they wait for requests, evaluate them using an LLM, and write the result to the blockchain. They do not proactively go looking for things to evaluate.

- **[attester-core](../../attester-core/README.md)** — shared library: config/env helpers, blockchain error handling, OpenRouter JSON completion wrapper, IPFS read/write, x402-style payment flow, Express scaffolding with `/health`, `/quote`, and `/status` routes.
- **[implication-attester](../../implication-attester/README.md)** — given two statement CIDs, evaluates whether S1 implies S2 and writes an `ImplicationAttestation` on-chain.
- **[content-attester](../../content-attester/README.md)** — given a self-contained content item and a statement CID, evaluates whether the content aligns with the statement and writes an `AlignmentAttestation` on-chain.
- **[beat-agent](../../beat-agent/README.md)** — purpose-guided discourse-following agent for a configured beat. Content-attestation mode writes the same positive `AlignmentAttestation` output as `content-attester`; other capabilities may expose beat context or bridge opportunities for downstream services.

### Finder family

Finders are the proactive counterpart to attesters. They watch existing data (on-chain events, submission queues, feeds) to discover candidate pairs that should be evaluated, then submit those candidates to the appropriate attester.

- **[finder-core](../../finder-core/README.md)** — shared library: file-backed JSON state (to track what's already been processed), a generic polling-loop runner, and a batched JSON POST helper for attester APIs.
- **[implication-finder](../../implication-finder/README.md)** — polls on-chain belief events, pairs newly-believed statements with popular statements, and submits candidate pairs to the implication attester.
- **[content-finder](../../content-finder/README.md)** — reads a submission queue file, resolves each content URL through the platform API service, and submits to the content attester.

### Nudger family

Nudgers suggest statements to users: "you signed S1 — you might also want to sign S2." They sit between the attester layer (which produces the implication graph) and the UI (which shows nudge suggestions).

- **[nudger-core](../../nudger-core/README.md)** — shared library: `NudgerStrategy` interface, `NudgeMessage` type, EIP-191 signing helpers.
- **[implication-graph-nudger](../../implication-graph-nudger/README.md)** — queries the implication graph to find statements implied by (or implying) a target statement, ranked by supporter count.
- **[bridge-creator](../../bridge-creator/README.md)** — uses an LLM to synthesize modified or common-ground statements that make opposing views more compatible. Its product home is Common Sense Majority; Tally is the main consumption surface; Conceptspace/nudger publications are the substrate.
- **[explorer-curator](../../explorer-curator/README.md)** — maintains purpose-specific curated statement collections and optionally personalizes them for a user. The first implemented stream powers Aligning's fundable-project explorer.

### Platform API Service

**[platform-api-service](../../platform-api-service/README.md)** — the platform-dependent backend: resolves creator handles to stable channel IDs, resolves content URLs to canonical content IDs, fetches local content context, handles channel-claim verification challenges, and hosts the content-submission queue. Used by content UIs, content finder, and beat agents.
