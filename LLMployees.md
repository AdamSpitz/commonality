# LLMployees


## Setup for any validation run

Before any of the per-role runs below:
  - Get a fresh, fully-seeded local stack as described in [workflow/local-development.md](workflow/local-development.md). Then let all the role runs share that setup; don't rebuild the world per role.
  - Inside [`workflow/reviews/`](workflow/reviews/), make a subdirectory to contain the reviews for this particular validation run.
  - Inside that subdirectory, create a `checklist.md` file containing a checklist of all the roles to be run.

To do a run:
  - Start a *fresh* LLM (serially or in parallel? I guess we could try parallel and see if that causes problems) for each of the roles described below. Each one should create a report in a new file in the subdirectory; make the filename contain a timestamp and a description of which role. When it's done, check it off in `checklist.md`.
  - When they're all done, the QA lead role (the last role described in this file) creates a report that summarizes all the other reports.

## The roles

The validation work is mostly general-purpose software-testing work, so each role below is just "use skill X with this scope." When a role exists as a skill, use it; only the scope and the target need to be project-specific.

Every validation role is *adversarial by default*: try to break the thing, look for edge cases, don't rubber-stamp. The `thorough-tester` skill is the reminder of what that posture looks like.

### Per-domain validation (×8)

For each of the [eight UI domains](specs/product/ui-domains.md) — Commonality, LazyGiving, Alignment, Tally, Content Funding, Civility, CSM, Conceptspace — run:

  - `thorough-tester` scoped to that domain: come up with a test plan *without looking at existing tests*, then diff against the actual test suite and report gaps. That is, this task isn't to actually test the system directly; it's to think about how to use conventional automated tests to test the system, then use those thoughts to create a report on how to improve the actual suite of automated tests.
  - `intelligent-tester` + `real-ui-user` scoped to that domain. Drive the site as a user, exercise the actions listed in the domain's "Key ideas to make salient" entry, report bugs and confusion.
  - Cross-link check: every link out of the site (to other domains, to docs) resolves and lands where intended.

For the *movement* sites (Commonality, CSM — and to some extent Civility), the lens shifts from "does the button work" to "is this compelling, does it land." Run those wearing the `cofounder` hat (founder-level docs in [workflow/roles/founder.md](workflow/roles/founder.md)) rather than the developer hat — ask whether the landing matches the "Key ideas to make salient" wording and whether a target-audience reader would keep scrolling.

### End-user persona simulator

`real-ui-user` + the [end-user role doc](workflow/roles/end-user.md) + a chosen persona. Start cold from the landing page and try to accomplish a concrete goal. Personas worth running:

  - Crypto-native person who wants to fund a project
  - Civic-engagement person who's never touched a wallet
  - Content creator wondering if they can get funded here
  - Founder type evaluating "could I build a vertical on this?"
  - Skeptic from the political opposite of CSM's framing
  - First-time visitor with no context at all

Stop-and-report when stuck rather than pushing through with insider knowledge.

### Newcomer / cold-start tester

`demanding-newcomer` is the dev-side version (does the project doc itself get a fresh LLM up to speed?). We probably also want a user-side equivalent: a fresh LLM with only the *published* sites and end-user docs to work from — "user sees the link on Twitter and clicks it." Same skill, different reading list (end-user docs only, no internal specs).

### Documentation auditor

`documenter`. Checks per domain and project-wide: getting-started for end users, findable/explained settings (trusted attesters & nudgers), API docs for developer-facing surfaces (Conceptspace especially), README per AI service in [ai-assistance.md](specs/product/ai-assistance.md), discoverable [trust model](docs/end-user/common-sense-majority/trust-model.md), stale docs flagged.

### Layer-2 AI-service validator

For each service in [ai-assistance.md §Layer 2](specs/product/ai-assistance.md) — attesters, finders, nudgers, explorers, platform/context services, beat agents — run `intelligent-tester` + `thorough-tester` against it: does it start and stay up, does it produce sensible outputs on a curated test corpus, are its on-chain/IPFS publications well-formed and discoverable by the SDK, does the trust-config flow let a user swap it out, what happens downstream when it produces garbage.

Risk to watch: if the validator and the service are both LLMs they may share blind spots. The adversarial posture is the main mitigation; if it starts feeling like rubber-stamping, escalate.

### Layer-3 AI-skill validator

For each user-facing skill in [ai-assistance.md §Layer 3](specs/product/ai-assistance.md) (we may not actually have any of these yet), load it into a fresh assistant and try to use it. `intelligent-tester` scoped to "does this skill actually help an end user, does it point at the right docs, does it produce something actionable."

### Cross-domain integration tester

`intelligent-tester` scoped to the cross-cutting flows:

  - LazyGiving contract anchors against a Conceptspace statement → shows up in Alignment portals filtered by that statement.
  - Sign a statement on Tally → implication-graph nudger suggests a related one → signing that one feeds support counts elsewhere.
  - Content contract on Content Funding → content attester evaluates → `AlignmentAttestation` visible from Civility.
  - CSM bridge-creator publishes a new statement → it appears on Tally → signing it feeds movement counts on CSM.

### Smart-contract security reviewer

Use the built-in `/security-review` slash command against the on-chain code (`hardhat/`, `attester-core` onchain bits, assurance contracts, ERC-1155 token logic). Reentrancy, access control, math, upgradeability, gas griefing, frontrunning, refund correctness.

### Demo dry-runner

`cofounder` hat. Walk through a coherent end-to-end demo as if presenting to an outsider: "here's the problem, here's our approach, here's the thing working." If the dry-runner can't construct a coherent narrative against the live sites, the project isn't ready to show. This is the role that forces the system to be legible *as a whole* — the per-domain testers won't catch this.

### QA lead (meta)

`project-wide-reviewer`. Makes sure everything in `checklist.md` is checked off. Reads the individual reports landing in the big subdirectory we're using for all the reviews for this run, decides what's been adequately covered, and produces a high-level summary (oriented around the main question: "are we ready to launch?"). This is the role I actually talk to as the founder.
