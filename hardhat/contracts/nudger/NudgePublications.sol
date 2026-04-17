// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

error InvalidBatchCid();

/**
 * @title NudgePublications
 * @notice Allows nudgers to publish batches of nudges via IPFS CIDs.
 *         Each nudger calls publishNudgeBatch with a CID pointing to a JSON document
 *         containing nudges and any per-nudge revocations of previous batches.
 *         The event log is the complete canonical state — no on-chain storage needed.
 */
contract NudgePublications {
    /**
     * @notice Emitted when a nudger publishes a new batch
     * @param nudger The address of the nudger publishing the batch
     * @param batchCid The IPFS CID of the NudgeBatch JSON document
     */
    event NudgesPublished(
        address indexed nudger,
        bytes32 indexed batchCid
    );

    /**
     * @notice Publish a batch of nudges by recording an IPFS CID onchain
     * @param batchCid IPFS CID of the NudgeBatch JSON document
     */
    function publishNudgeBatch(bytes32 batchCid) external {
        if (batchCid == bytes32(0)) revert InvalidBatchCid();
        emit NudgesPublished(msg.sender, batchCid);
    }
}
