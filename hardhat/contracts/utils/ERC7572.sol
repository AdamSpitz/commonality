// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC7572} from "./IERC7572.sol";

/**
 * @title ERC7572
 * @notice Abstract implementation of ERC7572 Contract-Level Metadata Standard
 * @dev See https://eips.ethereum.org/EIPS/eip-7572
 *      Provides a contractURI function that returns metadata about the contract.
 */
abstract contract ERC7572 is IERC7572 {
  string internal _contractURI;

  /**
   * @notice Initializes the contract with a metadata URI
   * @param initialContractURI The initial URI pointing to contract metadata
   */
  constructor(string memory initialContractURI) {
    _contractURI = initialContractURI;
  }

  /**
   * @notice Returns the URI for contract-level metadata
   * @return The URI string pointing to contract metadata
   */
  function contractURI() public view virtual override returns (string memory) {
    return _contractURI;
  }
}

/**
 * @title MutableERC7572
 * @notice Mutable implementation of ERC7572 that allows updating the contract URI
 * @dev Extends ERC7572 with ownership controls for updating metadata
 */
abstract contract MutableERC7572 is ERC7572, Ownable {
  /**
   * @notice Updates the contract URI
   * @dev Only callable by the contract owner
   * @param newContractURI The new URI pointing to contract metadata
   */
  function setContractURI(string memory newContractURI) public virtual onlyOwner {
    _contractURI = newContractURI;
    emit ContractURIUpdated();
  }
}
