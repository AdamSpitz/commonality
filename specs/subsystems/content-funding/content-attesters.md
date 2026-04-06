# Content Attesters

AI services that evaluate content and publish quality attestations. Structurally almost identical to the [implication attester](../conceptspace/implication-attester-ai.md) — same architecture, different prompt.

A generalized attester framework (shared between implication attesters and content attesters) is a natural evolution — the architecture is identical and only the prompts differ — but it's not needed for the MVP. Build the content attester as a standalone service first, then extract the common framework when the pattern is proven and a third attester type emerges.

## Architecture

- Standalone Express service with its own Ethereum key
- Same payment model (x402, cost-plus) as the implication attester
- Same on-chain output: publishes attestations
- Different LLM prompt: evaluates content against criteria specific to the use case

## Input/output

**Input:**
- The content (URL, pasted text, or IPFS CID)
- Declared context (e.g., "this is from a left-wing perspective" — optional, depends on use case)
- Evaluation criteria reference (which attester profile to use)

**Output:**
- Boolean attestation with confidence score
- Explanation (stored on IPFS)
- On-chain attestation record

## Multiple attesters with different standards

In practice, multiple attester services will exist with different criteria and calibrations. Users choose which attesters they trust, just as with implication attesters. Different attesters having different standards is fine and expected — that's how the system is designed to work.

For example, in the [noninflammatory content](noninflammatory-content/) use case, there might be a left-leaning attester and a right-leaning one, each trusted by their respective side. Cross-partisan attestation carries extra weight where it happens naturally, but it doesn't need to be engineered.

## Attestation contract

`AlignmentAttestations.sol` uses `bytes32 subjectId`, which can represent either:

- An Ethereum address (left-padded: `bytes32(uint256(uint160(addr)))`) — for attesting about projects, users, or assurance contracts
- A content ID hash (`keccak256("twitter:uid:12345678:18347")`) — for attesting about individual content items

One contract handles both use cases. The content attester service passes the content ID hash directly as the subject, using the same content ID scheme as the [content registry](content-registry.md). This means a content item can be attested as noninflammatory (or whatever the criteria) at the individual-item level, not just at the contract level.

## Use-case-specific criteria

The attester framework is general; what makes it specific to a use case is the LLM prompt and evaluation criteria. See individual use case specs (e.g., [noninflammatory-content](noninflammatory-content/)) for specific criteria.
