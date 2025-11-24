// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

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
    uint256 tokenId
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
   * @dev Allows contract to receive ETH when purchasing from marketplaces.
   * Required for marketplace refunds and receiving change from purchases.
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

  function _getLeafOwner(address[] memory owners) private pure returns (address) {
    require(owners.length > 0, "Empty chain");
    return owners[0];
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

    emit NoteCreated(noteId, owner, actualAmount, token, tokenType, tokenId);
    return noteId;
  }

  function depositERC20(address token, uint256 amount, bytes32 intendedStatementId) external returns (uint256) {
    require(token != address(0), "Use depositETH for ETH deposits");
    return deposit(token, TokenType.ERC20, 0, amount, intendedStatementId);
  }

  function depositETH(bytes32 intendedStatementId) external payable returns (uint256) {
    return deposit(address(0), TokenType.ERC20, 0, 0, intendedStatementId);
  }

  function depositERC1155(
    address token,
    uint256 tokenId,
    uint256 amount,
    bytes32 intendedStatementId
  ) external returns (uint256) {
    return deposit(token, TokenType.ERC1155, tokenId, amount, intendedStatementId);
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
    require(_getLeafOwner(owners) == _msgSender(), "Not the note owner");
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
   * @dev Revoke delegation by moving notes back to caller's chain.
   * @param noteIds Array of notes to revoke
   * @param chains Array of delegation chains (one per note)
   */
  function revoke(uint256[] calldata noteIds, address[][] calldata chains) external {
    address caller = _msgSender();

    for (uint256 i = 0; i < noteIds.length; i++) {
      uint256 noteId = noteIds[i];
      address[] calldata owners = chains[i];

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
  }


  // ============ View Functions ============

  /**
   * @dev Verify that the provided chain matches the note's hash.
   * @param noteId The note to verify
   * @param owners The delegation chain to verify (leaf first, root last)
   * @return True if the chain is valid
   */
  function verifyChain(uint256 noteId, address[] calldata owners) public view returns (bool) {
    Note storage note = notes[noteId];
    if (note.chainHash == bytes32(0)) {
      return false;
    }

    bytes32 expectedHash = _verifyAndComputeChainHash(owners);
    return note.chainHash == expectedHash;
  }

  function validateNotesCompatible(uint256[] calldata noteIds)
    public
    view
    returns (bool isValid, string memory errorMessage)
  {
    if (noteIds.length == 0) {
      return (false, "No notes provided");
    }

    Note storage firstNote = notes[noteIds[0]];
    if (firstNote.chainHash == bytes32(0)) {
      return (false, "First note does not exist");
    }

    address expectedToken = firstNote.token;
    TokenType expectedTokenType = firstNote.tokenType;
    uint256 expectedTokenId = firstNote.tokenId;

    for (uint256 i = 0; i < noteIds.length; i++) {
      Note storage note = notes[noteIds[i]];

      if (note.chainHash == bytes32(0)) {
        return (false, "Note does not exist");
      }
      if (note.token != expectedToken) {
        return (false, "Notes have different tokens");
      }
      if (note.tokenType != expectedTokenType) {
        return (false, "Notes have different token types");
      }
      if (expectedTokenType == TokenType.ERC1155 && note.tokenId != expectedTokenId) {
        return (false, "ERC1155 notes have different token IDs");
      }
    }

    return (true, "");
  }


  // ============ Purchase Functions ============

  function purchaseFromERC1155PrimaryMarket(
    uint256[] calldata noteIds,
    address[][] calldata chains,
    uint256 paymentAmount,
    address payable seller,
    address erc1155Contract,
    uint256[] calldata tokenIds,
    uint256[] calldata counts
  ) external nonReentrant {
    require(noteIds.length > 0, "Must provide at least one note");
    require(noteIds.length == chains.length, "Array length mismatch");
    require(tokenIds.length == counts.length, "Token IDs and counts length mismatch");
    require(paymentAmount > 0, "Payment amount must be greater than 0");

    address caller = _msgSender();

    // Validate ownership and prepare payment
    (, uint256 totalAvailable) = _preparePayment(
      noteIds,
      chains,
      caller,
      paymentAmount
    );

    // Consume payment notes and cache data for output notes
    (
      address[][] memory paymentChains,
      uint256[] memory spentAmounts,
      bytes32[] memory statementIds
    ) = _consumePaymentNotes(noteIds, chains, paymentAmount, totalAvailable);

    // Execute purchase
    ERC1155PrimaryMarket(seller).buyERC1155{value: paymentAmount}(
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

  function purchaseFromERC1155SecondaryMarket(
    uint256[] calldata noteIds,
    address[][] calldata chains,
    uint256 paymentAmount,
    address marketplace,
    address erc1155Contract,
    uint256 saleListingId,
    uint256 tokenId,
    uint256 count
  ) external nonReentrant {
    require(noteIds.length > 0, "Must provide at least one note");
    require(noteIds.length == chains.length, "Array length mismatch");
    require(paymentAmount > 0, "Payment amount must be greater than 0");

    address caller = _msgSender();

    // Validate ownership and prepare payment
    (, uint256 totalAvailable) = _preparePayment(
      noteIds,
      chains,
      caller,
      paymentAmount
    );

    // Consume payment notes and cache data for output notes
    (
      address[][] memory paymentChains,
      uint256[] memory spentAmounts,
      bytes32[] memory statementIds
    ) = _consumePaymentNotes(noteIds, chains, paymentAmount, totalAvailable);

    // Execute purchase
    ERC1155SecondaryMarket(marketplace).fulfillSaleListingTo{value: paymentAmount}(
      saleListingId,
      count,
      address(this)
    );

    // Wrap single token purchase into arrays
    uint256[] memory tokenIds = new uint256[](1);
    tokenIds[0] = tokenId;
    uint256[] memory counts = new uint256[](1);
    counts[0] = count;

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
  ) private view returns (uint256[] memory paymentNoteIds, uint256 totalAvailable) {
    // Validate all notes and sum available
    for (uint256 i = 0; i < noteIds.length; i++) {
      Note storage note = notes[noteIds[i]];
      require(note.chainHash != bytes32(0), "Note does not exist");

      bytes32 expectedHash = _verifyAndComputeChainHash(chains[i]);
      require(note.chainHash == expectedHash, "Invalid chain");
      require(_getLeafOwner(chains[i]) == caller, "Not the note owner");
      require(note.token == address(0), "Notes must hold ETH");

      totalAvailable += note.amount;
    }

    require(totalAvailable >= requiredPayment, "Insufficient funds in notes");

    paymentNoteIds = noteIds;
    return (paymentNoteIds, totalAvailable);
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

      // If amount reaches 0, delete the note
      if (notes[noteIds[i]].amount == 0) {
        delete notes[noteIds[i]];
      }
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
