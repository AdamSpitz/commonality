//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IChannelVerifier} from "./ChannelRegistry.sol";

error InvalidTrustedVerifierAddress();

/// @title ChannelVerifier
/// @notice Verifies channel-claim proofs signed by a trusted off-chain verifier (the Platform API Service).
///
/// The Platform API Service signs `keccak256(abi.encodePacked(channelId, claimant, nonce, deadline))`
/// using EIP-191 personal sign. This contract recovers the signer from the signature and checks it
/// matches the trusted verifier address.
contract ChannelVerifier is IChannelVerifier, Ownable {
    address public trustedVerifier;

    event TrustedVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

    constructor(address _trustedVerifier) Ownable(msg.sender) {
        if (_trustedVerifier == address(0)) revert InvalidTrustedVerifierAddress();
        trustedVerifier = _trustedVerifier;
    }

    function setTrustedVerifier(address _trustedVerifier) external onlyOwner {
        if (_trustedVerifier == address(0)) revert InvalidTrustedVerifierAddress();
        address oldVerifier = trustedVerifier;
        trustedVerifier = _trustedVerifier;
        emit TrustedVerifierUpdated(oldVerifier, _trustedVerifier);
    }

    function verifyClaimProof(
        bytes32 channelId,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes calldata verifierSignature
    ) external view returns (bool) {
        bytes32 digest = keccak256(abi.encodePacked(channelId, claimant, nonce, deadline));
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(digest);
        address recovered = ECDSA.recover(ethSignedHash, verifierSignature);
        return recovered == trustedVerifier;
    }
}
