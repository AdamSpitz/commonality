//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {MultiERC1155AssuranceContract} from "../individual-projects/AssuranceContracts.sol";

/**
 * @title ICreatorAssuranceContract
 * @notice Interface for querying content IDs associated with a creator assurance contract
 */
interface ICreatorAssuranceContract {
    function getContentIds() external view returns (uint256[] memory);
}

/**
 * @title IChannelEscrow
 * @notice Interface for depositing funds into channel escrow
 */
interface IChannelEscrow {
    function deposit(bytes32 channelId) external payable;
}

error OnlyOwnerOrSelf();
error OnlySelfOrOwner();
error ContentIdsAlreadySet();
error RecipientNotEscrow();

/**
 * @title CreatorAssuranceContract
 * @notice Assurance contract for content creators, linking token sales to specific content items
 * @dev Extends MultiERC1155AssuranceContract with channel and content tracking.
 *      Can optionally route successful withdrawals through a ChannelEscrow contract
 *      (for unclaimed channels where the creator hasn't verified yet).
 */
contract CreatorAssuranceContract is MultiERC1155AssuranceContract, ICreatorAssuranceContract {
    /// @notice The channel ID this contract is associated with
    bytes32 public channelId;
    /// @notice The content IDs funded by this contract
    uint256[] public contentIds;
    /// @notice Whether content IDs have been initialized (one-time set)
    bool public contentIdsInitialized;
    /// @notice Whether the recipient is a ChannelEscrow (true for unclaimed channels)
    bool public immutable recipientIsEscrow;

    /**
     * @notice Emitted when the content IDs are set for this contract
     * @param contentIds The array of content IDs
     */
    event ContentIdsSet(uint256[] contentIds);

    /**
     * @notice Initializes the creator assurance contract
     * @param owner The owner who can manage the contract
     * @param recipient The address that receives funds on success (either channel owner or escrow)
     * @param projectMetadataCid The IPFS CID containing project metadata
     * @param _channelId The channel ID this contract is associated with
     * @param _recipientIsEscrow Whether the recipient is a ChannelEscrow contract
     */
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

    /**
     * @notice Set the content IDs associated with this contract (one-time only)
     * @dev Only callable by the owner or the contract itself (during factory setup)
     * @param _contentIds Array of content IDs to associate
     */
    function setContentIds(uint256[] memory _contentIds) external {
        if (msg.sender != owner() && msg.sender != address(this)) revert OnlyOwnerOrSelf();
        if (contentIdsInitialized) revert ContentIdsAlreadySet();
        contentIds = _contentIds;
        contentIdsInitialized = true;
        emit ContentIdsSet(_contentIds);
    }

    /**
     * @notice Returns the content IDs associated with this contract
     * @return The array of content IDs
     */
    function getContentIds() external view returns (uint256[] memory) {
        return contentIds;
    }

    /**
     * @notice Transfer ownership of this contract
     * @dev Only callable by the owner or the contract itself (during factory setup)
     * @param newOwner The address of the new owner
     */
    function setOwner(address newOwner) external {
        if (msg.sender != address(this) && msg.sender != owner()) revert OnlySelfOrOwner();
        transferOwnership(newOwner);
    }

    /**
     * @notice Withdraw funds to the ChannelEscrow contract (for unclaimed channels)
     * @dev Only callable when the recipient is an escrow and the project has succeeded.
     *      Deposits the funds into the escrow keyed by channelId so the creator can
     *      claim them after verifying channel ownership.
     */
    function withdrawToEscrow() external {
        if (!recipientIsEscrow) revert RecipientNotEscrow();
        requireAssuranceContractHasSucceeded();
        uint256 value = address(this).balance;
        emit AssuranceContractWithdrawal(_recipient, value);
        IChannelEscrow(_recipient).deposit{value: value}(channelId);
    }
}
