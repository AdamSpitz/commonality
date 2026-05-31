# UX

## LazyGiving project creation


 e.g. To create a project, here's what I want:
   - choose the recipient: how smooth and foolproof can we make that UX? for first time setup, we can do things like an embedded wallet that the recipient can then claim; optionally there UI can let you do a tiny test tx to make sure the address is correct; we can support ENS; after first-time setup there can be a contact list that just stores the user's frequently used and already-vetted addresses.
   - Hopefully we can have [bridges from tradfi](/specs/tech/bridges.md).
   - Don't use crypto [jargon](./jargon.md).
   - etc.




> Look at the UX for creating a new LazyGiving project. I want to be able to tell someone from e.g. a church: "You can just drop this in as an easy-to-use underlying rails for whatever donation projects you're doing anyway." What aspects of the UX are still clunky?


I've now seen the whole create→donate loop. Here's my assessment, judged specifically against your pitch — *"drop this in as easy-to-use rails for the donation projects a church is already doing."*

## The core mismatch

A church running a roof fund or a mission-trip drive thinks in: *a cause, a dollar goal, "give what you can," and money landing in the church account.* The Create Project form instead asks them to think in **ERC-1155 token mechanics**. That gap is the single biggest source of clunk, and it shows up at almost every field.

## Clunky aspects, roughly in priority order

**1. The "Token Types" section is the dealbreaker.** (`CreateProjectPage.tsx:251-341`) A church volunteer has no model for "Token ID / Supply / Price / image." Worse, it's *mandatory* — validation (`:94-103`) requires at least one token with positive supply and price, so there is **no "let people donate any amount" path**. A plain donation drive literally cannot be expressed without inventing fake token tiers. And "Token ID" (`:260-268`) is a pure implementation detail that should never be user-visible — it's already auto-managed by `addTokenType`. For the church use case you'd want a default "Donation" mode (give any amount, or pick from suggested $25/$50/$100 levels) with the raw token UI hidden behind an "advanced" toggle.

**2. The donor side reinforces it.** The buy flow says **"Buy Tokens," "Token #0," "Quantity"** (`BuyTokensSection.tsx:224, 338-352`) — a marketplace, not a donation. A congregant clicking through from a bulletin link sees a shopping cart, not "Give to the roof fund." Whatever you fix on create, the giver-facing label has to read like giving.

**3. Recipient is a raw `0x` hex address.** (`:222-229`) The treasurer must paste a 40-char hex string, with no name resolution and no confirmation of where money goes. This is both intimidating *and* dangerous — a typo sends funds irreversibly to the wrong address, and the form does nothing to catch it. At minimum this needs an "is this your church's wallet?" confirmation and ENS/label support.

**4. Wallet-first wall.** (`:186-195`) "Connect your wallet to create a project" is the very first thing. "Just drop it in" collides with "first, everyone needs a crypto wallet." This is partly inherent to the chain, but the create page makes zero attempt to soften it (no Privy email-login hint, no "what's a wallet" help) even though the project clearly has Privy integration.

**5. Dollar amounts are in a token symbol, not dollars.** Funding Goal and prices are denominated in `paymentSymbol` (e.g. USDC/test token) (`:232, 282`). A church thinks in `$5,000`. No fiat framing or `$` display anywhere.

**6. Deadline is required and over-precise.** (`:86, 241-249`) `datetime-local` forces an exact day *and time*, and a deadline is mandatory. Many church drives are open-ended ("until we reach goal"). The refund-on-failure behavior — which is actually your *best* selling point to a church ("if we fall short, nobody loses a cent") — is never explained on this page.

**7. No review / confirmation step, and no "this is permanent" warning.** Hitting Create (`:343-355`) fires several sequential IPFS uploads plus an on-chain transaction with no preview of what donors will see, no "this costs gas and can't be edited" notice, and only a generic spinner. Multi-step uploads (`:116-139`) can fail halfway with no recovery. For a non-technical user committing something irreversible, this is too quiet.

**8. Errors are developer-facing.** Messages like `"ProjectFactory contract address not configured (VITE_PROJECT_FACTORY_CONTRACT_ADDRESS)"` (`:143`) and raw `err.message` from chain reverts (`:180`) surface straight to the user.

**9. Thin success state.** (`:358-370`) "Project created successfully!" + a View button. No copy-able share link, no "send this to your congregation," no next steps (ask for attestations, set up a funding portal) — even though the docs say those steps matter a lot.

## Bottom line for the pitch

Right now you could honestly tell a *crypto-native* organizer "drop this in." You can't yet say it to a church, because the form makes them learn token mechanics, handle hex addresses, and commit an irreversible on-chain action with no guardrails — to do something they conceive of as "collect donations for the roof."

The highest-leverage fix is a **donation-first default mode**: name, what it's for, a dollar goal, optional deadline, "money goes to [confirmed account]," and "give any amount" — with the token-tier machinery tucked behind an advanced toggle for the people who actually want NFT-style giving levels. That one change probably converts this from "needs a crypto walkthrough" to "drop-in rails."

Want me to draft that simplified create flow, or write it up as a TODO/spec entry?