# Funding decomposition exploration

Discussion captured 2026-09-23. This is an architectural/product exploration,
not an approved implementation plan, a separate-repository decision, or a legal
assessment. [Decoupling the pieces](decoupling.md) records implemented funding
boundaries and their remaining limitations.

## Motivation

The nonfinancial substrate has value independently of funding: statements,
implications, alignment attestations, nudges, and bridge-building can support
their own applications. Funding should depend on that substrate without making
the substrate depend on funding. Independent publication need not wait for a
physical repository split.

Apply the same question within funding: which capabilities are independently
useful, and which are applications composed from those capabilities? The
existing site names do not necessarily identify the right package boundaries.
An independent component could be contracts and a library with a small demo;
it does not automatically need another branded website.

## Candidate pieces

| Piece | Independent job | Current boundary / remaining work |
|---|---|---|
| Assurance funding | Collect contributions, release funds when a condition succeeds, and permit refunds on failure. | LazyGiving's core; measurement, conditions, and money already have separate interfaces. |
| Retroactive reimbursement | Let later donors reimburse early contributors at cost so their giving budgets can circulate again. | Distinct economics, currently coupled to assurance contribution and claim accounting. |
| Delegatable notes | Give someone revocable spending authority, including onward delegation, while retaining the original owner's position. | Strong standalone candidate; spending and returned-fund accounting still have funding-specific assumptions. |
| Recurring pledges | Execute a previously authorized funding instruction periodically. | Separate registry and executor already exist; the current instruction creates a delegated note. |
| Claimable beneficiaries | Name a public identity that has not joined yet, and let whoever later proves control claim or refuse each project's proceeds. | Identity proof and the payout registry are shared. Each new project keeps its own proceeds ([ADR 0015](../../decisions/0015-per-project-beneficiary-proceeds.md)). `BeneficiaryEscrow` is leftover wiring, not a destination for new projects. Whether beneficiary-controlled project creation and disavowal stay on the registry is still open. |
| Content funding | Identify artifacts or future content, associate them with creators, and fund them. | Application combining content registration, assurance funding, beneficiary claiming, and attestations. |
| Cause-based funding discovery | Find fundable work through statements, alignment judgments, and personal trust. | Integration layer between the nonfinancial substrate and funding; discovery and project pages still assume our assurance contracts. |
| Conditional funding composition | Express matching, coordinated thresholds, conditional participation, and fallback funding. | Existing interfaces provide seams; several richer compositions remain proposals rather than implemented products. |

Relevant specs: [LazyGiving](../subsystems/lazyGiving/README.md),
[delegation](../subsystems/delegation/README.md),
[recurring pledges](../subsystems/delegation/recurring-pledges.md),
[claimable beneficiaries](../subsystems/claimable-beneficiaries.md),
[content funding](../subsystems/content-funding/README.md), and
[assurance composability](../subsystems/lazyGiving/composability.md).

## Existing Ethereum work: could we actually use it?

Prefer adopting a preexisting protocol when it does the job we need, or a close enough job that it still suits the purpose. "Sort of related" is not enough. The question is whether we could stop maintaining that piece and point at theirs, or compose with theirs as a first-class mechanism.

Surveyed 2026-09-24. This is not a legal review and does not authorize swapping implementations.

| Piece | Verdict | Why that verdict |
|---|---|---|
| Assurance funding | **Keep ours.** Use others as *external mechanisms to discover*, not as a replacement. | Classic Kickstarter contracts and OpenZeppelin `RefundableCrowdsale` are ICO-era all-or-nothing: deadline, then creator withdraws or backers refund. LazyGiving allows buying after the deadline, refunds only after deadline *and* unmet threshold, and issues non-transferable receipts. Those libraries do not do that job. Juicebox is production treasury/crowdfund infrastructure (ConstitutionDAO-scale), but it issues project tokens, payouts, and redemptions — not assurance receipts. It is a second funding mechanism for cause boards, which is the [Juicebox test](#external-projects-juicebox-as-a-concrete-test) below, not a drop-in for `AssuranceContract`. Gitcoin and Giveth take donations immediately; they are not assurance. |
| Retroactive reimbursement | **Keep ours.** Do not substitute RetroPGF or Hypercerts. | Optimism RetroPGF, Gitcoin retro rounds, and Hypercerts pay later for demonstrated impact, often with surplus relative to cost. The job here is later donors restoring early contributors' original budgets with no upside, via non-transferable claims, so giving capacity recirculates. Using RetroPGF would replace that economics with a different product. Adjacent, not usable. |
| Delegatable notes | **Keep ours** as the budget object. Do not replace it with ERC-7710, Zodiac, or Hats. | [MetaMask Delegation / ERC-7710](https://docs.metamask.io/smart-accounts-kit/development/concepts/delegation/overview/) is the real preexisting permission primitive: revocable, redelegatable, caveat-restricted execution from a smart account. Zodiac Roles scopes calls from a Safe. Hats is role tokens, not money. None of them is a splittable deposited balance whose chain survives purchases, refunds, and reimbursements, rooted at an EOA who never moved to a smart account. Adopting ERC-7710 would mean rewriting notes as permissions over a wallet, forcing smart accounts, and losing the note-as-asset / `chainHash` model. A later adapter could let an ERC-7710 delegate *spend into* our markets (Juicebox stage 3 territory). That is composition, not replacement. |
| Recurring pledges | **Keep the registry + note mint.** Keepers are optional. Streaming protocols are not a substitute. | Superfluid, Sablier, LlamaPay, and Drips streams continuously pay an *address*. The standing pledge must mint a note **rooted at the user**, already delegated, targeting a cause — because a third-party `deposit()` would make the executor the root ([recurring-pledges.md](../subsystems/delegation/recurring-pledges.md)). Streaming to a project or to Alice skips that. Unlock's recurring memberships are the closest *shape* (ERC-20 allowance + permissionless poke) but the execution target is a membership NFT, not a delegated note. Giveth recurring donations are Superfluid into Allo anchors. We could replace our offchain scheduler with Gelato/Chainlink, since `executeDue` is already permissionless; that is the only preexisting piece that actually fits. |
| Claimable beneficiaries | **Keep identity proof and the payout registry.** Drips is usable only if GitHub-repo funding is a real consumer. | [Drips](https://docs.drips.network/) already funds a GitHub repository before the maintainer has a wallet; they claim later with `FUNDING.json`. That *is* the job for the GitHub namespace. It is not the job for DNS, X, YouTube, or Substack, and it does not give us payout rotation that a later proof cannot hijack, namespace waiting periods, or beneficiary-controlled project creation. 0xSplits only splits among *already known addresses*. ENS DNS import proves a domain; it does not hold funds. Proposed ERC-8186 (claimable escrow for off-chain identifiers) is the same idea on paper and is not a deployed thing to adopt. Use Drips if we want GitHub OSS as an external mechanism or a first GitHub namespace. Keep `BeneficiaryIdentity` and `BeneficiaryRegistry` for websites and creator accounts. Do not revive `BeneficiaryEscrow` as the pot: since [ADR 0015](../../decisions/0015-per-project-beneficiary-proceeds.md), each new project holds its own proceeds, and the registry's current payout address claims or refuses that project only. |
| Content funding | **Keep as our application.** Do not adopt Mirror/Zora contracts. | Mirror crowdfunds (now under Paragraph), Zora coins, and Unlock memberships fund artifacts and creators, usually with tradable tokens or NFTs. They do not compose our assurance receipts, claimable beneficiaries, and attestations. Treat them like Juicebox: possible external mechanisms on a board, not a replacement for the content-funding factory. |
| Cause-based funding discovery | **Keep the alignment/trust board.** Point it at other people's projects. | Gitcoin, Giveth, and Allo are grants catalogs plus matching/sybil tooling. Allo is in maintenance mode. They do not find work through statements, implications, alignment attestations, and personal trust. What we *can* use: their projects as attestation subjects and link-out targets, same as Juicebox. Passport/EAS are identity/attestation rails, not cause discovery. |
| Conditional funding composition | **Keep `IAssuranceCondition` / `IProgressSource`.** Use Gitcoin matching only as another external mechanism. | Gitcoin quadratic matching and Allo strategies allocate a *matching pool*. Gnosis Conditional Tokens (Polymarket) split collateral on oracle outcomes. Juicebox rulesets govern *their* treasuries. None of those is combinators over our tri-state conditions (AND/OR/K-of-N, waterfalls, gated pledgers, fallback routing). Our matching already works by treating a matcher as a buyer ([matching.md](../subsystems/lazyGiving/matching.md)). Writing an Allo strategy that pays into LazyGiving would be optional composition with a mothballed protocol, not a reason to stop owning the condition interfaces. |

Practical adoption that *does* fit:

- **Discovery adapters** for Juicebox, and later Gitcoin/Giveth/Drips projects, without taking their payment semantics as ours.
- **Optional keepers** (Gelato/Chainlink) to poke `executeDue`, instead of treating our scheduler as load-bearing.
- **Drips** only if GitHub-repository funding is a concrete first external consumer of "fund this identity before they show up."

Do not adopt: RetroPGF as reimbursement, Superfluid as recurring pledges, ERC-7710 as notes, OpenZeppelin crowdsale as LazyGiving, Mirror as content funding.

## External projects: Juicebox as a concrete test

A project should not have to adopt our crowdfunding mechanism to be discovered
through our alignment system. A Juicebox project appearing on a cause board
would test this boundary with a real second funding mechanism.

The alignment-attestation contract already accepts an arbitrary `bytes32`
subject. It does not require an assurance-contract address. An external project
can therefore be an attestation subject once we define its canonical identity
and how to resolve that identity into displayable project information.

Juicebox separates project identity from payment contracts: projects have IDs,
and a directory resolves controllers and payment terminals. Attestations should
identify the project, not its current payment terminal. A proposed canonical
reference should distinguish chain, protocol deployment/version, and project
ID before being encoded into a subject ID. This encoding and resolution scheme
is not yet implemented. See the [Juicebox integration documentation](https://juicebox.money/build)
and [project/payment overview](https://juicebox.money/learn), consulted for this
discussion; verify the target deployment's interfaces when implementing.

Three stages can stand on their own:

1. **Discovery and link-out.** Show the project on a cause board with alignment
   and trust information, linking to its existing funding page.
2. **Funding display and direct payment.** Add an adapter that understands the
   project's actual state, payment route, terms, and supported capabilities.
3. **Delegated funding.** Let notes fund the project under explicit spending
   authorization, with correct ownership/accounting for any resulting assets
   and returned funds.

Stage 1 does not require stages 2 or 3. Generic subject attestations alone do
not implement stage 1 either: project discovery, metadata resolution, and board
rendering still need to accommodate external projects.

Do not describe an external project's tokens, cash-out rights, or payment rules
as our non-transferable receipts, assurance refunds, or at-cost reimbursement.
An adapter must represent the actual mechanism. `FundingSummary` provides a
presentation seam, not a universal transaction adapter or spending permission.

## Delegatable notes as an independent primitive

The useful substance is the arrangement of authority: a person can delegate a
budget, their delegate can enlist another person, and upstream participants can
revoke remaining downstream authority. This does not reverse completed spending.
Our current funding integration also preserves chains through purchases,
refunds, and reimbursements.

A potential standalone package would distinguish:

- Ownership, balances, splitting, delegation, and revocation.
- Explicitly authorized ways of spending those balances.
- Mechanism-specific handling of receipts, claims, and returned funds.

`IFundingMarket` starts that separation; it does not make the current notes a
general-purpose delegated wallet. Assurance-specific reimbursement interpretation
has an adapter, but ownership and contribution-basis bookkeeping still need to
remain coherent across any future integrations. A generic arbitrary-call
facility is not implied by this proposal.

Commonality's delegated giving could be one application of this primitive.
Broader delegated-budget uses are a possibility to validate, not a requirement
to build now.

The intuition that similar transfers could be achieved more simply is not an
established legal conclusion about publishing or operating this mechanism.
Technical independence and legal exposure are separate questions; this
discussion does not resolve the latter.

## Claimable beneficiaries: fund now, claim later

Updated 2026-09-26 for [ADR 0015](../../decisions/0015-per-project-beneficiary-proceeds.md).

The independent proposition is: a project can name the controller of a website
or creator account before that person joins. Successful proceeds stay in that
project. The project creator cannot withdraw them, and neither can Commonality.
Whoever later proves control binds a payout address, and that address may claim
or refuse this project only. Registering the address, or claiming some other
project, does not accept this one.

Identity proof stays in the nonfinancial substrate (`BeneficiaryIdentity`).
The funding registry (`BeneficiaryRegistry`) copies that controller as the
initial payout address and handles rotation. It does not hold the project's
money. `BeneficiaryEscrow` remains deployed for old wiring and is not a
destination for new projects. `withdraw()` on an identity-targeted project
reverts; the parent recipient is the contract itself.

A refusal before success uses the ordinary purchase-refund path. A refusal
after success, or silence for 90 days after someone notes success, lets
contributors reclaim the recipient surplus in proportion to their claim-share
balance. Reimbursement reserves stay reserved. The 90-day window starts at
`noteSuccess`, which the project page can call, because the funding condition
has no success timestamp.

Content funding and ordinary projects both use this claim and refuse path.
Other funding systems could name the same identity without adopting our
assurance mechanism. They would still have to hold the money themselves: the
shared pot is not the interface.

The registry also handles beneficiary-controlled project creation and project
disavowal. Whether those policies belong in the smallest identity package or
in integrations above it is still open. Content occupancy and creator veto
already belong with content funding.

An extraction must preserve the claim semantics: identity proof alone cannot
redirect an adopted payout address, a Verified or Domain-controlled mark is
not acceptance of a balance, claim waiting periods remain namespace-specific,
and proving domain control does not establish continuity of a legal
organization. See the [beneficiary spec](../subsystems/claimable-beneficiaries.md)
and [fund now, claim later](../../product/fund-now-claim-later.md).

## Reimbursement deserves an explicit boundary

“Individual projects” currently bundles assurance funding with a second idea:
early contributors take the uncertainty, later donors support demonstrated
results, and early contributors recover their original budget without upside.

That mechanism deserves an explicit conceptual and accounting boundary even if
it initially ships with assurance funding. It includes contribution basis,
future reimbursement claims, earned reimbursement, and withdrawal accounting;
separating it is more than extracting a pro-rata formula. The current product
uses non-transferable recognition receipts and non-transferable reimbursement
claims, not a secondary market.

## Publishing risk, informal

Recorded 2026-09-24 from a read of the candidate list. This is not a legal
opinion, a compliance review, or permission to publish. It ranks one question
only: how exposed is a named package that other people can actually deposit
into, compared with leaving the same code inside Commonality?

Custody, and whether value can be handed to someone else, matter more than how
clean the package boundary is. Immutable contracts, no admin key, no fee, and
users calling the contracts themselves reduce the "you are the money business"
argument. They do not turn a custodial, delegatable, or pay-the-absent-person
contract into a neutral library.

### Safer to publish alone

**Cause-based funding discovery, as link-out only.** A board of statements,
alignment, and trust that links to someone else's funding page does not take
deposits or choose who gets paid. That is Juicebox stage 1 above. Exposure
jumps if the package itself accepts payment or spends a note into the external
project.

**Conditional funding composition, as condition logic only.**
`IAssuranceCondition`, `IProgressSource`, and combinators (AND/OR/K-of-N) that
do not hold balances are rules. A matching pool, a waterfall that custodies, or
an on-chain fallback router that sits on the funds belongs with assurance
funding.

**Recurring pledges, only as a registry of user-signed instructions plus a
permissionless poke.** If the user's wallet still holds the tokens until
execution, the registry is an alarm clock. The current design does not stay
there: each instruction mints a delegated note, so publishing recurring pledges
as they work today publishes the note system too. Running the keeper puts the
operator in the transmission path even when `executeDue` is permissionless.

### Middle

**Content funding.** This is an application. A factory that creates fundable
artifacts still holds contributions and pays creators or escrows. Narrowing it
to particular artifact types does not change that. Non-transferable receipts
help against a profit-share story; they do not make the factory a
non-financial library.

**Assurance funding.** Ordinary conditional escrow: people deposit, the
contract holds, a threshold releases or a failure refunds. That is the central
money-services fact pattern. The design already points the right direction
against a securities story: non-transferable recognition receipts, no interest,
no premium, refunds instead of a tradeable claim. The economic story is "your
contribution is released or returned." A demo that accepts deposits is still
operating that escrow.

**Retroactive reimbursement.** Inside assurance funding, later donors restoring
early contributors at cost is a refund-like feature. Non-transferable claims,
no upside, and a cap at basis are what keep it from looking like a profit share
or a RetroPGF payout. Lifted out as its own primitive, the same ledger
(contribution basis, earned amounts, withdrawal rights) is easier to describe
as a financial claim. Publishing it separately makes that story worse. It gets
sharply worse if those claims become transferable or ever pay more than cost.

### Riskier

**Claimable beneficiaries.** The earlier reading treated this row as its own
custodial package: `BeneficiaryEscrow` holding one balance per name and paying
it to whoever later proved control. [ADR 0015](../../decisions/0015-per-project-beneficiary-proceeds.md)
rejected that pot. New projects keep their proceeds. The registry binds a
payout address; it does not take the deposit. One claim cannot sweep every
project that named the same identity.

Custody does not disappear. Each identity-targeted project still holds money
for a person who may not have a wallet yet, then pays the registry's current
payout address if that address claims this project. That is the same
conditional-escrow fact pattern as assurance funding, with an extra rule about
who may release the recipient surplus. Publishing `BeneficiaryIdentity` and
`BeneficiaryRegistry` alone, with no project that accepts deposits, is a
calmer object: proof and a payout address, not a balance. Publishing a fresh
shared escrow would put the rejected design back on the table. A domain proof
is still not continuity of an organization, and a social-account proof can
still pay the wrong person. Drips doing this for GitHub does not make either
shape a neutral library.

**Delegatable notes.** Users deposit value into a contract; the balance can be
split; spending authority can be passed onward; upstream parties can revoke
what remains; the chain survives purchases, refunds, and reimbursements.
Onward delegation is what separates this from a single signed authorization. A
permission over the owner's own wallet is a calmer object because the deposit
never becomes a balance someone else holds, and it remains a worse technical
fit for the reasons in the adoption survey. A generic arbitrary-call spend
would be worse still. Even a narrow "spend only into these markets" package is
a stored balance that other people can draw. Of the eight rows, this is the
one not to ship as a general delegated-budget primitive on the strength of the
mechanism being elegant.

### What this does to the suggested direction

Technical reuse and publishing exposure point different ways. Delegation
remains a strong standalone mechanism and a risky thing to publish as a
deposit-taking package. Claimable-beneficiary *identity and payout binding*
can be a reusable primitive without taking deposits. The money stays inside
the project, so the custodial exposure sits with assurance funding rather
than with a separate escrow package. Discovery-as-link-out and condition
interfaces are the rows that can be separate primitives and still plausibly
be only software. Reimbursement should stay an internal boundary of
assurance funding until some other consumer exists; extracting it highlights
the claim.

## Suggested direction and open decisions

The suggested direction is to make delegation a reusable primitive; keep
claimable-beneficiary identity and payout binding reusable without a shared
pot; retain assurance funding plus reimbursement, including per-project
beneficiary proceeds, as a coherent initial product with separable internals;
and open cause-board discovery to external funding mechanisms. Content
funding remains a focused application of those pieces. Recurring pledges can
stay a separate automation layer without requiring premature generalization
of its execution target.

Open decisions:

- Which component has a concrete first independent user or integration?
- Is Juicebox link-out discovery the first test of external project support?
- What canonical external-project identity and metadata resolution should boards use?
- Which spending operations define the first independently publishable notes package?
- Should beneficiary-controlled project creation and disavowal stay on the payout registry, now that proceeds stay in the project?
- Does reimbursement have a second consumer that justifies extracting more now?

These questions do not authorize implementation or repository moves. The next
use case should establish the necessary boundary rather than requiring every
possible funding mechanism to fit a speculative universal interface.
