import { expect } from "chai";
import hre from "hardhat";

describe("DelegatableNotes", function () {
  let delegatableNotes;
  let owner, alice, bob, charlie;
  let testToken;
  let testERC1155;
  const statementId = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await hre.ethers.getSigners();

    // Deploy a test ERC20 token
    const TestToken = await hre.ethers.getContractFactory("PremintingERC20");
    testToken = await TestToken.deploy(
      owner.address,
      "Test Token",
      "TST",
      "ipfs://test"
    );

    // Deploy a test ERC1155 token
    const TestERC1155 = await hre.ethers.getContractFactory("PremintingERC1155");
    testERC1155 = await TestERC1155.deploy(
      owner.address,
      "ipfs://test-uri",
      "ipfs://contract-uri"
    );

    // Deploy DelegatableNotes
    const DelegatableNotes = await hre.ethers.getContractFactory("DelegatableNotes");
    delegatableNotes = await DelegatableNotes.deploy();
  });

  describe("ETH Deposits", function () {
    it("Should allow depositing ETH", async function () {
      const depositAmount = hre.ethers.parseEther("1.0");

      const tx = await delegatableNotes.connect(alice).depositETH(statementId, {
        value: depositAmount
      });

      await expect(tx)
        .to.emit(delegatableNotes, "NoteCreated");

      const note = await delegatableNotes.notes(1);
      expect(note.amount).to.equal(depositAmount);
      expect(note.token).to.equal(hre.ethers.ZeroAddress);
      expect(note.tokenType).to.equal(0); // ERC20
      expect(note.tokenId).to.equal(0);
      expect(note.owner).to.equal(alice.address);
      expect(note.intendedStatementId).to.equal(statementId);
      expect(note.delegated).to.equal(false);
    });

    it("Should reject ETH deposit with zero value", async function () {
      await expect(
        delegatableNotes.connect(alice).depositETH(statementId, { value: 0 })
      ).to.be.revertedWith("Must send ETH");
    });
  });

  describe("ERC20 Deposits", function () {
    it("Should allow depositing ERC20 tokens", async function () {
      const depositAmount = 1000n;

      // Approve DelegatableNotes to transfer tokens
      await testToken.connect(owner).transfer(alice.address, depositAmount);
      await testToken.connect(alice).approve(delegatableNotes.target, depositAmount);

      const tx = await delegatableNotes.connect(alice).deposit(
        testToken.target,
        depositAmount,
        statementId
      );

      await expect(tx)
        .to.emit(delegatableNotes, "NoteCreated");

      const note = await delegatableNotes.notes(1);
      expect(note.amount).to.equal(depositAmount);
      expect(note.token).to.equal(testToken.target);
      expect(note.tokenType).to.equal(0); // ERC20
      expect(note.tokenId).to.equal(0);
      expect(note.owner).to.equal(alice.address);
      expect(note.intendedStatementId).to.equal(statementId);
    });

    it("Should reject zero address as token", async function () {
      await expect(
        delegatableNotes.connect(alice).deposit(hre.ethers.ZeroAddress, 1000, statementId)
      ).to.be.revertedWith("Use depositETH for ETH deposits");
    });
  });

  describe("Delegation", function () {
    let noteId;
    const depositAmount = hre.ethers.parseEther("1.0");

    beforeEach(async function () {
      const tx = await delegatableNotes.connect(alice).depositETH(statementId, {
        value: depositAmount
      });
      noteId = 1;
    });

    it("Should allow full delegation", async function () {
      const tx = await delegatableNotes.connect(alice).delegate(
        noteId,
        bob.address,
        depositAmount
      );

      await expect(tx)
        .to.emit(delegatableNotes, "NoteDelegated")
        .withArgs(noteId, 2, bob.address, depositAmount);

      const originalNote = await delegatableNotes.notes(noteId);
      expect(originalNote.delegated).to.equal(true);

      const delegatedNote = await delegatableNotes.notes(2);
      expect(delegatedNote.owner).to.equal(bob.address);
      expect(delegatedNote.amount).to.equal(depositAmount);
      expect(delegatedNote.parentNoteId).to.equal(noteId);
      expect(delegatedNote.intendedStatementId).to.equal(statementId);
    });

    it("Should allow partial delegation", async function () {
      const delegateAmount = hre.ethers.parseEther("0.6");

      await delegatableNotes.connect(alice).delegate(
        noteId,
        bob.address,
        delegateAmount
      );

      // After partial delegation, we get two new notes
      const delegatedNote = await delegatableNotes.notes(4); // splitLeafId
      expect(delegatedNote.owner).to.equal(bob.address);
      expect(delegatedNote.amount).to.equal(delegateAmount);

      const remainderNote = await delegatableNotes.notes(5); // remainderLeafId
      expect(remainderNote.owner).to.equal(alice.address);
      expect(remainderNote.amount).to.equal(depositAmount - delegateAmount);
    });

    it("Should preserve intendedStatementId through delegation chain", async function () {
      await delegatableNotes.connect(alice).delegate(noteId, bob.address, depositAmount);
      await delegatableNotes.connect(bob).delegate(2, charlie.address, depositAmount);

      const charlieNote = await delegatableNotes.notes(3);
      expect(charlieNote.intendedStatementId).to.equal(statementId);
    });

    it("Should prevent circular delegation", async function () {
      await delegatableNotes.connect(alice).delegate(noteId, bob.address, depositAmount);

      await expect(
        delegatableNotes.connect(bob).delegate(2, alice.address, depositAmount)
      ).to.be.revertedWith("Circular delegation detected");
    });
  });

  describe("Revocation", function () {
    let noteId;
    const depositAmount = hre.ethers.parseEther("1.0");

    beforeEach(async function () {
      await delegatableNotes.connect(alice).depositETH(statementId, {
        value: depositAmount
      });
      noteId = 1;

      // Create delegation chain: alice -> bob -> charlie
      await delegatableNotes.connect(alice).delegate(noteId, bob.address, depositAmount);
      await delegatableNotes.connect(bob).delegate(2, charlie.address, depositAmount);
    });

    it("Should allow revoking delegation", async function () {
      const leafNoteId = 3; // Charlie's note

      await delegatableNotes.connect(alice).revoke(leafNoteId);

      // Alice's note should no longer be delegated
      const aliceNote = await delegatableNotes.notes(noteId);
      expect(aliceNote.delegated).to.equal(false);

      // Bob and Charlie's notes should be deleted
      const bobNote = await delegatableNotes.notes(2);
      expect(bobNote.owner).to.equal(hre.ethers.ZeroAddress);

      const charlieNote = await delegatableNotes.notes(leafNoteId);
      expect(charlieNote.owner).to.equal(hre.ethers.ZeroAddress);
    });
  });

  describe("Reclaiming Funds", function () {
    it("Should allow reclaiming ETH from undelegated root note", async function () {
      const depositAmount = hre.ethers.parseEther("1.0");

      await delegatableNotes.connect(alice).depositETH(statementId, {
        value: depositAmount
      });

      const balanceBefore = await hre.ethers.provider.getBalance(alice.address);

      const tx = await delegatableNotes.connect(alice).reclaimFunds(1);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await hre.ethers.provider.getBalance(alice.address);

      expect(balanceAfter).to.equal(balanceBefore + depositAmount - gasCost);
    });

    it("Should reject reclaiming from delegated notes", async function () {
      const depositAmount = hre.ethers.parseEther("1.0");

      await delegatableNotes.connect(alice).depositETH(statementId, {
        value: depositAmount
      });

      await delegatableNotes.connect(alice).delegate(1, bob.address, depositAmount);

      await expect(
        delegatableNotes.connect(alice).reclaimFunds(1)
      ).to.be.revertedWith("Cannot reclaim from delegated notes");
    });
  });

  describe("ERC1155 Deposits", function () {
    it("Should allow depositing ERC1155 tokens", async function () {
      const tokenId = 1;
      const depositAmount = 10n;

      // Mint and approve tokens
      await testERC1155.connect(owner).mint(alice.address, tokenId, depositAmount);
      await testERC1155.connect(alice).setApprovalForAll(delegatableNotes.target, true);

      const tx = await delegatableNotes.connect(alice).depositERC1155(
        testERC1155.target,
        tokenId,
        depositAmount,
        statementId
      );

      await expect(tx)
        .to.emit(delegatableNotes, "NoteCreated");

      const note = await delegatableNotes.notes(1);
      expect(note.amount).to.equal(depositAmount);
      expect(note.token).to.equal(testERC1155.target);
      expect(note.tokenType).to.equal(1); // ERC1155
      expect(note.tokenId).to.equal(tokenId);
      expect(note.owner).to.equal(alice.address);
      expect(note.intendedStatementId).to.equal(statementId);
      expect(note.delegated).to.equal(false);
    });

    it("Should allow reclaiming ERC1155 tokens", async function () {
      const tokenId = 2;
      const depositAmount = 5n;

      // Mint and deposit
      await testERC1155.connect(owner).mint(alice.address, tokenId, depositAmount);
      await testERC1155.connect(alice).setApprovalForAll(delegatableNotes.target, true);
      await delegatableNotes.connect(alice).depositERC1155(
        testERC1155.target,
        tokenId,
        depositAmount,
        statementId
      );

      const balanceBefore = await testERC1155.balanceOf(alice.address, tokenId);

      await delegatableNotes.connect(alice).reclaimFunds(1);

      const balanceAfter = await testERC1155.balanceOf(alice.address, tokenId);
      expect(balanceAfter).to.equal(balanceBefore + depositAmount);
    });

    it("Should preserve tokenType and tokenId through delegation", async function () {
      const tokenId = 3;
      const depositAmount = 15n;

      // Mint and deposit
      await testERC1155.connect(owner).mint(alice.address, tokenId, depositAmount);
      await testERC1155.connect(alice).setApprovalForAll(delegatableNotes.target, true);
      await delegatableNotes.connect(alice).depositERC1155(
        testERC1155.target,
        tokenId,
        depositAmount,
        statementId
      );

      // Delegate
      await delegatableNotes.connect(alice).delegate(1, bob.address, depositAmount);

      const delegatedNote = await delegatableNotes.notes(2);
      expect(delegatedNote.tokenType).to.equal(1); // ERC1155
      expect(delegatedNote.tokenId).to.equal(tokenId);
      expect(delegatedNote.token).to.equal(testERC1155.target);
      expect(delegatedNote.amount).to.equal(depositAmount);
    });
  });

  describe("IntendedStatementId", function () {
    it("Should store and preserve intendedStatementId", async function () {
      const depositAmount = hre.ethers.parseEther("1.0");
      const statementId2 = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

      await delegatableNotes.connect(alice).depositETH(statementId, {
        value: depositAmount
      });

      await delegatableNotes.connect(bob).depositETH(statementId2, {
        value: depositAmount
      });

      const note1 = await delegatableNotes.notes(1);
      const note2 = await delegatableNotes.notes(2);

      expect(note1.intendedStatementId).to.equal(statementId);
      expect(note2.intendedStatementId).to.equal(statementId2);
    });

    it("Should preserve intendedStatementId through chain splitting", async function () {
      const depositAmount = hre.ethers.parseEther("1.0");
      const delegateAmount = hre.ethers.parseEther("0.4");

      await delegatableNotes.connect(alice).depositETH(statementId, {
        value: depositAmount
      });

      await delegatableNotes.connect(alice).delegate(1, bob.address, delegateAmount);

      // Check both split chains have the same statementId
      const splitNote = await delegatableNotes.notes(4);
      const remainderNote = await delegatableNotes.notes(5);

      expect(splitNote.intendedStatementId).to.equal(statementId);
      expect(remainderNote.intendedStatementId).to.equal(statementId);
    });
  });
});
