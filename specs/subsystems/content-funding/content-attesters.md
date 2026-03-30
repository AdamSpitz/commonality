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

For example, in the [noninflammatory content](noninflammatory-content.md) use case, there might be a left-leaning attester and a right-leaning one, each trusted by their respective side. Cross-partisan attestation carries extra weight where it happens naturally, but it doesn't need to be engineered.

## Attestation contract

The existing `AlignmentAttestations.sol` identifies subjects by `address`, but content items don't have Ethereum addresses. Options:

- **Generalize**: Change `address subjectAddress` to `bytes32 subjectId` in `AlignmentAttestations`, allowing it to identify subjects by address (left-padded) or content hash. One contract for both use cases.
- **Specialize**: Create a new `ContentAttestations.sol` purpose-built for content items. Avoids touching the existing contract but introduces near-duplicate code.

For the MVP (where the "subject" is the creator's assurance contract address), the existing contract works as-is. This question only matters when/if we want to attest about individual content items directly.

## Use-case-specific criteria

The attester framework is general; what makes it specific to a use case is the LLM prompt and evaluation criteria. See individual use case specs (e.g., [noninflammatory-content.md](noninflammatory-content.md)) for specific criteria.
