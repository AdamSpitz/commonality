# Testing the Indexer

## Manual Testing (Recommended Starting Point)

The best way to verify the indexer works is to test it manually before writing automated tests.

### Prerequisites

1. **Install dependencies**:
   ```bash
   cd hardhat && npm install
   cd ../indexer && npm install
   ```

2. **Compile contracts**:
   ```bash
   cd hardhat
   npm run build
   ```

3. **Sync ABIs to indexer**:
   ```bash
   cd indexer
   npm run sync-abis
   ```

### Manual Testing Workflow

**Terminal 1 - Start Hardhat Node**:
```bash
cd hardhat
npx hardhat node
```

This starts a local blockchain on http://localhost:8545

**Terminal 2 - Deploy Contracts**:
```bash
cd hardhat
npx hardhat run scripts/deploy-local.js --network localhost
```

This will output contract addresses like:
```
Beliefs: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Implications: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
...
```

**Terminal 3 - Configure and Start Indexer**:

First, create or update `indexer/.env.local` with the deployed contract addresses:
```bash
cd indexer
cat > .env.local << EOF
PONDER_RPC_URL_31337=http://localhost:8545
BELIEFS_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
IMPLICATIONS_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
# Add other contract addresses as needed...
EOF
```

Then start the indexer:
```bash
npm run dev
```

The indexer will:
- Start syncing events from the blockchain
- Provide a GraphQL API at http://localhost:42069/graphql
- Show a UI at http://localhost:42069

**Terminal 4 - Interact with Contracts**:

Use the Hardhat console to perform actions:
```bash
cd hardhat
npx hardhat console --network localhost
```

Then in the console:
```javascript
// Get contract instances
const Beliefs = await ethers.getContractFactory('Beliefs');
const beliefs = Beliefs.attach('0x5FbDB2315678afecb367f032d93F642f64180aa3');

// Get signers
const [user1, user2] = await ethers.getSigners();

// Create a statement CID (mock - using keccak256 hash)
const statementCID = ethers.keccak256(ethers.toUtf8Bytes('Climate change is real'));

// User expresses belief
await beliefs.connect(user1).setBelief(statementCID, 1); // 1 = BELIEVES

// Check the transaction went through
console.log('Belief set!');
```

**Browser - Query the Indexer**:

Open http://localhost:42069/graphql in your browser.

Try queries like:
```graphql
query {
  statements {
    items {
      id
      cid
      believerCount
      disbelieverCount
    }
  }
}
```

```graphql
query {
  beliefs {
    items {
      user
      statementId
      beliefState
    }
  }
}
```

### What to Look For

✅ **Success indicators**:
- Indexer syncs to the latest block without errors
- GraphQL queries return the data you just created
- believerCount/disbelieverCount update correctly
- No errors in the indexer logs

❌ **Problems to watch for**:
- Indexer can't connect to Hardhat node
- Events aren't being indexed
- GraphQL schema doesn't match your queries
- IPFS sync errors (expected for mock CIDs - see indexer/IPFS_SYNC_README.md)

## Automated Testing (Future)

Once manual testing works smoothly, you can build automated tests.

### Available Helper Library

The file [hardhat/integration-test-helpers.js](hardhat/integration-test-helpers.js) provides reusable functions for:
- Deploying contracts
- Creating users and statements
- Performing belief/implication/delegation actions
- Starting/stopping the indexer programmatically
- Querying GraphQL

### Writing Simple Tests

Here's a minimal test example:

```javascript
// File: hardhat/simple-test.js
import { TestHelpers } from './integration-test-helpers.js';

async function simpleTest() {
  const helpers = new TestHelpers();

  // Deploy contracts
  await helpers.deployContracts();

  // Create users
  await helpers.createUsers(2);

  // Create a statement
  const stmt = helpers.createStatementCID({ title: 'Test' });

  // User expresses belief
  await helpers.userBelieves(helpers.getUser(0), stmt);

  // Start indexer and wait for sync
  await helpers.startIndexer();
  await helpers.waitForIndexerSync();

  // Query
  const statement = await helpers.getStatement(stmt);
  console.log('Believer count:', statement.believerCount);

  // Cleanup
  await helpers.stopIndexer();
}

simpleTest().catch(console.error);
```

Run it with:
```bash
cd hardhat
npx hardhat run simple-test.js --network localhost
```

## Next Steps

1. **Get manual testing working first** - This builds confidence
2. **Write 1-2 simple automated tests** - Keep them focused and simple
3. **Add more tests incrementally** - Build up coverage over time
4. **Keep it simple** - Don't over-engineer the test infrastructure

Remember: Manual testing in GraphQL Playground is often faster than writing automated tests during development.
