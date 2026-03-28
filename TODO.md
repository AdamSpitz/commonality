# What we've been working on lately

---

Main thing I want to work on next:
  - Make sure the local deployment stuff actually persists the data even after stopping the services. (Is PONDER_EPHEMERAL relevant?)
  - Is there some way to prevent anyone from running "npm install" in a workspace directory? LLMs keep doing that, and it's causing problems? (Should only be called from the top-level directory, IIUC.)
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
  - Think about orthogonal hierarchy dimensions — geographic and topical. Statements like "I'm interested in improving Grey County" and "I'm interested in furthering crypto adoption" are independent axes, and their conjunction ("further crypto in Grey County") creates a more specific interest. This matters for funding portal discovery (a project at the intersection should show up in both parent portals) and for delegatable note intents. These are just regular statements in plain English with implication links to both parents. See seed-content.md for more detail.

---

## Miscellaneous TODO.md files

- [hardhat/TODO.md](hardhat/TODO.md)
- [sdk/TODO.md](sdk/TODO.md)
- [ui/TODO.md](ui/TODO.md)
- [attester/TODO.md](attester/TODO.md)
