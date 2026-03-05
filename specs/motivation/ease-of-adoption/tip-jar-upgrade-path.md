# The tip-jar-to-token upgrade path

Any form of unconditional donation (tip jars, Patreon-style subscriptions, "buy me a coffee" buttons) can be modeled as Commonality tokens — and there's almost no reason not to, because the floor case is functionally identical to a plain tip jar while preserving optionality for both the donor and the creator.

## The upgrade ladder

**Step 0: Plain tip jar.** Creator accepts donations. No tokens, no records beyond payment processor receipts.

**Step 1: Uncapped tokens at a fixed low price.** Each donation mints tokens — say, 1 cent per token, no supply cap. This is functionally identical to a tip jar. The creator doesn't need to think about pricing or chunking work. The donor doesn't need to understand tokens — the UI can just say "tip this creator." But under the hood, the donor now owns a quantity of tokens, which means:
  - The leaderboard can show "this person bought 500 tokens back when the creator had 12 supporters" — meaningful social recognition even if the tokens are worth nothing financially.
  - The donor has a verifiable receipt of their contribution.
  - The donor can, in principle, resell the tokens later (though with uncapped supply at 1 cent, there's no reason anyone would buy them on the secondary market yet).

**Step 2: Cap the supply.** The creator decides to stop minting new tokens for their early work. Now the existing tokens represent a fixed share of something — "1/1372 of my early-career output," or whatever. Secondary market trading becomes meaningful: if the creator becomes more popular, early tokens appreciate. Early donors get credit (social recognition, financial upside) for having supported the creator before anyone else did.

**Step 3: Chunk future work.** The creator starts issuing separate token sets for discrete chunks of work — "my next album," "my Q3 2026 content," "this specific video series." Each chunk can have its own price, supply cap, and assurance-contract threshold. This is where the full power of the system kicks in: venture-style investors can fund work speculatively, donors can fund retroactively, and the creator has a new funding source (people who are good at spotting success stories early).

The key point: **each step is optional and reversible.** A creator can sit at Step 1 forever and it's just a tip jar with receipts. But the option to upgrade is always there, and the early donors' positions are preserved through every transition.

## Why this matters for donors

Even at Step 1 (uncapped tokens, no secondary market), the donor gets things a plain tip jar doesn't provide:
  - **Social recognition with quantity.** The leaderboard shows *how much* you contributed and *when*. If the creator later becomes successful, your early support is permanently visible.
  - **Option value.** If the creator later caps supply (Step 2), your tokens retroactively become scarce. You were "early" without needing to have predicted anything.
  - **Resale option.** Even if you intended a pure donation, you *can* sell the tokens later. This is strictly better than a tip jar where the money is just gone.

## Why this matters for creators

  - **No upfront decisions required.** You don't need to price your work, chunk it into units, or think about token economics. Just set up an uncapped token at a trivial price and you have a tip jar that's ready to upgrade later.
  - **New funding source: speculators.** Once you move to Step 2 or 3, you can attract people who aren't fans of your content but are good at identifying undervalued creators. They buy tokens early, the creator gets funded, and the speculator profits if the creator succeeds. This is the retroactive-funding / nano-VC dynamic applied to individual creators.
  - **Plugs into the Commonality ecosystem.** Your work can show up in funding portals, be funded by delegates, benefit from alignment attestations connecting your work to causes people care about. None of this is available to a plain tip jar.

## Subscriptions

Even ongoing support ("fund my next month of content") can work as an assurance contract without being much more awkward than a Patreon subscription. The donor sets a standing instruction like "put $10/month toward this creator's next content chunk, as long as it buys me at least 1% of it." This is a *little* more complex than "charge me $10/month," but the benefits (refund if the threshold isn't met, social recognition, resale option) are real.

The "buy me a variety" case — "spread $10 across this creator's recent work, buying the cheapest available tokens" — is probably best handled as an AI skill or delegated to an agent, rather than something the smart contracts handle natively. The delegation system supports this: delegate to an automated agent that executes a purchase strategy on your behalf.

## Migrating existing tip jars

A creator who already has a plain tip jar can migrate to Commonality retroactively, as long as the tip jar kept records of who tipped (or gave donors verifiable receipts):
  1. Mint an uncapped token representing past work.
  2. Make purchased tokens available to be claimed by historical donors (based on records/receipts).
  3. Going forward, new tips mint tokens.
  4. Optionally, cap the supply at this point — historical donors now hold a fixed share.

This means adoption doesn't even require creators to switch upfront. They can try it alongside their existing tip jar and migrate historical data later.

## The bottom line

There's no good reason for *any* form of donation to remain as a plain unrecorded transfer of money. Converting to "your donation mints tokens" costs approximately nothing, loses nothing, and preserves the option to upgrade to a much more powerful system later. The tip jar is the on-ramp.
