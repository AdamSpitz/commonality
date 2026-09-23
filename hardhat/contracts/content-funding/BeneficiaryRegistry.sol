//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IBeneficiaryIdentity} from "../identity/BeneficiaryIdentity.sol";

error BeneficiaryAlreadyVerified(bytes32 beneficiaryId);
error BeneficiaryNotClaimed(bytes32 beneficiaryId);
error BeneficiaryNotVerified(bytes32 beneficiaryId);
error BeneficiaryAlreadyControlled(bytes32 beneficiaryId);
error InvalidNewPayoutAddress();
error OnlyPayoutAddressCanTakeControl();
error OnlyPayoutAddressCanReleaseControl();
error BeneficiaryNotControlled(bytes32 beneficiaryId);
error OnlyPayoutAddressCanRotate();
error OnlyPayoutAddressCanDisavowProject();
error InvalidProjectAddress();
error ProjectNotForBeneficiary(bytes32 beneficiaryId, address project);
error ProjectAlreadyDisavowed(bytes32 beneficiaryId, address project);
error ProjectNotDisavowed(bytes32 beneficiaryId, address project);
error InvalidIdentityAddress();
error InvalidBeneficiaryIdentity();
error ClaimWaitingPeriodNotElapsed(uint256 withdrawableAt);

/**
 * @title IBeneficiaryRegistry
 * @notice Interface for the shared beneficiary registry
 */
interface IBeneficiaryRegistry {
    function payoutAddress(bytes32 beneficiaryId) external view returns (address);
    function beneficiaryState(bytes32 beneficiaryId) external view returns (uint8);
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
    function isVerified(bytes32 beneficiaryId) external view returns (bool);
    function isBeneficiaryControlled(bytes32 beneficiaryId) external view returns (bool);
    function isProjectDisavowed(bytes32 beneficiaryId, address project) external view returns (bool);
    function disavowProject(bytes32 beneficiaryId, address project) external;
    function withdrawProjectDisavowal(bytes32 beneficiaryId, address project) external;
    function controlTakenAt(bytes32 beneficiaryId) external view returns (uint256);
    function claimWithdrawableAt(bytes32 beneficiaryId) external view returns (uint256);
}

interface IBeneficiaryBoundProject {
    function beneficiaryId() external view returns (bytes32);
}

/**
 * @title BeneficiaryRegistry
 * @notice Tracks beneficiary payout and project-control state for funding.
 * @dev Who proved the identity lives on BeneficiaryIdentity. This contract copies
 *      that owner in once as the initial payout address. Later rotation, control,
 *      disavowal, and the claim waiting period stay here.
 */
contract BeneficiaryRegistry is IBeneficiaryRegistry, Ownable {

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

    IBeneficiaryIdentity public identity;

    mapping(bytes32 beneficiaryId => address payout) private _payoutAddresses;
    mapping(bytes32 beneficiaryId => BeneficiaryState) private _beneficiaryStates;
    mapping(bytes32 namespaceHash => uint256 period) public namespaceClaimWaitingPeriod;
    mapping(bytes32 beneficiaryId => uint256 timestamp) private _verifiedAt;
    mapping(bytes32 beneficiaryId => uint256 period) private _appliedClaimWaitingPeriod;

    mapping(bytes32 beneficiaryId => uint256 timestamp) private _controlTakenAt;
    mapping(bytes32 beneficiaryId => mapping(address project => bool disavowed)) private _projectDisavowed;

    /**
     * @notice Emitted when a beneficiary's payout address is verified
     * @param beneficiaryId The verified beneficiary
     * @param payoutAddress The address bound to receive beneficiary funds
     */
    event BeneficiaryVerified(bytes32 indexed beneficiaryId, address indexed payoutAddress);

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
     * @notice The payout wallet disavows a particular project about this identity.
     * @dev Does not cancel the contract, rewrite authorship, or change escrow.
     */
    event ProjectDisavowed(
        bytes32 indexed beneficiaryId,
        address indexed project,
        address indexed owner
    );

    /**
     * @notice The payout wallet withdraws a prior project disavowal.
     */
    event ProjectDisavowalWithdrawn(
        bytes32 indexed beneficiaryId,
        address indexed project,
        address indexed owner
    );

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
     * @notice Emitted when a namespace's first-claim waiting period is updated
     * @param namespaceHash keccak256 of the namespace string (for example "dns")
     * @param period Seconds that must elapse after verification before first withdrawal
     */
    event NamespaceClaimWaitingPeriodUpdated(bytes32 indexed namespaceHash, uint256 period);

    /**
     * @param identity_ The BeneficiaryIdentity contract whose proved owner is copied in once
     */
    constructor(address identity_) Ownable(msg.sender) {
        if (identity_ == address(0)) revert InvalidIdentityAddress();
        identity = IBeneficiaryIdentity(identity_);
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
     * @notice Record a proof on BeneficiaryIdentity, then copy that owner in as the payout address.
     * @dev If the identity was already claimed, this only adopts it. A second adopt reverts.
     */
    function verifyBeneficiary(
        bytes32 beneficiaryId,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes32 proofHash,
        bytes calldata verifierSignature
    ) external {
        if (!identity.isClaimed(beneficiaryId)) {
            identity.verifyBeneficiary(beneficiaryId, claimant, nonce, deadline, proofHash, verifierSignature);
        }
        _adopt(beneficiaryId);
    }

    /**
     * @notice Claim a namespaced identity, then copy its owner in as the payout address.
     * @dev The waiting period is the namespace period configured here, read from the
     *      namespace hash the identity contract stored.
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
        if (!identity.isClaimed(beneficiaryId)) {
            identity.verifyNamespacedBeneficiary(
                namespace,
                canonicalIdentifier,
                claimant,
                nonce,
                deadline,
                proofHash,
                verifierSignature
            );
        }
        _adopt(beneficiaryId);
    }

    /**
     * @notice Copy an already-proved owner in as the initial payout address.
     * @dev Use this when the identity was claimed without a funding registry present.
     *      A later identity proof cannot replace an adopted payout address.
     */
    function adoptBeneficiary(bytes32 beneficiaryId) external {
        _adopt(beneficiaryId);
    }

    function _adopt(bytes32 beneficiaryId) private {
        if (_beneficiaryStates[beneficiaryId] >= BeneficiaryState.Verified) {
            revert BeneficiaryAlreadyVerified(beneficiaryId);
        }
        address owner = identity.ownerOf(beneficiaryId);
        if (owner == address(0)) revert BeneficiaryNotClaimed(beneficiaryId);

        _payoutAddresses[beneficiaryId] = owner;
        _beneficiaryStates[beneficiaryId] = BeneficiaryState.Verified;
        _verifiedAt[beneficiaryId] = block.timestamp;
        _appliedClaimWaitingPeriod[beneficiaryId] = namespaceClaimWaitingPeriod[identity.namespaceHashOf(beneficiaryId)];

        emit BeneficiaryVerified(beneficiaryId, owner);
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

    /**
     * @notice Whether the payout wallet currently disavows this project.
     */
    function isProjectDisavowed(bytes32 beneficiaryId, address project) external view returns (bool) {
        return _projectDisavowed[beneficiaryId][project];
    }

    /**
     * @notice Disavow a project about this identity.
     * @dev Only the current payout wallet of a verified identity. The project
     *      must report this beneficiaryId. Existing escrow and authorship are unchanged.
     */
    function disavowProject(bytes32 beneficiaryId, address project) external {
        _requirePayoutCanActOnProject(beneficiaryId, project);
        if (_projectDisavowed[beneficiaryId][project]) {
            revert ProjectAlreadyDisavowed(beneficiaryId, project);
        }
        _projectDisavowed[beneficiaryId][project] = true;
        emit ProjectDisavowed(beneficiaryId, project, _msgSender());
    }

    /**
     * @notice Withdraw a prior disavowal of a project.
     * @dev Does not constitute endorsement. Only the current payout wallet.
     */
    function withdrawProjectDisavowal(bytes32 beneficiaryId, address project) external {
        _requirePayoutCanActOnProject(beneficiaryId, project);
        if (!_projectDisavowed[beneficiaryId][project]) {
            revert ProjectNotDisavowed(beneficiaryId, project);
        }
        _projectDisavowed[beneficiaryId][project] = false;
        emit ProjectDisavowalWithdrawn(beneficiaryId, project, _msgSender());
    }

    function _requirePayoutCanActOnProject(bytes32 beneficiaryId, address project) private view {
        if (_beneficiaryStates[beneficiaryId] == BeneficiaryState.Unclaimed) {
            revert BeneficiaryNotVerified(beneficiaryId);
        }
        if (project == address(0)) revert InvalidProjectAddress();
        if (_msgSender() != _payoutAddresses[beneficiaryId]) {
            revert OnlyPayoutAddressCanDisavowProject();
        }
        try IBeneficiaryBoundProject(project).beneficiaryId() returns (bytes32 boundId) {
            if (boundId != beneficiaryId) {
                revert ProjectNotForBeneficiary(beneficiaryId, project);
            }
        } catch {
            revert ProjectNotForBeneficiary(beneficiaryId, project);
        }
    }
}
