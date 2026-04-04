# What we've been working on lately

---

Main thing I want to work on next:
  - Implement the Subjectiv trust graph for alignment attestations. (Decision made: alignment attestations need the trust graph because they're inherently social judgment, unlike implication/content attestations which are objective enough for centralized attesters. See specs/subsystems/subjectiv/README.md.)

Other big things to do soon:
  - Implement the content-funding system. (Smart contracts and tests done ✓)
  - Figure out the seed statements.
  - Figure out the seed statements. (We've started, but then we realized that content-funding and in particular noninflammatory-content funding was a major use case, so we got sidetracked into that. Once we have the content-funding system MVP built, go back to writing up seed statements.)
  - Generate a proliferation of similar statements around the seed statements. Use an LLM *once* to pre-generate evaluations of all the S1 -> S2 implication candidates, then store those statements and those evaluations as another pre-generated data to be used in the fake-data simulations.
  - Switch the fake-data-simulation stuff so that it uses the seed statements and the proliferation of similar stuff, so that even when I'm looking locally at the fake-data-generation simulation, I'm seeing the seed stuff, not those less-sophisticated statements I generated and put into universe.json a long time ago - those can be deleted once we're using the real seed content.
  - Make sure the attester and finder seem viable. (Get them into the docker-compose setup? Make sure they're using the pre-generated stuff, not spending LLM credits every time I run the tests.)
  - Merge specs/motivation with the wider specs directory? (Sort-of a prerequisite for writing the documentation; I want to get all the ideas clear first.)
  - Write the documentation and AI skills.
  - Audit the smart contracts using a more-competent AI. (Still doesn't replace a real auditing by competent humans, but it's better than nothing and much easier. Also, I suspect that most of these contracts are simple enough that I can probably get them right without too much trouble.)
  - Do I trust the UI? No.

  - The issues in the different workspaces' TODO.md files (see below).
  - Fix the problem where I start up the simulation but then I don't actually see the IPFS content in the web browser. (Is the IPFS content not making it into the dockerized IPFS node? Or is it not being fetched properly by the UI? Or what?)
  - (Not a task for AI.) Can I try out conceptspace manually? e.g. Start up docker-compose locally, maybe do some fake-data generation to populate the system with a bunch of data, and then look at the UI through my web browser?
  - (Not a task for AI.) I need to do a big code review myself, of the whole thing. I don't trust it.

Ideas from the specs/motivation stuff:
  - Bridges to tradfi. This is definitely out of scope for the MVP, but it's worth thinking about.

Ideas from seed-content work:
  - Think about orthogonal hierarchy dimensions — geographic and topical. Statements like "I'm interested in improving Grey County" and "I'm interested in furthering crypto adoption" are independent axes, and their conjunction ("further crypto in Grey County") creates a more specific interest. This matters for funding portal discovery (a project at the intersection should show up in both parent portals) and for delegatable note intents. These are just regular statements in plain English with implication links to both parents. See seed-content.md for more detail.

---

## Miscellaneous TODO.md files

- [ui/TODO.md](ui/TODO.md)
