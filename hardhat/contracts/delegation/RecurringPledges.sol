// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IDelegatableNotesForRecurringPledges {
  function createDelegatedNoteFor(
    address rootOwner,
    address token,
    uint256 amount,
    address delegateTo
  ) external returns (uint256);
}

/**
 * @title RecurringPledges
 * @dev Public registry of standing pledge intents plus a permissionless executor.
 */
contract RecurringPledges is ReentrancyGuard {
  enum BackingType { AutoPull }

  struct Pledge {
    address rootOwner;
    address delegateTo;
    address token;
    uint256 amountPerPeriod;
    uint256 period;
    string causeRef;
    BackingType backingType;
    uint256 lastExecuted;
    bool active;
  }

  error ZeroAddress();
  error AmountMustBeGreaterThanZero();
  error PeriodMustBeGreaterThanZero();
  error PledgeDoesNotExist();
  error PledgeInactive();
  error PledgeNotDue();
  error NotPledgeOwner();
  error SelfDelegationNotAllowed();

  event StandingPledgeCreated(
    uint256 indexed pledgeId,
    address indexed rootOwner,
    address indexed delegateTo,
    address token,
    uint256 amountPerPeriod,
    uint256 period,
    string causeRef,
    BackingType backingType
  );

  event StandingPledgeExecuted(
    uint256 indexed pledgeId,
    uint256 indexed noteId,
    uint256 executedAt
  );

  event StandingPledgeCancelled(uint256 indexed pledgeId, address indexed rootOwner);

  IDelegatableNotesForRecurringPledges public immutable delegatableNotes;
  uint256 public nextPledgeId = 1;
  mapping(uint256 => Pledge) public pledges;

  constructor(address delegatableNotesAddress) {
    if (delegatableNotesAddress == address(0)) revert ZeroAddress();
    delegatableNotes = IDelegatableNotesForRecurringPledges(delegatableNotesAddress);
  }

  function createStandingPledge(
    address delegateTo,
    address token,
    uint256 amountPerPeriod,
    uint256 period,
    string calldata causeRef
  ) external nonReentrant returns (uint256 pledgeId, uint256 firstNoteId) {
    address rootOwner = msg.sender;
    if (rootOwner == address(0) || delegateTo == address(0) || token == address(0)) revert ZeroAddress();
    if (rootOwner == delegateTo) revert SelfDelegationNotAllowed();
    if (amountPerPeriod == 0) revert AmountMustBeGreaterThanZero();
    if (period == 0) revert PeriodMustBeGreaterThanZero();

    pledgeId = nextPledgeId++;
    pledges[pledgeId] = Pledge({
      rootOwner: rootOwner,
      delegateTo: delegateTo,
      token: token,
      amountPerPeriod: amountPerPeriod,
      period: period,
      causeRef: causeRef,
      backingType: BackingType.AutoPull,
      lastExecuted: 0,
      active: true
    });

    emit StandingPledgeCreated(
      pledgeId,
      rootOwner,
      delegateTo,
      token,
      amountPerPeriod,
      period,
      causeRef,
      BackingType.AutoPull
    );

    firstNoteId = _execute(pledgeId);
  }

  function cancelStandingPledge(uint256 pledgeId) external {
    Pledge storage pledge = pledges[pledgeId];
    if (pledge.rootOwner == address(0)) revert PledgeDoesNotExist();
    if (pledge.rootOwner != msg.sender) revert NotPledgeOwner();
    if (!pledge.active) revert PledgeInactive();

    pledge.active = false;
    emit StandingPledgeCancelled(pledgeId, pledge.rootOwner);
  }

  function executeDue(uint256 pledgeId) external nonReentrant returns (uint256 noteId) {
    Pledge storage pledge = pledges[pledgeId];
    if (pledge.rootOwner == address(0)) revert PledgeDoesNotExist();
    if (!pledge.active) revert PledgeInactive();
    if (block.timestamp < pledge.lastExecuted + pledge.period) revert PledgeNotDue();

    noteId = _execute(pledgeId);
  }

  function isDue(uint256 pledgeId) external view returns (bool) {
    Pledge storage pledge = pledges[pledgeId];
    return pledge.rootOwner != address(0)
      && pledge.active
      && block.timestamp >= pledge.lastExecuted + pledge.period;
  }

  function isFundable(uint256 pledgeId) external view returns (bool) {
    Pledge storage pledge = pledges[pledgeId];
    if (pledge.rootOwner == address(0) || !pledge.active) return false;
    IERC20 token = IERC20(pledge.token);
    return token.allowance(pledge.rootOwner, address(delegatableNotes)) >= pledge.amountPerPeriod
      && token.balanceOf(pledge.rootOwner) >= pledge.amountPerPeriod;
  }

  function _execute(uint256 pledgeId) private returns (uint256 noteId) {
    Pledge storage pledge = pledges[pledgeId];
    uint256 executedAt = block.timestamp;
    pledge.lastExecuted = executedAt;
    noteId = delegatableNotes.createDelegatedNoteFor(
      pledge.rootOwner,
      pledge.token,
      pledge.amountPerPeriod,
      pledge.delegateTo
    );
    emit StandingPledgeExecuted(pledgeId, noteId, executedAt);
  }
}
