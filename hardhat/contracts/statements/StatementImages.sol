// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @title StatementImages
 * @notice Signer-chosen pictures for a statement, plus replaceable mosaic-safety yeses.
 * @dev Adoption is not a belief and does not count. Mosaic-safety is not alignment:
 *      the subject is the pair (statementId, imageId), positive-only, revocable by
 *      the same attester. Silence or a withdrawn yes is not a published negative.
 */
contract StatementImages {
    error InvalidStatementId();
    error InvalidImageId();
    error InvalidPromptHash();

    event ImageAdopted(
        address indexed signer,
        bytes32 indexed statementId,
        bytes32 indexed imageId
    );

    event ImageAdoptionRevoked(
        address indexed signer,
        bytes32 indexed statementId,
        bytes32 indexed imageId
    );

    event MosaicSafetyAttested(
        address indexed attester,
        bytes32 indexed statementId,
        bytes32 indexed imageId,
        bytes32 promptHash,
        bytes32 modelId
    );

    event MosaicSafetyRevoked(
        address indexed attester,
        bytes32 indexed statementId,
        bytes32 indexed imageId
    );

    // signer => statementId => imageId => currently adopted
    mapping(address => mapping(bytes32 => mapping(bytes32 => bool))) public adoptions;

    // attester => statementId => imageId => current yes
    mapping(address => mapping(bytes32 => mapping(bytes32 => bool))) public mosaicSafety;

    mapping(address => mapping(bytes32 => mapping(bytes32 => bytes32))) public mosaicPromptHash;
    mapping(address => mapping(bytes32 => mapping(bytes32 => bytes32))) public mosaicModelId;

    function adoptImage(bytes32 statementId, bytes32 imageId) external {
        if (statementId == bytes32(0)) revert InvalidStatementId();
        if (imageId == bytes32(0)) revert InvalidImageId();

        adoptions[msg.sender][statementId][imageId] = true;
        emit ImageAdopted(msg.sender, statementId, imageId);
    }

    function revokeImageAdoption(bytes32 statementId, bytes32 imageId) external {
        if (statementId == bytes32(0)) revert InvalidStatementId();
        if (imageId == bytes32(0)) revert InvalidImageId();

        adoptions[msg.sender][statementId][imageId] = false;
        emit ImageAdoptionRevoked(msg.sender, statementId, imageId);
    }

    /**
     * @notice Record a current yes that this image is safe to show beside this statement.
     * @dev promptHash must be non-zero so the judgment is reproducible. modelId may be zero
     *      only if the attester has nothing to name; apps still record whatever is passed.
     */
    function attestMosaicSafety(
        bytes32 statementId,
        bytes32 imageId,
        bytes32 promptHash,
        bytes32 modelId
    ) external {
        if (statementId == bytes32(0)) revert InvalidStatementId();
        if (imageId == bytes32(0)) revert InvalidImageId();
        if (promptHash == bytes32(0)) revert InvalidPromptHash();

        mosaicSafety[msg.sender][statementId][imageId] = true;
        mosaicPromptHash[msg.sender][statementId][imageId] = promptHash;
        mosaicModelId[msg.sender][statementId][imageId] = modelId;

        emit MosaicSafetyAttested(msg.sender, statementId, imageId, promptHash, modelId);
    }

    function revokeMosaicSafety(bytes32 statementId, bytes32 imageId) external {
        if (statementId == bytes32(0)) revert InvalidStatementId();
        if (imageId == bytes32(0)) revert InvalidImageId();

        mosaicSafety[msg.sender][statementId][imageId] = false;
        emit MosaicSafetyRevoked(msg.sender, statementId, imageId);
    }
}
