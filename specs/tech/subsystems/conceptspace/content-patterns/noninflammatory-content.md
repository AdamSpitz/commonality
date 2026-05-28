# Noninflammatory content funding

We have a [content-funding subsystem](../../content-funding/README.md), and one of the use cases we hope to promote is **noninflammatory social media content** — content that communicates perspectives from one side but is written to be engaging to the other side rather than alienating.

See the dedicated [content-funding/noninflammatory-content/README.md](../../content-funding/noninflammatory-content/README.md) for the full analysis of this use case.

## The core patterns

1. **Meta-statements describing this kind of content**

Along the lines of the [hidden-majority patterns](/docs/end-user/csm/hidden-majority-patterns.md), these meta-statements might follow the moderate-left/moderate-right/commonality pattern:
  - "I lean left, and I'm interested in reading content that communicates right-wing perspectives as long as it doesn't piss me off."
  - "I lean right, and I'd like to try to communicate right-wing perspectives to common-sense left-leaning people in a way that they'll actually hear."
  - Commonality statement: "I'm interested in content that communicates right-wing perspectives in a way that won't piss off left-wingers."

2. **Specific common-sense statements** meant to appeal to one side or the other

Here we have the actual concrete hidden-majority statements on specific topics; see the [technical hidden-majority note](./hidden-majority.md) for the implementation-facing statement families and seed pointers.

That is, a major pattern I'm expecting to see in the usage of this noninflammatory-content system is that people on one side write content that says, "Here's a statement in conceptspace that I think the common-sense majority on the *other* side might be willing to sign, and here's why (in a respectful way)."

The [bridge creator](/specs/product/bridge-creator.md) is an AI system designed to do this systematically — synthesizing modified statements and commonality statements, then using the noninflammatory content system as the delivery mechanism.

## Noticing the connection between hidden-majority and noninflammatory-content

In fact, now that I think about it, the "noninflammatory content" idea might almost be *part of* the "hidden majority" idea. Maybe not quite. But they're very closely related, anyway.

At any rate, there probably isn't that much [seed content specifically around noninflammatory content](../seed-content/content-funding.md), *other than* the meta-statements described above; the rest of the seed content is simply the [hidden-majority seed content](../seed-content/hidden-majority.md).
