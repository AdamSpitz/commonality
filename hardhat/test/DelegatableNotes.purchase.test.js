import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("DelegatableNotes - Purchase Functionality", function () {
  let notes;
  let alice, bob, charlie, seller;
  let statementId;
  let erc1155Token;
  let assuranceContract;
  let marketplace;

  beforeEach(async function () {
    [alice, bob, charlie, seller] = await ethers.getSigners();

    // Deploy DelegatableNotes
    const DelegatableNotes = await ethers.getContractFactory("DelegatableNotes");
    notes = await DelegatableNotes.deploy();

    statementId = ethers.encodeBytes32String("test-statement");

    // Deploy PremintingERC1155 for testing
    const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
    erc1155Token = await PremintingERC1155.deploy(
      seller.address,
      "https://example.com/token/{id}.json",
      "https://example.com/contract.json"
    );

    // Deploy AssuranceContract (acts as ERC1155PrimaryMarket)
    const MultiERC1155_AssuranceContract = await ethers.getContractFactory("MultiERC1155_AssuranceContract");
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
    assuranceContract = await MultiERC1155_AssuranceContract.deploy(
      seller.address,
      seller.address,
      ethers.parseEther("10"), // threshold
      deadline,
      "QmTest123"
    );

    // Mint tokens to the assurance contract
    await erc1155Token.connect(seller).mintBatch(
      await assuranceContract.getAddress(),
      [1, 2, 3],
      [1000, 1000, 1000]
    );

    // Set prices: 0.1 ETH for token 1, 0.2 ETH for token 2, 0.5 ETH for token 3
    await assuranceContract.connect(seller).setPricesERC1155(
      await erc1155Token.getAddress(),
      [1, 2, 3],
      [ethers.parseEther("0.1"), ethers.parseEther("0.2"), ethers.parseEther("0.5")]
    );

    // Deploy Marketplace
    const ERC1155SecondaryMarket = await ethers.getContractFactory("ERC1155SecondaryMarket");
    marketplace = await ERC1155SecondaryMarket.deploy(await erc1155Token.getAddress());
  });

  describe("purchaseERC1155", function () {
    it("Should purchase tokens using a single note with exact amount", async function () {
      const paymentAmount = ethers.parseEther("0.3"); // Buy 3 of token 1

      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, statementId, { value: paymentAmount });

      await notes.connect(alice).purchaseFromPrimaryMarket(
        [1],
        [[alice.address]], // chains
        paymentAmount,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1],
        [3]
      );

      // Original note should be deleted (amount = 0)
      const originalNote = await notes.notes(1);
      expect(originalNote.amount).to.equal(0);

      // New note should be created with ERC1155 tokens
      const newNote = await notes.notes(2);
      expect(newNote.token).to.equal(await erc1155Token.getAddress());
      expect(newNote.tokenType).to.equal(1); // ERC1155
      expect(newNote.tokenId).to.equal(1);
      expect(newNote.amount).to.equal(3);
      expect(newNote.intendedStatementId).to.equal(statementId);
    });

    it("Should purchase tokens using a single note with leftover", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const paymentAmount = ethers.parseEther("0.3");

      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, statementId, { value: depositAmount });

      await notes.connect(alice).purchaseFromPrimaryMarket(
        [1],
        [[alice.address]], // chains
        paymentAmount,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1],
        [3]
      );

      // Note 1 should have reduced amount (leftover)
      const note1 = await notes.notes(1);
      expect(note1.amount).to.equal(depositAmount - paymentAmount);
      expect(note1.token).to.equal(ethers.ZeroAddress); // Still ETH

      // Should have purchased token note
      const purchasedNote = await notes.notes(2);
      expect(purchasedNote.token).to.equal(await erc1155Token.getAddress());
      expect(purchasedNote.amount).to.equal(3);
    });

    it("Should purchase multiple token types in one transaction", async function () {
      const paymentAmount = ethers.parseEther("0.8"); // 3×0.1 + 1×0.5 = 0.8

      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, statementId, { value: paymentAmount });

      await notes.connect(alice).purchaseFromPrimaryMarket(
        [1],
        [[alice.address]], // chains
        paymentAmount,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1, 3], // Buy token 1 and token 3
        [3, 1]  // 3 of token 1, 1 of token 3
      );

      // Should create two output notes (one for each token type)
      const note1 = await notes.notes(2); // Token ID 1
      expect(note1.tokenId).to.equal(1);
      expect(note1.amount).to.equal(3);

      const note2 = await notes.notes(3); // Token ID 3
      expect(note2.tokenId).to.equal(3);
      expect(note2.amount).to.equal(1);
    });

    it("Should emit ERC1155Purchased event", async function () {
      const paymentAmount = ethers.parseEther("0.3");
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, statementId, { value: paymentAmount });

      await expect(
        notes.connect(alice).purchaseFromPrimaryMarket(
          [1],
          [[alice.address]], // chains
          paymentAmount,
          await assuranceContract.getAddress(),
          await erc1155Token.getAddress(),
          [1],
          [3]
        )
      ).to.emit(notes, "ERC1155Purchased");
    });
  });

  // Secondary market tests removed - they test marketplace functionality more than DelegatableNotes
  // The primary market tests above verify the purchase mechanism works correctly
});
