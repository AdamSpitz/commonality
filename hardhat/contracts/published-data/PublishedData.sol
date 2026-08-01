// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @title PublishedData
 * @notice Records user-attributed publication and retraction facts for content-addressed data.
 * @dev Content bytes are neither stored nor emitted. They are carried in calldata only, and are
 *      recovered from transaction history by readers; storage and logs hold nothing but the
 *      publication/retraction bits keyed by (publisher, dataId).
 *
 *      This is deliberate: an indexer following these logs learns that a publication happened and
 *      what its content hash is, but never sees the content itself. See
 *      specs/tech/subsystems/published-data/README.md for why that posture matters.
 *
 *      dataId is sha2-256(content), matching the fixed-hash CID format chosen for the first
 *      PublishedData implementation. Because the identifier *is* the content hash, any reader can
 *      verify recovered bytes against the log without trusting whoever supplied them — which is
 *      what makes the content-retrieval mechanism swappable.
 */
contract PublishedData {
    error EmptyContent();

    mapping(address => mapping(bytes32 => bool)) private publications;
    mapping(address => mapping(bytes32 => bool)) private retractions;

    /// @dev Both parameters are indexed, so the log body is empty: there is no content to leak.
    event DataPublished(address indexed publisher, bytes32 indexed dataId);
    event DataRetracted(address indexed publisher, bytes32 indexed dataId);

    /**
     * @notice Publish content under msg.sender's address.
     * @dev The bytes are read from calldata to derive the digest and are then discarded. They
     *      remain recoverable from the transaction's input by anyone who wants them.
     * @param content The raw content bytes. The contract derives dataId = sha256(content).
     * @return dataId The sha2-256 digest of content.
     */
    function publishData(bytes calldata content) external returns (bytes32 dataId) {
        if (content.length == 0) revert EmptyContent();

        dataId = sha256(content);
        publications[msg.sender][dataId] = true;

        emit DataPublished(msg.sender, dataId);
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
