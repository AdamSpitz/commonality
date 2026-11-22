import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("StatementImages", function () {
  let images;
  let alice, bob;

  const statementId = ethers.id("statement");
  const imageId = ethers.id("image");
  const otherImage = ethers.id("other-image");
  const promptHash = ethers.id("prompt-v1");
  const modelId = ethers.id("model-v1");

  beforeEach(async function () {
    [alice, bob] = await ethers.getSigners();
    const StatementImages = await ethers.getContractFactory("StatementImages");
    images = await StatementImages.deploy();
  });

  it("records an adoption without touching anyone else's", async function () {
    await images.connect(alice).adoptImage(statementId, imageId);

    expect(await images.adoptions(alice.address, statementId, imageId)).to.equal(true);
    expect(await images.adoptions(bob.address, statementId, imageId)).to.equal(false);
  });

  it("lets one signer adopt more than one image and drop one", async function () {
    await images.connect(alice).adoptImage(statementId, imageId);
    await images.connect(alice).adoptImage(statementId, otherImage);
    await images.connect(alice).revokeImageAdoption(statementId, imageId);

    expect(await images.adoptions(alice.address, statementId, imageId)).to.equal(false);
    expect(await images.adoptions(alice.address, statementId, otherImage)).to.equal(true);
  });

  it("rejects a zero statement or image", async function () {
    await expect(images.adoptImage(ethers.ZeroHash, imageId)).to.be.revertedWithCustomError(
      images,
      "InvalidStatementId",
    );
    await expect(images.adoptImage(statementId, ethers.ZeroHash)).to.be.revertedWithCustomError(
      images,
      "InvalidImageId",
    );
  });

  it("records a mosaic-safety yes with prompt hash and lets the same attester withdraw it", async function () {
    await expect(images.connect(bob).attestMosaicSafety(statementId, imageId, promptHash, modelId))
      .to.emit(images, "MosaicSafetyAttested")
      .withArgs(bob.address, statementId, imageId, promptHash, modelId);

    expect(await images.mosaicSafety(bob.address, statementId, imageId)).to.equal(true);
    expect(await images.mosaicPromptHash(bob.address, statementId, imageId)).to.equal(promptHash);

    await images.connect(bob).revokeMosaicSafety(statementId, imageId);
    expect(await images.mosaicSafety(bob.address, statementId, imageId)).to.equal(false);
  });

  it("refuses a mosaic-safety yes with an empty prompt hash", async function () {
    await expect(
      images.attestMosaicSafety(statementId, imageId, ethers.ZeroHash, modelId),
    ).to.be.revertedWithCustomError(images, "InvalidPromptHash");
  });

  it("does not let a different attester's revoke clear a yes", async function () {
    await images.connect(alice).attestMosaicSafety(statementId, imageId, promptHash, modelId);
    await images.connect(bob).revokeMosaicSafety(statementId, imageId);

    expect(await images.mosaicSafety(alice.address, statementId, imageId)).to.equal(true);
  });
});
