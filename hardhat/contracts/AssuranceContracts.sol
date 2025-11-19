//SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ContractMetadata.sol";
import "./ERC1155Seller.sol";
import "./AssuranceContract.sol";

/**
 * Combines assurance contract with ERC1155 token sales.
 * Holds pre-minted ERC1155 tokens and sells them at fixed prices.
 * Tracks total received value to measure funding progress.
 * Selling (refunds) only allowed if project failed.
 */
contract MultiERC1155_AssuranceContract is
    Ownable,
    ContractMetadata,
    AssuranceContract,
    ERC1155Seller
{
    mapping(address => mapping(uint256 => uint256)) private _erc1155Prices;

    uint256 private _totalReceivedValue = 0;

    constructor(
        address owner,
        address recipient,
        uint256 threshold,
        uint256 deadline,
        string memory projectMetadataCid
    ) Ownable(owner) AssuranceContract(recipient, threshold, deadline) {
        emit ContractMetadataUpdated(projectMetadataCid);
    }

    /**
     * Set prices for token IDs. Prices cannot be modified once set.
     */
    function setPricesERC1155(
        address erc1155Addr,
        uint256[] memory ids,
        uint256[] memory prices
    ) external onlyOwner {
        require(ids.length == prices.length, "Arrays must be the same length");
        for (uint i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 price = prices[i];
            uint256 currentPrice = _erc1155Prices[erc1155Addr][id];
            require(currentPrice == 0, "Price already set");
            _erc1155Prices[erc1155Addr][id] = price;
            emit ERC1155Offered(erc1155Addr, id, price);
        }
    }

    function getAssuranceContractProgress()
        public
        view
        override
        returns (uint256)
    {
        return _totalReceivedValue;
    }

    function erc1155Price(
        address erc1155Addr,
        uint256 id
    ) internal view override returns (uint256) {
        return _erc1155Prices[erc1155Addr][id];
    }

    function getTotalReceivedValue() internal view override returns (uint256) {
        return _totalReceivedValue;
    }

    function setTotalReceivedValue(uint256 value) internal override {
        _totalReceivedValue = value;
    }

    function requireBuyingAllowed() internal view override {
        // No conditions needed here. It's always okay to buy, even
        // if the deadline has passed or whatever.
    }

    function requireRefundsAllowed() internal view override {
        requireAssuranceContractHasFailed();
    }
}
