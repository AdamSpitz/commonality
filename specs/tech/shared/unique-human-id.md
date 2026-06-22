# Unique Human IDs

Is there some easy version of unique-human IDs that we could add?

I don't want to do a whole new big feature before shipping the MVP, but OTOH it *is* kinda important:
  - For Tally/CSM, because "sign this *one* thing, *once*" is an easier sell than "sign our petition... actually, sign this new petition... actually, keep signing petitions". If we had the ability to let each user link (in a privacy-preserving way, if he so chooses) the Ethereum account he uses for Commonality to some proof-of-personhood, then we could legitimately say "please just sign some statements describing your beliefs *once*, and then forevermore we can just do a set-union (of the anonymized IDs) to count up everybody who has ever signed *any* of these 17 statements that all basically mean the same thing."
  - For Aligning, because the trust-graph thing would be much easier and more effective if we could prevent (or at least flag) accounts that aren't linked to a unique human.

## We don't actually need a *unique-human* ID

An earlier version of this doc argued that the CSM/Tally set-union use case *demands* a true, unique-per-human identifier — that this was the hard requirement we had to design around. I no longer think that's right, and dropping it makes the whole feature much cheaper.

What set-union actually needs is a **stable identifier per account** so that one account signing several of the 17 equivalent statements counts once, not seventeen times. That's account-level dedupe, and it doesn't require knowing that one account equals one human.

The thing we get from proof-of-personhood isn't a hard uniqueness guarantee — it's *confidence that accounts roughly correspond to humans*, plus a cost on spinning up many of them. And we can expose that confidence directly instead of trying to collapse it into a yes/no uniqueness claim. So we show **tiered head-counts**:

> This statement has **100,000** signers — **10,000** of whom have at least two proof-of-personhood attestations.

The reader picks the tier they trust. A skeptic looks at the high-proof tier; a casual reader looks at the headline number. We never have to claim "these are 100,000 distinct humans" — a claim we couldn't honestly back anyway.

This reframes both use cases as the *same* requirement:

  - **CSM/Tally set-union** needs a stable per-account anonymized ID (for dedupe across statements) plus a proof-of-personhood *strength* attached to each account (for the tiered counts).
  - **Alignment anti-abuse** needs exactly that proof-of-personhood strength, to raise the cost of one human spinning up many project-creator accounts. The trust graph does the heavy lifting; this is a cost-raiser. (See [alignment-anti-abuse.md](../../product/alignment-anti-abuse.md).)

So there's one mechanism, not two competing requirements, and it tolerates imperfect proof-of-personhood gracefully — weak proof just lands in a lower tier rather than breaking the model.

## The core idea: an account as the identity anchor

Rather than building a uniqueness system or betting the project on a particular third-party one, we put a **stable interface (an Ethereum account) over a volatile market (proof-of-personhood providers)**.

The convention: **you are expected to use one Ethereum account with Commonality** for any feature that benefits from Sybil-resistance (Tally signing, project creation, etc.). Proof-of-personhood credentials get *linked to* that account (directly or via a proof — see below).

From it we derive a single canonical **anonymized ID**:

```
anonymized_ID = hash(anchor_address, app_salt)
```

This is a *nullifier*: a deterministic, anonymous, context-scoped identifier. Deterministic in the account ⇒ the same account always produces the same `anonymized_ID`, so we can set-union / dedupe on it across statements. The `app_salt` makes it unlinkable to identifiers the same person uses in other systems.

**No per-user secret salt.** An earlier draft floated a `personal_salt` mixed into the hash. We've dropped it: for set-union to work across the public and private paths (below), both must produce the *same* `anonymized_ID` for the same anchor — so the derivation has to be identical in both, leaving no room for a per-user secret. The derivation is exactly `hash(anchor_address, app_salt)` everywhere.

The key benefit of this indirection: **we don't have to invent a proof-of-personhood system, and we don't have to pick a winner among the existing ones.** The convention "use one account, attach proof to it" works even before any World ID / BrightID / Passport score is linked. Verification is purely additive later — same account, same `anonymized_ID`, now with one or more attestations hanging off it, which bumps it into a higher count tier. No data-model migration, no re-signing.

## How many accounts, and which one is the anchor

This is the part that's easy to lose track of, so concretely:

The **anchor** is simply *the account you do your Commonality activity from* — the one you sign Tally statements / create projects with. `anonymized_ID = hash(anchor_address, app_salt)`, fixed from your very first action. Proof-of-personhood (a Gitcoin Passport score, a World ID, …) is a **separate concern** that gets *linked to* the anchor. **It does not have to live on the anchor account itself.**

The most important consequence: because the anchor is just "whatever you sign from," **signing works identically for everyone.** There is no special "privacy mode" signing flow, no second wallet needed at signing time. The privacy choice shows up *only later*, and *only* when you link a proof-of-personhood credential — which is a rare, optional step.

There are three ways the pieces can be arranged. In all three the anchor is the account you sign from, and `anonymized_ID` derives from it; the only thing that changes is where the credential lives and how it's tied in:

| Config | Sign from | Credential lives on | Linked by | Privacy |
|---|---|---|---|---|
| **One account** | anchor | the same anchor | nothing to link | public |
| **Two accounts, public** | anchor | a separate account B | a plain signed "same owner" message | public |
| **Two accounts, private** | anchor | a separate account B | a **ZK proof that hides B** | anonymous |

So the privacy-conscious user is *not* doing anything special when he signs — he signs from his dedicated Commonality account like everyone else. The difference is that when he later does his Passport/World ID verification on a *different* account B, he links B to his anchor with a ZK proof instead of a public message, so B never becomes publicly connected to his Commonality activity.

### What "private" actually buys

Worth being precise, because it's a narrower guarantee than "anonymous" might suggest. The anchor (the account you sign from) is **public** in every config — you sign from it in the open. What the private config hides is the *credential account B*. So the guarantee is:

> Your real-identity-bearing credential (the KYC'd / biometric account B) is **unlinkable to your Commonality signing pseudonym.**

It is *not* "nobody can see that this pseudonym signed." Your signatures are tied to a pseudonymous anchor; that pseudonym is simply never connected to the account that proves who you really are. For our use case that's the privacy that matters. (Hiding even the pseudonym's signing activity — fresh throwaway account per signature, ZK-linked to a stable hidden anchor — is possible but heavier, and we don't think the MVP needs it. We have Noir code that can do ZK linkage of this kind; the multi-wallet UI needs polish.)

### How the credential reaches us: pull vs. push

This is the practical difference between the public and private configs when wiring it up:

  - **Public configs — we pull, automatically and continuously.** `app_salt` is a public domain-separator (it stops the ID colliding with the same person's ID in other apps; it is *not* a secret), so `anchor_address → anonymized_ID` is publicly computable, and so is the link to account B (it's a public message, or B *is* the anchor). We just look up whatever proof-of-personhood is queryable by those addresses (Gitcoin Passport score via API or on-chain attestation, etc.) and attach it. New credentials earned later are picked up for free.
  - **Private config — the user pushes, as explicit snapshots.** Account B is hidden, so we can't go looking — we don't know which address to query. Instead the user publishes a ZK proof of the form "I control an account `B` holding credential X, *and* I control the anchor whose hash is this `anonymized_ID`," revealing only the `anonymized_ID`, the credential's nullifier (for the 1:1 binding in caveat #2), and the asserted tier. Because nothing is observable to us, the user must re-publish when a score changes or a credential expires; these are snapshots, not a live view.

One consequence for provider choice: **the private path only works with credentials that exist as a verifiable signed/on-chain attestation over account B** (e.g. Gitcoin's EAS on-chain score, signed by Gitcoin), because the ZK circuit has to check that artifact. A credential that is *only* an off-chain API lookup has nothing for the circuit to verify, so it's public-path-only. The public path accepts either kind.

## Proof-of-personhood tiers (transparent in the UI)

Instead of a binary "unique or not," each account carries a **proof-of-personhood strength** — roughly, how many independent attestations back it (and how strong each is). Commonality counts accounts at several thresholds and is transparent about which is which:

  0. **No proof asserted** — the account hasn't claimed to follow the one-account convention or attached anything.
  1. **Asserted, unverified** — the user claims one account, but nothing external backs it.
  2. **One attestation** — one proof-of-personhood credential is linked.
  3. **Multiple attestations** — several independent credentials, harder to fake at scale.

Tally shows separate counts per threshold; LazyGiving can show which tier a project creator sits in. As the world's proof-of-personhood options mature, "add an attestation" just moves accounts up the ladder — no schema change.

## Caveats

  1. **The lower tiers provide essentially no real Sybil-resistance.** One human can mint many accounts and assert on each. That's *fine* under the tiered model — those accounts just sit in tiers 0–1 and a skeptical reader discounts them — but the UI copy must not let "asserted" read as "we checked," and the headline number must never be presented as a verified human count.
  2. **Credential linking must be one-credential-per-anchor.** Bind a provider's Commonality-context nullifier 1:1 to the anchor `anonymized_ID`, or a single credential (on one account B) could be linked to many anchors and inflate all of them into the high-proof tier. This is why the private-path proof reveals the credential's nullifier (not B's address): so we can enforce the 1:1 binding without seeing B. World ID's nullifier model gives this for free if wired that way; cost-aggregator scores (see below) are squishier here.
  3. **Avoid double-counting in set-union.** If someone signs from account X, then later acts from a different account Y, a naive union counts both. Because we dedupe per account (not per human) this is inherent — but the tiered counts soften it: cross-account inflation mostly shows up in the low-proof tiers, and the high-proof tiers are where double-spending a credential is hardest. Where we *do* let users re-anchor (move attestations to a new account), the migration must retire the old `anonymized_ID`.

## Picking a provider (when we get there)

Now that strict uniqueness is *not* the requirement, the provider choice opens up considerably:

  - **Gitcoin / Human Passport** is a *score aggregator* (weighted sum of stamps), tuned for Sybil-resistance-by-cost. Under the old "must be unique" framing this was disqualifying — no clean one-human-one-identifier to dedupe on. Under the tiered model it's a *natural* fit: its score maps directly onto our proof-strength tiers.
  - **World ID** is built around an app-scoped nullifier — the strongest dedupe primitive, and still attractive for the high-proof tier. But its strong uniqueness depends on the Orb (biometric); the biometric angle is controversial and geographically uneven — a genuine friction/values cost for our user base. Since we no longer *need* its strict guarantee, that cost weighs much heavier than it did.

Because we're now cost-weighting rather than hard-deduping, **supporting more than one provider is no longer the liability it used to be** — multiple attestations on one account is exactly what tier 3 represents. The old worry ("Sybil via the weakest accepted system") only bites if we treat any single weak attestation as conclusive, which the tiered model specifically avoids. Start with whichever one provider is cheapest to integrate; add others as additive proof.

**Chosen first provider: Gitcoin / Human Passport** — its score maps directly onto our tiers and it's the cheapest to integrate. But it is *sequenced after* the tier-0/1 plumbing, not before: a Passport integration produces tier-2 strengths, and there is nothing to feed them into until (a) the Tally count path dedupes on `anonymized_ID` (via `foldAnonymizedBelieverIds`/`unionAnonymizedBelieverIds`) and (b) the tier-0/1 self-declaration + tiered head-count UI exist. Because proof attaches additively (same anchor, same ID, no migration), deferring Passport costs nothing. When we do integrate it, the one part needing design attention is caveat #2 (one-credential-per-anchor): Passport's cost-aggregator score has no clean per-context nullifier, and the private/ZK path works only against Passport's on-chain EAS attestation, not the off-chain API lookup.
