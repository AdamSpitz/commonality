//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "./ERC7572.sol";

// Very simple ERC1155 example contract.
// Pre-mints the specified tokens ids in the specified amounts,
// and gives them to the specified recipient.
contract PremintingERC1155 is Ownable, ERC1155, ERC1155Burnable, ERC7572 {
  constructor(
    address owner,
    string memory uri,
    string memory initialContractURI
  ) Ownable(owner) ERC1155(uri) ERC7572(initialContractURI) {}

  function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts) external onlyOwner {
    _mintBatch(to, ids, amounts, "");
    for (uint id = 0; id < ids.length; id++) {
      emit URI(this.uri(id), id);
    }
  }
}
