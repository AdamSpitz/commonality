# Belief implication, board inclusion, and project discovery

Status: accepted direction; the first deterministic geographic-inclusion slice is
specified below. Personalized AI ranking remains deliberately deferred until project
volume makes ordering a demonstrated problem.

This came out of the nested-geographic-location problem in statement
generation. We wanted a project aligned with “I want more CSA in Grey County,
Ontario” to appear on an Ontario CSA board. The tempting mechanism was an
implication:

> I want more CSA in Grey County, Ontario.
>
> implies
>
> I want more CSA in Ontario.

That implication is not reliable. The parent sentence can naturally mean a
desire for improvement across Ontario, whereas the child signer may care mainly
about Grey County. The live implication attester noticed exactly this ambiguity
for farmers' markets.

This looks less like a wording bug and more like three product mechanisms being
collapsed into one.

## Three different questions

### Belief implication

When a user signs statement S1, an implication from S1 to S2 says that the user
can safely be counted as supporting S2 as well.

This is a claim about the signer. It puts words in their mouth, so it should
remain conservative:

> Would a reasonable signer of S1 say, “Yes, obviously I already said S2”?

Geographic containment by itself does not answer that question. Wanting more
CSA in Durham does not necessarily commit someone to wanting more CSA across
Ontario with equal strength, and it should not give the Ontario statement the
same `+1` as a signature from someone with an explicitly province-wide goal.

### Board inclusion

A board answers which projects qualify for a view. An Ontario CSA board can
reasonably include a CSA project in Durham because Durham is in Ontario. That is
a fact about the project and the board's scope, not necessarily a fact about the
beliefs of the project's supporters.

The current rule is coherent when the underlying implication is genuine: if a
project is aligned with S2 and S2 implies S, the project can appear on the board
for S. Projects flow from a stronger/specific statement to a weaker/general
statement in the same direction as implied support.

The mistake is using a questionable belief implication merely to obtain that
project flow. Boards may need inclusion rules other than implication. For
example, an Ontario CSA view could require:

- alignment with a CSA goal; and
- a project location or area of effect contained by Ontario.

This would not cause a Durham supporter to be counted as signing an Ontario-wide
statement.

### Personalized discovery

The user's home page answers a third question:

> Which fundable projects are worth showing to this particular person now?

Today it is described as the union of the fundable-project boards for statements
the user signed. That is simple, but local interests expose its limits.

Imagine someone in Durham who cares about crypto and local food systems. They
may want to see:

- small matching projects nearby;
- progressively fewer small projects elsewhere in Ontario, Canada, and the
  world; and
- unusually important or high-impact projects even when they are far away.

Another person—a patriotic donor or a delegate with a Canada-wide mandate—may
genuinely want projects from all of Canada without distance decay.

This is a recommendation/ranking problem, not logical closure over beliefs. A
rough conceptual model is:

```text
relevance = cause fit × expected impact × geographic affinity
```

There should not necessarily be one fixed formula. Geographic affinity behaves
differently for a community garden, watershed restoration, open-source
software, and federal advocacy. Explicit user or delegate intent should also be
able to override the normal local bias.

## A possible division of responsibility

| Mechanism | Question |
|---|---|
| Belief implication | Can this signer safely be counted under that statement? |
| Project alignment | Does this project further this stated goal? |
| Board inclusion | Does this aligned project qualify for this scoped view? |
| Personalized discovery | How worthwhile is it to show this project to this person? |

Under this model:

1. Belief implication stays strict and continues to affect support counts.
2. Projects gain factual location and, where needed, area-of-effect information.
3. Boards can combine semantic alignment with a geographic scope without
   fabricating belief implications.
4. The home page collects plausible candidates and then ranks them using cause
   fit, geography, impact, trust, funding need, novelty, and explicit user
   preferences as appropriate.
5. Direct support, implied support, board membership, and personalized placement
   remain visibly and conceptually distinct.

A natural-language statement such as “I want more CSA in Ontario” can still
exist for people who genuinely hold that province-wide goal. It should not have
to double as the machine representation of the query “CSA projects located
inside Ontario.”

## Relationship to “lean on AI”

This separation should not become a Semantic Web for causes and beliefs. In
particular, avoid requiring structured fields such as:

```text
topic = farmers-markets
relation = wants-more
location = Durham
```

That would invite a parallel ontology of topics, goals, relations, synonyms,
and exceptions. Statements should remain plain natural language, and AI should
continue to judge semantic equivalence, implication, alignment, and relevance.

Geographic containment is a reasonable narrow exception because it is stable,
externally checkable factual data rather than a home-grown model of human
meaning. Conventional indexes can retrieve a bounded candidate set by location
and other cheap signals; AI can make the semantic and personalized judgments
over that smaller set. This follows the principle in
[Lean on AI](./lean-on-ai.md): structured data serves as an index, hint, cache,
or validator for AI reasoning rather than replacing natural-language
understanding.

Even here, the structured fact should be modest: one location is contained by
another, or a project operates within/affects a place. It should not attempt to
encode the meaning of the cause itself.

## Resolved direction

### Boards are semantic views with modest factual rules

A cause board publication owns the definition of its fundable-projects view. The
definition consists of its selected statement CIDs plus optional inclusion rules.
Implication closure remains part of semantic project discovery, but is not the only
way a project qualifies for a view.

The first and only rule initially supported is an optional geographic scope. Do not
build a general predicate language or add topic, project-type, beneficiary, or impact
ontologies merely because the field is called `inclusionRules`.

### Relevant areas are intentionally fuzzy

A project may publish zero or more **relevant areas**: places where it operates or
expects its effects to be meaningfully felt. This intentionally does not distinguish
headquarters, activity location, and beneficiary area. It is approximate discovery
metadata, not a verified address, belief, or strict eligibility claim; occasional
false-positive inclusion is acceptable.

Represent each area as a human-readable specific-to-broad path, for example:

```text
Grey County, Ontario, Canada
Waterloo Region, Ontario, Canada
```

A multi-region project publishes several paths. Broadly non-local work may publish
`Worldwide`. A project may omit relevant areas and will then be absent from
geographically scoped boards while remaining eligible for unscoped boards.

A board scoped to `Ontario, Canada` includes a project path ending in that path, such
as `Grey County, Ontario, Canada`, plus explicitly `Worldwide` projects. Matching is
case-insensitive and whitespace-normalized. This deliberately small convention avoids
a gazetteer or GIS dependency. Canonical place identifiers or externally checked
containment can replace the matcher later without changing the product distinction.

### Geographic boards are ordinary cause boards

Geography does not create another named object or URL type. An organizer publishes an
optional `within` area as part of the existing versioned cause-board document. Ad-hoc
viewer filters may remain URL/UI state; they become publication data only when an
organizer publishes them as part of a cause board.

### Retrieval first, AI ranking later

Conventional code owns hard, inspectable candidate retrieval: fundability, trusted
alignment, genuine implication closure, geographic inclusion, hides, and already-seen
state. If volume later makes ordering a real problem, an AI may rerank a bounded
candidate set based on cause fit, likely impact, the importance of geography for the
kind of work, novelty, and explicit preferences. Its result is cached ranking advice;
it never changes belief implication or board eligibility.

Do not add AI ranking in the first slice. Evolve the dashboard through deterministic
filters and sorts first, preserve an “all matching projects” view, and show factual
provenance such as “Relevant to Grey County; included because Grey County is in
Ontario.” This keeps personalized placement inspectable.

### Explicit geographic intent is an operational instruction

When needed, express geographic intent as `near me`, `within [place]`, or `anywhere`,
with a separate `prefer` versus `require` distinction. “Prefer” changes discovery
ranking; “require” constrains a published board or delegation authorization. These are
view/funding instructions, not statements about what the person believes. This UI and
delegation extension is deferred until there is a concrete consumer for it.

## Implementation boundary

Do not change the implication attester to force nested-place statements to imply
containing-place statements. The first slice adds project relevant-area metadata, an
optional geographic inclusion rule to the existing cause-board publication, deterministic
matching in the fundable-projects views, and a factual explanation of the rule. Distance
decay, impact scoring, personalized AI ranking, and geographic delegation mandates remain
later work.
