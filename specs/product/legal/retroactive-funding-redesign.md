# Preserving retroactive funding without the securities risk (Jul 2026)

The question this file answers: is there a way to keep the *core* of the
retroactive-funding idea — a healthy ecosystem where skilled evaluators fund
projects early and altruists close the loop later — without the securities
exposure mapped in [securities.md](securities.md)?

Answer: yes, by **unbundling** the mechanism. This extends the
"reimbursement-capped resale" posture in securities.md one step further and
adds a complementary reframing of Delegation. (Same caveat as the rest of this
directory: a map for where to spend lawyer money, not legal advice.)

## Restating the actual goal

The goal was never "reward early investors with profits." That was one means.
The actual goal: most people lack the skill/inclination/risk-tolerance to
fund unproven projects (and dodge scams and lemons); that's a specialist skill,
held by VC-like people who are *not* the same people as the altruists who want
to fund the cause. We want a system where each group does what it's good at —
specialists provide early judgment and capital, altruists provide late capital
— and the specialists' capacity to participate is sustained rather than
consumed.

## The first-principles decomposition

In the original design, the scout's token appreciation does **three separate
jobs** at once:

1. **Capital provision** — someone funds the project before it's proven.
2. **Reward for judgment** — the thing that attracts skilled evaluators.
3. **Signal** — the price difference tells the world which projects the smart
   money believed in.

Securities law forbids only one specific way of bundling these: delivering the
reward as **appreciation on a transferable instrument, promoted by us**. It
does not forbid any of the three jobs individually. So: deliver each job
through a channel that can't be characterized as an investment return.

- **Capital provision doesn't require profit — it requires capital
  velocity.** What makes VC-style participation rational is not upside; it's
  that the money comes back and can be redeployed. That's the recoverable-
  donation insight from securities.md, and it's the load-bearing one.
  (Real-world precedent: recoverable grants are a normal instrument at DAF
  sponsors like ImpactAssets and Open Road — not securities, because the
  ceiling is your money back.)
- **Reward for judgment can be paid in the legally safe currencies:**
  reputation (an on-chain "scouted 14, reimbursed 12" record is a real asset
  for anyone whose profession touches grantmaking), **delegated budget** (see
  below), and optionally per-person, discretionary, work-indexed prizes.
  securities.md maps the trap precisely: rewards indexed to *dollars advanced*
  are a return on capital in a gift costume; rewards indexed to the person's
  *record/work* are compensation or tips. Stay on the right side of that line.
- **Signal doesn't need a market price.**
  [successful-projects.md](../successful-projects.md) already builds the
  replacement: trust-filtered success attestations plus reputation-weighted
  scout track records. We lose price *granularity*; we keep the information.

## Design 1 (ranked first): reimbursement waterfall, no market

The capped-resale posture keeps `ERC1155SecondaryMarket` and caps listing
prices at cost. But once the cap exists, the market is vestigial — nobody is
doing price discovery, because there are no prices to discover. So delete the
market entirely:

- Contributions still mint receipt tokens, but make them **non-transferable**
  (or transferable only back to the contract) (or burnable to 0x0 but nowhere else).
- Retroactive funders don't "buy tokens from scouts." They **donate to the
  proven project**, and the contract routes the donation through a waterfall:
  first pro-rata reimbursement of recorded early contributions at exactly
  cost, then (once all scouts are whole) to the project itself (or just cap
  the total retroactive donation amount to the total needed to reimburse the scouts).
- The UX story: "This project delivered. Its early backers are still out
  $8,200. Donate to close the loop — your donation refills the scouts so they
  can fund the next one."

Why this is legally stronger than even the contract-level cap:

- **The exchange/dealer problem doesn't shrink — it vanishes.** No listings,
  no fulfillment, no orderbook, no trading UI. This is the prong
  [operator-posture.md](operator-posture.md) calls "nearly fatal rather than
  merely costly" and unfixable by procedures. The capped market shrinks it; no
  market removes the category. Community-run UIs stop being potential
  unregistered trading interfaces — which unblocks the community-front-end
  strategy currently gated on securities.
- **The third-party-uncapped-market scenario (the *Gary Plastic* analysis in
  securities.md) mostly evaporates.** With non-transferable receipts, a third
  party *can't* build a markup venue on our tokens. The separation problem we
  would otherwise police forever is solved structurally.
- **Howey prong 3 is dead on arrival:** an instrument that structurally cannot
  return more than was paid, held by someone whose alternative was donating
  outright, is *Forman* in its strongest form — and it isn't even a resale,
  it's a refund.
- **Residual check for the lawyer:** is a contingent zero-interest repayment
  right itself a security as a "note"? Under *Reves*-style family-resemblance
  analysis, a no-interest, charitably-motivated, contingent recoverable grant
  looks nothing like the targeted family — but this is exactly the design
  variant to spend the lawyer money on.

What we lose relative to capped resale: partial/early exit for scouts (no
selling to an intermediate holder before retroactive funders show up), and
retroactive funders choosing *which* scout to buy out (pro-rata handles it).
Both are acceptable losses — an intermediate buyer at cost was economically
irrational anyway, so the capped market was mostly theater.

## Design 2 (complement): Delegation is the legal scout-payment mechanism

We already built the clean version of "skilled people direct other people's
money": the **Delegation** subsystem. Reframed:

- Altruists who can't evaluate projects don't buy anything — they **donate
  into a delegatable note** and delegate spending authority to a scout with a
  good record. Their money is a pure donation; it never comes back to them; no
  Howey prongs 1+3 for them at all.
- The scout deploys delegated capital early, prospectively — exercising
  exactly the VC skill — but risking donor money the donors consciously
  entrusted to them, like a grant fund's program officer.
- The retroactive layer then serves the **reputation loop** instead of a
  trading loop: success attestations and reimbursement track records determine
  *whose delegated budget grows*. "Retroactive funders reward good scouts"
  becomes "donors retroactively route more budget through proven pickers" —
  more money *under management*, not money *in pocket*. That's power and
  status (the currency VCs actually compete for), and nothing is being sold.
- If scouts want cash compensation, a disclosed **curation fee for services**
  (flat or per-project, never per-dollar-of-outcome) is payment for their own
  efforts — the thing that *defeats* "efforts of others" rather than
  triggering it. (Whether fee-taking delegated fund direction raises an
  adviser/dealer registration angle in Canada is a specific lawyer question,
  but grantmaking intermediaries do this openly.)

## The mapping

| Original mechanism | Replacement | Legal character |
|---|---|---|
| Scout buys tokens cheap | Scout makes a recoverable donation (own or delegated funds) | Donation with contingent at-cost refund |
| Scout sells at markup | Waterfall reimburses at cost; capital revolves | Refund, not resale |
| Profit as scout incentive | Track record → reputation → larger delegated budgets (+ optional service fees, + genuinely emergent tips we never promote) | Status, mandate, and wages |
| Price signal | Success attestations + scout track records ([successful-projects.md](../successful-projects.md)) | Speech |
| Retroactive funder buys & burns | Retroactive funder donates; contract routes to reimbursement first | Donation |

## Honest costs

- We lose the marginal scout who would participate only for financial upside.
  We keep everyone for whom "my giving budget revolves instead of depleting,
  and my judgment visibly compounds into influence" is compelling — probably
  most of the realistic early population for a cause-aligned public-goods
  ecosystem.
- The meta-point at the end of securities.md still governs: the protection
  holds only if the marketing never rebuilds the profit expectation. "Get your
  money back and fund the next one" must stay the *whole* story; the old
  scouts-make-a-return copy must be scrubbed and stay scrubbed.

## The path explicitly not taken

Keeping the profit mechanism and complying via crowdfunding exemptions
(NI 45-110 / Reg CF) or dealer registration is theoretically coherent but the
ongoing portal/dealer obligations are wildly disproportionate for a solo
founder, and it drags every community UI into the regulated perimeter.

## Open questions for the securities lawyer

1. Is the contingent zero-interest reimbursement right a "note"/security under
   *Reves* (US) or an investment contract under *Pacific Coast Coin Exchange*
   (Canada), despite the at-cost cap? (Expected answer: no, but confirm.)
2. Does fee-taking direction of delegated donated funds trigger any
   adviser/dealer/portal registration in Canada (CSA) or the US?
3. Any characterization risk in the waterfall itself — e.g., does routing a
   later donor's money to reimburse earlier funders create any obligation or
   claim that changes the analysis for either party?
4. Confirm the per-person / per-record vs. per-dollar line for any future
   scout-prize mechanism (the trap already mapped in securities.md).

## Implementation implications (if adopted)

- `ERC1155SecondaryMarket` and `DelegatableNotes.purchaseFromSecondaryMarket`
  become dead code for this flow; receipt tokens become non-transferable.
- New waterfall logic in the LazyGiving contracts: record early contributions
  at cost; route retroactive donations pro-rata to reimbursement, overflow to
  the project.
- UI: replace buy-and-burn with "close the loop" donation flow; surface
  outstanding-unreimbursed amounts (this is the "unrewarded contributions"
  queue from successful-projects.md, unchanged in spirit).
- Marketing scrub (already required under every posture) plus rewriting
  `docs/end-user/commonality/vision-and-strategy/why-its-better/retroactive-funding.md`
  around reimbursement and reputation.
