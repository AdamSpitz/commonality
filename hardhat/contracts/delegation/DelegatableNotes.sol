// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IFundingMarket, IRefundableFundingMarket} from "./IFundingMarket.sol";
import {AssuranceReimbursement} from "./AssuranceReimbursement.sol";

interface IPrimaryMarketFactory {
  function isDeployedPrimaryMarket(address primaryMarket) external view returns (bool);
}

/**
 * @title DelegatableNotes
 * @dev Allows users to deposit tokens and delegate spending authority to others.
 *
 * Design: Notes track their delegation chain via a hash commitment.
 * chainHash = hash(owner, parentChainHash) recursively, with root = hash(owner, 0)
 *
 * This allows delegation chains without storing explicit link nodes. Operations
 * that need to verify chains (like revocation) pass the full owner array and the
 * contract verifies it hashes correctly.
 *
 * Token assumptions: For ERC-20 token operations (deposits, purchases), the token must be
 * a standard ERC-20 with:
 * - No transfer fees or callbacks
 * - No rebasing behavior
 * - Standard transfer/transferFrom/approve interface
 *
 * This contract uses SafeERC20 for all token transfers to handle non-standard
 * tokens that may not return boolean success values.
 */
contract DelegatableNotes is Context, Ownable, ReentrancyGuard, ERC1155Holder {
  using SafeERC20 for IERC20;

  error EmptyChain();
  error ChainTooLong();
  error MustSendETH();
  error ETHMustUseERC20Type();
  error AmountMustBeGreaterThanZero();
  error NoETHForERC20();
  error NoETHForERC1155();
  error NoteDoesNotExist();
  error NotRootNoteOrNotOwner();
  error ETHTransferFailed();
  error InvalidChain();
  error NotNoteOwner();
  error InvalidDelegationAmount();
  error CannotDelegateToZeroAddress();
  error CircularDelegationDetected();
  error CallerNotInChain();
  error ArrayLengthMismatch();
  error InsufficientBalance();
  error ZeroAddress();
  error UnauthorizedMarket();
  error InvalidPaymentTokenForPurchase();
  error InvalidPaymentAmount();
  error InvalidPurchaseShares();
  error NoteIsNotReceiptToken();
  error UnauthorizedRecurringPledgeRegistry();
  error RecurringPledgeRegistryAlreadySet();
  error NoteHasNoReimbursementClaim();
  error NoReimbursementAvailable();
  error WrongPrimaryMarket();
  error DelegationHopLimit();
  error ReplaceRequiresOneDelegate();
  error NotNoteRoot();
  error SpendMustBeScheduled();
  error ScheduledSpendMustUseWholeNote(uint256 cost, uint256 noteAmount);
  error SpendAlreadyScheduled();
  error NoScheduledSpend();
  error SpendNotDue();
  error SpendPaused();
  error NotSpendFlagger();
  error FlaggerCannotBeDelegate();
  error FlaggerCannotBeMarket();
  error SplitAmountMustBePartial();

  enum TokenType { ERC20, ERC1155 }

  struct Note {
    bytes32 chainHash;     // Commitment to delegation chain: hash(owner, parentChainHash)
    uint256 amount;
    address token;
    TokenType tokenType;
    uint256 tokenId;
  }

  struct PurchaseShare {
    uint256 noteId;
    address[] chain;
    uint256 shares;
  }

  struct ReimbursementClaim {
    address primaryMarket;
    uint256 contribution;
    uint256 withdrawn;
  }

  struct SpendPolicy {
    uint256 delay;
    bool strictMode;
  }

  struct PendingSpend {
    address primaryMarket;
    address erc1155Contract;
    uint256 tokenId;
    uint256 count;
    uint256 deadline;
    uint256 nonce;
    bool paused;
    bool exists;
  }

  // Depth limit to prevent gas exhaustion from extremely long chains
  uint256 public constant MAX_DELEGATION_DEPTH = 200;

  uint256 public nextNoteId = 1;
  uint256 public nextScheduleNonce = 1;
  mapping(uint256 => Note) public notes;
  mapping(uint256 => ReimbursementClaim) public reimbursementClaims;
  mapping(uint256 => SpendPolicy) public spendPolicies;
  mapping(uint256 => PendingSpend) public pendingSpends;
  mapping(uint256 => mapping(address => bool)) public isSpendFlagger;
  mapping(uint256 => address[]) private spendFlaggerList;
  bool private scheduledExecution;
  mapping(address => bool) public authorizedPrimaryMarketFactories;
  mapping(address => bool) private knownPrimaryMarketFactories;
  address public recurringPledgeRegistry;
  address[] public primaryMarketFactories;

  constructor(
    address _primaryMarketFactory
  ) Ownable(msg.sender) {
    _setPrimaryMarketFactoryAuthorization(_primaryMarketFactory, true);
  }

  /**
   * @notice Emitted when a new note is created via deposit
   * @param noteId The ID of the created note
   * @param owner The address that deposited and owns the note
   * @param amount The amount of tokens deposited
   * @param token The token contract address (address(0) for ETH)
   * @param tokenType Whether the token is ERC20 or ERC1155
   * @param tokenId The ERC1155 token ID (0 for ERC20/ETH)
   */
  event NoteCreated(
    uint256 indexed noteId,
    address indexed owner,
    uint256 amount,
    address token,
    TokenType tokenType,
    uint256 tokenId
  );

  /**
   * @notice Emitted when a note is delegated to another address
   * @param parentNoteId The note being delegated from
   * @param childNoteId The new note created for the delegate (same as parent for full delegation)
   * @param delegate The address receiving the delegation
   * @param amount The amount delegated
   */
  event NoteDelegated(
    uint256 indexed parentNoteId,
    uint256 indexed childNoteId,
    address indexed delegate,
    uint256 amount
  );

  event RecurringPledgeRegistrySet(address indexed registry);

  /**
   * @notice Emitted when a delegation is revoked
   * @param noteId The note whose delegation was revoked
   * @param revoker The address that revoked the delegation
   */
  event NoteRevoked(uint256 indexed noteId, address indexed revoker);

  /**
   * @notice The root replaced the current delegate with a new note.
   * @dev The original note keeps its chain. A full replacement retires it.
   *      A partial replacement leaves the remainder on it. `toNoteId` is a new
   *      note whose chain is exactly [root, newDelegate].
   */
  event NoteDelegateReplaced(
    uint256 indexed fromNoteId,
    uint256 indexed toNoteId,
    address indexed newDelegate,
    uint256 amount
  );

  /**
   * @notice Emitted when the root owner reclaims funds from a note
   * @param noteId The note being reclaimed
   * @param owner The address receiving the reclaimed funds
   * @param amount The amount reclaimed
   * @param token The token contract address
   * @param tokenType Whether the token is ERC20 or ERC1155
   * @param tokenId The ERC1155 token ID (0 for ERC20/ETH)
   */
  event FundsReclaimed(
    uint256 indexed noteId,
    address indexed owner,
    uint256 amount,
    address token,
    TokenType tokenType,
    uint256 tokenId
  );

  /**
   * @notice Emitted when a note is split during partial delegation
   * @param originalLeafId The original note ID (becomes the remainder)
   * @param splitLeafId The new note created for the delegated portion
   * @param remainderLeafId The note retaining the undelegated remainder
   * @param splitAmount The amount split off for delegation
   */
  event ChainSplit(
    uint256 indexed originalLeafId,
    uint256 indexed splitLeafId,
    uint256 indexed remainderLeafId,
    uint256 splitAmount
  );

  event SpendDelaySet(uint256 indexed noteId, uint256 delay);
  event StrictModeSet(uint256 indexed noteId, bool enabled);
  event SpendFlaggerSet(uint256 indexed noteId, address indexed flagger, bool allowed);
  event NoteSplitSameChain(uint256 indexed fromNoteId, uint256 indexed newNoteId, uint256 amount);
  event SpendScheduled(
    uint256 indexed noteId,
    uint256 indexed nonce,
    address indexed delegate,
    address primaryMarket,
    address erc1155Contract,
    uint256 tokenId,
    uint256 count,
    uint256 amount,
    uint256 deadline
  );
  event SpendFlagged(uint256 indexed noteId, uint256 indexed nonce, address indexed flagger, bool paused);
  event SpendCancelled(uint256 indexed noteId, uint256 indexed nonce, address indexed caller);
  event SpendScheduleCleared(uint256 indexed noteId, uint256 indexed nonce);
  event SpendExecuted(uint256 indexed noteId, uint256 indexed nonce, address indexed caller, bool early);

  /**
   * @notice Emitted when a note's balance is consumed (spent) during a purchase
   * @param noteId The note being consumed
   * @param amountConsumed The amount spent from the note
   * @param remainingAmount The amount remaining in the note after consumption
   * @param deleted Whether the note was fully consumed and deleted
   */
  event NoteConsumed(
    uint256 indexed noteId,
    uint256 amountConsumed,
    uint256 remainingAmount,
    bool deleted
  );

  /**
   * @notice Emitted when ERC1155 tokens are purchased using notes
   * @param buyer The address that initiated the purchase
   * @param erc1155Contract The ERC1155 token contract
   * @param tokenIds The token IDs purchased
   * @param counts The amounts of each token purchased
   * @param totalCost The total amount spent in the payment token
   * @param inputNoteIds The notes used for payment
   * @param outputNoteIds The new notes created holding the purchased tokens
   */
  event ERC1155Purchased(
    address indexed buyer,
    address indexed erc1155Contract,
    uint256[] tokenIds,
    uint256[] counts,
    uint256 totalCost,
    uint256[] inputNoteIds,
    uint256[] outputNoteIds
  );

  /**
   * @notice Emitted when an ERC1155 receipt note is refunded from a failed assurance
   *         contract back into a settlement-token note — the inverse of a purchase.
   * @param caller The address that initiated the refund (the note's current leaf owner)
   * @param primaryMarket The assurance contract the receipts were returned to
   * @param erc1155Contract The ERC1155 receipt collection
   * @param tokenId The receipt token ID refunded
   * @param refundValue The amount of settlement token received and placed in the new note
   * @param paymentToken The settlement token of the new note
   * @param inputNoteId The receipt note that was consumed
   * @param outputNoteId The new settlement-token note (inherits the input note's chain)
   */
  event RefundedIntoNote(
    address indexed caller,
    address indexed primaryMarket,
    address erc1155Contract,
    uint256 tokenId,
    uint256 refundValue,
    address paymentToken,
    uint256 inputNoteId,
    uint256 outputNoteId
  );

  event ReimbursementClaimedIntoNote(
    address indexed caller,
    address indexed primaryMarket,
    uint256 indexed receiptNoteId,
    uint256 amount,
    uint256 reimbursementNoteId
  );

  event PrimaryMarketFactoryAuthorizationSet(address indexed primaryMarketFactory, bool authorized);

  // ============ Primary Market Authorization ============

  /**
   * @notice Authorize or deauthorize a factory whose deployed contracts conform to IFundingMarket.
   * @dev DelegatableNotes supports exactly one purchase shape: primary markets implementing
   *      IFundingMarket. New products plug in by deploying conforming primary markets through
   *      an authorized factory. A genuinely new exchange mechanism should use a v2 contract or a new
   *      purchase adapter.
   */
  function setPrimaryMarketFactoryAuthorization(address primaryMarketFactory, bool authorized) external onlyOwner {
    _setPrimaryMarketFactoryAuthorization(primaryMarketFactory, authorized);
  }

  function primaryMarketFactoryCount() external view returns (uint256) {
    return primaryMarketFactories.length;
  }

  function isAuthorizedPrimaryMarket(address primaryMarket) public view returns (bool) {
    if (primaryMarket == address(0)) return false;
    for (uint256 i = 0; i < primaryMarketFactories.length; i++) {
      address factory = primaryMarketFactories[i];
      if (authorizedPrimaryMarketFactories[factory]
        && IPrimaryMarketFactory(factory).isDeployedPrimaryMarket(primaryMarket)) {
        return true;
      }
    }
    return false;
  }

  function _setPrimaryMarketFactoryAuthorization(address primaryMarketFactory, bool authorized) private {
    if (primaryMarketFactory == address(0)) revert ZeroAddress();
    if (authorizedPrimaryMarketFactories[primaryMarketFactory] == authorized) return;
    authorizedPrimaryMarketFactories[primaryMarketFactory] = authorized;
    if (!knownPrimaryMarketFactories[primaryMarketFactory]) {
      knownPrimaryMarketFactories[primaryMarketFactory] = true;
      primaryMarketFactories.push(primaryMarketFactory);
    }
    emit PrimaryMarketFactoryAuthorizationSet(primaryMarketFactory, authorized);
  }

  // ============ Hash Helpers ============

  function _computeChainHash(address owner, bytes32 parentChainHash) private pure returns (bytes32) {
    return keccak256(abi.encodePacked(owner, parentChainHash));
  }

  function _verifyAndComputeChainHash(address[] memory owners) private pure returns (bytes32) {
    if (owners.length == 0) revert EmptyChain();
    if (owners.length > MAX_DELEGATION_DEPTH) revert ChainTooLong();

    // Build hash from root to leaf (owners[length-1] is root, owners[0] is leaf)
    bytes32 hash = bytes32(0);
    for (uint256 i = owners.length; i > 0; i--) {
      hash = _computeChainHash(owners[i - 1], hash);
    }
    return hash;
  }

  // ============ Deposit Functions ============

  function setRecurringPledgeRegistry(address registry) external onlyOwner {
    if (recurringPledgeRegistry != address(0)) revert RecurringPledgeRegistryAlreadySet();
    if (registry == address(0)) revert ZeroAddress();
    recurringPledgeRegistry = registry;
    emit RecurringPledgeRegistrySet(registry);
  }

  function createDelegatedNoteFor(
    address rootOwner,
    address token,
    uint256 amount,
    address delegateTo,
    uint256 spendDelay,
    bool strictMode,
    address[] calldata flaggers
  ) external nonReentrant returns (uint256) {
    if (_msgSender() != recurringPledgeRegistry) revert UnauthorizedRecurringPledgeRegistry();
    if (rootOwner == address(0) || token == address(0) || delegateTo == address(0)) revert ZeroAddress();
    if (amount == 0) revert AmountMustBeGreaterThanZero();
    if (rootOwner == delegateTo) revert CircularDelegationDetected();

    uint256 noteId = nextNoteId++;
    bytes32 rootChainHash = _computeChainHash(rootOwner, bytes32(0));
    bytes32 delegatedChainHash = _computeChainHash(delegateTo, rootChainHash);

    notes[noteId] = Note({
      chainHash: delegatedChainHash,
      amount: amount,
      token: token,
      tokenType: TokenType.ERC20,
      tokenId: 0
    });
    _writePolicy(noteId, spendDelay, strictMode, flaggers, delegateTo);

    emit NoteCreated(noteId, rootOwner, amount, token, TokenType.ERC20, 0);
    emit NoteDelegated(noteId, noteId, delegateTo, amount);

    // Slither: rootOwner is only supplied by the trusted RecurringPledges registry,
    // which stores rootOwner as the pledge creator; arbitrary callers cannot pull funds.
    // slither-disable-next-line arbitrary-send-erc20
    // slither-disable-next-line arbitrary-send-erc20
    IERC20(token).safeTransferFrom(rootOwner, address(this), amount);

    return noteId;
  }

  /**
   * @notice Deposit tokens to create a new note owned by the caller
   * @dev For ETH deposits, send ETH with the call and set token to address(0).
   *      For ERC20, approve this contract first. For ERC1155, set approval for all.
   * @param token The token contract address (address(0) for ETH)
   * @param tokenType ERC20 or ERC1155
   * @param tokenId The ERC1155 token ID (ignored for ERC20/ETH)
   * @param amount The amount to deposit (ignored for ETH, uses msg.value instead)
   * @return The ID of the created note
   */
  function deposit(
    address token,
    TokenType tokenType,
    uint256 tokenId,
    uint256 amount
  ) public payable nonReentrant returns (uint256) {
    address owner = _msgSender();
    uint256 actualAmount;

    if (token == address(0)) {
      if (msg.value == 0) revert MustSendETH();
      if (tokenType != TokenType.ERC20) revert ETHMustUseERC20Type();
      actualAmount = msg.value;
      tokenId = 0;
    } else if (tokenType == TokenType.ERC20) {
      if (amount == 0) revert AmountMustBeGreaterThanZero();
      if (msg.value != 0) revert NoETHForERC20();
      actualAmount = amount;
      tokenId = 0;
    } else {
      if (amount == 0) revert AmountMustBeGreaterThanZero();
      if (msg.value != 0) revert NoETHForERC1155();
      actualAmount = amount;
    }

    uint256 noteId = nextNoteId++;
    bytes32 chainHash = _computeChainHash(owner, bytes32(0));

    notes[noteId] = Note({
      chainHash: chainHash,
      amount: actualAmount,
      token: token,
      tokenType: tokenType,
      tokenId: tokenId
    });

    emit NoteCreated(noteId, owner, actualAmount, token, tokenType, tokenId);

    if (token != address(0)) {
      if (tokenType == TokenType.ERC20) {
        IERC20(token).safeTransferFrom(owner, address(this), amount);
      } else {
        IERC1155(token).safeTransferFrom(owner, address(this), tokenId, amount, "");
      }
    }

    return noteId;
  }

  // ============ Reclaim Functions ============

  /**
   * @dev Reclaim funds from a note. Caller must be the root (depositor).
   * Only root notes (non-delegated) can be reclaimed.
   * @param noteId The note to reclaim
   */
  // slither-disable-next-line arbitrary-send-eth
  function reclaimFunds(uint256 noteId) external nonReentrant {
    Note storage note = notes[noteId];
    if (note.chainHash == bytes32(0)) revert NoteDoesNotExist();

    address caller = _msgSender();
    if (caller == address(0)) revert ZeroAddress();
    bytes32 expectedHash = _computeChainHash(caller, bytes32(0));
    if (note.chainHash != expectedHash) revert NotRootNoteOrNotOwner();

    address token = note.token;
    uint256 amount = note.amount;
    TokenType tokenType = note.tokenType;
    uint256 tokenId = note.tokenId;

    delete notes[noteId];

    if (tokenType == TokenType.ERC20) {
      if (token == address(0)) {
        // slither-disable-next-line low-level-calls
        (bool success, ) = payable(caller).call{value: amount}("");
        if (!success) revert ETHTransferFailed();
      } else {
        IERC20(token).safeTransfer(caller, amount);
      }
    } else {
      IERC1155(token).safeTransferFrom(address(this), caller, tokenId, amount, "");
    }

    emit FundsReclaimed(noteId, caller, amount, token, tokenType, tokenId);
  }


  // ============ Delegation Functions ============

  /**
   * @dev Delegate a note (full or partial amount).
   * @param noteId The note to delegate from
   * @param owners The current delegation chain (leaf first, root last)
   * @param delegateTo The address to delegate to
   * @param amountToDelegate The amount to delegate
   */
  function delegate(
    uint256 noteId,
    address[] calldata owners,
    address delegateTo,
    uint256 amountToDelegate
  ) public nonReentrant returns (uint256 delegatedNoteId, uint256 remainderNoteId) {
    Note storage note = notes[noteId];
    if (note.chainHash == bytes32(0)) revert NoteDoesNotExist();

    bytes32 expectedHash = _verifyAndComputeChainHash(owners);
    if (note.chainHash != expectedHash) revert InvalidChain();
    if (owners[0] != _msgSender()) revert NotNoteOwner();
    if (amountToDelegate == 0 || amountToDelegate > note.amount) revert InvalidDelegationAmount();
    if (delegateTo == address(0)) revert CannotDelegateToZeroAddress();
    // The leaf of an undelegated note is the root. A second hop is rejected.
    if (owners.length != 1) revert DelegationHopLimit();

    for (uint256 i = 0; i < owners.length; i++) {
      if (owners[i] == delegateTo) revert CircularDelegationDetected();
    }

    bytes32 newChainHash = _computeChainHash(delegateTo, note.chainHash);

    if (amountToDelegate == note.amount) {
      // Full delegation - just update the chain hash
      note.chainHash = newChainHash;
      emit NoteDelegated(noteId, noteId, delegateTo, amountToDelegate);
      return (noteId, 0);
    } else {
      // Partial delegation - split into two notes
      uint256 remainderAmount = note.amount - amountToDelegate;

      // Create new note for delegated portion
      delegatedNoteId = nextNoteId++;
      notes[delegatedNoteId] = Note({
        chainHash: newChainHash,
        amount: amountToDelegate,
        token: note.token,
        tokenType: note.tokenType,
        tokenId: note.tokenId
      });

      _moveClaimPortion(noteId, delegatedNoteId, amountToDelegate);

      // Update original note with remainder (keep same chain)
      note.amount = remainderAmount;

      emit ChainSplit(noteId, delegatedNoteId, noteId, amountToDelegate);
      emit NoteDelegated(noteId, delegatedNoteId, delegateTo, amountToDelegate);

      return (delegatedNoteId, noteId);
    }
  }

  /**
   * @notice Root replaces the single delegate on this note, in whole or in part.
   * @dev Mints a new note with chain [root, newDelegate]. Does not rewrite the
   *      chain on `noteId`. A full replacement deletes `noteId`. A partial
   *      replacement leaves the remainder delegated to the current leaf.
   *      `owners` must be the current chain, leaf first, and exactly length 2.
   * @return replacedNoteId The new note controlled by `newDelegate`
   * @return remainderNoteId `noteId` when some amount stays, otherwise 0
   */
  function replaceDelegate(
    uint256 noteId,
    address[] calldata owners,
    address newDelegate,
    uint256 amount
  ) external nonReentrant returns (uint256 replacedNoteId, uint256 remainderNoteId) {
    return _replaceDelegate(noteId, owners, newDelegate, amount, spendPolicies[noteId].delay);
  }

  /// @notice Replacement that also sets the new note's delay in the same action.
  function replaceDelegateWithDelay(
    uint256 noteId,
    address[] calldata owners,
    address newDelegate,
    uint256 amount,
    uint256 newDelay
  ) external nonReentrant returns (uint256 replacedNoteId, uint256 remainderNoteId) {
    return _replaceDelegate(noteId, owners, newDelegate, amount, newDelay);
  }

  function _replaceDelegate(
    uint256 noteId,
    address[] calldata owners,
    address newDelegate,
    uint256 amount,
    uint256 newDelay
  ) private returns (uint256 replacedNoteId, uint256 remainderNoteId) {
    Note storage note = notes[noteId];
    if (note.chainHash == bytes32(0)) revert NoteDoesNotExist();

    bytes32 expectedHash = _verifyAndComputeChainHash(owners);
    if (note.chainHash != expectedHash) revert InvalidChain();
    if (owners.length != 2) revert ReplaceRequiresOneDelegate();
    if (owners[owners.length - 1] != _msgSender()) revert NotNoteRoot();
    if (amount == 0 || amount > note.amount) revert InvalidDelegationAmount();
    if (newDelegate == address(0)) revert CannotDelegateToZeroAddress();
    if (newDelegate == owners[0] || newDelegate == owners[1]) revert CircularDelegationDetected();

    address root = owners[1];
    address token = note.token;
    TokenType tokenType = note.tokenType;
    uint256 tokenId = note.tokenId;
    bool strictMode = spendPolicies[noteId].strictMode;
    _clearPending(noteId);
    bytes32 newChainHash = _computeChainHash(newDelegate, _computeChainHash(root, bytes32(0)));

    replacedNoteId = nextNoteId++;
    notes[replacedNoteId] = Note({
      chainHash: newChainHash,
      amount: amount,
      token: token,
      tokenType: tokenType,
      tokenId: tokenId
    });
    _moveClaimPortion(noteId, replacedNoteId, amount);
    address[] memory flaggers = spendFlaggerList[noteId];
    _writePolicy(replacedNoteId, newDelay, strictMode, flaggers, newDelegate);

    if (amount == note.amount) {
      delete notes[noteId];
      delete reimbursementClaims[noteId];
      _deleteSpendPolicy(noteId);
      remainderNoteId = 0;
    } else {
      note.amount -= amount;
      remainderNoteId = noteId;
    }

    emit NoteCreated(replacedNoteId, root, amount, token, tokenType, tokenId);
    emit NoteDelegateReplaced(noteId, replacedNoteId, newDelegate, amount);
  }

  function _moveClaimPortion(uint256 fromNoteId, uint256 toNoteId, uint256 amount) private {
    ReimbursementClaim storage originalClaim = reimbursementClaims[fromNoteId];
    if (originalClaim.primaryMarket == address(0)) return;
    uint256 noteAmount = notes[fromNoteId].amount;
    uint256 movedContribution = originalClaim.contribution * amount / noteAmount;
    uint256 movedWithdrawn = originalClaim.withdrawn * amount / noteAmount;
    reimbursementClaims[toNoteId] = ReimbursementClaim({
      primaryMarket: originalClaim.primaryMarket,
      contribution: movedContribution,
      withdrawn: movedWithdrawn
    });
    originalClaim.contribution -= movedContribution;
    originalClaim.withdrawn -= movedWithdrawn;
  }


  // ============ Waiting period ============

  function delegateWithDelay(
    uint256 noteId,
    address[] calldata owners,
    address delegateTo,
    uint256 amountToDelegate,
    uint256 delay
  ) external returns (uint256 delegatedNoteId, uint256 remainderNoteId) {
    (delegatedNoteId, remainderNoteId) = delegate(noteId, owners, delegateTo, amountToDelegate);
    spendPolicies[delegatedNoteId].delay = delay;
    emit SpendDelaySet(delegatedNoteId, delay);
  }

  function setSpendDelay(uint256 noteId, address[] calldata owners, uint256 delay) external {
    _requireRoot(noteId, owners);
    spendPolicies[noteId].delay = delay;
    emit SpendDelaySet(noteId, delay);
  }

  function setStrictMode(uint256 noteId, address[] calldata owners, bool enabled) external {
    _requireRoot(noteId, owners);
    spendPolicies[noteId].strictMode = enabled;
    emit StrictModeSet(noteId, enabled);
  }

  function setSpendFlagger(
    uint256 noteId,
    address[] calldata owners,
    address flagger,
    bool allowed
  ) external {
    _requireRoot(noteId, owners);
    if (flagger == address(0)) revert ZeroAddress();
    if (owners.length > 1 && flagger == owners[0]) revert FlaggerCannotBeDelegate();
    if (allowed == isSpendFlagger[noteId][flagger]) {
      emit SpendFlaggerSet(noteId, flagger, allowed);
      return;
    }
    if (allowed) {
      isSpendFlagger[noteId][flagger] = true;
      spendFlaggerList[noteId].push(flagger);
    } else {
      isSpendFlagger[noteId][flagger] = false;
      address[] storage list = spendFlaggerList[noteId];
      for (uint256 i = 0; i < list.length; i++) {
        if (list[i] == flagger) {
          list[i] = list[list.length - 1];
          list.pop();
          break;
        }
      }
    }
    emit SpendFlaggerSet(noteId, flagger, allowed);
  }

  function spendFlaggers(uint256 noteId) external view returns (address[] memory) {
    return spendFlaggerList[noteId];
  }

  function splitNote(
    uint256 noteId,
    address[] calldata owners,
    uint256 amount
  ) external nonReentrant returns (uint256 newNoteId) {
    Note storage note = _requireDelegatedLeaf(noteId, owners);
    if (pendingSpends[noteId].exists) revert SpendAlreadyScheduled();
    if (amount == 0 || amount >= note.amount) revert SplitAmountMustBePartial();

    newNoteId = nextNoteId++;
    notes[newNoteId] = Note({
      chainHash: note.chainHash,
      amount: amount,
      token: note.token,
      tokenType: note.tokenType,
      tokenId: note.tokenId
    });
    address[] memory flaggers = spendFlaggerList[noteId];
    _writePolicy(newNoteId, spendPolicies[noteId].delay, spendPolicies[noteId].strictMode, flaggers, owners[0]);
    _moveClaimPortion(noteId, newNoteId, amount);
    note.amount -= amount;
    emit NoteSplitSameChain(noteId, newNoteId, amount);
  }

  function scheduleSpend(
    uint256 noteId,
    address[] calldata owners,
    address primaryMarket,
    address erc1155Contract,
    uint256 tokenId,
    uint256 count
  ) external nonReentrant {
    Note storage note = _requireDelegatedLeaf(noteId, owners);
    if (pendingSpends[noteId].exists) revert SpendAlreadyScheduled();
    if (count == 0) revert AmountMustBeGreaterThanZero();

    _requireScheduledSpendUsesWholeNote(
      primaryMarket,
      erc1155Contract,
      tokenId,
      count,
      note.amount
    );

    if (spendPolicies[noteId].delay == 0) {
      PurchaseShare[] memory shares = new PurchaseShare[](1);
      shares[0] = PurchaseShare({ noteId: noteId, chain: owners, shares: count });
      _purchaseFromPrimaryMarket(shares, primaryMarket, erc1155Contract, tokenId, count);
      return;
    }

    uint256 nonce = nextScheduleNonce++;
    uint256 deadline = block.timestamp + spendPolicies[noteId].delay;
    pendingSpends[noteId] = PendingSpend({
      primaryMarket: primaryMarket,
      erc1155Contract: erc1155Contract,
      tokenId: tokenId,
      count: count,
      deadline: deadline,
      nonce: nonce,
      paused: false,
      exists: true
    });
    emit SpendScheduled(
      noteId,
      nonce,
      owners[0],
      primaryMarket,
      erc1155Contract,
      tokenId,
      count,
      note.amount,
      deadline
    );
  }

  function cancelScheduledSpend(uint256 noteId, address[] calldata owners) external nonReentrant {
    _requireChain(noteId, owners);
    PendingSpend storage pending = pendingSpends[noteId];
    if (!pending.exists) revert NoScheduledSpend();
    address caller = _msgSender();
    bool isRoot = caller == owners[owners.length - 1];
    bool isLeaf = caller == owners[0];
    if (!isRoot && !isLeaf) revert NotNoteOwner();
    if (isLeaf && !isRoot && pending.paused) revert SpendPaused();
    uint256 nonce = pending.nonce;
    delete pendingSpends[noteId];
    emit SpendCancelled(noteId, nonce, caller);
  }

  function approveScheduledSpend(uint256 noteId, address[] calldata owners) external nonReentrant {
    _requireRoot(noteId, owners);
    _executePending(noteId, owners, true);
  }

  function executeScheduledSpend(uint256 noteId, address[] calldata owners) external nonReentrant {
    PendingSpend storage pending = pendingSpends[noteId];
    if (!pending.exists) revert NoScheduledSpend();
    if (pending.paused) revert SpendPaused();
    if (block.timestamp < pending.deadline) revert SpendNotDue();
    _executePending(noteId, owners, false);
  }

  function flagScheduledSpend(uint256 noteId, address[] calldata owners) external {
    _requireChain(noteId, owners);
    PendingSpend storage pending = pendingSpends[noteId];
    if (!pending.exists) revert NoScheduledSpend();
    address caller = _msgSender();
    if (!isSpendFlagger[noteId][caller]) revert NotSpendFlagger();
    if (caller == owners[0]) revert FlaggerCannotBeDelegate();
    if (caller == pending.primaryMarket) revert FlaggerCannotBeMarket();
    bool pause = spendPolicies[noteId].strictMode;
    if (pause) pending.paused = true;
    emit SpendFlagged(noteId, pending.nonce, caller, pause);
  }

  function _executePending(uint256 noteId, address[] calldata owners, bool early) private {
    PendingSpend memory pending = pendingSpends[noteId];
    if (!pending.exists) revert NoScheduledSpend();
    _requireScheduledSpendUsesWholeNote(
      pending.primaryMarket,
      pending.erc1155Contract,
      pending.tokenId,
      pending.count,
      notes[noteId].amount
    );
    delete pendingSpends[noteId];
    scheduledExecution = true;
    PurchaseShare[] memory shares = new PurchaseShare[](1);
    shares[0] = PurchaseShare({ noteId: noteId, chain: owners, shares: pending.count });
    _purchaseFromPrimaryMarket(
      shares,
      pending.primaryMarket,
      pending.erc1155Contract,
      pending.tokenId,
      pending.count
    );
    scheduledExecution = false;
    emit SpendExecuted(noteId, pending.nonce, _msgSender(), early);
  }

  function _requireRoot(uint256 noteId, address[] calldata owners) private view {
    _requireChain(noteId, owners);
    if (owners[owners.length - 1] != _msgSender()) revert NotNoteRoot();
  }

  function _requireDelegatedLeaf(uint256 noteId, address[] calldata owners) private view returns (Note storage note) {
    note = _requireChain(noteId, owners);
    if (owners.length != 2) revert DelegationHopLimit();
    if (owners[0] != _msgSender()) revert NotNoteOwner();
  }

  function _requireChain(uint256 noteId, address[] calldata owners) private view returns (Note storage note) {
    note = notes[noteId];
    if (note.chainHash == bytes32(0)) revert NoteDoesNotExist();
    if (note.chainHash != _verifyAndComputeChainHash(owners)) revert InvalidChain();
  }

  function _requireScheduledSpendUsesWholeNote(
    address primaryMarket,
    address erc1155Contract,
    uint256 tokenId,
    uint256 count,
    uint256 noteAmount
  ) private view {
    uint256[] memory tokenIds = new uint256[](1);
    uint256[] memory counts = new uint256[](1);
    tokenIds[0] = tokenId;
    counts[0] = count;
    uint256 cost = IFundingMarket(primaryMarket).erc1155TotalCost(erc1155Contract, tokenIds, counts);
    if (cost != noteAmount) revert ScheduledSpendMustUseWholeNote(cost, noteAmount);
  }

  function _clearPending(uint256 noteId) private {
    PendingSpend storage pending = pendingSpends[noteId];
    if (!pending.exists) return;
    uint256 nonce = pending.nonce;
    delete pendingSpends[noteId];
    emit SpendScheduleCleared(noteId, nonce);
  }

  function _deleteSpendPolicy(uint256 noteId) private {
    delete spendPolicies[noteId];
    address[] storage list = spendFlaggerList[noteId];
    for (uint256 i = 0; i < list.length; i++) {
      delete isSpendFlagger[noteId][list[i]];
    }
    delete spendFlaggerList[noteId];
  }

  function _writePolicy(
    uint256 noteId,
    uint256 delay,
    bool strictMode,
    address[] memory flaggers,
    address delegateTo
  ) private {
    spendPolicies[noteId].delay = delay;
    spendPolicies[noteId].strictMode = strictMode;
    emit SpendDelaySet(noteId, delay);
    emit StrictModeSet(noteId, strictMode);
    for (uint256 i = 0; i < flaggers.length; i++) {
      address flagger = flaggers[i];
      if (flagger == address(0) || flagger == delegateTo || isSpendFlagger[noteId][flagger]) continue;
      isSpendFlagger[noteId][flagger] = true;
      spendFlaggerList[noteId].push(flagger);
      emit SpendFlaggerSet(noteId, flagger, true);
    }
  }

  // ============ Revocation ============

  /**
   * @dev Revoke delegation by moving a note back to caller's chain.
   * @param noteId The note to revoke
   * @param owners The delegation chain (leaf first, root last)
   */
  function revoke(uint256 noteId, address[] calldata owners) external nonReentrant {
    address caller = _msgSender();

    Note storage note = notes[noteId];
    if (note.chainHash == bytes32(0)) revert NoteDoesNotExist();

    bytes32 expectedHash = _verifyAndComputeChainHash(owners);
    if (note.chainHash != expectedHash) revert InvalidChain();

    bool found = false;
    uint256 callerIndex = 0;
    for (uint256 j = 0; j < owners.length; j++) {
      if (owners[j] == caller) {
        found = true;
        callerIndex = j;
        break;
      }
    }
    if (!found) revert CallerNotInChain();

    _clearPending(noteId);

    // Ancestors revoke back to themselves; a leaf caller returns control to its parent.
    uint256 newLeafIndex = callerIndex == 0 && owners.length > 1 ? 1 : callerIndex;
    bytes32 newHash = bytes32(0);
    for (uint256 j = owners.length; j > newLeafIndex; j--) {
      newHash = _computeChainHash(owners[j - 1], newHash);
    }

    note.chainHash = newHash;
    emit NoteRevoked(noteId, caller);
  }


  // ============ Purchase Functions ============

  /**
   * @dev Purchase a single ERC1155 token ID from a primary market contract using delegated notes.
   * @param purchaseShares Per-note ERC1155 output shares. The sum must equal count.
   * @param primaryMarket Address of the primary market contract
   * @param erc1155Contract Address of the ERC1155 token contract
   * @param tokenId Token ID to purchase
   * @param count Number of tokens to purchase
   */
  // slither-disable-next-line arbitrary-send-eth
  function purchaseFromPrimaryMarket(
    PurchaseShare[] calldata purchaseShares,
    address primaryMarket,
    address erc1155Contract,
    uint256 tokenId,
    uint256 count
  ) external nonReentrant {
    _purchaseFromPrimaryMarket(purchaseShares, primaryMarket, erc1155Contract, tokenId, count);
  }

  function _purchaseFromPrimaryMarket(
    PurchaseShare[] memory purchaseShares,
    address primaryMarket,
    address erc1155Contract,
    uint256 tokenId,
    uint256 count
  ) private {
    if (count == 0) revert AmountMustBeGreaterThanZero();
    if (!isAuthorizedPrimaryMarket(primaryMarket)) revert UnauthorizedMarket();

    address caller = _msgSender();
    address paymentToken = IFundingMarket(primaryMarket).paymentToken();

    uint256[] memory tokenIds = new uint256[](1);
    uint256[] memory counts = new uint256[](1);
    tokenIds[0] = tokenId;
    counts[0] = count;

    uint256 requiredPayment = IFundingMarket(primaryMarket).erc1155TotalCost(
      erc1155Contract,
      tokenIds,
      counts
    );

    (
      uint256[] memory inputNoteIds,
      address[][] memory paymentChains,
      uint256[] memory outputShares
    ) = _executeSharePurchase(purchaseShares, count, requiredPayment, paymentToken);

    uint256[] memory outputNoteIds = _createNotesForPurchasedToken(
      primaryMarket,
      erc1155Contract,
      tokenId,
      paymentChains,
      outputShares,
      requiredPayment,
      count
    );

    IERC20(paymentToken).forceApprove(primaryMarket, requiredPayment);
    IFundingMarket(primaryMarket).buyERC1155(
      address(this),
      erc1155Contract,
      tokenIds,
      counts,
      ""
    );
    IERC20(paymentToken).forceApprove(primaryMarket, 0);

    emit ERC1155Purchased(
      caller,
      erc1155Contract,
      tokenIds,
      counts,
      requiredPayment,
      inputNoteIds,
      outputNoteIds
    );
  }

  // ============ Refund Functions ============

  /**
   * @dev Refund a note that holds ERC1155 receipt tokens from a *failed* assurance
   *      contract, converting it back into a settlement-token (ERC20) note rooted at the
   *      same delegation chain.
   *
   *      This is the mirror image of purchaseFromPrimaryMarket: a purchase turns a payment
   *      note into a receipt note; a refund (only possible once the assurance contract has
   *      failed) turns the receipt note back into a payment note. Because the new note
   *      inherits the original chain hash, revocability is preserved end-to-end — a failed
   *      pledge replenishes the same pool it was funded from instead of stranding funds at
   *      an EOA. The whole note is refunded.
   *
   *      The assurance contract enforces failure: its refundERC1155 reverts via
   *      requireRefundsAllowed() unless the contract is in the failed state.
   * @param noteId The note holding the ERC1155 receipt tokens to refund.
   * @param chain The note's delegation chain (leaf first, root last); chain[0] must be the caller.
   * @param primaryMarket The assurance contract that sold the receipts (must be authorized).
   * @return refundNoteId The ID of the newly created settlement-token note.
   */
  // slither-disable-next-line reentrancy-no-eth
  function refundIntoNote(
    uint256 noteId,
    address[] calldata chain,
    address primaryMarket
  ) external nonReentrant returns (uint256 refundNoteId) {
    if (!isAuthorizedPrimaryMarket(primaryMarket)) revert UnauthorizedMarket();

    Note storage note = notes[noteId];
    if (note.chainHash == bytes32(0)) revert NoteDoesNotExist();

    bytes32 expectedHash = _verifyAndComputeChainHash(chain);
    if (note.chainHash != expectedHash) revert InvalidChain();
    if (chain[0] != _msgSender()) revert NotNoteOwner();
    if (chain.length > 2) revert DelegationHopLimit();
    if (note.tokenType != TokenType.ERC1155) revert NoteIsNotReceiptToken();
    if (reimbursementClaims[noteId].primaryMarket != primaryMarket) revert WrongPrimaryMarket();

    address erc1155Contract = note.token;
    uint256 tokenId = note.tokenId;
    uint256 count = note.amount;
    bytes32 chainHash = note.chainHash;

    address paymentToken = IFundingMarket(primaryMarket).paymentToken();

    uint256[] memory ids = new uint256[](1);
    uint256[] memory counts = new uint256[](1);
    ids[0] = tokenId;
    counts[0] = count;

    // Effects: consume the receipt note before any external call (checks-effects-interactions).
    delete notes[noteId];
    delete reimbursementClaims[noteId];
    emit NoteConsumed(noteId, count, 0, true);

    // Interactions: hand the receipts back to the assurance contract and receive settlement
    // tokens. Approval is granted transiently and revoked immediately, mirroring the
    // forceApprove(..., 0) cleanup used on the purchase path. The balance delta is the
    // authoritative refund amount.
    uint256 balanceBefore = IERC20(paymentToken).balanceOf(address(this));
    IERC1155(erc1155Contract).setApprovalForAll(primaryMarket, true);
    IRefundableFundingMarket(primaryMarket).refundERC1155(
      address(this),
      erc1155Contract,
      ids,
      counts,
      ""
    );
    IERC1155(erc1155Contract).setApprovalForAll(primaryMarket, false);
    uint256 refundValue = IERC20(paymentToken).balanceOf(address(this)) - balanceBefore;

    // Mint a new settlement-token note rooted at the same delegation chain.
    refundNoteId = nextNoteId++;
    notes[refundNoteId] = Note({
      chainHash: chainHash,
      amount: refundValue,
      token: paymentToken,
      tokenType: TokenType.ERC20,
      tokenId: 0
    });

    // NoteCreated alone carries only the leaf; RefundedIntoNote lets the fold copy the full
    // chain from the consumed input note (the same pattern ERC1155Purchased uses for outputs).
    emit NoteCreated(refundNoteId, chain[0], refundValue, paymentToken, TokenType.ERC20, 0);
    emit RefundedIntoNote(
      _msgSender(),
      primaryMarket,
      erc1155Contract,
      tokenId,
      refundValue,
      paymentToken,
      noteId,
      refundNoteId
    );
  }

  // ============ Reimbursement Functions ============

  /**
   * @notice Withdraw this receipt note's currently earned reimbursement into a new
   *         settlement-token note carrying the receipt's current delegation chain.
   * @dev The receipt note remains intact and non-transferable. Its contribution basis
   *      and cumulative withdrawals cap this chain at exactly what it contributed.
   */
  function claimReimbursementIntoNote(
    uint256 receiptNoteId,
    address[] calldata chain,
    address primaryMarket
  ) external nonReentrant returns (uint256 reimbursementNoteId) {
    Note storage receiptNote = notes[receiptNoteId];
    if (receiptNote.chainHash == bytes32(0)) revert NoteDoesNotExist();
    if (receiptNote.tokenType != TokenType.ERC1155) revert NoteIsNotReceiptToken();
    if (receiptNote.chainHash != _verifyAndComputeChainHash(chain)) revert InvalidChain();
    if (chain[0] != _msgSender()) revert NotNoteOwner();
    if (chain.length > 2) revert DelegationHopLimit();

    ReimbursementClaim storage claim = reimbursementClaims[receiptNoteId];
    if (claim.primaryMarket == address(0)) revert NoteHasNoReimbursementClaim();
    if (claim.primaryMarket != primaryMarket) revert WrongPrimaryMarket();

    uint256 earned = AssuranceReimbursement.earned(primaryMarket, claim.contribution);
    if (earned <= claim.withdrawn) revert NoReimbursementAvailable();
    uint256 amount = earned - claim.withdrawn;
    claim.withdrawn = earned;

    address paymentToken = IFundingMarket(primaryMarket).paymentToken();
    AssuranceReimbursement.withdraw(primaryMarket, address(this), amount);

    reimbursementNoteId = nextNoteId++;
    notes[reimbursementNoteId] = Note({
      chainHash: receiptNote.chainHash,
      amount: amount,
      token: paymentToken,
      tokenType: TokenType.ERC20,
      tokenId: 0
    });
    emit NoteCreated(reimbursementNoteId, chain[0], amount, paymentToken, TokenType.ERC20, 0);
    emit ReimbursementClaimedIntoNote(
      _msgSender(), primaryMarket, receiptNoteId, amount, reimbursementNoteId
    );
  }

  // ============ Purchase Helpers ============

  function _executeSharePurchase(
    PurchaseShare[] memory purchaseShares,
    uint256 outputCount,
    uint256 requiredPayment,
    address paymentToken
  ) private returns (
    uint256[] memory inputNoteIds,
    address[][] memory paymentChains,
    uint256[] memory outputShares
  ) {
    if (purchaseShares.length == 0) revert NoteDoesNotExist();
    if (outputCount == 0) revert AmountMustBeGreaterThanZero();
    if (requiredPayment == 0) revert AmountMustBeGreaterThanZero();

    address caller = _msgSender();
    uint256 totalShares = 0;
    uint256 totalSpent = 0;

    inputNoteIds = new uint256[](purchaseShares.length);
    paymentChains = new address[][](purchaseShares.length);
    outputShares = new uint256[](purchaseShares.length);
    uint256[] memory spentAmounts = new uint256[](purchaseShares.length);

    for (uint256 i = 0; i < purchaseShares.length; i++) {
      PurchaseShare memory purchaseShare = purchaseShares[i];
      if (purchaseShare.shares == 0) revert InvalidPurchaseShares();

      Note storage note = notes[purchaseShare.noteId];
      if (note.chainHash == bytes32(0)) revert NoteDoesNotExist();

      bytes32 expectedHash = _verifyAndComputeChainHash(purchaseShare.chain);
      if (note.chainHash != expectedHash) revert InvalidChain();
      if (pendingSpends[purchaseShare.noteId].exists) revert SpendAlreadyScheduled();
      if (!scheduledExecution && spendPolicies[purchaseShare.noteId].delay != 0) {
        revert SpendMustBeScheduled();
      }
      if (!scheduledExecution && purchaseShare.chain[0] != caller) revert NotNoteOwner();
      if (purchaseShare.chain.length > 2) revert DelegationHopLimit();
      if (note.tokenType != TokenType.ERC20 || note.token != paymentToken) {
        revert InvalidPaymentTokenForPurchase();
      }

      uint256 sharePaymentNumerator = requiredPayment * purchaseShare.shares;
      if (sharePaymentNumerator % outputCount != 0) revert InvalidPaymentAmount();
      uint256 spentAmount = sharePaymentNumerator / outputCount;
      if (note.amount < spentAmount) revert InsufficientBalance();

      inputNoteIds[i] = purchaseShare.noteId;
      paymentChains[i] = purchaseShare.chain;
      outputShares[i] = purchaseShare.shares;
      spentAmounts[i] = spentAmount;
      totalShares += purchaseShare.shares;
      totalSpent += spentAmount;
    }

    if (totalShares != outputCount) revert InvalidPurchaseShares();
    if (totalSpent != requiredPayment) revert InvalidPaymentAmount();

    _consumeExactPaymentNotes(inputNoteIds, spentAmounts);
    return (inputNoteIds, paymentChains, outputShares);
  }

  function _consumeExactPaymentNotes(
    uint256[] memory noteIds,
    uint256[] memory spentAmounts
  ) private {
    for (uint256 i = 0; i < noteIds.length; i++) {
      notes[noteIds[i]].amount -= spentAmounts[i];
      uint256 remainingAmount = notes[noteIds[i]].amount;
      bool deleted = false;

      // The strict `== 0` is safe here: the subtraction above reverts on
      // underflow (Solidity 0.8), so `remainingAmount` is an exact ledger
      // value, not a manipulable balance snapshot. Equality is the correct
      // condition for deciding whether the note is fully consumed.
      // slither-disable-next-line incorrect-equality
      if (remainingAmount == 0) {
        delete notes[noteIds[i]];
        deleted = true;
      }

      emit NoteConsumed(noteIds[i], spentAmounts[i], remainingAmount, deleted);
    }
  }

  function _createNotesForPurchasedToken(
    address primaryMarket,
    address erc1155Contract,
    uint256 tokenId,
    address[][] memory chains,
    uint256[] memory outputShares,
    uint256 totalPayment,
    uint256 totalShares
  ) private returns (uint256[] memory outputNoteIds) {
    outputNoteIds = new uint256[](chains.length);

    for (uint256 i = 0; i < chains.length; i++) {
      uint256 newNoteId = nextNoteId++;
      bytes32 chainHash = _verifyAndComputeChainHash(chains[i]);

      notes[newNoteId] = Note({
        chainHash: chainHash,
        amount: outputShares[i],
        token: erc1155Contract,
        tokenType: TokenType.ERC1155,
        tokenId: tokenId
      });
      reimbursementClaims[newNoteId] = ReimbursementClaim({
        primaryMarket: primaryMarket,
        contribution: totalPayment * outputShares[i] / totalShares,
        withdrawn: 0
      });

      emit NoteCreated(
        newNoteId,
        chains[i][0],
        outputShares[i],
        erc1155Contract,
        TokenType.ERC1155,
        tokenId
      );

      outputNoteIds[i] = newNoteId;
    }
  }

}
