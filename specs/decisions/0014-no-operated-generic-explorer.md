# 0014. Commonality does not run a generic explorer

- **Status:** Accepted
- **Date:** 2026-09-23
- **Related specs:** [0008](./0008-operated-surfaces-are-lenses.md), [`specs/tech/subsystems/conceptspace/explorer.md`](../tech/subsystems/conceptspace/explorer.md), [`specs/tech/conceptspace-repo-split-analysis.md`](../tech/conceptspace-repo-split-analysis.md)

## Context

An earlier explorer curator kept a short map of statements and suggested some of them to visitors. It does not read pledges or projects. It reads statement text and signer counts, and the prompt tells the model to treat that as a map of fundable areas. That service was built to answer "where should a person go in the whole space of statements?"

[0008](./0008-operated-surfaces-are-lenses.md) later rejected an operated discovery surface. A cause is reached by a link its founder circulates. Signer-count ordering and a model-written shortlist are both editorial acts, including when the shortlist is framed as "places that look fundable" rather than "places that already have funding." Feeding the curator real funding data would make an operated map worse: it would be Commonality deciding where money should go.

Specialized mediators (a beat agent for one social landscape, a bridge creator for one kind of bridge, a cause board that names nudgers) already match the later decision. A generic "direct people to popular statements" or "direct people to fundable areas" explorer does not.

## Decision

**Commonality does not deploy or default-trust an explorer.** The `explorer-curator` package stays in the repo as a template a third party can run, with their own brief, stream, and signer. That third party may be someone who also writes protocol code, acting as a person who wants to popularize a specific area, not as the protocol.

The host does not start the curator unless `EXPLORER_CURATOR_ENABLED` is explicitly true. It is false on the deployed workers. `VITE_DEFAULT_NUDGERS` does not include a Fundable Project Explorer. Aligning does not mount `/explore` or link an "Explore causes" directory. A visitor who arrives at a cause uses that cause's statements, its fundable-projects board, and nudgers that board's author published or that the visitor already subscribes to.

Do not replace this with a Commonality-chosen list of "suggested nudgers," and do not stand up a second operated map whose brief is "what are people signing?" The implication graph stays. Its authors are named and the viewer configures trust in them. That is not this service.

## Alternatives considered

- **Keep operating the funding map, and give it real funding data.** Rejected. Actual funding would make the editorial act sharper, not more neutral.
- **Operate a non-funding map of popular statements instead.** Rejected. Popularity is still an ordering we would be publishing. [0008](./0008-operated-surfaces-are-lenses.md) already rejected neutral-looking sorts.
- **Delete the package.** Rejected. Someone else should be able to run a focused explorer without us maintaining a default one.
- **Leave the service off but keep Aligning `/explore` and a default subscription.** Rejected. A page that renders our last published collection, or a nudger we pre-trust, is still an operated discovery surface.

## Consequences

Cold arrivals get no map of the whole statement space. That is intentional. Finding statements happens through a cause link, a mediator the visitor opted into, or the implication graph under trust they configured.

Revisit only if a cause-board arrival cannot show the statements and named nudgers that board already has, and the missing piece is not a directory we would be authoring. Do not revisit by shipping a default explorer under another name.
