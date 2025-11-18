# Changes to DelegatableNotes.sol

This document summarizes the changes made to `DelegatableNotes.sol` from the original in `specs/contracts/pubstarter/` to the modified version in `hardhat/contracts/`.

## Summary

Only **one contract** was modified: `DelegatableNotes.sol`. All other contracts were copied unchanged from `specs/contracts/pubstarter/` to `hardhat/contracts/`.

## Detailed Changes

### 1. Added Imports (Lines 4, 9-10)

```diff
+ import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
+ import "./ERC1155Seller.sol";
+ import "./ERC1155Marketplace.sol";
```

**Reason**: Needed to interact with ERC1155 tokens and marketplace contracts.

---

### 2. Added `intendedStatementId` to Note Struct (Line 47)

```diff
  struct Note {
    uint256 amount;
    address token;
    address owner;
    uint256 parentNoteId;
    bool delegated;
+   bytes32 intendedStatementId;
  }
```

**Reason**: Track which cause/statement each note is intended to support.

---

### 3. Added `intendedStatementId` to ChainCache Struct (Line 53)

```diff
  struct ChainCache {
    address[] owners;
    uint256 amount;
+   bytes32 intendedStatementId;
  }
```

**Reason**: Preserve statement ID when recreating chains during swaps/splits.

---

### 4. Replaced ERC20Swapped Events with ERC1155Purchased Event (Lines 73-82)

**Removed:**
```solidity
event ERC20Swapped(...)
event NoteConsumed(...)
event InvestmentDistributed(...)
```

**Added:**
```solidity
event ERC1155Purchased(
  address indexed buyer,
  address indexed paymentToken,
  address indexed erc1155Contract,
  uint256[] tokenIds,
  uint256[] counts,
  uint256 totalCost,
  uint256[] inputNoteIds,
  uint256[] outputNoteIds
);
```

**Reason**: New event for tracking ERC1155 purchases instead of DEX swaps.

---

### 5. Added receive() Function (Line 85)

```diff
+ // Allow contract to receive ETH
+ receive() external payable {}
```

**Reason**: Contract needs to receive ETH for deposits and refunds.

---

### 6. Modified deposit() Function (Lines 101-121)

**Changes:**
- Added `intendedStatementId` parameter
- Added check to prevent ETH deposits (use `depositETH()` instead)
- Store `intendedStatementId` in the note

```diff
- function deposit(address token, uint256 amount) external nonReentrant returns (uint256)
+ function deposit(address token, uint256 amount, bytes32 intendedStatementId) external nonReentrant returns (uint256)
```

**Reason**: Track statement ID for all deposits, separate ETH handling.

---

### 7. Added depositETH() Function (Lines 128-145)

**New function:**
```solidity
function depositETH(bytes32 intendedStatementId) external payable nonReentrant returns (uint256)
```

**Reason**: Allow depositing ETH (represented as `token == address(0)`).

---

### 8. Modified reclaimFunds() Function (Lines 152-178)

**Changes:**
- Added conditional handling for ETH vs ERC20

```diff
  // External call comes last
+ if (token == address(0)) {
+   // ETH
+   payable(owner).transfer(amount);
+ } else {
    // ERC20
    IERC20(token).safeTransfer(owner, amount);
+ }
```

**Reason**: Handle withdrawing both ETH and ERC20 tokens.

---

### 9. Modified _delegateFullAmount() Helper (Lines 220-243)

**Changes:**
- Extract and preserve `intendedStatementId`

```diff
+ bytes32 intendedStatementId = notes[noteId].intendedStatementId;
  notes[noteId].delegated = true;

  uint256 delegatedNoteId = nextNoteId++;
  notes[delegatedNoteId] = Note({
    amount: amount,
    token: token,
    owner: delegateTo,
    parentNoteId: noteId,
    delegated: false,
+   intendedStatementId: intendedStatementId
  });
```

**Reason**: Preserve statement ID through delegation.

---

### 10. Modified _splitChain() Helper (Lines 248-323)

**Changes:**
- Extract `intendedStatementId` at start
- Include it in both split chains

```diff
+ // Get intendedStatementId from the chain
+ bytes32 intendedStatementId = notes[leafNoteId].intendedStatementId;

  // ... later in loop ...
  notes[splitChildNoteId] = Note({
    amount: amountToSplit,
    token: token,
    owner: originalOwner,
    parentNoteId: splitCurrentNoteId,
    delegated: false,
+   intendedStatementId: intendedStatementId
  });
```

**Reason**: Preserve statement ID through chain splitting (partial delegation).

---

### 11. Modified _createChain() Helper (Lines 356-376)

**Changes:**
- Added `intendedStatementId` parameter
- Include it in all created notes

```diff
- function _createChain(address token, uint256 amount, address[] memory owners) private returns (uint256)
+ function _createChain(address token, uint256 amount, address[] memory owners, bytes32 intendedStatementId) private returns (uint256)

  notes[newNoteId] = Note({
    amount: amount,
    token: token,
    owner: owner,
    parentNoteId: lastCreatedNoteId,
    delegated: i > 1,
+   intendedStatementId: intendedStatementId
  });
```

**Reason**: Recreate chains with correct statement ID.

---

### 12. Replaced purchaseERC20() with Two New Functions (Lines 389-516)

**Removed:**
- `purchaseERC20()` - 1inch DEX integration (hardcoded router address)

**Added:**

#### purchaseFromERC1155Seller() (Lines 389-446)
```solidity
function purchaseFromERC1155Seller(
  uint256[] calldata noteIds,
  address payable seller,
  address erc1155Contract,
  uint256[] calldata tokenIds,
  uint256[] calldata counts
) external nonReentrant
```

**Purpose**: Purchase ERC1155 tokens from primary market (AssuranceContract)
- Consumes ETH notes (`token == address(0)`)
- Calls `ERC1155Seller.buyERC1155()` with accumulated ETH
- Sends ERC1155 tokens directly to caller (no new notes created)

#### purchaseFromERC1155Marketplace() (Lines 455-516)
```solidity
function purchaseFromERC1155Marketplace(
  uint256[] calldata noteIds,
  address marketplace,
  uint256 saleListingId,
  uint256 count
) external nonReentrant
```

**Purpose**: Purchase ERC1155 tokens from secondary market
- Consumes ETH notes
- Fulfills existing marketplace listing
- Returns excess ETH to caller
- Sends ERC1155 tokens directly to caller

**Reason**:
- Remove hardcoded 1inch dependency
- Use project's own marketplace contracts
- Simpler, more maintainable code

---

## Complete File Diff

The complete unified diff is available in: `DelegatableNotes-changes.diff`

To view it:
```bash
cat hardhat/DelegatableNotes-changes.diff
```

To see line-by-line changes with context:
```bash
diff -y specs/contracts/pubstarter/DelegatableNotes.sol hardhat/contracts/DelegatableNotes.sol | less
```

---

## Verification of Other Contracts

All other contracts were copied unchanged. To verify:

```bash
cd /home/adam/Projects/commonality

# Check all contracts except DelegatableNotes
for file in specs/contracts/pubstarter/*.sol; do
  filename=$(basename "$file")
  if [ "$filename" != "DelegatableNotes.sol" ]; then
    if ! diff -q "$file" "hardhat/contracts/$filename" > /dev/null 2>&1; then
      echo "CHANGED: $filename"
    fi
  fi
done
```

Expected output: (none - all other files are unchanged)

---

## Lines of Code Changed

- **Lines added**: ~150
- **Lines removed**: ~75
- **Net change**: ~+75 lines
- **Total diff size**: 413 lines (with context)

## Breaking Changes

⚠️ **API Breaking Changes:**

1. `deposit()` now requires `intendedStatementId` parameter
2. `purchaseERC20()` removed entirely (replaced with two new functions)
3. Must use `depositETH()` for ETH deposits (can't use `deposit()` with address(0))

These are **intentional** breaking changes to add the requested functionality.
