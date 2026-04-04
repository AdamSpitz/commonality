# AI Critique: System Design and Architectural Review
**Date:** Tuesday, March 31, 2026

## Overview of System Design

The Commonality system is a modular, event-driven architecture designed to facilitate the decentralized funding of public goods. It is structured into four primary layers:

1.  **Smart Contracts (Hardhat):** The source of truth. They emit events for all state changes (beliefs, implications, delegations, funding).
2.  **Indexer (Ponder):** A "dumb" event cache. It listens to the blockchain and stores raw events in a relational database. It does *not* perform complex business logic.
3.  **SDK (TypeScript):** The brain of the system. It fetches raw events from the indexer and uses "fold" functions to compute the current state (e.g., calculating a user's current belief or the total support for a statement).
4.  **UI (React/Vite):** The presentation layer. It uses the SDK to display data and the user's wallet to submit transactions.

---

## Subsystem Breakdown

### 1. Concept Space (`Beliefs.sol`, `Implications.sol`)
*   **Purpose:** Allows users to express beliefs in "statements" (IPFS CIDs) and links statements via implications.
*   **Design:**
    *   **Beliefs:** Tracks `BELIEVES`, `DISBELIEVES`, or `NO_OPINION`.
    *   **Implications:** Unidirectional arrows (`S1 -> S2`) created by attesters. Crucially, these are **non-transitive** to prevent "logical drift."
    *   **Logic:** The SDK computes "Indirect Support" by finding all statements `S_any` that imply `S_target` and summing the unique believers of `S_any`.

### 2. Pubstarter (`AssuranceContract.sol`, `ERC1155.sol`)
*   **Purpose:** A crowdfunding mechanism for projects.
*   **Design:**
    *   Uses **Assurance Contracts** (threshold-based funding).
    *   Contributors receive **ERC1155 tokens** (NFTs/SFTs). These tokens represent "social recognition" and are resellable, enabling a **Retroactive Funding** market.

### 3. Delegation (`DelegatableNotes.sol`, `NoteIntent.sol`)
*   **Purpose:** Solves the "laziness problem" by allowing users to delegate ETH/tokens to trusted experts.
*   **Design:**
    *   **Notes:** Users deposit funds into "notes."
    *   **ChainHash:** Instead of storing a full linked list on-chain, notes store a `chainHash = keccak256(leaf, parentHash)`. To perform operations, the caller provides the full array of addresses, which the contract verifies against the hash.
    *   **Intent:** `NoteIntent.sol` allows anyone to attest that a specific note *should* be spent on a specific statement, providing a signaling mechanism for project creators.

### 4. Funding Portals (`AlignmentAttestations.sol`)
*   **Purpose:** Aggregates projects that are aligned with specific statements.
*   **Design:**
    *   Attesters vouch that `Project P` is aligned with `Statement S`.
    *   The UI uses implications to show projects aligned with `S` or any statement that implies `S`.

---

## What Was Difficult to Figure Out (Documentation Gaps)

1.  **The `chainHash` Mechanism:**
    *   *Observation:* The `DelegatableNotes.sol` contract uses a recursive hash commitment for delegation. While efficient for gas, it's not immediately obvious how a developer should reconstruct the `address[] owners` array required for the `delegate` or `revoke` functions.
    *   *Fix:* We should update the `delegation/README.md` or the SDK documentation to explicitly explain how the indexer tracks `NoteDelegated` events to allow the SDK to reconstruct these chains for the user.

2.  **Indexer vs. SDK Responsibility:**
    *   *Observation:* Usually, Ponder indexers compute the "final state" in their `ponder.on` handlers. Commonality intentionally keeps the indexer "dumb" and moves the "fold" logic to the SDK.
    *   *Fix:* The root `README.md` or an `ARCHITECTURE.md` should explicitly state this "Client-Side Folding" pattern, as it's a departure from standard indexing patterns.

3.  **Non-Transitive Implications in the UI:**
    *   *Observation:* The specs emphasize that implications are non-transitive, but the SDK `getIndirectSupporters` logic only looks one level deep.
    *   *Fix:* Clarify if there is a plan for "Discovery" services that might suggest *adding* a direct implication if a clear chain `A -> B -> C` exists, to keep the system clean but functional.

## Summary of Strengthening Suggestions

*   **Trust Tiers for Attesters:** The system relies heavily on "Trusted Attesters." The design would be strengthened by a "Trust Score" or "Social Graph" integration where my view of the world is filtered by the people I follow.
*   **Automated Intent Matching:** Use the `attester/` AI service to automatically suggest `NoteIntent` attestations for new notes based on the depositor's past behavior or stated interests.
