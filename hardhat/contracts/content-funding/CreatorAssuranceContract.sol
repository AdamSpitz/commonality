//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {MultiERC1155AssuranceContract} from "../individual-projects/AssuranceContracts.sol";
import {IAssuranceCondition} from "../individual-projects/IAssuranceCondition.sol";

contract CreatorAssuranceContract is MultiERC1155AssuranceContract {
    bytes32 public channelId;
    uint256[] public contentIds;

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
        bytes32 _channelId
    ) MultiERC1155AssuranceContract(owner, recipient, projectMetadataCid) {
        channelId = _channelId;
    }

    function setContentIds(uint256[] memory _contentIds) external {
        require(msg.sender == owner() || msg.sender == address(this), "Only owner or self");
        contentIds = _contentIds;
        emit ContentIdsSet(_contentIds);
    }

    function getContentIds() external view returns (uint256[] memory) {
        return contentIds;
    }

    function setOwner(address newOwner) external {
        require(msg.sender == address(this) || msg.sender == owner(), "Only self or owner");
        transferOwnership(newOwner);
    }

    function registerContentItem(uint256 contentId, string calldata canonicalId) external onlyOwner {
        emit ContentItemRegistered(channelId, contentId, canonicalId);
    }
}
