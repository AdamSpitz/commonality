import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("DelegatableNotes - Bug Fixes and Edge Cases", function () {
  let notes;
  let alice, bob, charlie;
  let statementId;
  let testToken;
  let testERC1155;

  beforeEach(async function () {
    [alice, bob, charlie] = await ethers.getSigners();
    const DelegatableNotes = await ethers.getContractFactory("DelegatableNotes");
    notes = await DelegatableNotes.deploy();
    statementId = ethers.encodeBytes32String("test-statement");

    // Deploy a test ERC20 token
    const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
    testToken = await PremintingERC20.deploy(
      alice.address,
      "Test Token",
      "TEST",
      "https://example.com/contract.json"
    );
    await testToken.connect(alice).mint(alice.address, ethers.parseEther("1000"));
    await testToken.connect(alice).mint(bob.address, ethers.parseEther("1000"));

    // Deploy a test ERC1155 token
    const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
    testERC1155 = await PremintingERC1155.deploy(
      alice.address,
      "https://example.com/token/{id}.json",
      "https://example.com/contract.json"
    );
    await testERC1155.connect(alice).mintBatch(alice.address, [1, 2], [100, 200]);
  });

  describe("Bug: Invalid delegation amounts", function () {
    it("Should reject zero delegation amount", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1") });

      await expect(
        notes.connect(alice).delegate(1, [alice.address], bob.address, 0)
      ).to.be.revertedWith("Invalid delegation amount");
    });

    it("Should reject delegation amount greater than note amount", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1") });

      await expect(
        notes.connect(alice).delegate(1, [alice.address], bob.address, ethers.parseEther("2"))
      ).to.be.revertedWith("Invalid delegation amount");
    });
  });

  describe("Bug: Self-delegation", function () {
    it("Should prevent delegating to self (circular delegation check catches this)", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1") });

      await expect(
        notes.connect(alice).delegate(1, [alice.address], alice.address, ethers.parseEther("1"))
      ).to.be.revertedWith("Circular delegation detected");
    });
  });

  describe("Bug: Nonexistent note operations", function () {
    it("Should return false when verifying chain of nonexistent note", async function () {
      const isValid = await notes.verifyChain(999, [alice.address]);
      expect(isValid).to.be.false;
    });

    it("Should revert when delegating nonexistent note", async function () {
      await expect(
        notes.connect(alice).delegate(999, [alice.address], bob.address, ethers.parseEther("1"))
      ).to.be.revertedWith("Note does not exist");
    });

    it("Should revert when revoking nonexistent note", async function () {
      await expect(notes.connect(alice).revoke([999], [[alice.address]])).to.be.revertedWith("Note does not exist");
    });
  });

  describe("ERC20 Token Support", function () {
    it("Should deposit ERC20 tokens", async function () {
      const amount = ethers.parseEther("10");

      await testToken.connect(alice).approve(await notes.getAddress(), amount);
      await notes.connect(alice).depositERC20(await testToken.getAddress(), amount, statementId);

      const note = await notes.notes(1);
      expect(note.amount).to.equal(amount);
      expect(note.token).to.equal(await testToken.getAddress());
      expect(note.tokenType).to.equal(0); // ERC20
      expect(note.tokenId).to.equal(0);
    });

    it("Should reclaim ERC20 tokens", async function () {
      const amount = ethers.parseEther("10");

      await testToken.connect(alice).approve(await notes.getAddress(), amount);
      await notes.connect(alice).depositERC20(await testToken.getAddress(), amount, statementId);

      const balanceBefore = await testToken.balanceOf(alice.address);
      await notes.connect(alice).reclaimFunds(1);
      const balanceAfter = await testToken.balanceOf(alice.address);

      expect(balanceAfter - balanceBefore).to.equal(amount);
    });

    it("Should delegate ERC20 notes", async function () {
      const amount = ethers.parseEther("10");

      await testToken.connect(alice).approve(await notes.getAddress(), amount);
      await notes.connect(alice).depositERC20(await testToken.getAddress(), amount, statementId);
      await notes.connect(alice).delegate(1, [alice.address], bob.address, amount);

      // Note should exist with correct amount
      const note = await notes.notes(1);
      expect(note.token).to.equal(await testToken.getAddress());
      expect(note.amount).to.equal(amount);
    });

    it("Should reject depositing zero amount", async function () {
      await expect(
        notes.connect(alice).depositERC20(await testToken.getAddress(), 0, statementId)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should reject using zero address for ERC20", async function () {
      await expect(
        notes.connect(alice).depositERC20(ethers.ZeroAddress, ethers.parseEther("1"), statementId)
      ).to.be.revertedWith("Use depositETH for ETH deposits");
    });

    it("Should reject sending ETH with ERC20 deposit", async function () {
      const amount = ethers.parseEther("10");
      await testToken.connect(alice).approve(await notes.getAddress(), amount);

      await expect(
        notes.connect(alice).depositERC20(await testToken.getAddress(), amount, statementId, {
          value: ethers.parseEther("1")
        })
      ).to.be.reverted;
    });
  });

  describe("ERC1155 Token Support", function () {
    it("Should deposit ERC1155 tokens", async function () {
      await testERC1155.connect(alice).setApprovalForAll(await notes.getAddress(), true);
      await notes.connect(alice).depositERC1155(await testERC1155.getAddress(), 1, 50, statementId);

      const note = await notes.notes(1);
      expect(note.amount).to.equal(50);
      expect(note.token).to.equal(await testERC1155.getAddress());
      expect(note.tokenType).to.equal(1); // ERC1155
      expect(note.tokenId).to.equal(1);
    });

    it("Should reclaim ERC1155 tokens", async function () {
      await testERC1155.connect(alice).setApprovalForAll(await notes.getAddress(), true);
      await notes.connect(alice).depositERC1155(await testERC1155.getAddress(), 1, 50, statementId);

      const balanceBefore = await testERC1155.balanceOf(alice.address, 1);
      await notes.connect(alice).reclaimFunds(1);
      const balanceAfter = await testERC1155.balanceOf(alice.address, 1);

      expect(balanceAfter - balanceBefore).to.equal(50n);
    });

    it("Should delegate ERC1155 notes", async function () {
      await testERC1155.connect(alice).setApprovalForAll(await notes.getAddress(), true);
      await notes.connect(alice).depositERC1155(await testERC1155.getAddress(), 1, 50, statementId);
      await notes.connect(alice).delegate(1, [alice.address], bob.address, 50);

      const note = await notes.notes(1);
      expect(note.token).to.equal(await testERC1155.getAddress());
      expect(note.tokenId).to.equal(1);
      expect(note.amount).to.equal(50);
    });

    it("Should split ERC1155 delegation chain", async function () {
      await testERC1155.connect(alice).setApprovalForAll(await notes.getAddress(), true);
      await notes.connect(alice).depositERC1155(await testERC1155.getAddress(), 1, 100, statementId);

      const [splitId, remainderId] = await notes.connect(alice).delegate.staticCall(
        1, [alice.address], bob.address, 30
      );
      await notes.connect(alice).delegate(1, [alice.address], bob.address, 30);

      const splitNote = await notes.notes(splitId);
      const remainderNote = await notes.notes(remainderId);

      expect(splitNote.amount).to.equal(30);
      expect(remainderNote.amount).to.equal(70);
      expect(splitNote.tokenId).to.equal(1);
      expect(remainderNote.tokenId).to.equal(1);
    });

    it("Should reject depositing zero amount ERC1155", async function () {
      await expect(
        notes.connect(alice).depositERC1155(await testERC1155.getAddress(), 1, 0, statementId)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should reject sending ETH with ERC1155 deposit", async function () {
      await testERC1155.connect(alice).setApprovalForAll(await notes.getAddress(), true);

      await expect(
        notes.connect(alice).depositERC1155(await testERC1155.getAddress(), 1, 50, statementId, {
          value: ethers.parseEther("1")
        })
      ).to.be.reverted;
    });
  });

  describe("Bug: ETH deposit validation", function () {
    it("Should reject depositETH with zero value", async function () {
      await expect(
        notes.connect(alice).depositETH(statementId, { value: 0 })
      ).to.be.revertedWith("Must send ETH");
    });

    it("Should reject deposit with wrong token type for ETH", async function () {
      await expect(
        notes.connect(alice).deposit(ethers.ZeroAddress, 1, 0, 0, statementId, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("ETH must use ERC20 type");
    });
  });

  describe("Bug: Note validation edge cases", function () {
    it("Should reject validateNotesCompatible with nonexistent note", async function () {
      const [isValid, ] = await notes.validateNotesCompatible([999]);
      expect(isValid).to.be.false;
    });

    it("Should reject validateNotesCompatible when first note doesn't exist", async function () {
      const [isValid, errorMsg] = await notes.validateNotesCompatible([999]);
      expect(isValid).to.be.false;
      expect(errorMsg).to.equal("First note does not exist");
    });
  });

  describe("Bug: Proportional distribution with rounding", function () {
    it("Should handle rounding in proportional splits correctly", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("10") });

      // Split into three parts (3.33...repeating)
      const [split1, ] = await notes.connect(alice).delegate.staticCall(1, [alice.address], bob.address, ethers.parseEther("3.33"));
      await notes.connect(alice).delegate(1, [alice.address], bob.address, ethers.parseEther("3.33"));

      const splitNote = await notes.notes(split1);
      expect(splitNote.amount).to.equal(ethers.parseEther("3.33"));
    });

    it("Should handle minimum wei amounts in splits", async function () {
      await notes.connect(alice).depositETH(statementId, { value: 3 });

      const [splitId, remainderId] = await notes.connect(alice).delegate.staticCall(1, [alice.address], bob.address, 1);
      await notes.connect(alice).delegate(1, [alice.address], bob.address, 1);

      const splitNote = await notes.notes(splitId);
      const remainderNote = await notes.notes(remainderId);

      expect(splitNote.amount).to.equal(1);
      expect(remainderNote.amount).to.equal(2);
    });
  });
});
