# Smart Contract TODOs (from Slither audit)

Issues identified by running `npm run lint:slither` in `hardhat/`. Ordered by severity.

---

## HIGH

### 1. Whitelist external market addresses (arbitrary-send-eth)

**Files:** `contracts/delegation/DelegatableNotes.sol` lines 384, 441

`purchaseFromPrimaryMarket` and `purchaseFromSecondaryMarket` accept `primaryMarket` and
`secondaryMarket` as caller-supplied parameters and forward ETH to them without validation.
A user could pass a malicious contract that steals or redirects the ETH.

**Fix:** Maintain an owner-controlled whitelist of approved market addresses and validate before
forwarding ETH:

```solidity
mapping(address => bool) public approvedPrimaryMarkets;
mapping(address => bool) public approvedSecondaryMarkets;

// In purchaseFromPrimaryMarket:
if (!approvedPrimaryMarkets[primaryMarket]) revert UnauthorizedMarket();

// In purchaseFromSecondaryMarket:
if (!approvedSecondaryMarkets[secondaryMarket]) revert UnauthorizedMarket();
```

---

### 2. Add `nonReentrant` to `delegate()` and `revoke()` (reentrancy-eth)

**File:** `contracts/delegation/DelegatableNotes.sol` lines 223, 281

`purchaseFromPrimaryMarket` and `purchaseFromSecondaryMarket` are protected by `nonReentrant`,
but they make external calls to market contracts before writing the output notes. During that
window, a malicious market contract could call back into `delegate()` or `revoke()`, which are
**not** guarded by `nonReentrant`. This allows cross-function reentrancy while the `notes`
mapping is in an intermediate state (input notes consumed, output notes not yet created).

**Fix:** Add `nonReentrant` to both functions:

```solidity
function delegate(...) external nonReentrant returns (...) {
function revoke(...) external nonReentrant {
```

---

## MEDIUM

### 3. Don't ignore return values from `getSaleListing` (unused-return)

**File:** `contracts/delegation/DelegatableNotes.sol` line 449

```solidity
(, uint256 tokenId,,) = ERC1155SecondaryMarket(secondaryMarket).getSaleListing(saleListingId);
```

The seller, count, and pricePerToken are silently dropped. If the listing is cancelled or its
slot is reused between the purchase call and this read, notes could be created with a wrong
token ID.

**Fix:** Capture and validate all return values, or read listing details before the external
purchase call and cache them for use afterwards.

---

## LOW

### 4. Emit event before external call in `AssuranceContract.withdraw()` (reentrancy-events)

**File:** `contracts/individual-projects/AssuranceContract.sol` lines 72–79

The `AssuranceContractWithdrawal` event is emitted after the ETH transfer. If the recipient is
a contract, it could reenter and the event log would be out of order relative to actual state
changes.

**Fix:** Move the emit before the `.call{value: ...}`.

---

### 5. Remove `this.` from `PremintingERC1155.mintBatch` (var-read-using-this)

**File:** `contracts/utils/PremintingERC1155.sol` line 40

```solidity
URI(this.uri(ids[i]), ids[i])  // triggers an unnecessary STATICCALL
```

**Fix:** Change to `uri(ids[i])` (internal call, no extra STATICCALL, cheaper gas).

---

## INFORMATIONAL

### 6. Naming convention warnings (naming-convention)

Slither flags these private state variables as not mixedCase:

- `Pubstarter._premintingERC1155Factory` (line 137)
- `Pubstarter._marketplaceFactory` (line 138)
- `Pubstarter._assuranceFactory` (line 139)
- `ERC1155SecondaryMarket._erc1155` (line 51)

Leading-underscore private vars are a common Solidity convention and these are low priority,
but can be silenced with a `// slither-disable-next-line naming-convention` comment if desired.
