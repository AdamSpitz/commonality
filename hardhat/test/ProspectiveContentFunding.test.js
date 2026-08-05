import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

const canonicalChannel = "twitter:uid:creator";
const channelId = ethers.id(canonicalChannel);
const tokenId = 1n;

async function fixture({ verified = true, creatorCaller = true, threshold = 10n } = {}) {
  const [owner, creator, alice, bob] = await ethers.getSigners();
  const Payment = await ethers.getContractFactory("PremintingERC20");
  const payment = await Payment.deploy(owner.address, "Payment", "PAY", "ipfs://pay");
  await payment.mint(alice.address, 100n);

  const Channels = await ethers.getContractFactory("ProspectiveChannelRegistryHarness");
  const channels = await Channels.deploy();
  await channels.setChannel(channelId, creator.address, verified);
  const Registry = await ethers.getContractFactory("ContentRegistry");
  const registry = await Registry.deploy();
  const Authority = await ethers.getContractFactory("RegistrarAuthorityHarness");
  const authority = await Authority.deploy(await registry.getAddress());
  await registry.transferOwnership(await authority.getAddress());
  const Conditions = await ethers.getContractFactory("ValueThresholdConditionFactory");
  const conditions = await Conditions.deploy();
  const RoundHelper = await ethers.getContractFactory("ProspectiveRoundDeploymentHelper");
  const roundHelper = await RoundHelper.deploy();
  const MaterializedHelper = await ethers.getContractFactory("MaterializedContentDeploymentHelper");
  const materializedHelper = await MaterializedHelper.deploy();
  const Factory = await ethers.getContractFactory("ProspectiveContentRoundFactory");
  const factory = await Factory.deploy(await channels.getAddress(), await registry.getAddress(), await conditions.getAddress(), await payment.getAddress(), await authority.getAddress(), await roundHelper.getAddress(), await materializedHelper.getAddress(), ":");
  await authority.setFactory(await factory.getAddress());

  const now = (await ethers.provider.getBlock("latest")).timestamp;
  const params = [channelId, canonicalChannel, tokenId, 100n, 1n, threshold, now + 100, "ipfs://round", "ipfs://receipt/{id}", "ipfs://receipt"];
  const caller = creatorCaller ? creator : bob;
  const roundAddress = await factory.connect(caller).createProspectiveRound.staticCall(params).catch(() => ethers.ZeroAddress);
  if (roundAddress !== ethers.ZeroAddress) await factory.connect(caller).createProspectiveRound(params);
  const round = roundAddress === ethers.ZeroAddress ? null : await ethers.getContractAt("ProspectiveContentAssuranceContract", roundAddress);
  const receiptAddress = round ? await factory.receiptTokenByRound(roundAddress) : ethers.ZeroAddress;
  const receipt = round ? await ethers.getContractAt("ProspectiveContentTokens", receiptAddress) : null;
  return { owner, creator, alice, bob, payment, channels, registry, factory, params, round, roundAddress, receipt };
}

async function buy(ctx, amount) {
  await ctx.payment.connect(ctx.alice).approve(ctx.roundAddress, amount);
  await ctx.round.connect(ctx.alice).buyERC1155(ctx.alice.address, await ctx.receipt.getAddress(), [tokenId], [amount], "0x");
}

async function materialize(ctx) {
  const address = await ctx.factory.connect(ctx.creator).createMaterializedContentTokens.staticCall(ctx.roundAddress, "ipfs://content/{id}", "ipfs://content");
  await ctx.factory.connect(ctx.creator).createMaterializedContentTokens(ctx.roundAddress, "ipfs://content/{id}", "ipfs://content");
  return ethers.getContractAt("MaterializedContentTokens", address);
}

describe("Prospective content funding", function () {
  it("requires a verified channel owner and canonical channel ID", async function () {
    const unverified = await fixture({ verified: false });
    await expect(unverified.factory.connect(unverified.creator).createProspectiveRound(unverified.params)).to.be.revertedWithCustomError(unverified.factory, "ChannelNotVerified");
    const outsider = await fixture({ creatorCaller: false });
    await expect(outsider.factory.connect(outsider.bob).createProspectiveRound(outsider.params)).to.be.revertedWithCustomError(outsider.factory, "OnlyCurrentChannelOwner");
    const valid = await fixture();
    expect(await valid.factory.isProspectiveRound(valid.roundAddress)).to.equal(true);
    expect(await valid.receipt.channelId()).to.equal(channelId);
  });

  it("rejects pending, failed, and foreign rounds and materializes a success exactly once", async function () {
    const ctx = await fixture();
    await expect(ctx.factory.connect(ctx.creator).createMaterializedContentTokens(ctx.roundAddress, "u", "c")).to.be.revertedWithCustomError(ctx.factory, "ProspectiveRoundNotSuccessful");
    await expect(ctx.factory.connect(ctx.creator).createMaterializedContentTokens(ctx.alice.address, "u", "c")).to.be.revertedWithCustomError(ctx.factory, "NotProspectiveRound");
    await buy(ctx, 10n);
    const materialized = await materialize(ctx);
    expect(await ctx.round.materializedContentTokens()).to.equal(await materialized.getAddress());
    await expect(ctx.factory.connect(ctx.creator).createMaterializedContentTokens(ctx.roundAddress, "u", "c")).to.be.revertedWithCustomError(ctx.factory, "MaterializedCollectionAlreadyCreated");

    const failed = await fixture();
    await ethers.provider.send("evm_increaseTime", [101]);
    await ethers.provider.send("evm_mine", []);
    await expect(failed.factory.connect(failed.creator).createMaterializedContentTokens(failed.roundAddress, "u", "c")).to.be.revertedWithCustomError(failed.factory, "ProspectiveRoundNotSuccessful");
  });

  it("derives channel-bound IDs, registers the assurance round, claims once, and stays non-transferable", async function () {
    const ctx = await fixture();
    await buy(ctx, 10n);
    const materialized = await materialize(ctx);
    await expect(materialized.connect(ctx.creator).addContent("")).to.be.revertedWithCustomError(materialized, "EmptyContentSuffix");
    await materialized.connect(ctx.creator).addContent("post-a");
    const id = ethers.toBigInt(ethers.id(`${canonicalChannel}:post-a`));
    expect(await materialized.contentCanonicalId(id)).to.equal(`${canonicalChannel}:post-a`);
    expect(await ctx.registry.contentContract(id)).to.equal(ctx.roundAddress);
    await expect(materialized.connect(ctx.creator).addContent("post-a")).to.be.reverted;
    await materialized.connect(ctx.alice).claim(id);
    expect(await materialized.balanceOf(ctx.alice.address, id)).to.equal(10n);
    await expect(materialized.connect(ctx.alice).claim(id)).to.be.revertedWithCustomError(materialized, "ContentTokenAlreadyClaimed");
    await expect(materialized.connect(ctx.alice).safeTransferFrom(ctx.alice.address, ctx.bob.address, id, 1, "0x")).to.be.revertedWithCustomError(materialized, "NonTransferableContentToken");
    await materialized.connect(ctx.alice).burn(ctx.alice.address, id, 1);
  });

  it("protects refunds while pending, permits failure refunds, and permits success burns without changing reimbursement", async function () {
    const pending = await fixture();
    await buy(pending, 5n);
    await expect(pending.receipt.connect(pending.alice).burn(pending.alice.address, tokenId, 1)).to.be.revertedWithCustomError(pending.receipt, "ProspectiveReceiptBurnNotAllowed");
    await ethers.provider.send("evm_increaseTime", [101]);
    await ethers.provider.send("evm_mine", []);
    await pending.receipt.connect(pending.alice).setApprovalForAll(pending.roundAddress, true);
    await pending.round.connect(pending.alice).refundERC1155(pending.alice.address, await pending.receipt.getAddress(), [tokenId], [5], "0x");
    expect(await pending.receipt.balanceOf(pending.alice.address, tokenId)).to.equal(0n);

    const success = await fixture();
    await buy(success, 10n);
    expect(await success.round.earlyContributions(success.alice.address)).to.equal(10n);
    await success.receipt.connect(success.alice).burn(success.alice.address, tokenId, 4);
    expect(await success.round.earlyContributions(success.alice.address)).to.equal(10n);
    const materialized = await materialize(success);
    await materialized.connect(success.creator).addContent("post-b");
    const id = ethers.toBigInt(ethers.id(`${canonicalChannel}:post-b`));
    await materialized.connect(success.alice).claim(id);
    expect(await materialized.balanceOf(success.alice.address, id)).to.equal(6n);
  });
});
