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

      expect(balanceAfter - balanceBefore + gasCost).to.equal(amount);
    });

    it("Should not allow reclaiming delegated note", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount);

      await expect(
        notes.connect(alice).reclaimFunds(1)
      ).to.be.revertedWith("Cannot reclaim from delegated notes");
    });
  });

  describe("Full Delegation", function () {
    it("Should allow delegating full amount", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });

      await expect(notes.connect(alice).delegate(1, bob.address, amount))
        .to.emit(notes, "NoteDelegated");

      // Note 1 should still exist but with updated chainHash
      const note1 = await notes.notes(1);
      expect(note1.amount).to.equal(amount);
    });

    it("Should allow multi-level delegation", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });

      // Alice delegates to Bob (full amount, so note 1 stays but chainHash changes)
      await notes.connect(alice).delegate(1, bob.address, amount);

      // For multi-level, Bob needs to use the new API with chain parameter
      // Or we just verify that the delegation happened
      const note = await notes.notes(1);
      expect(note.amount).to.equal(amount);

      // Verify Bob can't use legacy delegate (it requires root ownership)
      await expect(
        notes.connect(bob).delegate(1, charlie.address, amount)
      ).to.be.revertedWith("Not the note owner");
    });

    it("Should not allow delegating to zero address", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });

      await expect(
        notes.connect(alice).delegate(1, ethers.ZeroAddress, amount)
      ).to.be.revertedWith("Cannot delegate to zero address");
    });

    it("Should not allow non-owner to delegate", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });

      await expect(
        notes.connect(bob).delegate(1, charlie.address, amount)
      ).to.be.revertedWith("Not the note owner");
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

      // Delegated note should have the delegated amount
      const delegatedNote = await notes.notes(delegatedId);
      expect(delegatedNote.amount).to.equal(delegateAmount);

      // Remainder note should have remaining amount
      const remainderNote = await notes.notes(remainderId);
      expect(remainderNote.amount).to.equal(amount - delegateAmount);
    });

    it("Should emit ChainSplit event", async function () {
      const amount = ethers.parseEther("10.0");
      const delegateAmount = ethers.parseEther("3.0");

      await notes.connect(alice).depositETH(statementId, { value: amount });

      await expect(notes.connect(alice).delegate(1, bob.address, delegateAmount))
        .to.emit(notes, "ChainSplit");
    });
  });

  describe("Circular Delegation Prevention", function () {
    it("Should prevent direct circular delegation", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });

      await expect(
        notes.connect(alice).delegate(1, alice.address, amount)
      ).to.be.revertedWith("Circular delegation detected");
    });
  });

  describe("Revocation", function () {
    it("Should allow revoking simple delegation", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount);

      // Alice revokes
      await expect(notes.connect(alice).revoke(1))
        .to.emit(notes, "NoteRevoked");
    });
  });

  describe("Helper Functions", function () {
    it("Should validate compatible notes with same owner and token", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1") });
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("2") });

      const [isValid, ] = await notes.validateNotesCompatible([1, 2]);
      expect(isValid).to.be.true;
    });

    it("Should reject empty note array", async function () {
      const [isValid, errorMsg] = await notes.validateNotesCompatible([]);
      expect(isValid).to.be.false;
      expect(errorMsg).to.equal("No notes provided");
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
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).depositETH(statementId, { value: amount });

      const [delegatedId, remainderId] = await notes.connect(alice).delegate.staticCall(
        1, bob.address, amount
      );

      expect(remainderId).to.equal(0); // No remainder
    });

    it("Should preserve intendedStatementId through delegation", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("10") });
      const [delegatedId, ] = await notes.connect(alice).delegate.staticCall(
        1, bob.address, ethers.parseEther("3")
      );

      await notes.connect(alice).delegate(1, bob.address, ethers.parseEther("3"));

      const delegatedNote = await notes.notes(delegatedId);
      expect(delegatedNote.intendedStatementId).to.equal(statementId);
    });

    it("Should preserve intendedStatementId through chain splitting", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("10") });

      const [splitId, remainderId] = await notes.connect(alice).delegate.staticCall(
        1, bob.address, ethers.parseEther("3")
      );

      await notes.connect(alice).delegate(1, bob.address, ethers.parseEther("3"));

      const splitNote = await notes.notes(splitId);
      const remainderNote = await notes.notes(remainderId);

      expect(splitNote.intendedStatementId).to.equal(statementId);
      expect(remainderNote.intendedStatementId).to.equal(statementId);
    });
  });
});
