# Money laundering — the fake-project self-donation worry

The worry: someone creates a fake LazyGiving project (one asking for $1M, or many asking for $1000), then "donates" their own dirty money to it. The payout now looks like legitimate crowdfunding income — a clean provenance story for the offramp or the tax return. Nothing in LazyGiving's design resists this: assurance contracts have no gatekeeper, the attacker controls both sides, and a fully self-funded project hits its threshold instantly by design. Splitting across many small projects is classic structuring.

This is a real, documented typology — crowdfunding platforms are a known laundering channel. But three structural facts cut our exposure way down:

1. **The legal duty to catch this sits with the KYC'd choke points, not us.** Crypto-in/crypto-out through our contracts never leaves the transparent chain. The launderer's real problem is the fiat edges — the on-ramp and especially the off-ramp — and those are licensed entities running mandatory AML programs ([bridges.md](/specs/tech/bridges.md) already leans on this for other reasons). As long as we stay non-custodial we are not a reporting entity under FinCEN or FINTRAC — that's the [money-transmission](money-transmission.md) analysis, which answers "do *we* have statutory AML obligations?" (no), a different question from this file's "can the platform be *used* for laundering?" (yes, but see below). Structuring rules bind reporting entities; we aren't one.
2. **A public, indexed, event-emitting ledger is a terrible laundering tool.** Self-donation on-chain obscures nothing — chain analytics sees "wallet A funded a project whose payout went back to cluster A" trivially. What the platform adds for a launderer is only the *narrative* ("this is crowdfunding income"), and that narrative collapses under the exact transparency we've built. Sophisticated launderers will prefer mixers; we're mostly exposed to lazy ones.
3. **Our residual legal exposure is willful blindness, not strict liability.** Canadian Criminal Code s. 462.31 (laundering proceeds of crime) and US aiding-and-abetting theories require knowledge or recklessness. "We had reasonable procedures and acted on notice" — the posture [sanctions.md](sanctions.md) already prescribes — is the defense. (Contrast sanctions, which *is* strict-liability-ish; that's why sanctions ranks higher.)

**The variant more likely in practice than laundering proper: stolen-card cash-out.** A fraudster uses stolen cards through the embedded-wallet on-ramp flow to "contribute" to their own project, then offramps the payout. The on-ramp eats the chargebacks and does the fraud screening, but a *pattern* of this can get our on-ramp partnership terminated and our platform reputation killed — a business risk more than a legal one. Sponsored gas is also a small subsidy to the attack (bridges.md already flags gas-abuse rate limiting).

## What to do

Almost everything needed is already planned elsewhere; the main move is recognizing it as AML coverage too:

- **Wallet screening at the UI layer** (planned in [sanctions.md](sanctions.md)) — Chainalysis/TRM-style APIs flag laundering-risk indicators (mixer exposure, fraud-cluster proximity), not just sanctions lists. One integration covers both risk areas.
- **Takedown/delisting process + report-abuse mechanism** (planned in sanctions.md) — same dual use.
- **Never custody funds, never take fees on flows** ([money-transmission.md](money-transmission.md)'s existing discipline) — this is what keeps us out of the reporting-entity category entirely. A platform fee on fund flows would be the single worst move here.
- **Sybil resistance on project creation** (already specced in [alignment-anti-abuse.md](/specs/product/alignment-anti-abuse.md) via unique-human-id) — makes the many-small-fake-projects pattern expensive.
- **Rate limits / per-session caps on sponsored gas** (already noted in bridges.md).
- **New, cheap:** ToS clause prohibiting laundering and fraud; never market the platform as anonymous or KYC-free.
- **When we get counsel:** add "platform-abuse AML exposure" to the Canadian FINTRAC question money-transmission.md already queues up.

**Bottom line:** worth tracking, but it slots in around sanctions or below. The architecture already contains the main defense (non-custodial, fully transparent, fiat edges outsourced to licensed KYC'd parties), and the remaining mitigations are the same cheap procedures already planned for sanctions. The one genuinely new item is the stolen-card cash-out pattern as a partner-relationship risk.
