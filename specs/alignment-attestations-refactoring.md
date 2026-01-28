# AlignmentAttestations Refactoring

This document specifies the refactoring of `ProjectAlignment` to `AlignmentAttestations` - generalizing it for any kind of alignment attestation, not just projects.

## Motivation

Per [decoupling.md](decoupling.md), the alignment attestation system should be generalized so it can be used for any subject, not just project addresses. This enables:
- Alignment attestations for user addresses (e.g., "this user is aligned with this cause")
- Alignment attestations for statements themselves (e.g., "this statement aligns with this topic")
- Future use cases we haven't thought of yet

## Summary of Changes

### Naming Changes

| Current | New |
|---------|-----|
| `ProjectAlignment` (contract) | `AlignmentAttestations` |
| `ProjectAlignmentAttestation` (event) | `AlignmentAttestation` |
| `projectAddress` (parameter) | `subjectAddress` |
| `project-alignment/` (directory) | `alignment-attestations/` |
| `ProjectAlignmentAbi` (ABI files) | `AlignmentAttestationsAbi` |

### Semantic Changes

1. **Make `topicStatementId` required (non-zero)**
   - Current: `topicStatementId` can be `bytes32(0)` for "no topic"
   - New: `topicStatementId` must be non-zero; every attestation belongs to a topic
   - Rationale: If topicStatementId is optional, indexers can't reliably filter by topic. Every attestation should explicitly declare its topic. If someone wants a "general" topic, they can create a statement for that.

2. **Update error messages** to reflect generalization (e.g., "Invalid subject address" instead of "Invalid project address")

## Files to Modify

This list may be incomplete; use your judgment when implementing.

### Contract Layer
- [ ] `hardhat/contracts/project-alignment/ProjectAlignment.sol` → `hardhat/contracts/alignment-attestations/AlignmentAttestations.sol`
  - Rename contract `ProjectAlignment` → `AlignmentAttestations`
  - Rename event `ProjectAlignmentAttestation` → `AlignmentAttestation`
  - Rename parameter `projectAddress` → `subjectAddress` (in event, functions, mappings)
  - Add require for non-zero `topicStatementId`
  - Update comments and error messages

### Tests
- [ ] `hardhat/test/ProjectAlignment.test.js` → `hardhat/test/AlignmentAttestations.test.js`
  - Update all references
  - Add tests for topicStatementId being required (should revert on zero)
  - Update existing tests that passed zero for topicStatementId

### Indexer
- [ ] `indexer/abis/ProjectAlignmentAbi.ts` → `indexer/abis/AlignmentAttestationsAbi.ts`
- [ ] `indexer/abis/ProjectAlignmentAbi.js` → `indexer/abis/AlignmentAttestationsAbi.js`
- [ ] `indexer/schemas/fundingportal.schema.ts` - Update table/column names if needed
- [ ] `indexer/src/fundingportal/index.ts` - Update event handler references
- [ ] `indexer/ponder.config.ts` - Update contract references
- [ ] `indexer/scripts/sync-abis.ts` - Update ABI sync paths

### SDK
- [ ] `sdk/src/abis.ts` - Update ABI imports and exports
- [ ] `sdk/src/actions/funding-portals-actions.ts` - Update function names and parameters
- [ ] `sdk/src/actions/index.ts` - Update exports
- [ ] `sdk/src/queries/funding-portals-queries.ts` - Update query references
- [ ] `sdk/src/graphql-queries/funding-portals.ts` - Update GraphQL queries
- [ ] `sdk/src/graphql-queries/index.ts` - Update exports
- [ ] `sdk/src/graphql-server/schema/type-defs.ts` - Update type definitions
- [ ] `sdk/src/graphql-server/schema/resolvers/funding-portals.ts` - Update resolvers

### Integration Tests
- [ ] `integration-tests/src/fundingportal/fundingportal-alignment.test.ts`
- [ ] `integration-tests/src/fundingportal/fundingportal-indirect-alignment.test.ts`
- [ ] `integration-tests/src/fundingportal/fundingportal-aggregated-metrics.test.ts`
- [ ] `integration-tests/src/fundingportal/fundingportal-leaderboards.test.ts`
- [ ] `integration-tests/src/workflows/end-to-end-workflows.test.ts`
- [ ] `integration-tests/src/actions/alignment-action-properties.ts`
- [ ] `integration-tests/src/actions/alignment-actions-checked.ts`
- [ ] `integration-tests/src/utils/graphql-helpers.ts`
- [ ] `integration-tests/src/utils/invariants.ts`

### Other
- [ ] `hardhat/scripts/deploy-local.js` - Update deployment references
- [ ] `hardhat/integration-test-helpers.js` - Update helper references
- [ ] `hardhat/fake-data-generation/runSimulation.js` - Update simulation code
- [ ] `hardhat/contracts/delegation/NoteIntent.sol` - Check if it references ProjectAlignment

### Documentation/Specs
- [ ] `specs/README.md` - Update references
- [ ] `specs/fundingportals.md` - Update references
- [ ] `specs/indexers.md` - Update references
- [ ] `specs/legal.md` - Update references
- [ ] `specs/decoupling.md` - Update references, mark this refactoring as done
- [ ] `progress.txt` - Clear/update notes

## Implementation Order

1. **Contract rename and semantic changes** - Start with the Solidity contract since it's the source of truth
2. **Regenerate ABIs** - Run `npm run sync-abis` in indexer
3. **Update tests** - Fix hardhat tests to pass with new contract
4. **Update indexer** - Update schema, handlers, config
5. **Update SDK** - Update actions, queries, types
6. **Update integration tests** - Fix all integration test references
7. **Update other files** - Deploy scripts, helpers, fake data generation
8. **Update documentation** - Specs and README files
9. **Final verification** - Run all tests (`npm test` in hardhat, integration tests)

## Breaking Changes

This is a breaking change for:
- Any deployed contracts (will need redeployment)
- Any code depending on the SDK's `attestProjectAlignment` function names
- Any indexer databases (will need re-indexing)
- Any GraphQL clients using `projectAddress` field names

Since this project is not yet in production, these breaking changes are acceptable.

## Notes

- The name `AlignmentAttestations` (plural) was chosen over `Alignment` because:
  - "Alignment" alone is too generic and hard to grep for
  - The plural emphasizes that this contract stores multiple attestations
  - It parallels other attestation-style contracts we might have

- `subjectAddress` was chosen over alternatives like `targetAddress` because:
  - "Subject" clearly indicates "the thing being attested about"
  - It's neutral enough to apply to projects, users, or any address
