# Generative testing plan

(NOT AI-generated, or at least not completely; don't delete this.)

Let's have some scripts for doing generative testing. The goal is to validate the entire system through automated simulation, finding bugs before production, validating scalability with 10,000+ users, and checking correctness of graph algorithms and economic incentives.

We should be able to generate a bunch of user actions and run them through the sdk (using the same setup we're currently using for the integration-tests), just as a smoke test to see if anything catches fire.

Here's what I'm imagining:
  - Hardcode a JSON data structure describing a "universe".
    - A universe has a few "domains": politics, crypto, religion, music, climate, technology.
    - Each domain has various "positions": politics might have left/right/centre, crypto might have Bitcoin/Ethereum/Solana, religion might have Christian/Jewish/atheist/agnostic, etc.
    - Domains can be spectrum-based (politics: economic/social axes), categorical (religion), or multidimensional (technology: centralization/privacy/innovation axes).
    - For each position, generate 3-5 statements at different specificity levels: core position, detailed elaboration, nuanced variations, coalition statements ("I support either A or B"), commonality statements (finding common ground).
  - The script should take a .env file containing an OpenRouter API key (to be used for tasks requiring LLM-level intelligence).
  - The script should have a way to generate some number of users. Each has an Ethereum address and private key, as well as some (randomly-generated) data describing their interests (do they care about each domain or not?) and their position on each domain they care about. Users have engagement levels (lurker/casual/active/power-user), wealth distribution (power law), and trust networks for delegation. Generate realistic correlations (e.g., political positions correlate with crypto positions). (Once generated, keep the user descriptions around in a JSON file; we may occasionally blow them away and start over, but sometimes we'll want to be able to perform further actions using these users.)
  - The script should have a way to generate some number of implication attesters. These are also just an Ethereum account, but they don't do normal user actions, their job is just to make implication attestations. Different attester types: neutral (primary, threshold 0.8), strict (0.95), lenient (0.6), biased (political lens), malicious (for testing robustness).
  - The script should have a way to generate a large number of simulated user actions. Use behavior-driven action generation: different user types have different probability distributions for each action type (e.g., power users more likely to create statements/delegate). Actions include:
    - Statement actions: create (representing predefined positions or variations), sign, unsign, express disbelief
    - Implication actions: request evaluation from attester (using OpenRouter for AI-based S1→S2 evaluation), publish attestation
    - Funding actions: create project, attest project alignment, purchase tokens, create/fulfill secondary market orders, burn tokens (investor→donor), withdraw funds
    - Delegation actions: create note, delegate note (to users in trust network), revoke delegation, spend note, split/merge notes
  - Run test scenarios at multiple scales: small (10-100 users, basic functionality), medium (100-1000, realistic diversity), large (1000+, viral growth), plus attack scenarios (Sybil, malicious attester, spam, commission exploitation) and edge cases (empty statements, circular references, zero-value operations).
  - Validate invariants: contract state consistency, graph algorithm correctness (BFS with visited set for implication chains), economic conservation (no value creation/destruction except burns), indexer consistency (direct/indirect support calculations correct).
  - Track metrics: gas usage per action type (mean/p95/p99/max), indexer query response times, graph algorithm execution times, coverage (% of contract functions/state transitions exercised), statistical properties (validate belief distributions, statement popularity follows power law, delegation chain lengths), security (damage quantification from attack scenarios).
  - Persist test artifacts to JSON: universe.json (domains/positions), users.json (profiles/keys), attesters.json (configurations), statements.json (generated content), actions.json (action log), state snapshots, test results.

## Current progress

There's an early attempt at fake-data generation in hardhat/fake-data-generation, but I don't know how well it works or how complete it is; it'd be reasonable to blow it away and start over.
