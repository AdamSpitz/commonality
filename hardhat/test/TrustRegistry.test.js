import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("TrustRegistry", function () {
  let trustRegistry;
  let alice, bob, charlie;

  beforeEach(async function () {
    [alice, bob, charlie] = await ethers.getSigners();
    const TrustRegistry = await ethers.getContractFactory("TrustRegistry");
    trustRegistry = await TrustRegistry.deploy();
  });

  it("stores a trust score and emits TrustSet", async function () {
    await expect(trustRegistry.connect(alice).setTrust(bob.address, 75))
      .to.emit(trustRegistry, "TrustSet")
      .withArgs(alice.address, bob.address, 75);

    expect(await trustRegistry.getTrust(alice.address, bob.address)).to.equal(75);
  });

  it("allows setting trust score to zero to revoke trust", async function () {
    await trustRegistry.connect(alice).setTrust(bob.address, 80);
    expect(await trustRegistry.getTrust(alice.address, bob.address)).to.equal(80);

    await trustRegistry.connect(alice).setTrust(bob.address, 0);
    expect(await trustRegistry.getTrust(alice.address, bob.address)).to.equal(0);
  });

  it("keeps trust mappings independent per truster", async function () {
    await trustRegistry.connect(alice).setTrust(charlie.address, 40);
    await trustRegistry.connect(bob).setTrust(charlie.address, 90);

    expect(await trustRegistry.getTrust(alice.address, charlie.address)).to.equal(40);
    expect(await trustRegistry.getTrust(bob.address, charlie.address)).to.equal(90);
  });

  it("supports batch trust updates", async function () {
    await expect(
      trustRegistry
        .connect(alice)
        .setTrustBatch([bob.address, charlie.address], [25, 95])
    )
      .to.emit(trustRegistry, "TrustSet")
      .withArgs(alice.address, bob.address, 25)
      .and.to.emit(trustRegistry, "TrustSet")
      .withArgs(alice.address, charlie.address, 95);

    expect(await trustRegistry.getTrust(alice.address, bob.address)).to.equal(25);
    expect(await trustRegistry.getTrust(alice.address, charlie.address)).to.equal(95);
  });

  it("rejects invalid scores", async function () {
    await expect(
      trustRegistry.connect(alice).setTrust(bob.address, 101)
    ).to.be.revertedWithCustomError(trustRegistry, "InvalidScore");
  });

  it("rejects self-trust", async function () {
    await expect(
      trustRegistry.connect(alice).setTrust(alice.address, 100)
    ).to.be.revertedWithCustomError(trustRegistry, "CannotTrustSelf");
  });

  it("rejects batch length mismatches", async function () {
    await expect(
      trustRegistry.connect(alice).setTrustBatch([bob.address], [50, 60])
    ).to.be.revertedWithCustomError(trustRegistry, "ArrayLengthMismatch");
  });
});
