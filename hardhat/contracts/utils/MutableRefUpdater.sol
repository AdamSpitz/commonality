//SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract MutableRefUpdater {
    mapping(address => mapping(string => string)) public refsByNameByOwner;

    event RefUpdated(
        address indexed owner,
        string name,
        string currentRefValue
    );

    function updateRef(string calldata name, string calldata refValue) external {
        refsByNameByOwner[msg.sender][name] = refValue;
        emit RefUpdated(msg.sender, name, refValue);
    }

    function getRef(address owner, string calldata name) external view returns (string memory) {
        string memory result = refsByNameByOwner[owner][name];
        return result;
    }
}
