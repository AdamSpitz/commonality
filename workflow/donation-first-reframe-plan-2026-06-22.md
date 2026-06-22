# Donation-first LazyGiving reframe implementation plan

This breaks down the TODO.md item “Build the donation-first reframe of LazyGiving create + donate” into one-shot tasks for ephemeral LLMs.

Spec source: `specs/product/foolproof-project-creation.md` → “Adjacent issues” and “Goal, cap, and giving levels”.

## Boundaries

In scope:
- Keep the existing ERC-1155/general token mechanism.
- Change presentation/defaults so creators think in dollars/goals/giving levels and donors think in “give $___”.
- `$` framing, give-not-buy copy, refund-on-failure explanation.
- One transaction for mixed-token purchases via existing `buyERC1155(tokenIds, counts, ...)` shape.

Out of scope:
- Embedded-wallet claim-later recipient path.
- New contract semantics or a separate “simple mode”.
- Assuming a `$1` token exists on old/projects-created-manually.

## Proposed sequence

### 1. Extract current create-form token editing into testable helpers

Goal: make the later UI change safe by isolating the math.

Files likely involved:
- `ui/src/lazy-giving/pages/CreateProjectPage.tsx`
- new helper near `ui/src/lazy-giving/utils.ts` or `ui/src/lazy-giving/projectCreation.ts`
- `ui/src/lazy-giving/pages/CreateProjectPage.test.tsx`

Deliverables:
- Pure helper(s) for token capacity: `sum(price * supply)`, smallest-denomination detection, and formatting preview rows.
- No product behavior change except maybe clearer variable names.
- Unit tests for capacity math with multiple token types.

### 2. Create-page goal/cap defaults and generated `$1 Donation` option

Goal: creators can type a dollar goal, choose stop-at-goal vs keep-accepting, and get sensible token defaults.

Deliverables:
- Goal amount field in dollars, separate from current threshold plumbing.
- First-class cap choice defaulting to “Stop at goal (fully funded → done)”.
- Default editable `$1 Donation` giving option with explanatory note.
- Token ID remains hidden for normal creation.
- The submitted contract/token values still use existing token-type arrays and threshold fields.
- Tests for default form state and submitted metadata/contract args.

Key edge cases:
- If the creator deletes the small option, show the warning: “without a small option, donors can only give in fixed amounts”.
- Do not silently inject a hidden `$1` token after deletion; recommendations must remain editable/visible.

### 3. Create-page suggested giving levels and honest preview

Goal: the form can scaffold tiers without lying about capacity.

Deliverables:
- “Suggest giving levels” button adding editable tiers (for example $25/$50/$100).
- Live donor-eye preview.
- Collapsible “what gets created” preview showing literal token types.
- Stop-at-goal capacity math sizes the `$1` fill supply to the exact remainder when possible.
- Keep-accepting mode uses a deliberately high supply and labels the goal as a target, not a cap.
- Tests covering exact-cap math and removed-small-denomination warning.

Breakpoint: after this task, run a manual create-form pass in the browser. If the UI feels too complex, simplify before touching donor-side purchasing.

### 4. Donor-side amount-to-token allocation helper

Goal: implement the hard part as pure logic before changing UI.

Files likely involved:
- `ui/src/lazy-giving/components/BuyTokensSection.tsx`
- new helper near `ui/src/lazy-giving/purchaseAllocation.ts`
- `ui/src/lazy-giving/components/BuyTokensSection.test.tsx`

Deliverables:
- Given available token types and a desired dollar amount, compute `tokenIds` + `counts`.
- Prefer exact allocation using a small denomination when present.
- If exact allocation is impossible, return a clear snapped/fallback state instead of pretending it works.
- Support “add-on” reward tiers by adding their price first, then filling the remainder with the small token.
- Unit tests: `$1` exact amount, no-unit-token snapping/discrete fallback, mixed add-on + remainder, sold-out/zero-supply cases if availability is exposed.

### 5. Donor-side UI reframe

Goal: replace token quantity grid as the primary path with a single give amount.

Deliverables:
- Heading/copy says “Give to …”, not “Buy Tokens”.
- Single `$___` input drives allocation helper.
- Reward tiers appear as optional add-on buttons/cards.
- Existing `buyERC1155` call receives arrays from allocation helper in one tx.
- Explicit refund-on-failure guarantee near the form.
- Review/confirmation copy mentions permanence and a small network fee, with friendly errors.
- Tests for successful exact donation, reward add-on mixed purchase, impossible amount fallback, and copy regressions.

### 6. Copy sweep and compatibility pass

Goal: remove remaining marketplace/token-first wording where inappropriate while preserving secondary-market language where it is genuinely a marketplace.

Deliverables:
- `$` framing for LazyGiving create/donate primary-market paths.
- Preserve “buy/sell/listing/order” language in `SecondaryMarketSection`; that is actually a market.
- Update tests that assert old copy.
- Run targeted UI tests and `npm run typecheck --workspace=ui`.

## Suggested validation loop

For each implementation task:
- Add/adjust Vitest coverage for the touched component/helper.
- Run the targeted Vitest file(s).
- Run `npm run typecheck --workspace=ui` before committing.

After task 5 or 6:
- Run the LazyGiving project creation/purchase E2E path if local chain/IPFS setup is healthy, otherwise record why it was skipped in `CONTINUITY.md`.
