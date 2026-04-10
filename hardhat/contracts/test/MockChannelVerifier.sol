//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @title IChannelVerifier
 * @notice Interface for verifying channel claim proofs
 */
interface IChannelVerifier {
    function verifyClaimProof(
        bytes32 channelId,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes calldata verifierSignature
    ) external view returns (bool);
}

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
        bytes calldata
    ) external view override returns (bool) {
        return _isValid;
    }
}
