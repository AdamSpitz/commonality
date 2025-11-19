//SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "./ERC7572.sol";

// Doesn't take in any money. Allows anyone to mint any amount of any token id.
// The tokens aren't meant to have any value; the only point of this is that
// it allows people to choose whether to mint them or not. (e.g. Maybe the
// token image has a slogan on it, and the user wants to mint it to show
// support.)
contract FreeERC1155 is ERC1155, ERC1155Burnable, ERC7572 {
  constructor(string memory uri, string memory initialContractURI) ERC1155(uri) ERC7572(initialContractURI) {}

  function mint(address to, uint256 id, uint256 amount) external {
    _mint(to, id, amount, "");
  }

  function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts) external {
    _mintBatch(to, ids, amounts, "");
  }
}
