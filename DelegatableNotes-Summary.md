# DelegatableNotes Contract Summary

## Overview

The DelegatableNotes contract is a Solidity smart contract that enables **delegation of funding decisions** for cause-aligned projects. It allows users to deposit tokens (ETH, ERC20, or ERC1155) into "notes" that can be delegated to trusted individuals who make spending decisions on their behalf, while maintaining full transparency about the delegation chain.

**Contract Location:** [hardhat/contracts/DelegatableNotes.sol](hardhat/contracts/DelegatableNotes.sol)

## Core Concept

The system implements a **nano-trustee** model where:
- Alice contributes funds but doesn't have time to evaluate projects
- Alice delegates to Bob, who has expertise and time to research projects
- Bob can further delegate to Charlie, creating a chain
- Charlie spends the funds on aligned projects
- The entire delegation chain is transparent and preserved for social recognition
- Any participant can revoke their delegation at any time

## Key Features

### 1. Multi-Token Support
- **ETH**: Native currency (represented as `address(0)`)
- **ERC20**: Standard fungible tokens
- **ERC1155**: Semi-fungible/NFT tokens (e.g., project rewards)

### 2. Note Structure
Each note represents delegated funds and contains:
- `amount`: Token quantity
- `token`: Token contract address (or `address(0)` for ETH)
- `tokenType`: ERC20 or ERC1155
- `tokenId`: For ERC1155 tokens
- `owner`: Current controller of the note
- `parentNoteId`: Points to delegating note (0 for root)
- `delegated`: Whether this note has been delegated
- `intendedStatementId`: IPFS CID of the cause this supports
- `commissionBasisPoints`: Commission for the delegate (0-50%)

### 3. Delegation Chains

Notes form chains from root (original depositor) to leaf (current delegate):

```
Alice (root) → Bob → Charlie (leaf)
```

**Terminology:**
- **Root note**: No parent; owned by original depositor
- **Leaf note**: No child; owned by current delegate who can spend it

### 4. Core Operations

#### Deposit (`depositERC20`, `depositETH`, `depositERC1155`)
- User deposits tokens, creating a new root note
- Must specify `intendedStatementId` (the cause to support)
- Returns a `noteId` representing the deposited funds

#### Delegate (`delegate`)
- Owner delegates control to another address
- Supports **partial delegation** (splits the chain)
- Can specify commission (0-50%) for the delegate
- Commission cannot exceed parent's remaining allowance
- Creates a new note owned by the delegate
- Prevents circular delegation

#### Revoke (`revoke`)
- Traverse backward from leaf and delete all notes until reaching caller's note
- Caller's note is marked as undelegated
- All subdelegations are canceled

#### Reclaim (`reclaimFunds`)
- Only for notes that are both root and leaf (undelegated root)
- Returns tokens to the original depositor
- Deletes the note

### 5. Spending Mechanisms

The contract integrates with the project's marketplace infrastructure:

#### Purchase from ERC1155Seller (`purchaseFromERC1155Seller`)
- Spend ETH notes to buy project tokens at fixed prices
- Used for Kickstarter-like campaigns
- All input ETH is spent (no change returned)

#### Purchase from ERC1155Marketplace (`purchaseFromERC1155Marketplace`)
- Fulfill sale listings on a secondary marketplace
- **Automatically splits notes** to separate payment from leftover
- Leftover ETH stays in notes owned by the caller

**Key behavior:** After purchase, the contract:
1. Deletes the input note chains
2. Accrues commissions to delegates
3. Creates new note chains with the purchased ERC1155 tokens
4. **Preserves delegation chains** proportionally across new notes

This means if Alice→Bob→Charlie spent notes to buy tokens, the new tokens are also in an Alice→Bob→Charlie chain, maintaining transparency.

### 6. Commission System

- Delegates can earn commission when notes are spent
- Set per delegation (0-5000 basis points = 0-50%)
- Subdelegates can pass on commission but cannot exceed parent's allowance
- **Accrued separately** by owner, token, tokenType, and tokenId
- Claimed via `claimCommission()`
- Root owner (original depositor) never receives commission

**Example:**
```
Alice → Bob (20% commission) → Charlie (10% commission)
When Charlie spends 100 ETH:
- Bob accrues: 20 ETH commission
- Charlie accrues: 10 ETH commission
- Project receives: 70 ETH (100 - 20 - 10)
```

### 7. Chain Splitting

When partially delegating or making purchases with overpayment, the entire delegation chain is split into parallel chains:

**Before split:**
```
Alice (100 ETH) → Bob → Charlie
```

**After splitting 30 ETH:**
```
Alice (30 ETH) → Bob → Charlie    [split chain]
Alice (70 ETH) → Bob → Charlie    [remainder chain]
```

Both chains maintain identical delegation structure with proportional amounts.

### 8. Proportional Token Distribution

When multiple notes are spent together:
- **Purchase cost** is distributed proportionally across input notes
- **Purchased tokens** are distributed proportionally across delegation chains
- Ensures fair allocation based on each note's contribution

## Integration Points

### Related Contracts
- **ERC1155Seller**: Fixed-price token sales (assurance contracts)
- **ERC1155Marketplace**: Secondary market with orderbooks
- **Beliefs**: Tracks statement support in Concept Space
- **ProjectAlignment**: Attests projects align with statements

### Funding Portal Workflow
1. User deposits ETH → creates note with `intendedStatementId`
2. User delegates note to trusted manager
3. Manager evaluates projects aligned with the statement
4. Manager spends note to purchase project tokens
5. User receives project tokens in new delegated notes
6. Delegation chain is preserved for social recognition

## Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **SafeERC20**: Safe token transfers
- **Checks-Effects-Interactions**: State updates before external calls
- **Circular delegation prevention**: Checks delegation chains
- **Input validation**: Amount checks, ownership verification

## View Functions

- `getDepositor(noteId)`: Returns root owner of a chain
- `getChain(noteId)`: Returns full delegation chain (IDs and owners)
- `validateNotesCompatible(noteIds)`: Checks if notes can be spent together
- `getAccruedCommission(...)`: Check pending commission for an address

## Events

Key events for transparency and indexing:
- `NoteCreated`: New note from deposit
- `NoteDelegated`: Delegation occurred
- `NoteRevoked`: Delegation canceled
- `ChainSplit`: Chain split for partial delegation
- `ERC1155Purchased`: Purchase completed
- `CommissionClaimed`: Delegate claimed earnings
- `FundsReclaimed`: Original depositor withdrew

## Use Cases

1. **Passive Supporter**: Deposit funds, delegate to expert, receive project tokens
2. **Active Manager**: Accept delegations, research projects, make purchases
3. **VC for Public Goods**: Invest early, hold project tokens, exit to donors later
4. **Commission-Based Curation**: Earn fees for evaluating and funding good projects
5. **Transparent Giving**: Full chain shown on funding portal for social recognition

## Design Philosophy

From the spec (specs/README.md):
- **Composable**: Delegation decisions chain together
- **Revocable**: Any level can cancel at any time
- **Transparent**: Full chains visible for recognition
- **Incentivized**: Commission system rewards trustees
- **Intention-Marked**: Each note tagged with intended cause

The contract enables **decentralized, delegated funding** while maintaining **cryptographic proof** of the full delegation chain for accountability and social recognition.
