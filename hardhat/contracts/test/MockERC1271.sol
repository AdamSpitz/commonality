//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

contract MockERC1271 {
    bytes4 internal constant MAGIC = 0x1626ba7e;
    bool public accept = true;
    address public callback;
    bytes public callbackData;

    function setAccept(bool next) external {
        accept = next;
    }

    function setCallback(address target, bytes calldata data) external {
        callback = target;
        callbackData = data;
    }

    function isValidSignature(bytes32, bytes calldata) external view returns (bytes4) {
        if (callback != address(0)) {
            (bool ignored, ) = callback.staticcall(callbackData);
            ignored;
        }
        return accept ? MAGIC : bytes4(0);
    }
}
