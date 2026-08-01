// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @dev Benchmark-only variant of PublishedData that also emits the content bytes in the event
 *      body. This was the production shape until the pointer-only change; it is kept solely so
 *      the gas comparison in scripts/benchmark-published-data-gas.js can still be reproduced.
 *      Do not deploy: emitting the content is exactly what the production contract stopped doing,
 *      because it put user content into every indexer that follows the logs.
 */
contract PublishedDataEventContent {
    error EmptyContent();

    mapping(address => mapping(bytes32 => bool)) private publications;

    event DataPublished(address indexed publisher, bytes32 indexed dataId, bytes content);

    function publishData(bytes calldata content) external returns (bytes32 dataId) {
        if (content.length == 0) revert EmptyContent();

        dataId = sha256(content);
        publications[msg.sender][dataId] = true;

        emit DataPublished(msg.sender, dataId, content);
    }

    function isPublished(address publisher, bytes32 dataId) external view returns (bool) {
        return publications[publisher][dataId];
    }
}
