# Tech specs

Technical architecture and implementation specs.

## Architecture

**Stack:** Ethereum L2 (Base), IPFS, a Ponder-based thin event-cache indexer, a TypeScript SDK, and a Vite/React/Material UI frontend.

**Key pattern — Client-Side Folding:** The indexer is intentionally dumb. It stores raw on-chain events in a single table and serves data via `GET /api/events`. Ponder also exposes `/graphql` for liveness/health checks, but application state reconstruction (project state, delegation chains, funding totals) happens in the SDK's fold functions on the client. No business logic lives in the indexer.

See [indexer/README.md](indexer/README.md) for the full explanation and rationale. The adopted
production topology is a [shared pointer-only feed](indexer/shared-feed-topology.md), with
per-vertical scope and policy applied client-side; [operator-scoped deployments](indexer/operator-scoped-deployments.md)
remain an optional independence path. See [ADR 0006](/specs/decisions/0006-shared-pointer-index.md).

## Decision records

- [decisions/](../decisions/README.md) — **ADRs**: an immutable, append-only log of *why*
  consequential, non-obvious decisions were made, with the alternatives rejected. **Grep
  here before reversing something that looks wrong** — it may have been deliberate.

## Cross-cutting docs

- [shared/tech.md](shared/tech.md) — technology choices and rationale
- [shared/decoupling.md](shared/decoupling.md) — how subsystems stay decoupled
- [ui-domains.md](ui-domains.md) — multi-domain UI architecture (shared codebase, separate domain builds)
- [artifacts.md](artifacts.md) — artifact boundaries and separately-deployed services
- [scalability.md](scalability.md) — expected scale and bottlenecks
- [multi-chain.md](multi-chain.md) — single-chain MVP, with notes on cheap choices to keep multi-chain optional later
- [l1-vs-l2.md](l1-vs-l2.md) — open question: should the default chain be Ethereum L1 rather than an L2?
- [cross-chain-notes.md](cross-chain-notes.md) — exploratory: letting a note buy into an assurance contract on another chain
- [contract-versioning.md](contract-versioning.md) — how to ship v2s of contracts without upgradeable proxies; per-contract migration cost classes and prep work
- [security.md](security.md) — security and abuse prevention
- [eliminating-ipfs.md](eliminating-ipfs.md) — inventory of every IPFS use and how each (and the dependency as a whole) could be eliminated, generalizing the self-published-statements calldata design
- [bridges.md](bridges.md) — fiat/onchain interoperability: bridge-operator model, recommended no-custody on-ramp path, and fallback vendors

## Subsystems

Core product subsystems:

- [subsystems/conceptspace/](subsystems/conceptspace/README.md)
- [subsystems/lazyGiving/](subsystems/lazyGiving/README.md)
- [subsystems/delegation/](subsystems/delegation/README.md)
- [subsystems/aligning/](subsystems/aligning/README.md)
- [subsystems/content-funding/](subsystems/content-funding/README.md)
- [subsystems/subjectiv/](subsystems/subjectiv/README.md)
- [subsystems/mutable-refs/](subsystems/mutable-refs/README.md)

Cross-cutting and additional technical subsystem specs (not separate core MVP product subsystems):

- [subsystems/published-data/](subsystems/published-data/README.md) — shared publication infrastructure used by several product subsystems; rollout is still in progress
- [subsystems/policy-lists/](subsystems/policy-lists/README.md) — subscribable policy blocklists, so a vertical operator can reuse another's takedown work while staying in control of what their site suppresses. Distribution plumbing, not compliance for free (proposed, not implemented). The README is the normative v1 spec and is deliberately small: **content enforcement only** (subject identity, the local policy format, three content actions, the evaluator, the resolved bundle), buildable with no chain and no money surfaces. Two deferred design candidates sit alongside it — [financial-screening.md](subsystems/policy-lists/financial-screening.md) (gating claims and gas sponsorship; needs a real data source and a review queue first) and [registry.md](subsystems/policy-lists/registry.md) (on-chain checkpoints, wire format, manifests, head-following; needs a real second keeper first). Rejected alternatives and what v1 cut in [design-history.md](subsystems/policy-lists/design-history.md)
- [subsystems/nudger/](subsystems/nudger/README.md)
- [subsystems/fundingportals/](subsystems/fundingportals/README.md)
