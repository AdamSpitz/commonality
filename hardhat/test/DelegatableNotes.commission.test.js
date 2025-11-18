import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("DelegatableNotes - Commission Feature", function () {
  let notes;
  let alice, bob, charlie;
  let statementId;

  beforeEach(async function () {
    [alice, bob, charlie] = await ethers.getSigners();
    const DelegatableNotes = await ethers.getContractFactory("DelegatableNotes");
    notes = await DelegatableNotes.deploy();
    statementId = ethers.encodeBytes32String("test-statement");
  });

  describe("Commission Setup", function () {
    it("Should set commission when delegating", async function () {
      const amount = ethers.parseEther("1.0");
      const commission = 1000; // 10%

      // Alice deposits and delegates to Bob with 10% commission
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount, commission);

      const bobNote = await notes.notes(2);
      expect(bobNote.commissionBasisPoints).to.equal(commission);
    });

    it("Should allow 0% commission", async function () {
      const amount = ethers.parseEther("1.0");

      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount, 0);

      const bobNote = await notes.notes(2);
      expect(bobNote.commissionBasisPoints).to.equal(0);
    });

    it("Should allow 50% commission (maximum)", async function () {
      const amount = ethers.parseEther("1.0");

      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount, 5000); // 50%

      const bobNote = await notes.notes(2);
      expect(bobNote.commissionBasisPoints).to.equal(5000);
    });

    it("Should reject commission over 50%", async function () {
      const amount = ethers.parseEther("1.0");

      await notes.connect(alice).depositETH(statementId, { value: amount });

      await expect(
        notes.connect(alice).delegate(1, bob.address, amount, 5001) // 50.01%
      ).to.be.revertedWith("Commission too high");
    });
  });

  describe("Commission Passthrough", function () {
    it("Should allow subdelegate to pass on partial commission", async function () {
      const amount = ethers.parseEther("1.0");

      // Alice → Bob (10%) → Charlie (5%)
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount, 1000); // 10%
      await notes.connect(bob).delegate(2, charlie.address, amount, 500); // 5%

      const charlieNote = await notes.notes(3);
      expect(charlieNote.commissionBasisPoints).to.equal(500);
    });

    it("Should not allow subdelegate to exceed parent's commission", async function () {
      const amount = ethers.parseEther("1.0");

      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount, 1000); // 10%

      // Bob tries to give Charlie 15% (more than Bob's 10%)
      await expect(
        notes.connect(bob).delegate(2, charlie.address, amount, 1500)
      ).to.be.revertedWith("Commission exceeds parent's allowance");
    });

    it("Should allow subdelegate to use full parent commission", async function () {
      const amount = ethers.parseEther("1.0");

      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount, 1000); // 10%
      await notes.connect(bob).delegate(2, charlie.address, amount, 1000); // 10% (same as parent)

      const charlieNote = await notes.notes(3);
      expect(charlieNote.commissionBasisPoints).to.equal(1000);
    });
  });

  describe("Commission Preservation", function () {
    it("Should preserve commission through chain splitting", async function () {
      const amount = ethers.parseEther("10.0");
      const delegateAmount = ethers.parseEther("3.0");
      const commission = 1000; // 10%

      // Alice → Bob (10%)
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount, commission);

      // Bob splits his note (3 ETH to Charlie, 7 ETH remainder)
      const [splitId, remainderId] = await notes.connect(bob).delegate.staticCall(
        2, charlie.address, delegateAmount, 500
      );
      await notes.connect(bob).delegate(2, charlie.address, delegateAmount, 500);

      // Both of Bob's new notes should preserve his 10% commission
      const splitNote = await notes.notes(splitId);
      const remainderNote = await notes.notes(remainderId);

      expect(splitNote.commissionBasisPoints).to.equal(commission);
      expect(remainderNote.commissionBasisPoints).to.equal(commission);
    });
  });

  describe("Commission Viewing", function () {
    it("Should return zero commission initially", async function () {
      const commission = await notes.getAccruedCommission(
        alice.address,
        ethers.ZeroAddress, // ETH
        0, // TokenType.ERC20
        0  // tokenId
      );

      expect(commission).to.equal(0);
    });

    it("Should reject claiming when no commission accrued", async function () {
      await expect(
        notes.connect(alice).claimCommission(ethers.ZeroAddress, 0, 0)
      ).to.be.revertedWith("No commission to claim");
    });
  });

  describe("Integration", function () {
    it("Should create multi-level delegation with varying commissions", async function () {
      const amount = ethers.parseEther("1.0");

      // Alice → Bob (10%) → Charlie (5%)
      await notes.connect(alice).depositETH(statementId, { value: amount });
      await notes.connect(alice).delegate(1, bob.address, amount, 1000); // 10%
      await notes.connect(bob).delegate(2, charlie.address, amount, 500); // 5%

      // Get the full chain
      const [noteIds, owners] = await notes.getChain(3);

      expect(noteIds.length).to.equal(3);
      expect(owners[0]).to.equal(charlie.address); // leaf
      expect(owners[1]).to.equal(bob.address);
      expect(owners[2]).to.equal(alice.address); // root

      // Verify commissions
      const charlieNote = await notes.notes(noteIds[0]);
      const bobNote = await notes.notes(noteIds[1]);
      const aliceNote = await notes.notes(noteIds[2]);

      expect(charlieNote.commissionBasisPoints).to.equal(500);
      expect(bobNote.commissionBasisPoints).to.equal(1000);
      expect(aliceNote.commissionBasisPoints).to.equal(0); // root has no commission
    });
  });
});
