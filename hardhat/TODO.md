# Smart Contract TODOs (from Slither audit)

Issues identified by running `npm run lint:slither` in `hardhat/`. Ordered by severity.

---

## HIGH

### ~~1. Whitelist external market addresses (arbitrary-send-eth)~~ DONE

Factory registry implemented: `isDeployedMarket` mapping added to both `MarketplaceFactory`
and `AssuranceContractFactory`. `DelegatableNotes` stores immutable references to both
factories (set via constructor) and checks `factory.isDeployedMarket(market)` in both
`purchaseFromPrimaryMarket` and `purchaseFromSecondaryMarket`.

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

## INFORMATIONAL

### 4. Naming convention warnings (naming-convention)

Slither flags these private state variables as not mixedCase:

- `Pubstarter._premintingERC1155Factory` (line 137)
- `Pubstarter._marketplaceFactory` (line 138)
- `Pubstarter._assuranceFactory` (line 139)
- `ERC1155SecondaryMarket._erc1155` (line 51)

Leading-underscore private vars are a common Solidity convention and these are low priority,
but can be silenced with a `// slither-disable-next-line naming-convention` comment if desired.
