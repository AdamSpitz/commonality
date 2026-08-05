# Materialization of future content

**Status: design note. Proposed, not implemented, not yet decided.**
Written 2026-08-05. If this is accepted, it should become an ADR under
[`specs/decisions/`](/specs/decisions/README.md) and this file should shrink to
describe only the resulting design.

This covers the second half of the [future-content round](creator-contracts.md#prospective-content-rounds):
turning "I will write six housing explainers in June" into concrete, funded
content items after the creator actually publishes them.

## Where this sits

Content funding has two shapes:

1. **Concrete content** — fund posts that already exist. Content IDs are known
   at contract-creation time. This path works end to end today.
2. **Future-content rounds** — a creator raises money before the content exists.
   Backers hold one `ProspectiveContentTokens` receipt. Later the creator
   *materializes* the published items into a `MaterializedContentTokens`
   contract, and each backer claims a per-item recognition token.

Shape 2's redemption half has never worked. This note explains why, and proposes
the fix.

## The invariant that makes content funding safe

The [content registry](content-registry.md) maps `contentId → funding contract`
and reverts if an ID is already claimed. That is what enforces "each content item
lives in at most one active funding contract."

Because the registry cannot itself tell whether a registration is truthful, the
write is gated: `registerContent` is `onlyRegistrarOrOwner`, and deployment hands
registry *ownership* to `CreatorAssuranceContractFactory`
(`hardhat/scripts/deploy.js:312`). `Ownable` here is **access control, not
governance** — there is no admin key, no parameter to tune. Read it as: *the only
way to claim a content ID is through the validated creation path.*

If the write were public, anyone could claim every content ID on a platform,
pointing each at a junk address, and permanently brick the namespace for a few
dollars of gas.

### The property that actually does the work

The factory does not *police* honest registration so much as make dishonest
registration unreachable. Content IDs are **derived from the channel**
(`CreatorAssuranceContractFactory._buildContentId`):

```solidity
canonicalId = string.concat(channelCanonicalId, contentIdSeparator, contentSuffix);
contentId   = uint256(keccak256(bytes(canonicalId)));
```

and the factory checks both that `keccak256(channelCanonicalId) == channelId` and
that `msg.sender` is the verified channel owner.

So a creator can only mint content IDs **inside their own channel's namespace**.
Bob cannot register `twitter:uid:alice:123`: producing that hash requires Alice's
canonical channel ID, and the ownership check rejects him. Cross-creator
squatting is structurally impossible rather than merely forbidden.

**This namespace-derivation property is the load-bearing idea.** Everything below
is about restoring it on the materialization path, where it was lost.

## What is broken

### 1. The materialize path cannot execute at all

`MaterializedContentTokens.addContent` calls `contentRegistry.registerContent`,
so a materialized contract must be an authorized registrar. Registrars are set by
`ContentRegistry.setRegistrar`, which is `onlyOwner` — and the owner is
`CreatorAssuranceContractFactory`, **which has no function that calls it**. Its
only external entry points are the two create methods, two setters, and
`releaseContentOnFailure`.

So on any real deployment `setRegistrar` is unreachable forever, the `isRegistrar`
mapping is dead code, and `addContent` always reverts
`UnauthorizedContentRegistrar`.

`hardhat/test/ProspectiveContentFunding.test.js` passes only because it calls
`setRegistrar` while the owner is still a test EOA, before the ownership transfer
that deployment performs. **A green test is standing in for a path that cannot
exist.** Worth remembering when reading the rest of this subsystem's coverage.

### 2. Materialized content IDs are unconstrained

```solidity
function addContent(uint256 contentId, string calldata canonicalId) external onlyOwner
```

`onlyOwner` correctly answers "who may materialize into this round?" — the
creator. But the arguments are an **arbitrary** integer and an **arbitrary**
string, with:

- no binding to the round's channel, and
- no check that `keccak256(canonicalId) == contentId`.

The two arguments need not even be related. So the namespace derivation from §
"The property that actually does the work" is simply absent here. A creator
running a legitimate round could materialize content IDs belonging to *another*
creator's posts, permanently locking that creator's best work out of ever being
funded — and the canonical string, which is what the UI renders, could say
anything at all.

### 3. Nothing ties a materialized contract to a real round

`MaterializedContentTokensFactory.createMaterializedContentTokens` has **no
access control**, and the constructor accepts arbitrary `prospectiveToken`,
`contentRegistry`, and `sourceProspectiveContract` addresses. Anyone can deploy
one and be its owner. So "is this address a `MaterializedContentTokens`?" is not
a property worth trusting, which is why an allowlist of registrars is the wrong
tool for the job.

## Proposal

Restore the namespace-derivation property, and let the registrar question fall
out of it rather than solving it directly.

1. **Bind the materialized contract to a channel.** Store `channelId` and
   `channelCanonicalId` at construction, validated the same way the factory
   validates them (`keccak256(channelCanonicalId) == channelId`).

2. **Derive content IDs instead of accepting them.** Change `addContent` /
   `addContentBatch` to take a **content suffix**, not a raw ID, and build the ID
   exactly as `_buildContentId` does. A creator then provably cannot name content
   outside their own channel, and the canonical string always matches the hash.
   This is the substantive fix; the rest is plumbing.

3. **Let the factory deploy it.** The factory is the only thing that knows the
   channel binding and has verified ownership, and it already deploys and
   registers contracts on the concrete path. It should deploy the materialized
   contract for a given prospective round, bound to that round's channel, and
   authorize it as a registrar in the same transaction. This requires giving the
   factory the ability to call `setRegistrar` (it owns the registry, so this is a
   gated passthrough, not a new privilege).

4. **Retire the permissionless `MaterializedContentTokensFactory`** in its
   current form, or reduce it to something the creator factory calls internally.

Consequence: authorization becomes "the verified channel owner, within their own
namespace, for a round they actually ran" — enforced structurally, exactly as on
the concrete path. The registrar allowlist stops being a trust decision and
becomes bookkeeping.

### Alternatives considered

- **Registry grows an admin key** alongside the factory, and we authorize each
  materialized contract by hand. Rejected: reintroduces a human gatekeeper who
  could squat or censor content IDs, which is the thing factory-ownership was
  designed to avoid, and it does not scale past a handful of creators.
- **Allowlist any contract deployed by a known materialized-token factory.**
  Rejected: per § 3 that property is meaningless while the factory is
  permissionless, and it still leaves the namespace unconstrained per § 2.
- **Route registration back through the `CreatorAssuranceContract`**, which the
  factory already knows. Viable, and it keeps the trust boundary in one place,
  but it adds cross-contract plumbing to reach the same guarantee that deriving
  IDs from the channel gives directly.

## Open questions

- **Should a materialized content ID be registered to the materialized contract
  or to the originating assurance contract?** The registry maps
  `contentId → funding contract`, and for a future-content round the thing that
  *funded* the item is the assurance contract, while the thing that *holds
  recognition* for it is the materialized contract. Today `addContent` passes
  `address(this)`. This matters for `releaseContentOnFailure` and for what the UI
  resolves a content ID to.
- **What happens to a round that is funded but never materialized?** Backers hold
  a receipt redeemable for nothing. There is currently no deadline, no forced
  release, and no refund path after success. This may be acceptable (reputation
  carries it, per `creator-contracts.md`), but it should be a deliberate choice.
- **Does the veto window interact with materialization?** A third-party-created
  round could in principle be vetoed after the creator materializes content.

## Downstream work once this is settled

None of this is wired up yet, so the contract fix has no migration cost:

- **SDK** — no ABI sync entry, no actions, no reads for `MaterializedContentTokens`.
- **Indexer** — `ContentMaterialized` and `ContentTokenClaimed` are unhandled.
- **UI** — `MaterializeFutureContentPage.tsx` is a workflow shell: the materialize
  button is hardcoded `disabled`, and the backer claim panel exists only as an
  `Alert` describing what someone should build.

Until it is settled, note that the UI will let a creator raise a future-content
round whose backers can never redeem anything. Disabling future-content round
creation is a reasonable interim step if this work is not taken up soon.
