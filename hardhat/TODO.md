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

### ~~2. Add `nonReentrant` to `delegate()` and `revoke()` (reentrancy-eth)~~ DONE

Added `nonReentrant` modifier to both `delegate()` and `revoke()` in `DelegatableNotes.sol`.
Since all functions share the same `ReentrancyGuard` lock, a malicious market contract
can no longer call back into these functions during a purchase transaction.

---

## MEDIUM

## INFORMATIONAL

### 4. Naming convention warnings (naming-convention)

Slither flags these private state variables as not mixedCase:

- `Pubstarter._premintingERC1155Factory` (line 137)
- `Pubstarter._marketplaceFactory` (line 138)
- `Pubstarter._assuranceFactory` (line 139)
- `ERC1155SecondaryMarket._erc1155` (line 51)

Leading-underscore private vars are a common Solidity convention and these are low priority,
but can be silenced with a `// slither-disable-next-line naming-convention` comment if desired.
