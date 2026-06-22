import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("AccountAssertions", function () {
  let accountAssertions;
  let alice, bob;

  beforeEach(async function () {
    [alice, bob] = await ethers.getSigners();
    const AccountAssertions = await ethers.getContractFactory("AccountAssertions");
    accountAssertions = await AccountAssertions.deploy();
  });

  it("Defaults to not asserted", async function () {
    expect(await accountAssertions.asserted(alice.address)).to.equal(false);
  });

  it("Allows an account to assert this is its one account", async function () {
    await accountAssertions.connect(alice).assertSingleAccount();

    expect(await accountAssertions.asserted(alice.address)).to.equal(true);
  });

  it("Emits AccountAssertionSet(true) on assertion", async function () {
    await expect(accountAssertions.connect(alice).assertSingleAccount())
      .to.emit(accountAssertions, "AccountAssertionSet")
      .withArgs(alice.address, true);
  });

  it("Allows an account to revoke its assertion", async function () {
    await accountAssertions.connect(alice).assertSingleAccount();
    expect(await accountAssertions.asserted(alice.address)).to.equal(true);

    await accountAssertions.connect(alice).revokeAssertion();
    expect(await accountAssertions.asserted(alice.address)).to.equal(false);
  });

  it("Emits AccountAssertionSet(false) on revocation", async function () {
    await accountAssertions.connect(alice).assertSingleAccount();

    await expect(accountAssertions.connect(alice).revokeAssertion())
      .to.emit(accountAssertions, "AccountAssertionSet")
      .withArgs(alice.address, false);
  });

  it("Only affects the asserting account", async function () {
    await accountAssertions.connect(alice).assertSingleAccount();

    expect(await accountAssertions.asserted(alice.address)).to.equal(true);
    expect(await accountAssertions.asserted(bob.address)).to.equal(false);
  });

  it("Is idempotent: re-asserting keeps the account asserted", async function () {
    await accountAssertions.connect(alice).assertSingleAccount();
    await accountAssertions.connect(alice).assertSingleAccount();

    expect(await accountAssertions.asserted(alice.address)).to.equal(true);
  });

  it("Revoking without a prior assertion is a no-op (stays false)", async function () {
    await accountAssertions.connect(alice).revokeAssertion();

    expect(await accountAssertions.asserted(alice.address)).to.equal(false);
  });
});
