# What we've been working on lately

Main thing I want to work on next:
  - Fake Data Generation Refactoring (see below).

Other big things to do soon:
  - Honestly, it kinda seems like we might be ready to deploy the conceptspace stuff? (We don't have UIs yet for the other major subsystems.) But I'm uneasy, because this whole project was built mostly by LLMs, and I don't quite feel confident that I understand what's in it or whether it works or not.
    - Can I try out conceptspace manually? e.g. Start up docker-compose locally, maybe do some fake-data generation to populate the system with a bunch of data, and then look at the UI through my web browser?
  - ?

## Issues Found: setBelief / UI Query Problems

### Issue 1: setBelief points to statements with no content

When the simulation generates `setBelief` or `setBeliefsInBatch` actions, it uses statementIds derived from `keccak256(JSON.stringify(content))` in `fake-data-generation/generateStatements.js:17`. These are never actually published to IPFS, so when the indexer processes the DirectSupport events:

- It creates statement placeholder records in the database (see `indexer/src/conceptspace/index.ts:35-60`)
- The IPFS sync job tries to fetch content but nothing exists at the derived CID
- Results in empty/placeholder statements with no actual content

**Impact**: Even though beliefs ARE being recorded, the statements have no content to display.

**Fix options**:
1. Have the simulation actually publish statements to IPFS before calling setBelief
2. Use real IPFS CIDs from the start
3. Add sample statements directly to the indexer database (not via IPFS)

---

### Issue 2: UI queries don't exist in GraphQL schema

The UI at `ui/src/conceptspace/pages/BrowseStatementsPage.tsx:50-51` queries:
- `browseStatementsByMostSupporters`
- `browseStatementsByNewest`

But these queries don't exist in the Ponder-generated GraphQL schema. The available queries are only:
- `statements(id)` - get single statement
- `statementss(...)` - paginated list (note double 's')

**Impact**: The Browse Statements page fails to load any data because the queries are invalid.

**Fix options**:
1. Update UI to query `statementss` with appropriate filters (orderBy believerCount for "most supporters", orderBy createdAt for "newest")
2. Add custom GraphQL resolvers to indexer for `browseStatementsByMostSupporters` and `browseStatementsByNewest`

---

## Miscellaneous TODO.md files

- [ui/TODO.md](ui/TODO.md)

---

## Fake Data Generation Refactoring

### Goal
Refactor fake-data-generation to use the SDK and read contract addresses from `.env`, removing dependency on hardhat runtime.

### Tasks

#### Phase 1: Setup (30 min)
- [X] 1.1 Add SDK as dependency to fake-data-generation/package.json
- [X] 1.2 Add dotenv for reading .env file
- [X] 1.3 Create shared contract address loading logic

#### Phase 2: Refactor generateUsers.js (15 min)
- [X] 2.1 Replace ethers with SDK createTestClients
- [X] 2.2 Keep generation logic (no contract interaction)

#### Phase 3: Refactor runSimulation.js (1.5 hrs)
- [ ] 3.1 Remove deployContracts() - just read addresses from .env
- [ ] 3.2 Replace setBelief/setBeliefsInBatch calls with SDK
- [ ] 3.3 Replace attestImplication calls with SDK  
- [ ] 3.4 Replace attestAlignment calls with SDK
- [ ] 3.5 Update fundUsers to use viem instead of ethers

#### Phase 4: Refactor fundingAndDelegationActions.js (1 hr)
- [ ] 4.1 Replace createProject with SDK action
- [ ] 4.2 Replace purchaseFromPrimaryMarket with SDK action
- [ ] 4.3 Replace createSecondaryMarketListing with SDK action
- [ ] 4.4 Replace fulfillSaleListing with SDK action
- [ ] 4.5 Replace withdraw with SDK action
- [ ] 4.6 Replace depositToNote with SDK action
- [ ] 4.7 Replace delegateNote with SDK action
- [ ] 4.8 Replace revokeDelegation with SDK action

#### Phase 5: Refactor attackScenarios.js (30 min)
- [ ] 5.1 Replace setBelief calls with SDK
- [ ] 5.2 Replace attestImplication calls with SDK

#### Phase 6: Refactor invariantChecker.js (15 min)
- [ ] 6.1 Replace ethers contract calls with SDK

#### Phase 7: Testing (30 min)
- [ ] 7.1 Update dev.sh to run npm install once
- [ ] 7.2 Test ./dev.sh --seed=large works
- [ ] 7.3 Verify .env is read correctly

### Notes
- SDK already has most needed actions in conceptspace-, delegation-, and pubstarter-actions
- May need to add missing SDK actions (e.g., getBalance wrapper)
- Use `http://localhost:8545` for RPC instead of hardhat runtime
