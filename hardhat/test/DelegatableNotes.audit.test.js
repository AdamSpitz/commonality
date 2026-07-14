import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("DelegatableNotes - Audit Regression Tests", function () {
  let notes;
  let assuranceFactory;
  let marketplaceFactory;
  let paymentToken;
  let erc1155Token;
  let primaryMarket;
  let secondaryMarket;
  let alice;
  let bob;
  let charlie;
  let recipient;
  let seller;

  beforeEach(async function () {
    [alice, bob, charlie, recipient, seller] = await ethers.getSigners();

    const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
    paymentToken = await PremintingERC20.deploy(
      seller.address,
      "Audit Payment Token",
      "APT",
      "ipfs://audit-payment-token"
    );
    for (const signer of [alice, bob, charlie, recipient, seller]) {
      await paymentToken.connect(seller).mint(signer.address, ethers.parseEther("1000"));
    }

    const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
    erc1155Token = await PremintingERC1155.deploy(
      seller.address,
      "https://example.com/audit/{id}.json",
      "ipfs://audit-erc1155"
    );

    const AssuranceContractFactory = await ethers.getContractFactory("AssuranceContractFactory");
    assuranceFactory = await AssuranceContractFactory.deploy();

    const MarketplaceFactory = await ethers.getContractFactory("MarketplaceFactory");
    marketplaceFactory = await MarketplaceFactory.deploy();

    const DelegatableNotes = await ethers.getContractFactory("DelegatableNotes");
    notes = await DelegatableNotes.deploy(
      await assuranceFactory.getAddress(),
      await marketplaceFactory.getAddress()
    );

    primaryMarket = await createAuthorizedPrimaryMarket();
    secondaryMarket = await createAuthorizedSecondaryMarket();
  });

  async function createAuthorizedPrimaryMarket() {
    const latestBlock = await ethers.provider.getBlock("latest");
    const deadline = latestBlock.timestamp + 86400;
    const threshold = ethers.parseEther("10");

    const tx = await assuranceFactory.createAssuranceContract(
      seller.address,
      recipient.address,
      await paymentToken.getAddress(),
      await erc1155Token.getAddress(),
      "ipfs://audit-primary-market"
    );
    const receipt = await tx.wait();
    const created = receipt.logs.find(
      (log) => log.fragment && log.fragment.name === "LazyGivingAssuranceContractCreated"
    );

    const MultiERC1155AssuranceContract = await ethers.getContractFactory("MultiERC1155AssuranceContract");
    const market = MultiERC1155AssuranceContract.attach(created.args[0]);

    const ValueThresholdCondition = await ethers.getContractFactory("ValueThresholdCondition");
    const condition = await ValueThresholdCondition.deploy(
      await market.getAddress(),
      threshold,
      deadline
    );
    await market.connect(seller).setCondition(await condition.getAddress());

    await erc1155Token.connect(seller).mintBatch(
      await market.getAddress(),
      [1, 2],
      [100, 100]
    );
    await market.connect(seller).setPricesERC1155(
      [1, 2],
      [ethers.parseEther("0.1"), ethers.parseEther("0.25")]
    );
    await erc1155Token.connect(seller).setReceiptTransferBridge(await market.getAddress(), true);

    return market;
  }

  async function createAuthorizedSecondaryMarket() {
    await erc1155Token.connect(seller).mintBatch(seller.address, [1, 2], [100, 100]);

    const tx = await marketplaceFactory.createMarketplace(
      await erc1155Token.getAddress(),
      await paymentToken.getAddress()
    );
    const receipt = await tx.wait();
    const created = receipt.logs.find(
      (log) => log.fragment && log.fragment.name === "LazyGivingERC1155SecondaryMarketCreated"
    );

    const ERC1155SecondaryMarket = await ethers.getContractFactory("ERC1155SecondaryMarket");
    const market = ERC1155SecondaryMarket.attach(created.args[0]);
    await erc1155Token.connect(seller).setReceiptTransferBridge(await market.getAddress(), true);
    return market;
  }

  async function depositPaymentNote(owner, amount) {
    await paymentToken.connect(owner).approve(await notes.getAddress(), amount);
    await notes.connect(owner).deposit(await paymentToken.getAddress(), 0, 0, amount);
  }

  describe("revocation usability", function () {
    it("should let a root revoker reclaim funds after revoking a one-hop delegation", async function () {
      const amount = ethers.parseEther("1");

      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount });
      await notes.connect(alice).delegate(1, [alice.address], bob.address, amount);

      await notes.connect(alice).revoke(1, [bob.address, alice.address]);

      await expect(notes.connect(alice).reclaimFunds(1))
        .to.emit(notes, "FundsReclaimed")
        .withArgs(1, alice.address, amount, ethers.ZeroAddress, 0, 0);
    });

    it("should let a middle revoker spend after revoking a child delegation", async function () {
      const amount = ethers.parseEther("1");
      const price = ethers.parseEther("0.3");

      await depositPaymentNote(alice, amount);
      await notes.connect(alice).delegate(1, [alice.address], bob.address, amount);
      await notes.connect(bob).delegate(1, [bob.address, alice.address], charlie.address, amount);

      await notes.connect(bob).revoke(1, [charlie.address, bob.address, alice.address]);

      await expect(notes.connect(bob).purchaseFromPrimaryMarket(
        [{ noteId: 1, chain: [bob.address, alice.address], shares: 3 }],
        await primaryMarket.getAddress(),
        await erc1155Token.getAddress(),
        1,
        3
      )).to.emit(notes, "ERC1155Purchased");
    });

    it("control: lets a leaf holder return control to the root", async function () {
      const amount = ethers.parseEther("1");

      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: amount });
      await notes.connect(alice).delegate(1, [alice.address], bob.address, amount);

      await notes.connect(bob).revoke(1, [bob.address, alice.address]);

      await expect(notes.connect(alice).reclaimFunds(1))
        .to.emit(notes, "FundsReclaimed")
        .withArgs(1, alice.address, amount, ethers.ZeroAddress, 0, 0);
    });
  });

  describe("primary-market payment accounting", function () {
    it("control: accepts exact primary-market payment", async function () {
      const exactPrice = ethers.parseEther("0.3");

      await depositPaymentNote(alice, exactPrice);

      await expect(notes.connect(alice).purchaseFromPrimaryMarket(
        [{ noteId: 1, chain: [alice.address], shares: 3 }],
        await primaryMarket.getAddress(),
        await erc1155Token.getAddress(),
        1,
        3
      )).to.emit(notes, "ERC1155Purchased");
    });

    it("should reject insufficient primary-market note balance without consuming note value", async function () {
      const exactPrice = ethers.parseEther("0.3");
      const underfunded = exactPrice - 1n;

      await depositPaymentNote(alice, underfunded);

      await expect(notes.connect(alice).purchaseFromPrimaryMarket(
        [{ noteId: 1, chain: [alice.address], shares: 3 }],
        await primaryMarket.getAddress(),
        await erc1155Token.getAddress(),
        1,
        3
      )).to.be.revertedWithCustomError(notes, "InsufficientBalance");

      const note = await notes.notes(1);
      expect(note.amount).to.equal(underfunded);
    });

    it("should reject shares whose sum does not equal the purchased output count", async function () {
      const noteAmount = ethers.parseEther("0.15");
      const exactPrice = ethers.parseEther("0.3");

      await depositPaymentNote(alice, noteAmount);
      await depositPaymentNote(alice, noteAmount);

      await expect(notes.connect(alice).purchaseFromPrimaryMarket(
        [
          { noteId: 1, chain: [alice.address], shares: 1 },
          { noteId: 2, chain: [alice.address], shares: 1 }
        ],
        await primaryMarket.getAddress(),
        await erc1155Token.getAddress(),
        1,
        3
      )).to.be.revertedWithCustomError(notes, "InvalidPurchaseShares");

      expect((await notes.notes(1)).amount).to.equal(noteAmount);
      expect((await notes.notes(2)).amount).to.equal(noteAmount);
    });

    it("should split notes atomically before purchase so output shares divide exactly", async function () {
      const firstSpend = ethers.parseEther("0.2");
      const secondDeposit = ethers.parseEther("0.2");
      const secondSpend = ethers.parseEther("0.1");
      const exactPrice = ethers.parseEther("0.3");

      await depositPaymentNote(alice, firstSpend);
      await depositPaymentNote(alice, secondDeposit);

      await expect(notes.connect(alice).purchaseFromPrimaryMarket(
        [
          { noteId: 1, chain: [alice.address], shares: 2 },
          { noteId: 2, chain: [alice.address], shares: 1 }
        ],
        await primaryMarket.getAddress(),
        await erc1155Token.getAddress(),
        1,
        3
      )).to.emit(notes, "ERC1155Purchased");

      expect((await notes.notes(1)).amount).to.equal(0);
      expect((await notes.notes(2)).amount).to.equal(secondDeposit - secondSpend);
      expect((await notes.notes(3)).amount).to.equal(2);
      expect((await notes.notes(4)).amount).to.equal(1);
    });
  });

  describe("secondary-market payment accounting", function () {
    beforeEach(async function () {
      await erc1155Token.connect(seller).setApprovalForAll(await secondaryMarket.getAddress(), true);
      await secondaryMarket.connect(seller).createSaleListing(1, 10, ethers.parseEther("0.1"));
    });

    it("control: accepts exact secondary-market payment", async function () {
      const exactPrice = ethers.parseEther("0.3");

      await depositPaymentNote(alice, exactPrice);

      await expect(notes.connect(alice).purchaseFromSecondaryMarket(
        [{ noteId: 1, chain: [alice.address], shares: 3 }],
        await secondaryMarket.getAddress(),
        0,
        3
      )).to.emit(notes, "ERC1155Purchased");
    });

    it("should reject insufficient secondary-market note balance without consuming note value", async function () {
      const exactPrice = ethers.parseEther("0.3");
      const underfunded = exactPrice - 1n;

      await depositPaymentNote(alice, underfunded);

      await expect(notes.connect(alice).purchaseFromSecondaryMarket(
        [{ noteId: 1, chain: [alice.address], shares: 3 }],
        await secondaryMarket.getAddress(),
        0,
        3
      )).to.be.revertedWithCustomError(notes, "InsufficientBalance");

      const note = await notes.notes(1);
      expect(note.amount).to.equal(underfunded);
    });

    it("should split notes atomically before secondary-market purchases", async function () {
      const firstSpend = ethers.parseEther("0.2");
      const secondDeposit = ethers.parseEther("0.2");
      const secondSpend = ethers.parseEther("0.1");
      const exactPrice = ethers.parseEther("0.3");

      await depositPaymentNote(alice, firstSpend);
      await depositPaymentNote(alice, secondDeposit);

      await expect(notes.connect(alice).purchaseFromSecondaryMarket(
        [
          { noteId: 1, chain: [alice.address], shares: 2 },
          { noteId: 2, chain: [alice.address], shares: 1 }
        ],
        await secondaryMarket.getAddress(),
        0,
        3
      )).to.emit(notes, "ERC1155Purchased");

      expect((await notes.notes(1)).amount).to.equal(0);
      expect((await notes.notes(2)).amount).to.equal(secondDeposit - secondSpend);
      expect((await notes.notes(3)).amount).to.equal(2);
      expect((await notes.notes(4)).amount).to.equal(1);
    });
  });
});
