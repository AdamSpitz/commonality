// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @title PublishedData
 * @notice Records user-attributed publication and retraction facts for content-addressed data.
 * @dev Content bytes are not stored. They are carried in calldata and emitted for indexers;
 *      only the publication/retraction bits keyed by (publisher, dataId) live in storage.
 *      dataId is sha2-256(content), matching the fixed-hash CID format chosen for the first
 *      PublishedData implementation.
 */
contract PublishedData {
    error EmptyContent();

    mapping(address => mapping(bytes32 => bool)) private publications;
    mapping(address => mapping(bytes32 => bool)) private retractions;

    event DataPublished(address indexed publisher, bytes32 indexed dataId, bytes content);
    event DataRetracted(address indexed publisher, bytes32 indexed dataId);

    /**
     * @notice Publish content under msg.sender's address.
     * @param content The raw content bytes. The contract derives dataId = sha256(content).
     * @return dataId The sha2-256 digest of content.
     */
    function publishData(bytes calldata content) external returns (bytes32 dataId) {
        if (content.length == 0) revert EmptyContent();

        dataId = sha256(content);
        publications[msg.sender][dataId] = true;

        emit DataPublished(msg.sender, dataId, content);
    }

    /**
     * @notice Record msg.sender's retraction attestation for a dataId.
     * @dev Any address may retract any dataId; display layers decide which retractors to honor.
     */
    function retractData(bytes32 dataId) external {
        retractions[msg.sender][dataId] = true;
        emit DataRetracted(msg.sender, dataId);
    }

    function isPublished(address publisher, bytes32 dataId) external view returns (bool) {
        return publications[publisher][dataId];
    }

    function isRetracted(address publisher, bytes32 dataId) external view returns (bool) {
        return retractions[publisher][dataId];
    }
}
