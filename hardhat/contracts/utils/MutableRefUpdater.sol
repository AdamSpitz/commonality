//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @title MutableRefUpdater
 * @notice General-purpose contract for tracking mutable named references per user
 * @dev Stores and emits events for "user U updated ref named N to value V".
 *      Useful for storing pointers (e.g. IPFS CIDs) that may change over time.
 */
contract MutableRefUpdater {
    mapping(address => mapping(string => string)) public refsByNameByOwner;

    /**
     * @notice Emitted when an owner updates a named reference
     * @param owner The address that updated the reference
     * @param name The name of the reference
     * @param currentRefValue The new value of the reference
     */
    event RefUpdated(
        address indexed owner,
        string name,
        string currentRefValue
    );

    /**
     * @notice Update a named reference to a new value
     * @param name The name of the reference to update
     * @param refValue The new value for the reference
     */
    function updateRef(string calldata name, string calldata refValue) external {
        refsByNameByOwner[msg.sender][name] = refValue;
        emit RefUpdated(msg.sender, name, refValue);
    }

    /**
     * @notice Get the current value of a named reference for a specific owner
     * @param owner The address of the reference owner
     * @param name The name of the reference
     * @return The current value of the reference
     */
    function getRef(address owner, string calldata name) external view returns (string memory) {
        string memory result = refsByNameByOwner[owner][name];
        return result;
    }
}
