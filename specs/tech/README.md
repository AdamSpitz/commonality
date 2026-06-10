# Tech specs

Technical architecture and implementation specs.

## Architecture

**Stack:** Ethereum L2 (Base), IPFS, a Ponder-based thin event-cache indexer, a TypeScript SDK, and a Vite/React/Material UI frontend.

**Key pattern — Client-Side Folding:** The indexer is intentionally dumb. It stores raw on-chain events in a single table and serves them via `GET /api/events`. All state reconstruction (project state, delegation chains, funding totals) happens in the SDK's fold functions on the client. No business logic lives in the indexer.

See [indexer/README.md](indexer/README.md) for the full explanation and rationale.

## Cross-cutting docs

- [shared/tech.md](shared/tech.md) — technology choices and rationale
- [shared/decoupling.md](shared/decoupling.md) — how subsystems stay decoupled
- [ui-domains.md](ui-domains.md) — multi-domain UI architecture (shared codebase, separate domain builds)
- [artifacts.md](artifacts.md) — artifact boundaries and separately-deployed services
- [scalability.md](scalability.md) — expected scale and bottlenecks
- [multi-chain.md](multi-chain.md) — single-chain MVP, with notes on cheap choices to keep multi-chain optional later
- [security.md](security.md) — security and abuse prevention
- [bridges.md](bridges.md) — fiat bridge: Stripe flow, ETH conversion, refunds

## Subsystems

- [subsystems/conceptspace/](subsystems/conceptspace/README.md)
- [subsystems/lazyGiving/](subsystems/lazyGiving/README.md)
- [subsystems/delegation/](subsystems/delegation/README.md)
- [subsystems/aligning/](subsystems/aligning/README.md)
- [subsystems/content-funding/](subsystems/content-funding/README.md)
- [subsystems/subjectiv/](subsystems/subjectiv/README.md)
- [subsystems/mutable-refs/](subsystems/mutable-refs/README.md)
