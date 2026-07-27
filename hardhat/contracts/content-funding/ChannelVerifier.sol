//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {IChannelVerifier} from "./ChannelRegistry.sol";
import {Guardable} from "../utils/Guardable.sol";

error InvalidTrustedVerifierAddress();
error TrustedVerifierAlreadyRevoked();

/**
 * @title ChannelVerifier
 * @notice Verifies channel-claim proofs signed by a trusted off-chain verifier (the Platform API Service)
 * @dev Uses EIP-712 typed-data signatures. The trusted off-chain signer signs:
 *
 *        ChannelClaim(bytes32 channelId,address claimant,bytes32 nonce,uint256 deadline,bytes32 proofHash)
 *
 *      with the EIP-712 domain ("ChannelVerifier", "1", chainId, address(this)). The
 *      domain binds signatures to this specific deployment on this specific chain,
 *      preventing cross-chain or cross-deployment replay even if the same trusted
 *      signer key is reused.
 */
contract ChannelVerifier is IChannelVerifier, Guardable, EIP712 {
    bytes32 public constant CHANNEL_CLAIM_TYPEHASH =
        keccak256("ChannelClaim(bytes32 channelId,address claimant,bytes32 nonce,uint256 deadline,bytes32 proofHash)");

    /// @notice The address of the trusted off-chain verifier (zero once revoked)
    address public trustedVerifier;

    /**
     * @notice Emitted when the trusted verifier address is updated
     * @param oldVerifier The previous trusted verifier address
     * @param newVerifier The new trusted verifier address
     */
    event TrustedVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

    /**
     * @notice Emitted when the trusted verifier is revoked, halting all new claim verification
     * @param revokedVerifier The signer address that was trusted until now
     * @param revokedBy The owner or guardian that called the revocation
     */
    event TrustedVerifierRevoked(address indexed revokedVerifier, address indexed revokedBy);

    /**
     * @notice Initializes the verifier with a trusted verifier address
     * @param _trustedVerifier The address of the trusted off-chain verifier
     */
    constructor(address _trustedVerifier)
        Ownable(msg.sender)
        EIP712("ChannelVerifier", "1")
    {
        if (_trustedVerifier == address(0)) revert InvalidTrustedVerifierAddress();
        trustedVerifier = _trustedVerifier;
    }

    /**
     * @notice Update the trusted verifier address
     * @dev Only callable by the contract owner
     * @param _trustedVerifier The new trusted verifier address
     */
    function setTrustedVerifier(address _trustedVerifier) external onlyOwner {
        if (_trustedVerifier == address(0)) revert InvalidTrustedVerifierAddress();
        address oldVerifier = trustedVerifier;
        trustedVerifier = _trustedVerifier;
        emit TrustedVerifierUpdated(oldVerifier, _trustedVerifier);
    }

    /**
     * @notice Immediately stop trusting the current verifier signer
     * @dev Callable by the owner *or* the guardian, so it does not have to wait on the
     *      timelock that gates `setTrustedVerifier` — this is the emergency response to a
     *      leaked signer key. It only reduces power: `verifyClaimProof` returns false for
     *      everyone until the owner installs a replacement, and no already-verified channel
     *      is affected (the registry reads this contract only when verifying a new claim).
     */
    function revokeTrustedVerifier() external onlyOwnerOrGuardian {
        address oldVerifier = trustedVerifier;
        if (oldVerifier == address(0)) revert TrustedVerifierAlreadyRevoked();
        trustedVerifier = address(0);
        emit TrustedVerifierRevoked(oldVerifier, _msgSender());
    }

    /**
     * @notice Verify a channel claim proof by recovering the signer from the signature
     * @param channelId The channel being claimed
     * @param claimant The address claiming ownership
     * @param nonce A unique nonce to prevent replay attacks
     * @param deadline The unix timestamp after which the proof expires
     * @param proofHash Hash of the durable public proof reference checked off-chain
     * @param verifierSignature The EIP-191 signature from the trusted verifier
     * @return True if the signature was produced by the trusted verifier
     */
    function verifyClaimProof(
        bytes32 channelId,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes32 proofHash,
        bytes calldata verifierSignature
    ) external view returns (bool) {
        // Fail closed while revoked: never let a recovered zero address match a zero
        // trustedVerifier.
        if (trustedVerifier == address(0)) return false;

        bytes32 structHash = keccak256(
            abi.encode(CHANNEL_CLAIM_TYPEHASH, channelId, claimant, nonce, deadline, proofHash)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, verifierSignature);
        return recovered == trustedVerifier;
    }
}
