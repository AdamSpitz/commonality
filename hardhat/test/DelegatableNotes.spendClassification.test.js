import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("DelegatableNotes spend classification", function () {
  let notes, alice, bob, market, registry, token;
  const beneficiaryId = ethers.keccak256(ethers.toUtf8Bytes("dns:example.org"));

  beforeEach(async function () {
    [alice, bob] = await ethers.getSigners();
    const factory = await ethers.deployContract("AssuranceContractFactory");
    notes = await ethers.deployContract("DelegatableNotes", [await factory.getAddress()]);
    market = await ethers.deployContract("MockPrimaryMarket");
    registry = await ethers.deployContract("MockPayoutRegistry");
    await market.setPrice(ethers.parseEther("0.1"));
    await registry.setPayout(bob.address);
    await market.setRoute(beneficiaryId, bob.address, await registry.getAddress());

    token = await ethers.deployContract("PremintingERC20", [
      alice.address, "Token", "TKN", "https://example.com/t.json",
    ]);
    await token.connect(alice).mint(alice.address, ethers.parseEther("10"));
    await token.connect(alice).approve(await notes.getAddress(), ethers.parseEther("1"));
    const noteId = await notes.connect(alice).deposit.staticCall(await token.getAddress(), 0, 0, ethers.parseEther("0.1"));
    await notes.connect(alice).deposit(await token.getAddress(), 0, 0, ethers.parseEther("0.1"));
    await notes.connect(alice).delegateWithDelay(noteId, [alice.address], bob.address, ethers.parseEther("0.1"), 100);
  });

  const owners = () => [bob.address, alice.address];

  it("shortens and restores a pending deadline from the original schedule time", async function () {
    await notes.connect(bob).scheduleSpend(1, owners(), market.target, alice.address, 1, 1);
    const first = await notes.pendingSpends(1);
    expect(first.deadline).to.equal(first.scheduledAt + 100n);
    expect((await notes.effectiveSpendDelay(1, market.target)).class).to.equal(0);

    await notes.connect(alice).setUnsuspiciousDelay(1, owners(), 40);
    expect((await notes.pendingSpends(1)).deadline).to.equal(first.scheduledAt + 100n);

    await notes.connect(alice).setFineListed(1, owners(), beneficiaryId, true);
    expect((await notes.pendingSpends(1)).deadline).to.equal(first.scheduledAt + 40n);
    expect((await notes.effectiveSpendDelay(1, market.target)).class).to.equal(1);

    await notes.connect(alice).setFineListed(1, owners(), beneficiaryId, false);
    expect((await notes.pendingSpends(1)).deadline).to.equal(first.scheduledAt + 100n);
    expect((await notes.effectiveSpendDelay(1, market.target)).class).to.equal(0);
  });

  it("puts a spend back on the standing delay when the controller changes", async function () {
    await notes.connect(alice).setUnsuspiciousDelay(1, owners(), 10);
    await notes.connect(alice).setFineListed(1, owners(), beneficiaryId, true);
    await notes.connect(bob).scheduleSpend(1, owners(), market.target, alice.address, 1, 1);
    const first = await notes.pendingSpends(1);
    expect(first.deadline).to.equal(first.scheduledAt + 10n);

    await registry.setPayout(alice.address);
    expect(await notes.effectivePendingSpendDeadline(1)).to.equal(first.scheduledAt + 100n);
    expect((await notes.pendingSpends(1)).deadline).to.equal(first.scheduledAt + 10n);
    await notes.connect(bob).executeScheduledSpend(1, owners());
    const revised = await notes.pendingSpends(1);
    expect(revised.exists).to.equal(true);
    expect(revised.deadline).to.equal(first.scheduledAt + 100n);
    expect((await notes.effectiveSpendDelay(1, market.target)).class).to.equal(0);
  });

  it("does not let the unsuspicious delay exceed the standing delay", async function () {
    await expect(
      notes.connect(alice).setUnsuspiciousDelay(1, owners(), 101)
    ).to.be.revertedWithCustomError(notes, "UnsuspiciousDelayExceedsStanding");
  });

  it("preserves scheduled delays across standing-delay changes and reclassification", async function () {
    await notes.connect(alice).setUnsuspiciousDelay(1, owners(), 40);
    await notes.connect(alice).setFineListed(1, owners(), beneficiaryId, true);
    await notes.connect(bob).scheduleSpend(1, owners(), market.target, alice.address, 1, 1);
    const first = await notes.pendingSpends(1);
    await notes.connect(alice).setSpendDelay(1, owners(), 10);
    await expect(notes.connect(bob).executeScheduledSpend(1, owners()))
      .to.be.revertedWithCustomError(notes, "SpendNotDue");
    expect((await notes.pendingSpends(1)).deadline).to.equal(first.deadline);
    await notes.connect(alice).setFineListed(1, owners(), beneficiaryId, false);
    expect((await notes.pendingSpends(1)).deadline).to.equal(first.scheduledAt + 100n);
    await notes.connect(alice).setFineListed(1, owners(), beneficiaryId, true);
    expect((await notes.pendingSpends(1)).deadline).to.equal(first.scheduledAt + 40n);
    await notes.connect(alice).setUnsuspiciousDelay(1, owners(), 5);
    expect((await notes.pendingSpends(1)).deadline).to.equal(first.scheduledAt + 5n);
  });

  it("rejects a forged beneficiary registry on an authorized fixed-controller factory", async function () {
    const factory = await ethers.deployContract("FixedControllerFactory", [registry.target]);
    await notes.setPrimaryMarketFactoryAuthorization(factory.target, true);
    const forged = await ethers.deployContract("MockPayoutRegistry");
    await forged.setPayout(bob.address);
    await expect(factory.connect(bob).create(
      bob.address, bob.address, alice.address, alice.address, "ipfs://fake",
      beneficiaryId, forged.target
    )).to.be.revertedWithCustomError(factory, "InvalidRegistry");
  });

  it("records an immediate direct unsuspicious purchase from an authorized fixed route", async function () {
    const factory = await ethers.deployContract("FixedControllerFactory", [registry.target]);
    await notes.setPrimaryMarketFactoryAuthorization(factory.target, true);
    const receiptToken = await ethers.deployContract("PremintingERC1155", [
      bob.address, "ipfs://tokens/{id}", "ipfs://contract",
    ]);
    const tx = await factory.create(
      bob.address, bob.address, token.target, receiptToken.target, "ipfs://project", beneficiaryId, registry.target
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(log => log.fragment?.name === "FixedControllerAssuranceCreated");
    const fixed = await ethers.getContractAt("FixedControllerAssuranceContract", event.args.assuranceContract);
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;
    const condition = await ethers.deployContract("ValueThresholdCondition", [fixed.target, ethers.parseEther("0.1"), deadline]);
    await fixed.connect(bob).setCondition(condition.target);
    await receiptToken.connect(bob).mintBatch(fixed.target, [1], [10]);
    await receiptToken.connect(bob).setReceiptTransferBridge(fixed.target, true);
    await fixed.connect(bob).setPricesERC1155([1], [ethers.parseEther("0.1")]);
    await notes.connect(alice).setFineListed(1, owners(), beneficiaryId, true);
    await expect(notes.connect(bob).purchaseFromPrimaryMarket(
      [{ noteId: 1, chain: owners(), shares: 1 }], fixed.target, receiptToken.target, 1, 1
    )).to.emit(notes, "SpendClassResolved").withArgs(1, 1, beneficiaryId);
    expect((await notes.pendingSpends(1)).exists).to.equal(false);
    expect((await notes.notes(1)).chainHash).to.equal(ethers.ZeroHash);
  });

  it("does not treat a claim-later route as unsuspicious", async function () {
    await market.setRoute(beneficiaryId, await market.getAddress(), await registry.getAddress());
    await notes.connect(alice).setFineListed(1, owners(), beneficiaryId, true);
    const [delay, spendClass] = await notes.effectiveSpendDelay(1, market.target);
    expect(delay).to.equal(100n);
    expect(spendClass).to.equal(0);
  });

  it("keeps the fine list and delays when a takeback is partially delegated again", async function () {
    await notes.connect(alice).setUnsuspiciousDelay(1, owners(), 40);
    await notes.connect(alice).setFineListed(1, owners(), beneficiaryId, true);
    await notes.connect(alice).partialTakeback(1, owners(), ethers.parseEther("0.05"));
    await notes.connect(alice).delegate(2, [alice.address], bob.address, ethers.parseEther("0.02"));
    expect(await notes.fineList(3)).to.deep.equal([beneficiaryId]);
    expect((await notes.spendPolicies(3)).delay).to.equal(100);
    expect((await notes.spendPolicies(3)).unsuspiciousDelay).to.equal(40);
  });
});
