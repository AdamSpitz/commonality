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

- **"Give any amount" is just a $1 token type.** A plain donation drive is a single token type priced at $1 with effectively unlimited supply (set well above the goal so it never caps contributions); the donor buys N of them to give $N. No new contract semantics and no hidden auto-injected token — the create form simply **pre-fills a recommended, editable "$1 Donation" token type** and explains *"Including a $1 option lets donors give any amount — recommended."* The creator can delete it, change the price, or add reward tiers. So the easy path is the default the creator lands on, not a hard-coded feature.
- **Donor-side single-amount input, degrading gracefully.** The donor sees a single **"$___"** box rather than a token-quantity grid. It resolves the typed amount against whatever token types exist: if a $1 (or otherwise small) denomination is present, any amount is exactly reachable; reward tiers, if any, are presented as **opt-in add-on buttons** ("Add Gold Supporter — $100") that bump the total, with the remainder filled by the small token. The UI must **not assume** a unit token exists — if the smallest tier is $20, it snaps to reachable amounts or falls back to discrete tier selection. (`buyERC1155` already accepts arrays of token IDs/counts, so a mixed purchase is one transaction.) This gives a self-reinforcing incentive: the smooth "type any number" experience only materializes when the creator took the $1 recommendation, so the recommendation explains itself, and a creator who deliberately wants fixed $50/$100 tiers gets exactly that.
- **Dollar framing** instead of a payment-token symbol throughout.
- The donor-facing side must read like *giving*, not a marketplace ("Buy Tokens" / "Quantity" → "Give to the roof fund").
- A **review/confirmation step** with a plain-language "this is permanent and costs a small network fee" notice, and **user-facing error messages** (no env-var names or raw chain reverts).
- The **refund-on-failure** guarantee ("if we fall short, nobody loses a cent") is one of the best selling points to a church and is currently never explained.

## Sequencing

- **Now (approved, build tasks in [TODO.md](/TODO.md)):**
  - Layered recipient picker items 1–3 — explicit "send to me" default, saved contact list, live ENS resolution + plain-language confirmation, optional test-tx. Self-contained UI work.
  - The donation-first reframe — recommended-but-editable "$1 Donation" token, single "$___" donor box, `$` framing, give-not-buy copy.
- **Later:** embedded-wallet + claim-later recipient path (#4). No separate ruling needed; it's a thin, non-custodial layer that rides on the embedded-wallet-provider choice ([bridges.md](/specs/tech/bridges.md)) — build it as part of that provider integration.
