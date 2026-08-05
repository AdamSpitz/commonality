//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {PremintingERC1155} from "../utils/PremintingERC1155.sol";

error PrimaryMarketAlreadySet();
error InvalidPrimaryMarket();
error ProspectiveReceiptBurnNotAllowed();

interface IProspectiveRoundOutcome {
    function hasSucceeded() external view returns (bool);
}

/**
 * @title ProspectiveContentTokens
 * @notice Channel-bound, non-transferable receipts for a prospective content round.
 * @dev The primary assurance market remains a transfer bridge for purchases and failure
 * refunds. Holders may burn directly only after success, because pending receipts may
 * still be required for a failure refund.
 */
contract ProspectiveContentTokens is PremintingERC1155 {
    bytes32 public immutable channelId;
    string public channelCanonicalId;
    address public primaryMarket;

    event PrimaryMarketSet(address indexed primaryMarket);

    constructor(
        address owner,
        bytes32 _channelId,
        string memory _channelCanonicalId,
        string memory uri,
        string memory initialContractURI
    ) PremintingERC1155(owner, uri, initialContractURI) {
        channelId = _channelId;
        channelCanonicalId = _channelCanonicalId;
    }

    function setPrimaryMarket(address _primaryMarket) external onlyOwner {
        if (_primaryMarket == address(0)) revert InvalidPrimaryMarket();
        if (primaryMarket != address(0)) revert PrimaryMarketAlreadySet();
        primaryMarket = _primaryMarket;
        isReceiptTransferBridge[_primaryMarket] = true;
        emit ReceiptTransferBridgeSet(_primaryMarket, true);
        emit PrimaryMarketSet(_primaryMarket);
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override {
        bool directHolderBurn = to == address(0) && from != address(0) && _msgSender() != primaryMarket;
        if (directHolderBurn && !IProspectiveRoundOutcome(primaryMarket).hasSucceeded()) {
            revert ProspectiveReceiptBurnNotAllowed();
        }
        bool mintOrBurn = from == address(0) || to == address(0);
        bool primaryMarketTransfer = from == primaryMarket || to == primaryMarket || _msgSender() == primaryMarket;
        if (!mintOrBurn && !primaryMarketTransfer) revert NonTransferableReceipt();
        super._update(from, to, ids, values);
    }
}
