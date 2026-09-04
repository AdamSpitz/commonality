# Role-centric UI

**Status:** Direction accepted; first Sign/Fund slice implemented 2026-09-04.

Commonality should remain one site with shared cause and personal context, but its
default paths should be organized around the job a person is doing. Object pages
remain available as complete reference views; role-specific workspaces show focused
lenses on those objects.

This is not a return to separate sites such as Tally and LazyGiving. A person chooses
a cause, then moves between jobs without changing brands, accounts, history, or
navigation context.

## Roles and jobs

Role is useful product shorthand, but the UI should usually speak in verbs or jobs.
These are temporary modes, not identities: one person may sign, contribute, scout,
and organize in one session.

| Role | Primary job | Focused surface |
| --- | --- | --- |
| Signer | Express what I believe | Statements, implication context, supporter counts, Sign action |
| Contributor | Help a proposed project reach its threshold | Relevant projects, goal/deadline, contribution terms |
| Scout | Fund promising work early | New work, credibility evidence, scout-funding terms, reimbursement |
| Retroactive donor | Reward work that delivered | Outcomes, success evidence, unreimbursed early contributors |
| Pledger | Commit recurring money toward a cause | Monthly amount, scope, history, pause/cancel controls |
| Delegator | Give spending authority to better judgment | Delegates, scope, track record, reclaim controls |
| Delegate | Direct entrusted money | Available notes, eligible projects, allocation, track record |
| Project creator | Raise money for a piece of work | Project creation and management, progress, contributors |
| Alignment attester | Vouch that a project advances a cause | Statement/project pairing, evidence, trust reach, revocation |
| Success attester | Vouch that a project delivered | Claimed outcome, proof, reputation consequences |
| Cause-board organizer | Publish a useful selection of statements and work | Composition, ordering, bridges, sharing, participation gaps |
| Mediator | Find and publish acceptable common ground | Natural, modified, and bridge causes; signer response |
| Vertical founder | Operate a focused product for a community | Positioning, configuration, policy, services, deployment |
| Creator/channel claimant | Claim an existing content identity | Verification, associated contracts, payout controls |

## Information architecture

Do not present every role as an equal top-level destination. Group daily work into a
small number of workspaces:

1. **Sign** — signer activity and mediator suggestions presented to signers.
2. **Fund** — contribution, scout funding, retroactive donation, and recurring pledges.
3. **Direct funds** — delegation in both directions.
4. **Evaluate** — alignment and success attestations.
5. **Organize** — projects, cause boards, mediation, and channel claims.

Vertical building belongs in a founder area, documentation, or operator console rather
than ordinary daily navigation.

The personal dashboard remains the returning-user home. It should become a compact
cross-role inbox: relevant projects, contributions needing attention, delegated money,
judgments awaiting the user, and things the user organizes. Each section leads to its
specialized workspace; the home page does not perform every job inline.

## Interaction rules

1. **Preserve the current job.** Opening a statement from Sign yields a signing-focused
   statement view. Opening it from Fund yields a funding-focused view.
2. **Keep one canonical object route.** Use a lens in route state or query parameters;
   do not fork data loading and object semantics into parallel page implementations.
3. **Progressively disclose the complete object.** A focused view offers an unobtrusive
   way to see everything, but unrelated facilities are not in the default path.
4. **Preserve cause context.** A cause board is a publication and acquisition surface.
   Its calls to action lead into Sign, Fund, Direct funds, Evaluate, or Organize while
   retaining the selected cause or statement.
5. **Do not turn modes into brands.** Workspaces share navigation, visual language,
   identity, and history.

## First slice: Sign and Fund

Prototype the strongest contrast before expanding the model:

- `/statements` is the Sign workspace. Statement links open `?mode=sign`.
- `/dashboard` is the Fund workspace. Project-oriented links open `?mode=fund`.
- In Sign mode, a statement shows its wording, implication composition, signing action,
  and supporter counts. Money boards and leaderboards are absent.
- In Fund mode, the statement supplies context for aligned projects, funding totals,
  and contributor information. Signing and organizer actions are absent.
- Links between statement operands preserve the active mode.
- A direct legacy statement URL remains the complete view for compatibility and as the
  progressively disclosed reference surface.

### Success signal

The slice succeeds if Sign and Fund each feel materially calmer and a person can follow
several links without unexpectedly changing jobs. If it only adds navigation without
reducing cognitive load, improve progressive disclosure on the existing object page
instead of multiplying workspaces.

## Later questions

- Whether the workspace choice should persist across sessions or only through links.
- Whether Fund needs visible submodes (Proposed, Promising, Delivered) or filters suffice.
- Which dashboard events deserve attention badges rather than passive sections.
- Whether Direct funds, Evaluate, and Organize earn top-level navigation after Sign/Fund
  is tested with real tasks.
