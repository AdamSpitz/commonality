import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("ChannelVerifier", function () {
  let verifier;
  let owner, trustedSigner, alice, bob;

  const channelId = ethers.id("twitter:uid:12345678");
  const nonce = ethers.id("test-nonce-1");

  async function signClaimProof(signer, _channelId, _claimant, _nonce, _deadline) {
    const packed = ethers.solidityPacked(
      ["bytes32", "address", "bytes32", "uint256"],
      [_channelId, _claimant, _nonce, _deadline],
    );
    const digest = ethers.keccak256(packed);
    return signer.signMessage(ethers.getBytes(digest));
  }

  beforeEach(async function () {
    [owner, trustedSigner, alice, bob] = await ethers.getSigners();

    const ChannelVerifier = await ethers.getContractFactory("ChannelVerifier");
    verifier = await ChannelVerifier.deploy(trustedSigner.address);
  });

  describe("Deployment", function () {
    it("Should set the trusted verifier", async function () {
      expect(await verifier.trustedVerifier()).to.equal(trustedSigner.address);
    });

    it("Should revert on zero address", async function () {
      const ChannelVerifier = await ethers.getContractFactory("ChannelVerifier");
      await expect(ChannelVerifier.deploy(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(verifier, "InvalidTrustedVerifierAddress");
    });
  });

  describe("verifyClaimProof", function () {
    it("Should return true for a valid signature from the trusted verifier", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      const signature = await signClaimProof(trustedSigner, channelId, alice.address, nonce, deadline);

      const result = await verifier.verifyClaimProof(channelId, alice.address, nonce, deadline, signature);
      expect(result).to.be.true;
    });

    it("Should return false for a signature from an untrusted signer", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      const signature = await signClaimProof(bob, channelId, alice.address, nonce, deadline);

      const result = await verifier.verifyClaimProof(channelId, alice.address, nonce, deadline, signature);
      expect(result).to.be.false;
    });

    it("Should return false when channelId is tampered", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      const signature = await signClaimProof(trustedSigner, channelId, alice.address, nonce, deadline);

      const wrongChannelId = ethers.id("twitter:uid:99999999");
      const result = await verifier.verifyClaimProof(wrongChannelId, alice.address, nonce, deadline, signature);
      expect(result).to.be.false;
    });

    it("Should return false when claimant is tampered", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      const signature = await signClaimProof(trustedSigner, channelId, alice.address, nonce, deadline);

      const result = await verifier.verifyClaimProof(channelId, bob.address, nonce, deadline, signature);
      expect(result).to.be.false;
    });

    it("Should return false when nonce is tampered", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      const signature = await signClaimProof(trustedSigner, channelId, alice.address, nonce, deadline);

      const wrongNonce = ethers.id("wrong-nonce");
      const result = await verifier.verifyClaimProof(channelId, alice.address, wrongNonce, deadline, signature);
      expect(result).to.be.false;
    });

    it("Should return false when deadline is tampered", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      const signature = await signClaimProof(trustedSigner, channelId, alice.address, nonce, deadline);

      const result = await verifier.verifyClaimProof(channelId, alice.address, nonce, deadline + 1, signature);
      expect(result).to.be.false;
    });
  });

  describe("Integration with ChannelRegistry", function () {
    it("Should allow channel verification with a real signed proof", async function () {
      const ChannelRegistry = await ethers.getContractFactory("ChannelRegistry");
      const channelRegistry = await ChannelRegistry.deploy(await verifier.getAddress());

      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      const signature = await signClaimProof(trustedSigner, channelId, alice.address, nonce, deadline);

      await expect(channelRegistry.verifyChannel(channelId, alice.address, nonce, deadline, signature))
        .to.emit(channelRegistry, "ChannelVerified")
        .withArgs(channelId, alice.address);

      expect(await channelRegistry.channelOwner(channelId)).to.equal(alice.address);
    });

    it("Should reject channel verification with a forged signature", async function () {
      const ChannelRegistry = await ethers.getContractFactory("ChannelRegistry");
      const channelRegistry = await ChannelRegistry.deploy(await verifier.getAddress());

      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      // bob is not the trusted verifier
      const forgedSignature = await signClaimProof(bob, channelId, alice.address, nonce, deadline);

      await expect(channelRegistry.verifyChannel(channelId, alice.address, nonce, deadline, forgedSignature))
        .to.be.revertedWithCustomError(channelRegistry, "InvalidVerifierSignature");
    });
  });

  describe("setTrustedVerifier", function () {
    it("Should allow the owner to update the trusted verifier", async function () {
      await expect(verifier.setTrustedVerifier(bob.address))
        .to.emit(verifier, "TrustedVerifierUpdated")
        .withArgs(trustedSigner.address, bob.address);

      expect(await verifier.trustedVerifier()).to.equal(bob.address);
    });

    it("Should revert when called by non-owner", async function () {
      await expect(verifier.connect(alice).setTrustedVerifier(bob.address))
        .to.be.reverted;
    });

    it("Should revert on zero address", async function () {
      await expect(verifier.setTrustedVerifier(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(verifier, "InvalidTrustedVerifierAddress");
    });

    it("Should accept signatures from the new verifier after update", async function () {
      await verifier.setTrustedVerifier(bob.address);

      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      // Old verifier's signature should now fail
      const oldSig = await signClaimProof(trustedSigner, channelId, alice.address, nonce, deadline);
      expect(await verifier.verifyClaimProof(channelId, alice.address, nonce, deadline, oldSig)).to.be.false;

      // New verifier's signature should succeed
      const newSig = await signClaimProof(bob, channelId, alice.address, nonce, deadline);
      expect(await verifier.verifyClaimProof(channelId, alice.address, nonce, deadline, newSig)).to.be.true;
    });
  });
});
