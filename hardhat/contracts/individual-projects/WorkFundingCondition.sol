//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IAssuranceCondition} from "./IAssuranceCondition.sol";

interface IWorkBeneficiaryRegistry {
    function isVerified(bytes32 beneficiaryId) external view returns (bool);
    function payoutAddress(bytes32 beneficiaryId) external view returns (address);
}

interface IWorkThresholdCondition {
    function threshold() external view returns (uint256);
}

/// @notice A third-party proposal needs beneficiary acceptance before it can
///         succeed. Acceptance opens a seven-day veto window for this project.
///         Unaccepted proposals expire even if their funding threshold was met.
contract WorkFundingCondition is IAssuranceCondition {
    error OnlyFactory();
    error OnlyBeneficiary();
    error NotThirdPartyProposal();
    error ProposalClosed();
    error AlreadyAccepted();
    error VetoWindowExpired();

    uint256 public constant VETO_WINDOW = 7 days;
    IAssuranceCondition public immutable baseCondition;
    IWorkBeneficiaryRegistry public immutable registry;
    address public immutable factory;
    address public immutable recipient;
    bytes32 public immutable beneficiaryId;
    uint256 public immutable deadline;
    bool public immutable isThirdParty;
    uint256 public acceptedAt;
    bool public cancelled;

    event WorkProposalAccepted(address indexed beneficiary, uint256 acceptedAt);
    event WorkProposalVetoed(address indexed beneficiary);

    constructor(
        address base,
        address registry_,
        address recipient_,
        bytes32 beneficiaryId_,
        uint256 deadline_,
        bool thirdParty
    ) {
        baseCondition = IAssuranceCondition(base);
        registry = IWorkBeneficiaryRegistry(registry_);
        factory = msg.sender;
        recipient = recipient_;
        beneficiaryId = beneficiaryId_;
        deadline = deadline_;
        isThirdParty = thirdParty;
    }

    function beneficiary() public view returns (address) {
        if (beneficiaryId == bytes32(0)) return recipient;
        if (!registry.isVerified(beneficiaryId)) return address(0);
        return registry.payoutAddress(beneficiaryId);
    }

    /// @notice Preserve threshold discovery for ordinary value-threshold projects.
    function threshold() external view returns (uint256) {
        return IWorkThresholdCondition(address(baseCondition)).threshold();
    }

    function accept(address account) external {
        _authorize(account);
        if (!isThirdParty) revert NotThirdPartyProposal();
        if (cancelled || block.timestamp >= deadline || baseCondition.hasFailed()) revert ProposalClosed();
        if (acceptedAt != 0) revert AlreadyAccepted();
        acceptedAt = block.timestamp;
        emit WorkProposalAccepted(account, acceptedAt);
    }

    function veto(address account) external {
        _authorize(account);
        if (!isThirdParty) revert NotThirdPartyProposal();
        if (cancelled || hasFailed()) revert ProposalClosed();
        if (acceptedAt != 0 && block.timestamp > acceptedAt + VETO_WINDOW) revert VetoWindowExpired();
        cancelled = true;
        emit WorkProposalVetoed(account);
    }

    function hasSucceeded() public view returns (bool) {
        if (cancelled) return false;
        if (isThirdParty && (
            acceptedAt == 0 || acceptedAt + VETO_WINDOW >= deadline || block.timestamp <= acceptedAt + VETO_WINDOW
        )) return false;
        return baseCondition.hasSucceeded();
    }

    function hasFailed() public view returns (bool) {
        return cancelled || baseCondition.hasFailed()
            || (isThirdParty && block.timestamp >= deadline && !hasSucceeded());
    }

    function _authorize(address account) private view {
        if (msg.sender != factory) revert OnlyFactory();
        if (account == address(0) || account != beneficiary()) revert OnlyBeneficiary();
    }
}
