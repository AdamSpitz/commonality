// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {AccountCallDecoder} from "./AccountCallDecoder.sol";
import {GasTankEntryPointDeposits} from "./GasTankEntryPointDeposits.sol";
import {IGasTankPaymasterFace} from "./IGasTankPaymasterFace.sol";

interface IERC1155PrimaryMarketPricing {
  function erc1155TotalCost(
    address erc1155Addr,
    uint256[] calldata ids,
    uint256[] calldata counts
  ) external view returns (uint256);
}

/**
 * @title CreatorGasTank
 * @notice Per-creator ETH pot and sponsorship policy. Not a paymaster.
 *         EntryPoint v0.6 / v0.7 adapters call into this vault on even footing.
 */
contract CreatorGasTank is Ownable {
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
  mapping(address face => bool isPaymaster) public isPaymaster;
  address[] public paymasterFaces;

  SponsorshipConfig public sponsorshipConfig;
  address public immutable settlementToken;
  uint256 public minSponsoredContributionAmount;
  uint256 public faceDepositFloor;

  event TankFunded(address indexed funder, address indexed creator, uint256 amount);
  event ProjectEnrolled(address indexed creator, address indexed project);
  event SponsorshipConfigUpdated(uint192 maxSponsoredWeiPerWalletPerWindow, uint32 walletWindowSeconds);
  event MinSponsoredContributionAmountUpdated(uint256 minSponsoredContributionAmount);
  event TankDebited(address indexed creator, address indexed wallet, uint256 amount);
  event PaymasterFaceAdded(address indexed face, address indexed entryPoint);
  event FaceDepositFloorUpdated(uint256 floor);

  error EmptyTankFunding();
  error InvalidProject();
  error ProjectAlreadyEnrolled(address creator);
  error ProjectNotEnrolled(address project);
  error InsufficientTankBalance(uint256 balance, uint256 required);
  error WalletCapExceeded(uint256 alreadySponsored, uint256 requested, uint256 cap);
  error UnsupportedSponsoredCall(address target, bytes4 selector);
  error InvalidSponsoredCallDataLength(uint256 length);
  error SponsoredCallValueNotAllowed();
  error MissingSponsoredPrimaryAction();
  error SponsoredContributionBelowMinimum(uint256 contributionAmount, uint256 minimumAmount);
  error NotPaymasterFace();
  error PaymasterFaceAlreadyAdded();
  error InvalidPaymasterFace();

  constructor(
    address settlementToken_,
    uint192 maxSponsoredWeiPerWalletPerWindow_,
    uint32 walletWindowSeconds_,
    uint256 minSponsoredContributionAmount_
  ) Ownable(msg.sender) {
    if (settlementToken_ == address(0)) revert InvalidProject();
    settlementToken = settlementToken_;
    _setSponsorshipConfig(maxSponsoredWeiPerWalletPerWindow_, walletWindowSeconds_);
    _setMinSponsoredContributionAmount(minSponsoredContributionAmount_);
    _setFaceDepositFloor(0.001 ether);
  }

  receive() external payable {}

  function fundTank(address creator) external payable {
    if (creator == address(0)) revert InvalidProject();
    if (msg.value == 0) revert EmptyTankFunding();
    tankBalance[creator] += msg.value;
    emit TankFunded(msg.sender, creator, msg.value);
    GasTankEntryPointDeposits.topUpToFloor(paymasterFaces, faceDepositFloor);
  }

  function enroll(address project) external {
    if (project == address(0)) revert InvalidProject();
    address existingCreator = creatorOf[project];
    if (existingCreator != address(0)) revert ProjectAlreadyEnrolled(existingCreator);
    creatorOf[project] = msg.sender;
    emit ProjectEnrolled(msg.sender, project);
  }

  function addPaymasterFace(address face) external onlyOwner {
    if (face == address(0)) revert InvalidPaymasterFace();
    if (isPaymaster[face]) revert PaymasterFaceAlreadyAdded();
    IEntryPoint ep = IGasTankPaymasterFace(face).entryPoint();
    if (address(ep) == address(0)) revert InvalidPaymasterFace();
    isPaymaster[face] = true;
    paymasterFaces.push(face);
    emit PaymasterFaceAdded(face, address(ep));
    GasTankEntryPointDeposits.topUp(face, faceDepositFloor);
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

  function setFaceDepositFloor(uint256 floor) external onlyOwner {
    _setFaceDepositFloor(floor);
    GasTankEntryPointDeposits.topUpToFloor(paymasterFaces, floor);
  }

  function replenishFaceDeposits() external {
    GasTankEntryPointDeposits.topUpToFloor(paymasterFaces, faceDepositFloor);
  }

  function rebalanceFaceDeposits() external onlyOwner {
    GasTankEntryPointDeposits.pullDownToFloor(paymasterFaces, faceDepositFloor);
    GasTankEntryPointDeposits.topUpToFloor(paymasterFaces, faceDepositFloor);
  }

  function topUpFace(address face, uint256 target) external onlyOwner {
    if (!isPaymaster[face]) revert NotPaymasterFace();
    GasTankEntryPointDeposits.topUp(face, target);
  }

  function validateCreatorUserOp(
    address project,
    address sender,
    bytes calldata callData,
    uint256 maxCost
  ) external view returns (bytes memory context) {
    if (!isPaymaster[msg.sender]) revert NotPaymasterFace();
    address creator = creatorOf[project];
    if (creator == address(0)) revert ProjectNotEnrolled(project);
    if (tankBalance[creator] < maxCost) revert InsufficientTankBalance(tankBalance[creator], maxCost);

    _validateWalletCap(creator, sender, maxCost);
    _validateAccountCall(project, callData);
    return abi.encode(creator, sender);
  }

  function debitCreator(bytes calldata context, uint256 actualGasCost) external {
    if (!isPaymaster[msg.sender]) revert NotPaymasterFace();
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

  function _setFaceDepositFloor(uint256 floor) private {
    faceDepositFloor = floor;
    emit FaceDepositFloorUpdated(floor);
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
