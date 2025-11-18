# Commonality Smart Contracts

This Hardhat project contains the smart contracts for the Commonality project, focusing on the Pubstarter (crowdfunding) and Delegatable Notes components.

## Changes Made to DelegatableNotes Contract

### 1. Added `intendedStatementId` Field

Each note now includes a `bytes32 intendedStatementId` field that stores the IPFS CID (as bytes32) of the statement the note is intended to support. This allows tracking which cause the funds are earmarked for.

- Added to the `Note` struct
- Required parameter in `deposit()` and `depositETH()` functions
- Preserved through delegation, revocation, and chain splitting operations
- Stored in the `ChainCache` struct for maintaining consistency during complex operations

### 2. Replaced 1inch DEX Integration with ERC1155Seller and ERC1155Marketplace

Removed the hardcoded 1inch router integration and replaced it with two new functions:

**`purchaseFromERC1155Seller()`**
- Purchases ERC1155 tokens directly from an ERC1155Seller contract (e.g., AssuranceContract)
- Consumes ETH notes (notes with `token == address(0)`)
- Transfers purchased ERC1155 tokens directly to the caller
- No new notes are created for the ERC1155 tokens (they represent project ownership, not delegatable funding)

**`purchaseFromERC1155Marketplace()`**
- Purchases ERC1155 tokens from the secondary market via ERC1155Marketplace
- Fulfills existing sale listings
- Returns any excess ETH to the caller
- Also sends ERC1155 tokens directly to the caller

### 3. Added ETH Support

**`depositETH()`**
- New payable function for depositing ETH
- Creates notes with `token == address(0)` to represent ETH
- Required for purchasing from ERC1155Seller and ERC1155Marketplace (which expect ETH payment)

**Updated `reclaimFunds()`**
- Now handles both ERC20 tokens and ETH
- Checks if `token == address(0)` and transfers ETH via `payable().transfer()` or ERC20 via SafeERC20

**`receive()` function**
- Added to allow the contract to receive ETH

## Project Structure

```
hardhat/
├── contracts/           # All smart contracts copied from specs/contracts/pubstarter
│   ├── DelegatableNotes.sol          # Main contract (modified)
│   ├── ERC1155Seller.sol
│   ├── ERC1155Marketplace.sol
│   ├── AssuranceContracts.sol
│   ├── PremintingERC1155.sol
│   └── ... (other contracts)
├── test/                # Test files
│   └── DelegatableNotes.t.sol        # Solidity test contract
├── hardhat.config.js    # Hardhat configuration
└── package.json         # Dependencies
```

## Compilation

The contracts are configured to compile with Solidity 0.8.20 using the IR-based compiler (`viaIR: true`) to avoid stack-too-deep errors.

```bash
npx hardhat compile
```

## Testing

A basic Solidity test contract (`DelegatableNotes.t.sol`) is included that tests:

1. **ETH Deposits** - Depositing ETH and storing intendedStatementId
2. **ERC20 Deposits** - Depositing ERC20 tokens with intendedStatementId
3. **Full Delegation** - Delegating entire note amount to another address
4. **Partial Delegation** - Delegating partial amount (creating split chains)
5. **Reclaiming Funds** - Withdrawing ETH from undelegated root notes

The tests verify that `intendedStatementId` is preserved through all operations.

To run the tests:

```bash
cd hardhat
npx hardhat test
```

All 5 tests should pass.

## Key Design Decisions

1. **ETH Representation**: ETH is represented by `token == address(0)` rather than using WETH, keeping the implementation simple.

2. **No Note Wrapping for ERC1155**: When purchasing ERC1155 tokens, they are sent directly to the caller rather than being wrapped in new notes. This is intentional because:
   - ERC1155 tokens represent ownership stakes in projects (like NFT rewards)
   - They don't need the delegation functionality that notes provide
   - Users can still trade them on the marketplace if desired

3. **intendedStatementId Preservation**: The statement ID is preserved through all note operations (delegation, splitting, etc.) to maintain the connection between funds and their intended cause.

## Future Improvements

- Support for purchasing with ERC20 tokens (currently only ETH is supported for purchases)
- Integration with DEX aggregators for swapping between different tokens
- Gas optimization for complex delegation chains
- Additional safety checks and access controls
