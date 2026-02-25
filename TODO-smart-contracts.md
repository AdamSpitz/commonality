# Smart Contract TODOs (from Slither audit)

Issues identified by running `npm run lint:slither` in `hardhat/`. Ordered by severity.

---

## HIGH

### 1. Whitelist external market addresses (arbitrary-send-eth)

**Files:** `contracts/delegation/DelegatableNotes.sol` lines 384, 441

`purchaseFromPrimaryMarket` and `purchaseFromSecondaryMarket` accept `primaryMarket` and
`secondaryMarket` as caller-supplied parameters and forward ETH to them without validation.
A user could pass a malicious contract that steals or redirects the ETH.

**Fix:** Whitelist the *factories* rather than individual market addresses. Each market is
deployed via a factory (`MarketplaceFactory`, `AssuranceContractFactory`) using `new`, so the
bytecode is guaranteed to be legitimate. Add a registry to each factory so DelegatableNotes
can verify a market was factory-deployed:

1. Add `mapping(address => bool) public isDeployedMarket` to `MarketplaceFactory` (and the
   equivalent for primary markets / assurance contracts). Set it to `true` in each
   `create*` function.

2. Add `Ownable` to `DelegatableNotes` and store approved factory addresses:

```solidity
mapping(address => bool) public approvedPrimaryMarketFactories;
mapping(address => bool) public approvedSecondaryMarketFactories;

function setApprovedPrimaryMarketFactory(address factory, bool approved) external onlyOwner {
    approvedPrimaryMarketFactories[factory] = approved;
}

function setApprovedSecondaryMarketFactory(address factory, bool approved) external onlyOwner {
    approvedSecondaryMarketFactories[factory] = approved;
}
```

3. Validate in each purchase function by checking the factory registry:

```solidity
error UnauthorizedMarket();

// In purchaseFromPrimaryMarket (caller passes factory address, or it's stored once):
if (!approvedPrimaryMarketFactories[factory]) revert UnauthorizedMarket();
if (!AssuranceContractFactory(factory).isDeployedMarket(primaryMarket)) revert UnauthorizedMarket();

// In purchaseFromSecondaryMarket:
if (!approvedSecondaryMarketFactories[factory]) revert UnauthorizedMarket();
if (!MarketplaceFactory(factory).isDeployedMarket(secondaryMarket)) revert UnauthorizedMarket();
```

This avoids needing to update DelegatableNotes every time a new project is created — the
factory is whitelisted once, and any market it deploys is automatically trusted. On-chain
type-checking (ERC-165, bytecode hashing) doesn't help here because a malicious contract can
trivially fake interface support.

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
