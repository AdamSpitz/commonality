import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("ChannelVerifier", function () {
  let verifier;
  let owner, trustedSigner, alice, bob;

  const channelId = ethers.id("twitter:uid:12345678");
  const nonce = ethers.id("test-nonce-1");
  const proofHash = ethers.id("https://x.com/alice/status/123");

  async function signClaimProof(signer, verifierContract, _channelId, _claimant, _nonce, _deadline, _proofHash = proofHash) {
    const verifyingContract = await verifierContract.getAddress();
    const { chainId } = await ethers.provider.getNetwork();
    const domain = {
      name: "ChannelVerifier",
      version: "1",
      chainId,
      verifyingContract,
    };
    const types = {
      ChannelClaim: [
        { name: "channelId", type: "bytes32" },
        { name: "claimant", type: "address" },
        { name: "nonce", type: "bytes32" },
        { name: "deadline", type: "uint256" },
        { name: "proofHash", type: "bytes32" },
      ],
    };
    return signer.signTypedData(domain, types, {
      channelId: _channelId,
      claimant: _claimant,
      nonce: _nonce,
      deadline: _deadline,
      proofHash: _proofHash,
    });
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

      const signature = await signClaimProof(trustedSigner, verifier, channelId, alice.address, nonce, deadline);

      const result = await verifier.verifyClaimProof(channelId, alice.address, nonce, deadline, proofHash, signature);
      expect(result).to.be.true;
    });

    it("Should return false for a signature from an untrusted signer", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      const signature = await signClaimProof(bob, verifier, channelId, alice.address, nonce, deadline);

      const result = await verifier.verifyClaimProof(channelId, alice.address, nonce, deadline, proofHash, signature);
      expect(result).to.be.false;
    });

    it("Should return false when channelId is tampered", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      const signature = await signClaimProof(trustedSigner, verifier, channelId, alice.address, nonce, deadline);

      const wrongChannelId = ethers.id("twitter:uid:99999999");
      const result = await verifier.verifyClaimProof(wrongChannelId, alice.address, nonce, deadline, proofHash, signature);
      expect(result).to.be.false;
    });

    it("Should return false when claimant is tampered", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      const signature = await signClaimProof(trustedSigner, verifier, channelId, alice.address, nonce, deadline);

      const result = await verifier.verifyClaimProof(channelId, bob.address, nonce, deadline, proofHash, signature);
      expect(result).to.be.false;
    });

    it("Should return false when nonce is tampered", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      const signature = await signClaimProof(trustedSigner, verifier, channelId, alice.address, nonce, deadline);

      const wrongNonce = ethers.id("wrong-nonce");
      const result = await verifier.verifyClaimProof(channelId, alice.address, wrongNonce, deadline, proofHash, signature);
      expect(result).to.be.false;
    });

    it("Should return false when deadline is tampered", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      const signature = await signClaimProof(trustedSigner, verifier, channelId, alice.address, nonce, deadline);

      const result = await verifier.verifyClaimProof(channelId, alice.address, nonce, deadline + 1, proofHash, signature);
      expect(result).to.be.false;
    });

    it("Should return false when proofHash is tampered", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      const signature = await signClaimProof(trustedSigner, verifier, channelId, alice.address, nonce, deadline);

      const wrongProofHash = ethers.id("https://x.com/alice/status/999");
      const result = await verifier.verifyClaimProof(channelId, alice.address, nonce, deadline, wrongProofHash, signature);
      expect(result).to.be.false;
    });
  });

  describe("Integration with ChannelRegistry", function () {
    it("Should allow channel verification with a real signed proof", async function () {
      const ChannelRegistry = await ethers.getContractFactory("ChannelRegistry");
      const channelRegistry = await ChannelRegistry.deploy(await verifier.getAddress());

      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      const signature = await signClaimProof(trustedSigner, verifier, channelId, alice.address, nonce, deadline);

      await expect(channelRegistry.verifyChannel(channelId, alice.address, nonce, deadline, proofHash, signature))
        .to.emit(channelRegistry, "ChannelVerified")
        .withArgs(channelId, alice.address)
        .and.to.emit(channelRegistry, "ChannelProofAnchored")
        .withArgs(channelId, alice.address, proofHash);

      expect(await channelRegistry.channelOwner(channelId)).to.equal(alice.address);
    });

    it("Should reject channel verification with a forged signature", async function () {
      const ChannelRegistry = await ethers.getContractFactory("ChannelRegistry");
      const channelRegistry = await ChannelRegistry.deploy(await verifier.getAddress());

      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;

      // bob is not the trusted verifier
      const forgedSignature = await signClaimProof(bob, verifier, channelId, alice.address, nonce, deadline);

      await expect(channelRegistry.verifyChannel(channelId, alice.address, nonce, deadline, proofHash, forgedSignature))
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
      const oldSig = await signClaimProof(trustedSigner, verifier, channelId, alice.address, nonce, deadline);
      expect(await verifier.verifyClaimProof(channelId, alice.address, nonce, deadline, proofHash, oldSig)).to.be.false;

      // New verifier's signature should succeed
      const newSig = await signClaimProof(bob, verifier, channelId, alice.address, nonce, deadline);
      expect(await verifier.verifyClaimProof(channelId, alice.address, nonce, deadline, proofHash, newSig)).to.be.true;
    });
  });
});
