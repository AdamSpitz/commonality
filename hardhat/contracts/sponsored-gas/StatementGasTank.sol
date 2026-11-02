// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {BasePaymaster} from "@account-abstraction/contracts/core/BasePaymaster.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {AccountCallDecoder} from "./AccountCallDecoder.sol";
import {GasTankEntryPointDeposits} from "./GasTankEntryPointDeposits.sol";
import {IPaymasterV06} from "./IPaymasterV06.sol";
import {UserOperationV06} from "./UserOperationV06.sol";

/**
 * @title StatementGasTank
 * @notice ERC-4337 paymaster with per-sponsor gas tanks for signing enrolled statements.
 * @dev Sponsors only Beliefs.setBelief / setBeliefsInBatch where every stance is `believes` (1)
 *      and every statement id is enrolled to the same sponsor as the anchor id in paymasterData.
 *      Commonality does not fund tanks. Disbelief and no-opinion are not sponsored, so an opponent
 *      cannot drain a tank by signing against the statement. A per-wallet wei cap is the backstop
 *      against a supporter flipping the same belief repeatedly. Each operation charges its full
 *      EntryPoint maximum cost during validation, including when execution fails. This conservative
 *      charge covers postOp and unused-gas penalties and prevents bundled operations from spending
 *      another sponsor's deposit. Any EntryPoint refund remains an unallocated safety surplus.
 */
contract StatementGasTank is BasePaymaster {
  uint256 private constant PAYMASTER_HEADER_LENGTH = 52;
  uint256 private constant PAYMASTER_V06_HEADER_LENGTH = 20;
  uint8 private constant BELIEVES = 1;

  bytes4 private constant SET_BELIEF_SELECTOR =
    bytes4(keccak256("setBelief(bytes32,uint8)"));
  bytes4 private constant SET_BELIEFS_IN_BATCH_SELECTOR =
    bytes4(keccak256("setBeliefsInBatch(bytes32[],uint8[])"));

  struct SponsorshipConfig {
    uint192 maxSponsoredWeiPerWalletPerWindow;
    uint32 walletWindowSeconds;
  }

  struct WalletUsage {
    uint64 windowStartedAt;
    uint192 sponsoredWei;
  }

  mapping(address sponsor => uint256 balance) public tankBalance;
  mapping(bytes32 statementId => address sponsor) public sponsorOf;
  mapping(address sponsor => mapping(address wallet => WalletUsage usage)) public walletUsage;

  SponsorshipConfig public sponsorshipConfig;
  address public immutable beliefs;
  IEntryPoint public immutable entryPointV06;

  event TankFunded(address indexed funder, address indexed sponsor, uint256 amount);
  event StatementEnrolled(address indexed sponsor, bytes32 indexed statementId);
  event SponsorshipConfigUpdated(uint192 maxSponsoredWeiPerWalletPerWindow, uint32 walletWindowSeconds);
  event TankDebited(address indexed sponsor, address indexed wallet, uint256 amount);

  error EmptyTankFunding();
  error InvalidSponsor();
  error InvalidBeliefs();
  error StatementAlreadyEnrolled(address sponsor);
  error StatementNotEnrolled(bytes32 statementId);
  error StatementSponsorMismatch(bytes32 statementId, address sponsor);
  error AnchorStatementMissing(bytes32 statementId);
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
  error SponsoredBeliefMustBeSupport(uint8 beliefState);
  error EmptySponsoredBatch();
  error EntryPointV06NotSet();
  error NotFromEntryPointV06();

  constructor(
    IEntryPoint entryPoint_,
    address beliefs_,
    uint192 maxSponsoredWeiPerWalletPerWindow_,
    uint32 walletWindowSeconds_,
    IEntryPoint entryPointV06_
  ) BasePaymaster(entryPoint_) {
    if (beliefs_ == address(0)) revert InvalidBeliefs();
    beliefs = beliefs_;
    entryPointV06 = entryPointV06_;
    _setSponsorshipConfig(maxSponsoredWeiPerWalletPerWindow_, walletWindowSeconds_);
  }

  receive() external payable {}

  function fundTank(address sponsor) external payable {
    if (sponsor == address(0)) revert InvalidSponsor();
    if (msg.value == 0) revert EmptyTankFunding();
    tankBalance[sponsor] += msg.value;
    entryPoint.depositTo{value: msg.value}(address(this));
    emit TankFunded(msg.sender, sponsor, msg.value);
  }

  /// @notice Enroll a statement so signatures of `believes` draw from the caller's tank.
  function enroll(bytes32 statementId) external {
    if (statementId == bytes32(0)) revert StatementNotEnrolled(statementId);
    address existingSponsor = sponsorOf[statementId];
    if (existingSponsor != address(0)) revert StatementAlreadyEnrolled(existingSponsor);
    sponsorOf[statementId] = msg.sender;
    emit StatementEnrolled(msg.sender, statementId);
  }

  function setSponsorshipConfig(
    uint192 maxSponsoredWeiPerWalletPerWindow,
    uint32 walletWindowSeconds
  ) external onlyOwner {
    _setSponsorshipConfig(maxSponsoredWeiPerWalletPerWindow, walletWindowSeconds);
  }

  function _validatePaymasterUserOp(
    PackedUserOperation calldata userOp,
    bytes32,
    uint256 maxCost
  ) internal override returns (bytes memory context, uint256 validationData) {
    bytes32 anchor = _decodeAnchor(userOp.paymasterAndData, PAYMASTER_HEADER_LENGTH);
    return _validateSponsoredUserOp(anchor, userOp.sender, userOp.callData, maxCost, entryPoint, entryPointV06);
  }

  function validatePaymasterUserOp(
    UserOperationV06 calldata userOp,
    bytes32,
    uint256 maxCost
  ) external returns (bytes memory context, uint256 validationData) {
    if (address(entryPointV06) == address(0)) revert EntryPointV06NotSet();
    if (msg.sender != address(entryPointV06)) revert NotFromEntryPointV06();
    bytes32 anchor = _decodeAnchor(userOp.paymasterAndData, PAYMASTER_V06_HEADER_LENGTH);
    return _validateSponsoredUserOp(anchor, userOp.sender, userOp.callData, maxCost, entryPointV06, entryPoint);
  }

  function postOp(IPaymasterV06.PostOpMode, bytes calldata, uint256) external view {
    if (address(entryPointV06) == address(0)) revert EntryPointV06NotSet();
    if (msg.sender != address(entryPointV06)) revert NotFromEntryPointV06();
  }

  function _validateSponsoredUserOp(
    bytes32 anchor,
    address sender,
    bytes calldata callData,
    uint256 maxCost,
    IEntryPoint depositEntryPoint,
    IEntryPoint otherEntryPoint
  ) private returns (bytes memory context, uint256 validationData) {
    address sponsor = sponsorOf[anchor];
    if (sponsor == address(0)) revert StatementNotEnrolled(anchor);
    if (tankBalance[sponsor] < maxCost) revert InsufficientTankBalance(tankBalance[sponsor], maxCost);

    _validateWalletCap(sponsor, sender, maxCost);
    _validateAccountCall(sponsor, anchor, callData);
    GasTankEntryPointDeposits.ensureDeposit(depositEntryPoint, otherEntryPoint, maxCost);

    // EntryPoint validates every operation before executing any of them. Reserve both budgets now.
    tankBalance[sponsor] -= maxCost;
    _recordWalletUsage(sponsor, sender, maxCost);
    emit TankDebited(sponsor, sender, maxCost);
    return ("", 0);
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

  function _decodeAnchor(
    bytes calldata paymasterAndData,
    uint256 headerLength
  ) private pure returns (bytes32 anchor) {
    if (paymasterAndData.length != headerLength + 32) {
      revert InvalidPaymasterDataLength(paymasterAndData.length);
    }
    anchor = bytes32(paymasterAndData[headerLength:]);
  }

  function _validateWalletCap(address sponsor, address wallet, uint256 requested) private view {
    SponsorshipConfig memory config = sponsorshipConfig;
    if (config.maxSponsoredWeiPerWalletPerWindow == 0 || config.walletWindowSeconds == 0) return;

    WalletUsage memory usage = walletUsage[sponsor][wallet];
    uint256 alreadySponsored = block.timestamp >= usage.windowStartedAt + config.walletWindowSeconds
      ? 0
      : usage.sponsoredWei;
    if (alreadySponsored + requested > config.maxSponsoredWeiPerWalletPerWindow) {
      revert WalletCapExceeded(alreadySponsored, requested, config.maxSponsoredWeiPerWalletPerWindow);
    }
  }

  function _recordWalletUsage(address sponsor, address wallet, uint256 cost) private {
    SponsorshipConfig memory config = sponsorshipConfig;
    if (config.maxSponsoredWeiPerWalletPerWindow == 0 || config.walletWindowSeconds == 0) return;

    WalletUsage storage usage = walletUsage[sponsor][wallet];
    if (block.timestamp >= usage.windowStartedAt + config.walletWindowSeconds) {
      usage.windowStartedAt = uint64(block.timestamp);
      usage.sponsoredWei = uint192(cost);
    } else {
      usage.sponsoredWei += uint192(cost);
    }
  }

  function _validateAccountCall(address sponsor, bytes32 anchor, bytes calldata accountCallData) private view {
    AccountCallDecoder.Execution[] memory executions = AccountCallDecoder.decodeExecutions(accountCallData);
    if (executions.length == 0) revert EmptySponsoredBatch();
    bool sawAnchor = false;
    for (uint256 i = 0; i < executions.length; i++) {
      sawAnchor =
        _validateSponsoredCall(
          sponsor,
          anchor,
          executions[i].target,
          executions[i].value,
          executions[i].callData
        ) || sawAnchor;
    }
    if (!sawAnchor) revert AnchorStatementMissing(anchor);
  }

  /// @return sawAnchor True when this call includes the paymasterData anchor statement.
  function _validateSponsoredCall(
    address sponsor,
    bytes32 anchor,
    address target,
    uint256 value,
    bytes memory innerCallData
  ) private view returns (bool sawAnchor) {
    if (value != 0) revert SponsoredCallValueNotAllowed();
    if (innerCallData.length < 4) revert InvalidSponsoredCallDataLength(innerCallData.length);
    bytes4 selector = bytes4(innerCallData);
    if (target != beliefs) revert UnsupportedSponsoredCall(target, selector);

    if (selector == SET_BELIEF_SELECTOR) {
      (bytes32 statementId, uint8 beliefState) = abi.decode(_stripSelector(innerCallData), (bytes32, uint8));
      _requireSupport(sponsor, statementId, beliefState);
      return statementId == anchor;
    }

    if (selector == SET_BELIEFS_IN_BATCH_SELECTOR) {
      (bytes32[] memory statementIds, uint8[] memory beliefStates) = abi.decode(
        _stripSelector(innerCallData),
        (bytes32[], uint8[])
      );
      if (statementIds.length != beliefStates.length) revert InvalidBatchLengths();
      if (statementIds.length == 0) revert EmptySponsoredBatch();
      for (uint256 i = 0; i < statementIds.length; i++) {
        _requireSupport(sponsor, statementIds[i], beliefStates[i]);
        if (statementIds[i] == anchor) sawAnchor = true;
      }
      return sawAnchor;
    }

    revert UnsupportedSponsoredCall(target, selector);
  }

  function _requireSupport(address sponsor, bytes32 statementId, uint8 beliefState) private view {
    if (beliefState != BELIEVES) revert SponsoredBeliefMustBeSupport(beliefState);
    address statementSponsor = sponsorOf[statementId];
    if (statementSponsor == address(0)) revert StatementNotEnrolled(statementId);
    if (statementSponsor != sponsor) revert StatementSponsorMismatch(statementId, sponsor);
  }

  function _stripSelector(bytes memory callData) private pure returns (bytes memory args) {
    args = new bytes(callData.length - 4);
    for (uint256 i = 0; i < args.length; i++) {
      args[i] = callData[i + 4];
    }
  }
}
