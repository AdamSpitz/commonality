// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AssuranceContract} from "../individual-projects/AssuranceContract.sol";
import {ERC1155PrimaryMarket} from "../individual-projects/ERC1155PrimaryMarket.sol";
import {ERC1155SecondaryMarket} from "../marketplace/ERC1155SecondaryMarket.sol";
import {AssuranceContractFactory, MarketplaceFactory} from "../individual-projects/ProjectFactory.sol";

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
  error UnauthorizedPrimaryMarketAuthorizer();
  error InvalidPaymentTokenForPurchase();
  error InvalidPaymentAmount();
  error ListingDoesNotExist();
  error InvalidPurchaseShares();

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

  // Depth limit to prevent gas exhaustion from extremely long chains
  uint256 public constant MAX_DELEGATION_DEPTH = 200;

  AssuranceContractFactory public immutable primaryMarketFactory;
  MarketplaceFactory public immutable secondaryMarketFactory;

  uint256 public nextNoteId = 1;
  mapping(uint256 => Note) public notes;
  mapping(address => bool) public authorizedPrimaryMarkets;
  mapping(address => bool) public primaryMarketAuthorizers;

  constructor(
    address _primaryMarketFactory,
    address _secondaryMarketFactory
  ) Ownable(msg.sender) {
    primaryMarketFactory = AssuranceContractFactory(_primaryMarketFactory);
    secondaryMarketFactory = MarketplaceFactory(_secondaryMarketFactory);
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

  /**
   * @notice Emitted when a delegation is revoked
   * @param noteId The note whose delegation was revoked
   * @param revoker The address that revoked the delegation
   */
  event NoteRevoked(uint256 indexed noteId, address indexed revoker);

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

  event PrimaryMarketAuthorizationSet(address indexed primaryMarket, bool authorized);
  event PrimaryMarketAuthorizerSet(address indexed authorizer, bool authorized);

  // ============ Primary Market Authorization ============

  /**
   * @notice Allows an external factory to register newly deployed primary markets.
   * @dev Pubstarter assurance contracts remain authorized through primaryMarketFactory.
   *      This hook supports specialized assurance-contract factories that cannot be
   *      discovered through that factory's isDeployedAssurance mapping.
   */
  function setPrimaryMarketAuthorizer(address authorizer, bool authorized) external onlyOwner {
    if (authorizer == address(0)) revert ZeroAddress();
    primaryMarketAuthorizers[authorizer] = authorized;
    emit PrimaryMarketAuthorizerSet(authorizer, authorized);
  }

  function setPrimaryMarketAuthorization(address primaryMarket, bool authorized) external onlyOwner {
    _setPrimaryMarketAuthorization(primaryMarket, authorized);
  }

  function authorizePrimaryMarket(address primaryMarket) external {
    if (!primaryMarketAuthorizers[_msgSender()]) revert UnauthorizedPrimaryMarketAuthorizer();
    _setPrimaryMarketAuthorization(primaryMarket, true);
  }

  function _setPrimaryMarketAuthorization(address primaryMarket, bool authorized) private {
    if (primaryMarket == address(0)) revert ZeroAddress();
    authorizedPrimaryMarkets[primaryMarket] = authorized;
    emit PrimaryMarketAuthorizationSet(primaryMarket, authorized);
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
  ) external nonReentrant returns (uint256 delegatedNoteId, uint256 remainderNoteId) {
    Note storage note = notes[noteId];
    if (note.chainHash == bytes32(0)) revert NoteDoesNotExist();

    bytes32 expectedHash = _verifyAndComputeChainHash(owners);
    if (note.chainHash != expectedHash) revert InvalidChain();
    if (owners[0] != _msgSender()) revert NotNoteOwner();
    if (amountToDelegate == 0 || amountToDelegate > note.amount) revert InvalidDelegationAmount();
    if (delegateTo == address(0)) revert CannotDelegateToZeroAddress();

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

      // Update original note with remainder (keep same chain)
      note.amount = remainderAmount;

      emit ChainSplit(noteId, delegatedNoteId, noteId, amountToDelegate);
      emit NoteDelegated(noteId, delegatedNoteId, delegateTo, amountToDelegate);

      return (delegatedNoteId, noteId);
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
    if (count == 0) revert AmountMustBeGreaterThanZero();
    if (!primaryMarketFactory.isDeployedAssurance(primaryMarket) && !authorizedPrimaryMarkets[primaryMarket]) {
      revert UnauthorizedMarket();
    }

    address caller = _msgSender();
    address paymentToken = AssuranceContract(primaryMarket).paymentToken();

    uint256[] memory tokenIds = new uint256[](1);
    uint256[] memory counts = new uint256[](1);
    tokenIds[0] = tokenId;
    counts[0] = count;

    uint256 requiredPayment = ERC1155PrimaryMarket(primaryMarket).erc1155TotalCost(
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
      erc1155Contract,
      tokenId,
      paymentChains,
      outputShares
    );

    IERC20(paymentToken).forceApprove(primaryMarket, requiredPayment);
    ERC1155PrimaryMarket(primaryMarket).buyERC1155(
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

  /**
   * @dev Purchase a single ERC1155 token ID from a secondary market contract using delegated notes.
   * @param purchaseShares Per-note ERC1155 output shares. The sum must equal tokenCount.
   * @param secondaryMarket Address of the secondary market contract
   * @param saleListingId Sale listing ID in the secondary market
   * @param tokenCount Number of tokens to purchase
   */
  // slither-disable-next-line arbitrary-send-eth
  function purchaseFromSecondaryMarket(
    PurchaseShare[] calldata purchaseShares,
    address secondaryMarket,
    uint256 saleListingId,
    uint256 tokenCount
  ) external nonReentrant {
    if (tokenCount == 0) revert AmountMustBeGreaterThanZero();
    if (!secondaryMarketFactory.isDeployedMarket(secondaryMarket)) revert UnauthorizedMarket();

    address caller = _msgSender();
    address paymentToken = ERC1155SecondaryMarket(secondaryMarket).paymentToken();
    address erc1155Contract = address(ERC1155SecondaryMarket(secondaryMarket).erc1155());
    ERC1155SecondaryMarket.SaleListing memory listing =
      ERC1155SecondaryMarket(secondaryMarket).getSaleListing(saleListingId);
    if (listing.seller == address(0)) revert ListingDoesNotExist();

    uint256 requiredPayment = listing.pricePerToken * tokenCount;

    (
      uint256[] memory inputNoteIds,
      address[][] memory paymentChains,
      uint256[] memory outputShares
    ) = _executeSharePurchase(purchaseShares, tokenCount, requiredPayment, paymentToken);

    uint256[] memory tokenIds = new uint256[](1);
    uint256[] memory counts = new uint256[](1);
    tokenIds[0] = listing.tokenId;
    counts[0] = tokenCount;

    uint256[] memory outputNoteIds = _createNotesForPurchasedToken(
      erc1155Contract,
      listing.tokenId,
      paymentChains,
      outputShares
    );

    IERC20(paymentToken).forceApprove(secondaryMarket, requiredPayment);
    ERC1155SecondaryMarket(secondaryMarket).fulfillSaleListingTo(
      saleListingId,
      tokenCount,
      listing.pricePerToken,
      address(this)
    );
    IERC20(paymentToken).forceApprove(secondaryMarket, 0);

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

  // ============ Purchase Helpers ============

  function _executeSharePurchase(
    PurchaseShare[] calldata purchaseShares,
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
      PurchaseShare calldata purchaseShare = purchaseShares[i];
      if (purchaseShare.shares == 0) revert InvalidPurchaseShares();

      Note storage note = notes[purchaseShare.noteId];
      if (note.chainHash == bytes32(0)) revert NoteDoesNotExist();

      bytes32 expectedHash = _verifyAndComputeChainHash(purchaseShare.chain);
      if (note.chainHash != expectedHash) revert InvalidChain();
      if (purchaseShare.chain[0] != caller) revert NotNoteOwner();
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

      if (remainingAmount == 0) {
        delete notes[noteIds[i]];
        deleted = true;
      }

      emit NoteConsumed(noteIds[i], spentAmounts[i], remainingAmount, deleted);
    }
  }

  function _createNotesForPurchasedToken(
    address erc1155Contract,
    uint256 tokenId,
    address[][] memory chains,
    uint256[] memory outputShares
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
