import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("DelegatableNotes - Core Functionality", function () {
  let notes;
  let alice, bob, charlie, dave;

  beforeEach(async function () {
    [alice, bob, charlie, dave] = await ethers.getSigners();

    const AssuranceContractFactory = await ethers.getContractFactory("AssuranceContractFactory");
    const assuranceFactory = await AssuranceContractFactory.deploy();

    const DelegatableNotes = await ethers.getContractFactory("DelegatableNotes");
    notes = await DelegatableNotes.deploy(
      await assuranceFactory.getAddress()
    );
  });

  describe("ETH Deposits and Withdrawals", function () {
    it("Should allow depositing ETH", async function () {
      const amount = ethers.parseEther("1.0");

      await expect(notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount }))
        .to.emit(notes, "NoteCreated")
        .withArgs(1, alice.address, amount, ethers.ZeroAddress, 0, 0);

      const note = await notes.notes(1);
      expect(note.amount).to.equal(amount);
      expect(note.token).to.equal(ethers.ZeroAddress);
    });

    it("Should allow reclaiming ETH from undelegated root note", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount });

      const balanceBefore = await ethers.provider.getBalance(alice.address);
      const tx = await notes.connect(alice).reclaimFunds(1);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(alice.address);

      expect(balanceAfter - balanceBefore + gasCost).to.equal(amount);
    });

    it("Should not allow reclaiming delegated note", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount });
      await notes.connect(alice).delegate(1, [alice.address], bob.address, amount);

      // After delegation, the note is now owned by bob, so alice can't reclaim it
      await expect(
        notes.connect(alice).reclaimFunds(1)
      ).to.be.revertedWithCustomError(notes, "NotRootNoteOrNotOwner");
    });
  });

  describe("Full Delegation", function () {
    it("Should allow delegating full amount", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount });

      await expect(notes.connect(alice).delegate(1, [alice.address], bob.address, amount))
        .to.emit(notes, "NoteDelegated");

      // Note 1 should still exist but with updated chainHash
      const note1 = await notes.notes(1);
      expect(note1.amount).to.equal(amount);
    });

    it("Should allow multi-level delegation", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount });

      // Alice delegates to Bob (full amount, so note 1 stays but chainHash changes)
      await notes.connect(alice).delegate(1, [alice.address], bob.address, amount);

      // Verify the delegation happened
      const note = await notes.notes(1);
      expect(note.amount).to.equal(amount);

      // Bob can now delegate to Charlie using the new chain
      await notes.connect(bob).delegate(1, [bob.address, alice.address], charlie.address, amount);

      // Verify the chain is now alice -> bob -> charlie
      const updatedNote = await notes.notes(1);
      expect(updatedNote.amount).to.equal(amount);
    });

    it("Should not allow delegating to zero address", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount });

      await expect(
        notes.connect(alice).delegate(1, [alice.address], ethers.ZeroAddress, amount)
      ).to.be.revertedWithCustomError(notes, "CannotDelegateToZeroAddress");
    });

    it("Should not allow non-owner to delegate", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount });

      await expect(
        notes.connect(bob).delegate(1, [alice.address], charlie.address, amount)
      ).to.be.revertedWithCustomError(notes, "NotNoteOwner");
    });
  });

  describe("Partial Delegation (Chain Splitting)", function () {
    it("Should split chain when delegating partial amount", async function () {
      const amount = ethers.parseEther("10.0");
      const delegateAmount = ethers.parseEther("3.0");

      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount });

      const [delegatedId, remainderId] = await notes.connect(alice).delegate.staticCall(
        1, [alice.address], bob.address, delegateAmount
      );

      await notes.connect(alice).delegate(1, [alice.address], bob.address, delegateAmount);

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

      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount });

      await expect(notes.connect(alice).delegate(1, [alice.address], bob.address, delegateAmount))
        .to.emit(notes, "ChainSplit");
    });
  });

  describe("Circular Delegation Prevention", function () {
    it("Should prevent direct circular delegation", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount });

      await expect(
        notes.connect(alice).delegate(1, [alice.address], alice.address, amount)
      ).to.be.revertedWithCustomError(notes, "CircularDelegationDetected");
    });
  });

  describe("Revocation", function () {
    it("Should allow revoking simple delegation", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount });
      await notes.connect(alice).delegate(1, [alice.address], bob.address, amount);

      // Alice revokes - note chain is now [bob, alice] (leaf first)
      await expect(notes.connect(alice).revoke(1, [bob.address, alice.address]))
        .to.emit(notes, "NoteRevoked");
    });
  });


  describe("Edge Cases", function () {
    it("Should handle minimum ETH amount (1 wei)", async function () {
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: 1 });
      const note = await notes.notes(1);
      expect(note.amount).to.equal(1);
    });

    it("Should handle large ETH amounts", async function () {
      const largeAmount = ethers.parseEther("1000");
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: largeAmount });
      const note = await notes.notes(1);
      expect(note.amount).to.equal(largeAmount);
    });

    it("Should increment note IDs correctly", async function () {
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: ethers.parseEther("1") });
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: ethers.parseEther("1") });
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: ethers.parseEther("1") });

      expect((await notes.notes(1)).amount).to.equal(ethers.parseEther("1"));
      expect((await notes.notes(2)).amount).to.equal(ethers.parseEther("1"));
      expect((await notes.notes(3)).amount).to.equal(ethers.parseEther("1"));
    });

    it("Should allow delegating exact amount (no remainder)", async function () {
      const amount = ethers.parseEther("1.0");
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount });

      const [delegatedId, remainderId] = await notes.connect(alice).delegate.staticCall(
        1, [alice.address], bob.address, amount
      );

      expect(remainderId).to.equal(0); // No remainder
    });
  });
});
