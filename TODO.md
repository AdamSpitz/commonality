# What we've been working on lately

Main thing I want to work on next:
  - ✅ Set up deployment for testnet and mainnet. (DONE - see hardhat/scripts/deploy.js)

Other big things to do soon:
  - Generative testing. See specs/testing/generative-testing.md.
    - ✅ Attester generation implemented (generateAttesters.js with different attester types)
    - ✅ OpenRouter integration for LLM-based implication evaluation (openrouter.js, llmAttester.js)
    - ✅ Funding and delegation actions (fundingAndDelegationActions.js with project creation, token purchases, note delegation)
    - ✅ Attack scenarios implemented (attackScenarios.js with Sybil, spam, malicious attester, commission exploitation attacks)
    - ✅ Invariant checking implemented (invariantChecker.js with contract state, economic conservation, graph algorithm, indexer consistency checks)
    - Question: is this set up in such a way that we can pre-generate a bunch of statements (AI-generated?), as well as implication attestations between them (also AI-generated?), and then save those here in this Git repo so that we can use them as-is for our test runs? (The point is that I don't want it to cost me OpenRouter credits every time we run the tests. I want to generate some data once, then save it and reuse it. Of course it'd be fine to later blow it away and regenerate it if there's some reason to, but let's make that a separate action, not something that happens on every test run.)
    - ✅ Complete the data generation workflow with pre-generated statements and attestations

## Miscellaneous TODO.md files

- [ui/TODO.md](ui/TODO.md)
