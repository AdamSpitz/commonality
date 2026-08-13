# Needs attention — Adam's inbox

Note that [TODO.md](/TODO.md) is the project's inbox; use that one for tasks that might be suitable for an LLM to do. This file is Adam's inbox; it's for stuff that needs his attention. AIs can put stuff in here if they want; see [task autonomy tiers](./workflow/task-tiers.md).

When an item from this page is done and no longer needs my attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

Also, don't let any of the items get too long; usually there's a separate .md file somewhere (e.g. in the specs directory) that is a better place to keep the details. This file is meant to be a list of concise to-do items, so that I can look over it and decide what to do next; it's not a long-term home for any of this info.

---

<!-- backlog-reminder -->
> **Standing reminder:** the one-shot backlog lives in [`TODO.md`](/TODO.md).
> When it has accumulated items, consider having an LLM make a processing pass —
> routing each item by its tier (Ask → here; Tell → do it and note it here;
> Trust → just do it). See [`task-tiers.md`](./workflow/task-tiers.md). The
> `meta.backlog-reminder` verifier check guards that this reminder stays present.

## Main list

### Done, for review

- **(Tell, docs only)** Settled the **NoteIntent semantics** that caused the feature to be pulled, and wrote them up in [the delegation UI spec](specs/tech/subsystems/delegation/ui.md#note-intent) with three new root [TODO.md](/TODO.md) items. Design was worked out in a back-and-forth with Codex. Headline: **no inheritance** — a live fungible note counts for a cause when the latest attestation by its root owner, on that exact note ID, names it. Propagation was rejected not on cost but because "nearest ancestor attestation" is genuinely ambiguous after a partial split (the parent ID is at once a live remainder and a historical ancestor), and it buys little, since full delegation and revoke both preserve the note ID so intent survives for free. Two real bugs surfaced and were verified against the contracts: (1) **the revoke fold is wrong in all three cases** (root/middle/leaf) — the contract truncates the chain but `folds.ts` reverses it, so `chain[0]` can report the wrong root; this is a **live bug in the shipped My Notes UI**, independent of NoteIntent, and its test currently locks in the wrong behavior; (2) `getNoteIntentAttestationsByStatement` filters before folding, so a retargeted note still counts for its old cause. Also noted: intent can currently only be retargeted, never cleared (`bytes32(0)` is rejected), which the spec proposes fixing in the still-dormant contract. No code changed.

- **(Tell)** Implemented the core causes-as-publications shift: CauseStarter's reusable retrieval-first picker now searches both the published feed and the trusted Explorer curated map before offering AI drafts, resolves exact immutable text before CID reuse, and preserves rejection/“none fit”/manual correction paths. Visitors can select multiple planks, review their exact text and CIDs outside chat, and sign them via an atomic wallet batch (sequential local-wallet fallback) without endorsing the organizer, narrative, roster, or unselected planks. Existing drafts, roster versions, MutableRefs, optional-anchor behavior, derived views, founder-first boundaries, and no-directory posture remain intact. CauseStarter tests, lint, typecheck, production build, and the fast verifier pass. The implementation plan still tracks intent-specific alignment/belief reuse and full journey/non-expert validation; delegation reuse remains deferred until its semantics settle, so the root TODO stays open.

- **(Tell)** Deployed CauseStarter assistance to testnet. `commonality-cause-assist.onrender.com` is healthy with Grok configured, CauseStarter's runtime config points at it, and browser CORS/preflight plus a real `/atomize` call were verified. The separate durable `commonality-coherence-badge-worker` holds the funded Base Sepolia operator key; the public HTTP service exposes only address `0x39e477B6D9776244849eea9f79FC890ADB25cCbA` and has no chain-write key. The Cloudflare `/cause-assist` route is staged in source, but the available token lacks Workers permission, so testnet uses the stable direct Render URL for now.

- **(Tell)** Moved CauseStarter coherence badge writes into a trusted `RefUpdated` worker. The browser no longer requests minting, cause-assist exposes no chain-write route or hot key, and the worker filters/loads schema-v1 roster tips before reusing the LLM-only bind-and-attest path. Local Compose includes the durable worker; focused tests/typechecks pass.

- **(Tell)** Fixed CauseStarter **coherence badge authorship**: on-chain attester is now the **CauseStarter operator** (cause-assist keypair → `msg.sender`), not the founder. Removed founder-side `attestCoherence` from `publishRoster`. After roster publish the UI calls cause-assist `POST /attest-coherence` (re-judges construction; positive-only write; silence if not coherent / not configured). `/health` surfaces `coherenceAttesterAddress` for viewer trust. Local Compose defaults Hardhat account #9. Wallet generation / setup-env know the new key. Design: docs/founder/shaping-your-cause-statements.md § The coherence badge.

- **(Tell)** Finished CauseStarter **roster follow-ups**: (1) positive-only on-chain coherence badge via `AlignmentAttestations` (subject = roster CID digest, well-known claim/topic; written when preview passed and founder uses Publish; viewers recompute from chain), (2) `PublishedData` publish + `updateRef` (+ optional attest) prefer one EIP-5792 atomic batch with sequential fallback, (3) per-plank "Added later" chips from `getUserRefHistory` + prior roster docs. CauseStarter unit tests + typecheck green.

- **(Ask, done at your request)** CauseStarter **roster as publication**: PublishedData roster document (title, summary, ordered plank CIDs, mediator blurb) + MutableRef `(founder, slug) → CID` stable URL `/cause/:owner/:slug` with `@version` pins, history display, preview-before-publish with peer **Publish** / **Publish anyway**, and a separate cause-assist `/check-coherence` attester (construction-only, own model config). Follow-ups above.

- **(Tell)** Rebuilt the CauseStarter launch wizard around `Issues → Preview → Launch`: rough descriptions feed cause-assist atomization, planks can be edited or sharpened with inline vagueness feedback, and the founder learns the union/two-band intersection views through an interactive preview of his own cause. Main→supporting implication gating is gone. The first plank remains the primary stored CID only as a compatibility detail for existing cause pages; all planks are peers in the wizard. Focused CauseStarter typecheck and tests pass.

- **(Tell)** Removed the NoteIntent-dependent UI: one-time deposits no longer collect intent, note details and cause/statement/leaderboard surfaces no longer display intent-derived earmarked funds, and CauseStarter's earmarked route is gone. The contract plus SDK/indexer primitives remain untouched and dormant. Updated affected tests and UI specs; focused UI tests and the UI build pass.

- **(Tell)** Landed the bridge-creator generalization infrastructure: generic roles/labels with CSM aliases, provisional all-in-one config, a no-opinion scaffold, CORS-enabled live anchor fetching with a bundled CSM fallback, reusable bridge/opt-in blocks, and a CauseStarter per-cause mediator card. Independent review correctly found that cause-assist enrichment and the founder-facing CauseStarter attachment flow are still missing, so the narrowed remainder is back in [TODO.md](/TODO.md); `provisional-v1` still awaits the live CSM rehearsal.

- **(Tell)** Moved the 12 AI worker/core packages out of the repo root into `services/` (root went from 25 directories to 13). Branch `refactor/services-subdir`; mechanical only, package names unchanged. `cause-assist` deliberately stayed in root as a CauseStarter dependency. Validated with typecheck (35/35), all service tests, and real `docker build` runs of the `service-host` and `cause-assist` images. Details and the two bugs found along the way are in the 2026-08-08 [CONTINUITY.md](/CONTINUITY.md) entry. Worth a look before merge since it touches deploy config.

### Security/recoverability human actions

- Replace/scopedown external account tokens: Cloudflare scoped DNS token instead of global key; Render/Pinata scoped as narrowly as possible; OpenRouter spend limit.

### Docs / UI copy

- Decide whether to act on the fresh landing-copy positioning findings. The Civility grievance-first hero was reviewed and is fine; the verifier rubric was corrected so CSM’s recognition-register rule is not imposed on every vertical. Remaining findings are elsewhere: the umbrella Commonality landing still recruits generic end users despite the founder-first strategy, CSM front-loads the mediator toggle and uses “the other side’s bullshit,” Aligning repeats its main tradeoff several times, and Tally’s “Sign once, counted forever” headline presents a future goal as current capability.

### Features that I'm realizing would make a big difference

- Bridge-creator package is done; remaining work (CSM beat-agent stand-up, Civility-agent context source adapter, feeding signing outcomes into anchor reflection, and end-to-end rehearsal) is enumerated in [`bridge-creator-csm-next-steps.md`](workflow/bridge-creator-csm-next-steps.md). Mostly LLM-doable; the rehearsal pass needs your judgment.

- [ ] **(Ask)** Claim links for wallet-less donors: decide hosted vs. self-hosted Linkdrop relay (see [bridges.md](specs/tech/bridges.md#the-one-real-open-decision-hosted-vs-self-hosted-relay) for the full evaluation — Linkdrop SDK V3 is already the settled choice over a custom `TradFiBridgeEscrow`). Needs a small spike to confirm the relay self-hosts cleanly and check the per-claim fee/gas model.

- [ ] **(Adam)** Create the 2-of-3 Safe for the contract-admin role (hardware wallet + phone + offline backup) and record its address in `deployments/operator-addresses.env`. Only remaining human step from the 2026-07-27 governance decision; all the contract/ops work behind it is queued in [security-recoverability.md](workflow/security-recoverability.md#decision-adam-2026-07-27) and blocked on the Safe existing.

### Testing/verification improvements

- **Sponsored gas — human finish:** once the UI transaction wiring in TODO is deployed and a creator tank is funded, sign into the Base Sepolia UI with Privy email OTP and run a first-time contribution and a failed-project refund, so the placeholder production gas caps can be tuned. Needs you because Privy requires an email login. Steps: [sponsored-gas-live-trace.md](workflow/sponsored-gas-live-trace.md).

- Provision/fund the live-testnet verifier wallet (`COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY`) and, once it is safe to spend gas nightly, set `COMMONALITY_VERIFIER_NIGHTLY_ALLOW_TESTNET_MUTATION=1` in the deployment shell so `testnet.onchain-to-indexer` joins the retained deep cadence. Until this is done, `testnet.environment` will remain skipped-by-policy/uncertain for release-candidate claims. See `verifier/PLAN.md` P0/P1 item 1.

### The founder-first pivot ("causelets")

The strategy itself is now written down: [ADR 0005](specs/decisions/0005-founder-first-verticals.md)
freezes the decision and its revisit triggers, and [specs/product/founder-first.md](specs/product/founder-first.md)
is the living spec with the full backlog. What's left here is only the part that needs *your* judgment.

- New site, or potential rename of Commonality: "CauseStarter"? (The ADR deliberately
  froze the strategy and not the brand, so this is still fully open.)
  - In fact, let's make this the main UI.
  - Let's merge in Sam's "ui2" thing - maybe *that* should be the main CauseStarter UI? For now let's just pull in the changes it made to the core stuff, and keep it as "ui2".

- Improve the [pitch for Christians](docs/founder/christian-pitch.md). Come up with other ones along those lines.

- Have an AI generate a bunch of imaginary founders and causes and so on, as a way of pressure-testing the founder-facing model.

### Stuff I want to think through

- Let's figure out how to make clear that the cause page (owned by its founder, and editable) isn't the same as the underlying statements. If a user signs some statements, those statements are the ones that he signed; they're immutable, and even if the cause-founder modifies which statements he shows on his site (which is his right to do - he's the one operating the site, so he needs to have control over which statements it shows, including being able to change his mind later), the user's signature is only on the statements he actually signed, and the cause page itself won't show the user's signature on the cause's new statements (unless the implication attester says it's okay) (or unless the cause site is dishonest).

- Since we switched over to the "we don't operate the cause sites, cause-founders do" model, that means that an unscrupulous cause-founder can make a site that fakes his numbers.

- How to eliminate CauseStarter’s reliance on browser `localStorage` for cause drafts / founder progress (`causestarter/src/lib/causeStore.ts`). Today drafts are origin-scoped (so Vite `:5174` vs Docker `:8090` don’t share them) and vanish across devices/clears. Worth thinking through durable alternatives (on-chain draft, IPFS + pointer, account-linked backend, etc.) without re-centralizing or making launch heavier.

- Asking the cause founder to make statements is going to be a problem because the idea of statements is not obvious. (Need to not be vague or ambiguous, etc.)
  - **(Tell)** Partial pass done: CauseStarter “start a cause” copy reframes main vs supporting statements as signable beliefs with main→supporting implication; cause-assist suggester prompt + new `/check-implications` (Implication Attester system prompt) verify pairs; wizard blocks medium/high non-implies. Still product-sensitive — review wording and whether hard-block is right.

- Now that have (or at least are close to having) a proper testnet setup, can we start creating an ecosystem of simulated fake users of various types? (We can use LLMs to run the ones that need more intelligence, though ideally they'll mostly be made of conventional code, to avoid burning too many LLM tokens.)
  - Cause founder: cares a lot about some cause, comes across CauseStarter, tries actually forking the repo and making a new cause, etc.
  - Donor: cares a lot about various causes, comes across some cause, decides to donate or delegate or whatever
  - Scammer: comes across this site, wants to scam people
  - Delegate
  - etc.

- Have a session on the **financial-screening** side of policy lists, with simplification as the explicit goal — the framing is written up at the end of [financial-screening.md](specs/tech/subsystems/policy-lists/financial-screening.md). It's a deferred, non-normative design candidate; nothing in force depends on it, and v1 guarantees no policy list can affect anyone's money. Short version: the expensive part all descends from money actions needing a **hold** answer, so ask first whether a cruder rule would do.

- How much of a founder's infrastructure should we absorb, if any? Standing up a vertical currently means five plumbing accounts plus a funded wallet, all due *at launch*. **I don't want the easy answer (we just host it)** — it re-centralizes what the founder-first pivot decentralized and makes us the takedown address again; I'd rather reduce the need. A per-item pass suggesting the launch list could shrink toward one GitHub account is in [what-a-founder-needs.md § 3.3](docs/founder/what-a-founder-needs.md#33-open-question-how-much-of-this-should-we-absorb) — progress, not a conclusion. (Caveat: pointers-only made RPC load-bearing for reads, so "no credit card" may not survive.)

- **Storage/chain follow-ons to pointers-only, if and when you want them.** The `ContentResolver` seam means today's calldata recovery can be swapped for a durable store by writing one resolver, so none of this blocks anything. Open threads, all specced: EthStorage as that store ([spikes/ethstorage](spikes/ethstorage/README.md), [the-graph.md § EthStorage](specs/tech/indexer/the-graph.md#candidate-retrieval-layer-ethstorage)); whether Base is still the right chain, since EthStorage isn't on it ([l1-vs-l2.md](specs/tech/l1-vs-l2.md), [cross-chain-notes.md](specs/tech/cross-chain-notes.md), [multi-chain.md](specs/tech/multi-chain.md) — three files that could stand consolidating). Live risk on the current path is **archive availability** (RPC providers retaining old calldata), since pointers-only removed our de-facto Postgres backup.

- How hard would it be to make alternate UIs, or alternate AI services, or whatever? (I don't feel the need for that myself, but Sam wants to try, and in any case I want it to be easy to do.)

- Before adopting CADC as the post-MVP CAD settlement token, do the two remaining Adam-only steps: (1) one real Paytrie→Base→offramp [round trip](spikes/cad-stablecoins/paytrie-round-trip.md) with a small amount, and (2) review/send [spikes/cad-stablecoins/loon-email-draft.md](spikes/cad-stablecoins/loon-email-draft.md) asking Loon about their process for wrongly blacklisted contracts. Everything else in that evaluation is settled — see the [spike README](spikes/cad-stablecoins/README.md).

- Can we think of ways to make the trust-graph thing less onerous, or (probably more importantly) to make it easier for the projects to display their credentials / bona fides in various verifiable ways (so that the system in general is less vulnerable to spam and sabotage)? See [alignment-anti-abuse.md](specs/product/alignment-anti-abuse.md).

- **(Ask) Use cases — one decision left: is A2/A3/A5/A6 one combinator project rather than four features?** The full inventory, with statuses verified against the live UI, is in [use-cases.md](specs/product/use-cases.md); the other three questions from that pass have since resolved themselves. Headline was that the build is further along than the specs suggested. Side note worth acting on: the demo seed is entirely political-content flavoured, so A1/A5/E2 can't be *seen* working even in principle — seeding one local-public-goods cause would make the story demonstrable.

- **Revisit the prospective-round claim/entitlement model — it confused me, which is a bad sign.** Entitlement is the *current* receipt balance while `claimedAmount` is permanent, so an account can have claimed more than it now holds, and burning receipts silently reduces future claims with nothing recording what was given up. The specific questions (snapshot vs. live balance, whether unclaimed capacity survives a burn, per-item vs. per-round claiming) are written up under [materialization.md § Open question](specs/tech/subsystems/content-funding/materialization.md#open-question-is-the-claim-model-too-confusing).

- It's time to switch over to GitHub Issues, now that Sam is creating some.

## Before mainnet

- Decide when to schedule the Hardhat 2→3 migration. It is deferred until after current testnet stabilization, but should be revisited before mainnet and treated as a standalone migration project, not a dependency bump.
