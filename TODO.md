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

### Progress So Far

**Phase 3 (runSimulation.js) - COMPLETED:**
- Removed `deployContracts()` and added `loadContracts()` to read addresses from `.env`
- Replaced ethers with viem for all contract interactions
- Added viem-style SDK wrapper functions inline (believeStatement, disbelieveStatement, attestImplication, attestAlignment)
- Updated `fundUsers()` to use viem instead of ethers
- Added local `hardhat` chain definition to avoid importing from viem/chains (which triggers hardhat)
- Added ABIs for Pubstarter, AssuranceContract, ERC1155SecondaryMarket, and DelegatableNotes

**Supporting files already updated (no more ethers imports):**
- `generateUsers.js` - uses viem for HD wallet
- `generateStatements.js` - uses viem for keccak256
- `generateAttesters.js` - uses viem for wallet generation
- `utils.js` - uses viem for encoding/decoding

**Phase 5 (attackScenarios.js) - COMPLETED:**
- Removed hardhat/ethers imports and replaced with viem
- Added viem `createTestClients` function inline
- Added `believeStatement` and `attestImplication` helper functions inline
- Replaced `ethers.Wallet.createRandom()` with `privateKeyToAccount`
- Replaced `ethers.parseEther` with viem `parseEther`
- Replaced contract `.connect()` calls with viem `writeContract`
- Simplified `commissionExploitationAttack` (removed complex project querying)

### What's Blocking Testing

The **main blocker** was `fundingAndDelegationActions.js` which still imports from hardhat. This has been **resolved in Phase 4**.

**Files that also needed refactoring (in order):**
1. `fundingAndDelegationActions.js` - has hardhat imports (Phase 4) - DONE
2. `attackScenarios.js` - likely has hardhat imports (Phase 5) - DONE
3. `invariantChecker.js` - likely has hardhat imports (Phase 6)

### Next Steps for LLM

1. Refactor `fundingAndDelegationActions.js` to:
   - Remove `import hre from 'hardhat'`
   - Replace `ethers.Wallet` with viem `privateKeyToAccount`
   - Replace `ethers.getContractAt` with viem `getContract`
   - Replace `ethers.parseEther` with viem `parseEther`
   - Replace `ethers.ZeroAddress` with `zeroAddress` from viem
   - Use SDK actions where available (see `sdk/src/actions/`)

2. Then refactor `attackScenarios.js` and `invariantChecker.js` similarly

3. Test with `node runSimulation.js`

### Contract Addresses

Make sure `.env` has these (already added to `.env`):
```
RPC_URL=http://localhost:8545
BELIEFS_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
IMPLICATIONS_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
DELEGATABLE_NOTES_CONTRACT_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
PUBSTARTER_ADDRESS=0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
```

### SDK Actions Available
See `sdk/src/actions/` for available SDK functions:
- `conceptspace-actions.ts` - believeStatement, disbelieveStatement, attestImplication
- `funding-portals-actions.ts` - attestAlignment
- `pubstarter-actions.ts` - createProject, buyProjectTokens, etc.
- `delegation-actions.ts` - depositETH, delegateNote, revokeNote

### Tasks

#### Phase 1: Setup (30 min)
- [X] 1.1 Add SDK as dependency to fake-data-generation/package.json
- [X] 1.2 Add dotenv for reading .env file
- [X] 1.3 Create shared contract address loading logic

#### Phase 2: Refactor generateUsers.js (15 min)
- [X] 2.1 Replace ethers with SDK createTestClients
- [X] 2.2 Keep generation logic (no contract interaction)

#### Phase 3: Refactor runSimulation.js (1.5 hrs)
- [X] 3.1 Remove deployContracts() - just read addresses from .env
- [X] 3.2 Replace setBelief/setBeliefsInBatch calls with SDK
- [X] 3.3 Replace attestImplication calls with SDK  
- [X] 3.4 Replace attestAlignment calls with SDK
- [X] 3.5 Update fundUsers to use viem instead of ethers

#### Phase 4: Refactor fundingAndDelegationActions.js (1 hr)
- [X] 4.1 Replace createProject with SDK action
- [X] 4.2 Replace purchaseFromPrimaryMarket with SDK action
- [X] 4.3 Replace createSecondaryMarketListing with SDK action
- [X] 4.4 Replace fulfillSaleListing with SDK action
- [X] 4.5 Replace withdraw with SDK action
- [X] 4.6 Replace depositToNote with SDK action
- [X] 4.7 Replace delegateNote with SDK action
- [X] 4.8 Replace revokeDelegation with SDK action

#### Phase 5: Refactor attackScenarios.js (30 min)
- [X] 5.1 Replace setBelief calls with SDK
- [X] 5.2 Replace attestImplication calls with SDK

#### Phase 6: Refactor invariantChecker.js (15 min)
- [X] 6.1 Replace ethers contract calls with SDK

#### Phase 7: Testing (30 min)
- [X] 7.1 Update dev.sh to run npm install once
- [X] 7.2 Test ./dev.sh --seed=large works
- [X] 7.3 Verify .env is read correctly

**Phase 7 completed with fixes:**
- Fixed viem 2.x API changes in invariantChecker.js (getBalance, zeroPadValue)
- Fixed generateUsers.js to store privateKey separately (viem 2.x doesn't expose privateKey on account object)
- Fixed hardhat account derivation to use known private keys for first 6 accounts, random for others
- Simulation runs successfully with `--use-hardhat-accounts` flag

**Remaining issues (pre-existing):**

1. **Contract address query failures** (`invariantChecker.js`):
   - Error: "Address is invalid" - happens when querying beliefs for certain addresses
   - Error: "CONTRACT_ADDRESS_QUERY_FAILED" for `assuranceContract` and `erc1155SecondaryMarket`
   - These contracts may not be deployed or have different address keys in the `contracts` object

2. **Economic conservation check fails** (`invariantChecker.js`):
   - Error: "Cannot mix BigInt and other types, use explicit conversions"
   - Likely in the transfer validation logic around line 230-240 where it compares balances

3. **BigInt serialization** (`runSimulation.js:700`):
   - `JSON.stringify` fails on BigInt values when saving results
   - Need to add a replacer function or convert BigInt to strings before stringify

**To debug these:**
```bash
cd fake-data-generation
npm run gen:large -- --use-hardhat-accounts
```

The invariant checker code is in `invariantChecker.js` - look for `checkContractStateConsistency`, `checkEconomicConservation`, and the `saveResults` function in `runSimulation.js`.

### Notes
- SDK already has most needed actions in conceptspace-, delegation-, and pubstarter-actions
- May need to add missing SDK actions (e.g., getBalance wrapper)
- Use `http://localhost:8545` for RPC instead of hardhat runtime
