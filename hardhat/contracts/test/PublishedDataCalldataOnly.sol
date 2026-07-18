// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @dev Benchmark-only variant of PublishedData that records the same publication bit
 *      but does not emit content bytes. Do not deploy in production.
 */
contract PublishedDataCalldataOnly {
    error EmptyContent();

    mapping(address => mapping(bytes32 => bool)) private publications;

    event DataPublished(address indexed publisher, bytes32 indexed dataId);

    function publishData(bytes calldata content) external returns (bytes32 dataId) {
        if (content.length == 0) revert EmptyContent();

        dataId = sha256(content);
        publications[msg.sender][dataId] = true;

        emit DataPublished(msg.sender, dataId);
    }

    function isPublished(address publisher, bytes32 dataId) external view returns (bool) {
        return publications[publisher][dataId];
    }
}
