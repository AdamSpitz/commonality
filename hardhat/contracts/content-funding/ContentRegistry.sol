//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAssuranceCondition} from "../individual-projects/IAssuranceCondition.sol";

error ContentAlreadyRegistered(uint256 contentId, address existingContract);
error ContentNotRegistered(uint256 contentId);
error InvalidContentId();
error InvalidWorkId();
error EmptyWorkBatch();
error DuplicateWorkId(uint256 contentId);
error StaleWorkRelease(uint256 contentId, address currentProject);
error WorkNotFailed(uint256 contentId);
error WorkPermanentlyFunded(uint256 contentId, address project);
error InvalidWorkRegistration();
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
    function registerWorks(string[] calldata workIds, address project, address condition, address creator) external;
    function releaseWorks(string[] calldata workIds, address project) external;
    function registerBeneficiaryWorks(
        string[] calldata workIds, address project, address condition, address creator, bytes32 beneficiaryId
    ) external;
    function releaseBeneficiaryWorks(string[] calldata workIds, address project, bytes32 beneficiaryId) external;
    function projectFor(bytes32 workIdHash) external view returns (address);
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
    /// @dev Condition used to distinguish an active reservation from permanent funding success.
    ///      Empty for registrations that only use registerContent (materialized content).
    mapping(uint256 contentId => address condition) private _conditions;
    mapping(address account => bool) public isRegistrar;

    uint256 public constant MAX_WORK_ID_BYTES = 512;

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

    /// @notice A work item was reserved by a funding request. `creator` is the account
    ///         the factory authenticated, not a claim that the account is a unique human.
    event WorkItemRegistered(
        bytes32 indexed workIdHash,
        address indexed project,
        address indexed creator,
        string workId,
        bytes32 beneficiaryId
    );

    /// @notice A failed request released its reservation. The event remains the history.
    event WorkItemReleased(bytes32 indexed workIdHash, address indexed project);

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
        _occupy(contentId, assuranceContract, address(0), canonicalId, msg.sender, bytes32(0));
    }

    /**
     * @notice Reserve every work id in the batch for one project, or revert the whole batch.
     * @dev The caller must be a factory that already authenticated `creator`. Metadata does
     *      not grant this permission. Success of `condition` blocks reuse with no extra
     *      finalization transaction. IDs are compared as exact UTF-8 bytes.
     */
    function registerWorks(
        string[] calldata workIds,
        address project,
        address condition,
        address creator
    ) external onlyRegistrarOrOwner {
        _registerWorks(workIds, project, condition, creator, bytes32(0));
    }

    /// @notice Reserve ordinary work for a beneficiary, independently of the initiator.
    /// @dev Zero scope is reserved for canonical content IDs.
    function registerBeneficiaryWorks(
        string[] calldata workIds,
        address project,
        address condition,
        address creator,
        bytes32 beneficiaryId
    ) external onlyRegistrarOrOwner {
        if (beneficiaryId == bytes32(0)) revert InvalidWorkRegistration();
        _registerWorks(workIds, project, condition, creator, beneficiaryId);
    }

    function _registerWorks(
        string[] calldata workIds,
        address project,
        address condition,
        address creator,
        bytes32 beneficiaryId
    ) private {
        if (workIds.length == 0) revert EmptyWorkBatch();
        if (project == address(0) || condition == address(0) || creator == address(0)) {
            revert InvalidWorkRegistration();
        }
        uint256[] memory hashes = new uint256[](workIds.length);
        for (uint256 i = 0; i < workIds.length; i++) {
            hashes[i] = _hashWorkId(workIds[i], beneficiaryId);
            for (uint256 j = 0; j < i; j++) {
                if (hashes[j] == hashes[i]) revert DuplicateWorkId(hashes[i]);
            }
        }
        for (uint256 i = 0; i < workIds.length; i++) {
            _occupy(hashes[i], project, condition, workIds[i], creator, beneficiaryId);
        }
    }

    /**
     * @notice Release reservations after the stored condition has failed.
     * @dev A release for a project that no longer holds the reservation does not
     *      clear a newer request. A succeeded condition cannot be released.
     */
    function releaseWorks(string[] calldata workIds, address project) external onlyRegistrarOrOwner {
        _releaseWorks(workIds, project, bytes32(0));
    }

    function releaseBeneficiaryWorks(
        string[] calldata workIds, address project, bytes32 beneficiaryId
    ) external onlyRegistrarOrOwner {
        if (beneficiaryId == bytes32(0)) revert InvalidWorkRegistration();
        _releaseWorks(workIds, project, beneficiaryId);
    }

    function _releaseWorks(string[] calldata workIds, address project, bytes32 beneficiaryId) private {
        if (project == address(0)) revert InvalidWorkRegistration();
        for (uint256 i = 0; i < workIds.length; i++) {
            uint256 contentId = _hashWorkId(workIds[i], beneficiaryId);
            address current = _contentContracts[contentId];
            if (current != project) revert StaleWorkRelease(contentId, current);
            _releaseIfFailed(contentId);
        }
    }

    /// @notice Project that currently holds this work hash, or zero when it is free.
    function projectFor(bytes32 workIdHash) external view returns (address) {
        return _contentContracts[uint256(workIdHash)];
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
        _releaseIfFailed(contentId);
    }

    function _hashWorkId(string calldata workId, bytes32 beneficiaryId) private pure returns (uint256 contentId) {
        bytes memory raw = bytes(workId);
        if (raw.length == 0 || raw.length > MAX_WORK_ID_BYTES) revert InvalidWorkId();
        contentId = uint256(keccak256(raw));
        if (beneficiaryId != bytes32(0)) contentId = uint256(keccak256(abi.encode(beneficiaryId, bytes32(contentId))));
        if (contentId == 0) revert InvalidContentId();
    }

    function _occupy(
        uint256 contentId,
        address project,
        address condition,
        string memory workId,
        address creator,
        bytes32 beneficiaryId
    ) private {
        address existing = _contentContracts[contentId];
        if (existing != address(0)) {
            if (_succeeded(contentId)) revert WorkPermanentlyFunded(contentId, existing);
            revert ContentAlreadyRegistered(contentId, existing);
        }
        _contentContracts[contentId] = project;
        if (condition != address(0)) _conditions[contentId] = condition;
        emit ContentItemRegistered(contentId, project, workId);
        emit WorkItemRegistered(bytes32(contentId), project, creator, workId, beneficiaryId);
    }

    function _releaseIfFailed(uint256 contentId) private {
        if (_succeeded(contentId)) {
            revert WorkPermanentlyFunded(contentId, _contentContracts[contentId]);
        }
        address condition = _conditions[contentId];
        if (condition != address(0) && !IAssuranceCondition(condition).hasFailed()) {
            revert WorkNotFailed(contentId);
        }
        address project = _contentContracts[contentId];
        delete _contentContracts[contentId];
        delete _conditions[contentId];
        emit ContentItemReleased(contentId);
        emit WorkItemReleased(bytes32(contentId), project);
    }

    /// @dev Live condition check. Success blocks a new reservation even when nobody
    ///      has sent a separate bookkeeping transaction.
    function _succeeded(uint256 contentId) private view returns (bool) {
        address condition = _conditions[contentId];
        if (condition == address(0)) return false;
        return IAssuranceCondition(condition).hasSucceeded();
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
