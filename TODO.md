# What we've been working on lately

Main thing I want to work on next:
  - ✅ Set up deployment for testnet and mainnet. (DONE - see hardhat/scripts/deploy.js)

Other big things to do soon:
  - Generative testing. See specs/testing/generative-testing.md.
    - ✅ Attester generation implemented (generateAttesters.js with different attester types)
    - ✅ OpenRouter integration for LLM-based implication evaluation (openrouter.js, llmAttester.js)
    - ✅ Funding and delegation actions (fundingAndDelegationActions.js with project creation, token purchases, note delegation)
    - Question: is this set up in such a way that we can pre-generate a bunch of statements (AI-generated?), as well as implication attestations between them (also AI-generated?), and then save those here in this Git repo so that we can use them as-is for our test runs? (The point is that I don't want it to cost me OpenRouter credits every time we run the tests. I want to generate some data once, then save it and reuse it. Of course it'd be fine to later blow it away and regenerate it if there's some reason to, but let's make that a separate action, not something that happens on every test run.)
    - ⏳ Attack scenarios and invariant checking
    - So... is this actually set up so that I can run a local hardhat node, IPFS node, indexer, and UI (perhaps all via Docker? I know we have a docker-compose setup that we use for the integration tests), and then do a round of fake data generation, run it through the SDK to populate the system with it, and then I'll be able to open up the UI in my web browser and see the system populated with all that data?

## Miscellaneous TODO.md files

- [ui/TODO.md](ui/TODO.md)
