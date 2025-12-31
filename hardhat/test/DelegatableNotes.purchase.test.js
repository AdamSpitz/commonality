import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("DelegatableNotes - Purchase Functionality", function () {
  let notes;
  let alice, bob, charlie, seller;
  let erc1155Token;
  let assuranceContract;
  let marketplace;

  beforeEach(async function () {
    [alice, bob, charlie, seller] = await ethers.getSigners();

    // Deploy DelegatableNotes
    const DelegatableNotes = await ethers.getContractFactory("DelegatableNotes");
    notes = await DelegatableNotes.deploy();

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

      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: paymentAmount });

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
    });

    it("Should purchase tokens using a single note with leftover", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const paymentAmount = ethers.parseEther("0.3");

      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: depositAmount });

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

      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: paymentAmount });

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
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: paymentAmount });

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

  describe("NoteConsumed Event", function () {
    it("Should emit NoteConsumed event when note is fully consumed", async function () {
      const paymentAmount = ethers.parseEther("0.3");
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: paymentAmount });

      await expect(
        notes.connect(alice).purchaseFromPrimaryMarket(
          [1],
          [[alice.address]],
          paymentAmount,
          await assuranceContract.getAddress(),
          await erc1155Token.getAddress(),
          [1],
          [3]
        )
      )
        .to.emit(notes, "NoteConsumed")
        .withArgs(
          1, // noteId
          paymentAmount, // amountConsumed
          0, // remainingAmount
          true // deleted
        );
    });

    it("Should emit NoteConsumed event when note is partially consumed", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const paymentAmount = ethers.parseEther("0.3");
      const expectedRemaining = depositAmount - paymentAmount;

      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: depositAmount });

      await expect(
        notes.connect(alice).purchaseFromPrimaryMarket(
          [1],
          [[alice.address]],
          paymentAmount,
          await assuranceContract.getAddress(),
          await erc1155Token.getAddress(),
          [1],
          [3]
        )
      )
        .to.emit(notes, "NoteConsumed")
        .withArgs(
          1, // noteId
          paymentAmount, // amountConsumed
          expectedRemaining, // remainingAmount
          false // deleted (not deleted since there's a remainder)
        );
    });

    it("Should emit NoteConsumed for each input note when using multiple notes", async function () {
      const amount1 = ethers.parseEther("0.2");
      const amount2 = ethers.parseEther("0.1");
      const totalPayment = ethers.parseEther("0.3");

      // Create two notes
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount1 });
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount2 });

      const tx = notes.connect(alice).purchaseFromPrimaryMarket(
        [1, 2],
        [[alice.address], [alice.address]],
        totalPayment,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1],
        [3]
      );

      // Should emit NoteConsumed for note 1
      await expect(tx)
        .to.emit(notes, "NoteConsumed")
        .withArgs(1, amount1, 0, true);

      // Should emit NoteConsumed for note 2
      await expect(tx)
        .to.emit(notes, "NoteConsumed")
        .withArgs(2, amount2, 0, true);
    });

    it("Should have correct remaining amount after partial consumption", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const paymentAmount = ethers.parseEther("0.3");
      const expectedRemaining = depositAmount - paymentAmount;

      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: depositAmount });

      await notes.connect(alice).purchaseFromPrimaryMarket(
        [1],
        [[alice.address]],
        paymentAmount,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1],
        [3]
      );

      // Verify note still exists with reduced amount
      const note = await notes.notes(1);
      expect(note.amount).to.equal(expectedRemaining);
      expect(note.chainHash).to.not.equal(ethers.ZeroHash); // Still exists
    });

    it("Should delete note after full consumption", async function () {
      const paymentAmount = ethers.parseEther("0.3");
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: paymentAmount });

      await notes.connect(alice).purchaseFromPrimaryMarket(
        [1],
        [[alice.address]],
        paymentAmount,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1],
        [3]
      );

      // Verify note is deleted (all fields zeroed)
      const note = await notes.notes(1);
      expect(note.amount).to.equal(0);
      expect(note.chainHash).to.equal(ethers.ZeroHash);
      expect(note.token).to.equal(ethers.ZeroAddress);
    });
  });

  describe("NoteCreated Event for Output Notes", function () {
    it("Should emit NoteCreated event for output note", async function () {
      const paymentAmount = ethers.parseEther("0.3");
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: paymentAmount });

      await expect(
        notes.connect(alice).purchaseFromPrimaryMarket(
          [1],
          [[alice.address]],
          paymentAmount,
          await assuranceContract.getAddress(),
          await erc1155Token.getAddress(),
          [1],
          [3]
        )
      )
        .to.emit(notes, "NoteCreated")
        .withArgs(
          2, // noteId (output note)
          alice.address, // owner
          3, // amount (token count)
          await erc1155Token.getAddress(), // token
          1, // tokenType (ERC1155)
          1 // tokenId
        );
    });

    it("Should emit NoteCreated for each output token type", async function () {
      const paymentAmount = ethers.parseEther("0.8"); // 3×0.1 + 1×0.5 = 0.8
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: paymentAmount });

      const tx = notes.connect(alice).purchaseFromPrimaryMarket(
        [1],
        [[alice.address]],
        paymentAmount,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1, 3], // Buy token 1 and token 3
        [3, 1]  // 3 of token 1, 1 of token 3
      );

      // Should emit NoteCreated for token 1
      await expect(tx)
        .to.emit(notes, "NoteCreated")
        .withArgs(
          2,
          alice.address,
          3,
          await erc1155Token.getAddress(),
          1,
          1
        );

      // Should emit NoteCreated for token 3
      await expect(tx)
        .to.emit(notes, "NoteCreated")
        .withArgs(
          3,
          alice.address,
          1,
          await erc1155Token.getAddress(),
          1,
          3
        );
    });

    it("Should preserve delegation chain in output notes", async function () {
      const paymentAmount = ethers.parseEther("0.3");

      // Alice deposits
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: paymentAmount });

      // Alice delegates to Bob
      await notes.connect(alice).delegate(1, [alice.address], bob.address, paymentAmount);

      // Bob purchases with the delegated note
      await notes.connect(bob).purchaseFromPrimaryMarket(
        [1],
        [[bob.address, alice.address]], // chain: Bob → Alice
        paymentAmount,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1],
        [3]
      );

      // Output note should have the same chain hash (Bob → Alice)
      const inputChainHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32"],
          [bob.address, ethers.keccak256(ethers.solidityPacked(["address", "bytes32"], [alice.address, ethers.ZeroHash]))]
        )
      );

      const outputNote = await notes.notes(2);
      expect(outputNote.chainHash).to.equal(inputChainHash);
    });
  });

  describe("Bug Fixes and Edge Cases", function () {
    it("Should handle proportional distribution when using multiple notes with different amounts", async function () {
      const amount1 = ethers.parseEther("0.3");
      const amount2 = ethers.parseEther("0.6");
      const totalAvailable = amount1 + amount2;
      const paymentAmount = ethers.parseEther("0.6"); // Use 2/3 of total

      // Create two notes with different amounts
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount1 });
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount2 });

      const tx = notes.connect(alice).purchaseFromPrimaryMarket(
        [1, 2],
        [[alice.address], [alice.address]],
        paymentAmount,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1],
        [6]
      );

      // Calculate expected consumption per note (proportional to their amounts)
      const expectedConsumed1 = (paymentAmount * amount1) / totalAvailable;
      const expectedConsumed2 = paymentAmount - expectedConsumed1; // Remainder goes to last note

      // Verify NoteConsumed events have correct proportions
      await expect(tx)
        .to.emit(notes, "NoteConsumed")
        .withArgs(1, expectedConsumed1, amount1 - expectedConsumed1, false);

      await expect(tx)
        .to.emit(notes, "NoteConsumed")
        .withArgs(2, expectedConsumed2, amount2 - expectedConsumed2, false);
    });

    it("Should handle rounding by giving remainder to last note", async function () {
      // Use amounts that will cause rounding issues
      const amount1 = ethers.parseEther("0.333333333333333333");
      const amount2 = ethers.parseEther("0.333333333333333334");
      const amount3 = ethers.parseEther("0.333333333333333333");
      const paymentAmount = ethers.parseEther("0.5");

      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount1 });
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount2 });
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount3 });

      await notes.connect(alice).purchaseFromPrimaryMarket(
        [1, 2, 3],
        [[alice.address], [alice.address], [alice.address]],
        paymentAmount,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1],
        [5]
      );

      // Verify all notes were consumed and total matches exactly
      const note1 = await notes.notes(1);
      const note2 = await notes.notes(2);
      const note3 = await notes.notes(3);

      const totalRemaining = note1.amount + note2.amount + note3.amount;
      const totalConsumed = amount1 + amount2 + amount3 - totalRemaining;

      // Total consumed should exactly match payment amount (no rounding errors)
      expect(totalConsumed).to.equal(paymentAmount);
    });
  });

  // Secondary market tests removed - they test marketplace functionality more than DelegatableNotes
  // The primary market tests above verify the purchase mechanism works correctly
});
