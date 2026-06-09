# Matching funds (mechanics)

How "we'll put up half if you raise the other half" works at the contract level. For the product view (segments, positioning, what to build, entry-point question), see [specs/product/matching-funds.md](/specs/product/matching-funds.md). For the strategy and the "credible benefit" framing, see [docs/.../credible-solution/matching-funds.md](/docs/end-user/commonality/vision-and-strategy/credible-solution/matching-funds.md). For the plumbing of how a matcher's *fiat* reaches the contract, see [bridges](/specs/tech/bridges.md).

This builds on [composability.md](composability.md); read its "five composition seams" first. The one-line thesis: **a matcher is a pledger whose contribution amount may depend on other pledgers' contributions** — seam 4, not seam 2.

## The core insight: matching needs no new primitive in the common case

There is no "matching" object in the contracts, and for the common case there doesn't need to be one. A match is just a contribution whose conditionality is supplied *for free* by the assurance contract's all-or-nothing refund logic.

The two seams that make this work already exist:
- **Buy-on-behalf-of.** `buyERC1155(buyer, …)` spends `msg.sender`'s tokens but mints receipts and emits `ERC1155Bought(buyer, …)` for `buyer`. The matcher lands on the contributor leaderboard under its own name regardless of who submits the tx.
- **Monotonic-until-failure.** `refundERC1155` is gated by `requireRefundsAllowed()`, which only passes *after* the condition has failed (deadline passed, threshold unmet). So before the deadline, progress only ever goes **up**. This invariant is what makes live matching tractable (no pre-deadline refund to chase or grief).

### Fixed gap-fill (works today, zero new code)

- True cost is $10k; matcher covers half. Set `threshold = $10k`. Matcher calls `buyERC1155(buyer = matcher, …)` for $5k (up front, or as a standby pledge near the deadline — same outcome).
- The crowd now needs $5k to cross the threshold.
- Crowd adds ≥$5k → success; the matcher's $5k is spent (matched); matcher is on the leaderboard.
- Crowd adds <$5k → condition fails at the deadline → *everyone*, matcher included, calls `refundERC1155` and is made whole. The matcher paid nothing.

The property that falls out: **the matcher's money is spent iff the crowd raised at least its half.** That is exactly "I'll match your half, up to $5k," enforced by the same refund logic that makes a [credible threat](/specs/tech/subsystems/lazyGiving/composability.md) costless. This is the honest meaning of "matching is already implemented."

## What actually requires new code: partial proportional matching

Fixed gap-fill is binary at the threshold. The only thing it can't express is scaling *below* full funding — "if the crowd only raises $3k, I'll still chip in $3k and we do a smaller version." That needs (a) the matcher's contribution to be a live function of the crowd's, and (b) a project whose scope can flex with the amount — which most threshold projects can't, so this is a genuinely niche extension, not a gap in the core design.

### Why seam 2 alone is *not* the answer

[composability.md](composability.md) seam 2 lists matching as an aggregating `IProgressSource` reporting `direct + f(direct)`. That is the right tool for a **virtual** match — QF-style, where a *separate* pool pays out at settlement — but on its own it is misleading for real matching funds:

> An aggregating progress source inflates the *number the condition sees*, not the *money in the contract*. If the condition succeeds on `direct + f(direct)` but only `direct` of real ERC-20 ever entered, the recipient withdraws `direct` — less than the threshold implied. The matcher's money still has to come from *somewhere*.

So seam 2 changes the *success criterion*; it does not move the matcher's funds. Real matching funds is fundamentally seam 4: an actual pledging contract that delivers actual ERC-20. (A full QF deployment uses *both*: seam 2 for the condition, plus a matching-pool contract that actually pays the amplified amount on success.)

### The `MatchingPool` satellite contract (seam 4)

Stays entirely additive — **no changes to `AssuranceContract`, `ERC1155PrimaryMarket`, or any condition.** It composes through the interfaces already in production:

- Matcher escrows the cap (e.g. $5k) into the pool, configured with `ratio`, `cap`, and the target market address.
- `topUp()` is **permissionless** ("poke"). It reads the crowd's contribution via the existing `getAssuranceContractProgress()` (subtracting the pool's own prior contributions), computes `owed = min(ratio * crowdProgress, cap)`, and calls `buyERC1155` for the delta out of escrow.
- Because progress is **monotonic until failure**, the pool only ever tops *up* — there is no pre-deadline partial-refund to service, which is what would otherwise make live proportional matching a griefing surface.
- On failure, the pool is the receipt `holder`, so it services its own `refundERC1155` and returns the escrow to the matcher with no matcher interaction required.

### Two design knobs

1. **`buyer` = matcher vs. pool.**
   - `buyer = pool`: pool can self-refund trustlessly; leaderboard credit is attributed off-chain (the SDK/indexer labels the pool address as "Matcher X's pool"). Best for a hands-off matcher.
   - `buyer = matcher`: matcher gets native on-chain credit and holds the resellable receipts, but refunds require the matcher to hand receipts back. Worse custody story, better attribution.
2. **It's a pledger, not a condition.** Tempting to model matching as an `IAssuranceCondition`; don't. It doesn't decide success/failure, it *moves money*. It belongs on the buyer side of the seam. The condition stays a plain `ValueThresholdCondition`.

## Stacked / conditional matches

Nesting comes for free from seam 4 + the threshold logic, with no coordination contract: Org A pledges "$5k if the crowd matches" (fixed gap-fill), Org B runs a `MatchingPool` keyed off A's-plus-crowd progress. Each commitment is independently refundable if the whole thing misses the threshold. Cross-ideological co-matching is the same mechanism — two pools pointing at one market, neither aware of the other; the contract just sees ERC-20.

## Interaction with delegation refunds

If a matcher funds its pledge from a **delegatable note** rather than an EOA, the refund-into-note edge (composability.md seam 4a, `DelegatableNotes.refundIntoNote`) applies unchanged — a failed match replenishes the same revocable pool it came from. A `MatchingPool` whose escrow is itself a delegatable note would need the pool to drive `refundIntoNote` on failure; simpler for the MVP to fund pool escrow from a plain balance and leave note-funded matching pools as a later escalation.

## Build notes

- `MatchingPool` is a small contract in `hardhat/contracts/individual-projects/`, deployed via a factory mirroring `ValueThresholdConditionFactory`. It holds escrow, references one target market, and exposes `topUp()` / a failure-path `reclaim()`.
- SDK: a fold that attributes pool `ERC1155Bought` events to the configured matcher (for leaderboard credit when `buyer = pool`), and a view exposing `(ratio, cap, contributedSoFar, remainingCap)` so the UI can show "matched $X of up to $Y."
- Don't build the proportional pool speculatively. Fixed gap-fill covers the overwhelming majority of real matching offers with zero new code; the pool lands only when partial-proportional matching is being productized against a concrete flexible-scope project.
- Update [composability.md](composability.md) seam 2's "Matching" row to point here, since real matching funds is seam 4 (pledger), with seam 2 reserved for the virtual/QF success-criterion case.
