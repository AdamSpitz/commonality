# What we've been working on lately

---

Main thing I want to work on next:
  - Implementing the pubstarter UI. Broken into 6 chunks — see [ui/src/pubstarter/TODO.md](ui/src/pubstarter/TODO.md). All 6 chunks done! (Note: token image upload per the user's note in Chunk 6 is not yet implemented — could be a future enhancement.)

Other big things to do soon:
  - Get the e2e tests (npm run ui:test:e2e) working.
  - Fix the problems in the different workspaces' TODO.md files.
  - (Not a task for AI.) Can I try out conceptspace manually? e.g. Start up docker-compose locally, maybe do some fake-data generation to populate the system with a bunch of data, and then look at the UI through my web browser?
  - (Not a task for AI.) I need to do a big code review myself, of the whole thing. I don't trust it.
    - Stuff I'm suspicious about:
      - Statement IDs. Are we using the correct CID format? Are we using the CID at all?
  - ?

Ideas from the specs/motivation stuff:
  - Assurance contracts whose condition is something other than "reaches N ETH by timestamp T". e.g. One use case: "if this oracle says go, we go." (Can we build it to be open-ended, so the creator of the contract can plug in any function? The smart-contract code will of course all be visible. OTOH, it would be good to have known patterns so that the contract's meaning can be be known safely and the UI can display it without people needing to read the code.)
  - Bridges to tradfi. This is definitely out of scope for the MVP, but it's worth thinking about.

---

## Miscellaneous TODO.md files

- [hardhat/TODO.md](hardhat/TODO.md)
- [sdk/TODO.md](sdk/TODO.md)
- [ui/TODO.md](ui/TODO.md)
