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

    // Mint some test tokens to the assurance contract (which we'll deploy next)
    // Token IDs: 1, 2, 3 with 1000 tokens each
    const tokenIds = [1, 2, 3];
    const amounts = [1000, 1000, 1000];

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
      tokenIds,
      amounts
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

  describe("purchaseFromERC1155PrimaryMarket", function () {
    it("Should purchase tokens using a single note with exact amount", async function () {
      const paymentAmount = ethers.parseEther("0.3"); // Buy 3 of token 1

      // Alice deposits ETH and creates a note
      await notes.connect(alice).depositETH(statementId, { value: paymentAmount });

      // Alice purchases 3 tokens of ID 1 (0.1 ETH each)
      await notes.connect(alice).purchaseFromERC1155PrimaryMarket(
        [1], // noteIds
        paymentAmount,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1], // tokenIds
        [3]  // counts
      );

      // Original note should be deleted
      const originalNote = await notes.notes(1);
      expect(originalNote.owner).to.equal(ethers.ZeroAddress);

      // New note should be created with ERC1155 tokens
      const newNote = await notes.notes(2);
      expect(newNote.owner).to.equal(alice.address);
      expect(newNote.token).to.equal(await erc1155Token.getAddress());
      expect(newNote.tokenType).to.equal(1); // ERC1155
      expect(newNote.tokenId).to.equal(1);
      expect(newNote.amount).to.equal(3);
      expect(newNote.intendedStatementId).to.equal(statementId);
    });

    it("Should purchase tokens using a single note with leftover", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const paymentAmount = ethers.parseEther("0.3"); // Buy 3 of token 1

      // Alice deposits more than needed
      await notes.connect(alice).depositETH(statementId, { value: depositAmount });

      // Alice purchases tokens
      await notes.connect(alice).purchaseFromERC1155PrimaryMarket(
        [1],
        paymentAmount,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1],
        [3]
      );

      // Should have a leftover note with remaining ETH
      // Note IDs: 1 (deleted), 2 (split for payment), 3 (leftover), 4 (purchased tokens)
      const leftoverNote = await notes.notes(3);
      expect(leftoverNote.owner).to.equal(alice.address);
      expect(leftoverNote.token).to.equal(ethers.ZeroAddress); // ETH
      expect(leftoverNote.amount).to.equal(depositAmount - paymentAmount);

      // Should have purchased token note
      const purchasedNote = await notes.notes(4);
      expect(purchasedNote.owner).to.equal(alice.address);
      expect(purchasedNote.token).to.equal(await erc1155Token.getAddress());
      expect(purchasedNote.amount).to.equal(3);
    });

    it("Should purchase multiple token types in one transaction", async function () {
      const paymentAmount = ethers.parseEther("0.8"); // 3×0.1 + 1×0.5 = 0.8

      await notes.connect(alice).depositETH(statementId, { value: paymentAmount });

      await notes.connect(alice).purchaseFromERC1155PrimaryMarket(
        [1],
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

    // This test is removed - see corrected version below

    it("Should purchase using multiple notes with proportional distribution", async function () {
      const paymentAmount = ethers.parseEther("0.6"); // Buy 6 of token 1 @ 0.1 each (exact match for total available)

      // Alice deposits in two separate notes (total: 0.6 ETH)
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("0.3") });
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("0.3") });

      // Purchase using both notes (spending all: 0.6)
      const tx = await notes.connect(alice).purchaseFromERC1155PrimaryMarket(
        [1, 2],
        paymentAmount,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1],
        [6]
      );

      const receipt = await tx.wait();
      const purchaseEvent = receipt.logs.find(log => {
        try {
          return notes.interface.parseLog(log)?.name === "ERC1155Purchased";
        } catch {
          return false;
        }
      });

      const parsed = notes.interface.parseLog(purchaseEvent);
      const outputNoteIds = parsed.args.outputNoteIds;

      // Should create 2 output notes (one for each input chain)
      expect(outputNoteIds.length).to.equal(2);

      // Each note should have 3 tokens (proportional distribution: 6 tokens / 2 chains)
      const note1 = await notes.notes(outputNoteIds[0]);
      const note2 = await notes.notes(outputNoteIds[1]);

      expect(note1.token).to.equal(await erc1155Token.getAddress());
      expect(note1.amount).to.equal(3);
      expect(note1.owner).to.equal(alice.address);

      expect(note2.token).to.equal(await erc1155Token.getAddress());
      expect(note2.amount).to.equal(3);
      expect(note2.owner).to.equal(alice.address);

      // Total should be 6 tokens
      expect(note1.amount + note2.amount).to.equal(6);
    });

    it("Should preserve delegation chain when purchasing", async function () {
      const paymentAmount = ethers.parseEther("0.3");

      // Alice deposits and delegates to Bob, Bob delegates to Charlie
      await notes.connect(alice).depositETH(statementId, { value: paymentAmount });
      await notes.connect(alice).delegate(1, bob.address, paymentAmount, 0);
      await notes.connect(bob).delegate(2, charlie.address, paymentAmount, 0);

      // Charlie makes a purchase
      await notes.connect(charlie).purchaseFromERC1155PrimaryMarket(
        [3],
        paymentAmount,
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1],
        [3]
      );

      // Should recreate the delegation chain with purchased tokens
      const [noteIds, owners] = await notes.getChain(6); // New leaf after purchase
      expect(noteIds.length).to.equal(3);
      expect(owners[0]).to.equal(charlie.address); // leaf
      expect(owners[1]).to.equal(bob.address);
      expect(owners[2]).to.equal(alice.address); // root

      // And the tokens should be ERC1155
      const leafNote = await notes.notes(noteIds[0]);
      expect(leafNote.token).to.equal(await erc1155Token.getAddress());
      expect(leafNote.amount).to.equal(3);
    });

    it("Should revert if payment amount is zero", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1") });

      await expect(
        notes.connect(alice).purchaseFromERC1155PrimaryMarket(
          [1],
          0, // zero payment
          await assuranceContract.getAddress(),
          await erc1155Token.getAddress(),
          [1],
          [1]
        )
      ).to.be.revertedWith("Payment amount must be greater than 0");
    });

    it("Should revert if insufficient funds in notes", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("0.2") });

      await expect(
        notes.connect(alice).purchaseFromERC1155PrimaryMarket(
          [1],
          ethers.parseEther("0.5"), // more than available
          await assuranceContract.getAddress(),
          await erc1155Token.getAddress(),
          [1],
          [1]
        )
      ).to.be.revertedWith("Insufficient funds in notes");
    });

    it("Should revert if seller rejects payment (wrong amount)", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("0.5") });

      // Try to pay 0.2 ETH but request 3 tokens (which cost 0.3 ETH)
      await expect(
        notes.connect(alice).purchaseFromERC1155PrimaryMarket(
          [1],
          ethers.parseEther("0.2"), // wrong payment amount
          await assuranceContract.getAddress(),
          await erc1155Token.getAddress(),
          [1],
          [3] // 3 tokens @ 0.1 = 0.3 ETH required
        )
      ).to.be.revertedWith("Incorrect amount of ETH sent");
    });

    it("Should revert if not the note owner", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("0.3") });

      await expect(
        notes.connect(bob).purchaseFromERC1155PrimaryMarket(
          [1], // Alice's note
          ethers.parseEther("0.3"),
          await assuranceContract.getAddress(),
          await erc1155Token.getAddress(),
          [1],
          [3]
        )
      ).to.be.revertedWith("Not the note owner");
    });

    it("Should emit ERC1155Purchased event", async function () {
      const paymentAmount = ethers.parseEther("0.3");
      await notes.connect(alice).depositETH(statementId, { value: paymentAmount });

      await expect(
        notes.connect(alice).purchaseFromERC1155PrimaryMarket(
          [1],
          paymentAmount,
          await assuranceContract.getAddress(),
          await erc1155Token.getAddress(),
          [1],
          [3]
        )
      ).to.emit(notes, "ERC1155Purchased");
    });
  });

  describe("purchaseFromERC1155SecondaryMarket", function () {
    beforeEach(async function () {
      // Seller creates a listing: 10 tokens of ID 1 at 0.05 ETH each
      // First, seller needs to own some tokens
      await erc1155Token.connect(seller).mintBatch(
        seller.address,
        [1],
        [10]
      );

      // Approve marketplace to transfer tokens
      await erc1155Token.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);

      // Create sale listing
      await marketplace.connect(seller).createSaleListing(
        1, // tokenId
        10, // count
        ethers.parseEther("0.05") // price per token
      );
    });

    it("Should purchase from marketplace using a single note with exact amount", async function () {
      const paymentAmount = ethers.parseEther("0.15"); // Buy 3 tokens @ 0.05 each

      await notes.connect(alice).depositETH(statementId, { value: paymentAmount });

      await notes.connect(alice).purchaseFromERC1155SecondaryMarket(
        [1], // noteIds
        paymentAmount,
        await marketplace.getAddress(),
        await erc1155Token.getAddress(),
        0, // saleListingId
        1, // tokenId
        3  // count
      );

      // Should have purchased tokens in a new note
      const purchasedNote = await notes.notes(2);
      expect(purchasedNote.owner).to.equal(alice.address);
      expect(purchasedNote.token).to.equal(await erc1155Token.getAddress());
      expect(purchasedNote.tokenId).to.equal(1);
      expect(purchasedNote.amount).to.equal(3);
    });

    it("Should purchase from marketplace with leftover ETH", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const paymentAmount = ethers.parseEther("0.15");

      await notes.connect(alice).depositETH(statementId, { value: depositAmount });

      await notes.connect(alice).purchaseFromERC1155SecondaryMarket(
        [1],
        paymentAmount,
        await marketplace.getAddress(),
        await erc1155Token.getAddress(),
        0,
        1,
        3
      );

      // Should have leftover ETH note
      const leftoverNote = await notes.notes(3);
      expect(leftoverNote.token).to.equal(ethers.ZeroAddress);
      expect(leftoverNote.amount).to.equal(depositAmount - paymentAmount);

      // Should have purchased tokens note
      const purchasedNote = await notes.notes(4);
      expect(purchasedNote.token).to.equal(await erc1155Token.getAddress());
      expect(purchasedNote.amount).to.equal(3);
    });

    it("Should preserve delegation chain when purchasing from marketplace", async function () {
      const paymentAmount = ethers.parseEther("0.15");

      await notes.connect(alice).depositETH(statementId, { value: paymentAmount });
      await notes.connect(alice).delegate(1, bob.address, paymentAmount, 0);

      await notes.connect(bob).purchaseFromERC1155SecondaryMarket(
        [2],
        paymentAmount,
        await marketplace.getAddress(),
        await erc1155Token.getAddress(),
        0,
        1,
        3
      );

      // Should recreate delegation chain
      const [noteIds, owners] = await notes.getChain(4);
      expect(noteIds.length).to.equal(2);
      expect(owners[0]).to.equal(bob.address);
      expect(owners[1]).to.equal(alice.address);
    });

    it("Should revert if payment amount is zero", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("1") });

      await expect(
        notes.connect(alice).purchaseFromERC1155SecondaryMarket(
          [1],
          0,
          await marketplace.getAddress(),
          await erc1155Token.getAddress(),
          0,
          1,
          3
        )
      ).to.be.revertedWith("Payment amount must be greater than 0");
    });

    it("Should revert if marketplace rejects payment (wrong amount)", async function () {
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("0.5") });

      // Try to pay 0.1 ETH for 3 tokens (which cost 0.15 ETH)
      await expect(
        notes.connect(alice).purchaseFromERC1155SecondaryMarket(
          [1],
          ethers.parseEther("0.1"), // wrong amount
          await marketplace.getAddress(),
          await erc1155Token.getAddress(),
          0,
          1,
          3
        )
      ).to.be.revertedWith("Incorrect payment");
    });

    it("Should work with multiple notes for marketplace purchase with proportional distribution", async function () {
      const paymentAmount = ethers.parseEther("0.30"); // Buy 6 tokens @ 0.05 each (using all funds)

      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("0.15") });
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("0.15") });

      const tx = await notes.connect(alice).purchaseFromERC1155SecondaryMarket(
        [1, 2],
        paymentAmount,
        await marketplace.getAddress(),
        await erc1155Token.getAddress(),
        0,
        1,
        6
      );

      const receipt = await tx.wait();
      const purchaseEvent = receipt.logs.find(log => {
        try {
          return notes.interface.parseLog(log)?.name === "ERC1155Purchased";
        } catch {
          return false;
        }
      });

      const parsed = notes.interface.parseLog(purchaseEvent);
      const outputNoteIds = parsed.args.outputNoteIds;

      // Should create 2 output notes (one for each input chain)
      expect(outputNoteIds.length).to.equal(2);

      // Each note should have 3 tokens
      const note1 = await notes.notes(outputNoteIds[0]);
      const note2 = await notes.notes(outputNoteIds[1]);

      expect(note1.token).to.equal(await erc1155Token.getAddress());
      expect(note1.amount).to.equal(3);
      expect(note1.owner).to.equal(alice.address);

      expect(note2.token).to.equal(await erc1155Token.getAddress());
      expect(note2.amount).to.equal(3);
      expect(note2.owner).to.equal(alice.address);

      // Total should be 6 tokens
      expect(note1.amount + note2.amount).to.equal(6);
    });

    it("Should emit ERC1155Purchased event", async function () {
      const paymentAmount = ethers.parseEther("0.15");
      await notes.connect(alice).depositETH(statementId, { value: paymentAmount });

      await expect(
        notes.connect(alice).purchaseFromERC1155SecondaryMarket(
          [1],
          paymentAmount,
          await marketplace.getAddress(),
          await erc1155Token.getAddress(),
          0,
          1,
          3
        )
      ).to.emit(notes, "ERC1155Purchased");
    });
  });

  describe("Integration: Multiple Purchases", function () {
    it("Should handle multiple purchases in sequence", async function () {
      // Alice deposits, buys from seller, then buys from marketplace
      await notes.connect(alice).depositETH(statementId, { value: ethers.parseEther("2.0") });

      // First purchase from assurance contract
      await notes.connect(alice).purchaseFromERC1155PrimaryMarket(
        [1],
        ethers.parseEther("0.5"), // Buy 5 of token 1
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        [1],
        [5]
      );

      // Note IDs after first purchase:
      // 1: deleted (original deposit)
      // 2: split for payment (deleted after consumption)
      // 3: leftover ETH (1.5 ETH remaining)
      // 4: purchased tokens (5 of token ID 1)

      // Setup marketplace listing
      await erc1155Token.connect(seller).mintBatch(seller.address, [2], [20]);
      await erc1155Token.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(seller).createSaleListing(2, 20, ethers.parseEther("0.1"));

      // Second purchase from marketplace (using leftover ETH note 3)
      await notes.connect(alice).purchaseFromERC1155SecondaryMarket(
        [3], // leftover ETH note
        ethers.parseEther("0.5"),
        await marketplace.getAddress(),
        await erc1155Token.getAddress(),
        0, // listing ID (note: this is the new marketplace, so listing 0)
        2,
        5
      );

      // After second purchase:
      // 3: deleted (leftover from first purchase)
      // 4: still exists (purchased tokens from first purchase)
      // 5: split for payment (deleted after consumption)
      // 6: new leftover ETH (1.0 ETH remaining)
      // 7: newly purchased tokens (5 of token ID 2)

      // Should have first purchase output
      const note1 = await notes.notes(4);
      expect(note1.tokenId).to.equal(1);
      expect(note1.amount).to.equal(5);

      // Should have second purchase output
      const note2 = await notes.notes(7);
      expect(note2.tokenId).to.equal(2);
      expect(note2.amount).to.equal(5);
    });
  });
});
