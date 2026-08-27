# Belief implication, board inclusion, and project discovery

Status: open product-design direction; probably worth doing, not yet a settled
specification.

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

## Questions to resolve

- Is a board fundamentally a statement plus implication closure, or can it be a
  view combining a semantic goal with factual filters?
- Does project location mean headquarters, activity location, beneficiary area,
  or several separately represented things?
- How should projects with non-local or multi-region effects be represented?
- Should geographic boards be permanent named objects/URLs, generated views, or
  ordinary CauseStarter views over planks plus filters?
- Which parts of personalized ranking should be conventional candidate
  retrieval, and which should be delegated to an AI?
- How does a user or delegate express an explicit local, regional, national, or
  global mandate without creating a belief ontology?
- What explanations should accompany recommendations (“near you,” “Canada-wide
  impact,” “high expected impact despite distance”)?
- Can the home page evolve from an unranked union without losing predictable,
  inspectable behavior?

## Tentative direction

Do not change the implication attester to force nested-place statements to
imply containing-place statements. Treat that failure as evidence that belief
implication and geographic board inclusion should be separated. Explore a
small board/view inclusion mechanism and a later personalized ranking layer,
while keeping natural-language statements and conservative implication as the
source of truth for what users are counted as believing.
