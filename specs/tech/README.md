# Tech specs

Technical architecture and implementation specs.

## Architecture

**Stack:** Ethereum L2 (Base), IPFS, a Ponder-based thin event-cache indexer, a TypeScript SDK, and a Vite/React/Material UI frontend.

**Key pattern — Client-Side Folding:** The indexer is intentionally dumb. It stores raw on-chain events in a single table and serves data via `GET /api/events`. Ponder also exposes `/graphql` for liveness/health checks, but application state reconstruction (project state, delegation chains, funding totals) happens in the SDK's fold functions on the client. No business logic lives in the indexer.

See [indexer/README.md](indexer/README.md) for the full explanation and rationale.

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
- [subsystems/published-data/](subsystems/published-data/README.md)

Additional technical subsystem specs:

- [subsystems/nudger/](subsystems/nudger/README.md)
- [subsystems/fundingportals/](subsystems/fundingportals/README.md)
