# Integration Specification

<!-- AI-generated from specs/README.md -->

This document defines the integration points between all artifacts in the Commonality system. The purpose is to allow each artifact to be built or regenerated independently without breaking other artifacts that depend on it.

## Overview

The Commonality system consists of three main subsystems:
1. **Concept Space**: For managing statements and beliefs
2. **Pubstarter**: For creating crowdfunding projects
3. **Funding Portal**: For connecting projects to statements/causes

Each subsystem has smart contracts, indexers, and UIs that need to communicate with each other.

---

## Smart Contract Events

### Concept Space Contracts

#### Beliefs Contract

**Purpose**: Tracks user beliefs about statements

**Events Emitted**:

```solidity
// Emitted when a user changes their belief about a statement
event DirectSupport(
    address indexed user,
    bytes32 indexed statementId,  // IPFS CID of the statement
    uint8 beliefState             // 0=noOpinion, 1=believes, 2=disbelieves
);
```

**State Storage**:
```solidity
// Public mapping for other contracts to read
mapping(address => mapping(bytes32 => uint8)) public beliefs;
// beliefState: 0=noOpinion (default), 1=believes, 2=disbelieves

function getBelief(address user, bytes32 statementId) external view returns (uint8);
function setBelief(bytes32 statementId, uint8 beliefState) external;
```

**Notes**:
- Defaults to `noOpinion` (0) if never set
- Stores state onchain so other contracts can query it
- Uses block timestamp, not event timestamp

---

#### Implications Contract

**Purpose**: Links related statements via implication attestations

**Events Emitted**:

```solidity
// Emitted when an attester declares that S1 implies S2
event ImplicationAttestation(
    address indexed attester,
    bytes32 indexed fromStatementId,  // IPFS CID
    bytes32 indexed toStatementId     // IPFS CID
);
```

**Functions**:
```solidity
function attestImplication(bytes32 fromStatementId, bytes32 toStatementId) external;
```

**Notes**:
- Any address can be an attester
- No validation that statements exist on IPFS (trust model)
- Unidirectional: fromStatement → toStatement

---

### Funding Portal Contracts

#### ProjectAlignment Contract

**Purpose**: Links projects to statements

**Events Emitted**:

```solidity
// Emitted when an attester declares project P is aligned with statement S
event ProjectAlignmentAttestation(
    address indexed attester,
    address indexed projectContract,  // Address of the project's contract
    bytes32 indexed statementId       // IPFS CID of the statement
);
```

**Functions**:
```solidity
function attestProjectAlignment(address projectContract, bytes32 statementId) external;
```

**Notes**:
- Any address can attest
- `projectContract` should be an AssuranceContract address
- Multiple attestations can link one project to multiple statements

---

### Pubstarter Contracts

See [specs/pubstarter-contracts/](pubstarter-contracts/) for detailed contract specifications.

**Key Events** (from existing AssuranceContract code):

```solidity
// From AssuranceContract.sol - when funds are withdrawn
event Withdrawal(address indexed recipient, uint256 amount);

// From ContractMetadata - for project metadata
event ContractMetadataUpdate(bytes32 indexed cid);

// From ERC1155 standard - for token purchases/sales
event TransferSingle(
    address indexed operator,
    address indexed from,
    address indexed to,
    uint256 id,
    uint256 value
);

event TransferBatch(
    address indexed operator,
    address indexed from,
    address indexed to,
    uint256[] ids,
    uint256[] values
);
```

**Key Contract Interfaces**:

```solidity
interface IAssuranceContract {
    function recipient() external view returns (address);
    function threshold() external view returns (uint256);
    function deadline() external view returns (uint256);
    function getAssuranceContractProgress() external view returns (uint256);
    function withdraw() external;
}

interface IContractMetadata {
    function contractMetadataCID() external view returns (bytes32);
}
```

---

## IPFS Data Structures

### Statement Document

**Location**: Uploaded to IPFS, referenced by CID

**Schema v1** (simple-string type):

```json
{
  "statement-type": "simple-string",
  "definition": "The actual text of the statement goes here"
}
```

**Future schemas** may include:
- Rich text/markdown
- References to other statements
- Structured data

**Statement ID**: The IPFS CID (Content Identifier) of this JSON document, represented as `bytes32` in contracts.

**Example**:
```json
{
  "statement-type": "simple-string",
  "definition": "I believe in free speech and open discourse"
}
```

---

### Project Metadata

**Location**: Uploaded to IPFS, referenced in `ContractMetadataUpdate` event

**Suggested Schema** (to be finalized):

```json
{
  "project-type": "pubstarter-v1",
  "title": "Project Title",
  "description": "Detailed description of the project",
  "creator": "0x...",
  "media": {
    "coverImage": "ipfs://...",
    "images": ["ipfs://...", "ipfs://..."],
    "video": "ipfs://..."
  },
  "rewards": [
    {
      "tokenId": 1,
      "name": "Basic Supporter",
      "description": "Thank you!",
      "image": "ipfs://..."
    }
  ]
}
```

---

## Indexer Query APIs

### Concept Space Indexer

**Technology**: Ponder (indexing Ethereum events)
**Database**: PostgreSQL (provided by Ponder)
**Deployment**: Railway

**Indexes These Contracts**:
- Beliefs
- Implications

**Required Queries**:

#### 1. Get Statement Details

```graphql
query GetStatement($statementId: String!) {
  statement(id: $statementId) {
    id              # IPFS CID
    definition      # The actual statement text (fetched from IPFS)
    directSupporters {
      address
      beliefState   # 1=believes, 2=disbelieves
      timestamp
    }
    indirectSupporters {
      address
      viaStatementId  # Which statement they signed that implies this one
      beliefState
    }
    impliedBy {     # Statements that imply this one
      fromStatementId
      attester
      timestamp
    }
    implies {       # Statements that this one implies
      toStatementId
      attester
      timestamp
    }
    directSupportCount
    indirectSupportCount
  }
}
```

#### 2. Get User Beliefs

```graphql
query GetUserBeliefs($userAddress: String!) {
  user(address: $userAddress) {
    address
    beliefs {
      statementId
      beliefState
      timestamp
    }
  }
}
```

#### 3. Get Implication Graph

```graphql
query GetImplicationsByAttester($attesterAddress: String!) {
  implications(where: { attester: $attesterAddress }) {
    fromStatementId
    toStatementId
    attester
    timestamp
  }
}
```

**REST API Examples**:

```typescript
// GET /api/statement/:statementId
interface StatementResponse {
  id: string;  // IPFS CID
  definition: string;
  directSupportCount: number;
  indirectSupportCount: number;
  directSupporters: Array<{
    address: string;
    beliefState: 1 | 2;  // 1=believes, 2=disbelieves
    timestamp: number;
  }>;
  indirectSupporters: Array<{
    address: string;
    viaStatementId: string;
    beliefState: 1 | 2;
  }>;
  impliedBy: Array<{
    fromStatementId: string;
    attester: string;
    timestamp: number;
  }>;
  implies: Array<{
    toStatementId: string;
    attester: string;
    timestamp: number;
  }>;
}

// GET /api/user/:address/beliefs
interface UserBeliefsResponse {
  address: string;
  beliefs: Array<{
    statementId: string;
    beliefState: 0 | 1 | 2;
    timestamp: number;
  }>;
}

// GET /api/implications?attester=0x...
interface ImplicationsResponse {
  implications: Array<{
    fromStatementId: string;
    toStatementId: string;
    attester: string;
    timestamp: number;
  }>;
}
```

---

### Funding Portal Indexer

**Technology**: Ponder
**Database**: PostgreSQL
**Deployment**: Railway

**Indexes These Contracts**:
- ProjectAlignment
- All Pubstarter contracts (AssuranceContract, ERC1155, etc.)

**Required Queries**:

#### 1. Get Projects for Statement

```graphql
query GetProjectsForStatement($statementId: String!) {
  projectAlignments(where: { statementId: $statementId }) {
    projectContract
    attester
    timestamp
  }
}
```

**With expansion via implications** (backend computation):

```typescript
// GET /api/funding-portal/:statementId
interface FundingPortalResponse {
  statementId: string;
  projects: Array<{
    contractAddress: string;
    directAlignment: boolean;  // true if directly attested to this statement
    viaStatementId?: string;   // if indirect, which statement implies this one
    attester: string;

    // Project details (from Pubstarter contracts)
    recipient: string;
    threshold: string;  // in wei
    deadline: number;   // timestamp
    currentFunding: string;  // in wei
    percentFunded: number;
    metadataCID: string;
    metadata?: {  // fetched from IPFS
      title: string;
      description: string;
      coverImage: string;
    };

    // Contribution stats
    contributorCount: number;
    topContributors: Array<{
      address: string;
      ensName?: string;
      amount: string;  // in wei
      delegationChain?: string[];  // if via delegatable notes
    }>;
  }>;
  totalAvailableFunding: string;  // sum of undelegated notes for this cause
}
```

#### 2. Get Project Details

```graphql
query GetProject($contractAddress: String!) {
  project(id: $contractAddress) {
    contractAddress
    recipient
    threshold
    deadline
    currentFunding
    metadataCID
    alignedStatements {
      statementId
      attester
      timestamp
    }
    contributions {
      contributor
      amount
      tokenId
      timestamp
    }
  }
}
```

**REST API**:

```typescript
// GET /api/project/:contractAddress
interface ProjectResponse {
  contractAddress: string;
  recipient: string;
  threshold: string;
  deadline: number;
  currentFunding: string;
  percentFunded: number;
  metadataCID: string;
  metadata?: ProjectMetadata;
  alignedStatements: Array<{
    statementId: string;
    attester: string;
    timestamp: number;
  }>;
  contributions: Array<{
    contributor: string;
    ensName?: string;
    amount: string;
    tokenIds: number[];
    timestamp: number;
    isDelegated: boolean;
    delegationChain?: string[];
  }>;
  topContributors: Array<{
    address: string;
    ensName?: string;
    totalContributed: string;
    delegationChain?: string[];
  }>;
}
```

#### 3. Get Delegatable Notes

```typescript
// GET /api/delegatable-notes?statementId=...
interface DelegatableNotesResponse {
  statementId: string;
  notes: Array<{
    noteId: string;
    owner: string;
    currentDelegate: string;
    delegationChain: string[];
    amount: string;
    token: string;  // ERC20 token address
    isActive: boolean;
    intendedCause: string;  // statementId
  }>;
  totalAvailable: string;  // sum of active undelegated notes
}
```

---

## UI Integration Points

### Concept Space UI

**Technology**: TypeScript, Vite, React (or similar), wagmi/viem
**Deployment**: TBD (Vercel, Netlify, etc.)

**Pages**:

1. **Statement Page** (`/statement/:statementId`)
   - Displays statement text (fetched from IPFS)
   - Shows direct vs indirect supporter counts
   - Lists high-profile signers
   - Button to sign/unsign
   - Link to funding portal

2. **User Profile** (`/user/:address`)
   - Lists all statements user has signed
   - Suggested statements to sign

**API Calls**:

```typescript
import { createPublicClient, createWalletClient, http } from 'viem';
import { base } from 'viem/chains';

// Read statement details from indexer
const statementData = await fetch(
  `${INDEXER_URL}/api/statement/${statementId}`
).then(r => r.json());

// Read statement definition from IPFS
const statementDoc = await fetch(
  `https://ipfs.io/ipfs/${statementId}`
).then(r => r.json());

// Write: Sign a statement (call Beliefs contract)
import { BeliefsABI } from './abis';

const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

const walletClient = createWalletClient({
  chain: base,
  transport: http()
});

const BELIEFS_CONTRACT = '0x...'; // deployed address

// Set belief to "believes" (1)
const { request } = await publicClient.simulateContract({
  address: BELIEFS_CONTRACT,
  abi: BeliefsABI,
  functionName: 'setBelief',
  args: [statementId, 1], // 1 = believes
  account: userAddress,
});

const hash = await walletClient.writeContract(request);
await publicClient.waitForTransactionReceipt({ hash });
```

**Example Component**:

```typescript
// StatementPage.tsx
import { useAccount } from 'wagmi';

function StatementPage({ statementId }: { statementId: string }) {
  const { address } = useAccount();
  const [statement, setStatement] = useState<StatementResponse | null>(null);

  useEffect(() => {
    // Fetch from indexer
    fetch(`${INDEXER_URL}/api/statement/${statementId}`)
      .then(r => r.json())
      .then(setStatement);
  }, [statementId]);

  const handleSign = async () => {
    // Call Beliefs.setBelief(statementId, 1)
    // ... wagmi/viem code ...
  };

  return (
    <div>
      <h1>{statement?.definition}</h1>
      <p>Direct supporters: {statement?.directSupportCount}</p>
      <p>Indirect supporters: {statement?.indirectSupportCount}</p>
      <button onClick={handleSign}>Sign this statement</button>
      <a href={`/funding-portal/${statementId}`}>View Funding Portal</a>
    </div>
  );
}
```

---

### Funding Portal UI

**Technology**: TypeScript, Vite, React, wagmi/viem
**Deployment**: TBD

**Pages**:

1. **Funding Portal Page** (`/funding-portal/:statementId`)
   - Shows statement definition
   - Lists all aligned projects (direct + indirect via implications)
   - Shows total available funding (from delegatable notes)
   - Filter/sort projects

2. **Project Page** (`/project/:contractAddress`)
   - Project details (title, description, images)
   - Funding progress bar
   - List of reward tiers (ERC1155 token IDs)
   - Buy/sell tokens
   - Top contributors list with delegation chains

**API Calls**:

```typescript
// Read funding portal data
const portalData = await fetch(
  `${INDEXER_URL}/api/funding-portal/${statementId}`
).then(r => r.json());

// Read project details
const projectData = await fetch(
  `${INDEXER_URL}/api/project/${contractAddress}`
).then(r => r.json());

// Write: Buy project tokens (call AssuranceContract)
import { AssuranceContractABI } from './abis';

const { request } = await publicClient.simulateContract({
  address: projectContractAddress,
  abi: AssuranceContractABI,
  functionName: 'buyERC1155',
  args: [tokenId, amount],
  value: parseEther(price * amount),
  account: userAddress,
});

const hash = await walletClient.writeContract(request);

// Write: Attest project alignment (call ProjectAlignment contract)
import { ProjectAlignmentABI } from './abis';

const PROJECT_ALIGNMENT_CONTRACT = '0x...';

await walletClient.writeContract({
  address: PROJECT_ALIGNMENT_CONTRACT,
  abi: ProjectAlignmentABI,
  functionName: 'attestProjectAlignment',
  args: [projectContractAddress, statementId],
  account: userAddress,
});
```

**Example Component**:

```typescript
// ProjectPage.tsx
function ProjectPage({ contractAddress }: { contractAddress: string }) {
  const [project, setProject] = useState<ProjectResponse | null>(null);

  useEffect(() => {
    fetch(`${INDEXER_URL}/api/project/${contractAddress}`)
      .then(r => r.json())
      .then(setProject);
  }, [contractAddress]);

  const handleBuyTokens = async (tokenId: number, amount: number) => {
    // Call AssuranceContract.buyERC1155(tokenId, amount)
    // ... wagmi/viem code ...
  };

  return (
    <div>
      <h1>{project?.metadata?.title}</h1>
      <p>{project?.metadata?.description}</p>
      <ProgressBar
        current={project?.currentFunding}
        goal={project?.threshold}
      />
      <div>
        {/* Reward tiers */}
        <button onClick={() => handleBuyTokens(1, 1)}>
          Buy Basic Supporter Token
        </button>
      </div>
      <TopContributorsList contributors={project?.topContributors} />
    </div>
  );
}
```

---

## Cross-System Integration Flows

### Flow 1: User Signs Statement → Views Funding Portal

1. User visits `/statement/QmXXX` in Concept Space UI
2. User clicks "Sign" → calls `Beliefs.setBelief(QmXXX, 1)`
3. Transaction mined → `DirectSupport` event emitted
4. Concept Space indexer catches event → updates DB
5. User clicks "View Funding Portal" → redirects to `/funding-portal/QmXXX`
6. Funding Portal UI fetches from Funding Portal indexer
7. Indexer computes indirect alignments via implication graph
8. UI displays all aligned projects

### Flow 2: Create Project → Link to Statement

1. Project creator uses Pubstarter factory to create project
   - Calls `Pubstarter.createERC1155AndMarketplaceAndAssuranceContract(...)`
   - Gets back project contract address
2. Creator uploads project metadata to IPFS → gets CID
3. Creator calls `ContractMetadata.updateMetadata(cid)` on project contract
4. Creator (or anyone) calls `ProjectAlignment.attestProjectAlignment(projectAddress, statementId)`
5. `ProjectAlignmentAttestation` event emitted
6. Funding Portal indexer catches event → adds to DB
7. Project now appears on funding portal page for that statement

### Flow 3: Delegate Funding → Project Gets Funded

1. Alice creates delegatable note via `DelegatableNotes` contract
   - Deposits ERC20 tokens
   - Marks intended cause (statementId)
2. Alice delegates to Bob: `DelegatableNotes.delegate(noteId, bobAddress)`
3. Bob sees available notes on funding portal
4. Bob decides to fund a project aligned with the cause
5. Bob uses delegated funds to buy project tokens
6. Project page shows: "Alice (via Bob) contributed X"

### Flow 4: Implication System Updates

1. AI attester calls `Implications.attestImplication(statementA, statementB)`
2. `ImplicationAttestation` event emitted
3. Concept Space indexer catches event → updates implication graph
4. Funding Portal indexer also catches event (or queries Concept Space indexer)
5. Projects aligned with statementA now appear on statementB's funding portal
6. Statements signed by supporters of statementA now show indirect support for statementB

---

## Configuration & Deployment

### Contract Addresses (per chain)

**Base Sepolia (testnet)**:
```typescript
export const CONTRACTS = {
  Beliefs: '0x...',
  Implications: '0x...',
  ProjectAlignment: '0x...',
  Pubstarter: '0x...',
  // DelegatableNotes factory, etc.
};
```

**Base Mainnet**:
```typescript
export const CONTRACTS = {
  // ... production addresses
};
```

### Environment Variables

**Indexers**:
```bash
# .env
DATABASE_URL=postgresql://...
RPC_URL=https://base-sepolia.g.alchemy.com/v2/...
IPFS_GATEWAY=https://ipfs.io
PORT=3000
```

**UIs**:
```bash
# .env
VITE_INDEXER_URL=https://indexer.example.com
VITE_CONCEPT_SPACE_INDEXER_URL=https://concept-space-indexer.example.com
VITE_FUNDING_PORTAL_INDEXER_URL=https://funding-portal-indexer.example.com
VITE_CHAIN_ID=84532  # Base Sepolia
VITE_RPC_URL=https://base-sepolia.g.alchemy.com/v2/...
```

---

## Testing Integration Points

### Unit Tests (per artifact)

Each artifact should have its own test suite:
- Smart contracts: Hardhat tests
- Indexers: Jest/Vitest with test DB
- UIs: Vitest + React Testing Library

### Integration Tests

**Test the full flow**:

```typescript
// integration.test.ts
describe('Statement → Funding Portal flow', () => {
  it('should show aligned projects after attestation', async () => {
    // 1. Deploy contracts
    const beliefs = await deployBeliefs();
    const projectAlignment = await deployProjectAlignment();
    const project = await deployProject();

    // 2. Attest alignment
    await projectAlignment.attestProjectAlignment(
      project.address,
      statementId
    );

    // 3. Wait for indexer to process
    await waitForIndexer();

    // 4. Query funding portal API
    const response = await fetch(`/api/funding-portal/${statementId}`);
    const data = await response.json();

    // 5. Verify project appears
    expect(data.projects).toContainEqual(
      expect.objectContaining({ contractAddress: project.address })
    );
  });
});
```

---

## Future Considerations

### Features Not Yet Specified

1. **Unique Human Verification**: Integration with Worldcoin/BrightID
   - New events/contracts TBD
   - Indexer queries for verified humans TBD

2. **Twitter Integration**:
   - Linking Twitter handles to addresses
   - Querying follower counts
   - API integration details TBD

3. **Graph Database**:
   - If statement graph gets complex, may need AWS Neptune
   - Query language/API TBD

4. **Search & Discovery**:
   - Full-text search on statements
   - Recommendation algorithms
   - APIs TBD

### Scalability Considerations

- **IPFS Pinning**: Who pins the statement/metadata files?
  - Consider Pinata or Web3.Storage

- **Indexer Performance**:
  - May need caching layer (Redis)
  - May need to shard by statement/project

- **Frontend Performance**:
  - Consider pagination for large lists
  - Consider caching statement definitions

---

## Summary Checklist

When building or regenerating an artifact, verify these integration points:

### Smart Contracts
- [ ] Events match the schemas defined here
- [ ] Function signatures match the examples
- [ ] State variables are readable by other contracts (if needed)

### Indexers
- [ ] Listens to all required events
- [ ] Exposes all required API endpoints
- [ ] Returns data in the specified formats
- [ ] Handles IPFS fetching for metadata

### UIs
- [ ] Calls the correct contract functions
- [ ] Queries the correct indexer endpoints
- [ ] Handles loading/error states
- [ ] Updates after transactions are mined

### All Artifacts
- [ ] Uses correct contract addresses for the target chain
- [ ] Uses correct IPFS gateway
- [ ] Includes error handling
- [ ] Includes logging for debugging
