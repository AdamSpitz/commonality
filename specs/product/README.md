# Product specs

Product-manager-level planning documents. These describe *what* to build and *why*, not *how*.

- **[founder-first.md](founder-first.md)** — The vertical-founder posture: our customer is the founder standing up a vertical, not the end user of the generic sites. Carries the triage rule for all platform work, a map of which doc holds which piece, and the consolidated pivot backlog. Frozen rationale in [ADR 0005](/specs/decisions/0005-founder-first-verticals.md).
- **[Activating a cause](/docs/founder/activating-a-cause.md)** — The founder's adoption playbook: use the cause's existing distribution, recruit money/judgment/trust/execution one role at a time, and let each visible contribution attract the missing roles.
- **[causes-as-publications.md](causes-as-publications.md)** — Accepted target model for AI-assisted cause creation: causes are mutable, shareable publications over immutable statements; organizers and vertical operators are distinct roles; anchors remain optional semantic statements rather than page identities. Frozen rationale: [ADR 0009](../decisions/0009-causes-are-publications-over-statements.md). Implementation work: [plan](causes-as-publications-implementation-plan.md). Copy/weighting of that publication: **[cause-page-not-a-club.md](cause-page-not-a-club.md)** (direction; two-step rename; not a sweep yet). Returning-signer home: **[personal-dashboard.md](personal-dashboard.md)** (derived fundable-projects union; not a roster).
- **[role-centric-ui.md](role-centric-ui.md)** — One site with role-specific workspaces and focused object lenses; includes the accepted Sign/Fund first slice.
- **[how-to-convey-this.md](how-to-convey-this.md)** — Landing/docs conversation log: what the system *is*, the jobs pitch, and later naming of the organizer page.
- **[use-cases.md](use-cases.md)** — The canonical inventory of what people come here to *do*, organized by user goal rather than by subsystem. Each entry carries a status (Smooth / Rough / Missing / Compose / Blocked / Speculative) and its gap. Start here when prioritizing product work.
- **[cause-taxonomy.md](cause-taxonomy.md)** — How a vertical founder populates an empty cause board: the gate (which legacy blocker is this cause hitting?) plus eight facets (subcause, scope, deliverable, posture, time shape, beneficiary, contestedness, publicness) that generate concrete examples. Worked example: the Christian board in [christian-pitch.md](/docs/founder/christian-pitch.md).
- **[mvp.md](mvp.md)** — MVP scope: what's included in the first release, entry-point descriptions, what's deferred.
- **[future.md](future.md)** — Post-MVP planning: features that are specced but intentionally deferred.
- **[content.md](content.md)** — Content bootstrapping: seeding statements, AI-assisted content discovery, solving the empty-field problem.
- **[ai-assistance.md](ai-assistance.md)** — AI skills for helping users navigate the system (implication attester, alignment helper, etc.)
- **[bridge-finder.md](bridge-finder.md)** — A focused finder for hidden-majority patterns (speculative)
- **[statements-are-peculiar-for-good-reasons.md](statements-are-peculiar-for-good-reasons.md)** — Index for why statement wording is verbose/finicky (implication vs nudge vs modified layer). Read this before writing seed statements or bridge clusters.
- **[bridge-creator.md](bridge-creator.md)** — Actively synthesizing common-ground statements and getting them in front of people (speculative)
- **[bridge-building-for-founders.md](bridge-building-for-founders.md)** — Turning the CSM bridge-creator into a building block any cause founder can adopt ("a mediator for your cause"): what's already generic, the four places CSM-ness actually lives, a tiered plan, and why the beat-agent rehearsal gates it.
- **[bridge-causes.md](bridge-causes.md)** — Present a mediator as natural / modified / bridge causes (\(n+1\) publications); human authors can write the cluster without an LLM loop. Does not replace statement-level triples.
- **[bridge-cluster-as-nudger.md](bridge-cluster-as-nudger.md)** — Accepted: users subscribe to a mediator address; triples and cause-clusters are both available to human and LLM authors. Frozen why: [ADR 0012](../decisions/0012-mediator-is-an-address.md). Implementation list is in that file.
- **[currency.md](currency.md)** — Currency design: how value moves through the system.
- **[privacy-slider.md](privacy-slider.md)** — Thoughts about the "sliding scale" of privacy: how much does a user reveal about himself?
- **[new-user-experience.md](new-user-experience.md)** — New-user experience: how exploration and onboarding work, why explorers aren't nudgers.
- **[nudge-ux.md](nudge-ux.md)** — Nudge UX: anti-annoyance design, surface area budgets, user controls, filtering strategy.
- **[ui-domains.md](ui-domains.md)** — UI domain architecture: why the system is deployed as eight separate sites and what each one is for.
- **[localism-movement.md](localism-movement.md)** — The "shift power away from big government" angle: functionality gap and whether it warrants a new UI domain (speculative).
- **[composability.md](composability.md)** — What composing assurance contracts makes possible (credible threats, milestones, federation, retro funding, matching) and why it's mostly recombination of existing primitives.
- **[matching-funds.md](matching-funds.md)** — "We'll put up half if you raise the other half": who matching funds is for, positioning vs. quadratic funding, what to build (fixed gap-fill works today; proportional matching deferred), and whether it deserves its own entry point.
- **[recurring-pledges.md](recurring-pledges.md)** — Standing-order pledges ($X/month to a cause, delegated): the intent-vs-execution split, the commitment spectrum, and why the hands-off auto-pull is the baseline.
- **[lean-on-ai.md](lean-on-ai.md)** — Thoughts about the proper usage of LLMs in a system like this.
- **[alignment-anti-abuse.md](alignment-anti-abuse.md)** — Project-side credentials and trust-graph ergonomics: ideas for making Aligning less vulnerable to spam and sabotage.
- **[successful-projects.md](successful-projects.md)** — Highlighting projects that have *already delivered* value aligned with a cause (not just intend to): a trust-graph "success attestation" type and a Successful tab on the cause board, feeding retroactive funding.
- **[proof-of-progress.md](proof-of-progress.md)** — A low-key way for projects to show ongoing progress and host discussion: why it's deliberately not trustless (retroactive funding absorbs the trust problem), a first-class updates/links field, and embedding an off-the-shelf default rather than building a forum.
- **[foolproof-project-creation.md](foolproof-project-creation.md)** — Making project creation easy and as-foolproof-as-possible for non-crypto-native creators: a layered recipient picker (send-to-me default → saved contact list → ENS/test-tx → embedded-wallet claim) and the donation-first reframe behind it.
- **[ux.md](./ux.md)**
- **[legal/](legal/README.md)** — Legal-risk analysis, one file per risk area (securities, operator posture, money transmission, sanctions, content/speech, political funding, and smaller items).
- **[ui-operator-posture.md](./ui-operator-posture.md)** — Let's rethink (for legal reasons) the question of which UIs we operate and which ones we don't.
