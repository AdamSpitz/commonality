# Pubstarter Smart Contracts Summary

These are contracts that I wrote a long time ago; they're not quite complete, but this should be a good starting point.

The rest of this file was AI-generated, but I think it's a good summary.

## Overview

Crowdfunding platform built on Ethereum using an **assurance contract** model (like Kickstarter). Contributors buy ERC1155 tokens to fund projects, and if the funding goal isn't reached by the deadline, they can get refunds by selling the tokens back.

## Architecture

The platform consists of:
- **Assurance contracts** for managing project funding goals and deadlines
- **Token contracts** (ERC1155 and ERC20) for crowdfunding rewards
- **Marketplace** for secondary trading
- **Delegation system** for sophisticated token control without transfers
- **Factory system** for deploying projects

See individual contract files for implementation details.

## Key Design Points

### Strengths
1. Good separation of concerns with abstract base classes
2. Uses OpenZeppelin contracts, ReentrancyGuard, SafeERC20
3. Flexible pathways (marketplace orderbook vs. direct assurance contract sales)
4. Sophisticated delegation system

### Known Issues

#### Critical
1. **DelegatableNotes** - Hardcoded 1inch router address only works on mainnet
2. **DelegatableNotes** - No validation of DEX swap data (see TODO in code)

#### Design Considerations
3. Price immutability in AssuranceContracts (intentional but restrictive)
4. No pause mechanism
5. Delegation chains could grow long (potential gas issues)
6. Hardhat console imports should be removed before deployment

### Pre-deployment Checklist
- Validate/remove DEX swap feature or make router configurable
- Remove hardhat console imports
- Consider pause functionality
- Lock pragma versions for production
- Comprehensive testing of edge cases
- Professional security audit
