//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MultiERC1155AssuranceContract} from "./AssuranceContracts.sol";

interface IProceedsBeneficiaryRegistry {
    function isVerified(bytes32 beneficiaryId) external view returns (bool);
    function payoutAddress(bytes32 beneficiaryId) external view returns (address);
    function claimWithdrawableAt(bytes32 beneficiaryId) external view returns (uint256);
}

error InvalidProceedsRegistry();
error UseClaim();
error NotPayoutAddress();
error AcceptanceClosed();
error NothingToClaim();
error ClaimWindowElapsed(uint256 closedAt);
error ClaimWindowStillOpen(uint256 opensAt);
error ClaimWaitingPeriodNotElapsed(uint256 withdrawableAt);
error NothingToReclaim();
error AlreadyReclaimed();

/**
 * @notice Keeps successful proceeds in this contract until its beneficiary claims
 *         them, refuses them, or the unclaimed window elapses.
 * @dev The registry is read at claim time. Parent recipient is this contract.
 */
abstract contract IdentityHeldProceeds is MultiERC1155AssuranceContract {
    using SafeERC20 for IERC20;

    address public immutable proceedsRegistry;
    bytes32 public immutable beneficiaryId;
    uint256 public immutable unclaimedProceedsWindow;

    uint256 internal succeededAt;
    bool internal acceptanceClosed;
    bool internal surplusReturnOpen;
    uint256 internal surplusSnapshot;
    uint256 internal surplusSupplySnapshot;
    mapping(address => bool) internal surplusReclaimed;

    event SuccessNoted(uint256 succeededAt);
    event ProceedsClaimed(bytes32 indexed beneficiaryId, address indexed to, uint256 amount);
    event ProceedsRefused(bytes32 indexed beneficiaryId, address indexed payout);
    event SurplusReturnOpened(uint256 surplus, uint256 supply);
    event SurplusReclaimed(address indexed holder, uint256 amount);

    constructor(
        address owner,
        address paymentToken,
        address erc1155Addr,
        string memory projectMetadataCid,
        address registry,
        bytes32 _beneficiaryId,
        uint256 window
    ) MultiERC1155AssuranceContract(owner, address(this), paymentToken, erc1155Addr, projectMetadataCid) {
        if (registry == address(0) || window == 0) revert InvalidProceedsRegistry();
        proceedsRegistry = registry;
        beneficiaryId = _beneficiaryId;
        unclaimedProceedsWindow = window;
    }

    function noteSuccess() public {
        if (succeededAt != 0) return;
        requireAssuranceContractHasSucceeded();
        succeededAt = block.timestamp;
        emit SuccessNoted(succeededAt);
    }

    function withdraw() external override {
        revert UseClaim();
    }

    function claim() external {
        address payout = _payout();
        if (acceptanceClosed) revert AcceptanceClosed();
        noteSuccess();
        uint256 closedAt = succeededAt + unclaimedProceedsWindow;
        if (block.timestamp >= closedAt) revert ClaimWindowElapsed(closedAt);
        uint256 withdrawableAt = IProceedsBeneficiaryRegistry(proceedsRegistry).claimWithdrawableAt(beneficiaryId);
        if (block.timestamp < withdrawableAt) revert ClaimWaitingPeriodNotElapsed(withdrawableAt);
        uint256 value = withdrawableRecipientBalance();
        if (value == 0) revert NothingToClaim();
        emit ProceedsClaimed(beneficiaryId, payout, value);
        IERC20(paymentToken).safeTransfer(payout, value);
    }

    function refuse() external {
        address payout = _payout();
        if (acceptanceClosed) revert AcceptanceClosed();
        acceptanceClosed = true;
        emit ProceedsRefused(beneficiaryId, payout);
        if (_hasSucceeded()) {
            noteSuccess();
            _openSurplusReturn();
        }
    }

    function reclaimUnclaimedShare() external {
        if (!surplusReturnOpen) {
            if (acceptanceClosed && !_hasSucceeded()) revert NothingToReclaim();
            noteSuccess();
            uint256 opensAt = succeededAt + unclaimedProceedsWindow;
            if (block.timestamp < opensAt) revert ClaimWindowStillOpen(opensAt);
            acceptanceClosed = true;
            _openSurplusReturn();
        }
        if (surplusReclaimed[msg.sender]) revert AlreadyReclaimed();
        uint256 share = balanceOf(msg.sender);
        if (share == 0 || surplusSupplySnapshot == 0) revert NothingToReclaim();
        surplusReclaimed[msg.sender] = true;
        uint256 amount = surplusSnapshot * share / surplusSupplySnapshot;
        if (amount == 0) revert NothingToReclaim();
        emit SurplusReclaimed(msg.sender, amount);
        IERC20(paymentToken).safeTransfer(msg.sender, amount);
    }

    function requireBuyingAllowed() internal view override {
        if (acceptanceClosed || surplusReturnOpen) revert AcceptanceClosed();
        if (succeededAt != 0 && block.timestamp >= succeededAt + unclaimedProceedsWindow) {
            revert ClaimWindowElapsed(succeededAt + unclaimedProceedsWindow);
        }
        super.requireBuyingAllowed();
    }

    function requireRefundsAllowed() internal view override {
        if (acceptanceClosed && !_hasSucceeded()) return;
        super.requireRefundsAllowed();
    }

    function _payout() internal view returns (address payout) {
        if (!IProceedsBeneficiaryRegistry(proceedsRegistry).isVerified(beneficiaryId)) revert NotPayoutAddress();
        payout = IProceedsBeneficiaryRegistry(proceedsRegistry).payoutAddress(beneficiaryId);
        if (msg.sender != payout) revert NotPayoutAddress();
    }

    function _openSurplusReturn() internal {
        surplusReturnOpen = true;
        surplusSnapshot = withdrawableRecipientBalance();
        surplusSupplySnapshot = totalSupply();
        emit SurplusReturnOpened(surplusSnapshot, surplusSupplySnapshot);
    }
}
