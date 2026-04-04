//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {MultiERC1155AssuranceContract} from "../individual-projects/AssuranceContracts.sol";

interface ICreatorAssuranceContract {
    function getContentIds() external view returns (uint256[] memory);
}

interface IChannelEscrow {
    function deposit(bytes32 channelId) external payable;
}

error OnlyOwnerOrSelf();
error OnlySelfOrOwner();
error ContentIdsAlreadySet();
error RecipientNotEscrow();

contract CreatorAssuranceContract is MultiERC1155AssuranceContract, ICreatorAssuranceContract {
    bytes32 public channelId;
    uint256[] public contentIds;
    bool public contentIdsInitialized;
    bool public immutable recipientIsEscrow;

    event ContentItemRegistered(
        bytes32 indexed channelId,
        uint256 indexed contentId,
        string canonicalId
    );
    event ContentIdsSet(uint256[] contentIds);

    constructor(
        address owner,
        address recipient,
        string memory projectMetadataCid,
        bytes32 _channelId,
        bool _recipientIsEscrow
    ) MultiERC1155AssuranceContract(owner, recipient, projectMetadataCid) {
        channelId = _channelId;
        recipientIsEscrow = _recipientIsEscrow;
    }

    function setContentIds(uint256[] memory _contentIds) external {
        if (msg.sender != owner() && msg.sender != address(this)) revert OnlyOwnerOrSelf();
        if (contentIdsInitialized) revert ContentIdsAlreadySet();
        contentIds = _contentIds;
        contentIdsInitialized = true;
        emit ContentIdsSet(_contentIds);
    }

    function getContentIds() external view returns (uint256[] memory) {
        return contentIds;
    }

    function setOwner(address newOwner) external {
        if (msg.sender != address(this) && msg.sender != owner()) revert OnlySelfOrOwner();
        transferOwnership(newOwner);
    }

    function withdrawToEscrow() external {
        if (!recipientIsEscrow) revert RecipientNotEscrow();
        requireAssuranceContractHasSucceeded();
        uint256 value = address(this).balance;
        emit AssuranceContractWithdrawal(_recipient, value);
        IChannelEscrow(_recipient).deposit{value: value}(channelId);
    }

    function registerContentItem(uint256 contentId, string calldata canonicalId) external onlyOwner {
        emit ContentItemRegistered(channelId, contentId, canonicalId);
    }
}
