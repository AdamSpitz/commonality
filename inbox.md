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

## Main list

### Privy+Pimlico spike — items 1–3 PASS; human-only follow-ups remain (2026-07-10)

An LLM ran the Privy+Pimlico embedded-wallet spike (TODO item 2) end-to-end and
confirmed the three machine-verifiable items live on Base Sepolia (details in
[`CONTINUITY.md`](/CONTINUITY.md), commit `3b188229`). The load-bearing finding:
the live Kernel account emits **ERC-7579 `execute(bytes32,bytes)`**, not the
Kernel v2 shape the paymaster decoder assumed — `CreatorGasTank` was retargeted.

**Remaining spike items need *you* (a browser + judgment), not an LLM:**
- **Item 4 — Privy key export.** Export the embedded wallet's private key from the
  Privy UI against a real account and confirm it controls the same signer
  (anti-lock-in / pre-mainnet gate).
- **Item 5 — login/recovery modal UX.** Judge whether the email-OTP → wallet →
  contribute flow holds the walletless framing with no seed-phrase / "connect a
  wallet" language leaking through. Note any wording that breaks it.
- **MAU / gas-sponsorship economics** sanity check before mainnet (rough Privy MAU
  + Pimlico per-donor gas cost vs. the `sponsored-gas.md` assumptions). This part
  is partly LLM-researchable (pricing pages) but the go/no-go call is yours.

Once those are done, clear the remaining `[confirm in spike]`/PASS-FAIL rows in
[`spikes/privy-pimlico/README.md`](/spikes/privy-pimlico/README.md),
[`bridges.md`](/specs/tech/bridges.md), and delete TODO item 2.

**Local cleanup for you:** a Vite dev server is still running on `localhost:8088`,
and `tmp/` holds prior-session spike artifacts (`privy-contribute-spike.har`/`.log`)
that may contain Pimlico/CDP API keys — do not commit them; delete when done.


### Security/recoverability human actions

- Replace/scopedown external account tokens: Cloudflare scoped DNS token instead of global key; Render/Pinata scoped as narrowly as possible; OpenRouter spend limit.
- Enable branch protection (no force-push, no deletion) on `master` and `dev` at both GitHub and GitLab.

### Fixes

- Make sure connecting a wallet actually works. Or if it just doesn't do it for a local deployment, let's make some way to fake connecting a wallet.

- On the real website:
  - Rename to aligning.works
  - "Traverse every link, build me a traversal graph for the entire site."? (Sam just did this: https://sitemap.stinger-bot.tech/)


### Features that I'm realizing would make a big difference

- (Maybe Sam will do this?) For suggesting possible statements you might want to sign: maybe a UI with sliders? Left/right, inflammatory/noninflammatory, etc. So it's not preachy, it just presents the options.

- Decide whether to prioritize a product/demo polish pass on the Commonality front door. Verifier product checks currently say the Commonality landing page has placeholder/leaked authoring-note copy and does not clearly state what the product is.

- Decide whether to prioritize a LazyGiving donor-page de-crypto pass. Verifier product checks currently say the donation page reads too crypto-heavy for ordinary donors (secondary market, buy/sell, burn tokens, raw addresses, IPFS/on-chain language, wallet-gated give CTA).

- Bridge-creator package is done; remaining work (CSM beat-agent stand-up, Civility-agent context source adapter, feeding signing outcomes into anchor reflection, and end-to-end rehearsal) is enumerated in [`bridge-creator-csm-next-steps.md`](workflow/bridge-creator-csm-next-steps.md). Mostly LLM-doable; the rehearsal pass needs your judgment.

- [ ] **(Ask)** Claim links for wallet-less donors: decide hosted vs. self-hosted Linkdrop relay (see [bridges.md](specs/tech/bridges.md#the-one-real-open-decision-hosted-vs-self-hosted-relay) for the full evaluation — Linkdrop SDK V3 is already the settled choice over a custom `TradFiBridgeEscrow`). Needs a small spike to confirm the relay self-hosts cleanly and check the per-claim fee/gas model.

- [ ] **(Ask)** Decide governance for the genuinely-governed `Ownable` levers (factory-authorization set, `setVerifier`/`setTrustedVerifier`) — needed before mainnet. Triage already done, see [security-recoverability.md](workflow/security-recoverability.md#governancetimelock-triage-for-the-human-held-ownable-levers). Decisions still mine: control model (multisig vs. timelock+multisig), delay length, and whether to do M-of-N attesters before mainnet.

### Testing/verification improvements

- [ ] **(Ask)** Review the new `review.viability` "cofounder-eye" verifier check (prototype) and decide its fate. It's the first of an intended set of **strategic/altitude** reflection leaves — briefs itself to founder level from the vision/MVP docs, then judges from first principles whether the *built* system plausibly adds up to the goal (are core use cases wired end-to-end, does it compose into a compelling MVP), not just "do tests pass." Files: `verifier/checks/review/viability.{def.json,mjs}`. It's **milestone-aware**: each finding declares the lowest `milestone.json` rung by which the gap must be fixed, so "not MVP-viable yet" stays advisory-yellow at `ordinary-development` but turns the check red once `current` advances to the rung it fails — the gating-level idea you remembered. Currently a **manual-trigger, standing advisory** leaf, NOT yet wired under any facet/`root`. To do: (1) run it for real (`verifier-run review.viability` — costs LLM tokens) and see if you like the judgment; (2) decide whether it hangs under a new `facet.strategy` sibling to the four concern facets, or stays a standalone advisory leaf, and confirm the milestone-relative gating is what you want at `root`; (3) reconcile naming — the ladder rungs are verification-thoroughness levels (`ordinary-development/release-candidate/full-launch`), not product milestones like "MVP", so decide whether you want an explicit MVP rung; (4) decide how the set gets wired. **All four siblings are now drafted on branch `feat/viability-verifier-check`**, each a manual-trigger standing-advisory exploration leaf sharing the milestone-aware gating: `review.viability` (holistic "does it add up?"), `review.use-case-completeness` (per-MVP-use-case end-to-end tracing), `review.scalability` (grounds against `specs/tech/scalability.md`), and `review.simplicity` ("what's grown too complicated to justify its value"). Only `review.viability` has been run for real so far. Remaining decisions: run the other three live to sanity-check their judgment; decide standalone-advisory vs. a new `facet.strategy` under `root`; apply the staleness-gating tweak; and reconcile ladder-rung vs. product-milestone naming. See `verifier/DESIGN.md` "army of cofounders" for the pattern.

- Provision/fund the live-testnet verifier wallet (`COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY`) and, once it is safe to spend gas nightly, set `COMMONALITY_VERIFIER_NIGHTLY_ALLOW_TESTNET_MUTATION=1` in the deployment shell so `testnet.onchain-to-indexer` joins the retained deep cadence. Until this is done, `testnet.environment` will remain skipped-by-policy/uncertain for release-candidate claims. See `verifier/PLAN.md` P0/P1 item 1.

- Wire the verifier heartbeat watchdog to a real pager/webhook. Today `heartbeat-check.sh` only appends alerts to `verifier/logs/heartbeat.log`, so a dead scheduler is invisible unless someone reads the file. Needs your call on the destination (email/SMS/Slack/etc.). See `verifier/README.md` "Harness setup".

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

- See [here](./verifier-checks-need-founder-level-understanding.md).

### Marketing

See [marketing](/specs/product/marketing.md).

## Before testnet

See [testnet-prep.md](./testnet-prep.md).

## After MVP

- Read [mvp.md](specs/product/mvp.md) and do the stuff that comes after.
