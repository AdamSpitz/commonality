// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {BasePaymaster} from "@account-abstraction/contracts/core/BasePaymaster.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {AccountCallDecoder} from "./AccountCallDecoder.sol";
import {GasTankEntryPointDeposits} from "./GasTankEntryPointDeposits.sol";
import {IPaymasterV06} from "./IPaymasterV06.sol";
import {UserOperationV06} from "./UserOperationV06.sol";

interface IERC1155PrimaryMarketPricing {
  function erc1155TotalCost(
    address erc1155Addr,
    uint256[] calldata ids,
    uint256[] calldata counts
  ) external view returns (uint256);
}

/**
 * @title CreatorGasTank
 * @notice ERC-4337 paymaster with per-creator gas tanks for sponsored contribution/refund flows.
 * @dev Supports SimpleAccount execute/executeBatch, Coinbase Smart Wallet / Base Account
 *      executeBatch((address,uint256,bytes)[]), and Kernel v3 ERC-7579 execute(bytes32,bytes).
 *      See workflow/sponsored-gas-live-trace.md and specs/tech/sponsored-gas.md.
 */
contract CreatorGasTank is BasePaymaster {
  uint256 private constant PAYMASTER_HEADER_LENGTH = 52;
  uint256 private constant PAYMASTER_V06_HEADER_LENGTH = 20;
  uint256 private constant ADDRESS_BYTES = 20;

  bytes4 private constant ERC20_APPROVE_SELECTOR = IERC20.approve.selector;
  bytes4 private constant ERC1155_SET_APPROVAL_FOR_ALL_SELECTOR = IERC1155.setApprovalForAll.selector;
  bytes4 private constant BUY_ERC1155_SELECTOR =
    bytes4(keccak256("buyERC1155(address,address,uint256[],uint256[],bytes)"));
  bytes4 private constant REFUND_ERC1155_SELECTOR =
    bytes4(keccak256("refundERC1155(address,address,uint256[],uint256[],bytes)"));

  struct SponsorshipConfig {
    uint192 maxSponsoredWeiPerWalletPerWindow;
    uint32 walletWindowSeconds;
  }

  struct WalletUsage {
    uint64 windowStartedAt;
    uint192 sponsoredWei;
  }

  mapping(address creator => uint256 balance) public tankBalance;
  mapping(address project => address creator) public creatorOf;
  mapping(address creator => mapping(address wallet => WalletUsage usage)) public walletUsage;

  SponsorshipConfig public sponsorshipConfig;
  address public immutable settlementToken;
  IEntryPoint public immutable entryPointV06;
  uint256 public minSponsoredContributionAmount;

  event TankFunded(address indexed funder, address indexed creator, uint256 amount);
  event ProjectEnrolled(address indexed creator, address indexed project);
  event SponsorshipConfigUpdated(uint192 maxSponsoredWeiPerWalletPerWindow, uint32 walletWindowSeconds);
  event MinSponsoredContributionAmountUpdated(uint256 minSponsoredContributionAmount);
  event TankDebited(address indexed creator, address indexed wallet, uint256 amount);

  error EmptyTankFunding();
  error InvalidProject();
  error ProjectAlreadyEnrolled(address creator);
  error ProjectNotEnrolled(address project);
  error InsufficientTankBalance(uint256 balance, uint256 required);
  error WalletCapExceeded(uint256 alreadySponsored, uint256 requested, uint256 cap);
  error UnsupportedAccountCall(bytes4 selector);
  error UnsupportedCallType(bytes1 callType);
  error InvalidExecutionCalldataLength(uint256 length);
  error UnsupportedSponsoredCall(address target, bytes4 selector);
  error InvalidPaymasterDataLength(uint256 length);
  error InvalidAccountCallDataLength(uint256 length);
  error InvalidSponsoredCallDataLength(uint256 length);
  error SponsoredCallValueNotAllowed();
  error InvalidBatchLengths();
  error MissingSponsoredPrimaryAction();
  error SponsoredContributionBelowMinimum(uint256 contributionAmount, uint256 minimumAmount);
  error EntryPointV06NotSet();
  error NotFromEntryPointV06();

  constructor(
    IEntryPoint entryPoint_,
    address settlementToken_,
    uint192 maxSponsoredWeiPerWalletPerWindow_,
    uint32 walletWindowSeconds_,
    uint256 minSponsoredContributionAmount_,
    IEntryPoint entryPointV06_
  ) BasePaymaster(entryPoint_) {
    if (settlementToken_ == address(0)) revert InvalidProject();
    settlementToken = settlementToken_;
    entryPointV06 = entryPointV06_;
    _setSponsorshipConfig(maxSponsoredWeiPerWalletPerWindow_, walletWindowSeconds_);
    _setMinSponsoredContributionAmount(minSponsoredContributionAmount_);
  }

  receive() external payable {}

  function fundTank(address creator) external payable {
    if (creator == address(0)) revert InvalidProject();
    if (msg.value == 0) revert EmptyTankFunding();
    tankBalance[creator] += msg.value;
    entryPoint.depositTo{value: msg.value}(address(this));
    emit TankFunded(msg.sender, creator, msg.value);
  }

  function enroll(address project) external {
    if (project == address(0)) revert InvalidProject();
    address existingCreator = creatorOf[project];
    if (existingCreator != address(0)) revert ProjectAlreadyEnrolled(existingCreator);
    creatorOf[project] = msg.sender;
    emit ProjectEnrolled(msg.sender, project);
  }

  function setSponsorshipConfig(
    uint192 maxSponsoredWeiPerWalletPerWindow,
    uint32 walletWindowSeconds
  ) external onlyOwner {
    _setSponsorshipConfig(maxSponsoredWeiPerWalletPerWindow, walletWindowSeconds);
  }

  function setMinSponsoredContributionAmount(uint256 minSponsoredContributionAmount_) external onlyOwner {
    _setMinSponsoredContributionAmount(minSponsoredContributionAmount_);
  }

  // solhint-disable-next-line func-mutability
  function _validatePaymasterUserOp(
    PackedUserOperation calldata userOp,
    bytes32,
    uint256 maxCost
  ) internal override returns (bytes memory context, uint256 validationData) {
    address project = _decodeProject(userOp.paymasterAndData, PAYMASTER_HEADER_LENGTH);
    return _validateSponsoredUserOp(project, userOp.sender, userOp.callData, maxCost, entryPoint, entryPointV06);
  }

  function validatePaymasterUserOp(
    UserOperationV06 calldata userOp,
    bytes32,
    uint256 maxCost
  ) external returns (bytes memory context, uint256 validationData) {
    if (address(entryPointV06) == address(0)) revert EntryPointV06NotSet();
    if (msg.sender != address(entryPointV06)) revert NotFromEntryPointV06();
    address project = _decodeProject(userOp.paymasterAndData, PAYMASTER_V06_HEADER_LENGTH);
    return _validateSponsoredUserOp(project, userOp.sender, userOp.callData, maxCost, entryPointV06, entryPoint);
  }

  function postOp(IPaymasterV06.PostOpMode mode, bytes calldata context, uint256 actualGasCost) external {
    if (address(entryPointV06) == address(0)) revert EntryPointV06NotSet();
    if (msg.sender != address(entryPointV06)) revert NotFromEntryPointV06();
    _postOp(PostOpMode(uint8(mode)), context, actualGasCost, 0);
  }

  function _validateSponsoredUserOp(
    address project,
    address sender,
    bytes calldata callData,
    uint256 maxCost,
    IEntryPoint depositEntryPoint,
    IEntryPoint otherEntryPoint
  ) private returns (bytes memory context, uint256 validationData) {
    address creator = creatorOf[project];
    if (creator == address(0)) revert ProjectNotEnrolled(project);
    if (tankBalance[creator] < maxCost) revert InsufficientTankBalance(tankBalance[creator], maxCost);

    _validateWalletCap(creator, sender, maxCost);
    _validateAccountCall(project, callData);
    GasTankEntryPointDeposits.ensureDeposit(depositEntryPoint, otherEntryPoint, maxCost);

    return (abi.encode(creator, sender), 0);
  }

  function _postOp(
    PostOpMode,
    bytes calldata context,
    uint256 actualGasCost,
    uint256
  ) internal override {
    (address creator, address wallet) = abi.decode(context, (address, address));
    uint256 debit = actualGasCost;
    if (tankBalance[creator] < debit) {
      debit = tankBalance[creator];
    }
    tankBalance[creator] -= debit;
    _recordWalletUsage(creator, wallet, debit);
    emit TankDebited(creator, wallet, debit);
  }

  function _setSponsorshipConfig(
    uint192 maxSponsoredWeiPerWalletPerWindow,
    uint32 walletWindowSeconds
  ) private {
    sponsorshipConfig = SponsorshipConfig({
      maxSponsoredWeiPerWalletPerWindow: maxSponsoredWeiPerWalletPerWindow,
      walletWindowSeconds: walletWindowSeconds
    });
    emit SponsorshipConfigUpdated(maxSponsoredWeiPerWalletPerWindow, walletWindowSeconds);
  }

  function _setMinSponsoredContributionAmount(uint256 minSponsoredContributionAmount_) private {
    minSponsoredContributionAmount = minSponsoredContributionAmount_;
    emit MinSponsoredContributionAmountUpdated(minSponsoredContributionAmount_);
  }

  function _decodeProject(
    bytes calldata paymasterAndData,
    uint256 headerLength
  ) private pure returns (address project) {
    if (paymasterAndData.length != headerLength + ADDRESS_BYTES) {
      revert InvalidPaymasterDataLength(paymasterAndData.length);
    }
    project = address(bytes20(paymasterAndData[headerLength:headerLength + ADDRESS_BYTES]));
  }

  function _validateWalletCap(address creator, address wallet, uint256 requested) private view {
    SponsorshipConfig memory config = sponsorshipConfig;
    if (config.maxSponsoredWeiPerWalletPerWindow == 0 || config.walletWindowSeconds == 0) return;

    WalletUsage memory usage = walletUsage[creator][wallet];
    uint256 alreadySponsored = block.timestamp >= usage.windowStartedAt + config.walletWindowSeconds
      ? 0
      : usage.sponsoredWei;
    if (alreadySponsored + requested > config.maxSponsoredWeiPerWalletPerWindow) {
      revert WalletCapExceeded(alreadySponsored, requested, config.maxSponsoredWeiPerWalletPerWindow);
    }
  }

  function _recordWalletUsage(address creator, address wallet, uint256 cost) private {
    SponsorshipConfig memory config = sponsorshipConfig;
    if (config.maxSponsoredWeiPerWalletPerWindow == 0 || config.walletWindowSeconds == 0) return;

    WalletUsage storage usage = walletUsage[creator][wallet];
    if (block.timestamp >= usage.windowStartedAt + config.walletWindowSeconds) {
      usage.windowStartedAt = uint64(block.timestamp);
      usage.sponsoredWei = uint192(cost);
    } else {
      usage.sponsoredWei += uint192(cost);
    }
  }

  function _validateAccountCall(address project, bytes calldata accountCallData) private view {
    AccountCallDecoder.Execution[] memory executions = AccountCallDecoder.decodeExecutions(accountCallData);
    bool hasPrimaryAction = false;
    for (uint256 i = 0; i < executions.length; i++) {
      hasPrimaryAction =
        _validateSponsoredCall(project, executions[i].target, executions[i].value, executions[i].callData) ||
        hasPrimaryAction;
    }
    if (!hasPrimaryAction) revert MissingSponsoredPrimaryAction();
  }

  function _validateSponsoredCall(
    address project,
    address target,
    uint256 value,
    bytes memory innerCallData
  ) private view returns (bool hasPrimaryAction) {
    if (value != 0) revert SponsoredCallValueNotAllowed();
    if (innerCallData.length < 4) revert InvalidSponsoredCallDataLength(innerCallData.length);
    bytes4 selector = bytes4(innerCallData);

    if (target == project && selector == BUY_ERC1155_SELECTOR) {
      _validateMinimumContribution(project, innerCallData);
      return true;
    }

    if (target == project && selector == REFUND_ERC1155_SELECTOR) return true;

    if (selector == ERC20_APPROVE_SELECTOR && target == settlementToken) {
      (address spender,) = abi.decode(_stripSelector(innerCallData), (address, uint256));
      if (spender == project) return false;
    }

    if (selector == ERC1155_SET_APPROVAL_FOR_ALL_SELECTOR) {
      (address operator, bool approved) = abi.decode(_stripSelector(innerCallData), (address, bool));
      if (operator == project && approved) return false;
    }

    revert UnsupportedSponsoredCall(target, selector);
  }

  function _validateMinimumContribution(address project, bytes memory buyCallData) private view {
    uint256 minimumAmount = minSponsoredContributionAmount;
    if (minimumAmount == 0) return;

    (, address erc1155Addr, uint256[] memory ids, uint256[] memory counts,) = abi.decode(
      _stripSelector(buyCallData),
      (address, address, uint256[], uint256[], bytes)
    );
    uint256 contributionAmount = IERC1155PrimaryMarketPricing(project).erc1155TotalCost(
      erc1155Addr,
      ids,
      counts
    );
    if (contributionAmount < minimumAmount) {
      revert SponsoredContributionBelowMinimum(contributionAmount, minimumAmount);
    }
  }

  function _stripSelector(bytes memory callData) private pure returns (bytes memory args) {
    args = new bytes(callData.length - 4);
    for (uint256 i = 0; i < args.length; i++) {
      args[i] = callData[i + 4];
    }
  }
}
