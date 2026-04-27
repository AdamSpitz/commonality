# AI Critique: Large-Scale Data Generation and Analysis
**Date:** Tuesday, March 31, 2026

## Analysis of the Fake-Data System
The `fake-data-generation` subsystem is a sophisticated **Agent-Based Simulation**. It doesn't just generate random rows; it simulates a living ecosystem.
*   **Persona-Driven:** Users have "Engagement Levels" (Lurker to Power User) and "Wealth" (Power Law distribution).
*   **Logic-Driven:** Implication attestations use LLMs (Claude 3.5 Haiku) to ensure the network of statements makes sense.
*   **Action-Weighted:** It simulates a mix of voting, delegating, and funding based on realistic probabilities.

---

## Strategy for "A LOT of Data"

To spin up a massive local deployment for heavy data analysis, follow this plan:

### 1. Pre-Generation (The "Expensive" Part)
The bottleneck for large data is the LLM evaluation of implications.
*   **Action:** Run `npm run gen:attestations 500` once. This will pre-calculate 500 implication pairs per domain using the LLM and save them to `data/attestations.json`.
*   **Reason:** This avoids API timeouts and costs during the actual blockchain simulation.

### 2. High-Volume Simulation
Run the simulation with 500+ users and 20+ rounds.
*   **Command:** `cd hardhat && npx ts-node ../fake-data-generation/runSimulation.ts 500 20`
*   **Scaling Tip:** Increase the Hardhat `blockGasLimit` in `hardhat.config.cjs` if you see "Block full" errors during high-volume batch transactions.

### 3. Data Analysis Opportunities
Once the local chain is populated with thousands of events, you can analyze:
*   **Gini Coefficient of Funding:** Does the "Power Law" wealth distribution lead to centralized funding, or does **Delegation** effectively redistribute influence?
*   **Commonality Discovery Rate:** How many rounds does it take for the "Commonality" statements to gather more support than the original polarized statements?
*   **Sybil Resilience:** Run the simulation with the `--attacks` flag to see if your analysis can detect the 30-user Sybil attack in the `events` log.

---

## What to Watch Out For (Tricky Parts)

1.  **The "Hardhat Path" Requirement:**
    *   *Issue:* The scripts **must** be run from the `hardhat/` directory. If you run them from the root or `fake-data-generation/`, they will fail to find contract artifacts.
    *   *Fix:* We should add a check in `loadEnv.ts` that warns the user if `process.cwd()` is not the Hardhat directory.

2.  **IPFS Bottleneck:**
    *   *Issue:* The simulation uploads every statement to IPFS. At 1000+ statements, this can get slow or trigger rate limits on public gateways.
    *   *Fix:* Use the `mock-ipfs.ts` utility in the SDK for ultra-large-scale local testing, or run a local IPFS node (which the `scripts/services.sh` script already supports).

3.  **Implication Explosion:**
    *   *Issue:* As the number of statements (N) grows, the possible implication pairs grow at O(N^2).
    *   *Fix:* The `universe.json` logic should be restricted to only compare statements within the same "Domain" to keep the complexity manageable.

## Summary
The fake-data system is already "data scientist ready." By leveraging the pre-generated attestations and running the simulation from the correct directory, you can generate a rich, multi-layered dataset that is perfect for testing graph analyses, Sybil detection algorithms, and social-choice theories.
