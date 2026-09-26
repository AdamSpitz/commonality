//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IdentityHeldProceeds} from "../individual-projects/IdentityHeldProceeds.sol";

/**
 * @title ICreatorAssuranceContract
 * @notice Interface for querying content IDs associated with a creator assurance contract
 */
interface ICreatorAssuranceContract {
    function getContentIds() external view returns (uint256[] memory);
}

error OnlyOwnerOrSelf();
error OnlySelfOrOwner();
error ContentIdsAlreadySet();

/**
 * @title CreatorAssuranceContract
 * @notice Assurance contract for content creators, linking token sales to specific content items
 * @dev Successful proceeds stay in this contract until the channel's current payout
 *      address claims or refuses them. Channel id and beneficiary id are the same value.
 */
contract CreatorAssuranceDeployer {
    function deploy(
        address owner,
        address paymentToken,
        address erc1155Addr,
        string memory projectMetadataCid,
        bytes32 channelId,
        address registry,
        uint256 unclaimedWindow
    ) external returns (CreatorAssuranceContract) {
        return new CreatorAssuranceContract(
            owner,
            paymentToken,
            erc1155Addr,
            projectMetadataCid,
            channelId,
            registry,
            unclaimedWindow
        );
    }
}

contract CreatorAssuranceContract is IdentityHeldProceeds, ICreatorAssuranceContract {
    /// @notice The channel ID this contract is associated with
    bytes32 public channelId;
    /// @notice The content IDs funded by this contract
    uint256[] public contentIds;
    /// @notice Whether content IDs have been initialized (one-time set)
    bool public contentIdsInitialized;

    /**
     * @notice Emitted when the content IDs are set for this contract
     * @param contentIds The array of content IDs
     */
    event ContentIdsSet(uint256[] contentIds);

    /**
     * @notice Initializes the creator assurance contract
     * @param owner The owner who can manage the contract
     * @param projectMetadataCid The IPFS CID containing project metadata
     * @param _channelId The channel ID this contract is associated with
     * @param registry The beneficiary registry read at claim time
     * @param unclaimedWindow How long after success is noted before contributors can reclaim
     */
    constructor(
        address owner,
        address _paymentToken,
        address _erc1155Addr,
        string memory projectMetadataCid,
        bytes32 _channelId,
        address registry,
        uint256 unclaimedWindow
    ) IdentityHeldProceeds(owner, _paymentToken, _erc1155Addr, projectMetadataCid, registry, _channelId, unclaimedWindow) {
        channelId = _channelId;
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
}
