// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../individual-projects/ERC1155PrimaryMarket.sol";
import "../marketplace/ERC1155SecondaryMarket.sol";

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
 */
contract DelegatableNotes is Context, ReentrancyGuard, ERC1155Holder {
  using SafeERC20 for IERC20;

  enum TokenType { ERC20, ERC1155 }

  struct Note {
    bytes32 chainHash;     // Commitment to delegation chain: hash(owner, parentChainHash)
    uint256 amount;
    address token;
    TokenType tokenType;
    uint256 tokenId;
    bytes32 intendedStatementId;
  }

  // Depth limit to prevent gas exhaustion from extremely long chains
  uint256 public constant MAX_DELEGATION_DEPTH = 200;

  uint256 public nextNoteId = 1;
  mapping(uint256 => Note) public notes;

  // Events
  event NoteCreated(
    uint256 indexed noteId,
    address indexed owner,
    uint256 amount,
    address token,
    TokenType tokenType,
    uint256 tokenId,
    bytes32 intendedStatementId
  );
  event NoteDelegated(
    uint256 indexed parentNoteId,
    uint256 indexed childNoteId,
    address indexed delegate,
    uint256 amount
  );
  event NoteRevoked(uint256 indexed noteId, address indexed revoker);
  event FundsReclaimed(
    uint256 indexed noteId,
    address indexed owner,
    uint256 amount,
    address token,
    TokenType tokenType,
    uint256 tokenId
  );
  event ChainSplit(
    uint256 indexed originalLeafId,
    uint256 indexed splitLeafId,
    uint256 indexed remainderLeafId,
    uint256 splitAmount
  );
  event NoteConsumed(
    uint256 indexed noteId,
    uint256 amountConsumed,
    uint256 remainingAmount,
    bool deleted
  );
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
   * @dev Allows contract to receive ETH directly.
   * This is needed in case marketplaces send ETH back to the contract.
   */
  receive() external payable {}

  // ============ Hash Helpers ============

  function _computeChainHash(address owner, bytes32 parentChainHash) private pure returns (bytes32) {
    return keccak256(abi.encodePacked(owner, parentChainHash));
  }

  function _verifyAndComputeChainHash(address[] memory owners) private pure returns (bytes32) {
    require(owners.length > 0, "Empty chain");
    require(owners.length <= MAX_DELEGATION_DEPTH, "Chain too long");

    // Build hash from root to leaf (owners[length-1] is root, owners[0] is leaf)
    bytes32 hash = bytes32(0);
    for (uint256 i = owners.length; i > 0; i--) {
      hash = _computeChainHash(owners[i - 1], hash);
    }
    return hash;
  }

  // ============ Deposit Functions ============

  function deposit(
    address token,
    TokenType tokenType,
    uint256 tokenId,
    uint256 amount,
    bytes32 intendedStatementId
  ) public payable nonReentrant returns (uint256) {
    address owner = _msgSender();
    uint256 actualAmount;

    if (token == address(0)) {
      require(msg.value > 0, "Must send ETH");
      require(tokenType == TokenType.ERC20, "ETH must use ERC20 type");
      actualAmount = msg.value;
      tokenId = 0;
    } else if (tokenType == TokenType.ERC20) {
      require(amount > 0, "Amount must be greater than 0");
      require(msg.value == 0, "Do not send ETH for ERC20 deposits");
      actualAmount = amount;
      tokenId = 0;
      IERC20(token).safeTransferFrom(owner, address(this), amount);
    } else {
      require(amount > 0, "Amount must be greater than 0");
      require(msg.value == 0, "Do not send ETH for ERC1155 deposits");
      actualAmount = amount;
      IERC1155(token).safeTransferFrom(owner, address(this), tokenId, amount, "");
    }

    uint256 noteId = nextNoteId++;
    bytes32 chainHash = _computeChainHash(owner, bytes32(0));

    notes[noteId] = Note({
      chainHash: chainHash,
      amount: actualAmount,
      token: token,
      tokenType: tokenType,
      tokenId: tokenId,
      intendedStatementId: intendedStatementId
    });

    emit NoteCreated(noteId, owner, actualAmount, token, tokenType, tokenId, intendedStatementId);
    return noteId;
  }

  // ============ Reclaim Functions ============

  /**
   * @dev Reclaim funds from a note. Caller must be the root (depositor).
   * Only root notes (non-delegated) can be reclaimed.
   * @param noteId The note to reclaim
   */
  function reclaimFunds(uint256 noteId) external nonReentrant {
    Note storage note = notes[noteId];
    require(note.chainHash != bytes32(0), "Note does not exist");

    address caller = _msgSender();
    bytes32 expectedHash = _computeChainHash(caller, bytes32(0));
    require(note.chainHash == expectedHash, "Not a root note or not the owner");

    address token = note.token;
    uint256 amount = note.amount;
    TokenType tokenType = note.tokenType;
    uint256 tokenId = note.tokenId;

    delete notes[noteId];

    if (tokenType == TokenType.ERC20) {
      if (token == address(0)) {
        payable(caller).transfer(amount);
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
  ) external returns (uint256 delegatedNoteId, uint256 remainderNoteId) {
    Note storage note = notes[noteId];
    require(note.chainHash != bytes32(0), "Note does not exist");

    bytes32 expectedHash = _verifyAndComputeChainHash(owners);
    require(note.chainHash == expectedHash, "Invalid chain");
    require(owners[0] == _msgSender(), "Not the note owner");
    require(amountToDelegate > 0 && amountToDelegate <= note.amount, "Invalid delegation amount");
    require(delegateTo != address(0), "Cannot delegate to zero address");

    // Check for circular delegation
    for (uint256 i = 0; i < owners.length; i++) {
      require(owners[i] != delegateTo, "Circular delegation detected");
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
        tokenId: note.tokenId,
        intendedStatementId: note.intendedStatementId
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
  function revoke(uint256 noteId, address[] calldata owners) external {
    address caller = _msgSender();

    Note storage note = notes[noteId];
    require(note.chainHash != bytes32(0), "Note does not exist");

    bytes32 expectedHash = _verifyAndComputeChainHash(owners);
    require(note.chainHash == expectedHash, "Invalid chain");

    // Find caller in the chain
    bool found = false;
    uint256 callerIndex = 0;
    for (uint256 j = 0; j < owners.length; j++) {
      if (owners[j] == caller) {
        found = true;
        callerIndex = j;
        break;
      }
    }
    require(found, "Caller not in chain");

    // Build new chain up to (and including) caller
    // callerIndex=0 means caller is leaf, so new chain length = 1
    // callerIndex=2 means caller is at position 2, so new chain length = 3
    uint256 newChainLength = callerIndex + 1;
    bytes32 newHash = bytes32(0);
    for (uint256 j = owners.length - newChainLength; j < owners.length; j++) {
      newHash = _computeChainHash(owners[j], newHash);
    }

    note.chainHash = newHash;
    emit NoteRevoked(noteId, caller);
  }


  // ============ Purchase Functions ============

  /**
   * @dev Common logic for executing purchases. Validates notes, consumes payment,
   *      and returns data needed to create output notes.
   * @param noteIds Array of note IDs to use for payment
   * @param chains Array of delegation chains (one per note)
   * @param paymentAmount Total amount to spend in ETH
   * @return paymentChains The delegation chains of the payment notes
   * @return spentAmounts The amount spent from each note
   * @return statementIds The intended statement IDs from each note
   */
  function _executePurchase(
    uint256[] calldata noteIds,
    address[][] calldata chains,
    uint256 paymentAmount
  ) private returns (
    address[][] memory paymentChains,
    uint256[] memory spentAmounts,
    bytes32[] memory statementIds
  ) {
    require(noteIds.length > 0, "Must provide at least one note");
    require(noteIds.length == chains.length, "Array length mismatch");
    require(paymentAmount > 0, "Payment amount must be greater than 0");

    address caller = _msgSender();

    // Validate ownership and prepare payment
    uint256 totalAvailable = _preparePayment(
      noteIds,
      chains,
      caller,
      paymentAmount
    );

    // Consume payment notes and cache data for output notes
    return _consumePaymentNotes(noteIds, chains, paymentAmount, totalAvailable);
  }

  /**
   * @dev Purchase ERC1155 tokens from a primary market contract.
   * @param noteIds Array of note IDs to use for payment
   * @param chains Array of delegation chains (one per note)
   * @param paymentAmount Total amount to spend in ETH
   * @param primaryMarket Address of the primary market contract
   * @param erc1155Contract Address of the ERC1155 token contract
   * @param tokenIds Array of token IDs to purchase
   * @param counts Array of token counts to purchase
   */
  function purchaseFromPrimaryMarket(
    uint256[] calldata noteIds,
    address[][] calldata chains,
    uint256 paymentAmount,
    address primaryMarket,
    address erc1155Contract,
    uint256[] calldata tokenIds,
    uint256[] calldata counts
  ) external nonReentrant {
    require(tokenIds.length == counts.length, "Token IDs and counts length mismatch");

    address caller = _msgSender();

    // Execute common purchase logic
    (
      address[][] memory paymentChains,
      uint256[] memory spentAmounts,
      bytes32[] memory statementIds
    ) = _executePurchase(noteIds, chains, paymentAmount);

    // Execute primary market purchase
    ERC1155PrimaryMarket(primaryMarket).buyERC1155{value: paymentAmount}(
      address(this),
      erc1155Contract,
      tokenIds,
      counts,
      ""
    );

    // Create new notes with purchased tokens
    uint256[] memory outputNoteIds = _createNotesForPurchasedTokens(
      erc1155Contract,
      tokenIds,
      counts,
      paymentChains,
      spentAmounts,
      statementIds,
      paymentAmount
    );

    emit ERC1155Purchased(
      caller,
      erc1155Contract,
      tokenIds,
      counts,
      paymentAmount,
      noteIds,
      outputNoteIds
    );
  }

  /**
   * @dev Purchase ERC1155 tokens from a secondary market contract.
   * @param noteIds Array of note IDs to use for payment
   * @param chains Array of delegation chains (one per note)
   * @param paymentAmount Total amount to spend in ETH
   * @param secondaryMarket Address of the secondary market contract
   * @param saleListingId Sale listing ID in the secondary market
   * @param tokenCount Number of tokens to purchase
   */
  function purchaseFromSecondaryMarket(
    uint256[] calldata noteIds,
    address[][] calldata chains,
    uint256 paymentAmount,
    address secondaryMarket,
    uint256 saleListingId,
    uint256 tokenCount
  ) external nonReentrant {
    require(tokenCount > 0, "Token count must be greater than 0");

    address caller = _msgSender();

    // Execute common purchase logic
    (
      address[][] memory paymentChains,
      uint256[] memory spentAmounts,
      bytes32[] memory statementIds
    ) = _executePurchase(noteIds, chains, paymentAmount);

    // Execute secondary market purchase
    ERC1155SecondaryMarket(secondaryMarket).fulfillSaleListingTo{value: paymentAmount}(
      saleListingId,
      tokenCount,
      address(this)
    );

    // Get the token details from the marketplace to create notes
    address erc1155Contract = address(ERC1155SecondaryMarket(secondaryMarket).erc1155());
    (, uint256 tokenId,,) = ERC1155SecondaryMarket(secondaryMarket).getSaleListing(saleListingId);

    // Create arrays for single token type
    uint256[] memory tokenIds = new uint256[](1);
    uint256[] memory counts = new uint256[](1);
    tokenIds[0] = tokenId;
    counts[0] = tokenCount;

    // Create new notes with purchased tokens
    uint256[] memory outputNoteIds = _createNotesForPurchasedTokens(
      erc1155Contract,
      tokenIds,
      counts,
      paymentChains,
      spentAmounts,
      statementIds,
      paymentAmount
    );

    emit ERC1155Purchased(
      caller,
      erc1155Contract,
      tokenIds,
      counts,
      paymentAmount,
      noteIds,
      outputNoteIds
    );
  }

  // ============ Purchase Helpers ============

  function _preparePayment(
    uint256[] calldata noteIds,
    address[][] calldata chains,
    address caller,
    uint256 requiredPayment
  ) private view returns (uint256 totalAvailable) {
    // Validate all notes and sum available
    for (uint256 i = 0; i < noteIds.length; i++) {
      Note storage note = notes[noteIds[i]];
      require(note.chainHash != bytes32(0), "Note does not exist");

      bytes32 expectedHash = _verifyAndComputeChainHash(chains[i]);
      require(note.chainHash == expectedHash, "Invalid chain");
      require(chains[i][0] == caller, "Not the note owner");
      require(note.token == address(0), "Notes must hold ETH");

      totalAvailable += note.amount;
    }

    require(totalAvailable >= requiredPayment, "Insufficient funds in notes");
  }

  /**
   * @dev Consumes (spends) the specified amount from payment notes, proportionally.
   * Returns cached data needed to create output notes.
   */
  function _consumePaymentNotes(
    uint256[] calldata noteIds,
    address[][] calldata chains,
    uint256 paymentAmount,
    uint256 totalAvailable
  ) private returns (
    address[][] memory paymentChains,
    uint256[] memory spentAmounts,
    bytes32[] memory statementIds
  ) {
    paymentChains = new address[][](noteIds.length);
    spentAmounts = new uint256[](noteIds.length);
    statementIds = new bytes32[](noteIds.length);

    for (uint256 i = 0; i < noteIds.length; i++) {
      paymentChains[i] = chains[i];
      spentAmounts[i] = (paymentAmount * notes[noteIds[i]].amount) / totalAvailable;
      if (i == noteIds.length - 1) {
        // Last note gets remainder to avoid rounding errors
        uint256 alreadySpent = 0;
        for (uint256 j = 0; j < i; j++) {
          alreadySpent += spentAmounts[j];
        }
        spentAmounts[i] = paymentAmount - alreadySpent;
      }
      statementIds[i] = notes[noteIds[i]].intendedStatementId;

      // Reduce note amounts (spending from the notes)
      notes[noteIds[i]].amount -= spentAmounts[i];
      uint256 remainingAmount = notes[noteIds[i]].amount;
      bool deleted = false;

      // If amount reaches 0, delete the note
      if (remainingAmount == 0) {
        delete notes[noteIds[i]];
        deleted = true;
      }

      // Emit consumption event for indexer tracking
      emit NoteConsumed(noteIds[i], spentAmounts[i], remainingAmount, deleted);
    }

    return (paymentChains, spentAmounts, statementIds);
  }

  function _createNotesForPurchasedTokens(
    address erc1155Contract,
    uint256[] memory tokenIds,
    uint256[] memory counts,
    address[][] memory chains,
    uint256[] memory spentAmounts,
    bytes32[] memory statementIds,
    uint256 totalSpent
  ) private returns (uint256[] memory outputNoteIds) {
    uint256 maxOutputs = tokenIds.length * chains.length;
    outputNoteIds = new uint256[](maxOutputs);
    uint256 outputIndex = 0;

    // Distribute each token type proportionally
    for (uint256 t = 0; t < tokenIds.length; t++) {
      uint256 tokenId = tokenIds[t];
      uint256 tokenCount = counts[t];
      uint256 distributed = 0;

      for (uint256 c = 0; c < chains.length; c++) {
        uint256 share;
        if (c < chains.length - 1) {
          share = (tokenCount * spentAmounts[c]) / totalSpent;
          distributed += share;
        } else {
          share = tokenCount - distributed;
        }

        if (share > 0) {
          uint256 newNoteId = nextNoteId++;
          bytes32 chainHash = _verifyAndComputeChainHash(chains[c]);

          notes[newNoteId] = Note({
            chainHash: chainHash,
            amount: share,
            token: erc1155Contract,
            tokenType: TokenType.ERC1155,
            tokenId: tokenId,
            intendedStatementId: statementIds[c]
          });

          // Emit NoteCreated event for indexer
          emit NoteCreated(
            newNoteId,
            chains[c][0], // leaf owner
            share,
            erc1155Contract,
            TokenType.ERC1155,
            tokenId,
            statementIds[c]
          );

          outputNoteIds[outputIndex++] = newNoteId;
        }
      }
    }

    // Trim array
    uint256[] memory trimmed = new uint256[](outputIndex);
    for (uint256 i = 0; i < outputIndex; i++) {
      trimmed[i] = outputNoteIds[i];
    }
    return trimmed;
  }
}
