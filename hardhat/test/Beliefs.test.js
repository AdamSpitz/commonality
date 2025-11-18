import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("Beliefs", function () {
  let beliefs;
  let alice, bob;

  beforeEach(async function () {
    [alice, bob] = await ethers.getSigners();
    const Beliefs = await ethers.getContractFactory("Beliefs");
    beliefs = await Beliefs.deploy();
  });

  it("Should allow setting belief to BELIEVES", async function () {
    const statementId = ethers.encodeBytes32String("test-statement");

    await beliefs.connect(alice).setBelief(statementId, 1);

    const belief = await beliefs.getBelief(alice.address, statementId);
    expect(belief).to.equal(1);
  });

  it("Should allow setting belief to DISBELIEVES", async function () {
    const statementId = ethers.encodeBytes32String("test-statement");

    await beliefs.connect(alice).setBelief(statementId, 2);

    const belief = await beliefs.getBelief(alice.address, statementId);
    expect(belief).to.equal(2);
  });

  it("Should default to NO_OPINION", async function () {
    const statementId = ethers.encodeBytes32String("test-statement");

    const belief = await beliefs.getBelief(alice.address, statementId);
    expect(belief).to.equal(0);
  });

  it("Should reject invalid belief state", async function () {
    const statementId = ethers.encodeBytes32String("test-statement");

    await expect(
      beliefs.connect(alice).setBelief(statementId, 3)
    ).to.be.revertedWith("Invalid belief state");
  });

  it("Should emit DirectSupport event", async function () {
    const statementId = ethers.encodeBytes32String("test-statement");

    await expect(beliefs.connect(alice).setBelief(statementId, 1))
      .to.emit(beliefs, "DirectSupport")
      .withArgs(alice.address, statementId, 1);
  });

  it("Should handle batch operations", async function () {
    const stmt1 = ethers.encodeBytes32String("statement-1");
    const stmt2 = ethers.encodeBytes32String("statement-2");
    const stmt3 = ethers.encodeBytes32String("statement-3");

    await beliefs.connect(alice).setBeliefsInBatch(
      [stmt1, stmt2, stmt3],
      [1, 2, 0]
    );

    expect(await beliefs.getBelief(alice.address, stmt1)).to.equal(1);
    expect(await beliefs.getBelief(alice.address, stmt2)).to.equal(2);
    expect(await beliefs.getBelief(alice.address, stmt3)).to.equal(0);
  });
});
