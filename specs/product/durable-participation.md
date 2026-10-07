# Durable participation: a tally that campaigns can build on

Discussion proposal, 2026-10-07. This develops an existing direction, not an
implementation commitment. Unique-human verification and federation with external
petition systems remain future work.

## The idea

**Express a view once, keep control of it, and let future efforts build on it.**

A campaign should not have to reconstruct its entire constituency whenever it
starts a new petition, changes its wording, or hands the work to another organizer.
People's recorded views can remain useful across those boundaries. New participants
add to an existing body of participation; returning participants can refine or
change their views. Different organizers can discover overlapping constituencies
without requiring everyone to join the same organization.

Tally could become a continuing reference point for expressed public support:
somewhere people expect their views to remain available and worth updating. The
ambition behind “the poll” is understandable, but the more defensible promise is
**a shared, continuing record of what participants say they believe**, with
inspectable ways to count it. It does not establish what the whole population
believes, or create a single authoritative interpretation of everyone's views.

This extends [sign once, stay counted](/docs/end-user/tally/express-what-you-care-about.md),
[individualization](/docs/end-user/commonality/vision-and-strategy/why-its-better/individualization.md),
and [organic coalitions](/docs/end-user/commonality/vision-and-strategy/why-its-better/organic-coalitions.md).
The additional strategic claim is about time: the effort of participating can
remain useful after the occasion that originally motivated it has passed.

## What set union buys us—and what it doesn't

For a specified set of statements, take the union of their signer sets and count
each identity once. Signing five included statements contributes one person to
that union. If another compatible system supplies verifiable records and identities
that can be deduplicated against ours, its participants can also contribute.

Three different questions need different answers:

| Question | Operation and meaning |
|---|---|
| Who signed at least one of these statements? | Union: participation in any of them. |
| Who signed every one of these statements? | Intersection: explicit agreement with the whole set. |
| Who supports this shared conclusion? | Direct signers plus deduplicated indirect supporters through accepted implications to that conclusion. |

The union of “build this road” and “do not build this road” is not a constituency
for building the road. Nor does support for one plank mean support for an entire
cause board. Deduplication solves repeated counting; implication judgments solve
a separate, harder problem about meaning.

For a target statement q, a proposed count can be described as:

`support(q, t, rules) = direct(q, t) ∪ union(direct(s, t) for accepted s → q)`

Resolve identities before counting the union. Here `direct` means the latest
applicable recorded agreement at time t, not every historical signing event.
The rules specify identity eligibility, freshness, accepted attesters, and conflict
handling. Existing Conceptspace implications are non-transitive: s → x → q does
not suffice without an accepted s → q attestation. Indirect support remains an
inference, not a signature on q.

## Durability does not require numbers that only rise

For fixed statement membership and fixed identity rules, the set of people who
have *ever* signed grows as new historical records arrive. That is a historical
participation measure. It is not a snapshot of current agreement.

Current recorded support must be able to fall when someone withdraws or disagrees.
A freshness window also loses entries as they age. Identity corrections can merge
previously distinct accounts, and rejected implications can remove indirect
support. Even historical unique-human totals can be revised downward when their
identity assumptions change.

The useful promise is continuity, not an upward-only counter. Keep these views
distinct:

- **Current recorded support:** the latest expressed position, which may be old.
- **Recently confirmed support:** current support explicitly confirmed within a
  stated period. An account login does not refresh every belief.
- **Historical participation:** people who expressed support at some time,
  including those who later withdrew.

None perfectly reveals present private beliefs. Showing age makes uncertainty
visible without making everyone repeat a whole questionnaire every month. Stable
values and expiring requests also differ: “libraries should be free” can remain
useful for years; “stop next Tuesday's demolition” needs its original date and
context preserved. New wording does not inherit direct signatures.

## Why this could change participation

The hypothesis is that people will spend more effort expressing a precise view
when they expect it to keep doing useful work. A short answer today could help a
later project find an audience, reveal agreement with an unexpected group, or
answer a new question through an inspectable implication. Someone can add a few
positions at a time rather than complete an exhaustive survey upfront.

Durability also makes recruitment cumulative. An organizer can bring in new
participants without losing everyone reached by the previous organizer. If people
see others using these counts to discover projects or allocate attention, they
have a reason to make their own views visible. Competing camps may then recruit
their constituencies because absence leaves their positions underrepresented in
this particular record.

That feedback loop is plausible, not automatic. Organizers may prefer exclusive
lists, dispute the counting rules, or avoid a venue where opponents dominate.
More participation can reflect better mobilization rather than persuasion.
Recruitment from several camps still does not produce a representative sample.
There is no election-like guarantee of equal access, shared eligibility, or binding
consequences. A large tally demonstrates recorded support among participants;
it does not by itself establish a population majority or a mandate.

This fits the [founder-first strategy](founder-first.md): give each founder a
useful constituency view for their own cause. Shared infrastructure lets that work
benefit other causes. Becoming a widely used reference point is a possible result
of those local successes, rather than a prerequisite or an umbrella growth plan.

## The connection to organic coalitions

The most interesting outcome is a growing map of specific agreements that cuts
across familiar camps. Someone can disagree strongly with another group on one
issue and discover that many participants in both groups explicitly favor the
same practical outcome on another.

That requires more than a large union total. Show which specific statements
connect the groups, how much support is direct versus inferred, and what remains
disputed. Group membership should be self-described or based on disclosed signed
statements, not silently assigned political identities. Overlapping groups need
overlap counts; their totals cannot simply be added.

When the bridge is only inferred, invite participants to read and sign the exact
bridge statement. That converts a hypothesis about agreement into explicit
agreement. Signing a mediator's modified statement must remain a new choice;
signing its natural parent cannot be treated as acceptance of the modification.

This can make fine distinctions rewarding: “I agree with you about this outcome”
need not become “I endorse your whole program.” It can reveal useful common ground
even when there is no majority and no resolution of the larger dispute. Whether
seeing this changes attitudes toward opponents is a further hypothesis to test.

## Product suggestions

1. **Make every displayed count explainable.** Show statement scope, account versus
   verified-human unit, direct and indirect support, deduplication, timestamp,
   freshness rule, and attester policy. Direct and indirect breakdowns must avoid
   double counting people in both. Shareable snapshots should preserve the rules
   used; personal trust settings can legitimately produce different results.
2. **Make returning worthwhile.** Provide a compact review of a person's signed
   statements, easy withdrawal/disagreement, and optional reminders to confirm
   selected older views. Show useful new connections to their existing views.
   Avoid treating silence as a fresh confirmation.
3. **Handle conflicts before claiming current human support.** Propose that explicit
   disagreement with q overrides inferred support for q. Linking accounts with
   conflicting positions also needs a disclosed resolution rule and a way for the
   person to correct it. Audit existing behavior before implementing either.
4. **Let organizers reuse a count across campaigns.** A shareable view over a
   specified statement set or conclusion can preserve continuity while individual
   campaign pages come and go. Changes to the included set must be visible; adding
   a popular statement is not evidence that anyone changed their mind.
5. **Prototype common-ground views.** Show agreement on concrete statements across
   two voluntarily identified constituencies, alongside disagreement and unanswered
   questions. “Not signed” is not “opposed.” Keep signing separate from subscribing,
   permission to contact, willingness to work, and willingness to fund.
6. **Treat federation as a later interoperability project.** Imports require
   original wording/version, source provenance, timestamps, evidence of signing,
   updates and revocations, and participant-authorized identity linking. An
   external signature does not automatically authorize new uses or public linking.
   Without a reliable cross-system identity mapping, report source counts
   separately; do not add them into a purported unique-human total.

Human uniqueness, account ownership, current belief, and eligibility for a local
count are separate claims. Identity providers may overlap without a way to detect
it. Unlinked accounts cannot be assumed to be additional verified humans, nor can
we assume malicious accounts will voluntarily link later. Linking political
histories also creates privacy consequences; a proof of uniqueness does not by
itself solve cross-statement privacy. These are design requirements for later work,
not reasons to defer a clearly labeled account-based prototype.

## Documentation suggestions

- Revise Tally's “forever, with no re-signing” promise to explain continuing recorded
  support, withdrawal, and optional freshness confirmation. Remove the assurance
  that future identity linking removes today's incentive to create fake accounts.
- Distinguish implications from equivalence: two statements can imply the same
  broader conclusion without meaning the same thing.
- Qualify “hidden majority” language: the system can expose an observable
  constituency; majority claims require an appropriate population denominator and
  evidence about that population. Separate support from demonstrated funding.
- Add the time dimension to the vision's organic-coalition and immediate-value
  explanations after accepting this proposal. Signing can add zero to a union
  where that signer is already counted, while still adding a useful direct signal.

## A small demo and a useful experiment

Extend the existing [tiny/demo pipeline](/fake-data-generation/PLAN.md), using
accepted statements rather than inventing another bridge-generation pipeline.
Keep all identities and activity clearly fictional. Model missing future features
as labeled fixtures, not as claims about working identity verification.

A deterministic story with six fictional people is enough:

| Event | Expected result |
|---|---|
| Campaign A gets signatures from people 1, 2, 3; campaign B from 3, 4 | Five signatures, four people in the union. |
| Person 3 links a second account that also signed B | Account count can differ; verified-person union remains four. |
| Person 5 joins through a later campaign included in the view | Union becomes five without asking the earlier people to sign again. |
| Person 2 withdraws their only qualifying signature | Current union returns to four; historical participation remains five. |
| Person 1's signature ages beyond the freshness window | Current recorded union stays four; recently confirmed count falls. |
| Person 6 signs an opposing statement | Does not enter the target's supporter count merely by participating in the topic. |

Add an accepted bridge with direct and indirect support from participants in both
camps, one person who explicitly rejects the bridge despite an inferred path,
and a contested implication whose removal changes the inferred count. Present
this as a counting scenario; don't invent implausible beliefs merely to fill cells.

Then try one cause across two recruitment occasions. Measure how much participation
can be reused, whether people understand why they count, whether they can correct
it, and whether they voluntarily answer another precise question after seeing a
useful connection. Ask participants from different camps whether the view fairly
represents them and reveals an agreement they had missed. Track recruitment,
reconfirmation, changed beliefs, and changed counting rules separately.

The proposal becomes more convincing if reuse reduces organizer work and people
understand and value the continuing record. If they mostly feel misrepresented,
ignore review prompts, or see no reason to add detail, durability alone has not
earned the stronger adoption hypothesis. This experiment can start with account
counts; human verification strengthens the headcount claim later.
