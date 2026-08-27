//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IChannelVerifier} from "../content-funding/ChannelRegistry.sol";

/**
 * @title MockChannelVerifier
 * @notice Test-only mock channel verifier that returns a configurable result
 */
contract MockChannelVerifier is IChannelVerifier {
    bool private _isValid;

    /**
     * @notice Set whether verifyClaimProof should return true or false
     * @param valid The value to return from verifyClaimProof
     */
    function setValid(bool valid) external {
        _isValid = valid;
    }

    /// @inheritdoc IChannelVerifier
    function verifyClaimProof(
        bytes32,
        address,
        bytes32,
        uint256,
        bytes32,
        bytes calldata
    ) external view override returns (bool) {
        return _isValid;
    }
}
