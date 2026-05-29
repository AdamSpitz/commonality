# LLM-driven "manual" validation plan

Not conventional automated tests, but "point an LLM at the system because we need something with
intelligence to judge it, and we're too cheap to hire humans." This is the project-specific roster
of validation roles.

Think of these as the employees a founder would hire to convince themselves the product is ready.
If they all came back and said "yup, it works, it does what it's supposed to," the founder would
feel confident telling the world "come see this."

## How to run a validation pass

The **generic machinery** for running a multi-role validation pass is in the
`big-test-plan-designer` skill — read it first. Briefly:

  - Stand up a fresh, fully-seeded local stack once (see
    [workflow/local-development.md](/workflow/local-development.md);
    `./scripts/data.sh --seed=demo` gives the richer demo corpus) and share it across read-only
    roles. **Mutating roles need isolation** (separate seeded worlds or snapshot/restore) — a role
    that creates/funds/signs things pollutes the world for every role after it.
  - Make a per-pass subdirectory under [`workflow/reviews/`](/workflow/reviews/) with a
    `checklist.md` listing every role to run.
  - Run a *fresh* LLM per role; each writes a report to its own timestamped file in that
    subdirectory; check it off in `checklist.md`.
  - Every role is **adversarial by default** — try to break it, don't rubber-stamp. The
    `thorough-tester` skill is the reminder of that posture. If a pass starts to *feel* like
    rubber-stamping (everything green, no real attempts to break things), treat that as a red flag
    and escalate — especially since validator and validated are both LLMs and can share blind spots.
  - Each report must make its rigor legible: evidence of having actually tried to break it; the
    highest-severity issue found ("none found" should look suspicious if everything was easy); where
    the tester gave the benefit of the doubt or used insider knowledge; and a confidence level
    (low/medium/high) with reasoning.
  - The **QA-lead role runs last** and synthesizes all reports into the single "are we ready to
    launch?" answer.

Most roles are just "use skill X with this scope" — the scope and target are what's
project-specific. For each role below, the named **failure modes** are what it must explicitly
investigate; "run the generic tester against component X" produces shallow coverage.

## The roles

### Per-domain validation (×8)

For each of the [eight UI domains](/specs/product/ui-domains.md) — Commonality, LazyGiving,
Alignment, Tally, Content Funding, Civility, CSM, Conceptspace — run:

  - **`thorough-tester` scoped to the domain.** Design a test plan *without looking at existing
    tests*, then diff against the actual suite and report gaps. This produces a report on how to
    improve the *automated* suite; it doesn't test the system directly.
  - **`intelligent-tester` + `real-ui-user` scoped to the domain.** Drive the site as a user,
    exercise the actions in the domain's "Key ideas to make salient" entry, report bugs and
    confusion.
  - **Cross-link check.** Every link out of the site (to other domains, to docs) resolves and lands
    where intended.

For the **movement sites** (Commonality, CSM — and to some extent Civility) the lens shifts from
"does the button work" to "is this compelling, does it land." Run those wearing the `cofounder` hat
([founder docs](/workflow/roles/founder.md)) rather than the developer hat: does the landing match
the "Key ideas to make salient" wording, and would a target-audience reader keep scrolling?

**Failure modes to hunt:** broken/misdirected cross-links; copy that contradicts the product
boundary in [ui-domains.md](/specs/product/ui-domains.md); a movement landing that wouldn't survive
a skeptic's first scroll; actions listed as salient that are actually hard or broken in the UI.

### End-user persona simulator

`real-ui-user` + the [end-user role doc](/workflow/roles/end-user.md) + a chosen persona. Start
cold from the landing page and try to accomplish a concrete goal. **Stop and report when stuck**
rather than pushing through with insider knowledge — the stuck point *is* the finding.

Personas worth running:
  - Crypto-native person who wants to fund a project.
  - Civic-engagement person who's never touched a wallet.
  - Content creator wondering if they can get funded here.
  - Founder type evaluating "could I build a vertical on this?"
  - Skeptic from the political opposite of CSM's framing.
  - First-time visitor with no context at all.

### Newcomer / cold-start tester

Two variants:
  - **Dev-side:** `demanding-newcomer` — does the project documentation get a fresh LLM up to speed
    and running the stack from the docs alone?
  - **User-side:** same skill, different reading list (published sites + end-user docs only, no
    internal specs) — "user sees the link on Twitter and clicks it."

**Failure modes to hunt:** onboarding copy that assumes insider knowledge; a setup step that
silently fails; the first few minutes leaving the user unsure what to do next. When stuck, stop and
report.

### Documentation auditor

`documenter`. Checks per-domain and project-wide: getting-started for end users; findable/explained
settings (trusted attesters & nudgers); API docs for developer-facing surfaces (Conceptspace
especially); a README per AI service in [ai-assistance.md](/specs/product/ai-assistance.md); a
discoverable [trust model](/docs/end-user/csm/trust-model.md); stale docs flagged.

### Layer-2 AI-service validator

For each service in [ai-assistance.md §Layer 2](/specs/product/ai-assistance.md) — implication and
content attesters, implication and content finders, implication-graph and bridge-creator nudgers,
explorer curator, beat agent, platform API service — run `intelligent-tester` + `thorough-tester`:
does it start and stay up; does it produce sensible outputs on a curated test corpus; are its
on-chain/IPFS publications well-formed and discoverable by the SDK; does the trust-config flow let
a user swap it out; what happens downstream when it produces garbage?

**Failure modes to hunt (per the spec's own breakdown):**
  - **Attesters** — misleading attestations that corrupt shared support counts / the implication
    graph; prompt injection into the claim being judged.
  - **Finders** — wasting attester budget; flooding the queue (but remember the attester, not the
    finder, is the trust boundary).
  - **Nudgers** — annoying or *manipulative* suggestions; does "run it yourself locally" actually
    work?
  - **Platform/context services** — corrupting canonical identity mapping; distorted context
    poisoning a downstream evaluator.
  - **Cross-cutting** — long-term data integrity (re-orgs, indexer drift) and
    self-consistency-across-restarts.

Risk: validator and service are both LLMs and may share blind spots. The adversarial posture is the
main mitigation; if it feels like rubber-stamping, escalate.

### Layer-3 AI-skill validator

For each user-facing skill in [ai-assistance.md §Layer 3](/specs/product/ai-assistance.md)
(onboarding, delegation advisor, funding-strategy advisor, project-creation assistant,
analytics/insights, attester/nudger trust config — we may not have any built yet), load it into a
fresh assistant and try to use it. `intelligent-tester` scoped to "does this skill actually help an
end user, does it point at the right docs, does it produce something actionable?"

### Cross-domain integration tester

`intelligent-tester` scoped to the cross-cutting flows:
  - LazyGiving contract anchors against a Conceptspace statement → shows up in Alignment portals
    filtered by that statement.
  - Sign a statement on Tally → implication-graph nudger suggests a related one → signing that one
    feeds support counts elsewhere.
  - Content contract on Content Funding → content attester evaluates → `AlignmentAttestation`
    visible from Civility.
  - CSM bridge-creator publishes a new statement → it appears on Tally → signing it feeds movement
    counts on CSM.

### Smart-contract security reviewer

Run the built-in `/security-review` slash command against the on-chain code (`hardhat/`,
`attester-core` on-chain bits, assurance contracts, ERC-1155 token logic). Cover reentrancy, access
control, math, upgradeability, gas griefing, frontrunning, refund correctness. (See the existing
[smart-contract audit](/workflow/reviews/smart-contract-audit-2026-05-07.md) for prior findings.)

### Demo dry-runner

`cofounder` hat. Walk a coherent end-to-end demo as if presenting to an outsider: "here's the
problem, here's our approach, here's the thing working." If you can't construct a coherent narrative
against the live sites, the project isn't ready to show — regardless of how many component tests
pass. This is the role that forces the system to be legible *as a whole*; the per-domain testers
won't catch this. Run it adversarially, as a skeptic, not a friendly demo.

### QA lead (meta) — runs last

`project-wide-reviewer`. Confirm everything in `checklist.md` is checked off. Read all the
individual reports, decide what's been adequately covered, and produce the high-level summary
oriented around the founder's question: **"are we ready to launch?"** This is the report the founder
actually reads.
