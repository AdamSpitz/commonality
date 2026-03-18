# What we've been working on lately

---

Main thing I want to work on next:
  - Indexer redesign: see specs/indexer/redesign.md

Other big things to do soon:
  - The issues in the different workspaces' TODO.md files (see below).
  - Fix the problem where I start up the simulation but then I don't actually see the IPFS content in the web browser. (Is the IPFS content not making it into the dockerized IPFS node? Or is it not being fetched properly by the UI? Or what?)
  - I want a better understanding of indexer performance characteristics (in theory); see [indexer-performance](/specs/indexer/indexer-performance.md).
    - See also [IPFS in indexer](/specs/indexer/ipfs-in-indexer.md).
  - (Not a task for AI.) Can I try out conceptspace manually? e.g. Start up docker-compose locally, maybe do some fake-data generation to populate the system with a bunch of data, and then look at the UI through my web browser?
  - (Not a task for AI.) I need to do a big code review myself, of the whole thing. I don't trust it.

Ideas from the specs/motivation stuff:
  - Bridges to tradfi. This is definitely out of scope for the MVP, but it's worth thinking about.

---

## Miscellaneous TODO.md files

- [hardhat/TODO.md](hardhat/TODO.md)
- [sdk/TODO.md](sdk/TODO.md)
- [ui/TODO.md](ui/TODO.md)
