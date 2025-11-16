# Integration Points

This (AI-generated) document specifies the integration points between the different artifacts of the Commonality system. The purpose is to allow each artifact to be built/rebuilt independently by AI without requiring unnecessary changes to dependent artifacts.

## Table of Contents

1. [Smart Contract Events](#smart-contract-events)
2. [Indexer Query APIs](#indexer-query-apis)
3. [UI-to-Indexer API Contracts](#ui-to-indexer-api-contracts)
4. [Cross-Component Data Flow](#cross-component-data-flow)

---

## Smart Contract Events

### Beliefs Contract

**Contract Name:** `Beliefs`

**Events Emitted:**

```solidity
event DirectSupport(
    address indexed account,
    bytes32 indexed statementId,  // IPFS CID of the statement
    uint8 beliefState  // 0 = noOpinion, 1 = believes, 2 = disbelieves
);
```

**State Storage:**

The Beliefs contract stores belief states onchain to allow other smart contracts to query them:

```solidity
// Mapping: account => statementId => beliefState
mapping(address => mapping(bytes32 => uint8)) public beliefs;

function getBelief(address account, bytes32 statementId) public view returns (uint8);
```

**Functions:**

```solidity
function setBelief(bytes32 statementId, uint8 beliefState) external;
// Sets the caller's belief state for a statement
// Emits DirectSupport event
// Updates beliefs mapping
```

---

### Implications Contract

**Contract Name:** `Implications`

**Events Emitted:**

```solidity
event ImplicationAttestation(
    address indexed attester,
    bytes32 indexed fromStatementId,  // IPFS CID
    bytes32 indexed toStatementId    // IPFS CID
);
```

**Notes:**
- Any account can publish ImplicationAttestations
- The semantic meaning: "if someone believes fromStatementId, they probably also believe toStatementId"
- Users configure which attesters they trust in their Settings

---

### Funding Portal Contract

**Contract Name:** `FundingPortal`

**Events Emitted:**

```solidity
event ProjectAlignmentAttestation(
    address indexed attester,
    bytes32 indexed projectId,     // Project identifier
    bytes32 indexed statementId   // IPFS CID of the statement
);

event ProjectCreated(
    bytes32 indexed projectId,
    address indexed creator,
    string name,
    string description,
    address nftContract  // ERC-1155 contract address
);

event Contribution(
    bytes32 indexed projectId,
    address indexed contributor,
    uint256 amount,
    uint256 tokenId
);

event TokenBurned(
    bytes32 indexed projectId,
    address indexed donor,
    uint256 tokenId,
    uint256 amount
);
```

---

### DelegatableNotes Contract

**Contract Name:** `DelegatableNotes`

**Events Emitted:**

```solidity
event NoteCreated(
    uint256 indexed noteId,
    address indexed owner,
    bytes32 indexed intendedStatementId,  // The cause this is intended for
    uint256 amount,
    uint8 commissionPercentage  // Percentage the delegate can take as commission
);

event NoteDelegated(
    uint256 indexed noteId,
    address indexed delegator,
    address indexed delegate
);

event DelegationRevoked(
    uint256 indexed noteId,
    address indexed revokedBy  // Who revoked it (could be anywhere in the chain)
);

event NoteUsed(
    uint256 indexed noteId,
    bytes32 indexed projectId,
    uint256 amount,
    address[] delegationChain  // Full chain from owner to final decision-maker
);
```

**Functions:**

```solidity
function createNote(
    bytes32 intendedStatementId,
    uint256 amount,
    uint8 commissionPercentage
) external payable returns (uint256 noteId);

function delegateNote(uint256 noteId, address delegate) external;

function revokeDelegation(uint256 noteId) external;

function useNote(uint256 noteId, bytes32 projectId, uint256 amount) external;

function getDelegationChain(uint256 noteId) external view returns (address[] memory);
```

---

## Indexer Query APIs

### Concept Space Indexer

The Concept Space Indexer processes events from the Beliefs and Implications contracts.

**Database Schema Highlights:**

```typescript
interface Statement {
  id: string;  // IPFS CID
  type: string;  // e.g., "simple-string"
  definition: string;  // The actual statement text
  directSupportCount: number;
  indirectSupportCount: number;
  totalSupportCount: number;
}

interface Belief {
  account: string;
  statementId: string;
  beliefState: 'noOpinion' | 'believes' | 'disbelieves';
}

interface Implication {
  attester: string;
  fromStatementId: string;
  toStatementId: string;
  timestamp: number;
}
```

**Query Requirements:**

1. Get statement by ID with support counts
2. Get all statements a user has signed (directly)
3. Get all implications for a statement (both incoming and outgoing)
4. Get supporters of a statement (both direct and indirect)
5. Calculate transitive implications (graph traversal)
6. Find commonality statements (statements with references to other statements)
7. Get suggested statements for a user (based on implications)

---

### Funding Portal Indexer

The Funding Portal Indexer processes events from the FundingPortal contract and queries the Concept Space Indexer for statement implications.

**Database Schema Highlights:**

```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  nftContract: string;
  creator: string;
  totalRaised: number;
  directAlignedStatements: string[];  // Statement IDs
  indirectAlignedStatements: string[];  // Via implications
}

interface Contribution {
  projectId: string;
  contributor: string;
  amount: number;
  tokenId: number;
  isBurned: boolean;  // true if donor, false if investor
}

interface ProjectAlignment {
  projectId: string;
  statementId: string;
  attester: string;
}
```

**Query Requirements:**

1. Get projects aligned with a statement (including via implications)
2. Get top contributors for a project
3. Get top contributors for a cause (all projects aligned with a statement)
4. Get total available funding for a cause (from DelegatableNotes)

---

## UI-to-Indexer API Contracts

### Concept Space UI API

**Base URL:** `https://api.conceptspace.example/v1`

#### Get Statement

```typescript
GET /statements/:statementId

Response:
{
  "statement": {
    "id": "QmXyz...",  // IPFS CID
    "type": "simple-string",
    "definition": "I believe in freedom of speech",
    "directSupportCount": 17,
    "indirectSupportCount": 118,
    "totalSupportCount": 135,
    "directSupporters": [
      {
        "address": "0x123...",
        "ensName": "alice.eth",
        "verifiedTwitter": {
          "handle": "@alice",
          "followers": 15000
        }
      }
      // ... more supporters
    ],
    "indirectSupportReasons": [
      {
        "statementId": "QmAbc...",
        "definition": "I believe in the First Amendment",
        "supportCount": 42,
        "impliedBy": ["attester1.eth", "attester2.eth"]
      }
      // ... more indirect support sources
    ]
  }
}
```

#### Get User's Beliefs

```typescript
GET /users/:address/beliefs

Response:
{
  "beliefs": [
    {
      "statementId": "QmXyz...",
      "definition": "I believe in freedom of speech",
      "beliefState": "believes",
      "timestamp": 1699564800
    }
    // ... more beliefs
  ]
}
```

#### Get Statement Suggestions for User

```typescript
GET /users/:address/suggestions

Response:
{
  "suggestions": [
    {
      "statementId": "QmAbc...",
      "definition": "I support the Electronic Frontier Foundation",
      "reason": "implied-by-your-beliefs",
      "sourceStatements": [
        {
          "id": "QmXyz...",
          "definition": "I believe in freedom of speech"
        }
      ],
      "popularityScore": 1250  // Number of direct supporters
    }
    // ... more suggestions
  ]
}
```

#### Get Implications for Statement

```typescript
GET /statements/:statementId/implications?direction=outgoing|incoming|both

Response:
{
  "implications": {
    "outgoing": [
      {
        "toStatementId": "QmDef...",
        "definition": "I support privacy rights",
        "attesters": ["ai-attester.eth"],
        "supportCount": 89
      }
    ],
    "incoming": [
      {
        "fromStatementId": "QmGhi...",
        "definition": "I believe in constitutional rights",
        "attesters": ["ai-attester.eth"],
        "supportCount": 203
      }
    ]
  }
}
```

---

### Funding Portal UI API

**Base URL:** `https://api.fundingportal.example/v1`

#### Get Funding Portal for Statement

```typescript
GET /statements/:statementId/funding-portal

Response:
{
  "statement": {
    "id": "QmXyz...",
    "definition": "I believe in freedom of speech"
  },
  "availableFunding": {
    "total": 125000,  // USD equivalent of delegatable notes
    "noteCount": 47
  },
  "projects": [
    {
      "id": "project-123",
      "name": "Decentralized Social Media Platform",
      "description": "Building a censorship-resistant social network",
      "creator": "0xabc...",
      "nftContract": "0xdef...",
      "totalRaised": 50000,
      "alignmentType": "direct",  // or "indirect"
      "alignedVia": "QmXyz...",  // Statement ID it's aligned to
      "topContributors": [
        {
          "address": "0x123...",
          "ensName": "bob.eth",
          "amount": 5000,
          "isDonor": false,  // Investor
          "delegationChain": ["alice.eth", "bob.eth"]
        }
        // ... more contributors
      ]
    }
    // ... more projects
  ]
}
```

#### Get Project Details

```typescript
GET /projects/:projectId

Response:
{
  "project": {
    "id": "project-123",
    "name": "Decentralized Social Media Platform",
    "description": "Building a censorship-resistant social network",
    "creator": "0xabc...",
    "nftContract": "0xdef...",
    "totalRaised": 50000,
    "alignedStatements": [
      {
        "statementId": "QmXyz...",
        "definition": "I believe in freedom of speech",
        "alignmentType": "direct",
        "attesters": ["curator.eth"]
      }
    ],
    "contributions": [
      {
        "contributor": "0x123...",
        "ensName": "bob.eth",
        "amount": 5000,
        "isDonor": false,
        "delegationChain": ["alice.eth", "bob.eth"],
        "percentOfTotal": 10
      }
      // ... more contributions
    ]
  }
}
```

#### Get Top Contributors for Cause

```typescript
GET /statements/:statementId/top-contributors

Response:
{
  "contributors": [
    {
      "address": "0x123...",
      "ensName": "bob.eth",
      "totalContributed": 12500,
      "projectCount": 5,
      "contributionBreakdown": [
        {
          "projectId": "project-123",
          "projectName": "Decentralized Social Media Platform",
          "amount": 5000,
          "isDonor": false
        }
        // ... more projects
      ]
    }
    // ... more contributors
  ]
}
```

---

## Cross-Component Data Flow

### Statement Support Count Calculation

The Concept Space Indexer needs to calculate both direct and indirect support:

```typescript
// Example code for calculating support
async function calculateSupportCounts(statementId: string, trustedAttesters: string[]) {
  // Direct support: count all DirectSupport events where beliefState = 1 (believes)
  const directSupport = await db.query(`
    SELECT COUNT(DISTINCT account)
    FROM beliefs
    WHERE statementId = ? AND beliefState = 1
  `, [statementId]);

  // Indirect support: find all statements that imply this one
  const implyingStatements = await findImplyingStatements(
    statementId,
    trustedAttesters
  );

  // For each implying statement, count its supporters
  let indirectSupport = 0;
  for (const implying of implyingStatements) {
    const supporters = await db.query(`
      SELECT COUNT(DISTINCT account)
      FROM beliefs
      WHERE statementId = ? AND beliefState = 1
    `, [implying.statementId]);

    indirectSupport += supporters.count;
  }

  return {
    direct: directSupport.count,
    indirect: indirectSupport,
    total: directSupport.count + indirectSupport
  };
}
```

### Funding Portal Statement Alignment

The Funding Portal Indexer queries the Concept Space Indexer to determine which projects are relevant to a statement:

```typescript
// Example: Finding projects for a statement's funding portal
async function getProjectsForStatement(
  statementId: string,
  trustedAttesters: string[]
) {
  // Get directly aligned projects
  const directProjects = await db.query(`
    SELECT DISTINCT projectId
    FROM project_alignments
    WHERE statementId = ?
  `, [statementId]);

  // Get all statements implied by this statement
  const impliedStatements = await conceptSpaceIndexer.getImpliedStatements(
    statementId,
    trustedAttesters
  );

  // Get projects aligned to any of the implied statements
  const indirectProjects = await db.query(`
    SELECT DISTINCT projectId, statementId
    FROM project_alignments
    WHERE statementId IN (?)
  `, [impliedStatements.map(s => s.id)]);

  return {
    direct: directProjects,
    indirect: indirectProjects
  };
}
```

### Delegatable Notes Integration

When displaying available funding for a cause, the UI needs to query the DelegatableNotes contract:

```typescript
// Example: Getting available funding for a statement
async function getAvailableFunding(statementId: string) {
  // Query all notes intended for this statement or implied statements
  const notes = await delegatableNotesContract.methods
    .getNotesForStatement(statementId)
    .call();

  // Include notes for implied statements
  const impliedStatements = await conceptSpaceIndexer.getImpliedStatements(
    statementId,
    userTrustedAttesters
  );

  for (const implied of impliedStatements) {
    const impliedNotes = await delegatableNotesContract.methods
      .getNotesForStatement(implied.id)
      .call();
    notes.push(...impliedNotes);
  }

  return notes.reduce((sum, note) => sum + note.amount, 0);
}
```

### User Settings for Trusted Attesters

Users configure trusted attesters in the UI, which affects which implications they see:

```typescript
// Stored in user settings (could be browser localStorage or a user profile contract)
interface UserSettings {
  address: string;
  trustedAttesters: string[];  // Addresses of attesters to trust
}

// When querying implications, filter by trusted attesters
async function getImplicationsForUser(
  statementId: string,
  userAddress: string
) {
  const settings = await getUserSettings(userAddress);
  const trustedAttesters = settings.trustedAttesters || [DEFAULT_ATTESTER];

  const implications = await db.query(`
    SELECT * FROM implications
    WHERE fromStatementId = ?
    AND attester IN (?)
  `, [statementId, trustedAttesters]);

  return implications;
}
```

---

## Statement Format

Statements are JSON documents stored on IPFS:

```typescript
// Simple string statement (v1)
interface SimpleStringStatement {
  "statement-type": "simple-string";
  definition: string;
}

// Example
{
  "statement-type": "simple-string",
  "definition": "I believe in freedom of speech"
}

// Future: Commonality statement with references
interface CommonalityStatement {
  "statement-type": "commonality-with-references";
  definition: string;
  references: string[];  // Array of statement IDs (IPFS CIDs)
}

// Example
{
  "statement-type": "commonality-with-references",
  "definition": "I believe in either strong privacy protections OR strong transparency requirements for government",
  "references": ["QmPrivacy...", "QmTransparency..."]
}
```

To retrieve a statement:
```typescript
const statementData = await ipfs.cat(statementId);
const statement = JSON.parse(statementData);
```

---

## Notes for AI Implementers

When regenerating any artifact:

1. **Smart Contracts**: Maintain the exact event signatures and function signatures defined above. Internal implementation can change, but external interfaces must remain stable.

2. **Indexers**: Must support all the query requirements listed. Internal database schema can vary, but query APIs must match the specifications.

3. **UIs**: Must call the indexer APIs using the exact formats specified. UI styling and internal components can change freely.

4. **Cross-component queries**: When one indexer needs data from another (e.g., Funding Portal querying Concept Space), use the specified API contracts, not direct database access.

5. **Testing**: Each artifact should include example API calls and expected responses based on the specifications above.
