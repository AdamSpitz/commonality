# Decoupling the pieces

Commonality's statements, implication graph, trust, and subject attestations are
independent of its financial mechanisms. The current funding product remains
LazyGiving's assurance contract with non-transferable receipts and at-cost
reimbursement. ERC-1155 compatibility alone does not imply compatibility with
that funding lifecycle.

For the broader map of potentially independent funding pieces and a staged
external-project integration, see [Funding decomposition exploration](funding-decomposition.md).
That document records possibilities, not an implementation commitment or legal assessment.

## Implemented boundaries

- Delegated purchases depend on `IFundingMarket`, not the concrete assurance
  implementation. Refunds use the separate `IRefundableFundingMarket` interface.
  See [the interfaces](/hardhat/contracts/delegation/IFundingMarket.sol).
- [AssuranceReimbursement](/hardhat/contracts/delegation/AssuranceReimbursement.sol)
  isolates the existing pool's cumulative pro-rata interpretation. Notes retain
  ownership, contribution basis, and per-chain withdrawal bookkeeping. This is an
  assurance-specific adapter, not a universal reimbursement formula.
- [FundingSummary](/sdk/src/utils/funding-summary.ts) is event-independent
  presentation data with optional contribution, refund, and reimbursement
  capabilities. Funding may have no target. Shared aggregation does no chain
  reads and knows no contract addresses or assurance events.
- [The threshold adapter](/sdk/src/subsystems/lazy-giving/funding-summary.ts)
  owns threshold/deadline interpretation. The existing
  `foldAlignedProjectFunding` query loads assurance data and feeds this adapter
  into shared aggregation, so existing cause-board consumers use the boundary.
  Its existing public exports and result fields remain compatible.

The contract extraction preserves transaction/event ABIs, storage, rounding,
factory authorization, and existing receipt behavior. It adds neither a public
adapter registry nor unrestricted delegated calls. Interface conformance is not
proof of economic behavior or permission to spend. Refund/reimbursement methods
remain explicit optional calls; there is no automatic capability probing.

## A second use case

An ongoing direct-donation fund for a public-good maintainer could share causes,
attestations, trust, and discovery with assurance projects. Its presentation
would have contributions without a funding target, refund capability, or
reimbursement pool. The pure summary layer supports that shape; an actual
donation product and its delegated execution are not implemented.

## Boundaries still to generalize when needed

Project discovery still follows configured factories and known event schemas.
The current project identity is still the assurance-contract address. Existing
project-detail and transaction UIs remain assurance-specific. The threshold
adapter is a presentation heuristic, not an authoritative check for custom
conditions; those require their own interpretation.

Supporting a real second mechanism requires explicit discovery, state/action
integration, and bounded delegated-spending authorization. Unsupported features
must be absent, not represented as successful zero-balance features. The legacy
assurance query still falls back to zero when reimbursement reads fail; that
fallback must not be used to discover capabilities of unknown contracts.

The prior exploration discussed secondary markets and freely transferable
tokens. Those are no longer the LazyGiving product: see
[ADR 0003](/specs/decisions/0003-reimbursement-only-retroactive-funding.md).
