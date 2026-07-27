# Use-case inventory

The canonical list of **what people actually come here to do**. Everything else in
this repo is organized by *thing we built* — subsystems, UI domains, contracts,
specs. This file is the one place organized by *goal a human arrived with*.

Use it for:

- **Prioritization.** A use case with no smooth path is a product gap, even if
  every subsystem it needs is "done."
- **Coverage.** Each entry names the path a user would take, so it can be handed
  to a `review.workflow-clarity` instance (see [Wiring to the verifier](#wiring-to-the-verifier)).
- **Narrative.** The [walkthroughs](/docs/end-user/shared/use-case-walkthroughs/README.md)
  are the end-user-facing prose versions of some of these; this is the index they
  hang off.

Related but different: [mvp.md's entry points](mvp.md#entry-points) lists four
entry points by subsystem; [ui-domains.md](ui-domains.md) lists the eight branded
sites; [composability.md](composability.md) lists what contract composition makes
*possible*. This file lists what a person is trying to accomplish.

## How to read the status column

| Status | Meaning |
| --- | --- |
| **Smooth** | A newcomer with this goal can complete it in the shipped UI without guessing. |
| **Rough** | Mechanically possible today, but the path is unmarked, jargon-heavy, or spread across domains. |
| **Missing** | Designed or argued for in the docs, but has no UI surface at all. |
| **Compose** | Needs no new primitive — it's a composition of shipped pieces (usually plus an oracle or a UI affordance) that hasn't been productized. See [composability.md](composability.md). |
| **Blocked** | Waiting on infrastructure that is deferred, not on product design. |
| **Speculative** | Not designed to the point of buildability. |

> **Statuses verified against the live UI on 2026-07-25.** Method: local stack
> (hardhat + Ponder + IPFS) seeded with `./scripts/data.sh --seed=demo`, then each
> domain driven in a real browser via the Vite dev server with
> `VITE_EVENT_CACHE_URL=http://localhost:42069`, walking both the logged-out path
> and the wallet-connected path (hardhat ACCOUNT_0 via `window._setupTestWallet`).
> Rows marked **Compose** were verified negatively — by confirming no contract in
> `hardhat/contracts/` and no component in `ui/src/` implements them.
>
> Two caveats on that verification. Local seed data is entirely
> content-funding/CSM-flavoured, so no row was exercised against *local
> public-goods* content. And the harness connects a real wallet, so it cannot
> observe what a genuinely wallet-less person experiences beyond the connect
> modal.

> **Do not verify through `http://<domain>.localhost:8088`.** That gateway serves
> the IPFS build, which resolves its indexer URL from a runtime `config.json` that
> local deploys don't supply; it falls back to a relative `/api/events` that the
> gateway does not proxy, so every data-backed page 404s and renders an empty
> state. This looks exactly like a broken product and is not one. See
> [What verification turned up](#what-verification-turned-up).

---

## A. Fund one specific thing

The project-shaped cases. Entry point is normally LazyGiving.

| # | Use case | Who wants what | Status | Gap / next step |
| --- | --- | --- | --- | --- |
| A1 | **Local community thing** | Neighbors fund a block party, a playground, a mural — small, local, all-or-nothing. | Rough | **Better built than expected.** `/projects/new` ships the full creation flow: goal, deadline, stop-at-goal vs keep-accepting, giving options with stock images (one is literally "Community garden"), a "suggest giving levels" helper, and a donor-eye preview. The gap is not mechanics, it's narrative and content: [block-party.md](/docs/end-user/shared/use-case-walkthroughs/block-party.md) self-flags as not differentiating from GoFundMe, and *no seeded cause anywhere in the demo dataset is a local public good* — every cause is political-content flavoured. A visitor cannot see this use case working. |
| A2 | **Defunded program rescue** | A community keeps a program alive after a grant is cut, or pre-commits to do so as a deterrent. | Compose | Confirmed absent: no oracle or combinator contract in `hardhat/contracts/`, no UI. The credible-threat inversion needs a real-world-event oracle plus a NOT-wrapper. [composability.md](composability.md) calls this the natural first composition. Walkthrough: [defunding.md](/docs/end-user/shared/use-case-walkthroughs/defunding.md). |
| A3 | **Org matches donations** | A foundation/employer says "we'll put up half if you raise the other half," and wants verifiable proof its money was catalytic. | Compose | Confirmed absent: no matching contract, no matching UI. Even the "fixed gap-fill works today" claim in [matching-funds.md](matching-funds.md) is only true in the sense that a matcher could manually pledge the remainder — there is no matching *affordance*. |
| A4 | **Retroactive reward for early believers** | Someone who backed a project before it was obvious gets reimbursed once it demonstrably delivered. | **Smooth** | **Corrected from Rough — the donor-facing path is fully productized.** A succeeded project page shows "Close the loop — Early contributors are still out 0.06. Donate to reimburse them pro-rata, at cost," a `DONATE TO CLOSE THE LOOP` action, and a contributor leaderboard with contributed/refunded/net columns. The give flow on every project offers an explicit "Yes — scout funding" vs "No — normal donation" choice. What's genuinely missing is the automated *pool* that bids for receipts, not the path. |
| A5 | **Federated regional project** | Several towns fund shared infrastructure, each town's participation conditional on the others'. | Compose | Confirmed absent. Depends on A2/A3 combinators. Walkthrough: [local-funding-shift.md](/docs/end-user/shared/use-case-walkthroughs/local-funding-shift.md). |
| A6 | **Milestone/tranche funding** | Back an ambitious multi-stage project without risking everything on stage one. | Compose | Confirmed absent — "tranche" and "milestone" appear nowhere in `ui/src/` or the contracts. No walkthrough. |

## B. Fund an ongoing stream

The creator-shaped cases. Entry point is Content Funding or Civility.

| # | Use case | Who wants what | Status | Gap / next step |
| --- | --- | --- | --- | --- |
| B1 | **Tip-jar migration** | A creator or OSS maintainer moves off Patreon/Ko-fi/GitHub Sponsors without adopting crypto vocabulary. | Rough | Step 1 of the [ladder](/docs/end-user/commonality/vision-and-strategy/ease-of-adoption/tip-jar-upgrade-path.md) is shipped: the give flow's "normal donation" option keeps the recognition receipt and permanently waives repayment, exactly as designed. The unclaimed-creator surface is genuinely strong — a copyable claim link, a pre-written suggested message, and a "fan-created contracts do not imply endorsement" disclaimer. Two real gaps: X/YouTube/Substack are the *only* platforms, so **OSS maintainers have no surface at all** (no GitHub/npm channel type), and there is no migration path for a creator who already has a Patreon audience. |
| B2 | **Fund non-inflammatory political writing** | A reader wants a standing pool of money aimed at writing that doesn't treat them as stupid or evil. | Rough | **Worse than assessed.** The Civility landing page is excellent, but the pages behind its CTAs are explicitly unfinished: `/popular-statements` says *"These are placeholder statement prompts"* and `/filters` says *"The full personalized filter explorer is still evolving."* On a Tally statement page the civility panel reports *"The noninflammatory meta-statement is not configured, so civility attestations can't be verified here."* The strongest walkthrough in the repo ([noninflammatory-content.md](/docs/end-user/shared/use-case-walkthroughs/noninflammatory-content.md)) describes a mechanism the UI cannot currently demonstrate. |
| B3 | **Recurring pledge to a cause** | "$30/month toward local infrastructure, and I don't want to think about it again." | **Smooth** | **Corrected from Rough — it's shipped.** `/delegation/notes/new` has a "Make this a monthly recurring pledge" checkbox; `/delegation/notes` has a "Monthly Pledges" section and an "Active Monthly Pledges" stat; cause boards show "Ongoing Monthly Pledges" as a headline metric. Matches the baseline in [recurring-pledges.md](recurring-pledges.md). |
| B4 | **Creator verification** | A Twitter/YouTube/Substack creator claims their channel so fans can fund them. | Smooth | Confirmed. Channel browser filters by Unclaimed / Verified / Creator-Controlled; the creator dashboard has a clear empty state and a single next-step CTA; Tally settings expose the "get verification tweet" flow. Seeded channels show both Unclaimed and Creator-Controlled states rendering correctly. |

## C. Express and discover a position

The statement-shaped cases. Entry point is Tally or CSM.

| # | Use case | Who wants what | Status | Gap / next step |
| --- | --- | --- | --- | --- |
| C1 | **Say what I actually think** | Sign or write a statement and have it counted alongside people who said the same thing differently. | **Smooth on testnet** | **Re-corrected 2026-07-27: the 2026-07-25 "Rough" was a local-env bug, not a product gap.** The observed "0 indirect supporters" came from `ui/e2e/global-setup.ts` repointing `ui/.env` at the local hardhat chain without rewriting the trust roots, so the UI trusted a Base Sepolia attester with no local publications. Testnet builds do ship the deployed attester as a default (`scripts/deploy-ui.sh` → `setup-env.sh base-sepolia` → `VITE_DEFAULT_TRUSTED_ATTESTERS`), so a first-time testnet visitor is not asked to paste an address. The stale "official AI is not yet deployed" copy that corroborated the misreading is gone. A zero now explains itself rather than rendering bare. See [chain-scoped-trust-config.md](/docs/dev/chain-scoped-trust-config.md). **Not yet re-verified in a live browser against testnet** — status is inferred from the build config. |
| C2 | **Discover the common-sense majority** | Find out that millions of people hold your supposedly-lonely nuanced view. | Rough | The C1 root cause it inherited turned out to be a local-env bug (see C1), so this is no longer capped by trust config. Remaining roughness is in the narrative surfaces themselves. Has two verifier checks (`-understand`, `-act`). |
| C3 | **Repair a specific relationship** | "Here's me, here's my friend — nudge us both toward common ground." | Speculative | Confirmed absent. Deferred in [mvp.md](mvp.md), but flagged there as probably higher-demand than "nudge me toward the other side." The generic CSM nudger ships; the two-specific-people framing has no surface. |
| C4 | **Bridge-building at scale** | Synthesize common-ground statements and get them in front of the people who'd sign them. | **Rough** | **Corrected from Speculative — the consumer-facing half is shipped and good.** `/bridges` renders real, category-filtered bridge cards (Abortion, Drug Policy, Gun Policy, Immigration), each showing a moderate-left starting point, a moderate-right starting point, the shared claim, and a "view and sign on Tally" CTA — plus an honest "AI-synthesized suggestions, not poll results" disclaimer. What remains speculative is the *production pipeline* in [bridge-creator.md](bridge-creator.md) and [bridge-creator-csm-next-steps.md](/workflow/bridge-creator-csm-next-steps.md); the cards are currently authored, not generated. |

## D. Route money through people you trust

The delegation-shaped cases. Entry point is Aligning.

| # | Use case | Who wants what | Status | Gap / next step |
| --- | --- | --- | --- | --- |
| D1 | **Delegate to someone who knows the field** | "I care about this cause but can't evaluate projects — here's my budget, you decide." | Rough | The money half is solid: `/delegation/notes` shows funds, totals, and per-fund `DELEGATE` / `RECLAIM` actions; the deposit form takes an amount, an optional delegate, and an intended statement. The social half is the gap, and it's sharper than assessed — **"Delegate to" is a bare `0x...` address field.** There is no delegate directory, no search, no track-record browser. The product's own pitch is "hand your giving to a friend, not a bureaucracy," and the UI assumes you already know your friend's wallet address. |
| D2 | **Be a delegate** | Build a public track record of directing other people's money well. | Rough | Confirmed. An "Acting as Delegate" counter exists on the delegation page, so the role is modelled — but there is no way to announce yourself, publish a track record, or be discovered. D1 and D2 are the same missing feature seen from both ends. |
| D3 | **Vouch that a project is aligned** | Put your reputation behind "this project actually serves this cause." | Rough | Vouching works and the trust plumbing is real: cause boards have a Discovery control ("My network" / "+1 hop" / "Anyone") and Direct/Indirect alignment filters, and a board with attestations renders aligned projects correctly with a "Direct alignment: someone vouched that this project serves this cause" explanation. Same ergonomic gap as D1 — `VOUCH FOR A PROJECT` takes a raw project address. Spam/sabotage resistance remains open: [alignment-anti-abuse.md](alignment-anti-abuse.md). |

## E. Build on the infrastructure

The movement-shaped cases. These are the ones where Commonality is a protocol, not a product.

| # | Use case | Who wants what | Status | Gap / next step |
| --- | --- | --- | --- | --- |
| E1 | **Launch a focused movement vertical** | A group wants a branded site with its own framing, riding the shared contracts. | Rough | Better than assessed: `/founders` is a real pitch page ("Build a vertical on the public-goods substrate") with an explicit design rule — *lead with one concrete job; don't ask users to understand the whole ecosystem* — plus an inventory of existing verticals. Still prose, not tooling: no template, no scaffolding command, no "here's how to add your domain" runbook. The "moat of capability, not lock-in" claim in [composability.md](composability.md) remains unevidenced by a third party. |
| E2 | **Existing nonprofit gets on the rails** | An org adopts Commonality for ordinary donation tracking, before any crisis. | **Missing** | **Corrected from Rough — there is no surface at all.** `/participate` enumerates six entry points, every one addressed to an individual ("donate to a cause", "fund a concrete project", "sign statements", "delegate your donation decisions"). Nothing addresses "I run an organization." [rails.md](/docs/end-user/commonality/vision-and-strategy/ease-of-adoption/rails.md) argues this is how adoption actually starts, which makes it the largest gap between stated strategy and shipped product. |
| E3 | **Shift funding from provincial to local** | The localism/power-shift angle. | Speculative | Confirmed absent. [localism-movement.md](localism-movement.md); open question whether it warrants its own UI domain. |

## F. Cross-cutting paths

Not use cases themselves — they gate many of the above. A break here breaks whole rows.

| # | Path | Status | Gap / next step |
| --- | --- | --- | --- |
| F1 | **Non-crypto-native project creation** | **Smooth** | **Corrected from Rough — the design shipped.** The recipient control on `/projects/new` is exactly the layered picker specced in [foolproof-project-creation.md](foolproof-project-creation.md): "Send to my account" preselected with the address shown, "Pick from a saved contact", and "Enter an Ethereum address or ENS name". Goals and prices are dollar-denominated with the token mechanics described as happening "behind the scenes". |
| F2 | **Wallet-less donor contributes** | Blocked | Confirmed. The connect modal offers only an injected-wallet option and an "I don't have a wallet" link — no email or social login path, despite Privy scaffolding and `CreatorGasTank`/`GasTankFunder` contracts existing in-repo. Claim-link relay is an open Ask in [inbox.md](/inbox.md). Gates every "ordinary person" row here. |
| F3 | **Fiat in and out** | Blocked | Confirmed absent. Bridges deferred; see [specs/tech/bridges.md](/specs/tech/bridges.md). |
| F4 | **Understanding what you committed to** | Rough | The comprehensibility constraint from [composability.md](composability.md). Individual project pages explain commitments well ("either option is refundable", "only the recipient wallet can withdraw"). But cross-surface consistency is already breaking before any composition exists — see the units defect in [What verification turned up](#what-verification-turned-up). Gates all **Compose** rows. |

---

## What verification turned up

Net effect of walking the live UI: **the build is further along than the specs
suggest, and the gaps are in different places than expected.** Four rows moved
up (A4, B3, F1 → Smooth; C4 → Rough) and three moved down (C1 → Rough, B2 → worse
Rough, E2 → Missing). The corrections cluster into four findings.

> **Amendment, 2026-07-27.** Finding 2 below was wrong, and the way it was wrong
> is instructive: a local-environment config bug was diagnosed as a missing
> product feature, and got as far as a queued Ask-tier decision on Adam's inbox
> before anyone read the code. C1 is back up. Left in place unedited because the
> failure mode — a filtered aggregate rendering a misconfiguration as an
> ordinary zero — is worth remembering. See
> [chain-scoped-trust-config.md](/docs/dev/chain-scoped-trust-config.md).

1. **The mechanics are consistently better than the connective tissue.** Every
   row that got upgraded was upgraded because a flow turned out to be fully
   built. Every row that got downgraded was downgraded because of a *default*, a
   *placeholder*, or a *missing directory* — not a missing mechanism. The
   engineering is ahead of the productization.

2. **The single widest gap is that the implication graph is off by default (C1).**
   43 implication attestations sit on-chain and a first-time visitor sees "0
   indirect supporters," because trusted statement-connection sources start
   empty and the official attester "is not yet deployed." Tally's entire pitch —
   *"counted alongside everyone who agrees, even in different words"* — evaluates
   to zero on first contact. This also silently caps C2, and it is a
   configuration/deployment problem rather than a design one, which makes it
   unusually cheap for how much it costs.

3. **Identity and discovery are the missing primitive, not money.** D1, D2, and
   D3 are three views of one hole: every human-pointing field in the product is a
   raw `0x...` address. You delegate to an address, you vouch for a project
   address, you trust an attester address. The product sells "hand your giving to
   a friend" while assuming you know your friend's wallet. Fixing D1/D2/D3
   separately would be three fixes for one problem.

4. **The demo dataset only tells one story.** Every seeded cause is
   political-content flavoured. A visitor cannot see A1 (local community thing),
   A5, or E2 working even in principle, because no seeded content resembles them —
   and those are exactly the rows the strategy docs lean on hardest.

The pre-verification conclusions that survived intact: the **Compose** rows still
cluster into one combinator project rather than four features; **F2** still gates
nearly every ordinary-person row; **E2** is still the least glamorous
highest-leverage item, now demoted to Missing.

### Defects found along the way

Not use-case status, but found while verifying and worth fixing. Tracked in
[TODO.md](/TODO.md).

- **Cause-board funding units.** The same project renders as `US$0.7 USDZZZ / US$3.79 USDZZZ`
  on LazyGiving and `0.0000000000007 / 0.00000000000379 ETH` on the Aligning cause
  board — raw token decimals, wrong denomination label. Directly undermines F4.
- **Mojibake in content-channel copy.** The channel page renders
  `âTrusted attestedâ` where curly quotes were intended. There is already a
  `review.copy-encoding` verifier check that this apparently didn't catch.
- **Explore surfaces empty cause boards.** The headline causes on `/explore` have
  zero aligned projects at every trust scope including "Anyone", with no signal on
  the card that the board is empty. The seeded attestations point at different
  statements than the ones Explore promotes.
- **Local IPFS-gateway path can't reach the indexer.** Documented in the callout
  at the top of this file. Worth fixing in `scripts/local-ui-gateway.mjs` (proxy
  `/api/*` to `http://localhost:42069`) so that the eight-domain local entry point
  is actually usable for review — otherwise every future reviewer will see a
  product that looks catastrophically broken and isn't.

### Stale claim in the founder inbox

[inbox.md](/inbox.md) says verifier product checks report *"the Commonality
landing page has placeholder/leaked authoring-note copy and does not clearly state
what the product is."* That is no longer true of the Commonality landing page,
which now opens with "It's time for Internet-age public-goods funding" and a clear
one-line description. The placeholder copy that does exist is on **Civility** —
`/popular-statements` ("These are placeholder statement prompts") and `/filters`
("still evolving"). Worth re-pointing that inbox item.

## Wiring to the verifier

`review.workflow-clarity` (`verifier/checks/review/workflow-clarity.mjs`) is
parameterized by a `targetWorkflow` object (`domain`, `goal`, `surfaceFiles`), so
each row above can become a check with **no new code** — one `.def.json` plus an
input line in `verifier/checks/product/workflows.def.json`.

Today's four instances are domain-scoped (alignment, lazy-giving, content-funding,
common-sense-majority) rather than use-case-scoped. They roughly cover C1, C2, B4,
and parts of D3. Nothing covers the A-column or E-column.

Don't wire all of these. Pick the rows where a regression would actually hurt —
probably E2, B1, and A1 — and add them as the paths get built.

One lesson from this verification pass is worth encoding: the checks should run
against the **Vite dev server with an explicit `VITE_EVENT_CACHE_URL`**, not the
`:8088` IPFS gateway. A reviewer pointed at `:8088` sees empty states everywhere
and would report catastrophic false positives.

## Maintaining this file

- A new use case belongs here **before** it gets a spec, not after.
- When a row's status changes, change it here; this file is the status of record.
- Delete rows that turn out not to matter. A stale inventory is worse than none.
