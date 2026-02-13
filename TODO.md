# What we've been working on lately

Main thing I want to work on next:
  - Writing and testing the UI. See [ui/TODO.md](ui/TODO.md). Let's start with the conceptspace UI, and let's make sure it's well tested.
    - First, actually, let's implement the "E2E Testing with Docker Backend" plan from ui/TODO.md, so that we can do real E2E tests using a full backend (with Hardhat, IPFS, etc.).

Other big things to do soon:
  - Generative testing. See specs/testing/generative-testing.md.
    - ✅ Attester generation implemented (generateAttesters.js with different attester types)
    - ✅ OpenRouter integration for LLM-based implication evaluation (openrouter.js, llmAttester.js)
    - ⏳ Funding and delegation actions
    - ⏳ Attack scenarios and invariant checking
  - Implement the Implication Attester AI service.
  - Set up deployment for testnet and mainnet.

## Miscellaneous TODO.md files

- [ui/TODO.md](ui/TODO.md)
