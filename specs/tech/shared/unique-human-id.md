# Unique Human IDs

Is there some easy version of unique-human IDs that we could add?

I don't want to do a whole new big feature before shipping the MVP, but OTOH it *is* kinda important:
  - For Tally/CSM, because "sign this *one* thing, *once*" is an easier sell than "sign our petition... actually, sign this new petition... actually, keep signing petitions". If we had the ability to let each user link (in a privacy-preserving way, if he so chooses) the Ethereum account he uses for Commonality to the Ethereum account that owns his "I am Bob Smith" unique-human ID, then we could legitimately say "please just sign some statements describing your beliefs *once*, and then forevermore we can just do a set-union (of the anonymized unique-human IDs) to count up everybody who has ever signed *any* of these 17 statements that all basically mean the same thing."
  - For Alignment, because the trust-graph thing would be much easier and more effective if we could prevent (or at least flag) accounts that aren't linked to a unique human.

## Two requirements, not one

The two use cases above need different strengths of guarantee, and it's worth keeping them separate:

  - **CSM/Tally set-union** needs *a stable, unique-per-human identifier*. The whole value is "count everyone who ever signed any of these 17 equivalent statements" — a dedupe-by-human operation. That requires a persistent identifier that is the same for a given human across all their signings. This is the demanding requirement.
  - **Alignment anti-abuse** mostly just needs *proof-of-personhood* — raising the cost of one human spinning up many project-creator accounts. The trust graph does the heavy lifting; this is a cost-raiser, not a hard uniqueness guarantee. (See [alignment-anti-abuse.md](../../product/alignment-anti-abuse.md).)

Design for the CSM requirement; Alignment is then covered for free.

## The core idea: an account as the identity anchor

Rather than building a uniqueness system or betting the project on a particular third-party one, we put a **stable interface (an Ethereum account) over a volatile market (proof-of-personhood providers)**.

The convention: **you are expected to use only one Ethereum account with Commonality** for any feature that requires Sybil-resistance (Tally signing, project creation, etc.). Call this your unique-human account.

From it we derive a single canonical **anonymized ID**:

```
anonymized_ID = hash(unique_human_address, app_salt[, personal_salt])
```

This is a *nullifier*: a deterministic, anonymous, context-scoped identifier. Deterministic in the account ⇒ the same human always produces the same `anonymized_ID`, so we can set-union / dedupe on it. The `app_salt` makes it unlinkable to identifiers the same human uses in other systems.

The key benefit of this indirection: **we don't have to invent a unique-human ID system, and we don't have to pick a winner among the existing ones.** The convention "use one account" works as a *promise of eventual Sybil-resistance* even before any World ID / BrightID / etc. is linked to that account. Verification is purely additive later (see tiers below) — same account, same `anonymized_ID`, now with an attestation hanging off it. No data-model migration, no re-signing.

## Two presentation paths (privacy is a per-user choice)

The same `anonymized_ID` can be presented two ways, at the user's discretion:

  - **Direct.** Act from the unique-human account itself. The address is public on-chain, so this is *pseudonymous*: anyone can compute `address → anonymized_ID`. Simple, no ZK. Fine for users who don't need anonymity.
  - **ZK.** Act from a *separate* account, and submit a ZK proof that you know the private keys of both the separate account and a unique-human account, revealing *only* the derived `anonymized_ID`. The unique-human address never appears, so this is genuinely *anonymous*. (We have Noir code elsewhere that does this. The UI needs polish, especially around signing in with multiple wallets, but the core idea works.)

Both paths emit the **same** `anonymized_ID`, so set-union works uniformly across them. Privacy is a knob each user sets, not an architecture-level tradeoff.

Note: the **`personal_salt` only functions on the ZK path.** On the direct path the derivation must be publicly checkable against the public address, so a secret personal salt can't be part of that formula. Decide whether the direct and ZK paths share one derivation or differ by this salt.

## Uniqueness tiers (transparent in the UI)

Commonality counts accounts in three categories and is transparent about which is which:

  1. **No uniqueness asserted** — the user hasn't claimed to follow the one-account convention.
  2. **Uniqueness asserted but unverified** — the user claims one account, but nothing external backs it.
  3. **Uniqueness verified** — the account is linked to a real proof-of-personhood credential.

Tally can show separate counts per tier; LazyGiving can show which tier a project creator is in.

Once the world settles on a real unique-human-ID system (e.g. World ID), we add a public way to link your unique-human account to that credential, moving accounts into tier 3.

## Caveats

  1. **The "asserted but unverified" tier provides essentially no real Sybil-resistance** until a credential is linked. One human can mint many accounts and assert uniqueness on each. This is acceptable as a *promise* of eventual verifiability, but the UI copy must not let "asserted" read as "we checked."
  2. **Verified-tier linking must itself be one-credential-per-account.** Bind the provider's Commonality-context nullifier 1:1 to the account, or tier 3 is gameable too (one World ID verifying many accounts). World ID's nullifier model gives this for free if wired that way.
  3. **Avoid double-counting across tiers in set-union.** If someone asserts with account X, then later verifies a credential bound to a *different* account Y, a naive union counts both. The verification step must merge/retire the old identity, or we require verifying the same account that was asserted with.

## Picking a provider (when we get there)

Because uniqueness (not just cost-weighting) is the requirement, **World ID** is the natural fit: it's built around an app-scoped nullifier — exactly the set-union primitive we need. **Gitcoin / Human Passport** is a *score aggregator* (weighted sum of stamps), tuned for Sybil-resistance-by-cost rather than strict uniqueness, so it has no clean one-human-one-identifier to dedupe on.

Pick one system rather than supporting many: multiple accepted systems means Sybil via the weakest one, plus more multi-wallet UI.

One real adoption cost to weigh: World ID's strong uniqueness depends on the Orb (biometric); device-level verification is weaker. The biometric angle is controversial and geographically uneven — a genuine friction/values cost for our user base, possibly decisive even though it's the best technical fit.
