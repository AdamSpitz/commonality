// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {BasePaymaster} from "@account-abstraction/contracts/core/BasePaymaster.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

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
  uint256 private constant ADDRESS_BYTES = 20;
  uint8 private constant BELIEVES = 1;

  bytes4 private constant SIMPLE_ACCOUNT_EXECUTE_SELECTOR =
    bytes4(keccak256("execute(address,uint256,bytes)"));
  bytes4 private constant SIMPLE_ACCOUNT_EXECUTE_BATCH_SELECTOR =
    bytes4(keccak256("executeBatch(address[],uint256[],bytes[])"));
  bytes4 private constant KERNEL_V3_EXECUTE_SELECTOR =
    bytes4(keccak256("execute(bytes32,bytes)"));
  bytes1 private constant ERC7579_CALLTYPE_SINGLE = 0x00;
  bytes1 private constant ERC7579_CALLTYPE_BATCH = 0x01;
  uint256 private constant ERC7579_SINGLE_HEADER_LENGTH = 52;
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

  struct KernelExecution {
    address target;
    uint256 value;
    bytes callData;
  }

  mapping(address sponsor => uint256 balance) public tankBalance;
  mapping(bytes32 statementId => address sponsor) public sponsorOf;
  mapping(address sponsor => mapping(address wallet => WalletUsage usage)) public walletUsage;

  SponsorshipConfig public sponsorshipConfig;
  address public immutable beliefs;

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

  constructor(
    IEntryPoint entryPoint_,
    address beliefs_,
    uint192 maxSponsoredWeiPerWalletPerWindow_,
    uint32 walletWindowSeconds_
  ) BasePaymaster(entryPoint_) {
    if (beliefs_ == address(0)) revert InvalidBeliefs();
    beliefs = beliefs_;
    _setSponsorshipConfig(maxSponsoredWeiPerWalletPerWindow_, walletWindowSeconds_);
  }

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
    bytes32 anchor = _decodeAnchor(userOp.paymasterAndData);
    address sponsor = sponsorOf[anchor];
    if (sponsor == address(0)) revert StatementNotEnrolled(anchor);
    if (tankBalance[sponsor] < maxCost) revert InsufficientTankBalance(tankBalance[sponsor], maxCost);

    _validateWalletCap(sponsor, userOp.sender, maxCost);
    _validateAccountCall(sponsor, anchor, userOp.callData);

    // EntryPoint validates every operation before executing any of them. Reserve both budgets now.
    tankBalance[sponsor] -= maxCost;
    _recordWalletUsage(sponsor, userOp.sender, maxCost);
    emit TankDebited(sponsor, userOp.sender, maxCost);
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

  function _decodeAnchor(bytes calldata paymasterAndData) private pure returns (bytes32 anchor) {
    if (paymasterAndData.length != PAYMASTER_HEADER_LENGTH + 32) {
      revert InvalidPaymasterDataLength(paymasterAndData.length);
    }
    anchor = bytes32(paymasterAndData[PAYMASTER_HEADER_LENGTH:]);
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
    if (accountCallData.length < 4) revert InvalidAccountCallDataLength(accountCallData.length);
    bytes4 accountSelector = bytes4(accountCallData[:4]);
    bool sawAnchor = false;

    if (accountSelector == SIMPLE_ACCOUNT_EXECUTE_SELECTOR) {
      (address target, uint256 value, bytes memory innerCallData) = abi.decode(
        accountCallData[4:],
        (address, uint256, bytes)
      );
      sawAnchor = _validateSponsoredCall(sponsor, anchor, target, value, innerCallData);
    } else if (accountSelector == SIMPLE_ACCOUNT_EXECUTE_BATCH_SELECTOR) {
      (address[] memory targets, uint256[] memory values, bytes[] memory calls) = abi.decode(
        accountCallData[4:],
        (address[], uint256[], bytes[])
      );
      if (targets.length != calls.length || (values.length != 0 && values.length != calls.length)) {
        revert InvalidBatchLengths();
      }
      if (targets.length == 0) revert EmptySponsoredBatch();
      for (uint256 i = 0; i < targets.length; i++) {
        uint256 value = values.length == 0 ? 0 : values[i];
        sawAnchor = _validateSponsoredCall(sponsor, anchor, targets[i], value, calls[i]) || sawAnchor;
      }
    } else if (accountSelector == KERNEL_V3_EXECUTE_SELECTOR) {
      (bytes32 mode, bytes memory executionCalldata) = abi.decode(accountCallData[4:], (bytes32, bytes));
      bytes1 callType = bytes1(mode);

      if (callType == ERC7579_CALLTYPE_SINGLE) {
        (address target, uint256 value, bytes memory innerCallData) = _decodeErc7579SingleExecution(executionCalldata);
        sawAnchor = _validateSponsoredCall(sponsor, anchor, target, value, innerCallData);
      } else if (callType == ERC7579_CALLTYPE_BATCH) {
        KernelExecution[] memory executions = abi.decode(executionCalldata, (KernelExecution[]));
        if (executions.length == 0) revert EmptySponsoredBatch();
        for (uint256 i = 0; i < executions.length; i++) {
          sawAnchor = _validateSponsoredCall(
            sponsor,
            anchor,
            executions[i].target,
            executions[i].value,
            executions[i].callData
          ) || sawAnchor;
        }
      } else {
        revert UnsupportedCallType(callType);
      }
    } else {
      revert UnsupportedAccountCall(accountSelector);
    }

    if (!sawAnchor) revert AnchorStatementMissing(anchor);
  }

  function _decodeErc7579SingleExecution(bytes memory executionCalldata)
    private
    pure
    returns (address target, uint256 value, bytes memory innerCallData)
  {
    if (executionCalldata.length < ERC7579_SINGLE_HEADER_LENGTH) {
      revert InvalidExecutionCalldataLength(executionCalldata.length);
    }
    uint256 innerLength = executionCalldata.length - ERC7579_SINGLE_HEADER_LENGTH;
    innerCallData = new bytes(innerLength);
    assembly {
      let dataPtr := add(executionCalldata, 32)
      target := shr(96, mload(dataPtr))
      value := mload(add(dataPtr, ADDRESS_BYTES))
      let src := add(dataPtr, ERC7579_SINGLE_HEADER_LENGTH)
      let dst := add(innerCallData, 32)
      for { let i := 0 } lt(i, innerLength) { i := add(i, 32) } {
        mstore(add(dst, i), mload(add(src, i)))
      }
    }
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
