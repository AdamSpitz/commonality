//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "./ERC7572.sol";

/**
 * @title PremintingERC20
 * @notice Simple ERC20 token contract with owner-controlled minting
 * @dev Very simple ERC20 example contract.
 *      Pre-mints the specified tokens in the specified amounts,
 *      and gives them to the specified recipient.
 *      Implements ERC20, ERC20Burnable, and ERC7572 standards.
 */
contract PremintingERC20 is Ownable, ERC20, ERC20Burnable, ERC7572 {
  /**
   * @notice Initializes the PremintingERC20 contract
   * @param owner The address that will own the contract and can mint tokens
   * @param name The name of the ERC20 token
   * @param symbol The symbol of the ERC20 token
   * @param initialContractURI The initial contract metadata URI
   */
  constructor(
    address owner,
    string memory name,
    string memory symbol,
    string memory initialContractURI
  ) Ownable(owner) ERC20(name, symbol) ERC7572(initialContractURI) {}

  /**
   * @notice Mints new tokens to a specified address
   * @dev Only callable by the contract owner
   * @param to The address that will receive the minted tokens
   * @param amount The amount of tokens to mint
   */
  function mint(address to, uint256 amount) external onlyOwner {
    _mint(to, amount);
  }
}
