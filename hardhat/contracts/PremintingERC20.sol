//SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "./ERC7572.sol";

// Very simple ERC1155 example contract.
// Pre-mints the specified tokens ids in the specified amounts,
// and gives them to the specified recipient.
contract PremintingERC20 is Ownable, ERC20, ERC20Burnable, ERC7572 {
  constructor(
    address owner,
    string memory name,
    string memory symbol,
    string memory initialContractURI
  ) Ownable(owner) ERC20(name, symbol) ERC7572(initialContractURI) {}

  function mint(address to, uint256 amount) external onlyOwner {
    _mint(to, amount);
  }
}
