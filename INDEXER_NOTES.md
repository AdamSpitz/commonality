# Indexer Implementation Notes

## What's Here and Why

This document describes the current state of the indexer implementation after cleanup.

### Core Indexer Components (KEEP - High Value)

#### Database Schemas (`indexer/schemas/`)

Four separate schema files following a federated architecture:

1. **[conceptspace.schema.ts](indexer/schemas/conceptspace.schema.ts)** (163 lines)
   - Statements, beliefs, implications, users, attesters
   - Tracks belief states (no opinion, believes, disbelieves)
   - Proper indexes for trending queries and reverse lookups
   - **Value**: Core data model for the belief system

2. **[pubstarter.schema.ts](indexer/schemas/pubstarter.schema.ts)** (319 lines)
   - Projects (assurance contracts), tokens, contributions, refunds
   - Secondary market listings, buy orders, trades
   - Participant summaries for analytics
   - **Value**: Complete crowdfunding project lifecycle tracking

3. **[delegation.schema.ts](indexer/schemas/delegation.schema.ts)** (145 lines)
   - Delegatable notes, delegation chains, note events
   - Tracks active delegations and commission flows
   - **Value**: Delegation system with commission tracking

4. **[fundingportal.schema.ts](indexer/schemas/fundingportal.schema.ts)** (48 lines)
   - Project alignment attestations
   - Links projects to statements via attestations
   - **Value**: Cross-subsystem relationships

**Total**: ~675 lines of well-designed schemas with proper relations and indexes.

#### Event Handlers (`indexer/src/`)

Event handlers that transform blockchain events into database records:

1. **[conceptspace/index.ts](indexer/src/conceptspace/index.ts)** (227 lines)
   - DirectSupport events → belief updates
   - ImplicationAttestation events → implication records
   - Updates believerCount/disbelieverCount on statements
   - Creates user records on first interaction

2. **[pubstarter/index.ts](indexer/src/pubstarter/index.ts)** (575 lines)
   - Factory events → create project/marketplace records
   - AssuranceContractInitialized → project setup
   - ERC1155Bought → contribution tracking
   - Refund/Withdraw → project status updates
   - Secondary market events → trade tracking

3. **[delegation/index.ts](indexer/src/delegation/index.ts)** (526 lines)
   - DelegatableNoteMinted → create note records
   - DelegationChanged → update delegation chains
   - LatentCommissionChanged → track commission flows
   - Transfer → update ownership

4. **[fundingportal/index.ts](indexer/src/fundingportal/index.ts)** (41 lines)
   - ProjectAlignmentAttested → create alignment records

**Total**: ~1,400 lines of business logic

#### IPFS Integration (`indexer/src/*/utils/`)

Background jobs that fetch content from IPFS asynchronously:

- **[conceptspace/utils/ipfsSyncJob.ts](indexer/src/conceptspace/utils/ipfsSyncJob.ts)** (190 lines)
  - Fetches statement content from IPFS
  - Exponential backoff for retries
  - Parses JSON and updates database

- **[pubstarter/utils/ipfsSyncJob.ts](indexer/src/pubstarter/utils/ipfsSyncJob.ts)** (197 lines)
  - Fetches project metadata from IPFS
  - Similar retry logic

- **[IPFS_SYNC_README.md](indexer/IPFS_SYNC_README.md)** - Documentation

**Value**: Handles IPFS availability issues gracefully without blocking event indexing.

#### Configuration

- **[ponder.config.ts](indexer/ponder.config.ts)** (171 lines)
  - Contract addresses from environment variables
  - Ponder factory pattern for dynamically-created contracts
  - Separate start blocks per subsystem

- **[ponder.schema.ts](indexer/ponder.schema.ts)** (62 lines)
  - Re-exports all subsystem schemas
  - Clean federation architecture

### Test Infrastructure (SIMPLIFIED)

#### Kept

- **[hardhat/integration-test-helpers.js](hardhat/integration-test-helpers.js)** (676 lines)
  - Comprehensive helper library for writing tests
  - Contract deployment, user management, blockchain actions
  - Indexer lifecycle management (start/stop/sync)
  - GraphQL query helpers
  - **Value**: Reusable building blocks that make tests easy to write

#### Deleted

The following were removed because they were complex, unreliable, and could be easily regenerated:

- `integration-tests/` directory (entire folder)
  - README.md (437 lines)
  - QUICK_START.md (214 lines)
  - INDEXER_TESTING_GUIDE.md (389 lines)
  - README_CURRENT_STATE.md (102 lines)
  - package.json

- Test runner scripts:
  - `run-integration-tests.sh`
  - `run-integration-tests-manual.sh`
  - `check-test-status.sh`
  - `TEST-RUNNER-GUIDE.md`

- Test implementations:
  - `hardhat/integration-test-scenarios.js` (433 lines)
  - `hardhat/integration-test-generative.js` (372 lines)
  - `hardhat/run-integration-tests.js`
  - `hardhat/run-integration-tests-generative.js`

**Reason**: After a full day of debugging, these tests still didn't work reliably. The helper library makes them easy to regenerate once manual testing validates the approach.

### Custom API Endpoints (REVIEW NEEDED)

The following files implement custom REST endpoints on top of Ponder's GraphQL:

- **[api/conceptspace-api.ts](indexer/src/api/conceptspace-api.ts)** (328 lines)
- **[api/delegation-api.ts](indexer/src/api/delegation-api.ts)** (450 lines)
- **[api/fundingportal-api.ts](indexer/src/api/fundingportal-api.ts)** (571 lines)
- **[api/pubstarter-api.ts](indexer/src/api/pubstarter-api.ts)** (32 lines)

**Total**: ~1,400 lines

**Status**: KEPT but flagged for review.

**Questions**:
1. Do you actually need these custom endpoints?
2. Can Ponder's built-in GraphQL API handle your queries?
3. Are these endpoints adding value or just duplicating GraphQL functionality?

**Recommendation**: Test with GraphQL first. Only keep custom endpoints if you have specific needs they solve (like complex computed fields or federation logic that GraphQL can't handle).

## Current State Summary

### What Works
- ✅ Schema definitions are solid and well-designed
- ✅ Event handlers implement business logic correctly
- ✅ IPFS sync architecture is clever and should work
- ✅ Configuration uses best practices (factory pattern, env vars)

### What's Unknown
- ❓ Does the indexer actually run without errors?
- ❓ Do the event handlers correctly index events?
- ❓ Does the IPFS sync work as expected?
- ❓ Are the custom API endpoints necessary?

### Recommended Next Steps

1. **Manual Testing** (see [TESTING.md](TESTING.md))
   - Start Hardhat node
   - Deploy contracts
   - Start indexer
   - Perform blockchain actions
   - Query GraphQL API
   - Verify data is indexed correctly

2. **Simplify if Needed**
   - Consider removing custom API endpoints if GraphQL suffices
   - Let Ponder's built-in schema introspection guide your queries

3. **Write Simple Tests**
   - Once manual testing works, write 1-2 simple automated tests
   - Use the test helper library for reusable building blocks
   - Keep tests focused and simple

4. **Document What Actually Works**
   - Update this file with findings from manual testing
   - Document any quirks or gotchas discovered

## File Counts

### Core Indexer (High Confidence)
- Schemas: 675 lines
- Event Handlers: 1,400 lines
- IPFS Sync: 400 lines
- Config: 233 lines
- **Total: ~2,708 lines**

### Custom APIs (Review Needed)
- API Endpoints: 1,400 lines

### Test Infrastructure (Preserved)
- Helper Library: 676 lines

### Deleted
- Test scenarios, runners, docs: ~3,700 lines
- Can regenerate easily once approach is validated
