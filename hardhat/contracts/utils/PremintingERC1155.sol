//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Burnable} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import {ERC7572} from "./ERC7572.sol";

/**
 * @title PremintingERC1155
 * @notice Simple ERC1155 token contract with owner-controlled batch minting
 * @dev Very simple ERC1155 example contract.
 *      Pre-mints the specified token IDs in the specified amounts,
 *      and gives them to the specified recipient.
 *      Implements ERC1155, ERC1155Burnable, and ERC7572 standards.
 */
contract PremintingERC1155 is Ownable, ERC1155, ERC1155Burnable, ERC7572 {
  error NonTransferableReceipt();

  mapping(address => bool) public isReceiptTransferBridge;
  mapping(uint256 => string) private _tokenURIs;

  event ReceiptTransferBridgeSet(address indexed bridge, bool allowed);
  /**
   * @notice Initializes the PremintingERC1155 contract
   * @param owner The address that will own the contract and can mint tokens
   * @param initialURI The fallback URI for token metadata
   * @param initialContractURI The initial contract metadata URI
   */
  constructor(
    address owner,
    string memory initialURI,
    string memory initialContractURI
  ) Ownable(owner) ERC1155(initialURI) ERC7572(initialContractURI) {}

  /**
   * @notice Mints multiple token types to a specified address
   * @dev Only callable by the contract owner. Emits URI events for each token type.
   * @param to The address that will receive the minted tokens
   * @param ids Array of token IDs to mint
   * @param amounts Array of token amounts corresponding to each ID
   */
  function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts) external onlyOwner {
    _mintBatch(to, ids, amounts, "");
    for (uint256 i = 0; i < ids.length; i++) {
      emit URI(uri(ids[i]), ids[i]);
    }
  }

  function uri(uint256 id) public view virtual override returns (string memory) {
    string memory tokenURI = _tokenURIs[id];
    return bytes(tokenURI).length == 0 ? super.uri(id) : tokenURI;
  }

  function setTokenURI(uint256 id, string memory tokenURI) external onlyOwner {
    _tokenURIs[id] = tokenURI;
    emit URI(tokenURI, id);
  }

  function setReceiptTransferBridge(address bridge, bool allowed) external onlyOwner {
    isReceiptTransferBridge[bridge] = allowed;
    emit ReceiptTransferBridgeSet(bridge, allowed);
  }

  function _update(
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory values
  ) internal virtual override {
    bool mintOrBurn = from == address(0) || to == address(0);
    bool setupByOwner = from == owner() || to == owner();
    bool bridgedMovement = isReceiptTransferBridge[from] || isReceiptTransferBridge[to] || isReceiptTransferBridge[_msgSender()];
    if (!mintOrBurn && !setupByOwner && !bridgedMovement) revert NonTransferableReceipt();
    super._update(from, to, ids, values);
  }
}
