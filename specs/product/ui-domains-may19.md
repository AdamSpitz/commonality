# May 19 - let's fold Delegation into LazyGiving

Fold Delegation into LazyGiving and Content-Funding as a tab rather than its own domain.

The thinking: there's effectively one token kind ecosystem-wide (ERC1155s from `MultiERC1155AssuranceContract` subclasses — both `AssuranceContract` and `CreatorAssuranceContract`), so one `DelegatableNotes` instance serves the whole ecosystem; Alignment doesn't issue its own tokens, just attests on existing ones. That makes delegation a feature of the surfaces that issue/manage notes, not a standalone product. Delete the `delegation` domain build, move its management UI into LazyGiving and Content-Funding as a tab, and put delegate discovery + public track records somewhere sensible (likely a profile page on LazyGiving, possibly mirrored in Alignment where scouts hang out).

Smart-contract cleanup to do at the same time (should be fairly small — the existing two purchase functions correspond to two *market shapes*, primary vs secondary, not two products):
  - Replace the manual `authorizedPrimaryMarkets` per-market allowlist + single hardcoded `primaryMarketFactory` with a registry of approved primary-market factories, so `CreatorAssuranceContractFactory` (and any future factory of conforming markets) can be registered once instead of per-contract.
  - The registry is a trust boundary: approving a factory means its deployed contracts are expected to conform to the `ERC1155PrimaryMarket` purchase/pricing interface. Do not loosely bless arbitrary contracts as markets; products should plug in through deployment provenance from an approved factory.
  - Document the invariant in the contract and docs: "There are exactly two purchase shapes — primary (`ERC1155PrimaryMarket`) and secondary (`ERC1155SecondaryMarket`) — because every token in this ecosystem is an ERC1155 sold via one of those two interfaces. New products plug in by deploying a factory of conforming primary markets and registering the factory; a genuinely new exchange mechanism would require a v2 or a new purchase adapter."

Implementation status:
  - [x] `DelegatableNotes` authorizes primary markets via approved factories exposing `isDeployedPrimaryMarket(address)`.
  - [x] `AssuranceContractFactory` and `CreatorAssuranceContractFactory` expose that factory predicate.
  - [x] Content-funding deployment registers the creator-contract factory once instead of registering each creator contract.
  - [x] Remove the standalone Delegation UI domain build and move its management screens into LazyGiving / Content Funding tabs.
  - [x] Decide final home for delegate discovery + public track records: LazyGiving owns public delegate profiles at `/delegates/:address`; Content Funding and Alignment can link/mirror later, but LazyGiving is the canonical discovery/track-record surface because delegation is a funding feature and LazyGiving is the general-purpose project-funding surface.

## Old description from ui-domains.md

The site for setting up and managing delegation relationships. As a donor, you pick a delegate (anyone you choose); your money flows through their judgment while your name stays on the contributor list. As a delegate, you build a public on-chain track record. Used by LazyGiving, Alignment, and Content Funding.

Contains: delegate discovery, delegation setup and revocation, delegate track-record views.

Audience: donors who want to contribute without deciding everything themselves, and people who want to act as delegates.

Key ideas to make salient:
  - title: Lazily contribute to causes you care about
  - sections:
    - title: Want to give, but feeling lazy?
      description: Route your donations through anyone you trust — they decide which projects to fund; your name still shows up on the contributor list; revoke anytime
    - title: Follow the ecosystem closely?
      description: Find people who trust you enough to let you make their donation decisions on their behalf; build a public track record as a delegate; your decisions are transparently on-chain
  - actions:
    - View delegation dashboard
  - below the fold:
    - label: Supported by
      text: LazyGiving, Alignment, and Content Funding (link to each other site)
    - text: On each site that supports delegation, donations will show up as "Alice Donor (delegated via Bob Delegate)"
