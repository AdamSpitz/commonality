# LLMployees

If this project were being run as a startup company and I was the founder, I'd have employees - not just to implement the code (which is the main thing I've been using LLMs for), but also to test it and reassure me that the thing actually works. (Automated tests are fine and good and we've got lots of those, but the founder would still insist on humans actually using the software and thinking it through and so on.)

I don't want to hire any real human employees; I want to use LLMs instead. (Not necessarily running as long-running autonomous agents; I doubt that's necessary. I just mean: defining the "employees'" roles and using LLMs to carry out those roles.)

If you were the founder of this project, what kinds of roles would you want to see filled by intelligent employees, such that if they came to you and said "yup, the project works, it's doing what it's supposed to do", you'd be satisfied with that and you'd feel confident in going to the world and saying "come see this project, it's ready to be used"?

## Distinction from the existing roles

The [workflow/roles/](workflow/roles/) directory already has roles (founder, PM, tech lead, developer, end-user-docs writer, end user). Those are *documentation-reading* roles - "given this kind of task, here's what an LLM should read." LLMployees is the complement: *validation* roles - "given this finished thing, here's what an LLM should check, try, or report on." Some LLMployees will reuse the existing role guides as their reading list; the difference is that an LLMployee has a deliverable ("the X site's funding flow works end-to-end and here are screenshots / logs / a bug list") rather than just a posture.

(USER: I dunno, doesn't seem that different to me - the normal "do some work on the project" roles also have deliverables. But I just added something to workflow/roles/README.md to mention that validation roles should basically just use the normal docs for that kind of thing, just with their Validation hat on.)

## The roles

### Per-domain QA tester (×8)

One per [UI domain](specs/product/ui-domains.md): Commonality, Pubstarter, Alignment, Tally, Content Funding, Civility, CSM, Conceptspace. For each:

  - Conventional automated e2e tests that smoke-test all the functionality. Does every CTA on the landing page lead somewhere sensible? Does every action (create a project, pledge, sign a statement, attest, configure trust, etc.) actually work against a real local stack?
  - Conventional automated unit tests that cover the individual subcomponents more thoroughly.
  - WITHOUT looking at what tests already exist, come up with a comprehensive test plan for the domain, THEN diff against the actual tests and report gaps.
  - Manual exercise: actually drive the site (via [`real-ui-user`](.claude/skills/real-ui-user) or similar) and report what's confusing, broken, or missing.
  - Cross-link integrity: every link from this site to another site (or to docs) resolves and lands on the right place.

Deliverable per domain: a "domain readiness report" - automated coverage summary, gap list, manual-exercise log, and a thumbs-up/thumbs-down with reasons.

### Landing-page critic (×8)

Per UI domain, does the landing page actually match the "Key ideas to make salient" section in [ui-domains.md](specs/product/ui-domains.md)? Title, description, spotlights, sections, actions - all present, in the right wording (the doc is authoritative for now), linking to the right places? Is it visually compelling? Would a target-audience reader keep scrolling?

Separate from the QA tester because the QA tester is asking "does it work" and the critic is asking "does it land."

### End-user persona simulator

The [end-user role doc](workflow/roles/end-user.md) plus a chosen persona. Try to accomplish a concrete goal as that persona, starting cold from the relevant landing page. Personas worth running:

  - Crypto-native person who wants to fund a project
  - Civic-engagement person who's never touched a wallet
  - Content creator wondering if they can get funded here
  - Founder type evaluating "could I build a vertical on this?"
  - Skeptic from the political opposite of CSM's framing
  - First-time visitor with no context at all

Deliverable: a narrated walkthrough of what they tried, where they got stuck, what they didn't understand, what made them want to leave. Stop-and-report when stuck rather than pushing through with insider knowledge.

### Documentation auditor

For each UI domain and for the project as a whole:

  - Is there a getting-started doc aimed at end users?
  - Are user-configurable settings (trusted attesters/nudgers, etc.) findable and explained?
  - Is there API documentation for the developer-facing surfaces (Conceptspace especially)?
  - For each AI service in [ai-assistance.md](specs/product/ai-assistance.md), is there a README that explains what it does, how to run it, and how to trust/distrust it?
  - Is the [trust model](docs/common-sense-majority/vision-and-strategy/trust-model.md) actually explained somewhere a user would find it?
  - Are stale docs flagged or pruned?

### Layer-2 AI-service validator

For each service in [ai-assistance.md §Layer 2](specs/product/ai-assistance.md) - attesters, finders, nudgers, explorers, platform/context services, beat agents - check:

  - Does the service start and stay up against the local stack?
  - Does it produce sensible outputs on a curated test corpus? (e.g. implication attester: a set of S1/S2 pairs with known correct answers.)
  - Are its on-chain / IPFS publications well-formed and discoverable by the SDK?
  - Does the trust-configuration flow actually let a user swap it out?
  - Failure-mode check: when it produces garbage, what happens downstream?

### Layer-3 AI-skill validator

For each user-facing AI skill in [ai-assistance.md §Layer 3](specs/product/ai-assistance.md) (onboarding, delegation advisor, funding strategy, project creation, analytics, trust configuration) - load it into a fresh assistant and try to use it. Does it actually help? Does it point at the right docs? Does it produce something the user could act on?

### Cross-domain integration tester

The domains are independent landings but the substrate is shared. Test the cross-cutting flows:

  - Pubstarter contract anchors against a Conceptspace statement → shows up in Alignment portals filtered by that statement.
  - Sign a statement on Tally → implication-graph nudger suggests a related one → signing that one also shows up in support counts elsewhere.
  - Content contract on Content Funding → content attester evaluates → AlignmentAttestation visible from Civility.
  - CSM bridge-creator publishes a new statement → it appears on Tally → signing it feeds movement counts on CSM.

Deliverable: a list of cross-domain happy paths, each with a pass/fail and screenshots.

### Adversarial / skeptic tester

Try to break it. Edge cases, weird inputs, race conditions, double-pledging, refund logic, attester collisions, conflicting attestations, trust-list misconfiguration, nudger spam, finder abuse, platform-API misidentification, etc. Not just "does the happy path work" but "what happens when someone is hostile or careless?"

### Smart-contract security reviewer

A targeted review of the on-chain code (hardhat/, attester-core onchain bits, assurance contracts, ERC-1155 token logic). Reentrancy, access control, math, upgradeability, gas griefing, frontrunning, refund correctness. Distinct from the adversarial tester because it requires reading Solidity carefully rather than driving the UI.

### Newcomer / cold-start tester

Fresh-context LLM, no project memory, only the published docs and the live sites. Try to figure out what this is and what to do. Where do they end up? What do they get wrong? This is the closest analogue to "user sees the link on Twitter and clicks it."

The [`demanding-newcomer`](.claude/skills/demanding-newcomer) skill is the existing version of this for the dev side; we want the equivalent for the user side.

### Demo dry-runner

Walk through a coherent end-to-end demo as if presenting to an outsider: "here's the problem, here's our approach, here's the thing working." If the dry-runner can't construct a coherent narrative with the live sites, the project isn't ready to show.

Useful because it forces the system to be legible *as a whole* - a thing the per-domain testers won't catch.

### QA lead (meta)

Coordinates the others. Decides what's been adequately covered, what's still outstanding, and produces the single "are we ready to launch" answer. Reads all the individual reports and either signs off or sends specific things back. This is the role I'd actually talk to as the founder; the others feed into it.

## Operating model

  - **Not long-running agents.** Each role is a prompt + a reading list + a deliverable format. Run it when I want a fresh report; don't try to keep state across sessions beyond what the deliverables capture.
  - **Reports land in `workflow/reviews/`** alongside the existing review docs, dated and signed by role. The QA lead's summary is the index.
  - **Reading lists piggyback on existing role docs** where possible (e.g. domain QA tester reads what the end-user role reads, plus the relevant subsystem specs). Avoid duplicating doc trees.
  - **Each role has a "what would satisfy me" definition** so the LLM knows when to stop. Without that, they either give up early or over-produce.
  - **Don't trust a single role's thumbs-up.** Cross-domain tester + per-domain QA + persona simulator together is much more convincing than any one of them alone.

## Open questions

  - Should each role be a Claude Code skill (loaded with `/<name>`) or a standalone prompt template?
    - USER: Probably a skill? Look back over the stuff above describing each role: how much of that is specific to this project, versus how much is general-purpose software-development understanding? If it's the latter, it should be a skill (see ~/Projects/ai-stuff; that's where I keep my general-purpose skills, it's symlinked to be Claude Code skills directory). Don't bother writing up elaborate descriptions of each role; the latest LLMs are already very well-trained in how to do this stuff, so a few concise reminders are generally enough to help it understand its role. Let's try to slim down *this* file by extracting various skills (which may already exist - check my ai-stuff repo, don't create duplicates) so that this file is more like a list of lines saying "use skill X on UI domain Y".
  - How much should roles share fixtures (test users, seeded chain state, IPFS content)? Probably a lot - rebuilding the world per role is wasteful. (USER: yes, for e2e testing it's probably best to just run something like "scripts/stop-wipe-restart.sh && scripts/data.sh --seed=demo --use-hardhat-accounts" (see workflow/local-development.md, it should be documented there) at the start of the whole big test run and then let all the individual roles run against that setup.)
  - Who watches the AI-service validator? If the validator and the service are both LLMs with similar blind spots, we may rubber-stamp things. Maybe one role specifically tries to disagree with another. (USER: beats me, sounds good. Let's just make sure the validation roles are being explicitly instructed to be clever testers who look for ways to break the thing and try to be thorough and so on. I dunno.)
  - Do the movement sites (Commonality, CSM) need a different evaluation lens than the product sites? "Is this compelling" matters more than "does this button work." (USER: yes, I'd say that the difference is something like "are you thinking of yourself in the `founder` role or the `developer` role?")
