# Geographic × topical intersections

Many real-world projects sit at the intersection of **geographic** and **topical** axes:

- Topical: "I'm interested in crypto"
- Geographic: "I'm interested in Ontario"
- Conjunction: "I'm interested in crypto in Ontario"

The system supports this through:
- Geographic interest statements at multiple levels (town → county → province → country)
- Topical interest statements
- Conjunction statements that imply both parents

A project aligned with a conjunction statement appears in *both* parent portals — this is important for discoverability.

**See also:** [seed-content/meta.md](../seed-content/meta.md) — includes geographic hierarchy and example conjunctions

## Trying to think this through

Concrete examples:

  - Alice is interested in crypto in Grey County, Ontario.
    - She signs the conjunction "I'm interested in crypto in Grey County, Ontario".
    - I guess the conjunction probably implies both the topical interest statement "I'm interested in crypto" and the geographic interest statement "I'm interested in Grey County, Ontario".
    - Note that this means that the reverse implications should NOT be true: "I'm interested in crypto" should NOT imply "I'm interested in crypto in Grey County, Ontario". Similarly, "I'm interested in Grey County, Ontario" should NOT imply "I'm interested in crypto in Grey County, Ontario". (Because we don't want some resident of Grey County who's indifferent to crypto to be inundated with a bunch of projects for crypto in Grey County. He doesn't care about crypto, he just cares about Grey County. And similarly, we don't want someone who's interested in crypto in France to be shown a bunch of stuff about crypto in Grey County. So we need to make sure the implication-attester LLM prompt is clear that implications like that need to be one-way, not two-way.)
    - I guess that's fine, though I wonder whether it might help to make the statements a bit more explicit:
      - Instead of "I'm interested in crypto", maybe we use a pattern of statements like:
        - A: "I'm interested in furthering the adoption of crypto in Grey County, Ontario"
        - B: "I'm interested in furthering the adoption of crypto in a particular geographical region"
        - C: "I'm interested in projects that advance crypto's capabilities in general"
        - D: "I'm interested in some particular kinds of projects in Grey County, Ontario"
        - E: "I'm interested in furthering the adoption of crypto in France"
      - Projects that ought to show up in the cause board for each of those statements:
        - A: Education seminar for business owners in Grey County who are interested in accepting crypto payments
        - B: Browser extension that adds "this business accepts crypto payments" to Google Maps
        - C: New DeFi protocol
      - So the idea is that we'd want the implication attester to say A -> B, B -> C, A -> C?, A -> D, E -> B, E -> C, but NOT A -> E or E -> A or E -> D. And this should hopefully be more obvious to the attester now, because the statements are more explicit now.
      - B is more like a system-internal node, not something that a human would directly sign, but that's kinda the point. There are particular kinds of projects (like a browser extension that adds "this business accepts crypto payments" to Google Maps) that would be interesting to both the crypto guy in Grey County and the crypto guy in France. So when people start signing statements like A or E, we want someone (either a human or maybe the implication-finder or some new statement-creator AI-based service) to create B and ask the implication attester to create the A -> B and E -> B links.
      - D is the parallel to B but in the geographic dimension: it abstracts over *which topic* rather than *which region*. B = "same topic, any region"; D = "same region, any topic".
      - This process can recurse. If "interested in DeFi in Grey County" and "interested in crypto payments in Grey County" both get signed, something might create A as an intermediate node between those and D. Conjunctions can themselves become internal nodes as the graph fills in. The whole thing naturally forms a lattice — most specific conjunctions at the bottom, fully general statements at the top, with intermediate abstraction nodes at every useful level in between.
      - The statement-creator service is essentially a *lattice completion* service: given a set of signed statements, find missing intermediate nodes that would make the implication graph more useful.
      - No need to get this perfect upfront. If the system creates too many intermediate nodes, they can be pruned by filtering on number of direct signers. If useful nodes are missing, someone (human or AI) will eventually notice and add them, and they can be hooked into the implication graph at that point. The system degrades gracefully in both directions.

## Where the statement-creator service fits in the architecture

The statement-creator service is a **specialized finder** — not a new tier.

Like the implication finder and content finder, it is a background service that discovers candidates and submits them to an attester. The difference is that the implication and content finders only *find* existing pairs; the statement-creator *creates new statement text* (the intermediate conjunction node) before submitting. Once it has created a candidate statement, it calls the implication attester twice: once to create the upward implication (conjunction → parent A) and once to create the other (conjunction → parent B).

Concretely, the loop is:
1. Observe that two statements S1 and S2 are both accumulating signers.
2. Determine that a useful conjunction C ("both S1 and S2") is missing from the graph.
3. Use an LLM to generate natural-language text for C that is clear and specific enough to be signed.
4. Submit (C, S1) and (C, S2) to the implication attester.

This fits cleanly into the finder tier:
- **Finder core** (`finder-core/`) provides the polling loop and batch-submission helpers.
- The statement-creator adds an LLM generation step before the submission step.
- No new service tier is needed.

This service is **not yet implemented and not on the critical path**. It only becomes useful once the implication graph has enough naturally-signed statements that useful intermediate nodes are visibly missing. A human can do this manually in the meantime. Add it to the backlog when the graph starts having enough activity to make lattice gaps obvious.