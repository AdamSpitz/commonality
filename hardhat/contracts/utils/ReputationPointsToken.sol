//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Owner-minted points for early usage. Vanilla ERC-20: transferable, no fees, no rebasing, no callbacks.
/// @dev Mint policy is a stub (owner-mint) until a product decision replaces it.
contract ReputationPointsToken is ERC20, Ownable {
    constructor(address owner) ERC20("Commonality Points", "POINTS") Ownable(owner) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
