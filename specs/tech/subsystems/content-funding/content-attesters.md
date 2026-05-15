# Content Attesters

AI services that evaluate content and publish quality attestations. Structurally almost identical to the [implication attester](../conceptspace/implication-attester-ai.md) — same architecture, different prompt.

With the noninflammatory content attesters (neutral, left-evaluating-right, right-evaluating-left) joining the existing implication attester, we now have enough concrete attester types to justify extracting the shared infrastructure into a common library.

## Shared attester library (`attester-core/`)

The plan is to extract the infrastructure that's identical across all attesters into a shared library, keeping each attester type as a thin service that provides its specific prompt, contract interaction, and input/output shape.

**Shared (attester-core):** Express server setup, health/status endpoints, x402 payment validation and cost-plus pricing, rate limiting, error classification, IPFS read/write, OpenRouter LLM call wrapper, config structure.

**Per-attester-type (pluggable):** LLM prompt, which contract to call (Implications vs. AlignmentAttestations), input shape (two CIDs for implications vs. content + optional perspective for content attesters), response schema (content attesters return `dimensions` that implication attesters don't).

The existing `attester/` (implication attester) gets refactored to import from `attester-core/`. The new `content-attester/` service also imports from `attester-core/`. Each noninflammatory content attester instance (neutral, left, right) is the same `content-attester/` code deployed with different config (different prompt, different Ethereum key).

## Architecture

- Standalone Express service with its own Ethereum key
- Same payment model (x402, cost-plus) as the implication attester
- Same on-chain output: publishes positive alignment attestations
- Different LLM prompt: evaluates content against criteria specific to the use case

The default `content-attester/` service is stateless. It is appropriate for long-form/self-contained content and for social posts where local context (parent, quote, thread, author-recent items) is enough. It is not meant to reconstruct ambient discourse from scratch on each request. When a content item's meaning depends on what a particular community has been arguing about recently, use a stateful [beat agent](noninflammatory-content/beat-agents.md) or return a non-publishable insufficient-context result instead of guessing.

## Input/output

**Input:**
- The content (URL, pasted text, or IPFS CID)
- Declared context (e.g., "this is from a left-wing perspective" — optional, depends on use case)
- Evaluation criteria reference (which attester profile to use)

**Output:**
- Boolean decision with confidence score for the stateless content-attester API
- Explanation (stored on IPFS)
- On-chain attestation record only for positive, sufficiently confident decisions

Beat agents are a sibling content-attestation service type with a three-valued decision (`positive`, `negative`, `abstain`). Their positive decisions produce the same on-chain `AlignmentAttestation` records as stateless content attesters; negative and abstain decisions are useful operator/demand signals but do not publish positive alignment attestations.

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
