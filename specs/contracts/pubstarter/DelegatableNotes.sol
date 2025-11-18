// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

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
contract DelegatableNotes is Context, ReentrancyGuard {
  using SafeERC20 for IERC20;

  struct Note {
    uint256 amount;
    address token;
    address owner;
    uint256 parentNoteId;
    bool delegated;
  }

  struct ChainCache {
    address[] owners; // owners[0] is leaf, owners[length-1] is root
    uint256 amount;
  }

  uint256 public nextNoteId = 1;
  mapping(uint256 => Note) public notes;

  // Events
  event NoteCreated(uint256 indexed noteId, address indexed owner, uint256 amount, address token, uint256 parentNoteId);
  event NoteDelegated(
    uint256 indexed parentNoteId,
    uint256 indexed childNoteId,
    address indexed delegate,
    uint256 amount
  );
  event NoteRevoked(uint256 indexed noteId, address indexed revoker);
  event FundsReclaimed(uint256 indexed noteId, address indexed owner, uint256 amount, address token);
  event ChainSplit(
    uint256 indexed originalLeafId,
    uint256 indexed splitLeafId,
    uint256 indexed remainderLeafId,
    uint256 splitAmount
  );
  event ERC20Swapped(
    address indexed funder,
    address indexed inputToken,
    address indexed outputToken,
    uint256 inputTokenAmount,
    uint256 outputTokenAmount,
    uint256 inputLeafNoteId,
    uint256 outputLeafNoteId
  );
  event NoteConsumed(uint256 indexed noteId, address indexed originalSource, uint256 amount);
  event InvestmentDistributed(address indexed originalSource, address indexed outputToken, uint256 amount);

  modifier onlyNoteOwner(uint256 noteId) {
    address owner = notes[noteId].owner;
    require(owner != address(0), "Note does not exist");
    require(owner == _msgSender(), "Not the note owner");
    _;
  }

  /**
   * @dev Deposit some amount of some token; get a delegatable note representing that amount of that token.
   * @param token The address of the ERC20 token to deposit.
   * @param amount The amount to deposit.
   * @return noteId The ID of the created note representing the deposited tokens.
   */
  function deposit(address token, uint256 amount) external nonReentrant returns (uint256) {
    require(amount > 0, "Amount must be greater than 0");

    address owner = _msgSender();

    uint256 noteId = nextNoteId++;
    notes[noteId] = Note({amount: amount, token: token, owner: owner, parentNoteId: 0, delegated: false});

    IERC20(token).safeTransferFrom(owner, address(this), amount);

    emit NoteCreated(noteId, owner, amount, token, 0);
    return noteId;
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

    // Delete the note BEFORE external call
    delete notes[noteId];

    // External call comes last
    IERC20(token).safeTransfer(owner, amount);

    emit FundsReclaimed(noteId, owner, amount, token);
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
   * @return delegatedNoteId The ID of the newly created note that is owned by the
   * delegate.
   * @return remainderNoteId The ID of the newly created note that represents the
   * remainder of the original note's amount. This will be zero if the entire amount
   * was delegated.
   */
  function delegate(
    uint256 noteId,
    address delegateTo,
    uint256 amountToDelegate
  ) external onlyNoteOwner(noteId) returns (uint256 delegatedNoteId, uint256 remainderNoteId) {
    Note storage note = notes[noteId];
    uint256 fullAmount = note.amount;
    require(!note.delegated, "Note already delegated");
    require(amountToDelegate > 0 && amountToDelegate <= fullAmount, "Invalid delegation amount");
    require(delegateTo != address(0), "Cannot delegate to zero address");

    uint256 remainderAmount = fullAmount - amountToDelegate;
    address token = note.token;

    _revertIfCircularDelegation(noteId, delegateTo);

    if (amountToDelegate == fullAmount) {
      // important to have this special case because no need to split the chain
      delegatedNoteId = _delegateFullAmount(noteId, delegateTo, amountToDelegate, token);
      return (delegatedNoteId, 0);
    } else {
      // Partial delegation - need to split the chain
      (uint256 splitLeafId, uint256 remainderLeafId) = _splitChain(noteId, amountToDelegate, remainderAmount, token);

      // Now delegate the split amount
      delegatedNoteId = _delegateFullAmount(splitLeafId, delegateTo, amountToDelegate, token);

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
    address token
  ) private returns (uint256) {
    notes[noteId].delegated = true;

    // Create child note owned by delegate
    uint256 delegatedNoteId = nextNoteId++;
    notes[delegatedNoteId] = Note({
      amount: amount,
      token: token,
      owner: delegateTo,
      parentNoteId: noteId,
      delegated: false
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

      uint256 splitChildNoteId = nextNoteId++;
      notes[splitChildNoteId] = Note({
        amount: amountToSplit,
        token: token,
        owner: originalOwner,
        parentNoteId: splitCurrentNoteId,
        delegated: false
      });

      uint256 remainderChildNoteId = nextNoteId++;
      notes[remainderChildNoteId] = Note({
        amount: remainderAmount,
        token: token,
        owner: originalOwner,
        parentNoteId: remainderCurrentNoteId,
        delegated: false
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
    while (true) {
      uint256 parentId = notes[currentId].parentNoteId;
      if (parentId == 0) {
        return notes[currentId].owner;
      }
      currentId = parentId;
    }
    revert("Unreachable");
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
  // The array will have the leaf owner at the start and the root owner at the end.
  function _deleteChainAndReturnOwners(uint256 leafNoteId) private returns (address[] memory) {
    uint256 chainLength = _countChainLength(leafNoteId);
    address[] memory owners = new address[](chainLength);
    uint256 currentNoteId = leafNoteId;
    for (uint256 i = 0; i < chainLength; i++) {
      owners[i] = notes[currentNoteId].owner;
      uint256 parentNoteId = notes[currentNoteId].parentNoteId;
      delete notes[currentNoteId]; // Delete the note as we traverse
      currentNoteId = parentNoteId;
    }
    return owners;
  }

  function _createChain(address token, uint256 amount, address[] memory owners) private returns (uint256) {
    uint256 lastCreatedNoteId = 0;
    // Need to start creating notes from the root to the leaf (because each
    // needs to point to the note that delegates to it), so we iterate backwards.
    // Looks weird to be doing i - 1, but this is the standard idiom because of
    // underflow; having a loop condition if i >= 0 would be an infinite loop.
    for (uint256 i = owners.length; i > 0; i--) {
      address owner = owners[i - 1];
      uint256 newNoteId = nextNoteId++;
      notes[newNoteId] = Note({
        amount: amount,
        token: token,
        owner: owner,
        parentNoteId: lastCreatedNoteId,
        delegated: i > 1
      });
      lastCreatedNoteId = newNoteId;
    }
    return lastCreatedNoteId; // this is the leaf note
  }

  /**
   * Swap tokens via DEX (1inch). Handles multiple notes with proportional returns.
   * WARNING: Hardcoded 1inch router address only works on mainnet.
   * TODO: Honestly, just remove DEX swapping from this contract; allow purchasing
   * from the Pubstarter contracts instead (ERC1155Seller and ERC1155Marketplace).
   */
  function purchaseERC20(
    uint256[] calldata noteIds,
    address inputToken,
    address outputToken,
    uint256 minOutputTokenAmount,
    bytes calldata swapData
  ) external nonReentrant {
    require(noteIds.length > 0, "Must provide at least one note");
    require(inputToken != outputToken, "Input and output tokens must be different");
    require(outputToken != address(0), "Output token cannot be zero address");

    address caller = _msgSender();
    uint256 totalInputTokenAmount = 0;

    // For tracking proportional returns and also recreating the new chain in the same shape as the old one.
    // Necessary because we want to delete the original notes before the DEX call, in case the DEX is malicious
    // (although of course we hope not to choose a malicious DEX).
    ChainCache[] memory chainCaches = new ChainCache[](noteIds.length);

    // Validate all notes, construct chain caches, and calculate total
    for (uint256 i = 0; i < noteIds.length; i++) {
      uint256 noteId = noteIds[i];
      Note storage note = notes[noteId];
      require(note.owner == caller, "Not the note owner");
      require(note.token == inputToken, "Not the specified source token");
      require(!note.delegated, "Can only fund with leaf notes");
      uint256 amount = note.amount;
      chainCaches[i] = ChainCache({owners: _deleteChainAndReturnOwners(noteId), amount: amount});
      totalInputTokenAmount += amount;
    }

    // Execute DEX swap
    uint256 balanceBefore = IERC20(outputToken).balanceOf(address(this));
    IERC20(inputToken).approve(address(0x1111111254fb6c44bAC0beD2854e76F90643097d), totalInputTokenAmount); // 1inch router
    // TODO: parse swapData to ensure it's swapping inputToken -> outputToken
    (bool success, bytes memory result) = address(0x1111111254fb6c44bAC0beD2854e76F90643097d).call(swapData);
    require(success, "DEX swap failed");
    uint256 balanceAfter = IERC20(outputToken).balanceOf(address(this));
    uint256 tokensReceived = balanceAfter - balanceBefore;
    uint256 totalOutputTokenAmount;
    assembly {
      totalOutputTokenAmount := mload(add(result, 0x20))
    }
    require(tokensReceived == totalOutputTokenAmount, "DEX returned incorrect amount");
    require(totalOutputTokenAmount >= minOutputTokenAmount, "Received fewer output tokens than we wanted");

    // Distribute investment returns proportionally; for each input note chain (which has been deleted),
    // we create a new chain of notes, with the same deletgation structure as the original notes,
    // but with the new output token and amount.
    uint256 totalOutputTokenAmountDistributedSoFar = 0;
    for (uint256 i = 0; i < noteIds.length; i++) {
      uint256 inputNoteId = noteIds[i];
      uint256 inputTokenAmount = chainCaches[i].amount;
      uint256 outputTokenAmount;
      if (i < noteIds.length - 1) {
        outputTokenAmount = (totalOutputTokenAmount * inputTokenAmount) / totalInputTokenAmount;
        totalOutputTokenAmountDistributedSoFar += outputTokenAmount;
      } else {
        // Last note gets the remainder, to avoid rounding issues.
        // Maybe this is slightly unfair, but I don't know what else to do and it probably doesn't matter.
        outputTokenAmount = totalOutputTokenAmount - totalOutputTokenAmountDistributedSoFar;
      }
      uint256 newLeafNoteId = _createChain(outputToken, outputTokenAmount, chainCaches[i].owners);
      emit ERC20Swapped(
        caller,
        inputToken,
        outputToken,
        inputTokenAmount,
        outputTokenAmount,
        inputNoteId,
        newLeafNoteId
      );
    }
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
}
