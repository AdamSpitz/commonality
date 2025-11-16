# Pubstarter Smart Contracts Summary

## Overview

This is a crowdfunding platform built on Ethereum that uses an **assurance contract** model (like Kickstarter). Contributors buy ERC1155 tokens to fund projects, and if the funding goal isn't reached by the deadline, they can get refunds by selling the tokens back.

## Core Contracts

### 1. Assurance Contract System

**[AssuranceContract.sol](specs/pubstarter-contracts/AssuranceContract.sol)** (Abstract)
- Base contract implementing the assurance/crowdfunding logic
- Has a recipient, funding threshold, and deadline
- If threshold is met: recipient can withdraw funds
- If deadline passes without meeting threshold: contributors can get refunds
- Progress tracked via `getAssuranceContractProgress()` (implemented by subclasses)

**[AssuranceContracts.sol](specs/pubstarter-contracts/AssuranceContracts.sol)** (MultiERC1155_AssuranceContract)
- Concrete implementation combining assurance contract with ERC1155 token sales
- Holds pre-minted ERC1155 tokens and sells them at fixed prices
- Tracks `_totalReceivedValue` to measure funding progress
- Owner can set prices for token IDs (but cannot change them once set)
- Selling (refunds) only allowed if project failed
- Buying always allowed (even after deadline)

### 2. Token Contracts

**[PremintingERC1155.sol](specs/pubstarter-contracts/PremintingERC1155.sol)**
- Simple ERC1155 that allows owner to mint tokens in batches
- Used for creating crowdfunding reward tokens
- Owner renounces ownership after minting (see Pubstarter.sol:110)

**[FreeERC1155.sol](specs/pubstarter-contracts/FreeERC1155.sol)**
- Anyone can mint any amount of any token ID for free
- No monetary value; used for showing support (like minting a badge/sticker)

**[PremintingERC20.sol](specs/pubstarter-contracts/PremintingERC20.sol)**
- Simple ERC20 with owner-controlled minting
- Not currently integrated into the main Pubstarter flow

### 3. Marketplace

**[ERC1155Marketplace.sol](specs/pubstarter-contracts/ERC1155Marketplace.sol)**
- Full orderbook DEX for ERC1155 tokens
- Supports both sale listings (seller posts tokens for sale) and buy orders (buyer deposits ETH)
- Sale listings: seller deposits tokens, buyer pays ETH to fulfill
- Buy orders: buyer deposits ETH, seller provides tokens to fulfill
- Both can be partially filled or cancelled
- Uses ReentrancyGuard for security

**[ERC1155Seller.sol](specs/pubstarter-contracts/ERC1155Seller.sol)** (Abstract)
- Simpler buy/sell mechanism (not a full marketplace)
- Contract holds tokens and sells them at fixed prices
- `buyERC1155`: users pay ETH to buy tokens from the contract
- `sellERC1155`: users return tokens to get ETH back (refund mechanism)
- Used as base for AssuranceContracts

### 4. Delegation System

**[DelegatableNotes.sol](specs/pubstarter-contracts/DelegatableNotes.sol)**
- Sophisticated system for delegating control of tokens without transferring ownership
- Users deposit ERC20 tokens, receive "notes" representing ownership
- Notes can be delegated to others, creating a parent-child chain
- Delegate controls the note but original owner can revoke
- Supports partial delegation (splits the chain into two parallel chains)
- Can swap tokens via DEX (1inch) while preserving delegation structure
- Original depositor always tracked and can reclaim if undelegated

### 5. Factory System

**[Pubstarter.sol](specs/pubstarter-contracts/Pubstarter.sol)**
- Main entry point with factory contracts for creating all components
- `FreeERC1155Factory`: creates free-mint tokens
- `PremintingERC1155Factory`: creates owner-mintable tokens
- `MarketplaceFactory`: creates orderbook marketplaces
- `AssuranceContractFactory`: creates assurance contracts

**Main workflow** (`createERC1155AndMarketplaceAndAssuranceContract`):
1. Create PremintingERC1155 token (owned by Pubstarter temporarily)
2. Create Marketplace for that token
3. Create AssuranceContract (owned by Pubstarter temporarily)
4. Set prices on the AssuranceContract
5. Transfer ownership to the project owner
6. Mint all tokens to the AssuranceContract
7. Renounce ownership of the token contract

### 6. Metadata Contracts

**[ERC7572.sol](specs/pubstarter-contracts/ERC7572.sol) / [IERC7572.sol](specs/pubstarter-contracts/IERC7572.sol)**
- Implements ERC7572 standard for contract-level metadata
- Provides `contractURI()` for off-chain metadata
- MutableERC7572 variant allows owner to update URI

**[ContractMetadata.sol](specs/pubstarter-contracts/ContractMetadata.sol)**
- Simple event emitter for metadata updates
- Used in AssuranceContracts to track project metadata CID

## Architecture Analysis

### Strengths
1. **Well-structured**: Good separation of concerns with abstract base classes
2. **Security-conscious**: Uses OpenZeppelin contracts, ReentrancyGuard, SafeERC20
3. **Flexible**: Multiple pathways (marketplace orderbook vs. direct assurance contract sales)
4. **Innovative**: The delegation system is sophisticated and well-thought-out

### Potential Issues

#### Critical
1. **DelegatableNotes.sol:411** - Hardcoded 1inch router address:
   ```solidity
   IERC20(inputToken).approve(address(0x1111111254fb6c44bAC0beD2854e76F90643097d), totalInputTokenAmount);
   ```
   This address is chain-specific and won't work on testnets or other chains.

2. **No validation of DEX swap data** (DelegatableNotes.sol:412):
   ```solidity
   // TODO: parse swapData to ensure it's swapping inputToken -> outputToken
   ```
   Malicious user could potentially swap to wrong token or manipulate the swap.

#### Design Concerns

3. **ERC1155Marketplace.sol** - Transfer-then-transfer pattern could be gas-inefficient:
   - Line 106: Contract receives ETH, then immediately transfers to seller
   - Could be optimized with direct transfers in some cases

4. **Circular delegation check** (DelegatableNotes.sol:453) is good, but delegation chains could grow unboundedly long, potentially causing gas issues.

5. **AssuranceContracts.sol:42-46** - Price immutability is enforced but could be restrictive:
   ```solidity
   require(currentPrice == 0 || currentPrice == price, "Cannot modify prices");
   ```
   Once set, prices can never change, even if set by mistake.

6. **No pause mechanism** - If a critical bug is found, there's no way to pause the contracts.

7. **Pubstarter.sol factory pattern** - Creates contracts with `new`, meaning addresses are hard to predict. Consider using CREATE2 for deterministic addresses.

#### Minor Issues

8. **Hardhat console import** still present in Pubstarter.sol:5 and AssuranceContracts.sol:5 - should be removed before mainnet deployment.

9. **AssuranceContracts.sol:76-78** - Empty `requireBuyingAllowed()` with comment. Consider making it explicit with a comment or returning immediately.

10. **ERC1155Marketplace.sol:31** - Comment says "could this be marked as immutable" - yes, it should be! The address never changes after construction.

11. **No events for price setting** in some places - makes indexing harder.

12. **Floating pragma** in most files (`>=0.8.0 <0.9.0`) - good for libraries, but production contracts should use locked pragma.

## Do They Work?

### Yes, mostly:
- The core assurance contract logic is sound
- The marketplace orderbook implementation looks correct
- The delegation system is complex but appears logically sound
- Security patterns (reentrancy guards, checks-effects-interactions) are mostly followed

### But:
1. **DelegatableNotes won't work** on testnets or non-mainnet chains due to hardcoded 1inch address
2. **DelegatableNotes is vulnerable** to malicious swap data (the TODO at line 412 is important)
3. **Gas optimization** could be improved in several places

### Recommendations:
1. Make the DEX router address configurable or at least document the limitation
2. Implement proper validation of DEX swap data or remove that feature
3. Add pause functionality for emergency situations
4. Make `_erc1155` immutable in ERC1155Marketplace
5. Remove hardhat console imports
6. Consider adding more comprehensive events
7. Add thorough unit tests, especially for edge cases in DelegatableNotes
8. Get a professional security audit before deploying to mainnet

## Overall Assessment

This is **well-designed code** with good architectural patterns and clear understanding of Solidity security practices. The assurance contract + token model is elegant. The DelegatableNotes contract needs significant work around DEX integration. With those fixes and a security audit, this could be production-ready.
