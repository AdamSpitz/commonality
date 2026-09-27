// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IDelegatableNotesForRecurringPledges {
  function createDelegatedNoteFor(
    address rootOwner,
    address token,
    uint256 amount,
    address delegateTo,
    uint256 spendDelay,
    uint256 unsuspiciousDelay,
    bool strictMode,
    address[] calldata flaggers,
    bytes32[] calldata fineIds
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
    uint256 spendDelay;
    uint256 unsuspiciousDelay;
    bool strictMode;
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
    BackingType backingType,
    uint256 spendDelay,
    bool strictMode
  );

  event PledgeSpendPolicyUpdated(
    uint256 indexed pledgeId,
    uint256 spendDelay,
    bool strictMode
  );

  event PledgeUnsuspiciousDelaySet(uint256 indexed pledgeId, uint256 unsuspiciousDelay);
  event PledgeFineListSet(uint256 indexed pledgeId, bytes32 indexed beneficiaryId, bool allowed);

  event StandingPledgeExecuted(
    uint256 indexed pledgeId,
    uint256 indexed noteId,
    uint256 executedAt
  );

  event StandingPledgeCancelled(uint256 indexed pledgeId, address indexed rootOwner);

  IDelegatableNotesForRecurringPledges public immutable delegatableNotes;
  uint256 public nextPledgeId = 1;
  mapping(uint256 => Pledge) public pledges;
  mapping(uint256 => address[]) private pledgeFlaggerList;
  mapping(uint256 => bytes32[]) private pledgeFineIds;
  mapping(uint256 => mapping(bytes32 => bool)) public pledgeFineListed;

  constructor(address delegatableNotesAddress) {
    if (delegatableNotesAddress == address(0)) revert ZeroAddress();
    delegatableNotes = IDelegatableNotesForRecurringPledges(delegatableNotesAddress);
  }

  function createStandingPledge(
    address delegateTo,
    address token,
    uint256 amountPerPeriod,
    uint256 period,
    string calldata causeRef,
    uint256 spendDelay,
    uint256 unsuspiciousDelay,
    bool strictMode,
    address[] calldata flaggers,
    bytes32[] calldata fineIds
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
      active: true,
      spendDelay: spendDelay,
      unsuspiciousDelay: 0,
      strictMode: strictMode
    });
    _setUnsuspiciousDelay(pledgeId, pledges[pledgeId], unsuspiciousDelay);
    for (uint256 i = 0; i < fineIds.length; i++) {
      _setFineListed(pledgeId, fineIds[i], true);
    }
    for (uint256 i = 0; i < flaggers.length; i++) {
      if (flaggers[i] != address(0) && flaggers[i] != delegateTo) {
        pledgeFlaggerList[pledgeId].push(flaggers[i]);
      }
    }

    emit StandingPledgeCreated(
      pledgeId,
      rootOwner,
      delegateTo,
      token,
      amountPerPeriod,
      period,
      causeRef,
      BackingType.AutoPull,
      spendDelay,
      strictMode
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

  function updateSpendPolicy(
    uint256 pledgeId,
    uint256 spendDelay,
    bool strictMode,
    address[] calldata flaggers
  ) external {
    Pledge storage pledge = pledges[pledgeId];
    if (pledge.rootOwner == address(0)) revert PledgeDoesNotExist();
    if (pledge.rootOwner != msg.sender) revert NotPledgeOwner();
    if (!pledge.active) revert PledgeInactive();
    pledge.spendDelay = spendDelay;
    pledge.strictMode = strictMode;
    delete pledgeFlaggerList[pledgeId];
    for (uint256 i = 0; i < flaggers.length; i++) {
      if (flaggers[i] != address(0) && flaggers[i] != pledge.delegateTo) {
        pledgeFlaggerList[pledgeId].push(flaggers[i]);
      }
    }
    emit PledgeSpendPolicyUpdated(pledgeId, spendDelay, strictMode);
    if (pledge.unsuspiciousDelay > spendDelay) {
      _setUnsuspiciousDelay(pledgeId, pledge, spendDelay);
    }
  }

  function setPledgeUnsuspiciousDelay(uint256 pledgeId, uint256 unsuspiciousDelay) external {
    Pledge storage pledge = pledges[pledgeId];
    if (pledge.rootOwner == address(0)) revert PledgeDoesNotExist();
    if (pledge.rootOwner != msg.sender) revert NotPledgeOwner();
    if (!pledge.active) revert PledgeInactive();
    _setUnsuspiciousDelay(pledgeId, pledge, unsuspiciousDelay);
  }

  function _setUnsuspiciousDelay(uint256 pledgeId, Pledge storage pledge, uint256 unsuspiciousDelay) private {
    if (unsuspiciousDelay > pledge.spendDelay) revert UnsuspiciousDelayExceedsStanding();
    pledge.unsuspiciousDelay = unsuspiciousDelay;
    emit PledgeUnsuspiciousDelaySet(pledgeId, unsuspiciousDelay);
  }

  function setPledgeFineListed(uint256 pledgeId, bytes32 beneficiaryId, bool allowed) external {
    Pledge storage pledge = pledges[pledgeId];
    if (pledge.rootOwner == address(0)) revert PledgeDoesNotExist();
    if (pledge.rootOwner != msg.sender) revert NotPledgeOwner();
    if (!pledge.active) revert PledgeInactive();
    _setFineListed(pledgeId, beneficiaryId, allowed);
  }

  function _setFineListed(uint256 pledgeId, bytes32 beneficiaryId, bool allowed) private {
    if (beneficiaryId == bytes32(0)) revert ZeroAddress();
    if (allowed == pledgeFineListed[pledgeId][beneficiaryId]) {
      emit PledgeFineListSet(pledgeId, beneficiaryId, allowed);
      return;
    }
    if (allowed) {
      pledgeFineListed[pledgeId][beneficiaryId] = true;
      pledgeFineIds[pledgeId].push(beneficiaryId);
    } else {
      pledgeFineListed[pledgeId][beneficiaryId] = false;
      bytes32[] storage ids = pledgeFineIds[pledgeId];
      for (uint256 i = 0; i < ids.length; i++) {
        if (ids[i] == beneficiaryId) {
          ids[i] = ids[ids.length - 1];
          ids.pop();
          break;
        }
      }
    }
    emit PledgeFineListSet(pledgeId, beneficiaryId, allowed);
  }

  error UnsuspiciousDelayExceedsStanding();

  function pledgeFlaggers(uint256 pledgeId) external view returns (address[] memory) {
    return pledgeFlaggerList[pledgeId];
  }

  function pledgeFineList(uint256 pledgeId) external view returns (bytes32[] memory) {
    return pledgeFineIds[pledgeId];
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
      pledge.delegateTo,
      pledge.spendDelay,
      pledge.unsuspiciousDelay,
      pledge.strictMode,
      pledgeFlaggerList[pledgeId],
      pledgeFineIds[pledgeId]
    );
    emit StandingPledgeExecuted(pledgeId, noteId, executedAt);
  }
}
