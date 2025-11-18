// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ERC1155Seller.sol";
import "./ERC1155Marketplace.sol";

/*
 * @title DelegatableNotes
 * @dev This contract allows users to create notes representing ownership of tokens,
 * but delegate those notes to someone else, so that the delegate can decide what to
 * do with them.
 *
 * Entry/exit: Money tokens (which can just be any token) "enter" the system when
 * the token owner Bob sends them to our delegation contract; a new note is created,
 * owned by Bob, with parentNoteId set to 0 and the delegated flag set to false. So
 * as far as the rest of the Ethereum ecosystem is concerned, this DelegatableNotes
 * contract is the owner of all the original tokens that anyone has put into the
 * system. (On the other end, it's the reverse: if you're the owner of an
 * undelegated root note, you can withdraw it from the contract.)
 *
 * Delegation/revocation: The owner of a note (e.g. Bob) can delegate his note to
 * someone else (e.g. Alice). This creates a new note that is owned by Alice, but
 * points to the original note as its parent. The original note is now marked as
 * "delegated". If Bob wishes, he can revoke his delegation later, which deletes
 * Alice's note (and any subsequent delegations from Alice) and marks Bob's note
 * as not-delegated.
 *
 * Terminal actions: The owner of a note can decide what to do with it. The only
 * kind of action currently supported is swapping them via a DEX aggregator.
 * 
 * Terminology:
 *   - "root" note: has no parent; the owner of this note is the original depositor.
 *   - "leaf" note: has no child; the owner of this note is the current delegate.
 *
 */
contract DelegatableNotes is Context, ReentrancyGuard, ERC1155Holder {
  using SafeERC20 for IERC20;

  enum TokenType { ERC20, ERC1155 }

  struct Note {
    uint256 amount;
    address token;
    TokenType tokenType;
    uint256 tokenId; // Only used for ERC1155 tokens
    address owner;
    uint256 parentNoteId;
    bool delegated;
    bytes32 intendedStatementId;
    uint256 commissionBasisPoints; // Commission in basis points (10000 = 100%)
  }

  struct DelegationChainSnapshot {
    address[] owners; // owners[0] is leaf, owners[length-1] is root
    uint256 amount;
    bytes32 intendedStatementId;
    uint256[] commissions; // Commission basis points for each level (parallel to owners)
  }

  uint256 public constant MAX_COMMISSION_BASIS_POINTS = 5000; // 50% max
  uint256 public constant BASIS_POINTS = 10000; // 100%

  uint256 public nextNoteId = 1;
  mapping(uint256 => Note) public notes;

  // Track accrued commissions: owner => token => tokenType => tokenId => amount
  mapping(address => mapping(address => mapping(TokenType => mapping(uint256 => uint256)))) public accruedCommissions;

  // Events
  event NoteCreated(
    uint256 indexed noteId,
    address indexed owner,
    uint256 amount,
    address token,
    TokenType tokenType,
    uint256 tokenId,
    uint256 parentNoteId
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
    address indexed paymentToken,
    address indexed erc1155Contract,
    uint256[] tokenIds,
    uint256[] counts,
    uint256 totalCost,
    uint256[] inputNoteIds,
    uint256[] outputNoteIds
  );
  event CommissionClaimed(
    address indexed owner,
    address indexed token,
    TokenType tokenType,
    uint256 tokenId,
    uint256 amount
  );

  // Allow contract to receive ETH
  receive() external payable {}

  modifier onlyNoteOwner(uint256 noteId) {
    address owner = notes[noteId].owner;
    require(owner != address(0), "Note does not exist");
    require(owner == _msgSender(), "Not the note owner");
    _;
  }

  /**
   * @dev Unified deposit function for ERC20, ETH, and ERC1155 tokens.
   * @param token The address of the token to deposit (use address(0) for ETH).
   * @param tokenType The type of token (ERC20 or ERC1155).
   * @param tokenId The ERC1155 token ID (ignored for ERC20/ETH, set to 0).
   * @param amount The amount to deposit (ignored for ETH, use msg.value instead).
   * @param intendedStatementId The IPFS CID (as bytes32) of the statement this note is intended to support.
   * @return noteId The ID of the created note representing the deposited tokens.
   */
  function deposit(
    address token,
    TokenType tokenType,
    uint256 tokenId,
    uint256 amount,
    bytes32 intendedStatementId
  ) public payable nonReentrant returns (uint256) {
    address owner = _msgSender();
    uint256 actualAmount;

    // Validate and transfer based on token type
    if (token == address(0)) {
      // ETH deposit
      require(msg.value > 0, "Must send ETH");
      require(tokenType == TokenType.ERC20, "ETH must use ERC20 type");
      actualAmount = msg.value;
      tokenId = 0;
    } else if (tokenType == TokenType.ERC20) {
      // ERC20 deposit
      require(amount > 0, "Amount must be greater than 0");
      require(msg.value == 0, "Do not send ETH for ERC20 deposits");
      actualAmount = amount;
      tokenId = 0;
      IERC20(token).safeTransferFrom(owner, address(this), amount);
    } else {
      // ERC1155 deposit
      require(amount > 0, "Amount must be greater than 0");
      require(msg.value == 0, "Do not send ETH for ERC1155 deposits");
      actualAmount = amount;
      IERC1155(token).safeTransferFrom(owner, address(this), tokenId, amount, "");
    }

    // Create note
    uint256 noteId = nextNoteId++;
    notes[noteId] = Note({
      amount: actualAmount,
      token: token,
      tokenType: tokenType,
      tokenId: tokenId,
      owner: owner,
      parentNoteId: 0,
      delegated: false,
      intendedStatementId: intendedStatementId,
      commissionBasisPoints: 0
    });

    emit NoteCreated(noteId, owner, actualAmount, token, tokenType, tokenId, 0);
    return noteId;
  }

  /**
   * @dev Deposit ERC20 tokens; get a delegatable note representing that amount of that token.
   * Convenience wrapper around the unified deposit function.
   * @param token The address of the ERC20 token to deposit.
   * @param amount The amount to deposit.
   * @param intendedStatementId The IPFS CID (as bytes32) of the statement this note is intended to support.
   * @return noteId The ID of the created note representing the deposited tokens.
   */
  function depositERC20(address token, uint256 amount, bytes32 intendedStatementId) external returns (uint256) {
    require(token != address(0), "Use depositETH for ETH deposits");
    return deposit(token, TokenType.ERC20, 0, amount, intendedStatementId);
  }

  /**
   * @dev Deposit ETH; get a delegatable note representing that amount of ETH.
   * Convenience wrapper around the unified deposit function.
   * @param intendedStatementId The IPFS CID (as bytes32) of the statement this note is intended to support.
   * @return noteId The ID of the created note representing the deposited ETH.
   */
  function depositETH(bytes32 intendedStatementId) external payable returns (uint256) {
    return deposit(address(0), TokenType.ERC20, 0, 0, intendedStatementId);
  }

  /**
   * @dev Deposit ERC1155 tokens; get a delegatable note representing those tokens.
   * Convenience wrapper around the unified deposit function.
   * @param token The address of the ERC1155 token contract.
   * @param tokenId The ERC1155 token ID to deposit.
   * @param amount The amount to deposit.
   * @param intendedStatementId The IPFS CID (as bytes32) of the statement this note is intended to support.
   * @return noteId The ID of the created note representing the deposited tokens.
   */
  function depositERC1155(
    address token,
    uint256 tokenId,
    uint256 amount,
    bytes32 intendedStatementId
  ) external returns (uint256) {
    return deposit(token, TokenType.ERC1155, tokenId, amount, intendedStatementId);
  }

  /**
   * @dev Reclaim funds from a note that is both a root and a leaf (i.e. no parent and also undelegated).
   * This allows the original depositor to reclaim their funds.
   * @param noteId The ID of the note to reclaim funds from.
   */
  function reclaimFunds(uint256 noteId) external onlyNoteOwner(noteId) nonReentrant {
    Note storage note = notes[noteId];
    require(note.parentNoteId == 0, "Can only reclaim from root notes");
    require(!note.delegated, "Cannot reclaim from delegated notes");

    address owner = _msgSender();

    // Cache values before deletion
    address token = note.token;
    uint256 amount = note.amount;
    TokenType tokenType = note.tokenType;
    uint256 tokenId = note.tokenId;

    // Delete the note BEFORE external call
    delete notes[noteId];

    // External call comes last
    if (tokenType == TokenType.ERC20) {
      if (token == address(0)) {
        // ETH
        payable(owner).transfer(amount);
      } else {
        // ERC20
        IERC20(token).safeTransfer(owner, amount);
      }
    } else {
      // ERC1155
      IERC1155(token).safeTransferFrom(address(this), owner, tokenId, amount, "");
    }

    emit FundsReclaimed(noteId, owner, amount, token, tokenType, tokenId);
  }

  /**
   * @dev Revoke your delegation of a note.
   * @param noteId The ID of the *leaf* note to revoke, *not* the note that you control.
   * This function will start at the leaf note and traverse backward through the
   * delegation chain, deleting all notes until it reaches the note that you own.
   * It will then mark your note as not-delegated.
   */
  function revoke(uint256 noteId) external {
    Note storage note = notes[noteId];
    require(note.owner != address(0), "Note does not exist");
    require(!note.delegated, "Can only revoke leaf notes");

    address caller = _msgSender();

    // Traverse backward from leaf, deleting notes until we reach caller's note
    uint256 currentId = noteId;
    while (note.owner != caller) {
      // Cache parent before deleting the note
      uint256 parentId = note.parentNoteId;

      // Delete the current note (because it's part of the delegation chain that we're revoking)
      delete notes[currentId];
      emit NoteRevoked(currentId, caller);

      if (parentId == 0) {
        revert("Reached root without finding caller's note");
      }

      currentId = parentId;
      note = notes[currentId];
    }
    note.delegated = false;
  }

  /**
   * @dev Delegate a note (full or partial amount)
   * @param noteId The ID of the note to delegate.
   * @param delegateTo The address to delegate the note to.
   * @param amountToDelegate The amount to delegate. If this is less than the full
   * amount of the note, the *entire chain* will be split into two parallel chains:
   * one with the delegated amount and one with the remainder.
   * @param commissionBasisPoints Commission in basis points (0-5000, i.e., 0-50%)
   * that the delegate can claim when the note is spent. The delegate can pass on
   * some or all of this commission to subdelegates.
   * @return delegatedNoteId The ID of the newly created note that is owned by the
   * delegate.
   * @return remainderNoteId The ID of the newly created note that represents the
   * remainder of the original note's amount. This will be zero if the entire amount
   * was delegated.
   */
  function delegate(
    uint256 noteId,
    address delegateTo,
    uint256 amountToDelegate,
    uint256 commissionBasisPoints
  ) external onlyNoteOwner(noteId) returns (uint256 delegatedNoteId, uint256 remainderNoteId) {
    Note storage note = notes[noteId];
    uint256 fullAmount = note.amount;
    require(!note.delegated, "Note already delegated");
    require(amountToDelegate > 0 && amountToDelegate <= fullAmount, "Invalid delegation amount");
    require(delegateTo != address(0), "Cannot delegate to zero address");
    require(commissionBasisPoints <= MAX_COMMISSION_BASIS_POINTS, "Commission too high");

    // If this is a child note, the new commission cannot exceed the parent's remaining commission
    if (note.parentNoteId != 0) {
      require(commissionBasisPoints <= note.commissionBasisPoints, "Commission exceeds parent's allowance");
    }

    uint256 remainderAmount = fullAmount - amountToDelegate;
    address token = note.token;

    _revertIfCircularDelegation(noteId, delegateTo);

    if (amountToDelegate == fullAmount) {
      // important to have this special case because no need to split the chain
      delegatedNoteId = _delegateFullAmount(noteId, delegateTo, amountToDelegate, token, commissionBasisPoints);
      return (delegatedNoteId, 0);
    } else {
      // Partial delegation - need to split the chain
      (uint256 splitLeafId, uint256 remainderLeafId) = _splitChain(noteId, amountToDelegate, remainderAmount, token);

      // Now delegate the split amount
      delegatedNoteId = _delegateFullAmount(splitLeafId, delegateTo, amountToDelegate, token, commissionBasisPoints);

      emit NoteDelegated(noteId, splitLeafId, delegateTo, amountToDelegate);
      return (splitLeafId, remainderLeafId);
    }
  }

  // Helper function to delegate a full note amount.
  // This is simple: just create a new note that points to the
  // original note, and mark the original note as delegated.
  // Returns the ID of the newly created note.
  function _delegateFullAmount(
    uint256 noteId,
    address delegateTo,
    uint256 amount,
    address token,
    uint256 commissionBasisPoints
  ) private returns (uint256) {
    Note storage note = notes[noteId];
    bytes32 intendedStatementId = note.intendedStatementId;
    TokenType tokenType = note.tokenType;
    uint256 tokenId = note.tokenId;
    note.delegated = true;

    // Create child note owned by delegate
    uint256 delegatedNoteId = nextNoteId++;
    notes[delegatedNoteId] = Note({
      amount: amount,
      token: token,
      tokenType: tokenType,
      tokenId: tokenId,
      owner: delegateTo,
      parentNoteId: noteId,
      delegated: false,
      intendedStatementId: intendedStatementId,
      commissionBasisPoints: commissionBasisPoints
    });

    emit NoteDelegated(noteId, delegatedNoteId, delegateTo, amount);

    return delegatedNoteId;
  }

  // Helper function to split a chain into two parallel chains.
  // This is used when delegating a partial amount of a note.
  // It creates two new chains: one with the delegated amount
  // and one with the remainder. It also deletes the entire
  // original chain.
  function _splitChain(
    uint256 leafNoteId,
    uint256 amountToSplit,
    uint256 remainderAmount,
    address token
  ) private returns (uint256 splitLeafNoteId, uint256 remainderLeafNoteId) {
    // Get values from the chain (all notes in chain have same values)
    Note storage leafNote = notes[leafNoteId];
    bytes32 intendedStatementId = leafNote.intendedStatementId;
    TokenType tokenType = leafNote.tokenType;
    uint256 tokenId = leafNote.tokenId;

    // Build an array of the chain's note IDs, with the leaf at the start and
    // the root at the end.
    uint256 chainLength = _countChainLength(leafNoteId);
    uint256[] memory chainIds = new uint256[](chainLength);
    uint256 currentId = leafNoteId;
    for (uint256 i = 0; i < chainLength; i++) {
      chainIds[i] = currentId;
      currentId = notes[currentId].parentNoteId;
    }

    // Single loop to create both chains
    uint256 splitCurrentNoteId = 0;
    uint256 remainderCurrentNoteId = 0;

    // Iterate backwards through the chain, creating new notes. (Goes backwards
    // because we need each new note to point to the previous one as its parent,
    // so we have to start from the root.)
    // Looks weird to be doing i - 1, but this is the standard idiom because of
    // underflow; having a loop condition if i >= 0 would be an infinite loop.
    for (uint256 i = chainLength; i > 0; i--) {
      uint256 originalNoteId = chainIds[i - 1];
      Note storage originalNote = notes[originalNoteId];
      address originalOwner = originalNote.owner;

      uint256 originalCommission = originalNote.commissionBasisPoints;

      uint256 splitChildNoteId = nextNoteId++;
      notes[splitChildNoteId] = Note({
        amount: amountToSplit,
        token: token,
        tokenType: tokenType,
        tokenId: tokenId,
        owner: originalOwner,
        parentNoteId: splitCurrentNoteId,
        delegated: false,
        intendedStatementId: intendedStatementId,
        commissionBasisPoints: originalCommission
      });

      uint256 remainderChildNoteId = nextNoteId++;
      notes[remainderChildNoteId] = Note({
        amount: remainderAmount,
        token: token,
        tokenType: tokenType,
        tokenId: tokenId,
        owner: originalOwner,
        parentNoteId: remainderCurrentNoteId,
        delegated: false,
        intendedStatementId: intendedStatementId,
        commissionBasisPoints: originalCommission
      });

      // Update parent IDs for next iteration
      splitCurrentNoteId = splitChildNoteId;
      remainderCurrentNoteId = remainderChildNoteId;

      // Delete the original note now that we're done with it
      delete notes[originalNoteId];
    }

    emit ChainSplit(leafNoteId, splitCurrentNoteId, remainderCurrentNoteId, amountToSplit);
    return (splitCurrentNoteId, remainderCurrentNoteId);
  }

  /**
   * @dev Get the address that originally deposited the funds for a note chain.
   * This function traverses the delegation chain starting from the given note
   * ID, and returns the owner of the root note.
   * @param noteId The ID of the note to start from.
   */
  function getDepositor(uint256 noteId) public view returns (address) {
    uint256 currentId = noteId;
    while (notes[currentId].parentNoteId != 0) {
      currentId = notes[currentId].parentNoteId;
    }
    return notes[currentId].owner;
  }

  /**
   * @dev Get the full delegation chain for a note, from leaf to root.
   * Returns arrays of note IDs and owner addresses in the chain.
   * The first element is the given note (leaf), the last is the root.
   * @param noteId The ID of the note to get the chain for.
   * @return noteIds Array of note IDs in the delegation chain
   * @return owners Array of owner addresses corresponding to each note
   */
  function getChain(uint256 noteId) public view returns (uint256[] memory noteIds, address[] memory owners) {
    require(notes[noteId].owner != address(0), "Note does not exist");

    // First, count the chain length
    uint256 chainLength = _countChainLength(noteId);

    // Allocate arrays
    noteIds = new uint256[](chainLength);
    owners = new address[](chainLength);

    // Fill arrays from leaf to root
    uint256 currentId = noteId;
    for (uint256 i = 0; i < chainLength; i++) {
      noteIds[i] = currentId;
      owners[i] = notes[currentId].owner;
      currentId = notes[currentId].parentNoteId;
    }

    return (noteIds, owners);
  }

  /**
   * @dev Validate that multiple notes are compatible for being spent together.
   * Notes are compatible if they all have the same owner, token, tokenType, and tokenId (for ERC1155).
   * This is useful before calling functions like purchaseFromERC1155Seller.
   * @param noteIds Array of note IDs to validate
   * @return isValid True if all notes are compatible, false otherwise
   * @return errorMessage Description of why notes are incompatible (empty if valid)
   */
  function validateNotesCompatible(uint256[] calldata noteIds)
    public
    view
    returns (bool isValid, string memory errorMessage)
  {
    if (noteIds.length == 0) {
      return (false, "No notes provided");
    }

    // Get reference values from first note
    Note storage firstNote = notes[noteIds[0]];

    if (firstNote.owner == address(0)) {
      return (false, "First note does not exist");
    }

    address expectedOwner = firstNote.owner;
    address expectedToken = firstNote.token;
    TokenType expectedTokenType = firstNote.tokenType;
    uint256 expectedTokenId = firstNote.tokenId;

    // Check all notes match
    for (uint256 i = 0; i < noteIds.length; i++) {
      Note storage note = notes[noteIds[i]];

      if (note.owner == address(0)) {
        return (false, "Note does not exist");
      }

      if (note.owner != expectedOwner) {
        return (false, "Notes have different owners");
      }

      if (note.delegated) {
        return (false, "Cannot spend delegated notes");
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

  function _countChainLength(uint256 leafNoteId) private view returns (uint256) {
    uint256 chainLength = 0;
    uint256 currentNoteId = leafNoteId;

    // Count chain length: needs to be done before we can build arrays to represent the chain,
    // because IIUC Solidity doesn't allow dynamically-sized arrays.
    while (currentNoteId != 0) {
      chainLength++;
      currentNoteId = notes[currentNoteId].parentNoteId;
    }

    return chainLength;
  }

  // Helper function to get the whole delegation chain for a particular leaf note,
  // deleting the chain in the process.
  // The arrays will have the leaf at the start and the root at the end.
  function _deleteChainAndReturnOwnersAndCommissions(uint256 leafNoteId)
    private
    returns (address[] memory owners, uint256[] memory commissions)
  {
    uint256 chainLength = _countChainLength(leafNoteId);
    owners = new address[](chainLength);
    commissions = new uint256[](chainLength);
    uint256 currentNoteId = leafNoteId;
    for (uint256 i = 0; i < chainLength; i++) {
      owners[i] = notes[currentNoteId].owner;
      commissions[i] = notes[currentNoteId].commissionBasisPoints;
      uint256 parentNoteId = notes[currentNoteId].parentNoteId;
      delete notes[currentNoteId]; // Delete the note as we traverse
      currentNoteId = parentNoteId;
    }
    return (owners, commissions);
  }

  // Helper function to delete a chain and return a DelegationChainSnapshot with all relevant info
  function _deleteChainAndCache(uint256 leafNoteId) private returns (DelegationChainSnapshot memory) {
    Note storage leafNote = notes[leafNoteId];
    uint256 amount = leafNote.amount;
    bytes32 intendedStatementId = leafNote.intendedStatementId;

    (address[] memory owners, uint256[] memory commissions) = _deleteChainAndReturnOwnersAndCommissions(leafNoteId);

    return DelegationChainSnapshot({
      owners: owners,
      amount: amount,
      intendedStatementId: intendedStatementId,
      commissions: commissions
    });
  }

  function _createChain(
    address token,
    TokenType tokenType,
    uint256 tokenId,
    uint256 amount,
    address[] memory owners,
    bytes32 intendedStatementId,
    uint256[] memory commissions
  ) private returns (uint256) {
    uint256 lastCreatedNoteId = 0;
    // Need to start creating notes from the root to the leaf (because each
    // needs to point to the note that delegates to it), so we iterate backwards.
    // Looks weird to be doing i - 1, but this is the standard idiom because of
    // underflow; having a loop condition if i >= 0 would be an infinite loop.
    for (uint256 i = owners.length; i > 0; i--) {
      address owner = owners[i - 1];
      uint256 commission = commissions[i - 1];
      uint256 newNoteId = nextNoteId++;
      notes[newNoteId] = Note({
        amount: amount,
        token: token,
        tokenType: tokenType,
        tokenId: tokenId,
        owner: owner,
        parentNoteId: lastCreatedNoteId,
        delegated: i > 1,
        intendedStatementId: intendedStatementId,
        commissionBasisPoints: commission
      });
      lastCreatedNoteId = newNoteId;
    }
    return lastCreatedNoteId; // this is the leaf note
  }

  /**
   * @dev Purchase ERC1155 tokens from an ERC1155Seller contract using ETH from notes.
   * Notes must hold the zero address as their token (representing ETH).
   * The purchased ERC1155 tokens are wrapped in new notes that preserve the delegation
   * chains from the input notes.
   * @param noteIds Array of note IDs to spend (must all be ETH notes with same owner)
   * @param seller Address of the ERC1155Seller contract
   * @param erc1155Contract Address of the ERC1155 token contract
   * @param tokenIds Array of ERC1155 token IDs to purchase
   * @param counts Array of counts for each token ID
   */
  function purchaseFromERC1155Seller(
    uint256[] calldata noteIds,
    address payable seller,
    address erc1155Contract,
    uint256[] calldata tokenIds,
    uint256[] calldata counts
  ) external nonReentrant {
    require(noteIds.length > 0, "Must provide at least one note");
    require(tokenIds.length == counts.length, "Token IDs and counts length mismatch");

    address caller = _msgSender();
    uint256 totalPaymentAmount = 0;

    // Cache chains before deleting - following checks-effects-interactions pattern
    DelegationChainSnapshot[] memory chainCaches = new DelegationChainSnapshot[](noteIds.length);

    // Validate all notes, cache chains, and accumulate ETH
    for (uint256 i = 0; i < noteIds.length; i++) {
      uint256 noteId = noteIds[i];
      Note storage note = notes[noteId];
      require(note.owner == caller, "Not the note owner");
      require(note.token == address(0), "Notes must hold ETH (token = address(0))");
      require(!note.delegated, "Can only spend leaf notes");

      // Cache and delete the chain
      chainCaches[i] = _deleteChainAndCache(noteId);
      totalPaymentAmount += chainCaches[i].amount;

      // Accrue commissions for this chain
      _accrueCommissions(
        chainCaches[i].owners,
        chainCaches[i].commissions,
        address(0), // ETH
        TokenType.ERC20,
        0,
        chainCaches[i].amount
      );
    }

    // Purchase from the ERC1155Seller contract (external call after state changes)
    // Tokens are sent to this contract
    ERC1155Seller(seller).buyERC1155{value: totalPaymentAmount}(
      address(this),
      erc1155Contract,
      tokenIds,
      counts,
      ""
    );

    // Calculate total tokens purchased
    uint256 totalTokensPurchased = 0;
    for (uint256 i = 0; i < counts.length; i++) {
      totalTokensPurchased += counts[i];
    }

    // Recreate delegation chains for each purchased token, distributed proportionally
    uint256[] memory outputNoteIds = new uint256[](tokenIds.length * noteIds.length);
    uint256 outputNoteIndex = 0;

    for (uint256 tokenIndex = 0; tokenIndex < tokenIds.length; tokenIndex++) {
      uint256 tokenId = tokenIds[tokenIndex];
      uint256 tokenCount = counts[tokenIndex];
      uint256 tokensDistributedSoFar = 0;

      // Distribute this token type proportionally across all input note chains
      for (uint256 chainIndex = 0; chainIndex < noteIds.length; chainIndex++) {
        uint256 proportionalTokens;

        if (chainIndex < noteIds.length - 1) {
          // Proportional distribution
          proportionalTokens = (tokenCount * chainCaches[chainIndex].amount) / totalPaymentAmount;
          tokensDistributedSoFar += proportionalTokens;
        } else {
          // Last chain gets remainder to avoid rounding issues
          proportionalTokens = tokenCount - tokensDistributedSoFar;
        }

        // Only create a note if there are tokens to distribute
        if (proportionalTokens > 0) {
          uint256 newLeafNoteId = _createChain(
            erc1155Contract,
            TokenType.ERC1155,
            tokenId,
            proportionalTokens,
            chainCaches[chainIndex].owners,
            chainCaches[chainIndex].intendedStatementId,
            chainCaches[chainIndex].commissions
          );
          outputNoteIds[outputNoteIndex++] = newLeafNoteId;
        }
      }
    }

    // Resize outputNoteIds array to actual size
    uint256[] memory finalOutputNoteIds = new uint256[](outputNoteIndex);
    for (uint256 i = 0; i < outputNoteIndex; i++) {
      finalOutputNoteIds[i] = outputNoteIds[i];
    }

    emit ERC1155Purchased(
      caller,
      address(0), // ETH
      erc1155Contract,
      tokenIds,
      counts,
      totalPaymentAmount,
      noteIds,
      finalOutputNoteIds
    );
  }

  /**
   * @dev Purchase ERC1155 tokens from an ERC1155Marketplace by fulfilling a sale listing.
   * The purchased tokens are wrapped in new notes that preserve the delegation chains
   * from the input notes.
   * @param noteIds Array of note IDs to spend (must all be ETH notes)
   * @param marketplace Address of the ERC1155Marketplace contract
   * @param saleListingId The ID of the sale listing to fulfill
   * @param count Number of tokens to purchase from the listing
   */
  function purchaseFromERC1155Marketplace(
    uint256[] calldata noteIds,
    address marketplace,
    uint256 saleListingId,
    uint256 count
  ) external nonReentrant {
    require(noteIds.length > 0, "Must provide at least one note");

    address caller = _msgSender();
    uint256 totalPaymentAmount = 0;

    // Get the listing details to know how much we need to pay
    (address seller, uint256 tokenId, uint256 listingCount, uint256 pricePerToken) =
      ERC1155Marketplace(marketplace).getSaleListing(saleListingId);

    require(seller != address(0), "Listing does not exist");
    require(count <= listingCount, "Not enough tokens in listing");

    uint256 requiredPayment = count * pricePerToken;

    // Cache chains before deleting - following checks-effects-interactions pattern
    DelegationChainSnapshot[] memory chainCaches = new DelegationChainSnapshot[](noteIds.length);

    // Validate, cache chains, and accumulate ETH from notes
    for (uint256 i = 0; i < noteIds.length; i++) {
      uint256 noteId = noteIds[i];
      Note storage note = notes[noteId];
      require(note.owner == caller, "Not the note owner");
      require(note.token == address(0), "Notes must hold ETH (token = address(0))");
      require(!note.delegated, "Can only spend leaf notes");

      // Cache and delete the chain
      chainCaches[i] = _deleteChainAndCache(noteId);
      totalPaymentAmount += chainCaches[i].amount;

      // Accrue commissions for this chain
      _accrueCommissions(
        chainCaches[i].owners,
        chainCaches[i].commissions,
        address(0), // ETH
        TokenType.ERC20,
        0,
        chainCaches[i].amount
      );
    }

    require(totalPaymentAmount >= requiredPayment, "Insufficient funds in notes");

    // Get the ERC1155 contract address before making the purchase
    address erc1155Contract = address(ERC1155Marketplace(marketplace).erc1155());

    // Purchase from marketplace - tokens sent directly to this contract
    ERC1155Marketplace(marketplace).fulfillSaleListingTo{value: requiredPayment}(
      saleListingId,
      count,
      address(this)
    );

    // Distribute purchased tokens proportionally across all input note chains
    uint256[] memory outputNoteIds = new uint256[](noteIds.length);
    uint256 tokensDistributedSoFar = 0;
    uint256 outputNoteIndex = 0;

    for (uint256 i = 0; i < noteIds.length; i++) {
      uint256 proportionalTokens;

      if (i < noteIds.length - 1) {
        // Proportional distribution based on ETH contributed
        proportionalTokens = (count * chainCaches[i].amount) / requiredPayment;
        tokensDistributedSoFar += proportionalTokens;
      } else {
        // Last chain gets remainder to avoid rounding issues
        proportionalTokens = count - tokensDistributedSoFar;
      }

      // Only create a note if there are tokens to distribute
      if (proportionalTokens > 0) {
        uint256 newLeafNoteId = _createChain(
          erc1155Contract,
          TokenType.ERC1155,
          tokenId,
          proportionalTokens,
          chainCaches[i].owners,
          chainCaches[i].intendedStatementId,
          chainCaches[i].commissions
        );
        outputNoteIds[outputNoteIndex++] = newLeafNoteId;
      }
    }

    // If there's any leftover ETH, return it to caller
    if (totalPaymentAmount > requiredPayment) {
      payable(caller).transfer(totalPaymentAmount - requiredPayment);
    }

    // Resize outputNoteIds array to actual size
    uint256[] memory finalOutputNoteIds = new uint256[](outputNoteIndex);
    for (uint256 i = 0; i < outputNoteIndex; i++) {
      finalOutputNoteIds[i] = outputNoteIds[i];
    }

    // Emit event
    uint256[] memory tokenIds = new uint256[](1);
    tokenIds[0] = tokenId;
    uint256[] memory counts = new uint256[](1);
    counts[0] = count;

    emit ERC1155Purchased(
      caller,
      address(0), // ETH
      erc1155Contract,
      tokenIds,
      counts,
      requiredPayment,
      noteIds,
      finalOutputNoteIds
    );
  }

  function _revertIfCircularDelegation(uint256 noteId, address delegateTo) private view {
    uint256 currentId = noteId;

    while (currentId != 0) {
      if (notes[currentId].owner == delegateTo) {
        revert("Circular delegation detected");
      }
      currentId = notes[currentId].parentNoteId;
    }
  }

  /**
   * @dev Accrue commissions to delegates in the chain when a note is spent
   * @param owners Array of owners in the delegation chain (leaf to root)
   * @param commissions Array of commission basis points for each level
   * @param token The token being spent
   * @param tokenType The type of token
   * @param tokenId The token ID (for ERC1155)
   * @param amount The total amount being spent
   */
  function _accrueCommissions(
    address[] memory owners,
    uint256[] memory commissions,
    address token,
    TokenType tokenType,
    uint256 tokenId,
    uint256 amount
  ) private {
    // Skip the root (last element) - they don't get commission
    // Commission is paid to intermediate delegates, not the original owner
    for (uint256 i = 0; i < owners.length - 1; i++) {
      if (commissions[i] > 0) {
        uint256 commissionAmount = (amount * commissions[i]) / BASIS_POINTS;
        if (commissionAmount > 0) {
          accruedCommissions[owners[i]][token][tokenType][tokenId] += commissionAmount;
        }
      }
    }
  }

  /**
   * @dev Claim accrued commissions
   * @param token The token address (use address(0) for ETH)
   * @param tokenType The type of token (ERC20 or ERC1155)
   * @param tokenId The token ID (only relevant for ERC1155, use 0 for ERC20/ETH)
   */
  function claimCommission(
    address token,
    TokenType tokenType,
    uint256 tokenId
  ) external nonReentrant {
    address owner = _msgSender();
    uint256 amount = accruedCommissions[owner][token][tokenType][tokenId];
    require(amount > 0, "No commission to claim");

    // Delete before external call (checks-effects-interactions)
    delete accruedCommissions[owner][token][tokenType][tokenId];

    // Transfer the commission
    if (tokenType == TokenType.ERC20) {
      if (token == address(0)) {
        // ETH
        payable(owner).transfer(amount);
      } else {
        // ERC20
        IERC20(token).safeTransfer(owner, amount);
      }
    } else {
      // ERC1155
      IERC1155(token).safeTransferFrom(address(this), owner, tokenId, amount, "");
    }

    emit CommissionClaimed(owner, token, tokenType, tokenId, amount);
  }

  /**
   * @dev View function to check accrued commission
   * @param owner The address to check
   * @param token The token address
   * @param tokenType The type of token
   * @param tokenId The token ID (for ERC1155)
   * @return The amount of accrued commission
   */
  function getAccruedCommission(
    address owner,
    address token,
    TokenType tokenType,
    uint256 tokenId
  ) external view returns (uint256) {
    return accruedCommissions[owner][token][tokenType][tokenId];
  }
}
