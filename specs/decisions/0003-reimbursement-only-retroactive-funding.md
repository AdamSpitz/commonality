# 0003. Reimbursement-only retroactive funding

- **Status:** Accepted
- **Date:** 2026-07-27 (recorded retrospectively; decision and implementation were made in July 2026)
- **Related specs:** [`specs/product/legal/retroactive-funding-redesign.md`](../product/legal/retroactive-funding-redesign.md), [`docs/end-user/lazyGiving/retroactive-funding.md`](../../docs/end-user/lazyGiving/retroactive-funding.md)

## Context

The original retroactive-funding design let early contributors resell transferable receipts at a markup and described that price difference as their reward. That created a promoter-authored expectation-of-profit story and exchange/dealer risk that labels such as “donation receipt” could not cure.

## Decision

LazyGiving retroactive funding uses non-transferable recognition receipts and no secondary market. Later donations fund an O(1), pull-based, pro-rata reimbursement pool; nobody may receive more than they contributed, and there is no interest, premium, bonus, or seniority. Scout incentives are factual reputation and discretionary, UI-only delegation suggestions—not protocol-promised financial returns.

## Alternatives considered

- **Keep the market and change only the wording** — rejected because the profit mechanism would remain available and observable.
- **Cap resale prices at cost** — safer than the original design, but retained a legally and product-wise vestigial trading facility.
- **Keep profitable resale and seek an exemption/registration** — rejected as disproportionate for launch and likely to pull community UI operators into the regulated perimeter.
- **Remove retroactive funding entirely** — rejected because at-cost capital recycling preserves much of the public-goods benefit without the designed upside.

## Consequences

This structurally removes token appreciation and the operated-market category from the LazyGiving flow, at the cost of eliminating financial upside and early exit. Product copy must remain reimbursement-only, and future features must not restore transferability, markup, sweeteners, per-dollar scout rewards, or an integrated market. Revisit only after Canadian and US securities counsel reviews a concrete replacement; counsel must still review the contingent zero-interest repayment right and delegation/fee questions before mainnet.
