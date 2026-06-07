//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {PremintingERC1155} from "../utils/PremintingERC1155.sol";

error NonTransferableReceipt();
error PrimaryMarketAlreadySet();

/**
 * @title ProspectiveContentTokens
 * @notice ERC1155 receipt tokens for prospective content rounds.
 * @dev Tokens may move through the configured primary market for initial sales and
 *      refunds, but ordinary holder-to-holder transfers are disabled. Materialized
 *      content contracts can therefore use current balances as stable backing
 *      entitlements without snapshot machinery.
 */
contract ProspectiveContentTokens is PremintingERC1155 {
    address public primaryMarket;

    event PrimaryMarketSet(address indexed primaryMarket);

    constructor(
        address owner,
        string memory uri,
        string memory initialContractURI
    ) PremintingERC1155(owner, uri, initialContractURI) {}

    function setPrimaryMarket(address _primaryMarket) external onlyOwner {
        if (primaryMarket != address(0)) revert PrimaryMarketAlreadySet();
        primaryMarket = _primaryMarket;
        emit PrimaryMarketSet(_primaryMarket);
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override {
        bool mintOrBurn = from == address(0) || to == address(0);
        bool primaryMarketTransfer = from == primaryMarket || to == primaryMarket;
        if (!mintOrBurn && !primaryMarketTransfer) revert NonTransferableReceipt();
        super._update(from, to, ids, values);
    }
}

contract ProspectiveContentTokensFactory {
    event ProspectiveContentTokensCreated(address indexed tokenContract, address indexed owner);

    function createProspectiveContentTokens(
        address owner,
        string memory uri,
        string memory initialContractURI
    ) external returns (ProspectiveContentTokens) {
        ProspectiveContentTokens token = new ProspectiveContentTokens(owner, uri, initialContractURI);
        emit ProspectiveContentTokensCreated(address(token), owner);
        return token;
    }
}
