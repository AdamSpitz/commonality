# Recurring pledges (standing orders)

Let a user set up an ongoing pledge once — "every month, use funds from my account to create a $X note for cause C and delegate it to Alice" — and have it recur without further action, while the public record shows how much ongoing money is pledged to each cause.

Tech mechanics: [specs/tech/subsystems/delegation/recurring-pledges.md](../tech/subsystems/delegation/recurring-pledges.md).

Status: **not yet implemented** (confirmed: nothing recurring exists in the contracts, SDK, or other specs). The note primitive is one-shot — `deposit` (create a note) + `delegate` (hand it down a chain) — so a recurring pledge is "do that on a monthly cadence." It's deliberately orthogonal to the rest of the system.

## The core split: intent vs. execution

Two separable things, and keeping them separate is what keeps this simple:

- **The standing-pledge intent** — "I intend to put $X/month toward cause C, delegated to Alice." This is what the site shows as "ongoing $/month pledged to C" and what any credible-threat math would read. It is **public and indexable**, recorded once.
- **The execution** — the actual monthly create-note-and-delegate. This is swappable along a commitment spectrum without changing what the UI displays or how totals are computed.

Recording the intent fits the project's existing pattern: emit an event, let the indexer fold it, let the SDK reconstruct per-cause monthly totals — exactly how everything else is reconstructed.

## The commitment spectrum (the UI offers several; no need to pick one)

From firmest to softest:

1. **Pre-funded escrow, released monthly** — strongest, but locks capital up front and isn't really "from my account each month." Offered as an option for people who want maximum commitment, not the default.
2. **Hands-off auto-pull (the baseline — see below)** — authorize once; it recurs automatically; capital stays liquid in the user's wallet; opt out anytime.
3. **Reminder to sign** — softest; we email/notify the user each month with a ready-to-sign transaction. No standing authorization, weakest commitment, requires the user to act each time. A fallback/soft option, explicitly **not** the default.

## The default must be fully hands-off

The baseline option must require **no ongoing action** from the user. He authorizes once and can opt out anytime, but he never has to opt *in* again each month.

That rules out the reminder-to-sign path as the default. The hands-off baseline is: **authorize once** (grant a spending allowance + record the standing pledge), then it executes automatically each period. We can run the scheduler **offchain** — that's fine — as long as the execution itself doesn't ask the user to do anything. (For robustness the execution entry point should be pokeable by anyone, not only our runner, so a missed run by us doesn't silently drop a pledge; details in the tech note.) Opting out = cancel the pledge or revoke the allowance.

Capital is **not** locked: the funds stay in the user's wallet and are pulled at execution time, so a standing pledge is a revocable authorization, not an escrow. (Native-ETH pledges are the one wrinkle — pull-based recurring needs an ERC-20-style allowance, so ETH would need wrapping or the escrow option; see tech note.)

## What the UI shows

- Per cause: total ongoing $/month pledged, foldable from the public intent records.
- Per user: their active standing pledges, each cancelable in one click.
- **Backing strength matters for display.** An allowance-backed auto-pull (with balance present) is stronger evidence than a soft reminder-based intent. The intent record carries a "backing type" so the UI — and especially any credible-threat presentation — can distinguish "$8K/month committed (auto-pull)" from "$3K/month intended (soft)." Cheap to include now, annoying to retrofit.

## Scope / sequencing

- **MVP:** the public standing-pledge intent record + the hands-off auto-pull execution. This needs one small *additive* contract entry point (an allowance-based create-and-delegate, so the auto-created note is rooted at the user for revocability) plus the offchain scheduler. It does **not** touch existing contract functions or their semantics. **ERC-20 tokens only** in MVP (auto-pull needs an allowance); native ETH is rejected at setup and deferred to the later escrow option. The scheduler is a small standalone *logical* service bundled into `service-host`. See locked decisions in the [tech note](../tech/subsystems/delegation/recurring-pledges.md#mvp-decisions-locked).
- **Later / optional:** the pre-funded escrow option (firmer) and the reminder-to-sign option (softer) as additional points on the spectrum. Same intent record; only the executor differs.
- Don't gold-plate: this is meant to stay orthogonal and small.
