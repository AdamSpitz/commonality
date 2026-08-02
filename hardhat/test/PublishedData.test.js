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

  it("publishes content under the sender and announces only the pointer", async function () {
    const content = ethers.toUtf8Bytes("hello published data");
    const dataId = ethers.sha256(content);

    await expect(publishedData.connect(alice).publishData(content))
      .to.emit(publishedData, "DataPublished")
      .withArgs(alice.address, dataId);

    expect(await publishedData.isPublished(alice.address, dataId)).to.equal(true);
    expect(await publishedData.isPublished(bob.address, dataId)).to.equal(false);
  });

  it("keeps the content out of the log entirely", async function () {
    // The point of the pointer-only design: an indexer following these logs stores no content.
    // Both event parameters are indexed, so the log body must be empty rather than merely
    // content-free -- if the bytes ever crept back in, they would land in the data field.
    const content = ethers.toUtf8Bytes("content that must not reach an indexer");

    const receipt = await (await publishedData.connect(alice).publishData(content)).wait();
    const log = receipt.logs.find((entry) => entry.address === publishedData.target);

    expect(log.data).to.equal("0x");
    expect(log.topics).to.have.lengthOf(3); // signature + publisher + dataId
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
