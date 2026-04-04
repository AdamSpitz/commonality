//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

interface IChannelVerifier {
    function verifyClaimProof(
        bytes32 channelId,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes calldata verifierSignature
    ) external view returns (bool);
}

contract MockChannelVerifier is IChannelVerifier {
    bool private _isValid;

    function setValid(bool valid) external {
        _isValid = valid;
    }

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
