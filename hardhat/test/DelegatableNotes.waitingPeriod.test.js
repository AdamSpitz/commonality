import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const { ethers } = hre;

describe("DelegatableNotes waiting period", function () {
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

  async function delegateAmount(amount, delay) {
    await paymentToken.connect(alice).approve(await notes.getAddress(), amount);
    const noteId = await notes.connect(alice).deposit.staticCall(await paymentToken.getAddress(), 0, 0, amount);
    await notes.connect(alice).deposit(await paymentToken.getAddress(), 0, 0, amount);
    await notes.connect(alice).delegateWithDelay(noteId, [alice.address], bob.address, amount, delay);
    return noteId;
  }

  const marketArgs = (noteId = 1) => [
    noteId,
    [bob.address, alice.address],
    assuranceContract.target,
    erc1155Token.target,
    1,
    1,
  ];

  it("spends immediately when the delay is zero and blocks a direct spend when it is not", async function () {
    const immediate = await delegateAmount(ethers.parseEther("0.1"), 0);
    await notes.connect(bob).scheduleSpend(
      immediate,
      [bob.address, alice.address],
      assuranceContract.target,
      erc1155Token.target,
      1,
      1
    );
    expect((await notes.notes(immediate)).chainHash).to.equal(ethers.ZeroHash);

    const delayed = await delegateAmount(ethers.parseEther("0.1"), 3600);
    await expect(
      notes.connect(bob).purchaseFromPrimaryMarket(
        [{ noteId: delayed, chain: [bob.address, alice.address], shares: 1 }],
        assuranceContract.target,
        erc1155Token.target,
        1,
        1
      )
    ).to.be.revertedWithCustomError(notes, "SpendMustBeScheduled");
  });

  it("lets anyone complete a scheduled spend after the delay, and the donor approve it early", async function () {
    const noteId = await delegateAmount(ethers.parseEther("0.2"), 3600);
    await notes.connect(bob).splitNote(noteId, [bob.address, alice.address], ethers.parseEther("0.1"));
    const splitId = noteId + 1n;
    await notes.connect(bob).scheduleSpend(
      splitId,
      [bob.address, alice.address],
      assuranceContract.target,
      erc1155Token.target,
      1,
      1
    );

    await expect(notes.connect(carol).executeScheduledSpend(splitId, [bob.address, alice.address]))
      .to.be.revertedWithCustomError(notes, "SpendNotDue");
    await expect(notes.connect(bob).splitNote(splitId, [bob.address, alice.address], 1))
      .to.be.revertedWithCustomError(notes, "SpendAlreadyScheduled");

    await notes.connect(alice).approveScheduledSpend(splitId, [bob.address, alice.address]);
    expect((await notes.pendingSpends(splitId)).exists).to.equal(false);

    await notes.connect(bob).scheduleSpend(
      noteId,
      [bob.address, alice.address],
      assuranceContract.target,
      erc1155Token.target,
      1,
      1
    );
    await time.increase(3600);
    await notes.connect(carol).executeScheduledSpend(noteId, [bob.address, alice.address]);
    expect((await notes.pendingSpends(noteId)).exists).to.equal(false);
  });

  it("pauses only in strict mode and only the donor can move a paused spend", async function () {
    const noteId = await delegateAmount(ethers.parseEther("0.1"), 3600);
    await notes.connect(alice).setSpendFlagger(noteId, [bob.address, alice.address], carol.address, true);
    await notes.connect(bob).scheduleSpend(...marketArgs(noteId));

    await notes.connect(carol).flagScheduledSpend(noteId, [bob.address, alice.address]);
    expect((await notes.pendingSpends(noteId)).paused).to.equal(false);

    await notes.connect(alice).setStrictMode(noteId, [bob.address, alice.address], true);
    expect((await notes.pendingSpends(noteId)).paused).to.equal(false);
    await notes.connect(carol).flagScheduledSpend(noteId, [bob.address, alice.address]);
    expect((await notes.pendingSpends(noteId)).paused).to.equal(true);

    await time.increase(3600);
    await expect(notes.connect(carol).executeScheduledSpend(noteId, [bob.address, alice.address]))
      .to.be.revertedWithCustomError(notes, "SpendPaused");
    await expect(notes.connect(bob).cancelScheduledSpend(noteId, [bob.address, alice.address]))
      .to.be.revertedWithCustomError(notes, "SpendPaused");

    await notes.connect(alice).setStrictMode(noteId, [bob.address, alice.address], false);
    expect((await notes.pendingSpends(noteId)).paused).to.equal(true);
    await notes.connect(alice).cancelScheduledSpend(noteId, [bob.address, alice.address]);
    expect((await notes.pendingSpends(noteId)).exists).to.equal(false);
  });

  it("clears a pending spend when the donor revokes", async function () {
    const noteId = await delegateAmount(ethers.parseEther("0.1"), 60);
    await notes.connect(bob).scheduleSpend(...marketArgs(noteId));
    const nonce = (await notes.pendingSpends(noteId)).nonce;
    await expect(notes.connect(alice).revoke(noteId, [bob.address, alice.address]))
      .to.emit(notes, "SpendScheduleCleared")
      .withArgs(noteId, nonce);
    expect((await notes.pendingSpends(noteId)).exists).to.equal(false);
  });

  it("clears a pending spend when the donor replaces the delegate", async function () {
    const noteId = await delegateAmount(ethers.parseEther("0.1"), 60);
    await notes.connect(bob).scheduleSpend(...marketArgs(noteId));
    await notes.connect(alice).replaceDelegate(
      noteId,
      [bob.address, alice.address],
      carol.address,
      ethers.parseEther("0.1")
    );
    expect((await notes.pendingSpends(noteId)).exists).to.equal(false);
  });

  it("rejects a schedule whose price is not the whole note", async function () {
    const noteId = await delegateAmount(ethers.parseEther("0.2"), 3600);
    await expect(
      notes.connect(bob).scheduleSpend(...marketArgs(noteId))
    ).to.be.revertedWithCustomError(notes, "ScheduledSpendMustUseWholeNote");
  });

  it("keeps an in-flight deadline when she changes the delay", async function () {
    const noteId = await delegateAmount(ethers.parseEther("0.1"), 1000);
    await notes.connect(bob).scheduleSpend(...marketArgs(noteId));
    const deadline = (await notes.pendingSpends(noteId)).deadline;
    await notes.connect(alice).setSpendDelay(noteId, [bob.address, alice.address], 10);
    expect((await notes.pendingSpends(noteId)).deadline).to.equal(deadline);
    expect((await notes.spendPolicies(noteId)).delay).to.equal(10);
  });
});
