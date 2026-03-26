# What we've been working on lately

---

Main thing I want to work on next:
  - ?

Other big things to do soon:
  - Figure out the seed statements?
  - Generate a proliferation of similar statements around the seed statements. Use an LLM *once* to pre-generate evaluations of all the S1 -> S2 implication candidates, then store those statements and those evaluations as another pre-generated data to be used in the fake-data simulations.
  - Make sure the attester and finder seem viable. (Get them into the docker-compose setup? Problem is that it actually costs money to run the LLMs, so I want them to be part of the pre-generated stuff, not something that runs every time I run the tests.)
  - Merge specs/motivation with the wider specs directory? (Sort-of a prerequisite for writing the documentation; I want to get all the ideas clear first.)
  - Write the documentation and AI skills? Including the seed content? So that even when I'm looking locally at the fake-data-generation simulation, I'm seeing the seed stuff.
  - Audit the smart contracts using a more-competent AI. (Still doesn't replace a real auditing by competent humans, but it's better than nothing and much easier. Also, I suspect that most of these contracts are simple enough that I can probably get them right without too much trouble.)
  - Do I trust the UI? No.

  - The issues in the different workspaces' TODO.md files (see below).
  - Fix the problem where I start up the simulation but then I don't actually see the IPFS content in the web browser. (Is the IPFS content not making it into the dockerized IPFS node? Or is it not being fetched properly by the UI? Or what?)
  - (Not a task for AI.) Can I try out conceptspace manually? e.g. Start up docker-compose locally, maybe do some fake-data generation to populate the system with a bunch of data, and then look at the UI through my web browser?
  - (Not a task for AI.) I need to do a big code review myself, of the whole thing. I don't trust it.

Ideas from the specs/motivation stuff:
  - Bridges to tradfi. This is definitely out of scope for the MVP, but it's worth thinking about.

Ideas from seed-content work:
  - Think about whether we need a formal structure (or at least informal pattern) for "multiple answers to the same question" — e.g. the extremist/moderate/commonality pattern on polarized issues. Right now the system has individual statements and implication links between them, but nothing that groups a set of statements as "these are all different positions on the same issue." Might be useful for the explorer AI (present multiple positions side by side), for the UI (show a spectrum view), and for the implication attester (know which statements to evaluate against each other). Could be as simple as a convention in extras (e.g. `questionId` field linking statements to a shared question) or as heavy as a new smart contract. Worth thinking about before we have too many statements in the wild.
  - Think about orthogonal hierarchy dimensions — geographic and topical. Statements like "I'm interested in improving Grey County" and "I'm interested in furthering crypto adoption" are independent axes, and their conjunction ("further crypto in Grey County") creates a more specific interest. This matters for funding portal discovery (a project at the intersection should show up in both parent portals) and for delegatable note intents. May need conjunction/intersection statements and implication links from the conjunction to each parent. See seed-content.md for more detail.
  - Design a convention for structured semantic content in statements. Right now a conjunction like "I'm interested in crypto in Grey County" is just English text — a human can read it, but the system can't tell it's a conjunction without parsing natural language. If instead the statement's `extras` (or a new field in the displayable-documents format) carried structured data like `{ "type": "conjunction", "components": ["cid-of-crypto-statement", "cid-of-grey-county-statement"] }`, then the system can trivially generate the implication links, the explorer AI can compose conjunctions on the fly, and we can always render the structured data into readable English. This is a one-way door: structured → English is easy, English → structured is hard (requires NLP). So we should get the convention right early. The same idea applies to other patterns: "multiple answers to the same question" (a `questionId` or `positionOn` field), geographic hierarchies (`{ "type": "geographic-interest", "location": {...} }`), etc. Could live in `extras` (statement-level, no spec change needed) or could be a first-class concept in displayable-documents. Worth designing before we have too many unstructured statements in the wild.

---

## Miscellaneous TODO.md files

- [hardhat/TODO.md](hardhat/TODO.md)
- [sdk/TODO.md](sdk/TODO.md)
- [ui/TODO.md](ui/TODO.md)
- [attester/TODO.md](attester/TODO.md)
