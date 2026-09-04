# Role-centric UI

**Status:** Direction accepted; Sign/Fund lenses, home inbox grouping, and workspace chrome implemented 2026-09-04.

## Origin notes

- CauseStarter may not be exactly the final iteration of the UI; we're circling closer to something good but we may not be there yet. What does the next iteration look like?
  - The *current* iteration came about from the "founder-first" pivot, where we thought we were going to be aiming to attract cause-founders. Which is still sort-of right.
  - But the "causes" got demoted to "cause boards" (i.e. don't treat them too much like a central hub that everyone's going to keep coming back to, don't treat it too much like "start a cause", feel free to make your own remix). People might come to the site through a cause board, but then they sign some statements and from then on they just see that stuff in their own personalized home page. And our use of the word "cause" got reassigned to what it more properly means - within our system it's a role that the statement is taking, and it's also referring to the real cause out in the real world.
  - One hint: in the current UI it feels like there's an overwhelming complexity of stuff. (On the home page there's fundable projects, statements, suggesters. On a statement page there's *also* pledges, fundable projects, and a leaderboard. Etc.) I wonder whether maybe it'd help to split by *role* more than by *object*? (i.e. Have a Pledging UI that's optimized for finding statements and pledging money, not for browsing projects or whatever. Have a Signing UI that's optimized for making and signing statements, no money stuff. Have a Retroactive Funding UI, and an Early Funding UI, optimized for browsing projects and directing money. Etc.) Or at least to make role-specific UI pages, even if the object-specific ones still exist? (e.g. When you're in the Signing UI and you click on a statement, either it takes you to a Signing-specific statement page, or it just "focuses" the statement in some way without leaving the Signing UI. It *doesn't* take you to a general-purpose statement page that contains a whole Fundable Projects board and so on. You *can* still get there if you want, but the default easy motions keep you within the role you're currently in.)
  - But OTOH isn't that exactly the approach we took when we split into a whole bunch of different UI domains (Tally, LazyGiving, etc.)? And didn't we decide that that was too confusing? Okay, yes, separate UI domains for the basic roles is probably not the right way to split it up - people aren't used to thinking of "this is one system, divided into separate websites". Also, I do think we were on the right track with the cause-first idea: it's not "here's five different sites, go choose which ones you're interested in using and then find your causes on them", it's "here's the site; choose the causes you care about; then there's a bunch of roles you can play within them, choose which roles you're interested in". And then the site has a bunch of different UI pages that are meant to be used by specific roles - not separate UI domains, just "I'm looking at the Scouting page".
  - Okay, let's try that. Make a list of roles, and then we'll talk about how to give each of them a specialized UI.
  - lol, RPG character classes? No, but might be fun to have the main landing page contain a list of the roles, with descriptions of what their job is, or kind of person might want to do each.
    - Yeah, without being cutesy about it, gamification might actually be useful. Show stats on your profile page, maybe give badges for having completed various kinds of tasks, etc.

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

The personal dashboard remains the returning-user home. Occupied home is a compact
cross-role inbox: Fund (fundable-projects teaser), Sign (signed-statement count and
nudges), and Organize (cause boards and a few bookmarked projects). Each section
leads to its specialized workspace; the home page does not perform every job inline.
Contributions needing attention, delegated money, and pending judgments stay later
until those events have a real attention list rather than empty stubs.

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

## Home inbox (second slice)

Occupied CauseStarter home (`/`) groups existing teasers by job instead of stacking
every object list at equal weight:

- **Fund** → `/dashboard` (fundable-projects union; still the hero)
- **Sign** → `/statements` (count + suggesters, not the full statement objects)
- **Organize** → `/causes` (compact cause boards + a short bookmarked-project teaser)

Empty welcome is unchanged. Do not add placeholder sections for jobs that have no
data yet (Direct funds, Evaluate).

## Workspace chrome (third slice)

Give each daily workspace a job label without turning it into a brand:

- `/statements` overline **Sign**
- `/dashboard` overline **Fund**, plus one sentence that this is the signed-statement
  project union
- `/causes` overline **Organize**
- Project detail opened from Fund returns to `/dashboard` (`Back to Fund`), not home
- Empty-home job cards link into those workspaces (Money/Attention → Fund,
  Work → Organize, Wording → Sign)

Still no Direct funds / Evaluate top-level nav. Workspace choice is still
link-driven only (not persisted).

## Later questions

- Whether the workspace choice should persist across sessions or only through links.
- Whether Fund needs visible submodes (Proposed, Promising, Delivered) or filters suffice.
- Which dashboard events deserve attention badges rather than passive sections.
- Whether Direct funds, Evaluate, and Organize earn top-level navigation after Sign/Fund
  is tested with real tasks.
