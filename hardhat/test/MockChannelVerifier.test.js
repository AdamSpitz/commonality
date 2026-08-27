import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("MockChannelVerifier", function () {
  let mockVerifier;
  let claimant;

  beforeEach(async function () {
    [, claimant] = await ethers.getSigners();
    mockVerifier = await ethers.deployContract("MockChannelVerifier");
  });

  for (const valid of [true, false]) {
    it(`returns ${valid} after setValid(${valid})`, async function () {
      await mockVerifier.setValid(valid);

      expect(
        await mockVerifier.verifyClaimProof(
          ethers.id("test-channel"),
          claimant.address,
          ethers.id("nonce-1"),
          (await ethers.provider.getBlock("latest")).timestamp + 86400,
          ethers.id("proof"),
          "0x",
        ),
      ).to.equal(valid);
    });
  }
});
