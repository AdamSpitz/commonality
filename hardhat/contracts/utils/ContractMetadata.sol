//SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title ContractMetadata
 * @notice Simple contract for storing and updating contract metadata
 * @dev Provides an event for tracking metadata updates
 */
contract ContractMetadata {
    /**
     * @notice Emitted when contract metadata is updated
     * @param metadata The new metadata string (typically an IPFS CID)
     */
    event ContractMetadataUpdated(string metadata);
}
