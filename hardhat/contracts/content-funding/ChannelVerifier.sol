//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {IChannelVerifier} from "./ChannelRegistry.sol";

error InvalidTrustedVerifierAddress();

/**
 * @title ChannelVerifier
 * @notice Verifies channel-claim proofs signed by a trusted off-chain verifier (the Platform API Service)
 * @dev Uses EIP-712 typed-data signatures. The trusted off-chain signer signs:
 *
 *        ChannelClaim(bytes32 channelId,address claimant,bytes32 nonce,uint256 deadline)
 *
 *      with the EIP-712 domain ("ChannelVerifier", "1", chainId, address(this)). The
 *      domain binds signatures to this specific deployment on this specific chain,
 *      preventing cross-chain or cross-deployment replay even if the same trusted
 *      signer key is reused.
 */
contract ChannelVerifier is IChannelVerifier, Ownable2Step, EIP712 {
    bytes32 public constant CHANNEL_CLAIM_TYPEHASH =
        keccak256("ChannelClaim(bytes32 channelId,address claimant,bytes32 nonce,uint256 deadline)");

    /// @notice The address of the trusted off-chain verifier
    address public trustedVerifier;

    /**
     * @notice Emitted when the trusted verifier address is updated
     * @param oldVerifier The previous trusted verifier address
     * @param newVerifier The new trusted verifier address
     */
    event TrustedVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

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
     * @notice Verify a channel claim proof by recovering the signer from the signature
     * @param channelId The channel being claimed
     * @param claimant The address claiming ownership
     * @param nonce A unique nonce to prevent replay attacks
     * @param deadline The unix timestamp after which the proof expires
     * @param verifierSignature The EIP-191 signature from the trusted verifier
     * @return True if the signature was produced by the trusted verifier
     */
    function verifyClaimProof(
        bytes32 channelId,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes calldata verifierSignature
    ) external view returns (bool) {
        bytes32 structHash = keccak256(
            abi.encode(CHANNEL_CLAIM_TYPEHASH, channelId, claimant, nonce, deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, verifierSignature);
        return recovered == trustedVerifier;
    }
}
