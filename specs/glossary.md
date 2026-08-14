# Glossary — Commonality's ubiquitous language

The canonical vocabulary for this system: one word per concept, one concept per word,
used the same way in specs, code, contracts, and user-facing copy.

Related: [jargon.md](./product/jargon.md) covers which *crypto* words we refuse to use in
UI copy. This file covers what our *own* words mean.

**How to use this file.** Before naming a new type, event, route, or piece of UI copy,
check whether the concept already has a word here. If you need a word that isn't here,
add it here in the same commit. If you find code contradicting this file, the code is
wrong (or this file is out of date and needs an ADR — see
[specs/decisions/](./decisions/README.md)).

---

## Part 1 — Settled terms

### The substrate

| Term | Means | Does *not* mean |
|---|---|---|
| **Statement** | A sentence someone might agree with, stored on IPFS, identified by its CID. The atom of the whole system. | A financial statement; a claim about a project |
| **Implication** | An attested "S1 implies S2" arrow between two statements. Almost always AI-generated. | Logical entailment in a strict sense — it's an attestation, and it's revocable |
| **Cause** | A statement *in its role as a funding anchor* — i.e. a statement that projects can be attested as aligned with. Every cause is a statement; a statement becomes a cause the moment someone funds toward it. | A separate entity with its own ID. `causeCid` and `causeRef` both hold statement CIDs |
| **Conceptspace** | The subsystem holding statements + implications + belief state. The floor of the value stack. | The UI site of the same name (that's a *view* onto it) |
| **Sign / signer** | The user-facing act of asserting agreement with a statement, and the person who did it. A signer signed *this exact statement*. | Anything to do with wallet signing — that's a `walletClient` |
| **Belief state** | The technical tri-state stored per (user, statement): believes / disbelieves / no opinion. `setBelief`, `beliefState`. | Merely "signed" — it can also record active *dis*agreement |
| **Supporter** | The *union* of direct signers and indirect supporters reached through the implication graph. Costs nothing. | Someone who gave money — that's a contributor |

### Money

| Term | Means |
|---|---|
| **Project** | A crowdfunding effort run as an assurance contract. Its assurance-contract address *is* its ID |
| **Assurance contract** | The escrow mechanism underneath a project: funds held until threshold-or-deadline, refunded otherwise. The mechanism; "project" is the thing users see |
| **Contribution** | Money going into a project *before* it succeeds, in exchange for receipts. Refundable if the threshold isn't met |
| **Contributor** | Someone who made a contribution. The one word for the money-giver role pre-success | 
| **Receipt** | The non-transferable ERC-1155 token you get for contributing. Recognition, not equity, not a reward |
| **Retroactive donation** | Money going into a *successful* project's reimbursement flow, after the fact. Buys nothing; it repays early contributors |
| **Reimbursement** | What a retroactive donation pays out to an early contributor — at cost, no upside |
| **Note** | A `DelegatableNote`: a bucket of deposited funds whose spending authority can be delegated down a chain, revocably. The unit of delegated giving |
| **Standing pledge** | A *recurring* funding commitment registered with `RecurringPledges`, executed periodically into a note |
| **Cause board** | The statement-anchored page where a donor sees projects aligned with a cause and decides where money goes |

### Judgments people and services publish

| Term | Means |
|---|---|
| **Attestation** | Any signed, revocable, published judgment. The umbrella word |
| **Alignment attestation** | "This project serves this cause". Called a **vouch** in user-facing copy |
| **Vouch** | The user-facing word for publishing an attestation. What the buttons say | 
| **Success attestation** | "This project actually delivered" |
| **Trust score** | A user's direct trust setting on another user (Subjectiv). Filtering is by *transitive* trust over these |
| **Attester / Finder / Nudger** | The three AI-service verbs. An attester judges a pair; a finder discovers pairs worth judging; a nudger proposes new things to the graph. (A fourth, *follower*/context-provider, is being extracted as `beat-memory`) |

### Structure

| Term | Means |
|---|---|
| **Subsystem** | A capability: a contract family + SDK subsystem + UI feature module sharing one name |
| **Site / UI domain** | A branded build that composes a subset of subsystems. There are eight |

---

## Part 2 — Known drift

Places where the same concept currently wears several names, or one name covers several
concepts. Ranked roughly by how much confusion each causes.

**Adam ruled 2026-08-14** on items 1–4 below (marked **Ruled**). Sweep scope: UI copy,
end-user docs, and SDK/UI identifiers. Contract and event names are unchanged.

### 1. "Support" means two unrelated things — *the worst one*

- In Conceptspace, **support** means *agreeing with a statement*, and costs nothing:
  `DirectSupport` event, `IndirectSupporter`, `getUserIndirectSupport`.
- In LazyGiving and Content Funding, **supporter** means *someone who gave money*:
  "supporters pledge", the default receipt tier is literally named `$25 Supporter`.

These are disjoint meanings in the same product, and a "supporter count" is ambiguous
without knowing which module you're in. **Ruled (2026-08-14):** *support / supporter* means the belief sense only — it's baked
into the onchain event name and it's what Tally's headline numbers are about. Money-side
copy and identifiers now say **contributor**. Swept: `noteSupporterCount` →
`noteContributorCount`, `supporterCount` → `contributorCount`, the default receipt tier
`$25 Supporter` → `$25 Contributor`, and all money-sense UI and end-user-doc copy.

### 2. One act, four names: belief / direct support / signing / endorsement

A user asserting agreement with a statement is called:

- **belief** in the contract and the SDK (`setBelief`, `beliefState`, `foldUserBeliefs`)
- **DirectSupport** in the emitted event
- **signing** in the UI and in `signer-profiles` ("signers", "sign this statement")
- **endorsement** in a handful of UI strings

The SDK even has the comment `signers (believers)`, which is the drift made visible.
`beliefState` genuinely carries information the others don't (believes / disbelieves /
no opinion), so this isn't purely redundant — but three words for the *believes* case is
two too many. **Ruled (2026-08-14):** *sign / signer* is the user-facing word (it's what Tally is
about); *belief state* is the technical name for the tri-state value; *endorsement* is
retired. The onchain `DirectSupport` event name is frozen by
[contract versioning](./tech/contract-versioning.md) and stays as-is.

A useful sub-distinction fell out of the sweep and is now load-bearing: a **signer**
signed *this exact statement*; a **supporter** is the union of direct signers and
indirect supporters reached through the implication graph. So a chip rendering
`believerCount` says "signer", and `SupportMetrics` totals say "supporter". Where copy
said "endorsement" it now says **vouch** — the word the buttons already used.

### 3. "Pledge" means two different things

- In the contracts and SDK, a **pledge** is a *recurring standing order*
  (`RecurringPledges`, `StandingPledgeCreated`).
- In UI copy, "supporters pledge" and "back a project with a refundable pledge" mean a
  *one-off contribution*.

**Ruled (2026-08-14):** *pledge* always means the recurring thing; one-off money is a
**contribution**. Swept in UI copy and in the end-user docs where both senses collided
on the same page. **Deliberately not swept:** the assurance-contract prose in
`docs/end-user/commonality/vision-and-strategy/hard-to-stop/credible-threat.md` and
neighbours, where "pledge" carries the ordinary-English conditional-promise sense
("pledges are binding but refundable") and no recurring sense appears nearby. Rewriting
those to "contribution" would cost more in prose quality than it buys in precision.
Revisit if a recurring-pledge concept ever lands on those pages.

### 4. Six words for "person who gave money"

Current counts in `ui/src`: supporters (118), contributors (95), donors (34), backers
(6), funders (7). Plus `Contribution.participant`, whose doc comment says "Address of
the buyer".

**Ruled (2026-08-14):** **contributor** for someone who funded a project pre-success;
**donor** for someone making a retroactive donation (this distinction is real and worth
keeping). *supporter* (money sense), *backer*, *funder*, *participant*, and *buyer* are
retired as synonyms. `Contribution.participant`, `Refund.participant`, and
`ContributorStats.participant` are now `.contributor`; the raw decoded-event field stays
`participant` because that is the ABI arg name.

### 5. Portal → cause board (already ruled, half-finished)

Adam ruled 2026-06-12: **cause board** wins in user-facing copy; code identifiers,
routes, and directories keep `fundingportal*`. Still unfinished — `/portal/:statementCid`
routes, `ui/src/fundingportals/` copy, and ~22 files under `docs/end-user/` still say
"funding portal". Tracked in [TODO.md](../TODO.md).

### 6. Smaller ones

- **Campaign** — retired 2026-08-14. `campaignHeading`/`createCampaignLabel`/
  `emptyCampaignState` became `contractsHeading`/`createContractLabel`/
  `emptyContractsState`; the SDK doc comments now say "funding round".
- **Marketplace** survives in `Project.marketplaceAddress` after the retroactive-funding
  redesign made receipts non-transferable. Check whether the field still means anything.
- **Earmark** is used ~35 times with no definition anywhere. Either define it here or
  fold it into *contribution to a cause*.
- **Contract directory names** don't match subsystem names: `individual-projects/` holds
  LazyGiving, `statements/` holds Beliefs + Implications (Conceptspace),
  `alignment-attestations/` backs `fundingportals`. Cosmetic, but it breaks the
  four-layer isomorphism the
  [coherence review](../workflow/reviews/conceptual-coherence-2026-06-25.md) identifies
  as this codebase's main legibility property.

---

## Part 3 — Rules of thumb

1. **The onchain event name is frozen.** Events are a versioned public API; renaming one
   means a `V2` event and dual handlers. So when an event name and a better word
   disagree, the *word* wins everywhere above the contract, and the event keeps its name.
2. **User-facing copy is where a rename actually pays.** Identifiers can lag; two words
   in front of a user is a real cost.
3. **A distinction worth a second word must be worth explaining.** Contribution vs.
   retroactive donation earns its keep. Supporter vs. backer does not.
