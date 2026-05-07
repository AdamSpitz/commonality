//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title FreeERC20
 * @notice Free-to-mint ERC20 token for local development and testnets
 * @dev Anyone can mint any amount. No monetary value; intended as a stand-in
 *      for settlement tokens (e.g. USDC) in test environments.
 */
contract FreeERC20 is ERC20, ERC20Burnable {
  uint8 private immutable _decimals;

  constructor(
    string memory name,
    string memory symbol,
    uint8 tokenDecimals
  ) ERC20(name, symbol) {
    _decimals = tokenDecimals;
  }

  function decimals() public view override returns (uint8) {
    return _decimals;
  }

  /**
   * @notice Mints tokens to the caller's address
   * @param amount The amount of tokens to mint
   */
  function mint(uint256 amount) external {
    _mint(msg.sender, amount);
  }

  /**
   * @notice Mints tokens to a specified address
   * @param to The address that will receive the minted tokens
   * @param amount The amount of tokens to mint
   */
  function mintTo(address to, uint256 amount) external {
    _mint(to, amount);
  }
}
