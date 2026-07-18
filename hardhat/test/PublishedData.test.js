import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("PublishedData", function () {
  let publishedData;
  let alice, bob;

  beforeEach(async function () {
    [alice, bob] = await ethers.getSigners();
    const PublishedData = await ethers.getContractFactory("PublishedData");
    publishedData = await PublishedData.deploy();
  });

  it("publishes content under the sender and emits the bytes for indexers", async function () {
    const content = ethers.toUtf8Bytes("hello published data");
    const dataId = ethers.sha256(content);

    await expect(publishedData.connect(alice).publishData(content))
      .to.emit(publishedData, "DataPublished")
      .withArgs(alice.address, dataId, content);

    expect(await publishedData.isPublished(alice.address, dataId)).to.equal(true);
    expect(await publishedData.isPublished(bob.address, dataId)).to.equal(false);
  });

  it("allows multiple publishers for the same content without sharing retraction state", async function () {
    const content = ethers.toUtf8Bytes("same bytes");
    const dataId = ethers.sha256(content);

    await publishedData.connect(alice).publishData(content);
    await publishedData.connect(bob).publishData(content);
    await publishedData.connect(alice).retractData(dataId);

    expect(await publishedData.isPublished(alice.address, dataId)).to.equal(true);
    expect(await publishedData.isPublished(bob.address, dataId)).to.equal(true);
    expect(await publishedData.isRetracted(alice.address, dataId)).to.equal(true);
    expect(await publishedData.isRetracted(bob.address, dataId)).to.equal(false);
  });

  it("records retraction attestations even without prior publication", async function () {
    const dataId = ethers.sha256(ethers.toUtf8Bytes("policy-suppressed data"));

    await expect(publishedData.connect(bob).retractData(dataId))
      .to.emit(publishedData, "DataRetracted")
      .withArgs(bob.address, dataId);

    expect(await publishedData.isPublished(bob.address, dataId)).to.equal(false);
    expect(await publishedData.isRetracted(bob.address, dataId)).to.equal(true);
  });

  it("rejects empty content", async function () {
    await expect(publishedData.publishData("0x"))
      .to.be.revertedWithCustomError(publishedData, "EmptyContent");
  });
});
