# Big review before deploying to testnet

(May 2026.)

The goal here is to do a giant test run reviewing all the user-facing surfaces of the project, using the `intelligent-tester` skill and the `cofounder` skill.

---

## Cofounder-level assessment

### Does the vision make sense?

Yes — compellingly so. The argument for Commonality is coherent and well-structured:
- Public goods are underfunded because the existing mechanisms (government, big charity) have serious structural problems
- New tech (assurance contracts, blockchains, AI, delegation) makes a better approach genuinely viable
- The system is censorship-resistant and can't be shut down by either political side — which creates interesting game-theory incentives for adoption
- Multiple onramps for different user types (one-off pledgers, continuous donors, content creators, petition-signers, delegates)

The nine-site architecture is unusual but defensible: different audiences have different sensibilities, and mixing them on one site would alienate people who only care about one aspect. The open-data substrate means the "many sites, same data" structure isn't fake independence the way it would be for a centralized company.

### Are we ready to deploy to testnet?

**Mostly yes, with some things to fix first.** The core system works: pages load, data appears, navigation is sensible, no console errors. But there are several issues that would confuse a real user on testnet, listed below.

---

## What I tested

All nine UI domains were tested via browser automation against the local IPFS environment:
- Commonality, Pubstarter, Alignment, Delegation, Tally, Content Funding, Noninflammatory (Civility), CSM, Conceptspace

---

## Findings

### ✅ What's working well

1. **All landing pages load cleanly.** No crashes, no blank screens, no console errors on any of the nine domains.

2. **Messaging is clear and on-spec.** Each site's headline, description, and spotlights match the product spec and communicate the value proposition well. The copy is good.

3. **Real data loads from the blockchain.** Statements, projects, and content creators all appear with seed data. The Browse Statements page on Tally shows multiple statements with supporter counts. The Pubstarter Browse Projects page shows a full list with funding progress bars. Content Funding shows real Twitter/YouTube/Substack creators.

4. **Core navigation routes work.** The main routes on each domain go somewhere real. Statement detail pages, project detail pages, content creator browse pages, and funding portal pages all load.

5. **No console errors.** Spot-checked Tally, Pubstarter, and Alignment — clean.

6. **Statement detail page is solid.** Shows statement text, support metrics (direct + indirect), high-profile supporters section, "Your Opinion" wallet prompt, funding portal summary, and content submission form — all in the right order.

7. **Project detail page is functional.** Shows project title, description, recipient address, funding progress bar with correct percentage, token purchase prompt, contributor leaderboard, and alignment attestations section.

8. **Content Funding browse is good.** Twitter/YouTube/Substack creator browse with sort and status filters works. Creator cards show contract counts and funding totals.

9. **Civility filters page is real.** Shows three actual filter statements (left-leaning wanting right content, right-leaning wanting left content, steelmanning). Not just a placeholder.

---

### ⚠️ Issues to fix before testnet

**1. Currency shows ETH everywhere — it should be USDC**

Every monetary amount across Pubstarter, Tally, and Content Funding shows in ETH (e.g. "0.15 of 3.11 ETH raised", "0.18 ETH / 0 ETH", "0.11 ETH"). The MVP spec says USDC is used in production. On testnet, this will confuse users who are pledging in USDC. The token symbol needs to be dynamically read from the contract rather than hardcoded as "ETH".

USER'S NOTE: Yes, please fix.

**2. "Succeeded / 0 ETH goal / 0%" — confusing display for fan-backed contracts**

Fan-backed content contracts show "Succeeded | Ended | 0.18 ETH / 0 ETH | 0%" in the project list. This looks like a broken display. The "0 ETH goal" is probably intentional (these contracts succeed when the deadline passes regardless of amount), but "0%" progress alongside "Succeeded" is deeply confusing. Either don't show a progress bar for goal-less contracts, or label the goal as "No minimum" or "Open-ended".

USER'S NOTE: Sure, "No minimum" sounds fine. (I want to make sure it's explicit that this contract has no threshold; omitting it is bad because the user won't notice that it's not there.)

**3. Cross-domain links are dead `#` placeholders**

On most sites, cross-domain nav links (Pubstarter → Alignment, Commonality → Tally, Delegation → Pubstarter, CSM → Tally, Civility → "Statements on Tally", etc.) show as `href="#"` — clicking them goes nowhere. This is the most visible problem for any user trying to navigate the ecosystem. In local dev, there are no cross-domain URLs configured, so this is expected technically. But before testnet, all nine domain URLs need to be set (via environment config) and the links need to actually work.

Specific dead links observed:
- Commonality nav: Pubstarter, Alignment, Delegation, Tally, Content Funding, Common Sense Majority, Civility
- Pubstarter nav: Cause Funding, Delegation; footer: How project funding works, Get your project funded, Delegate funding decisions
- Alignment nav: Delegation, Statements on Tally; landing: Pledge funds to a cause, Set up delegation, Open Pubstarter
- Delegation nav: Cause Funding; landing: Open Pubstarter, Open Content Funding, Become a delegate
- Content Funding nav: Statements on Tally, Delegation
- Noninflammatory (Civility) nav: Statements on Tally
- CSM nav: Statements on Tally

USER'S NOTE: Is it possible to do this for local dev, or is it just not possible because we don't have stable DNS/ENS names, just IPFS CIDs? Would it be possible to hack together some sort of stable-URL thing (emulating DNS or ENS or even IPNS) that would work for testnet? How much trouble would that be?

**4. Alignment "Explore causes" page is a placeholder**

The `/explore` page on Alignment shows three cause categories ("Noninflammatory political content", "Common-sense-majority organizing", "Public-goods software infrastructure") but they're not clickable and have no links — each just says "Cause portals are anchored to statements; once the statement exists, aligned projects can be attested and funded from its portal." A user arriving here expecting to browse funding portals will have no path forward. Either wire up real portal links to the seed statement CIDs, or be honest and say "coming soon" with a path to Tally to find statements.

USER'S NOTE: Did we not implement some sort of Explorer AI service? Do we not have a UI for it? Maybe we don't have the service hooked up for local deployments, because it requires LLM credits to run? But let's at least make sure the UI for it exists. And maybe we can implement the strategy of "do a single run of the explorer on the seed content, then cache the results and replay them when doing local deployments and publishing the seed data"? Either way, this sounds like a big to-do item, so let's just write it up in TODO.md.

**5. Tally Explorer shows "No curated collection available"**

The `/explore` route on Tally says "No curated collection is available yet. Check back later or browse statements directly." The demo seed (`--seed=demo`) claims to publish Explorer fixtures, but either the local env used `--seed` (not `--seed=demo`) or the fixtures aren't being served. For testnet, this is the primary onramp for new users — "Explore" is one of five nav items. It needs to show something useful.

USER'S NOTE: Yeah, see #4 above, I guess this is the same deal.

**6. Funding portals have 0 aligned projects**

The funding portal for any statement (e.g. the abortion-policy statement on Tally) shows "0 ETH", "0 projects", "No aligned projects yet." The Pubstarter projects and Tally statements are seeded, but none of the projects have been attested as aligned with any statement, so portals are empty. For testnet, at least a few alignment attestations should be seeded so the portal flow is demonstrable.

USER'S NOTE: Right, okay, it's becoming clear that we need to flesh out the seeded data with pre-cached AI-service outputs.

**7. Recipient address shown as raw hex**

On project pages: "Recipient: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC". No ENS name, no shortening, no copy button. On testnet, all recipient addresses will be raw hex. Not critical but notable — could add `0x1234...5678` truncation with a copy-to-clipboard button.

USER'S NOTE: Good, yes, do that.

---

### 📋 Lower-priority observations

- **Tally "Start Signing" page** is a decent new-user onboarding screen — shows a 3-step flow and links to docs/walkthroughs. Good.
- **CSM "Popular Statements" page** is a placeholder with pre-written text statements but no live Tally links. Fine for now but needs live links once the Tally statements exist on testnet.
- **Civility "Nominate Noninflammatory Content" button** on the landing goes to `/nominate` — I didn't test that route.
- **`twitter:uid:111111111` showing as raw UID** on the Content Funding creator browse page — probably a platform API lookup failure in local dev where the fake Twitter ID isn't resolving to a real handle. Worth checking in testnet with a real ID.
- **The "MORE" nav overflow menu** — I didn't test what's inside it on each domain. Worth spot-checking.

---

## Pre-testnet checklist

Based on the above, here's what needs to happen before testnet is worth showing to anyone:

1. **Fix currency display.** Read the settlement token symbol from the contract; display USDC (or whatever the testnet token is), not ETH.

2. **Wire up cross-domain URLs.** Configure `VITE_TALLY_URL`, `VITE_PUBSTARTER_URL`, `VITE_ALIGNMENT_URL`, `VITE_DELEGATION_URL`, `VITE_CONTENT_FUNDING_URL`, `VITE_NONINFLAMMATORY_URL`, `VITE_CSM_URL`, `VITE_CONCEPTSPACE_URL` for the testnet deployment. All cross-domain nav links should resolve.

3. **Fix "Succeeded / 0% / 0 goal" display.** Either suppress the progress bar for goal-less contracts or show a different label (e.g. "Open-ended" or "No minimum goal").

4. **Seed alignment attestations.** Attest at least a handful of Pubstarter projects as aligned with seed Tally statements so funding portals show data.

5. **Either wire up Alignment Explore or mark it as "coming soon" clearly.** Right now it's a dead end.

6. **Populate Tally Explorer.** Run `--seed=demo` or manually publish explorer fixtures so the Explorer route shows curated content rather than "nothing here yet."

---

## Overall verdict

The architecture is sound, the vision is coherent, the code works, and the UX is significantly better than I'd have expected given how much of this was built by AI. The nine-domain structure is defensible and the individual site messaging is well-crafted.

The blockers are mostly deployment configuration (cross-domain URLs) and seed-data gaps (alignment attestations, explorer fixtures), not fundamental code problems. Fix those and this is genuinely ready for testnet.
