//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Guardable} from "../utils/Guardable.sol";

error BeneficiaryAlreadyVerified(bytes32 beneficiaryId);
error BeneficiaryNotVerified(bytes32 beneficiaryId);
error BeneficiaryAlreadyControlled(bytes32 beneficiaryId);
error InvalidClaimant();
error InvalidNewPayoutAddress();
error OnlyPayoutAddressCanTakeControl();
error OnlyPayoutAddressCanReleaseControl();
error BeneficiaryNotControlled(bytes32 beneficiaryId);
error OnlyPayoutAddressCanRotate();
error InvalidNonce();
error ProofExpired();
error InvalidVerifierSignature();
error InvalidProofHash();
error InvalidVerifierAddress();
error NoVerifierConfigured();
error VerifierAlreadyRevoked();
error InvalidBeneficiaryIdentity();
error ClaimWaitingPeriodNotElapsed(uint256 withdrawableAt);

/**
 * @title IBeneficiaryVerifier
 * @notice Interface for verifying beneficiary identity claim proofs
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
 * @title IBeneficiaryRegistry
 * @notice Interface for the shared beneficiary registry
 */
interface IBeneficiaryRegistry {
    function payoutAddress(bytes32 beneficiaryId) external view returns (address);
    function beneficiaryState(bytes32 beneficiaryId) external view returns (uint8);
    function verifier() external view returns (address);
    function verifyBeneficiary(
        bytes32 beneficiaryId,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes32 proofHash,
        bytes calldata verifierSignature
    ) external;
    function takeBeneficiaryControl(bytes32 beneficiaryId) external;
    function releaseBeneficiaryControl(bytes32 beneficiaryId) external;
    function rotatePayoutAddress(bytes32 beneficiaryId, address newPayoutAddress) external;
    function setVerifier(address verifier) external;
    function revokeVerifier() external;
    function isVerified(bytes32 beneficiaryId) external view returns (bool);
    function isBeneficiaryControlled(bytes32 beneficiaryId) external view returns (bool);
    function controlTakenAt(bytes32 beneficiaryId) external view returns (uint256);
    function claimWithdrawableAt(bytes32 beneficiaryId) external view returns (uint256);
}

/**
 * @title BeneficiaryRegistry
 * @notice Tracks beneficiary payout and verification state for shared funding flows
 * @dev Identities progress through Unclaimed -> Verified -> BeneficiaryControlled.
 *      Verification requires a signed proof from an off-chain verifier (the Platform API Service).
 *      Content-only veto and occupancy live on the content factory, not here.
 */
contract BeneficiaryRegistry is IBeneficiaryRegistry, Guardable {

    /**
     * @notice Beneficiary lifecycle states
     * @dev Unclaimed: no owner verified yet
     *      Verified: owner proven via off-chain signature, third parties can still create projects
     *      BeneficiaryControlled: only the payout wallet may create new projects about this identity.
     *      Control is reversible: the current payout wallet may return to Verified.
     */
    enum BeneficiaryState {
        Unclaimed,
        Verified,
        BeneficiaryControlled
    }

    mapping(bytes32 beneficiaryId => address payout) private _payoutAddresses;
    mapping(bytes32 beneficiaryId => BeneficiaryState) private _beneficiaryStates;
    mapping(bytes32 nonce => bool) private _usedNonces;
    mapping(bytes32 namespaceHash => uint256 period) public namespaceClaimWaitingPeriod;
    mapping(bytes32 beneficiaryId => uint256 timestamp) private _verifiedAt;
    mapping(bytes32 beneficiaryId => uint256 period) private _appliedClaimWaitingPeriod;

    /// @notice The verifier contract used to validate channel claim proofs (zero once revoked)
    address public verifier;

    mapping(bytes32 beneficiaryId => uint256 timestamp) private _controlTakenAt;

    /**
     * @notice Emitted when a beneficiary's payout address is verified
     * @param beneficiaryId The verified beneficiary
     * @param payoutAddress The address bound to receive beneficiary funds
     */
    event BeneficiaryVerified(bytes32 indexed beneficiaryId, address indexed payoutAddress);

    /**
     * @notice Emitted with the hash of the public proof artifact used for beneficiary verification.
     * @dev The hash should be over the durable public proof reference (for example a tweet URL
     *      or Substack post URL), so anyone can independently re-check verifier honesty.
     */
    event BeneficiaryProofAnchored(
        bytes32 indexed beneficiaryId,
        address indexed payoutAddress,
        bytes32 indexed proofHash
    );

    /**
     * @notice Emitted when a verified payout address takes identity control
     * @param beneficiaryId The identity
     * @param owner The payout address that took control
     */
    event BeneficiaryControlTaken(bytes32 indexed beneficiaryId, address indexed owner);

    /**
     * @notice Emitted when the payout wallet reopens third-party project creation
     * @param beneficiaryId The identity
     * @param owner The payout address that released control
     */
    event BeneficiaryControlReleased(bytes32 indexed beneficiaryId, address indexed owner);

    /**
     * @notice Emitted when the verified owner authorizes a replacement payout address
     * @dev Identity proof alone cannot rotate an already-verified channel.
     */
    event PayoutAddressRotated(
        bytes32 indexed beneficiaryId,
        address indexed oldPayoutAddress,
        address indexed newPayoutAddress
    );

    /**
     * @notice Emitted when the verifier contract is updated
     * @param oldVerifier The previous verifier address
     * @param newVerifier The new verifier address
     */
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

    /**
     * @notice Emitted when the verifier contract is revoked, halting all new channel verification
     * @param revokedVerifier The verifier contract that was trusted until now
     * @param revokedBy The owner or guardian that called the revocation
     */
    event VerifierRevoked(address indexed revokedVerifier, address indexed revokedBy);

    /**
     * @notice Emitted when a namespace's first-claim waiting period is updated
     * @param namespaceHash keccak256 of the namespace string (for example "dns")
     * @param period Seconds that must elapse after verification before first withdrawal
     */
    event NamespaceClaimWaitingPeriodUpdated(bytes32 indexed namespaceHash, uint256 period);

    /**
     * @notice Initializes the channel registry with a verifier contract
     * @param _verifier The address of the IBeneficiaryVerifier contract
     */
    constructor(address _verifier) Ownable(msg.sender) {
        if (_verifier == address(0)) revert InvalidVerifierAddress();
        verifier = _verifier;
    }

    /**
     * @notice Returns the payout address bound to a beneficiary
     * @param beneficiaryId The beneficiary to query
     * @return The payout address (zero if unclaimed)
     */
    function payoutAddress(bytes32 beneficiaryId) external view returns (address) {
        return _payoutAddresses[beneficiaryId];
    }

    /**
     * @notice Returns the current state of a beneficiary as a uint8
     * @param beneficiaryId The identity to query
     * @return The state (0=Unclaimed, 1=Verified, 2=BeneficiaryControlled)
     */
    function beneficiaryState(bytes32 beneficiaryId) external view returns (uint8) {
        return uint8(_beneficiaryStates[beneficiaryId]);
    }

    /**
     * @notice Check if a beneficiary has been verified (Verified or BeneficiaryControlled)
     * @param beneficiaryId The identity to check
     * @return True if the beneficiary is at least Verified
     */
    function isVerified(bytes32 beneficiaryId) external view returns (bool) {
        return _beneficiaryStates[beneficiaryId] >= BeneficiaryState.Verified;
    }

    /**
     * @notice Check if a beneficiary is in the BeneficiaryControlled state
     * @param beneficiaryId The identity to check
     * @return True if identity control has been taken
     */
    function isBeneficiaryControlled(bytes32 beneficiaryId) external view returns (bool) {
        return _beneficiaryStates[beneficiaryId] == BeneficiaryState.BeneficiaryControlled;
    }

    /**
     * @notice Timestamp when the verified owner took identity control (zero if not yet)
     * @dev Content factories use this to start their own veto windows.
     */
    function controlTakenAt(bytes32 beneficiaryId) external view returns (uint256) {
        return _controlTakenAt[beneficiaryId];
    }

    /**
     * @notice Earliest timestamp at which escrow for this beneficiary may be withdrawn
     * @dev Reverts if the beneficiary is still unclaimed. Content namespaces default to
     *      verification time (zero waiting period).
     */
    function claimWithdrawableAt(bytes32 beneficiaryId) external view returns (uint256) {
        if (_beneficiaryStates[beneficiaryId] == BeneficiaryState.Unclaimed) {
            revert BeneficiaryNotVerified(beneficiaryId);
        }
        return _verifiedAt[beneficiaryId] + _appliedClaimWaitingPeriod[beneficiaryId];
    }

    /**
     * @notice Configure the first-claim waiting period for a namespace
     * @dev `namespaceHash` is keccak256 of the UTF-8 namespace string (e.g. "dns").
     *      0 means withdrawable immediately after verification (social MVP).
     */
    function setNamespaceClaimWaitingPeriod(bytes32 namespaceHash, uint256 period) external onlyOwner {
        if (namespaceHash == bytes32(0)) revert InvalidBeneficiaryIdentity();
        namespaceClaimWaitingPeriod[namespaceHash] = period;
        emit NamespaceClaimWaitingPeriodUpdated(namespaceHash, period);
    }

    /**
     * @notice Update the verifier contract address
     * @dev Only callable by the contract owner
     * @param _verifier The new verifier contract address
     */
    function setVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert InvalidVerifierAddress();
        address oldVerifier = verifier;
        verifier = _verifier;
        emit VerifierUpdated(oldVerifier, _verifier);
    }

    /**
     * @notice Immediately stop trusting the current verifier contract
     * @dev Callable by the owner *or* the guardian, so it does not have to wait on the
     *      timelock that gates `setVerifier`. This is the registry-level counterpart to
     *      `BeneficiaryVerifier.revokeTrustedVerifier`: use it when the verifier *contract*
     *      itself is compromised or misbehaving, rather than just its signing key.
     *      It only reduces power — `verifyBeneficiary` reverts until the owner installs a
     *      replacement, while every other flow (taking control, escrow withdrawals by
     *      already-verified owners) is untouched.
     */
    function revokeVerifier() external onlyOwnerOrGuardian {
        address oldVerifier = verifier;
        if (oldVerifier == address(0)) revert VerifierAlreadyRevoked();
        verifier = address(0);
        emit VerifierRevoked(oldVerifier, _msgSender());
    }

    /**
     * @notice Verify a beneficiary using a signed proof from the off-chain verifier
     * @dev Transitions the beneficiary from Unclaimed to Verified. Can only be called once per beneficiary.
     *      The proof must be signed by the trusted verifier and not expired.
     * @param beneficiaryId The beneficiary to verify
     * @param claimant The payout address claiming control of the beneficiary
     * @param nonce A unique nonce to prevent replay attacks
     * @param deadline The unix timestamp after which the proof expires
     * @param proofHash Hash of the durable public proof reference (tweet/RSS URL) checked by the verifier
     * @param verifierSignature The signature from the off-chain verifier
     */
    function verifyBeneficiary(
        bytes32 beneficiaryId,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes32 proofHash,
        bytes calldata verifierSignature
    ) external {
        _verifyBeneficiary(beneficiaryId, bytes32(0), claimant, nonce, deadline, proofHash, verifierSignature, 0);
    }

    /**
     * @notice Verify a namespaced beneficiary and apply that namespace's waiting period
     * @dev `beneficiaryId` is keccak256 of `namespace:canonicalIdentifier`. DNS uses a
     *      non-zero waiting period so the public proof can be noticed before first withdrawal.
     */
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
        uint256 waitingPeriod = namespaceClaimWaitingPeriod[keccak256(bytes(namespace))];
        _verifyBeneficiary(
            beneficiaryId,
            keccak256(bytes(namespace)),
            claimant,
            nonce,
            deadline,
            proofHash,
            verifierSignature,
            waitingPeriod
        );
    }

    function _verifyBeneficiary(
        bytes32 beneficiaryId,
        bytes32 namespaceHash,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes32 proofHash,
        bytes calldata verifierSignature,
        uint256 waitingPeriod
    ) private {
        if (_beneficiaryStates[beneficiaryId] >= BeneficiaryState.Verified) {
            revert BeneficiaryAlreadyVerified(beneficiaryId);
        }
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
        _payoutAddresses[beneficiaryId] = claimant;
        _beneficiaryStates[beneficiaryId] = BeneficiaryState.Verified;
        _verifiedAt[beneficiaryId] = block.timestamp;
        _appliedClaimWaitingPeriod[beneficiaryId] = waitingPeriod;

        emit BeneficiaryVerified(beneficiaryId, claimant);
        emit BeneficiaryProofAnchored(beneficiaryId, claimant, proofHash);
    }

    /**
     * @notice Replace the beneficiary's verified payout address.
     * @dev Only the current payout address may rotate. This deliberately provides no verifier-
     *      or administrator-driven recovery path: a new identity proof alone must not
     *      redirect funds already associated with an established owner.
     * @param beneficiaryId The verified beneficiary whose payout address is changing
     * @param newPayoutAddress The replacement escrow payout address
     */
    function rotatePayoutAddress(bytes32 beneficiaryId, address newPayoutAddress) external {
        if (_beneficiaryStates[beneficiaryId] == BeneficiaryState.Unclaimed) {
            revert BeneficiaryNotVerified(beneficiaryId);
        }
        if (newPayoutAddress == address(0)) revert InvalidNewPayoutAddress();

        address currentPayoutAddress = _payoutAddresses[beneficiaryId];
        if (_msgSender() != currentPayoutAddress) revert OnlyPayoutAddressCanRotate();

        _payoutAddresses[beneficiaryId] = newPayoutAddress;
        emit PayoutAddressRotated(beneficiaryId, currentPayoutAddress, newPayoutAddress);
    }

    /**
     * @notice Take full control of a verified identity
     * @dev Transitions from Verified to BeneficiaryControlled. Only the verified payout
     *      address can call this. Content factories may start a veto window from
     *      `controlTakenAt`.
     * @param beneficiaryId The identity to take control of
     */
    function takeBeneficiaryControl(bytes32 beneficiaryId) external {
        if (_beneficiaryStates[beneficiaryId] == BeneficiaryState.Unclaimed) {
            revert BeneficiaryNotVerified(beneficiaryId);
        }
        if (_beneficiaryStates[beneficiaryId] == BeneficiaryState.BeneficiaryControlled) {
            revert BeneficiaryAlreadyControlled(beneficiaryId);
        }
        address caller = _msgSender();
        if (caller != _payoutAddresses[beneficiaryId]) {
            revert OnlyPayoutAddressCanTakeControl();
        }

        _beneficiaryStates[beneficiaryId] = BeneficiaryState.BeneficiaryControlled;
        _controlTakenAt[beneficiaryId] = block.timestamp;

        emit BeneficiaryControlTaken(beneficiaryId, caller);
    }

    /**
     * @notice Reopen third-party project creation for a controlled identity
     * @dev Transitions from BeneficiaryControlled back to Verified. Existing
     *      projects are unchanged. Only the current payout address can call this.
     * @param beneficiaryId The identity to reopen
     */
    function releaseBeneficiaryControl(bytes32 beneficiaryId) external {
        if (_beneficiaryStates[beneficiaryId] != BeneficiaryState.BeneficiaryControlled) {
            revert BeneficiaryNotControlled(beneficiaryId);
        }
        address caller = _msgSender();
        if (caller != _payoutAddresses[beneficiaryId]) {
            revert OnlyPayoutAddressCanReleaseControl();
        }

        _beneficiaryStates[beneficiaryId] = BeneficiaryState.Verified;
        _controlTakenAt[beneficiaryId] = 0;

        emit BeneficiaryControlReleased(beneficiaryId, caller);
    }
}
