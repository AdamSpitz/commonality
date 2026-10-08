# CauseStarter market brief

**Date:** 2026-08-25  
**Product status:** private local-first web app (nginx + Vite SPA). Not listed publicly. No GitHub repo named causestarter. No public marketing site found. Live app was down at research time; product facts are from last healthy build + source (CauseStarter Monitor).  
**Rule:** no invented TAM or user counts. Every figure below is attributed. Unknowns are marked unknown.

---

## 1. Category

**CauseStarter sits in: wallet-native cause publication — a local-first organizer workbench that publishes a versioned cause as independently signable planks (issue-statements) and enrolls support as wallet/on-chain beliefs or attestations. Funding and media are outbound tool layers, not the home object.**

Hero copy from the product: “Start a cause. Build a Movement. Change the world.”  
Unit of work: a **plank** — one signable issue-statement. A cause is a versioned publication over planks, not one main petition. Identity is a wallet (ConnectKit + wagmi; injected wallets only in this build). No user accounts. Drafts live in localStorage until published. Momentum = Live + Drafts on this device. A cause is reached by its own link; there is no public browse, search, or ranking. Boards and leaderboards attach to a statement CID, not the cause. Assist is LLM (atomize / sharpen / safety-check / coherence), not campaign CRM. Create-new project opens LazyGiving. Named sister apps (internal, not independently verified as public products): Delegation (LazyGiving notes), Content Funding, Civility, Common Sense Majority, Commonality.

### Adjacent categories it is not

| Adjacent category | Why it is not CauseStarter |
|---|---|
| Petition / advocacy marketplace | Those products collect email-list signatures against one ask and rank campaigns in a public feed. CauseStarter has no accounts, no email list, no browse. |
| Cause directory / “act on issues” news app | Those products exist to discover others’ causes. CauseStarter forbids that by design. |
| Campaign CRM / list-building | Action Network-class tools sell email/SMS volume. CauseStarter’s assist is LLM editing of planks. |
| Government e-participation suite | Consul / Decidim are institution-hosted proposal + PB platforms. |
| Crowdfunding as the home object | GoFundMe / Kickstarter *are* the campaign. CauseStarter’s home object is the plank; funding is a later tool. |
| DAO treasury / token voting | Snapshot / Aragon govern existing token communities. CauseStarter publishes beliefs before (or without) a treasury. |

**Name-collision / category-confusion substitutes only** (do not treat as peers): Change.org, Rally Starter, Causes.com / Countable → Actionable, Civic.com (wallet KYC/auth), CommonSense American (not “Common Sense Majority”), and a local-first PWA toolkit also named Civility.

---

## 2. Competitor / substitute map

Verified still operating or explicitly paused as of 2025–2026 sources. Pricing is public list price only.

### A. Signable-statement / attestation / on-chain belief (lead bucket)

**Ethereum Attestation Service (EAS)** — [https://attest.org/](https://attest.org/)  
Open-source infrastructure to sign structured data on-chain or off-chain. Site live in 2026; claims “Open source. Free to Use. Zero API Keys.” Lists voting, proof-of-X, and verifications as use cases. Marketing counters on the homepage (9.5M+ / 450k+) are unlabeled in the fetch and are **not used as metrics here**.  
*Why use instead:* already the civic-attestation primitive; Optimism ships EAS as an OP Stack predeploy.  
*Why not:* it is plumbing, not a cause/plank editor. No versioned cause, no LLM assist, no project handoff.

**Optimism Collective / OP Atlas (EAS civic use)** — [https://docs.optimism.io/governance/eas-attestations](https://docs.optimism.io/governance/eas-attestations)  
Live civic deployment: “signed onchain statements” for Citizenship, project IDs, Retro Funding applications/rewards. Trust comes from the *issuer*, not the statement. Citizen schema UID `0xc356…1bc8a` is on [optimism.easscan.org](https://optimism.easscan.org/schema/view/0xc35634c4ca8a54dce0a2af61a9a9a5a3067398cb3916b133238c4f6ba721bc8a).  
*Why use instead:* a working public pattern for “wallet signs a structured civic claim.”  
*Why not:* issuer-gated (Foundation resolver). Not a permissionless plank publisher.

**Sign Protocol / EthSign** — [https://docs.sign.global/products-sign-ecosystem/ethsign](https://docs.sign.global/products-sign-ecosystem/ethsign) · explorer [https://scan.sign.global/](https://scan.sign.global/)  
Omni-chain attestation + a vertical e-sign app. EthSign issues “Proof of Agreement” attestations. Scan showed attestations dated March 2026. IQ.wiki cites historical user/contract counts; **those counts are not independently re-verified here**.  
*Why use instead:* wallet-sign a document/statement and get an on-chain proof.  
*Why not:* legal-agreement UX, not a multi-plank cause publication.

**EasyAttest** — [https://github.com/stakeados/easy-attest](https://github.com/stakeados/easy-attest)  
No-code EAS schema builder + attestation generator on Base (Next.js, wagmi, OnchainKit). Repo exists; production usage unknown.  
*Why use instead:* closest “just attest this statement from a wallet” DIY.  
*Why not:* no cause versioning, no plank set, no funding handoff.

**Agora (EAS for governance)** — docs describe EAS for delegate verification, proposal creation, off-chain voting.  
*Why use instead:* wallet-signed civic records inside an existing DAO.  
*Why not:* assumes a governor/token community already exists.

**Vow protocol** — [https://github.com/dragon-bot-z/vow-protocol](https://github.com/dragon-bot-z/vow-protocol)  
Stake-backed commitments with soulbound kept/broken reputation. Repo exists; production civic use unknown.  
*Why use instead:* a signable commitment with skin in the game.  
*Why not:* one vow ≠ a versioned cause of many planks.

**Resilient Civic Participation (Ethereum IPTF PoC)** — [https://iptf.ethereum.org/use-cases/resilient-civic-participation/](https://iptf.ethereum.org/use-cases/resilient-civic-participation/) · spec dated 2026-05, status Draft  
ZK petition protocol whose *point* is to **not** produce a signer list. Opposite of CauseStarter’s public wallet attestations.  
*Why use instead:* if the threat model is compelled disclosure.  
*Why not:* it is a privacy petition, not a public plank publication.

**Human Passport (ex Gitcoin Passport)** — [https://passport.human.tech/](https://passport.human.tech/)  
Live 2026. Wallet-scored proof-of-personhood; site claims 2M+ passports, 43M+ credentials, and that Passport has secured $25M+ of public-goods matching pools (vendor claim). Acquired by Holonym / human.tech (announced Feb 2025).  
*Why use instead:* sybil-gate plank support.  
*Why not:* identity layer only; no cause editor.

**Civic Auth** — [https://docs.civic.com/auth](https://docs.civic.com/auth)  
Live wallet-identity / embedded-wallet login (beta). Name collision with “civic.” CauseStarter uses *injected* wallets, not Civic-provisioned ones.  
*Why use instead:* onboard non-wallet organizers.  
*Why not:* different identity bet; current docs say existing self-custodial wallets are not fully supported.

### B. Deliberation + planks / statement tools (lead bucket)

**Polis (pol.is)** — [https://pol.is/home](https://pol.is/home) © 2026  
Open-source “input crowd, output meaning.” Participants submit statements and vote; algorithms surface consensus. CompDem describes Polis 2.0 (LLM moderation, semantic clustering, consensus statements). GitHub: [https://github.com/pol-is/polis](https://github.com/pol-is/polis). Hosted use free for nonprofits/government (project claim).  
*Why use instead:* this is the closest public tool to “AI coalescence of overlapping beliefs.”  
*Why not:* no wallet identity, no versioned cause, no funding layer, no independent signable planks owned by an organizer.

**Kialo / Kialo Edu** — [https://www.kialo.com/](https://www.kialo.com/) · [https://www.kialo-edu.com/](https://www.kialo-edu.com/)  
Live structured pro/con argument trees. Public site free; Edu is free for class use. Wikipedia: active, no ads, no data sale (as of 2023 site claim).  
*Why use instead:* each claim is already an independent statement under a thesis — plank-shaped.  
*Why not:* debate map, not wallet-signed support or a movement publication.

**Consider.it** — [https://consider.it/](https://consider.it/) · pricing [https://consider.it/pricing](https://consider.it/pricing)  
Live. Slider + pro/con list per proposal. Free public/private forums (unlimited). Premium $750 one-time; Enterprise typically $3,500–$12,500. AGPL, Travis Kriplean.  
*Why use instead:* “what the community thinks and why” on discrete proposals.  
*Why not:* hosted forum, accounts, no wallet attestations, no cause-as-publication.

**Loomio** — [https://www.loomio.com/how-it-works/](https://www.loomio.com/how-it-works/) · [https://www.loomio.com/pricing/](https://www.loomio.com/pricing/)  
Live 2026. Discuss → vote with reasons → recorded outcome. Starter $39/mo or $399/yr (≤30 people); Pro $99/mo or $999/yr commercial. Nonprofit discounts. Worker co-op, self-host option.  
*Why use instead:* a group that already exists can decide plank-by-plank.  
*Why not:* membership CRM for a known group, not a link-shared attestation cause.

**Consul Democracy** — [https://consuldemocracy.org/](https://consuldemocracy.org/)  
Live. v2.5.0 released 2026-04-13 (LLM translations). Free/open-source; 250+ cities/orgs (project claim). Proposals, voting, PB, collaborative law. CONSULCON26 set for Sep 2026 Munich.  
*Why use instead:* official multi-proposal civic stack.  
*Why not:* institution-hosted, account-based, public browse.

**Decidim** — [https://decidim.org/](https://decidim.org/)  
Live. Participatory-democracy framework (Barcelona origin). Decidim Fest 2026 (28–30 Oct, Barcelona) is announced. Free/open-source.  
*Why use instead:* full process + assembly + proposal suite.  
*Why not:* same institutional shape as Consul.

**Reddit AMA** — [https://support.reddithelp.com/hc/en-us/articles/115002427523-What-is-an-AMA-and-how-do-I-host-one](https://support.reddithelp.com/hc/en-us/articles/115002427523-What-is-an-AMA-and-how-do-I-host-one)  
Native AMA composer still live (schedule 21 days, co-hosts, RSVP).  
*Why use instead:* cheap public Q&A.  
*Why not:* ephemeral thread, not a versioned plank set.

### C. Wallet-identity civic apps

Covered above: Human Passport, Civic Auth, World ID (referenced by Optimism as PoP for Citizens). These are **gates**, not substitutes for the editor. A CauseStarter network would likely *compose* with them, not compete.

### D. Assurance-contract / quadratic / retro funding (tool-layer substitutes)

**Gitcoin (QF + multi-mechanism)** — [https://gitcoin.co/mechanisms/quadratic-funding](https://gitcoin.co/mechanisms/quadratic-funding) (page dated Feb 13, 2026)  
Live. Gitcoin’s own page: “distributed over $60 million to more than 3,700 projects.” GG24 (Oct 2025) was the first Gitcoin 3.0 round; Gitcoin cites ~$1.8M across six domains ([https://gitcoin.co/case-studies/gg24-first-funding-round-of-gitcoin-3-0](https://gitcoin.co/case-studies/gg24-first-funding-round-of-gitcoin-3-0)).  
*Why use instead:* the default on-chain way to fund a public-goods cause once planks exist.  
*Why not:* funding round, not a plank publisher. Requires sybil resistance and a matching pool.

**Allo Protocol** — [https://gitcoin.co/apps/allo-protocol](https://gitcoin.co/apps/allo-protocol) · [https://docs.allo.gitcoin.co/](https://docs.allo.gitcoin.co/)  
Contracts still deployed; **maintenance mode since May 2025** after Grants Stack wind-down. Forkable. Strategies include QF, direct grants, RFPs, retro.  
*Why use instead:* if CauseStarter later needs an on-chain allocation backend.  
*Why not:* no product UI; not a cause tool.

**Open Collective** — [https://opencollective.com/pricing](https://opencollective.com/pricing)  
Live. Transparent collective finance. New org pricing from March 2026: Discover $0/mo (1 active collective, 10 expenses); Basic $60/mo; Pro $320/mo. Hosted collectives remain free; hosts may charge 4–10% (docs). Steward: OFi Consortium.  
*Why use instead:* legal/fiscal home for a cause that raises fiat.  
*Why not:* money and expenses, not signable planks.

**Optimism Retro Funding** — [https://gov.optimism.io/t/collective-year-4-budget-update-and-year-5-budget-outlook/10796](https://gov.optimism.io/t/collective-year-4-budget-update-and-year-5-budget-outlook/10796) (posted Aug 6, 2026)  
**Paused.** No new rounds after Season 7. Cumulative commitments 81.4M OP; Year 5 forecast Retro Funding = 0 OP. Pause is to re-evaluate.  
*Why use instead:* the named retroactive-funding experiment in CauseStarter’s vision.  
*Why not:* not accepting new civic causes in 2026.

**Hypercerts** — [https://hypercerts.org/](https://hypercerts.org/)  
Live 2026 protocol (AT Proto + planned EAS link). Shared impact claim, not a single funding app. Funding receipts under development.  
*Why use instead:* impact record that funding tools can later attach to.  
*Why not:* no organizer plank editor.

**Dominant assurance contracts** — theory: Tabarrok; Gitcoin explainer [https://gitcoin.co/mechanisms/dominant-assurance-contracts](https://gitcoin.co/mechanisms/dominant-assurance-contracts). **EnsureDone** ([https://ensuredone.com/projects](https://ensuredone.com/projects)) launched 2023–24; listed campaigns are all **closed** (last close 2024-02-07). No 2025–26 campaigns found.  
*Why mention:* CauseStarter’s project layer names assurance contracts / LazyGiving.  
*Why not:* no live public DAC product found in 2026.

**LazyGiving** — **not found as a public product** (web search 2026-08-25). Treat as an internal/unreleased sister app. Do not confuse with “lazy minting” or Lazy-Protocol’s yield vault.

**CrowdJustice** — [https://www.crowdjustice.com/hello/](https://www.crowdjustice.com/hello/)  
Live UK legal crowdfunding. Free to launch; 3% + processing if initial target met (30-day all-or-nothing). Site claims £60m raised, 1.3m backers, 1,800+ pages. Requires a lawyer.  
*Why use instead:* if the cause’s next step is litigation.  
*Why not:* legal fees only.

**GoFundMe / Kickstarter** — donation / rewards crowdfunding. GoFundMe: no platform fee; US processing 2.9% + $0.30 ([https://www.gofundme.com/c/pricing](https://www.gofundme.com/c/pricing)). Kickstarter: all-or-nothing; 5% + Stripe ~3–5% if funded ([https://help.kickstarter.com/hc/en-us/articles/115005047893-Why-is-funding-all-or-nothing](https://help.kickstarter.com/hc/en-us/articles/115005047893-Why-is-funding-all-or-nothing)).  
*Why use instead:* fiat audience already lives there.  
*Why not:* they replace the cause with a fundraiser.

**MetaDAO (Solana futarchy)** — [https://docs.metadao.fi/governance/twaps](https://docs.metadao.fi/governance/twaps) live. Markets decide proposals. META listed on Coinbase (2026 press).  
**Futarchy Labs / futarchy.fi** — GnosisDAO GIP-145 advisory futarchy pilot passed Feb 2026 ([https://forum.gnosis.io/t/gip-145-should-gnosis-dao-run-a-9-month-advisory-futarchy-pilot-with-100k-temporary-liquidity/11816](https://forum.gnosis.io/t/gip-145-should-gnosis-dao-run-a-9-month-advisory-futarchy-pilot-with-100k-temporary-liquidity/11816)).  
*Why use instead:* if the later Commonality vision includes futarchy.  
*Why not:* token-price governance, not plank publication.

**Snapshot** — [https://docs.snapshot.box/](https://docs.snapshot.box/)  
Live gasless off-chain voting for token communities.  
*Why use instead:* cheap “do we support this statement?” vote if a token already exists.  
*Why not:* voting power is tokens, not wallet-signed belief in a plank.

**Aragon OSx** — [https://www.aragon.org/platform](https://www.aragon.org/platform)  
Live on-chain org framework (ethereum.org page updated Jul 30, 2026).  
*Why use instead:* if a cause later needs a treasury + permissions.  
*Why not:* org runtime, not a plank workbench.

### E. Name collisions and category-confusion (not peers)

**Rally Starter** — [https://rallystarter.com/](https://rallystarter.com/) live. Media Cause AI advocacy (petitions, boycotts, Congress contact). Free / Pro $49/mo / Enterprise from $345/mo. Name rhymes with CauseStarter; product is email-list advocacy.

**Causes.com / Causes app** — [https://www.causes.com/about](https://www.causes.com/about) site live (v24.30.0). Play listing still under Countable Corp. Browse-and-act news + donate. Countable.com now redirects to Actionable ($29.99/mo advocacy CRM) per [https://www.countable.com/](https://www.countable.com/).

**Change.org** — [https://www.change.org/](https://www.change.org/) live #1 petition marketplace. Free to start/sign; revenue from petition promotion + monthly membership (funds the platform, not the starter). Wikipedia (May 2026) cites a 583 million user claim — **vendor/wiki figure, not independently audited here.** Homepage also claims “2,000+ created daily” and “500,000+ signatures daily.” The confusion risk is the word *cause*, not the product shape.

**Civic.com** — wallet auth / PoP. Easy to confuse with a “civic cause” app.

**CommonSense American** — [https://www.commonsenseamerican.org/](https://www.commonsenseamerican.org/) live bipartisan issue-brief membership org. **Not** the internal sister name “Common Sense Majority.” No public product under that exact name was found.

**Civility (bpev.me)** — [https://tangled.org/bpev.me/civility](https://tangled.org/bpev.me/civility) local-first PWA toolkit (`@civility/social` = signed comments without an account). Name collision only; not verified as Sam’s sister app.

**Commonality / Adam Spitz** — [gitlab.com/AdamSpitz/commonality](https://gitlab.com/AdamSpitz/commonality) was the noted collaborator repo (may be stale). Public GitHub AdamSpitz is the Self/Klein person, not this product.

---

## 3. First buyer / user

**If CauseStarter stays local-first (current build):** there is no marketplace buyer. The first user is the **organizer** — today, Sam and whoever he can sit next to with a wallet. Job-to-be-done: draft a multi-plank cause on one machine, publish a versioned link, collect wallet signatures on individual planks, then open a project in LazyGiving (when that exists). Deep links replace discovery. The “buyer” is the organizer’s own time; there is no list, no feed, no SEO.

**If it becomes a network:** the first *paying or repeating* user is still an organizer, but one who already has a wallet-using audience (Ethereum public-goods, a Commonality circle, a small DAO, a local group willing to install a wallet). They need a publication + attestation layer *before* Gitcoin / Open Collective / a DAC. Endorsers are not buyers; they are the support graph attached to a CID. Institutions (cities, parties) are a later, worse fit: they will pick Consul/Decidim/Action Network.

Sister apps searched and **not found as public 2026 products:** LazyGiving, Common Sense Majority, Content Funding, Delegation. Treat the network story as internal until those URLs exist.

---

## 4. Positioning and dangerous substitutes

**Positioning (one sentence):**  
CauseStarter is a local-first workbench for organizers to publish a versioned cause as independently signable planks and enroll wallet attestations — not a petition site, not a cause directory, and not a fundraiser.

**Three most dangerous substitutes**

1. **EAS (plus EasyAttest or a custom schema)** — an organizer can already publish a CID and collect wallet attestations with no CauseStarter. This is the “do we even need an app?” threat.  
2. **Polis / Kialo / Consider.it** — they already turn overlapping beliefs into discrete statements. Polis 2.0’s LLM consensus-statement generation collides with Commonality’s “AI coalescence” vision without requiring a wallet.  
3. **Gitcoin / Open Collective / Hypercerts** — organizers who already know the cause skip the plank layer and go straight to money. Allo is dormant but the *behavior* (fund the project, not the statement) is the habit to beat.

---

## 5. Three market questions for Sam

1. **What is a plank signature, exactly?** Public EAS attestation, Sign Protocol, a signed IPFS CID, or a custom contract — and is the wallet address meant to be public? (Resilient Civic Participation exists specifically to hide that list.)
2. **Who is organizer #2, and do they already have an injected wallet?** If not, Civic Auth / embedded wallets contradict the current “injected only, no accounts” build.
3. **What must remain in CauseStarter vs. ship only via sister apps?** If LazyGiving / Commonality / Common Sense Majority stay private, the public substitute for “grow it with funding” is Gitcoin or Open Collective — and that is where organizers will leak.

---

## Competitor table

| Name | Category | Core action | Public/private | Threat to CauseStarter |
|---|---|---|---|---|
| EAS (attest.org) | Attestation infra | Sign/verify structured claims | Public, free OSS | **High** — can implement plank support without CS |
| EasyAttest | No-code EAS | Build schema, attest from wallet | Public repo; usage unknown | High if it gains a statement UX |
| Sign Protocol / EthSign | Attestation + e-sign | Wallet-sign agreements / any data | Public | Medium — statement proof, not a cause |
| Optimism EAS / OP Atlas | Civic attestations | Issuer-gated citizenship & project IDs | Public (gated schemas) | Medium — proves the civic pattern |
| Agora | DAO + EAS | Attest proposals/votes | Public (DAO-scoped) | Low unless a token community is the user |
| Human Passport | Wallet identity | Score unique humanity | Public | Low as product; **compose** for sybil |
| Civic Auth | Wallet identity | Embedded wallet login | Public, beta | Name collision + onboarding fork |
| Polis | Deliberation | Crowd statements → consensus map | Public OSS | **High** — belief coalescence |
| Kialo | Argument map | Pro/con tree of claims | Public, free | **High** — plank-shaped statements |
| Consider.it | Deliberation | Slider + reasons on proposals | Public; free / $750 / enterprise | High for “structure the issues” |
| Loomio | Group decisions | Discuss + vote with reasons | Public SaaS / self-host | Medium for existing groups |
| Consul Democracy | Civic participation | Proposals, votes, PB | Public OSS | Low (institution) |
| Decidim | Civic participation | Processes, assemblies, proposals | Public OSS | Low (institution) |
| Gitcoin QF | Civic funding | Quadratic matching rounds | Public | **High** as funding leapfrog |
| Allo Protocol | Funding infra | Modular on-chain allocation | Public; **maintenance** | Medium if CS later needs a backend |
| Open Collective | Fiscal hosting | Raise/spend transparently | Public; $0–$320/mo orgs | High for fiat causes |
| Optimism RetroPGF | Retro funding | Reward past impact | Public; **paused 2026** | Low now; high as vision analog |
| Hypercerts | Impact claims | Shared record of work + funding | Public protocol | Medium — claim layer without planks |
| EnsureDone | Dominant assurance | Refund-bonus crowdfund | Site up; **campaigns closed** | Low (stale) |
| LazyGiving | Sister funding | Unknown | **Not found public** | n/a until shipped |
| MetaDAO / Futarchy Labs | Futarchy | Markets decide proposals | Public | Low now; vision-adjacent |
| Snapshot | Token voting | Gasless DAO votes | Public | Low — tokens ≠ beliefs |
| Aragon OSx | DAO runtime | On-chain org + treasury | Public | Low |
| CrowdJustice | Legal crowdfund | Fund a lawyer | Public; 3% + processing | Low |
| GoFundMe / Kickstarter | Crowdfunding | Donate / pledge | Public | Category confusion only |
| Change.org | Petition marketplace | Email-list petition | Public | **Confusion only** |
| Rally Starter | Advocacy CRM | Petition + Congress contact | Public; free / $49 / $345+ | **Confusion only** |
| Causes.com / Actionable | Cause directory / CRM | Browse issues / run campaigns | Public | **Confusion only** |
| CommonSense American | Issue-brief membership | Weigh in, brief Congress | Public | Name collision with CSM |
| Resilient Civic Participation | ZK petition PoC | Sign without a roster | Draft PoC | Opposite threat model |
| Reddit AMA | Q&A | Host a thread | Public | Low |

---

## Sources (primary)

- Product frame: CauseStarter Monitor / last healthy build (internal).  
- EAS: https://attest.org/ · https://ethereum.org/developers/tools/ethereum-attestation-service-eas/  
- Optimism attestations: https://docs.optimism.io/governance/eas-attestations · https://docs.optimism.io/governance/attestation-schemas  
- Sign Protocol: https://docs.sign.global/products-sign-ecosystem/ethsign · https://scan.sign.global/  
- EasyAttest: https://github.com/stakeados/easy-attest  
- Human Passport: https://passport.human.tech/ · https://human.tech/blog/from-gitcoin-passport-to-human-passport-we-re-now-part-of-human-tech  
- Civic Auth: https://docs.civic.com/auth  
- Polis: https://pol.is/home · https://github.com/pol-is/polis  
- Kialo: https://www.kialo-edu.com/ · https://en.wikipedia.org/wiki/Kialo  
- Consider.it: https://consider.it/ · https://consider.it/pricing  
- Loomio: https://www.loomio.com/how-it-works/ · https://www.loomio.com/pricing/  
- Consul: https://consuldemocracy.org/ · https://github.com/consuldemocracy/consuldemocracy/releases/tag/2.5.0  
- Decidim: https://decidim.org/ · https://meta.decidim.org/en/processes/news/f/1719/posts/385  
- Gitcoin QF: https://gitcoin.co/mechanisms/quadratic-funding · https://gitcoin.co/case-studies/gg24-first-funding-round-of-gitcoin-3-0  
- Allo: https://gitcoin.co/apps/allo-protocol · https://docs.allo.gitcoin.co/  
- Open Collective: https://opencollective.com/pricing  
- Optimism Retro pause: https://gov.optimism.io/t/collective-year-4-budget-update-and-year-5-budget-outlook/10796  
- Hypercerts: https://hypercerts.org/  
- DAC: https://gitcoin.co/mechanisms/dominant-assurance-contracts · https://ensuredone.com/projects  
- CrowdJustice: https://www.crowdjustice.com/hello/ · https://support.crowdjustice.com/en/articles/11786056-what-are-crowdjustice-s-fees  
- GoFundMe: https://www.gofundme.com/c/pricing  
- Kickstarter: https://help.kickstarter.com/hc/en-us/articles/115005047893-Why-is-funding-all-or-nothing  
- MetaDAO: https://docs.metadao.fi/governance/twaps  
- Futarchy Labs / Gnosis: https://forum.gnosis.io/t/gip-145-should-gnosis-dao-run-a-9-month-advisory-futarchy-pilot-with-100k-temporary-liquidity/11816  
- Snapshot: https://docs.snapshot.box/  
- Aragon: https://www.aragon.org/platform  
- Rally Starter: https://rallystarter.com/  
- Causes: https://www.causes.com/about  
- Change.org: https://www.change.org/ · https://help.change.org/billing-membership/understand-charges-from-changeorg  
- IPTF civic: https://iptf.ethereum.org/use-cases/resilient-civic-participation/  
- Reddit AMA: https://support.reddithelp.com/hc/en-us/articles/115002427523-What-is-an-AMA-and-how-do-I-host-one  

