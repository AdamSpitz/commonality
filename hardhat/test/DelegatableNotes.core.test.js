import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("DelegatableNotes - Core Functionality", function () {
  let notes;
  let alice, bob, charlie, dave;
  let statementId;

  beforeEach(async function () {
    [alice, bob, charlie, dave] = await ethers.getSigners();
    const DelegatableNotes = await ethers.getContractFactory("DelegatableNotes");
    notes = await DelegatableNotes.deploy();
    statementId = ethers.encodeBytes32String("test-statement");
  });

  describe("ETH Deposits and Withdrawals", function () {
    it("Should allow depositing ETH", async function () {
      const amount = ethers.parseEther("1.0");

      await expect(notes.connect(alice).depositETH(statementId, { value: amount }))
        .to.emit(notes, "NoteCreated")
        .withArgs(1, alice.address, amount, ethers.ZeroAddress, 0, 0, 0);

      const note = await notes.notes(1);
      expect(note.amount).to.equal(amount);
      expect(note.token).to.equal(ethers.ZeroAddress);
      expect(note.owner).to.equal(alice.address);
      expect(note.parentNoteId).to.equal(0);
      expect(note.delegated).to.equal(false);
      expect(note.intendedStatementId).to.equal(statementId);
    });

    it("Should allow reclaiming ETH from undelegated root note", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });

      const balanceBefore = await ethers.provider.getBalance(alice.address);
      const tx = await notes.connect(alice).reclaimFunds(1);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(alice.address);

      // Should get back the deposited amount minus gas
      expect(balanceAfter).to.be.closeTo(balanceBefore + amount - gasCost, ethers.parseEther("0.0001"));
    });

    it("Should not allow reclaiming delegated note", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount);

      await expect(notes.connect(alice).reclaimFunds(1))
        .to.be.revertedWith("Cannot reclaim from delegated notes");
    });

    it("Should not allow reclaiming child note", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount);

      await expect(notes.connect(bob).reclaimFunds(2))
        .to.be.revertedWith("Can only reclaim from root notes");
    });

    it("Should not allow non-owner to reclaim", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });

      await expect(notes.connect(bob).reclaimFunds(1))
        .to.be.revertedWith("Not the note owner");
    });
  });

  describe("Full Delegation", function () {
    it("Should allow delegating full amount", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });

      await expect(notes.connect(alice).delegate(1, bob.address, amount))
        .to.emit(notes, "NoteDelegated")
        .withArgs(1, 2, bob.address, amount);

      const parentNote = await notes.notes(1);
      expect(parentNote.delegated).to.equal(true);

      const childNote = await notes.notes(2);
      expect(childNote.owner).to.equal(bob.address);
      expect(childNote.parentNoteId).to.equal(1);
      expect(childNote.delegated).to.equal(false);
      expect(childNote.amount).to.equal(amount);
    });

    it("Should allow multi-level delegation", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount);
      await notes.connect(bob).delegate(2, charlie.address, amount);

      const charlieNote = await notes.notes(3);
      expect(charlieNote.owner).to.equal(charlie.address);
      expect(charlieNote.parentNoteId).to.equal(2);

      // Check full chain
      const [noteIds, owners] = await notes.getChain(3);
      expect(noteIds.length).to.equal(3);
      expect(owners[0]).to.equal(charlie.address); // leaf
      expect(owners[1]).to.equal(bob.address);
      expect(owners[2]).to.equal(alice.address); // root
    });

    it("Should not allow delegating to zero address", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });

      await expect(notes.connect(alice).delegate(1, ethers.ZeroAddress, amount))
        .to.be.revertedWith("Cannot delegate to zero address");
    });

    it("Should not allow delegating already delegated note", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount);

      await expect(notes.connect(alice).delegate(1, charlie.address, amount))
        .to.be.revertedWith("Note already delegated");
    });

    it("Should not allow non-owner to delegate", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });

      await expect(notes.connect(bob).delegate(1, charlie.address, amount))
        .to.be.revertedWith("Not the note owner");
    });
  });

  describe("Partial Delegation (Chain Splitting)", function () {
    it("Should split chain when delegating partial amount", async function () {
      const amount = ethers.parseEther("10.0");
      const delegateAmount = ethers.parseEther("3.0");

      await notes.connect(alice).depositETH(statementId, { value: amount });

      const [delegatedId, remainderId] = await notes.connect(alice).delegate.staticCall(
        1, bob.address, delegateAmount
      );

      await notes.connect(alice).delegate(1, bob.address, delegateAmount);

      // Original note should be deleted
      const originalNote = await notes.notes(1);
      expect(originalNote.owner).to.equal(ethers.ZeroAddress);

      // Split note should be delegated to Bob, and marked as delegated
      const splitNote = await notes.notes(delegatedId);
      expect(splitNote.amount).to.equal(delegateAmount);
      expect(splitNote.owner).to.equal(alice.address);
      expect(splitNote.delegated).to.equal(true);

      // Remainder note should have remaining amount and remain with Alice
      const remainderNote = await notes.notes(remainderId);
      expect(remainderNote.amount).to.equal(amount - delegateAmount);
      expect(remainderNote.owner).to.equal(alice.address);
      expect(remainderNote.delegated).to.equal(false);

      // Bob's note should be a child of the split note
      // We need to find it by checking which note has delegatedId as parent
      const bobNoteId = delegatedId + 2n; // Split at 2, remainder at 3, Bob at 4
      const bobNote = await notes.notes(bobNoteId);
      expect(bobNote.owner).to.equal(bob.address);
      expect(bobNote.amount).to.equal(delegateAmount);
      expect(bobNote.parentNoteId).to.equal(delegatedId);
    });

    it("Should emit ChainSplit event", async function () {
      const amount = ethers.parseEther("10.0");
      const delegateAmount = ethers.parseEther("3.0");

      await notes.connect(alice).depositETH(statementId, { value: amount });

      await expect(notes.connect(alice).delegate(1, bob.address, delegateAmount))
        .to.emit(notes, "ChainSplit");
    });

    it("Should handle splitting multi-level delegation chain", async function () {
      const amount = ethers.parseEther("10.0");

      // Create 3-level chain
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount);
      await notes.connect(bob).delegate(2, charlie.address, amount);

      // Charlie splits his note
      const [splitId, remainderId] = await notes.connect(charlie).delegate.staticCall(
        3, dave.address, ethers.parseEther("3.0")
      );

      await notes.connect(charlie).delegate(3, dave.address, ethers.parseEther("3.0"));

      // Should create two parallel 3-level chains
      const splitChain = await notes.getChain(splitId);
      const remainderChain = await notes.getChain(remainderId);

      expect(splitChain.noteIds.length).to.equal(3);
      expect(remainderChain.noteIds.length).to.equal(3);
    });
  });

  describe("Circular Delegation Prevention", function () {
    it("Should prevent direct circular delegation", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount);

      await expect(notes.connect(bob).delegate(2, alice.address, amount))
        .to.be.revertedWith("Circular delegation detected");
    });

    it("Should prevent indirect circular delegation", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount);
      await notes.connect(bob).delegate(2, charlie.address, amount);

      await expect(notes.connect(charlie).delegate(3, alice.address, amount))
        .to.be.revertedWith("Circular delegation detected");

      await expect(notes.connect(charlie).delegate(3, bob.address, amount))
        .to.be.revertedWith("Circular delegation detected");
    });
  });

  describe("Revocation", function () {
    it("Should allow revoking simple delegation", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount);

      await notes.connect(alice).revoke(2);

      const parentNote = await notes.notes(1);
      expect(parentNote.delegated).to.equal(false);

      const childNote = await notes.notes(2);
      expect(childNote.owner).to.equal(ethers.ZeroAddress);
    });

    it("Should allow revoking entire chain", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount);
      await notes.connect(bob).delegate(2, charlie.address, amount);

      // Alice revokes from the leaf
      await notes.connect(alice).revoke(3);

      const aliceNote = await notes.notes(1);
      expect(aliceNote.delegated).to.equal(false);

      const bobNote = await notes.notes(2);
      expect(bobNote.owner).to.equal(ethers.ZeroAddress);

      const charlieNote = await notes.notes(3);
      expect(charlieNote.owner).to.equal(ethers.ZeroAddress);
    });

    it("Should allow intermediate delegate to revoke subdelegation", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount);
      await notes.connect(bob).delegate(2, charlie.address, amount);

      // Bob revokes his delegation to Charlie
      await notes.connect(bob).revoke(3);

      const bobNote = await notes.notes(2);
      expect(bobNote.delegated).to.equal(false);
      expect(bobNote.owner).to.equal(bob.address);

      const charlieNote = await notes.notes(3);
      expect(charlieNote.owner).to.equal(ethers.ZeroAddress);

      // Alice's note should still be delegated to Bob
      const aliceNote = await notes.notes(1);
      expect(aliceNote.delegated).to.equal(true);
    });

    it("Should not allow revoking non-leaf note", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount);
      await notes.connect(bob).delegate(2, charlie.address, amount);

      await expect(notes.connect(alice).revoke(2))
        .to.be.revertedWith("Can only revoke leaf notes");
    });

    it("Should emit NoteRevoked events for deleted notes", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount);

      await expect(notes.connect(alice).revoke(2))
        .to.emit(notes, "NoteRevoked");
    });
  });

  describe("Helper Functions", function () {
    it("Should get depositor from any note in chain", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount);
      await notes.connect(bob).delegate(2, charlie.address, amount);

      expect(await notes.getDepositor(3)).to.equal(alice.address);
      expect(await notes.getDepositor(2)).to.equal(alice.address);
      expect(await notes.getDepositor(1)).to.equal(alice.address);
    });

    it("Should get full delegation chain", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount);
      await notes.connect(bob).delegate(2, charlie.address, amount);

      const [noteIds, owners] = await notes.getChain(3);

      expect(noteIds.length).to.equal(3);
      expect(noteIds[0]).to.equal(3); // leaf
      expect(noteIds[1]).to.equal(2);
      expect(noteIds[2]).to.equal(1); // root

      expect(owners[0]).to.equal(charlie.address);
      expect(owners[1]).to.equal(bob.address);
      expect(owners[2]).to.equal(alice.address);
    });

    it("Should validate compatible notes with same owner and token", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).depositETH(statementId, { value: amount });

      const [isValid, errorMessage] = await notes.validateNotesCompatible([1, 2]);
      expect(isValid).to.equal(true);
      expect(errorMessage).to.equal("");
    });

    it("Should reject incompatible notes with different owners", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(bob).depositETH(statementId, { value: amount });

      const [isValid, errorMessage] = await notes.validateNotesCompatible([1, 2]);
      expect(isValid).to.equal(false);
      expect(errorMessage).to.equal("Notes have different owners");
    });

    it("Should reject notes that are delegated", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount);

      const [isValid, errorMessage] = await notes.validateNotesCompatible([1, 2]);
      expect(isValid).to.equal(false);
      expect(errorMessage).to.equal("Cannot spend delegated notes");
    });

    it("Should reject empty note array", async function () {
      const [isValid, errorMessage] = await notes.validateNotesCompatible([]);
      expect(isValid).to.equal(false);
      expect(errorMessage).to.equal("No notes provided");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle minimum ETH amount (1 wei)", async function () {
      await notes.connect(alice).depositETH(statementId, { value: 1 });

      const note = await notes.notes(1);
      expect(note.amount).to.equal(1);
    });

    it("Should handle large ETH amounts", async function () {
      const largeAmount = ethers.parseEther("1000");
      await notes.connect(alice).depositETH(statementId, { value: largeAmount });

      const note = await notes.notes(1);
      expect(note.amount).to.equal(largeAmount);
    });

    it("Should increment note IDs correctly", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1") });
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1") });
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1") });

      expect((await notes.notes(1)).amount).to.equal(ethers.parseEther("1"));
      expect((await notes.notes(2)).amount).to.equal(ethers.parseEther("1"));
      expect((await notes.notes(3)).amount).to.equal(ethers.parseEther("1"));
    });

    it("Should allow delegating exact amount (no remainder)", async function () {
      const amount = ethers.parseEther("5.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });

      const [delegatedId, remainderId] = await notes.connect(alice).delegate.staticCall(
        1, bob.address, amount
      );

      expect(remainderId).to.equal(0); // No remainder when delegating full amount
    });

    it("Should preserve intendedStatementId through delegation", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount);

      const bobNote = await notes.notes(2);
      expect(bobNote.intendedStatementId).to.equal(statementId);
    });

    it("Should preserve intendedStatementId through chain splitting", async function () {
      const amount = ethers.parseEther("10.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });

      const [splitId, remainderId] = await notes.connect(alice).delegate.staticCall(
        1, bob.address, ethers.parseEther("3.0")
      );
      await notes.connect(alice).delegate(1, bob.address, ethers.parseEther("3.0"));

      const splitNote = await notes.notes(splitId);
      const remainderNote = await notes.notes(remainderId);

      expect(splitNote.intendedStatementId).to.equal(statementId);
      expect(remainderNote.intendedStatementId).to.equal(statementId);
    });
  });
});
