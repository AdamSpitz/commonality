import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("Prospective content funding", function () {
  let owner, creator, alice, bob;
  let paymentToken, prospectiveToken, assuranceContract, contentRegistry, materialized;
  const prospectiveTokenId = 1n;
  const contentIdA = ethers.toBigInt(ethers.id("twitter:uid:creator:post-a"));
  const contentIdB = ethers.toBigInt(ethers.id("twitter:uid:creator:post-b"));

  beforeEach(async function () {
    [owner, creator, alice, bob] = await ethers.getSigners();

    const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
    paymentToken = await PremintingERC20.deploy(
      owner.address,
      "Payment Token",
      "PAY",
      "ipfs://payment-token"
    );
    await paymentToken.connect(owner).mint(alice.address, ethers.parseEther("100"));
    await paymentToken.connect(owner).mint(bob.address, ethers.parseEther("100"));

    const ProspectiveContentTokens = await ethers.getContractFactory("ProspectiveContentTokens");
    prospectiveToken = await ProspectiveContentTokens.deploy(
      owner.address,
      "https://prospective/{id}.json",
      "ipfs://prospective-contract"
    );

    const MultiERC1155AssuranceContract = await ethers.getContractFactory("MultiERC1155AssuranceContract");
    assuranceContract = await MultiERC1155AssuranceContract.deploy(
      owner.address,
      creator.address,
      await paymentToken.getAddress(),
      await prospectiveToken.getAddress(),
      "ipfs://prospective-round"
    );

    await prospectiveToken.connect(owner).setPrimaryMarket(await assuranceContract.getAddress());
    await prospectiveToken.connect(owner).mintBatch(
      await assuranceContract.getAddress(),
      [prospectiveTokenId],
      [100]
    );

    const ValueThresholdConditionFactory = await ethers.getContractFactory("ValueThresholdConditionFactory");
    const conditionFactory = await ValueThresholdConditionFactory.deploy();
    const latestBlock = await ethers.provider.getBlock("latest");
    const conditionAddress = await conditionFactory.createCondition.staticCall(
      await assuranceContract.getAddress(),
      ethers.parseEther("10"),
      latestBlock.timestamp + 86400
    );
    await conditionFactory.createCondition(
      await assuranceContract.getAddress(),
      ethers.parseEther("10"),
      latestBlock.timestamp + 86400
    );
    await assuranceContract.connect(owner).setCondition(conditionAddress);
    await assuranceContract.connect(owner).setPricesERC1155([prospectiveTokenId], [ethers.parseEther("1")]);

    await paymentToken.connect(alice).approve(await assuranceContract.getAddress(), ethers.parseEther("10"));
    await assuranceContract.connect(alice).buyERC1155(
      alice.address,
      await prospectiveToken.getAddress(),
      [prospectiveTokenId],
      [10],
      "0x"
    );
    await paymentToken.connect(bob).approve(await assuranceContract.getAddress(), ethers.parseEther("5"));
    await assuranceContract.connect(bob).buyERC1155(
      bob.address,
      await prospectiveToken.getAddress(),
      [prospectiveTokenId],
      [5],
      "0x"
    );

    const ContentRegistry = await ethers.getContractFactory("ContentRegistry");
    contentRegistry = await ContentRegistry.deploy();

    const MaterializedContentTokens = await ethers.getContractFactory("MaterializedContentTokens");
    materialized = await MaterializedContentTokens.deploy(
      creator.address,
      await prospectiveToken.getAddress(),
      prospectiveTokenId,
      await contentRegistry.getAddress(),
      await assuranceContract.getAddress(),
      "https://content/{id}.json",
      "ipfs://materialized-contract"
    );
    await contentRegistry.connect(owner).setRegistrar(await materialized.getAddress(), true);
  });

  it("keeps prospective receipt tokens non-transferable between holders", async function () {
    await expect(
      prospectiveToken.connect(alice).safeTransferFrom(
        alice.address,
        bob.address,
        prospectiveTokenId,
        1,
        "0x"
      )
    ).to.be.revertedWithCustomError(prospectiveToken, "NonTransferableReceipt");
  });

  it("lets prospective holders claim transferable tokens for each materialized content item", async function () {
    await materialized.connect(creator).addContentBatch(
      [contentIdA, contentIdB],
      ["twitter:uid:creator:post-a", "twitter:uid:creator:post-b"]
    );

    await materialized.connect(alice).claim(contentIdA);
    await materialized.connect(alice).claim(contentIdB);
    await materialized.connect(bob).claim(contentIdA);

    expect(await materialized.balanceOf(alice.address, contentIdA)).to.equal(10n);
    expect(await materialized.balanceOf(alice.address, contentIdB)).to.equal(10n);
    expect(await materialized.balanceOf(bob.address, contentIdA)).to.equal(5n);

    await materialized.connect(alice).safeTransferFrom(alice.address, bob.address, contentIdA, 2, "0x");
    expect(await materialized.balanceOf(alice.address, contentIdA)).to.equal(8n);
    expect(await materialized.balanceOf(bob.address, contentIdA)).to.equal(7n);
  });

  it("prevents double claiming a materialized content item", async function () {
    await materialized.connect(creator).addContent(contentIdA, "twitter:uid:creator:post-a");
    await materialized.connect(alice).claim(contentIdA);

    await expect(materialized.connect(alice).claim(contentIdA))
      .to.be.revertedWithCustomError(materialized, "ContentTokenAlreadyClaimed")
      .withArgs(contentIdA, alice.address);
  });
});
