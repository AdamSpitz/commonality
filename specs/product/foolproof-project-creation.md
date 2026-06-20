# Foolproof project creation (product)

Making LazyGiving project creation easy and as-foolproof-as-possible for non-crypto-native users — so we can honestly tell a church *"drop this in as easy-to-use rails for the donation drives you're already running"* (fix the roof, fund the mission trip, etc.). The focus here is the **recipient-selection** step (where the money goes), which is both the most intimidating and the most dangerous part of the current flow, plus the surrounding "donation-first" framing.

See also [ux.md](./ux.md) (origin of this assessment), [new-user-experience.md](./new-user-experience.md), [bridges.md](/specs/tech/bridges.md) (embedded wallet / fiat on-ramp), and [jargon.md](./jargon.md).

## The core mismatch

A church running a roof fund thinks in: *a cause, a dollar goal, "give what you can," and money landing in our account.* Today's Create Project form (`ui/src/lazy-giving/pages/CreateProjectPage.tsx`) instead asks them to think in **ERC-1155 token mechanics** — mandatory token types with a user-visible Token ID, supply, and price; prices and goals denominated in a token symbol rather than `$`; a required exact-datetime deadline; and a raw `0x…` recipient address. That gap is the single biggest source of clunk.

This spec concentrates on the recipient field; the broader donation-first reframe is summarized under [Adjacent issues](#adjacent-issues). **Status (2026-06-18):** the layered recipient picker (#1–3 below) and the donation-first reframe are both approved and have build tasks in [TODO.md](/TODO.md); the embedded-wallet recipient path (#4) is a thin layer downstream of the embedded-wallet-provider choice and needs no separate ruling.

## The recipient field is the scariest part

Today the recipient is a single free-text box wanting a 40-char hex address, with no name resolution, no validation, and no confirmation (`CreateProjectPage.tsx`, "Recipient Address"). A one-character typo sends every donation irreversibly to a wrong or dead address, and nothing catches it. For "donate to fix our church's roof," that is the most likely *and* most damaging failure mode. Everything below is about removing that cliff.

## Design: a layered recipient picker (easiest default first)

Present the recipient as a small set of choices, ordered so the safest path is the default and raw hex is the last resort:

1. **"Send to me / my account" (default).** The connected wallet is already the silent fallback in code; surface it explicitly as the default selection rather than a blank box. Most first-time organizers are creating a project for an account they themselves control.

2. **Pick from a saved contact list.** After a recipient has been vetted once, let the creator choose it by name (e.g. "First Baptist building fund") instead of re-pasting hex. The real value is that **vetting happens once** rather than every project — this is the single best guardrail. Entries accumulate from: recipients the user has used before, claimed embedded wallets (see #4), and manually-added+confirmed addresses.

3. **ENS / paste an address (advanced).** For crypto-native organizers: resolve ENS names live (`firstbaptist.eth → 0x…`) using the public client already wired up, and — critically — **confirm in plain language** what was resolved: *"This will send to `firstbaptist.eth`. Is that right?"* For a pasted raw address, offer an **optional tiny test transaction** so the creator can verify the destination before committing the project. ENS is a strong readability win but not the foolproof path on its own: most churches won't have an ENS name and registering one is its own rabbit hole.

4. **(Later) Embedded wallet + claim-later.** The genuinely foolproof flow asks for *no Ethereum address at all*: the creator gives the recipient's **email** (e.g. `treasurer@church.org`), the project's `recipient` is set to a freshly-provisioned embedded wallet bound to that login, funds accrue there, and the recipient **claims** control later by signing in with email/social. This removes hex entry from the critical first run entirely, and the claimed wallet then becomes an entry in the contact list (#2).

   **This is not a separate strategic decision, and it is not custodial.** It reuses the *same* embedded-wallet provider already planned for wallet-less *contributors* (see [bridges.md](/specs/tech/bridges.md)), where the provider (e.g. Privy) does non-custodial MPC/TSS key management bound to the login identity — "no single party, including us, holds the whole key" (bridges.md:125–134). Pointing that mechanism at a recipient instead of a contributor is mostly a clean-UX-in-create-flow layer, **downstream of** the embedded-wallet-provider choice rather than a fork of its own. The only build-time choices: key the recipient wallet to a **verified email** (safer, and better than the hex field — a typo'd email is human-noticeable and verifiable) vs. a bearer **claim-link** (Linkdrop-style; more flexible but losable/stealable); and the **never-claimed** behavior (with email-keyed embedded wallets the funds simply sit claimable whenever the recipient first logs in — pending, not lost). **Avoid** routing this through a Commonality-run escrow contract (`TradFiBridgeEscrow`) — that is the only variant that carries custody/compliance weight, and bridges.md already defers it in favor of the non-custodial path.

### Why the layering matters

The contact list only helps *after* its first entry exists — there's a bootstrap problem. "Send to me" (#1) covers the common self-recipient case with zero typing; the embedded-wallet claim path (#4) is what ultimately lets a creator set up a project for *someone else's* account without ever touching hex. ENS (#3) makes the manual path verifiable but doesn't, by itself, make it foolproof.

## Adjacent issues

Fixing the recipient field makes the form *safer*, not yet *foolproof*. The other blockers to the church pitch are the **donation-first reframe** (approved 2026-06-18; build task in [TODO.md](/TODO.md)). The guiding principle below is **keep the general token mechanism; steer with guidance and sensible defaults, not special-case modes.** ERC-1155 token types are expressive enough to cover a plain donation drive already; the work is presentation and defaults, not a separate "simple mode" code path.

- **"Give any amount" is just a $1 token type.** A plain donation drive is a single token type priced at $1 with effectively unlimited supply (set well above the goal so it never caps contributions); the donor buys N of them to give $N. No new contract semantics and no hidden auto-injected token — the create form simply **pre-fills a recommended, editable "$1 Donation" token type** and explains *"Including a $1 option lets donors give any amount — recommended."* The creator can delete it, change the price, or add reward tiers. So the easy path is the default the creator lands on, not a hard-coded feature. See [Goal, cap, and giving levels](#goal-cap-and-giving-levels) for how the create form turns a plain dollar goal into token types without biasing toward unlimited contributions.
- **Donor-side single-amount input, degrading gracefully.** The donor sees a single **"$___"** box rather than a token-quantity grid. It resolves the typed amount against whatever token types exist: if a $1 (or otherwise small) denomination is present, any amount is exactly reachable; reward tiers, if any, are presented as **opt-in add-on buttons** ("Add Gold Supporter — $100") that bump the total, with the remainder filled by the small token. The UI must **not assume** a unit token exists — if the smallest tier is $20, it snaps to reachable amounts or falls back to discrete tier selection. (`buyERC1155` already accepts arrays of token IDs/counts, so a mixed purchase is one transaction.) This gives a self-reinforcing incentive: the smooth "type any number" experience only materializes when the creator took the $1 recommendation, so the recommendation explains itself, and a creator who deliberately wants fixed $50/$100 tiers gets exactly that.
- **Dollar framing** instead of a payment-token symbol throughout.
- The donor-facing side must read like *giving*, not a marketplace ("Buy Tokens" / "Quantity" → "Give to the roof fund").
- A **review/confirmation step** with a plain-language "this is permanent and costs a small network fee" notice, and **user-facing error messages** (no env-var names or raw chain reverts).
- The **refund-on-failure** guarantee ("if we fall short, nobody loses a cent") is one of the best selling points to a church and is currently never explained.

### Goal, cap, and giving levels

The create form's job is a **translation layer**: the creator works in their mental model (a dollar goal, maybe some giving levels) and a live preview shows what gets created (ERC-1155 token types with price/supply). One editable list of giving options, auto-populated and progressively disclosed — not a separate "simple mode" code path. "Simple vs. fancy" is just how many rows exist and how many fields are exposed.

**Two independent axes, both honestly displayed.** The earlier framing tangled these together; keep them separate. The goal amount feeds both:

1. **The cap — "what happens when we hit the goal?"** A first-class, explicit choice, *defaulting to closing at the goal* — that is the retro-funding-correct behavior, not an edge case. Once the original project is funded to the amount it asked for, the primary market should close; late supporters who want their name on it buy the donation receipts from early backers on the secondary market. Routing more and more money to the project-doers past their stated goal is a non-goal (they can start a *new* project for more).
2. **Granularity — "is there a small option?"** Governs only whether *arbitrary* amounts are reachable. Orthogonal to the cap: a capped project and "give any amount" are fully compatible — a `$1` option with supply 1,000 lets people give any amount until the total hits $1,000, then closes.

**The at-goal choice**, shown right under the goal field (neither option hidden in "advanced"):

- **● Stop at $1,000 (fully funded → done)** *(default).* *"Once we reach $1,000, the project is fully funded and giving closes. After that, supporters who want their name on it buy the donation receipts from early backers."* → supply sized so total capacity = exactly $1,000.
- **○ Keep accepting past $1,000.** *"$1,000 is a target, not a limit — people can keep giving."* → supply set well above the goal; the goal becomes a thermometer. (Whether the contract supports truly unlimited supply doesn't matter; a very high limit is fine in practice.)

**Progressive disclosure of giving levels**, same list component throughout:

- **Just a goal (default).** Type `Goal: $1,000`; the list silently holds one `$1` option. Donor never sees the word "token."
- **Suggested levels.** A "Suggest giving levels" button scaffolds an editable starter set ($25 / $50 / $100 …) the creator tweaks inline. Tiers are *suggested giving levels*, not a partition of the goal — they need not sum to it.
- **Full control.** Expanding any row reveals price, supply, name, image, description (today's form, per-row and opt-in).

**The live preview is bidirectional and never lies about what "full" means.** Two panels update as they type: a donor's-eye view, and a collapsible "what gets created" showing the literal token types. When *stop-at-goal* is on, the preview shows that capacity sums to the goal, sizing the `$1` fill supply to the remainder:

> Goal $1,000, stop at goal: 2 × $100 + 5 × $50 + 10 × $20 = $650 of tiers, **+ 350 × $1 fill = $1,000 capacity.** ✓

If the creator removes the small option, the [granularity warning](#adjacent-issues) fires (*"without a small option, donors can only give in fixed amounts"*) and the preview reports the honest range — e.g. *"Capacity: $650–$1,000 depending on which levels fill"* — or lets them adjust supplies until it's exact.

The result: both normie paths are one interaction apart — *"raise $1,000, stop when funded"* is the default (just type the goal); *"keep the door open"* is one toggle; *"with giving levels"* is one button, with the cap math handled in the preview.

## Sequencing

- **Now (approved, build tasks in [TODO.md](/TODO.md)):**
  - Layered recipient picker items 1–3 — explicit "send to me" default, saved contact list, live ENS resolution + plain-language confirmation, optional test-tx. Self-contained UI work.
  - The donation-first reframe — recommended-but-editable "$1 Donation" token, single "$___" donor box, `$` framing, give-not-buy copy.
- **Later:** embedded-wallet + claim-later recipient path (#4). No separate ruling needed; it's a thin, non-custodial layer that rides on the embedded-wallet-provider choice ([bridges.md](/specs/tech/bridges.md)) — build it as part of that provider integration.
