import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("SuggestedNames", function () {
  let suggestedNames;
  let alice, bob;

  beforeEach(async function () {
    [alice, bob] = await ethers.getSigners();
    const SuggestedNames = await ethers.getContractFactory("SuggestedNames");
    suggestedNames = await SuggestedNames.deploy();
  });

  it("lets an account suggest its own name", async function () {
    await expect(suggestedNames.connect(alice).suggestName(alice.address, "Ada"))
      .to.emit(suggestedNames, "NameSuggested")
      .withArgs(alice.address, alice.address, "Ada");
  });

  it("lets an account suggest a name for someone else", async function () {
    await expect(suggestedNames.connect(bob).suggestName(alice.address, "Ada Lovelace"))
      .to.emit(suggestedNames, "NameSuggested")
      .withArgs(bob.address, alice.address, "Ada Lovelace");
  });
});
