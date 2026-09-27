import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("DelegatableNotes partial takeback", function () {
  let notes, alice, bob, carol, seller, paymentToken, erc1155Token, assuranceContract;

  beforeEach(async function () {
    [alice, bob, carol, seller] = await ethers.getSigners();

    const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
    paymentToken = await PremintingERC20.deploy(
      seller.address,
      "Delegation Payment Token",
      "DPT",
      "https://example.com/payment-token.json"
    );
    await paymentToken.connect(seller).mint(alice.address, ethers.parseEther("1000"));
    await paymentToken.connect(seller).mint(seller.address, ethers.parseEther("1000"));

    const AssuranceContractFactory = await ethers.getContractFactory("AssuranceContractFactory");
    const assuranceFactory = await AssuranceContractFactory.deploy();
    const DelegatableNotes = await ethers.getContractFactory("DelegatableNotes");
    notes = await DelegatableNotes.deploy(await assuranceFactory.getAddress());

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
      log => log.fragment && log.fragment.name === "LazyGivingAssuranceContractCreated"
    );
    const MultiERC1155AssuranceContract = await ethers.getContractFactory("MultiERC1155AssuranceContract");
    assuranceContract = MultiERC1155AssuranceContract.attach(acEvent.args[0]);
    const ValueThresholdCondition = await ethers.getContractFactory("ValueThresholdCondition");
    const condition = await ValueThresholdCondition.deploy(
      acEvent.args[0],
      ethers.parseEther("0.1"),
      deadline
    );
    await assuranceContract.connect(seller).setCondition(await condition.getAddress());
    await erc1155Token.connect(seller).mintBatch(await assuranceContract.getAddress(), [1], [1000]);
    await assuranceContract.connect(seller).setPricesERC1155([1], [ethers.parseEther("0.1")]);
    await erc1155Token.connect(seller).setReceiptTransferBridge(await assuranceContract.getAddress(), true);
  });

  const chain = () => [bob.address, alice.address];
  const beneficiaryId = ethers.id("beneficiary");

  async function delegatedPayment(amount, delay = 3600) {
    await paymentToken.connect(alice).approve(await notes.getAddress(), amount);
    const noteId = await notes.connect(alice).deposit.staticCall(await paymentToken.getAddress(), 0, 0, amount);
    await notes.connect(alice).deposit(await paymentToken.getAddress(), 0, 0, amount);
    await notes.connect(alice).delegateWithDelay(noteId, [alice.address], bob.address, amount, delay);
    return noteId;
  }

  it("moves a partial amount onto a root-only note and leaves the parent delegated", async function () {
    const amount = ethers.parseEther("1");
    const slice = ethers.parseEther("0.4");
    const noteId = await delegatedPayment(amount);
    await notes.connect(alice).setUnsuspiciousDelay(noteId, chain(), 1200);
    await notes.connect(alice).setStrictMode(noteId, chain(), true);
    await notes.connect(alice).setSpendFlagger(noteId, chain(), carol.address, true);
    await notes.connect(alice).setFineListed(noteId, chain(), beneficiaryId, true);
    const parentHash = (await notes.notes(noteId)).chainHash;

    const tx = notes.connect(alice).partialTakeback(noteId, chain(), slice);
    const sliceId = noteId + 1n;
    await expect(tx).to.emit(notes, "NoteCreated").withArgs(
      sliceId,
      alice.address,
      slice,
      await paymentToken.getAddress(),
      0,
      0
    );
    await expect(tx).to.emit(notes, "NotePartiallyTakenBack").withArgs(noteId, sliceId, slice);
    await expect(tx).to.not.emit(notes, "NoteRevoked");
    await expect(tx).to.not.emit(notes, "ChainSplit");

    const parent = await notes.notes(noteId);
    const child = await notes.notes(sliceId);
    expect(parent.amount).to.equal(amount - slice);
    expect(parent.chainHash).to.equal(parentHash);
    const rootOnly = ethers.keccak256(ethers.solidityPacked(["address", "bytes32"], [alice.address, ethers.ZeroHash]));
    expect(child.chainHash).to.equal(rootOnly);
    expect(child.amount).to.equal(slice);

    const parentPolicy = await notes.spendPolicies(noteId);
    const childPolicy = await notes.spendPolicies(sliceId);
    expect(childPolicy.delay).to.equal(parentPolicy.delay);
    expect(childPolicy.unsuspiciousDelay).to.equal(1200);
    expect(childPolicy.strictMode).to.equal(true);
    expect(await notes.spendFlaggers(sliceId)).to.deep.equal([carol.address]);
    expect(await notes.fineList(sliceId)).to.deep.equal([beneficiaryId]);
    expect(await notes.isSpendFlagger(sliceId, carol.address)).to.equal(true);
    expect(await notes.fineListed(sliceId, beneficiaryId)).to.equal(true);
  });

  it("reverts for the whole balance, for zero, and while a spend is pending", async function () {
    const amount = ethers.parseEther("0.1");
    const noteId = await delegatedPayment(amount);
    await expect(notes.connect(alice).partialTakeback(noteId, chain(), amount))
      .to.be.revertedWithCustomError(notes, "SplitAmountMustBePartial");
    await expect(notes.connect(alice).partialTakeback(noteId, chain(), 0))
      .to.be.revertedWithCustomError(notes, "SplitAmountMustBePartial");
    await expect(notes.connect(bob).partialTakeback(noteId, chain(), 1))
      .to.be.revertedWithCustomError(notes, "NotNoteRoot");
    await expect(notes.connect(alice).partialTakeback(noteId, [alice.address], 1))
      .to.be.revertedWithCustomError(notes, "InvalidChain");

    await notes.connect(bob).scheduleSpend(
      noteId,
      chain(),
      assuranceContract.target,
      erc1155Token.target,
      1,
      1
    );
    const nonce = (await notes.pendingSpends(noteId)).nonce;
    await expect(notes.connect(alice).partialTakeback(noteId, chain(), 1))
      .to.be.revertedWithCustomError(notes, "SpendAlreadyScheduled");
    const pending = await notes.pendingSpends(noteId);
    expect(pending.exists).to.equal(true);
    expect(pending.nonce).to.equal(nonce);
    expect((await notes.notes(noteId)).amount).to.equal(amount);
  });

  it("lets her purchase the slice immediately even though the parent delay was copied", async function () {
    const noteId = await delegatedPayment(ethers.parseEther("0.2"), 3600);
    await notes.connect(alice).partialTakeback(noteId, chain(), ethers.parseEther("0.1"));
    const sliceId = noteId + 1n;
    expect((await notes.spendPolicies(sliceId)).delay).to.equal(3600);

    await expect(notes.connect(bob).purchaseFromPrimaryMarket(
      [{ noteId, chain: chain(), shares: 1 }],
      assuranceContract.target,
      erc1155Token.target,
      1,
      1
    )).to.be.revertedWithCustomError(notes, "SpendMustBeScheduled");

    await notes.connect(alice).purchaseFromPrimaryMarket(
      [{ noteId: sliceId, chain: [alice.address], shares: 1 }],
      assuranceContract.target,
      erc1155Token.target,
      1,
      1
    );
    expect((await notes.notes(sliceId)).chainHash).to.equal(ethers.ZeroHash);
  });

  it("moves a proportional reimbursement claim on a receipt note", async function () {
    const contribution = ethers.parseEther("0.3");
    await paymentToken.connect(alice).approve(await notes.getAddress(), contribution);
    await notes.connect(alice).deposit(await paymentToken.getAddress(), 0, 0, contribution);
    await notes.connect(alice).purchaseFromPrimaryMarket(
      [{ noteId: 1, chain: [alice.address], shares: 3 }],
      assuranceContract.target,
      erc1155Token.target,
      1,
      3
    );
    const receiptId = 2n;
    await notes.connect(alice).delegate(receiptId, [alice.address], bob.address, 3);
    await notes.connect(alice).partialTakeback(receiptId, chain(), 1);

    expect((await notes.reimbursementClaims(receiptId)).contribution).to.equal(ethers.parseEther("0.2"));
    expect((await notes.reimbursementClaims(3)).contribution).to.equal(ethers.parseEther("0.1"));
    expect((await notes.notes(receiptId)).amount).to.equal(2);
    expect((await notes.notes(3)).amount).to.equal(1);
    expect((await notes.notes(3)).tokenType).to.equal(1);
  });
});
