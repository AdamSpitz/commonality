//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Burnable} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import {ERC7572} from "./ERC7572.sol";

/**
 * @title FreeERC1155
 * @notice Free-to-mint ERC1155 token contract with no monetary value
 * @dev Doesn't take in any money. Allows anyone to mint any amount of any token ID.
 *      The tokens aren't meant to have any value; the only point of this is that
 *      it allows people to choose whether to mint them or not. (e.g. Maybe the
 *      token image has a slogan on it, and the user wants to mint it to show support.)
 *      Implements ERC1155, ERC1155Burnable, and ERC7572 standards.
 */
contract FreeERC1155 is ERC1155, ERC1155Burnable, ERC7572 {
  /**
   * @notice Initializes the FreeERC1155 contract
   * @param uri The base URI for token metadata
   * @param initialContractURI The initial contract metadata URI
   */
  constructor(string memory uri, string memory initialContractURI) ERC1155(uri) ERC7572(initialContractURI) {}

  /**
   * @notice Mints tokens to a specified address
   * @dev Anyone can call this function to mint tokens for free
   * @param to The address that will receive the minted tokens
   * @param id The token ID to mint
   * @param amount The amount of tokens to mint
   */
  function mint(address to, uint256 id, uint256 amount) external {
    _mint(to, id, amount, "");
  }

  /**
   * @notice Mints multiple token types to a specified address
   * @dev Anyone can call this function to mint multiple token types for free
   * @param to The address that will receive the minted tokens
   * @param ids Array of token IDs to mint
   * @param amounts Array of amounts corresponding to each token ID
   */
  function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts) external {
    _mintBatch(to, ids, amounts, "");
  }
}
