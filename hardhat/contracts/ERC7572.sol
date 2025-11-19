// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IERC7572.sol";

abstract contract ERC7572 is IERC7572 {
  string internal _contractURI;

  constructor(string memory initialContractURI) {
    _contractURI = initialContractURI;
  }

  function contractURI() public view virtual override returns (string memory) {
    return _contractURI;
  }
}

abstract contract MutableERC7572 is ERC7572, Ownable {
  function setContractURI(string memory newContractURI) public virtual onlyOwner {
    _contractURI = newContractURI;
    emit ContractURIUpdated();
  }
}
