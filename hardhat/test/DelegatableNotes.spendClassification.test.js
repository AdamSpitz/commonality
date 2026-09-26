import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("DelegatableNotes spend classification", function () {
  let notes, alice, bob, market, registry;
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

    const token = await ethers.deployContract("PremintingERC20", [
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

  it("does not treat a claim-later route as unsuspicious", async function () {
    await market.setRoute(beneficiaryId, await market.getAddress(), await registry.getAddress());
    await notes.connect(alice).setFineListed(1, owners(), beneficiaryId, true);
    const [delay, spendClass] = await notes.effectiveSpendDelay(1, market.target);
    expect(delay).to.equal(100n);
    expect(spendClass).to.equal(0);
  });
});
