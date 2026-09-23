//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Guardable} from "../utils/Guardable.sol";

error BeneficiaryAlreadyClaimed(bytes32 beneficiaryId);
error InvalidClaimant();
error InvalidNonce();
error ProofExpired();
error InvalidVerifierSignature();
error InvalidProofHash();
error InvalidVerifierAddress();
error NoVerifierConfigured();
error VerifierAlreadyRevoked();
error InvalidBeneficiaryIdentity();

/**
 * @title IBeneficiaryVerifier
 * @notice Checks a signed proof that `claimant` controls `beneficiaryId`.
 */
interface IBeneficiaryVerifier {
    function verifyClaimProof(
        bytes32 beneficiaryId,
        bytes32 namespaceHash,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes32 proofHash,
        bytes calldata verifierSignature
    ) external view returns (bool);
}

/**
 * @title IBeneficiaryIdentity
 * @notice Read the address that proved control of a beneficiary id.
 * @dev This is not a payout address. Funding copies it once into the registry.
 */
interface IBeneficiaryIdentity {
    function ownerOf(bytes32 beneficiaryId) external view returns (address);
    function namespaceHashOf(bytes32 beneficiaryId) external view returns (bytes32);
    function isClaimed(bytes32 beneficiaryId) external view returns (bool);
    function verifyBeneficiary(
        bytes32 beneficiaryId,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes32 proofHash,
        bytes calldata verifierSignature
    ) external;
    function verifyNamespacedBeneficiary(
        string calldata namespace,
        string calldata canonicalIdentifier,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes32 proofHash,
        bytes calldata verifierSignature
    ) external;
}

/**
 * @title BeneficiaryIdentity
 * @notice Records who proved control of a namespaced public identity.
 * @dev `beneficiaryId` is keccak256 of `namespace:canonicalIdentifier`. A social
 *      claim uses namespace hash zero. DNS and other namespaces store their hash
 *      so the funding registry can apply that namespace's waiting period later.
 *      A claim does not bind a payout address, rotate one, or move funds.
 */
contract BeneficiaryIdentity is IBeneficiaryIdentity, Guardable {
    mapping(bytes32 beneficiaryId => address owner) private _owners;
    mapping(bytes32 beneficiaryId => bytes32 namespaceHash) private _namespaceHashes;
    mapping(bytes32 nonce => bool) private _usedNonces;

    /// @notice The verifier contract used to validate claim proofs (zero once revoked)
    address public verifier;

    event BeneficiaryClaimed(bytes32 indexed beneficiaryId, address indexed owner);

    event BeneficiaryProofAnchored(
        bytes32 indexed beneficiaryId,
        address indexed owner,
        bytes32 indexed proofHash
    );

    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event VerifierRevoked(address indexed revokedVerifier, address indexed revokedBy);

    constructor(address _verifier) Ownable(msg.sender) {
        if (_verifier == address(0)) revert InvalidVerifierAddress();
        verifier = _verifier;
    }

    function ownerOf(bytes32 beneficiaryId) external view returns (address) {
        return _owners[beneficiaryId];
    }

    function namespaceHashOf(bytes32 beneficiaryId) external view returns (bytes32) {
        return _namespaceHashes[beneficiaryId];
    }

    function isClaimed(bytes32 beneficiaryId) external view returns (bool) {
        return _owners[beneficiaryId] != address(0);
    }

    function setVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert InvalidVerifierAddress();
        address oldVerifier = verifier;
        verifier = _verifier;
        emit VerifierUpdated(oldVerifier, _verifier);
    }

    function revokeVerifier() external onlyOwnerOrGuardian {
        address oldVerifier = verifier;
        if (oldVerifier == address(0)) revert VerifierAlreadyRevoked();
        verifier = address(0);
        emit VerifierRevoked(oldVerifier, _msgSender());
    }

    /// @notice Claim a beneficiary whose proof was signed with namespace hash zero.
    function verifyBeneficiary(
        bytes32 beneficiaryId,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes32 proofHash,
        bytes calldata verifierSignature
    ) external {
        _claim(beneficiaryId, bytes32(0), claimant, nonce, deadline, proofHash, verifierSignature);
    }

    /// @notice Claim `keccak256(namespace + ":" + canonicalIdentifier)`.
    function verifyNamespacedBeneficiary(
        string calldata namespace,
        string calldata canonicalIdentifier,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes32 proofHash,
        bytes calldata verifierSignature
    ) external {
        if (bytes(namespace).length == 0 || bytes(canonicalIdentifier).length == 0) {
            revert InvalidBeneficiaryIdentity();
        }
        bytes32 beneficiaryId = keccak256(bytes(string.concat(namespace, ":", canonicalIdentifier)));
        _claim(
            beneficiaryId,
            keccak256(bytes(namespace)),
            claimant,
            nonce,
            deadline,
            proofHash,
            verifierSignature
        );
    }

    function _claim(
        bytes32 beneficiaryId,
        bytes32 namespaceHash,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes32 proofHash,
        bytes calldata verifierSignature
    ) private {
        if (_owners[beneficiaryId] != address(0)) revert BeneficiaryAlreadyClaimed(beneficiaryId);
        if (claimant == address(0)) revert InvalidClaimant();
        if (_usedNonces[nonce]) revert InvalidNonce();
        if (block.timestamp > deadline) revert ProofExpired();
        if (proofHash == bytes32(0)) revert InvalidProofHash();
        if (verifier == address(0)) revert NoVerifierConfigured();

        bool validProof = IBeneficiaryVerifier(verifier).verifyClaimProof(
            beneficiaryId,
            namespaceHash,
            claimant,
            nonce,
            deadline,
            proofHash,
            verifierSignature
        );
        if (!validProof) revert InvalidVerifierSignature();

        _usedNonces[nonce] = true;
        _owners[beneficiaryId] = claimant;
        _namespaceHashes[beneficiaryId] = namespaceHash;

        emit BeneficiaryClaimed(beneficiaryId, claimant);
        emit BeneficiaryProofAnchored(beneficiaryId, claimant, proofHash);
    }
}
