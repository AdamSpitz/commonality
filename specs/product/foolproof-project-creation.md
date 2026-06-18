# Foolproof project creation (product)

Making LazyGiving project creation easy and as-foolproof-as-possible for non-crypto-native users — so we can honestly tell a church *"drop this in as easy-to-use rails for the donation drives you're already running"* (fix the roof, fund the mission trip, etc.). The focus here is the **recipient-selection** step (where the money goes), which is both the most intimidating and the most dangerous part of the current flow, plus the surrounding "donation-first" framing.

See also [ux.md](./ux.md) (origin of this assessment), [new-user-experience.md](./new-user-experience.md), [bridges.md](/specs/tech/bridges.md) (embedded wallet / fiat on-ramp), and [jargon.md](./jargon.md).

## The core mismatch

A church running a roof fund thinks in: *a cause, a dollar goal, "give what you can," and money landing in our account.* Today's Create Project form (`ui/src/lazy-giving/pages/CreateProjectPage.tsx`) instead asks them to think in **ERC-1155 token mechanics** — mandatory token types with a user-visible Token ID, supply, and price; prices and goals denominated in a token symbol rather than `$`; a required exact-datetime deadline; and a raw `0x…` recipient address. That gap is the single biggest source of clunk.

This spec concentrates on the recipient field; the broader donation-first reframe is summarized under [Adjacent issues](#adjacent-issues-not-the-focus-here) and tracked in the inbox.

## The recipient field is the scariest part

Today the recipient is a single free-text box wanting a 40-char hex address, with no name resolution, no validation, and no confirmation (`CreateProjectPage.tsx`, "Recipient Address"). A one-character typo sends every donation irreversibly to a wrong or dead address, and nothing catches it. For "donate to fix our church's roof," that is the most likely *and* most damaging failure mode. Everything below is about removing that cliff.

## Design: a layered recipient picker (easiest default first)

Present the recipient as a small set of choices, ordered so the safest path is the default and raw hex is the last resort:

1. **"Send to me / my account" (default).** The connected wallet is already the silent fallback in code; surface it explicitly as the default selection rather than a blank box. Most first-time organizers are creating a project for an account they themselves control.

2. **Pick from a saved contact list.** After a recipient has been vetted once, let the creator choose it by name (e.g. "First Baptist building fund") instead of re-pasting hex. The real value is that **vetting happens once** rather than every project — this is the single best guardrail. Entries accumulate from: recipients the user has used before, claimed embedded wallets (see #4), and manually-added+confirmed addresses.

3. **ENS / paste an address (advanced).** For crypto-native organizers: resolve ENS names live (`firstbaptist.eth → 0x…`) using the public client already wired up, and — critically — **confirm in plain language** what was resolved: *"This will send to `firstbaptist.eth`. Is that right?"* For a pasted raw address, offer an **optional tiny test transaction** so the creator can verify the destination before committing the project. ENS is a strong readability win but not the foolproof path on its own: most churches won't have an ENS name and registering one is its own rabbit hole.

4. **(Later) Embedded wallet + claim-later.** The genuinely foolproof flow asks for *no address at all*: create the project, let funds accrue into an embedded/escrow wallet, and let the recipient **claim** it afterward via email/social login. This removes hex entry from the critical first run entirely, and the claimed wallet then becomes the first entry in the contact list (#2). This is the biggest lift and is entangled with the embedded-wallet-provider decision (see [bridges.md](/specs/tech/bridges.md) and the inbox).

### Why the layering matters

The contact list only helps *after* its first entry exists — there's a bootstrap problem. "Send to me" (#1) covers the common self-recipient case with zero typing; the embedded-wallet claim path (#4) is what ultimately lets a creator set up a project for *someone else's* account without ever touching hex. ENS (#3) makes the manual path verifiable but doesn't, by itself, make it foolproof.

## Adjacent issues (not the focus here)

Fixing the recipient field makes the form *safer*, not yet *foolproof*. The remaining blockers to the church pitch — tracked separately — are the donation-first reframe:

- A **"Donation" default mode**: name, what it's for, a `$` goal, an optional/open-ended deadline, "money goes to [confirmed account]," and "give any amount" (or suggested $25/$50/$100 levels) — with the token-tier machinery (Token ID / supply / price / image) tucked behind an **advanced** toggle for those who actually want NFT-style giving levels. Today a plain "give any amount" drive literally cannot be expressed.
- **Dollar framing** instead of a payment-token symbol.
- The donor-facing side must read like *giving*, not a marketplace ("Buy Tokens" / "Quantity" → "Give to the roof fund").
- A **review/confirmation step** with a plain-language "this is permanent and costs a small network fee" notice, and **user-facing error messages** (no env-var names or raw chain reverts).
- The **refund-on-failure** guarantee ("if we fall short, nobody loses a cent") is one of the best selling points to a church and is currently never explained.

These are a product/UX call (they also touch the donor flow), so they live in the inbox rather than as ready-to-build tasks.

## Sequencing

- **Now:** layered recipient picker items 1–3 — explicit "send to me" default, saved contact list, live ENS resolution + plain-language confirmation, optional test-tx. These are self-contained UI work.
- **Soon after:** the donation-first default mode and `$` framing (pending the product decision in the inbox).
- **Later:** embedded-wallet + claim-later recipient path, gated on the embedded-wallet-provider choice ([bridges.md](/specs/tech/bridges.md)).
