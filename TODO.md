# What we've been working on lately

Main thing I want to work on next:
  - We just refactored the indexer to (a) use CIDv1 format in the DB (instead of storing both that and also "0xabc..." redundantly), and (b) expect CIDv1 format in the API endpoints. So now we need to change the SDK and the UI code to use CIDv1 format. Wherever the UI talks to the indexer, it should use CIDv1. Where the UI (or SDK) talks to contracts, it should use bytes32. Let's add a copy of cid-types.ts to the SDK code too (I don't think there's a good way to avoid that duplication - I don't want the SDK to be a dependency of the indexer or vice versa), and then make sure that those types are used clearly throughout the SDK and UI code, with explicit conversions (with clear error messages) at the edges wherever we're accepting untyped strings.
  - I need to do a big code review myself, of the whole thing. I don't trust it.
    - Stuff I'm suspicious about:
      - Statement IDs. Are we using the correct CID format? Are we using the CID at all?

Other big things to do soon:
  - Fix the problems in TODO-smart-contracts.md.
  - (Not a task for AI.) Can I try out conceptspace manually? e.g. Start up docker-compose locally, maybe do some fake-data generation to populate the system with a bunch of data, and then look at the UI through my web browser?
  - (Not a task for AI.) Satisfy myself that the whole thing works.
  - ?

---

## Miscellaneous TODO.md files

- [ui/TODO.md](ui/TODO.md)
