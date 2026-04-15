//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ContractMetadata} from "../utils/ContractMetadata.sol";
import {ERC1155PrimaryMarket} from "./ERC1155PrimaryMarket.sol";
import {AssuranceContract} from "./AssuranceContract.sol";
import {IAssuranceCondition} from "./IAssuranceCondition.sol";

error ArrayLengthMismatch();
error PriceAlreadySet();

/**
 * @title MultiERC1155AssuranceContract
 * @notice Combines assurance contract with ERC1155 token sales
 * @dev Holds pre-minted ERC1155 tokens and sells them at fixed prices.
 *      Tracks total received value to measure funding progress.
 *      Refunds only allowed if project failed.
 *      Implements AssuranceContract, ContractMetadata, and ERC1155PrimaryMarket.
 */
contract MultiERC1155AssuranceContract is
    Ownable,
    ContractMetadata,
    AssuranceContract,
    ERC1155PrimaryMarket
{
    mapping(address => mapping(uint256 => uint256)) private _erc1155Prices;

    uint256 private _totalReceivedValue = 0;

    /**
     * @notice Initializes the multi-ERC1155 assurance contract
     * @param owner The owner of the contract who can set prices and manage the contract
     * @param recipient The address that will receive funds if the project succeeds
     * @param projectMetadataCid The IPFS CID containing project metadata
     */
    constructor(
        address owner,
        address recipient,
        address _paymentToken,
        string memory projectMetadataCid
    ) Ownable(owner) AssuranceContract(recipient, _paymentToken) {
        // no reason to validate the CID, plus we can't really anyway
        emit ContractMetadataUpdated(projectMetadataCid);
    }

    /**
     * @notice Sets the condition contract for this assurance contract (one-time, owner-only)
     * @param condition The IAssuranceCondition that determines success/failure
     */
    function setCondition(IAssuranceCondition condition) external onlyOwner {
        _setCondition(condition);
    }

    /**
     * @notice Sets prices for ERC1155 token IDs
     * @dev Prices cannot be modified once set. Only callable by owner.
     * @param erc1155Addr The address of the ERC1155 token contract
     * @param ids Array of token IDs to set prices for
     * @param prices Array of prices corresponding to each token ID (in wei)
     */
    function setPricesERC1155(
        address erc1155Addr,
        uint256[] memory ids,
        uint256[] memory prices
    ) external onlyOwner {
        if (ids.length != prices.length) revert ArrayLengthMismatch();
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 price = prices[i];
            uint256 currentPrice = _erc1155Prices[erc1155Addr][id];
            if (currentPrice != 0) revert PriceAlreadySet();
            _erc1155Prices[erc1155Addr][id] = price;
            emit ERC1155Offered(erc1155Addr, id, price);
        }
    }

    /**
     * @notice Returns the current funding progress
     * @return The total amount of ETH received so far
     */
    function getAssuranceContractProgress()
        public
        view
        override
        returns (uint256)
    {
        return _totalReceivedValue;
    }

    /**
     * @notice Returns the price for a specific ERC1155 token
     * @param erc1155Addr The address of the ERC1155 token contract
     * @param id The token ID to get the price for
     * @return The price in wei for the token
     */
    function erc1155Price(
        address erc1155Addr,
        uint256 id
    ) internal view override returns (uint256) {
        return _erc1155Prices[erc1155Addr][id];
    }

    /**
     * @notice Returns the total amount of ETH received
     * @return The total received value
     */
    function getTotalReceivedValue() internal view override returns (uint256) {
        return _totalReceivedValue;
    }

    function settlementToken() internal view override returns (address) {
        return paymentToken;
    }

    /**
     * @notice Sets the total received value
     * @param value The new total received value
     */
    function setTotalReceivedValue(uint256 value) internal override {
        _totalReceivedValue = value;
    }

    /**
     * @inheritdoc ERC1155PrimaryMarket
     * @dev Buying is disabled once the assurance contract has failed
     */
    function requireBuyingAllowed() internal view override {
        requireAssuranceContractHasNotFailed();
    }

    /**
     * @notice Checks if refunds are allowed
     * @dev Refunds are only allowed if the assurance contract has failed
     */
    function requireRefundsAllowed() internal view override {
        requireAssuranceContractHasFailed();
    }
}
