//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

error TokenNotAllowed(address token);
error InvalidTokenAddress();

/// @notice Owner-managed allowlist of settlement tokens. One shared source for factories and the UI.
contract PaymentTokenRegistry is Ownable2Step {
    mapping(address token => bool allowed) public isAllowed;
    mapping(address token => bool listed) private _listed;
    address[] private _tokens;

    event TokenAllowed(address indexed token);
    event TokenDisallowed(address indexed token);

    constructor(address owner) Ownable(owner) {}

    function allow(address token) external onlyOwner {
        if (token == address(0)) revert InvalidTokenAddress();
        if (isAllowed[token]) return;
        isAllowed[token] = true;
        if (!_listed[token]) {
            _listed[token] = true;
            _tokens.push(token);
        }
        emit TokenAllowed(token);
    }

    function disallow(address token) external onlyOwner {
        if (!isAllowed[token]) return;
        isAllowed[token] = false;
        emit TokenDisallowed(token);
    }

    function requireAllowed(address token) external view {
        if (!isAllowed[token]) revert TokenNotAllowed(token);
    }

    function tokenCount() external view returns (uint256) {
        return _tokens.length;
    }

    /// @notice Every token ever allowed, including ones later disallowed. Check `isAllowed`.
    function tokenAt(uint256 index) external view returns (address) {
        return _tokens[index];
    }
}
