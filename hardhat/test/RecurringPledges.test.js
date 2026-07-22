import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs.js";

const { ethers } = hre;

async function deployFixture() {
  const [alice, bob, carol] = await ethers.getSigners();

  const AssuranceContractFactory = await ethers.getContractFactory("AssuranceContractFactory");
  const assuranceFactory = await AssuranceContractFactory.deploy();

  const DelegatableNotes = await ethers.getContractFactory("DelegatableNotes");
  const notes = await DelegatableNotes.deploy(
    await assuranceFactory.getAddress()
  );

  const RecurringPledges = await ethers.getContractFactory("RecurringPledges");
  const recurringPledges = await RecurringPledges.deploy(await notes.getAddress());
  await notes.setRecurringPledgeRegistry(await recurringPledges.getAddress());

  const FreeERC20 = await ethers.getContractFactory("FreeERC20");
  const token = await FreeERC20.deploy("Test USD", "USDZZZ", 6);
  await token.mintTo(alice.address, 1_000_000n);

  return { alice, bob, carol, notes, recurringPledges, token };
}

describe("RecurringPledges", function () {
  it("creates a public pledge intent and executes the first note immediately", async function () {
    const { alice, bob, notes, recurringPledges, token } = await deployFixture();
    const amount = 10_000n;
    const period = 30n * 24n * 60n * 60n;

    await token.connect(alice).approve(await notes.getAddress(), amount * 12n);

    const tx = recurringPledges.connect(alice).createStandingPledge(
      bob.address,
      await token.getAddress(),
      amount,
      period,
      "bafy-cause"
    );

    await expect(tx)
      .to.emit(recurringPledges, "StandingPledgeCreated")
      .withArgs(1, alice.address, bob.address, await token.getAddress(), amount, period, "bafy-cause", 0)
      .and.to.emit(notes, "NoteCreated")
      .withArgs(1, alice.address, amount, await token.getAddress(), 0, 0)
      .and.to.emit(notes, "NoteDelegated")
      .withArgs(1, 1, bob.address, amount)
      .and.to.emit(recurringPledges, "StandingPledgeExecuted")
      .withArgs(1, 1, anyValue);

    const pledge = await recurringPledges.pledges(1);
    expect(pledge.rootOwner).to.equal(alice.address);
    expect(pledge.delegateTo).to.equal(bob.address);
    expect(pledge.amountPerPeriod).to.equal(amount);
    expect(pledge.active).to.equal(true);
    expect(pledge.lastExecuted).to.be.greaterThan(0);

    const note = await notes.notes(1);
    expect(note.amount).to.equal(amount);
    expect(note.token).to.equal(await token.getAddress());
    expect(await token.balanceOf(await notes.getAddress())).to.equal(amount);
  });

  it("allows anyone to execute a due pledge but not before it is due", async function () {
    const { alice, bob, carol, notes, recurringPledges, token } = await deployFixture();
    const amount = 10_000n;
    const period = 60n;

    await token.connect(alice).approve(await notes.getAddress(), amount * 3n);
    await recurringPledges.connect(alice).createStandingPledge(
      bob.address,
      await token.getAddress(),
      amount,
      period,
      "bafy-cause"
    );

    await expect(recurringPledges.connect(carol).executeDue(1))
      .to.be.revertedWithCustomError(recurringPledges, "PledgeNotDue");

    await time.increase(Number(period));

    await expect(recurringPledges.connect(carol).executeDue(1))
      .to.emit(notes, "NoteCreated")
      .withArgs(2, alice.address, amount, await token.getAddress(), 0, 0)
      .and.to.emit(notes, "NoteDelegated")
      .withArgs(2, 2, bob.address, amount)
      .and.to.emit(recurringPledges, "StandingPledgeExecuted");

    expect(await token.balanceOf(await notes.getAddress())).to.equal(amount * 2n);
  });

  it("lets the pledger cancel future executions", async function () {
    const { alice, bob, carol, recurringPledges, token, notes } = await deployFixture();
    const amount = 10_000n;

    await token.connect(alice).approve(await notes.getAddress(), amount * 2n);
    await recurringPledges.connect(alice).createStandingPledge(
      bob.address,
      await token.getAddress(),
      amount,
      60,
      "bafy-cause"
    );

    await expect(recurringPledges.connect(carol).cancelStandingPledge(1))
      .to.be.revertedWithCustomError(recurringPledges, "NotPledgeOwner");

    await expect(recurringPledges.connect(alice).cancelStandingPledge(1))
      .to.emit(recurringPledges, "StandingPledgeCancelled")
      .withArgs(1, alice.address);

    await time.increase(60);
    await expect(recurringPledges.executeDue(1))
      .to.be.revertedWithCustomError(recurringPledges, "PledgeInactive");
  });

  it("does not let arbitrary callers use the contract helper", async function () {
    const { alice, bob, notes, token } = await deployFixture();

    await expect(notes.connect(alice).createDelegatedNoteFor(
      alice.address,
      await token.getAddress(),
      10_000n,
      bob.address
    )).to.be.revertedWithCustomError(notes, "UnauthorizedRecurringPledgeRegistry");
  });

  it("freezes the recurring pledge registry after the initial set", async function () {
    const { carol, notes, recurringPledges } = await deployFixture();

    await expect(notes.setRecurringPledgeRegistry(carol.address))
      .to.be.revertedWithCustomError(notes, "RecurringPledgeRegistryAlreadySet");

    expect(await notes.recurringPledgeRegistry()).to.equal(await recurringPledges.getAddress());
  });
});
