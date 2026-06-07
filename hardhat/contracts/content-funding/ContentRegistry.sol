//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

error ContentAlreadyRegistered(uint256 contentId, address existingContract);
error ContentNotRegistered(uint256 contentId);
error InvalidContentId();
error UnauthorizedContentRegistrar(address account);

/**
 * @title IContentRegistry
 * @notice Interface for the content registry
 */
interface IContentRegistry {
    function contentContract(uint256 contentId) external view returns (address);
    function registerContent(uint256 contentId, address assuranceContract, string calldata canonicalId) external;
    function releaseContent(uint256 contentId) external;
    function isRegistered(uint256 contentId) external view returns (bool);
}

/**
 * @title ContentRegistry
 * @notice Maps content IDs to their funding assurance contracts
 * @dev Content IDs are derived from keccak256 of canonical content identifiers
 *      (e.g. "channelCanonicalId/contentSuffix"). Each content ID can only be
 *      registered to one assurance contract at a time. Only the owner (typically
 *      the CreatorAssuranceContractFactory) can register or release content.
 */
contract ContentRegistry is IContentRegistry, Ownable {
    mapping(uint256 contentId => address assuranceContract) private _contentContracts;
    mapping(address account => bool) public isRegistrar;

    /**
     * @notice Emitted when a content item is registered to an assurance contract
     * @param contentId The content ID (keccak256 of canonical identifier)
     * @param assuranceContract The address of the assurance contract funding this content
     * @param canonicalId The human-readable canonical content identifier
     */
    event ContentItemRegistered(
        uint256 indexed contentId,
        address indexed assuranceContract,
        string canonicalId
    );

    /**
     * @notice Emitted when a content item is released (unregistered)
     * @param contentId The content ID that was released
     */
    event ContentItemReleased(uint256 indexed contentId);

    modifier onlyValidContentId(uint256 contentId) {
        if (contentId == 0) revert InvalidContentId();
        _;
    }

    modifier onlyRegistrarOrOwner() {
        if (msg.sender != owner() && !isRegistrar[msg.sender]) revert UnauthorizedContentRegistrar(msg.sender);
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Returns the assurance contract associated with a content ID
     * @param contentId The content ID to query
     * @return The address of the assurance contract (zero if not registered)
     */
    function contentContract(uint256 contentId) external view onlyValidContentId(contentId) returns (address) {
        return _contentContracts[contentId];
    }

    event ContentRegistrarSet(address indexed registrar, bool allowed);

    function setRegistrar(address registrar, bool allowed) external onlyOwner {
        isRegistrar[registrar] = allowed;
        emit ContentRegistrarSet(registrar, allowed);
    }

    /**
     * @notice Register a content item to an assurance contract
     * @dev Only callable by the owner or an authorized registrar. Reverts if the content ID is already registered.
     * @param contentId The content ID to register
     * @param assuranceContract The address of the assurance contract
     * @param canonicalId The human-readable canonical content identifier
     */
    function registerContent(
        uint256 contentId,
        address assuranceContract,
        string calldata canonicalId
    ) external onlyRegistrarOrOwner onlyValidContentId(contentId) {
        if (_contentContracts[contentId] != address(0)) {
            revert ContentAlreadyRegistered(contentId, _contentContracts[contentId]);
        }
        _contentContracts[contentId] = assuranceContract;
        emit ContentItemRegistered(contentId, assuranceContract, canonicalId);
    }

    /**
     * @notice Release a content item (unregister it from its assurance contract)
     * @dev Only callable by the owner. Reverts if the content ID is not registered.
     * @param contentId The content ID to release
     */
    function releaseContent(uint256 contentId) external onlyOwner onlyValidContentId(contentId) {
        if (_contentContracts[contentId] == address(0)) {
            revert ContentNotRegistered(contentId);
        }
        delete _contentContracts[contentId];
        emit ContentItemReleased(contentId);
    }

    /**
     * @notice Check if a content ID is currently registered
     * @param contentId The content ID to check
     * @return True if the content ID is registered to an assurance contract
     */
    function isRegistered(uint256 contentId) external view onlyValidContentId(contentId) returns (bool) {
        return _contentContracts[contentId] != address(0);
    }
}
