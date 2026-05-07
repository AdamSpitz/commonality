import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("DelegatableNotes - Purchase Functionality", function () {
  let notes;
  let alice, bob, seller;
  let erc1155Token;
  let paymentToken;
  let assuranceContract;
  let marketplace;
  let assuranceFactory;
  let marketplaceFactory;

  beforeEach(async function () {
    [alice, bob, seller] = await ethers.getSigners();

    const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
    paymentToken = await PremintingERC20.deploy(
      seller.address,
      "Delegation Payment Token",
      "DPT",
      "https://example.com/payment-token.json"
    );
    await paymentToken.connect(seller).mint(alice.address, ethers.parseEther("1000"));
    await paymentToken.connect(seller).mint(bob.address, ethers.parseEther("1000"));
    await paymentToken.connect(seller).mint(seller.address, ethers.parseEther("1000"));

    const AssuranceContractFactory = await ethers.getContractFactory("AssuranceContractFactory");
    assuranceFactory = await AssuranceContractFactory.deploy();
    const MarketplaceFactoryContract = await ethers.getContractFactory("MarketplaceFactory");
    marketplaceFactory = await MarketplaceFactoryContract.deploy();

    const DelegatableNotes = await ethers.getContractFactory("DelegatableNotes");
    notes = await DelegatableNotes.deploy(
      await assuranceFactory.getAddress(),
      await marketplaceFactory.getAddress()
    );

    const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
    erc1155Token = await PremintingERC1155.deploy(
      seller.address,
      "https://example.com/token/{id}.json",
      "https://example.com/contract.json"
    );

    const latestBlock = await ethers.provider.getBlock("latest");
    const deadline = latestBlock.timestamp + 86400;
    const tx = await assuranceFactory.createAssuranceContract(
      seller.address,
      seller.address,
      await paymentToken.getAddress(),
      await erc1155Token.getAddress(),
      "QmTest123"
    );
    const receipt = await tx.wait();
    const acEvent = receipt.logs.find(
      log => log.fragment && log.fragment.name === "PubstarterAssuranceContractCreated"
    );
    const MultiERC1155AssuranceContract = await ethers.getContractFactory("MultiERC1155AssuranceContract");
    assuranceContract = MultiERC1155AssuranceContract.attach(acEvent.args[0]);

    const ValueThresholdCondition = await ethers.getContractFactory("ValueThresholdCondition");
    const condition = await ValueThresholdCondition.deploy(
      acEvent.args[0],
      ethers.parseEther("10"),
      deadline
    );
    await assuranceContract.connect(seller).setCondition(await condition.getAddress());

    await erc1155Token.connect(seller).mintBatch(
      await assuranceContract.getAddress(),
      [1, 2, 3],
      [1000, 1000, 1000]
    );

    await assuranceContract.connect(seller).setPricesERC1155(
      [1, 2, 3],
      [ethers.parseEther("0.1"), ethers.parseEther("0.2"), ethers.parseEther("0.5")]
    );

    const mktTx = await marketplaceFactory.createMarketplace(
      await erc1155Token.getAddress(),
      await paymentToken.getAddress()
    );
    const mktReceipt = await mktTx.wait();
    const mktEvent = mktReceipt.logs.find(
      log => log.fragment && log.fragment.name === "PubstarterERC1155SecondaryMarketCreated"
    );
    const ERC1155SecondaryMarket = await ethers.getContractFactory("ERC1155SecondaryMarket");
    marketplace = ERC1155SecondaryMarket.attach(mktEvent.args[0]);

    await erc1155Token.connect(seller).mintBatch(seller.address, [1], [100]);
    await erc1155Token.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
    await marketplace.connect(seller).createSaleListing(1, 100, ethers.parseEther("0.1"));
  });

  async function depositPaymentNote(signer, amount) {
    await paymentToken.connect(signer).approve(await notes.getAddress(), amount);
    return notes.connect(signer).deposit(await paymentToken.getAddress(), 0, 0, amount);
  }

  function purchaseShare(noteId, chain, shares) {
    return { noteId, chain, shares };
  }

  describe("primary-market purchases", function () {
    it("purchases one token type using a single exact note", async function () {
      const paymentAmount = ethers.parseEther("0.3");
      await depositPaymentNote(alice, paymentAmount);

      await notes.connect(alice).purchaseFromPrimaryMarket(
        [purchaseShare(1, [alice.address], 3)],
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        1,
        3
      );

      const originalNote = await notes.notes(1);
      expect(originalNote.amount).to.equal(0);

      const outputNote = await notes.notes(2);
      expect(outputNote.token).to.equal(await erc1155Token.getAddress());
      expect(outputNote.tokenType).to.equal(1);
      expect(outputNote.tokenId).to.equal(1);
      expect(outputNote.amount).to.equal(3);
    });

    it("leaves payment-note remainder when only part of a note is spent", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const paymentAmount = ethers.parseEther("0.3");
      await depositPaymentNote(alice, depositAmount);

      await expect(notes.connect(alice).purchaseFromPrimaryMarket(
        [purchaseShare(1, [alice.address], 3)],
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        1,
        3
      )).to.emit(notes, "NoteConsumed").withArgs(1, paymentAmount, depositAmount - paymentAmount, false);

      const note = await notes.notes(1);
      expect(note.amount).to.equal(depositAmount - paymentAmount);
      expect(note.token).to.equal(await paymentToken.getAddress());
    });

    it("uses explicit shares to avoid arbitrary output rounding", async function () {
      const amount1 = ethers.parseEther("0.3");
      const amount2 = ethers.parseEther("0.3");
      await depositPaymentNote(alice, amount1);
      await depositPaymentNote(alice, amount2);

      const tx = notes.connect(alice).purchaseFromPrimaryMarket(
        [
          purchaseShare(1, [alice.address], 3),
          purchaseShare(2, [alice.address], 3)
        ],
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        1,
        6
      );

      await expect(tx).to.emit(notes, "NoteCreated").withArgs(3, alice.address, 3, await erc1155Token.getAddress(), 1, 1);
      await expect(tx).to.emit(notes, "NoteCreated").withArgs(4, alice.address, 3, await erc1155Token.getAddress(), 1, 1);
    });

    it("supports unequal explicit shares", async function () {
      await depositPaymentNote(alice, ethers.parseEther("0.2"));
      await depositPaymentNote(alice, ethers.parseEther("0.1"));

      await notes.connect(alice).purchaseFromPrimaryMarket(
        [
          purchaseShare(1, [alice.address], 2),
          purchaseShare(2, [alice.address], 1)
        ],
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        1,
        3
      );

      expect((await notes.notes(3)).amount).to.equal(2);
      expect((await notes.notes(4)).amount).to.equal(1);
    });

    it("rejects shares whose sum does not equal the purchased count", async function () {
      await depositPaymentNote(alice, ethers.parseEther("0.3"));

      await expect(notes.connect(alice).purchaseFromPrimaryMarket(
        [purchaseShare(1, [alice.address], 2)],
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        1,
        3
      )).to.be.revertedWithCustomError(notes, "InvalidPurchaseShares");
    });

    it("rejects zero shares", async function () {
      await depositPaymentNote(alice, ethers.parseEther("0.3"));

      await expect(notes.connect(alice).purchaseFromPrimaryMarket(
        [purchaseShare(1, [alice.address], 0)],
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        1,
        3
      )).to.be.revertedWithCustomError(notes, "InvalidPurchaseShares");
    });

    it("rejects invalid caller and chain", async function () {
      await depositPaymentNote(alice, ethers.parseEther("0.3"));

      await expect(notes.connect(bob).purchaseFromPrimaryMarket(
        [purchaseShare(1, [alice.address], 3)],
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        1,
        3
      )).to.be.revertedWithCustomError(notes, "NotNoteOwner");

      await expect(notes.connect(alice).purchaseFromPrimaryMarket(
        [purchaseShare(1, [bob.address], 3)],
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        1,
        3
      )).to.be.revertedWithCustomError(notes, "InvalidChain");
    });

    it("preserves delegation chain in output notes", async function () {
      const paymentAmount = ethers.parseEther("0.3");
      await depositPaymentNote(alice, paymentAmount);
      await notes.connect(alice).delegate(1, [alice.address], bob.address, paymentAmount);

      await notes.connect(bob).purchaseFromPrimaryMarket(
        [purchaseShare(1, [bob.address, alice.address], 3)],
        await assuranceContract.getAddress(),
        await erc1155Token.getAddress(),
        1,
        3
      );

      const expectedChainHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32"],
          [bob.address, ethers.keccak256(ethers.solidityPacked(["address", "bytes32"], [alice.address, ethers.ZeroHash]))]
        )
      );
      expect((await notes.notes(2)).chainHash).to.equal(expectedChainHash);
    });
  });

  describe("secondary-market purchases", function () {
    it("purchases one secondary-market listing with explicit shares", async function () {
      await depositPaymentNote(alice, ethers.parseEther("0.3"));

      await expect(notes.connect(alice).purchaseFromSecondaryMarket(
        [purchaseShare(1, [alice.address], 3)],
        await marketplace.getAddress(),
        0,
        3
      )).to.emit(notes, "ERC1155Purchased");

      const outputNote = await notes.notes(2);
      expect(outputNote.token).to.equal(await erc1155Token.getAddress());
      expect(outputNote.tokenId).to.equal(1);
      expect(outputNote.amount).to.equal(3);
    });
  });
});
