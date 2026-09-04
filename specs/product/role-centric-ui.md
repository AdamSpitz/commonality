# Role-centric UI

**Status:** Direction accepted. Sign/Fund lenses and workspace chrome were implemented
2026-09-04. The home role launcher, Donate workspace (including a first donor-attributed
allocation/receipt feed), and device-local explicit personal funding-board configuration
supersede the earlier home inbox grouping.

## Original rambling motivation for this

- CauseStarter may not be exactly the final iteration of the UI; we're circling closer to something good but we may not be there yet. What does the next iteration look like?
  - The *current* iteration came about from the "founder-first" pivot, where we thought we were going to be aiming to attract cause-founders. Which is still sort-of right.
  - But the "causes" got demoted to "cause boards" (i.e. don't treat them too much like a central hub that everyone's going to keep coming back to, don't treat it too much like "start a cause", feel free to make your own remix). People might come to the site through a cause board, but then they sign some statements and from then on they just see that stuff in their own personalized home page. And our use of the word "cause" got reassigned to what it more properly means - within our system it's a role that the statement is taking, and it's also referring to the real cause out in the real world.
  - One hint: in the current UI it feels like there's an overwhelming complexity of stuff. (On the home page there's fundable projects, statements, suggesters. On a statement page there's *also* pledges, fundable projects, and a leaderboard. Etc.) I wonder whether maybe it'd help to split by *role* more than by *object*? (i.e. Have a Pledging UI that's optimized for finding statements and pledging money, not for browsing projects or whatever. Have a Signing UI that's optimized for making and signing statements, no money stuff. Have a Retroactive Funding UI, and an Early Funding UI, optimized for browsing projects and directing money. Etc.) Or at least to make role-specific UI pages, even if the object-specific ones still exist? (e.g. When you're in the Signing UI and you click on a statement, either it takes you to a Signing-specific statement page, or it just "focuses" the statement in some way without leaving the Signing UI. It *doesn't* take you to a general-purpose statement page that contains a whole Fundable Projects board and so on. You *can* still get there if you want, but the default easy motions keep you within the role you're currently in.)
  - But OTOH isn't that exactly the approach we took when we split into a whole bunch of different UI domains (Tally, LazyGiving, etc.)? And didn't we decide that that was too confusing? Okay, yes, separate UI domains for the basic roles is probably not the right way to split it up - people aren't used to thinking of "this is one system, divided into separate websites". Also, I do think we were on the right track with the cause-first idea: it's not "here's five different sites, go choose which ones you're interested in using and then find your causes on them", it's "here's the site; choose the causes you care about; then there's a bunch of roles you can play within them, choose which roles you're interested in". And then the site has a bunch of different UI pages that are meant to be used by specific roles - not separate UI domains, just "I'm looking at the Scouting page".
  - Okay, let's try that. Make a list of roles, and then we'll talk about how to give each of them a specialized UI.
  - lol, RPG character classes? No, but might be fun to have the main landing page contain a list of the roles, with descriptions of what their job is, or kind of person might want to do each.
    - Yeah, without being cutesy about it, gamification might actually be useful. Show stats on your profile page, maybe give badges for having completed various kinds of tasks, etc.

## A second ramble

We want all the different role-specific pages; once a user has navigated into one, it should be fairly streamlined, optimized for that role. But the home page kinda needs to be for all the roles.

Okay, so maybe make the home page more streamlined, in a different way? Streamline it by making it a fairly simple list of "cards" (or whatever), one for each role. Each one can (if empty) show a short blurb describing what the user can do there, or (if the user has already performed some activity in that role) show a short summary of what the user has done or could do next.

I feel like I need more specifics. Lemme think through various roles.
  - Sign:
    - There are multiple different reasons for signing statements, which is maybe a problem that we should fix.
      - Maybe the user is the kind of person who just wants to sign things and maybe build bridges or whatever (creating new statements worth signing, exploring possible alliances, etc.), rather than doing anything money-related.
      - But also, signing statements is (currently) used in determining what statements show up on your Fundable Projects board. So maybe the user is signing statements for the purpose of going over to the Fund role and doing that.
        - Maybe the thing to do here is to let the user explicitly specify the statements he wants to use for his personal Fundable Projects board? (We've already just recently shifted over to this notion that the board itself needs to be more explicitly defined as a thing of its own, e.g. with a geographic filter. So it feels natural now to say that the board should be an explicitly-defined thing with its own parameters, rather than "use whatever statements the user has signed over in the Signing role.)
  - Donate:
    - I would really like to have a role for "I just want to pledge some money and then forget about it."
    - Most prominent should be "here's how much money I'm recurringly pledging per month, earmarked for which cause, delegated to whom."
    - Then "here's how much of my money is actively in the system right now in the form of delegatable notes (with earmark and delegate and a "revoke delegation" button for each)."
    - Then down below that should be a list of what's been done with his money: what donation-receipts he's got (with info about each).
    - (And there can be a link over to the Fund UI, saying something like "if you want to actually direct this money yourself, go here. But the whole point of this role-centric UI is that that's not the primary thing we expect the user to do on this page; he's pledging money, maybe he wants to see what's been done with it, but he doesn't want to be particularly active in directing it.)
  - Fund:
    - This is the old Fundable Projects board, where we show the parameters of the board (what statements it's for, filters, etc.), and then a list of projects. Actually, multiple lists of projects: Not Yet Funded, Not Yet Reimbursed, etc. (Later maybe we'll split the Fund UI into more-specific ones for retroactive funding versus early funding. For now don't bother.)


## Summary

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

Do not present every underlying protocol role as an equal top-level destination.
Group related roles into a small number of user-facing workspaces:

1. **Sign** — signer activity and mediator suggestions presented to signers.
2. **Donate** — standing pledges, deposited notes, delegation to someone else, reclaim
   controls, and a history of what the person's money accomplished. This is the
   hands-off money role: put money in, choose its scope and delegate, then leave the
   allocation work to someone trusted.
3. **Fund** — actively choose proposed, promising, or delivered projects and direct
   money. Contribution, scout funding, retroactive donation, and acting as a delegate
   are different mechanisms inside this active allocation job.
4. **Evaluate** — alignment and success attestations.
5. **Organize** — projects, cause boards, mediation, and channel claims.

Vertical building belongs in a founder area, documentation, or operator console rather
than ordinary daily navigation.

The home page is a compact role launcher, not a miniature version of every workspace.
It shows one card per established workspace. Each card answers:

1. What can I do here?
2. What is my current state?
3. What is the most natural next action?

For an empty role, the card gives a short explanation and an entry action. Once the
person has activity, that explanation gives way to a terse summary or useful next
step: signed-statement count for Sign; monthly pledge and available-funds status for
Donate; configured scope and newly eligible work for Fund; cause-board/project count
for Organize. Evaluate should not appear until it has a real workspace.

Cards have equal semantic status but need not have equal visual urgency. The most
actionable current state may lead; passive or empty roles remain compact. The home
page does not render project lists, statement objects, delegation controls, or cause
boards inline.

## Sign and funding-board independence

Signing means "I agree with this statement." It must not silently configure what the
person is considering funding. A person may sign solely to express a belief, explore
implications, write better wording, or build bridges.

The personal fundable-projects board is therefore an explicitly configured personal
view with its own parameters:

- included statements;
- optional geographic scope;
- later, project stage/funding mode and other eligibility filters;
- the source of money available to direct, when relevant.

Signing and board setup should cooperate without being coupled. Useful bridges are
"Add this statement to my funding board," "Start with statements I've signed," and
"You signed related statements that are not included." Signing, retracting a
signature, or editing the board never silently performs one of the other operations.

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

## Superseded: home inbox (second slice)

This was implemented as an intermediate step. Occupied CauseStarter home (`/`)
grouped existing teasers by job instead of stacking
every object list at equal weight:

- **Fund** → `/dashboard` (fundable-projects union; still the hero)
- **Sign** → `/statements` (count + suggesters, not the full statement objects)
- **Organize** → `/causes` (compact cause boards + a short bookmarked-project teaser)

The role-card launcher above supersedes this composition. In particular, Donate is
now a first-class workspace and the home page no longer embeds the Fundable Projects
board as its hero.

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

## Donate workspace (fourth slice)

`/donate` is for the person who wants to pledge money and then mostly forget about it.
Order the page by the questions that person is most likely to ask:

1. **Monthly giving** — amount per month, cause/scope, delegate, last execution, and
   cancellation controls. The current contract has no reversible pause state; adding
   pause/resume requires an explicit contract and event-model extension.
2. **Money in the system** — active notes the person created, with amount, earmark,
   current delegate, and reclaim/revoke-delegation controls.
3. **What my money did** — allocations and permanent contribution receipts, with the
   project and relevant transaction/outcome information.

Funds delegated *to* this person belong primarily in Fund, because allocating them is
active judgment work. Donate may mention them only as a handoff link. Conversely,
Donate includes a quiet escape hatch: "Want to choose projects yourself? Go to Fund."

Prefer plain user language. The workspace label is **Donate**; **standing pledge**,
**note**, and **receipt** remain the precise underlying terms where detail is useful.
Use **reclaim** when money has returned to the person's control; use **revoke
delegation** only when that is the actual operation.

### Implementation slices

1. Promote the existing standing-pledge and note-management surfaces into `/donate`,
   with the hierarchy and role copy above; keep legacy delegation URLs compatible.
2. **Implemented in a first pass:** allocation/receipt history folds note-spend events
   into one row per allocation transaction, attributes delegated spending to the root
   donor, groups rows by project, and folds refund/reimbursement state into the original
   row rather than presenting raw lifecycle events as separate donations.
3. **Implemented as a workspace handoff:** Fund lists active money sources controlled
   by the wallet, identifies funds entrusted by another donor, and project pages select
   an eligible note for the allocation transaction. A later refinement may preserve a
   board-level preferred money source across project navigation.

## Explicit personal funding board (fifth slice, first pass implemented)

Replace `/dashboard`'s implicit signed-statement union with a saved personal board
definition. Existing users may be offered a one-time "start with my signed statements"
action, but signed statements are not a live synchronization source. Show the active
statement and geographic parameters above the project lists and provide an obvious
Edit action. The first pass is wallet-scoped in device storage. The editor can select
signed statements or add any published statement by CID; publishing/synchronizing the
definition remains a later persistence slice.

## Later questions

- Whether the workspace choice should persist across sessions or only through links.
- Whether Fund needs visible submodes (Proposed, Promising, Delivered) or filters suffice.
- Which dashboard events deserve attention badges rather than passive sections.
- Whether Evaluate earns top-level navigation after it has been tested with real tasks.
- Whether Donate should summarize receipt history by project, allocation, or standing
  pledge once the underlying event history is available.
