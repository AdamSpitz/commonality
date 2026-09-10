# Fund now, beneficiary claims later

Status: current [focus](/focus.md). Strategy: [claiming-an-org.md](/docs/end-user/commonality/vision-and-strategy/ease-of-adoption/claiming-an-org.md). Tech (contracts, proof, refactor of `Channel*`): [claimable-beneficiaries.md](/specs/tech/subsystems/claimable-beneficiaries.md).

**The primitive:** anyone can create a project whose beneficiary is a public identity nobody on our system has claimed yet. Successful funds go to escrow keyed to that identity. The project creator cannot withdraw. Commonality cannot withdraw. Whoever later proves control of that identity binds a payout address and takes the money.

That is what content funding already does for unclaimed X/YouTube/Substack channels. This page is the generalization to websites and (later) other named institutions, so a third party can pool money for a charity *before the charity has heard of us*, without a dishonest middleman and without us as custodian.

No real users yet: content channels should **become** this primitive (see the tech spec), not sit beside a second escrow.

## What we are not building

- **"I'll PayPal it to them."** If the collector is honest, that works off-protocol. We must not give it a success path that looks like ours. Success must not pay the project creator.
- **Us as intermediary or leftover payee.** If the beneficiary never claims, contributors reclaim (or the project deadline fires and they reclaim). Not Adam, not Commonality, not a designated fallback charity.
- **"Funds legally reserved for Example Charity, Inc."** as the protocol assertion. The enforceable assertion is **"funds reserved for the controller of this public identity"** (initially `example.org`). Legal-entity identity is a later, layered claim — see [Assurance levels](#assurance-levels).
- **Keying escrow by EIN / charity number / legal name alone.** Those are not surfaces anyone can post a challenge to. They can appear in a *composite* identity whose verifier still requires a writable proof (domain listed in the official registry, plus domain control, or a KYC provider attesting the wallet).

## Product shape

A project names a **claimable beneficiary** (namespace + canonical id): a tweet channel, a YouTube channel, a website, later a GitHub org. Unclaimed: third parties may create projects pointed at it; nobody withdraws; UI says fan-created / not affiliated. Verified: the controller proved they can write that identity and bound a payout address. Optionally later, **beneficiary-controlled**: only they may create new projects *about* that id. First withdraw does not force that.

Content-specific rules (one contract per tweet, creator veto) stay content-funding features. They are not part of being a beneficiary.

MVP identity for orgs is **domain control**, not incorporation. Contributors who mean the Red Cross type `redcross.org`. The UI shows the registrable domain as large as the dollar amount and does not collapse lookalikes (exact canonical string, monospace, no ellipsis — on the project header, browse cards, cause-board cards, and CauseStarter project cards). Apex and `www` are one name; path-only "sites" are rejected; a create-time redirect to another registrable domain is refused.

Proof is publishing a challenge the world can still fetch: HTTPS `/.well-known/commonality-claim.json` first (what donors see), DNS TXT as an alternate for orgs that can edit DNS but not the CMS. That proves control of `example.org`. It does not prove 501(c)(3) status, board authorization, or tax deductibility.

## Assurance levels

UI must show which of these has actually been proven:

1. **Domain-controlled** — associated with `example.org`. MVP release condition.
2. **Registry-linked** — a public charity/company registry lists that domain (or an official profile) for legal entity X, *and* (1).
3. **KYC-verified organization** — a regulated provider attests the payout recipient is that entity.
4. **Organization-controlled** — receiving address is a multisig under the org's governance.

(2)–(4) never replace (1) as what escrow can enforce from public evidence alone. Copy must not say "donation to a charity" as if we certified it. Only the recipient's own receipting can establish tax treatment.

## Fiat without us in the middle

Stablecoin in escrow → org claims to own wallet/multisig → independent KYC/off-ramp, or an embedded wallet from such a provider. Eventual: verifier authorizes a regulated provider's organization-specific deposit address. Destination attested by the provider; money does not pass through Commonality.

## Policy (charities make these more visible than tweets)

- **Domain expiry or transfer.** For the MVP, the first controller to complete a claim after the public waiting period receives the unclaimed escrow. After that first claim, control of the public identity alone can never replace the established payout address or inherit its funds. An uncooperative domain transfer may therefore leave the identifier unusable until a later recovery design exists; stranding functionality is safer than redirecting money. The UI may freeze new activity when ownership is disputed, but Commonality does not adjudicate a winner.
- **Wallet rotation.** The current payout wallet may authorize a new payout address (and namespaces may additionally require a fresh identity proof). Identity proof without authorization from the current payout wallet is not a recovery mechanism in the MVP. Lost-wallet recovery, domain-transfer recovery, and claim-generation accounting are deferred until real use demands them.
- **Compromise.** Stolen domain or wallet can produce a bad claim. For org-scale balances, a **public waiting period** between proof publication and first withdrawal so the real org can notice a rogue webmaster. Content-scale tips may use a zero wait.
- **Unclaimed money.** Project deadline, then refund contributors. Do not trap funds forever. Do not roll into another project or to us.
- **Unauthorized employee claim.** We do not run a dispute court. Waiting period + public proof is the mitigation.
- **Sanctions / solicitation.** Permissionless projects *named* after real-world orgs create exposure even if we never hold funds. Screening at identity resolution / display time. Advertising "donate to the Red Cross" may be solicitation even when escrow is the protocol. See [analysis-and-reporting-plan](/workflow/analysis-and-reporting-plan.md) and [sanctions](/specs/product/legal/sanctions.md).
- **Tax.** Never present an assurance contribution as a tax-deductible gift unless the recipient's receipting says so.

## When to build

This is the current [focus](/focus.md). The invitation is the same viral loop as funded tweets:

> People have already pooled $X for the controller of your website. Publish this record to claim it — and, if you like the rails, keep using them.

That complements [for-established-orgs.md](/docs/end-user/commonality/vision-and-strategy/ease-of-adoption/for-established-orgs.md): constituency demonstrates demand *before* the org decides to adopt. GitHub orgs / npm scopes are the same primitive for the [OSS tip-jar gap](use-cases.md).

## Deferred recovery model

If real usage requires recovery without the current payout wallet, the likely extension is claim generations: current identity control starts a new generation for future deposits without transferring established generations. Do not build that machinery for the MVP. It becomes warranted for long-lived accumulating escrow, meaningful domain transfers, or materially large balances. Any future recovery design must preserve the invariant that a new identity proof alone cannot retroactively redirect established funds.
