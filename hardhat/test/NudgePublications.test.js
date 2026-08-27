import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("NudgePublications", function () {
  it("publishes a nonzero batch CID for the caller", async function () {
    const [, nudger] = await ethers.getSigners();
    const publications = await ethers.deployContract("NudgePublications");
    const batchCid = ethers.id("bafy-test-batch");

    await expect(publications.connect(nudger).publishNudgeBatch(batchCid))
      .to.emit(publications, "NudgesPublished")
      .withArgs(nudger.address, batchCid);
  });

  it("rejects the zero batch CID", async function () {
    const publications = await ethers.deployContract("NudgePublications");

    await expect(publications.publishNudgeBatch(ethers.ZeroHash))
      .to.be.revertedWithCustomError(publications, "InvalidBatchCid");
  });
});
