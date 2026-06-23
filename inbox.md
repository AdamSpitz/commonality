# Needs attention — Adam's inbox

Note that [TODO.md](/TODO.md) is the project's inbox; use that one for tasks that might be suitable for an LLM to do. This file is Adam's inbox; it's for stuff that needs his attention. AIs can put stuff in here if they want; see [task autonomy tiers](./workflow/task-tiers.md).

When an item from this page is done and no longer needs my attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

---

<!-- backlog-reminder -->
> **Standing reminder:** the one-shot backlog lives in [`TODO.md`](/TODO.md).
> When it has accumulated items, consider having an LLM make a processing pass —
> routing each item by its tier (Ask → here; Tell → do it and note it here;
> Trust → just do it). See [`task-tiers.md`](./workflow/task-tiers.md). The
> `meta.backlog-reminder` verifier check guards that this reminder stays present.

---

## Main list

### Tell-tier work completed by AI

- 2026-06-22: Did the **`fundingportals` module** piece of the per-module-public-API TODO item (the next module after `lazy-giving`). Added root `ui/src/fundingportals/index.ts` barrel re-exporting the eager public surface — just the two components that actually cross the module boundary today: `FundingPortalSummary` (rendered on the conceptspace `StatementPage`) and `AlignmentAttestationsSection` (rendered on the lazy-giving `ProjectDetailPage`). The rest of the component surface (`AlignedProjectCard`, `AlignedProjectsList`, `AttestAlignmentForm`, `DelegatableNotesSection`, `SuccessfulProjectsList`/`Tab`, `DiscoverySlider`, …) and all utils are consumed only by fundingportals' own pages/components, so they stay module-internal until a real external caller appears (promote-on-demand, same as lazy-giving's component surface). Rerouted both external eager consumers through the barrel: `conceptspace/pages/StatementPage.tsx` and `lazy-giving/pages/ProjectDetailPage.tsx`. `pages/*` stays as the deep subpath half of the public API — `domains/alignment/manifest.tsx` and `domains/tally/manifest.tsx` still `import('../../fundingportals/pages/…')` directly via dynamic `import()`, so code-split chunks are preserved. Enforced the boundary with a new `no-restricted-imports` block in `ui/eslint.config.js` using the **same regex form** as the other three modules (`(?:\.\./)+fundingportals/(?!pages(?:/|$))`); `src/fundingportals/**` excluded via `ignores`. (No `domains/fundingportals/` directory exists, so the glob form's false-match-on-domains-dir bug #2 wouldn't have bitten here, but the pages-negation bug #1 still would have — kept the regex form for consistency across all four module blocks.) No external `vi.mock` into fundingportals existed, so no test deep-path strings to preserve. Feedback loops green: `npm run typecheck --workspace=ui`, `npm run lint --workspace=ui` (0 errors, 1 pre-existing unrelated warning), and vitest for all touched modules — fundingportals + conceptspace + lazy-giving + the alignment/tally domain wrappers (43 files, 903 tests). TODO item updated; next up is `conceptspace`, then `shared`.

- 2026-06-22: Did the **`lazy-giving` module** piece of the per-module-public-API TODO item (the next module after `content-funding`). Added root `ui/src/lazy-giving/index.ts` barrel re-exporting the eager public surface — the project-status helpers `getProjectStatus`/`STATUS_COLORS`/`STATUS_LABELS`/`formatRelativeDeadline` (+ `ProjectStatus` type) from `utils`, which is what `fundingportals` uses to render aligned-project cards on cause boards. The component surface (`BuyTokensSection`, `ProjectHeader`, `Leaderboard`, …) is deliberately **not** re-exported — those are only consumed by lazy-giving's own pages/landing today, so they stay module-internal until an external consumer actually needs one (that public-vs-internal decision is the real work this module required, per the TODO note). Rerouted every external eager consumer through the barrel: `fundingportals/components/AlignedProjectCard.tsx`, `AlignedProjectsList.tsx`, and the real `getProjectStatus` import in `AlignedProjectCard.test.tsx` (the test's `vi.mock('../../lazy-giving/utils', …)` / `vi.importActual` deep-path strings were left as-is — lint doesn't check those, and they still intercept because the barrel live-re-exports from `./utils`). `pages/*` stays as the deep subpath half of the public API — `domains/lazy-giving/manifest.tsx` and the `domains/content-funding`/`domains/civility` ContentPages wrappers still `import('../../lazy-giving/pages/…')` directly, so code-split chunks are preserved. Enforced the boundary with a new `no-restricted-imports` block in `ui/eslint.config.js` using the **same regex form as `content-funding`** (`(?:\.\./)+lazy-giving/(?!pages(?:/|$))`) — not the `delegation` glob form, for the same two reasons (the `ignore`-backed glob matcher can't re-include children of an excluded `pages/` dir, and `**/lazy-giving/*` would also match the unrelated `src/domains/lazy-giving/` directory); `src/lazy-giving/**` is excluded via `ignores`. Feedback loops green: `npm run typecheck --workspace=ui`, `npm run lint --workspace=ui` (0 errors, 1 pre-existing unrelated warning), and vitest for all touched modules — lazy-giving + fundingportals + the domain wrappers (34 files, 603 tests). TODO item updated; next up is `fundingportals`, then `conceptspace`, then `shared`.

- 2026-06-22: Did the **`content-funding` module** piece of the per-module-public-API TODO item (the next module after `delegation`). Added root `ui/src/content-funding/index.ts` barrel re-exporting the eager public surface only — components `ContentAttestationSummary`/`ContentSubmissionForm`/`ContentFundingProjectSection`, hooks `useClaimFlow`/`useContentFundingState` (+ `ContentAttestationInfo` type), and `channelDisplay` utils `getChannelDisplayLabels`/`ChannelDisplayLabels`/`ChannelDisplayMetadata`. Rerouted every external eager consumer (conceptspace `StatementSupportingContent`/`StatementPage`/`SettingsPage` + test, fundingportals `AlignedProjectCard` + test, lazy-giving `ProjectDetailPage`) through the barrel. `pages/*` stays as the deep subpath half of the public API — the `domains/content-funding/` and `domains/civility/` route wrappers still import page components directly, so code-split chunks are preserved (pages are NOT folded into the eager barrel). Enforced the boundary with a new `no-restricted-imports` block in `ui/eslint.config.js`, but it uses a **`regex` matcher, not the glob `group` form `delegation` uses**, because copying the delegation globs bit me: (1) the `ignore`-backed matcher can't re-include children of an excluded `pages/` dir (gitignore parent-dir rule), so `!**/content-funding/pages/*` silently failed to un-restrict page imports; and (2) `**/content-funding/*` also matched the *unrelated* `src/domains/content-funding/` directory, false-positive-flagging `domains/index.ts`'s `./content-funding/manifest.tsx` import. The regex `(?:\.\./)+content-funding/(?!pages(?:/|$))` requires at least one `../` before `content-funding/` (every real feature-module consumer reaches `src/content-funding` via `../`-relative paths; the domains wrapper is reached via `./content-funding/...`), allows the barrel (no trailing path) and `pages/*`, forbids everything else deep. Note for when `delegation` is next touched: its glob block has the same latent `pages/*` negation bug — it only works because delegation has no external *static* page importers (its page consumers are dynamic `import()` in the manifest, which the rule doesn't check, plus the explicitly-negated `LandingPage`). Consider switching `delegation` to the same regex form then. External test `vi.mock('...content-funding/hooks|components/...')` calls were left on their deep paths (lint doesn't check `vi.mock` strings) and still intercept correctly because the barrel live-re-exports from those same underlying modules. Feedback loops green: `npm run typecheck --workspace=ui`, `npm run lint --workspace=ui` (0 errors, 1 pre-existing unrelated warning), and vitest for all touched modules — content-funding + conceptspace + fundingportals + the domain wrappers (332 + 147 tests). TODO item updated; `lazy-giving` is next.

- 2026-06-22: Did the **anonymized-ID dedupe seam** piece of the unique-human-id TODO item. `getIndirectSupporters` (the Tally indirect-support count path in `sdk/src/subsystems/conceptspace/queries.ts`) now dedupes indirect supporters by anonymized anchor ID — `computeAnonymizedId` + `foldAnonymizedBelieverIds` + `unionAnonymizedBelieverIds` from `sdk/src/subsystems/identity/` — instead of raw address, so an account that signed several equivalent (mutually-implying) statements counts once when their per-statement believer sets are unioned. Today address→anonymized_ID is 1:1, so counts are unchanged; the anonymized-ID key is the seam proof-of-personhood tiers will attach to additively (no re-signing/migration). Behavior preserved: explicit target-disbelievers are excluded (now by anonymized ID), and first-implication-wins for the via-statement. Added two mocha unit tests covering the multi-statement-same-user dedupe and the disbeliever-exclusion path; full SDK mocha suite (338) passes, lint clean, `tsc --noEmit` clean. Remaining on the TODO item: persist a `Map<anonymizedId, ProofTier>` once a proof provider exists, plumb tier-grouped counts to the UI, and render the tiered head-count string.

- 2026-06-22: Did the **discovery-slider** half of the successful-projects TODO item (the last remaining piece). The Successful tab on the cause board now has an explicit three-stop discovery slider ("My network" → "+1 hop" → "Anyone") surfacing the existing `maxHops` trust-traversal knob, per [alignment-anti-abuse.md](specs/product/alignment-anti-abuse.md). "My network" = direct trust only (maxHops 1); "+1 hop" = network + one transitive hop (maxHops 2); "Anyone" drops the trust filter entirely (passes `undefined` for the trusted-attester set and weights, falling back to the flat count-based success confidence). Implementation: new `DiscoverySlider` component + `discoveryLevels` constants, wrapped in a new `SuccessfulProjectsTab` that runs a dedicated `useTrustedSet(address, { maxHops })` call scoped to the tab (independent of the Aligned tab's filter, and only mounted when the tab is active). `maxHops` is plumbed end-to-end: `computeSubjectivTrustedSetResult` → worker request → `computeSubjectivTrustedSet` client → `useTrustedSet`; the IndexedDB cache key now includes `maxHops` (cache version `v2`→`v3`, DB version 1→2 with a stale-record clear on upgrade) so different hop depths don't thrash each other's cached trusted set. The slider is disabled with a visible sign-in hint when the viewer isn't signed in. The Aligned tab is intentionally untouched (it'll mirror this control later as a separate follow-up). Checks: new + updated unit tests across all layers (DiscoverySlider 5, SuccessfulProjectsTab 6, useTrustedSet maxHops forwarding 1, worker client 1, computation 1, cache isolation 1, page tab-switch 1); full `src/fundingportals` + `src/shared` Vitest (423); `npm run typecheck --workspace=ui`; touched-file ESLint clean; `npm run build --workspace=ui`. TODO item marked complete.

- 2026-06-22: Did the trust-graph **weighting** half of the successful-projects TODO item. Cause-board success confidence now scales each vouch by the viewer's transitive trust score for the attester (so a vouch from the core of your network counts more than one from the periphery), keeping the direct>indirect 2:1 prior and staying on the same scale as the old count-based score (fully-trusted attesters reproduce it exactly). Plumbed end-to-end: SDK `calculateSuccessConfidenceScore`/`getSuccessfulProjectsForCause` accept `trustWeights`; `SuccessfulProjectForCause` gains a `successConfidenceBasis` field; the Subjectiv worker now returns per-attester transitive trust *scores* (not just the binary set) through `computeSubjectivTrustedSet` → `useTrustedSet` (new `trustWeights` map) → cause board → `SuccessfulProjectsList`, which passes weights to the SDK and shows a basis-aware confidence tooltip. Falls back to the flat count-based score when no viewer/trust network is available, so logged-out behavior is unchanged. Policy decision 3 honored: `success` scoring is kept separate from `alignment` (separate `success` trust/score names). Checks: SDK test suite (321) + weighted-scoring unit tests, full UI Vitest suite (1721), touched-package lint, and full `npm run build` (19/19). Remaining successful-projects work is the explicit discovery-slider UI control (surfacing the existing `maxHops` knob); updated TODO.md accordingly.

- 2026-06-22: Did the "run/verify the end-to-end UI path with indexed data" piece of the successful-projects TODO item. Added deterministic success-attestation seeding (`publishSeedProjectSuccesses`) to the demo seed: funds 2 seed projects so they have outstanding receipts, then has 3 distinct attesters post `SuccessAttestation` for each anchored to the same cause statement. Verified end-to-end against a live local stack — `getSuccessfulProjectsForCause` (the exact SDK query `SuccessfulProjectsList` calls) returns both projects with metadata, outstanding receipts, success confidence score (6 = 3 direct×2), and 3 attesters each. Lint/typecheck/fake-data-generation tests pass. Remaining successful-projects work (replacing the first-pass direct-vs-indirect score with richer trust-graph weighting) is unchanged.
- 2026-06-21: Continued the TODO.md contract-versioning prep item by making `NoteDetailPage` load note/chain data with the scoped `(noteContract, noteId)` route key; added a regression test and ran UI typecheck.

### Security/recoverability human actions

- Move `ENS_OWNER_PRIVATE_KEY` to cold storage after the operator/service secret bucket split; confirm the offline backup of all operator secrets is current and restorable. (From `workflow/security-recoverability.md`.)
- Add `CONTRACT_ADMIN_ADDRESS` to `deployments/operator-addresses.env` before the next non-local deploy, then run `hardhat/scripts/accept-admin-ownership.js` after deploy using the admin key/hardware wallet. (Currently present locally, but Adam should confirm the chosen admin key is the intended cold/hardware key.)
- Replace/scopedown external account tokens: Cloudflare scoped DNS token instead of global key; Render/Pinata scoped as narrowly as possible; OpenRouter spend limit.
- Enable branch protection (no force-push, no deletion) on `master` and `dev` at both GitHub and GitLab.

### Fixes

- Make sure connecting a wallet actually works. Or if it just doesn't do it for a local deployment, let's make some way to fake connecting a wallet.

- On the real website:
  - Rename to aligning.works
  - Notifications? ("500 people loved your statement! You get a badge!")
  - Civility score? Give people badges. (NFTs? The )
  - Make sure it'll work at scale; we already have a scalability analysis in theory, but we haven't actually tested it at scale.
  - "Traverse every link, build me a traversal graph for the entire site."? (Sam just did this: https://sitemap.stinger-bot.tech/)
  - Check all the language, make sure it's all the same grade level, consistent, etc.
    - Where is this system more confusing, more broken, etc.


### Features that I'm realizing would make a big difference

- (Maybe Sam will do this?) For suggesting possible statements you might want to sign: maybe a UI with sliders? Left/right, inflammatory/noninflammatory, etc. So it's not preachy, it just presents the options.

- Bridge-creator package is done; remaining work (CSM beat-agent stand-up, Civility-agent context source adapter, feeding signing outcomes into anchor reflection, and end-to-end rehearsal) is enumerated in [`bridge-creator-csm-next-steps.md`](workflow/bridge-creator-csm-next-steps.md). Mostly LLM-doable; the rehearsal pass needs your judgment.

- [ ] **(Ask)** Choose a plain fiat on-ramp provider for USDC purchases into the contributor's own embedded wallet (not fiat-to-contract execution): compare Stripe crypto onramp, Coinbase Onramp, MoonPay, Transak vanilla, etc. Confirm Base/USDC support, embedded-wallet address support, country coverage, fees, callbacks, and compliance constraints. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Ask)** Evaluate true bridge-operator and claim-link support separately from the default embedded-wallet path: document how charities/fiscal hosts/governments/licensed vendors can call `buyERC1155`, evaluate Linkdrop or similar for ERC-1155 claim links, and only then decide whether a custom `TradFiBridgeEscrow` contract is worth building. See [docs/end-user/commonality/vision-and-strategy/ease-of-adoption/bridges.md](docs/end-user/commonality/vision-and-strategy/ease-of-adoption/bridges.md).

- [ ] **(Ask)** Evaluate one-step fiat-to-contract vendors as a fallback path (Transak One, Wert, Crossmint): compare whitelisting burden, country coverage, UX control, costs, refund model, and how much custom infra they let us skip. See [specs/tech/bridges.md](specs/tech/bridges.md). (USER: I'm inclined to accept that fiat-to-contract isn't going to be viable because they'll all need us to whitelist and honestly our system is too open-ended for them to do that. Like, I suspect that because our system is usable for any and all kinds of projects, the whitelisting would need to happen at a more fine-grained level than just "all of Commonality". So let's not bother; I suspect the best we can do is make it easy for users to put money into their onchain account, and then calling the contract will be a separate step, though maybe we can smooth that over with good UX.)

- [ ] **(Ask)** Governance/timelock story for the human-held `Ownable` levers — needed before mainnet regardless of versioning. Triage from this session: `ContentRegistry`'s owner is the *factory contract*, not a human (its `Ownable` is protocol-internal access control + a contract-versioning concern, not a trust lever). Two cheap levers are being eliminated outright (set-once `setRecurringPledgeRegistry`, monotonic-lengthen `setVetoWindowDuration` — see TODO.md). That leaves the genuinely-governed surface: the **factory-authorization set** (keep only if we want in-place upgradeability vs. redeploy-for-v2) and **`setVerifier`/`setTrustedVerifier`** on `ChannelRegistry`/`ChannelVerifier`. The verifier lever is irreducible by refactor (it exists for mandatory key rotation), but its long-term *exit* is the trustless-verification trajectory documented in [channel-claiming.md](specs/tech/subsystems/content-funding/channel-claiming.md#the-trust-trajectory-why-we-are-not-stuck-with-a-central-verifier) (ENS/DID → TLSNotary/zkTLS → per-deployment client-chosen trust) — so don't reason about timelocking `setVerifier` in isolation from that path. Decisions still mine: control model (multisig vs. timelock+multisig), delay length, and whether to do M-of-N attesters before mainnet.

### Testing/verification improvements

- Switch from this TODO.md to GitHub issues? At the very least let's have a process for turning one into the other. Add a "post a GitHub issue" button in the UI.

### Documentation

- Improve the second draft of the [pitch for Christians](docs/founder/christian-pitch.md) (I don't love it yet).
  - The idea of the second draft is to focus less on the "let's build a coordination mechanism for cross-denominational stuff" and more on making a Christian-branded entry point for Civility and CSM.
    - Go looking for Bible quotes aligned with Civility and bridge-building: blessed are the peacemakers, let there be no divisions among you, etc. Start with a review of the NT teachings on getting along with the people you disagree with, and that kind of stuff.
    - Commonality is "listen and engage", Christianity is "love them" (which does include telling them hard things that they don't want to hear, etc.).

- (Mostly done, or at least I've made a first pass at them. I still have Commonality and CSM to go through.) Go through each of the eight UI domains manually (just go to http://localhost:8088/ and open each in a new tab). Talk with Opus about each of them; make sure each makes sense to me (fix the copy if it doesn't feel right); make sure each has docs specific to it, make sure those make sense too, make sure each has a clear home in this repo's "docs" directory.

- Take a look at [what-its-better-for.md](docs/end-user/commonality/vision-and-strategy/why-its-better/what-its-better-for.md) and rewrite it a bit - there's something important there but I don't love the writeup.

- Can we make a diagram/infographic to explain the content-funding token system?

- Potential renames:
  - Content Funding -> LazyPatronage?
  - Alignment/Aligning -> LazyCause?

### Stuff I want to think through

- Can we think of ways to make the trust-graph thing less onerous, or (probably more importantly) to make it easier for the projects to display their credentials / bona fides in various verifiable ways (so that the system in general is less vulnerable to spam and sabotage)? See [alignment-anti-abuse.md](specs/product/alignment-anti-abuse.md).

- Let's have a separate session where we try to figure out how to offer a really smooth path for various kinds of use cases:
  - funding a local community thing
  - some org matching donations
  - credible threat to deter defunding
  - tip-jar migration for creators/OSS
  - "movements" that make use of this infrastructure with a particular focus


### Testing

- In the verifier workspace, I want to make sure the various "manual" verifier checks (i.e. the ones that use LLMs) run with a sufficient understanding of the system. That is, the "strongest" (but most expensive) version of an LLM-using check is" get a frontier-intelligence LLM up to speed (i.e. read quite a lot of the docs and specs, including the "founder"-level ones), then tell it to look at one page or use case or aspect or whatever. If we did all the tests that way, then the "test suite" would consist of a big list of many different aspects of the project (broken down along many dimensions: break down each site feature by feature, or look at scalability, or documentation coherence, or robustness, or whatever), and then each item is to be read as "read all the docs to get yourself up to speed with a founder-level understanding of the project, then look at X". Now, that's probably overly expensive (we can probably make at least *some* of those LLM-using checks do their job using a cheaper AI model and less reading of the docs and specs), but it's worth keeping it in mind as the "ideal" in the sense that it'd be like having an army of cofounders running all my tests and examining the project with that kind of high-level understanding. With that in mind... what does our current verifier suite look like, what "gaps" are there, what's running with too-much or too-little understanding or intelligence? How can we organize this verifier suite so that it gives me the confidence I want, without breaking the bank?

### Marketing

> **Framing (see [standing-up-a-vertical.md](docs/founder/standing-up-a-vertical.md)):**
> My role is platform + run Civility/CSM as reference verticals to recruit founders.
> I'm *not* driving direct end-user adoption of the umbrella. So "marketing" splits
> three ways below. Generic umbrella marketing is explicitly **not my job** — it's
> per-vertical and belongs to whoever runs that vertical.

**A. Founder recruiting (my job — the actual product is the platform).**
- Treat the pitch docs as recruiting material: [Christian pitch](docs/founder/christian-pitch.md), [CSM founder docs](docs/founder/csm/). These are examples of vertical positioning *and* recruiting collateral.
- Build a founder-recruiting funnel: where do prospective vertical founders hear about Commonality, and what do they land on? (The [standing-up-a-vertical](docs/founder/standing-up-a-vertical.md) guide is step one of that funnel.)

**B. Vertical GTM for Civility & CSM (my job — but as founder of those two verticals).**
- Work on the [elevator pitch](docs/end-user/common-sense-majority/elevator-pitch.md) for Common Sense Majority.
- Keep working on [memes](specs/product/memes.md).
- Have AI generate some YouTube videos and podcasts and so on — scoped to Civility/CSM, not the umbrella.
- Any org with a big user base of people doing good (Red Cross, etc.) as early users — but pitch them a *vertical* (or as a prospective founder of their own), not "Commonality."
  - They could do branded variations on the sites, or integrate (e.g. with Facebook). (This is really them founding a vertical — see guide.)
- Alpha testing plan: who can we get to use Civility/CSM specifically?

**C. Generic umbrella marketing — NOT my job (deliberately).**
- ~~Put together an overall marketing plan~~ — descoped. The platform doesn't do umbrella marketing; each vertical does its own. Keep this here only as a reminder of the decision.

## Before testnet

See [testnet-prep.md](./testnet-prep.md).

## After MVP

- Read [mvp.md](specs/product/mvp.md) and do the stuff that comes after.
