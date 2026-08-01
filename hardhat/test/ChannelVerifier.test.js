import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("ChannelVerifier", function () {
  let verifier;
  let owner, trustedSigner, alice, bob, guardian;

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
    [owner, trustedSigner, alice, bob, guardian] = await ethers.getSigners();

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

  // The governance model timelocks the owner (see workflow/security-recoverability.md), so
  // revocation deliberately does *not* go through the owner path alone: a leaked signer key
  // has to be killable now, not in 48 hours. What the guardian must never be able to do is
  // install trust.
  describe("Emergency revocation", function () {
    it("Should start with no guardian", async function () {
      expect(await verifier.guardian()).to.equal(ethers.ZeroAddress);
    });

    it("Should let the owner appoint and clear a guardian", async function () {
      await expect(verifier.setGuardian(guardian.address))
        .to.emit(verifier, "GuardianUpdated")
        .withArgs(ethers.ZeroAddress, guardian.address);
      expect(await verifier.guardian()).to.equal(guardian.address);

      await expect(verifier.setGuardian(ethers.ZeroAddress))
        .to.emit(verifier, "GuardianUpdated")
        .withArgs(guardian.address, ethers.ZeroAddress);
    });

    it("Should not let a non-owner appoint a guardian", async function () {
      await expect(verifier.connect(guardian).setGuardian(guardian.address)).to.be.reverted;
    });

    it("Should let the guardian revoke immediately", async function () {
      await verifier.setGuardian(guardian.address);

      await expect(verifier.connect(guardian).revokeTrustedVerifier())
        .to.emit(verifier, "TrustedVerifierRevoked")
        .withArgs(trustedSigner.address, guardian.address);

      expect(await verifier.trustedVerifier()).to.equal(ethers.ZeroAddress);
    });

    it("Should let the owner revoke", async function () {
      await expect(verifier.revokeTrustedVerifier())
        .to.emit(verifier, "TrustedVerifierRevoked")
        .withArgs(trustedSigner.address, owner.address);
    });

    it("Should reject revocation from anyone else", async function () {
      await verifier.setGuardian(guardian.address);

      await expect(verifier.connect(alice).revokeTrustedVerifier())
        .to.be.revertedWithCustomError(verifier, "OnlyOwnerOrGuardian");
    });

    it("Should reject a second revocation", async function () {
      await verifier.revokeTrustedVerifier();

      await expect(verifier.revokeTrustedVerifier())
        .to.be.revertedWithCustomError(verifier, "TrustedVerifierAlreadyRevoked");
    });

    it("Should reject previously-valid signatures once revoked", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;
      const signature = await signClaimProof(trustedSigner, verifier, channelId, alice.address, nonce, deadline);

      expect(await verifier.verifyClaimProof(channelId, alice.address, nonce, deadline, proofHash, signature)).to.be.true;

      await verifier.revokeTrustedVerifier();

      expect(await verifier.verifyClaimProof(channelId, alice.address, nonce, deadline, proofHash, signature)).to.be.false;
    });

    it("Should not let the guardian install a verifier — revocation only reduces power", async function () {
      await verifier.setGuardian(guardian.address);

      await expect(verifier.connect(guardian).setTrustedVerifier(bob.address)).to.be.reverted;
      expect(await verifier.trustedVerifier()).to.equal(trustedSigner.address);
    });

    it("Should let the owner install a replacement after revocation", async function () {
      await verifier.revokeTrustedVerifier();
      await verifier.setTrustedVerifier(bob.address);

      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;
      const signature = await signClaimProof(bob, verifier, channelId, alice.address, nonce, deadline);

      expect(await verifier.verifyClaimProof(channelId, alice.address, nonce, deadline, proofHash, signature)).to.be.true;
    });
  });

  describe("Emergency revocation — registry level", function () {
    let channelRegistry;

    beforeEach(async function () {
      const ChannelRegistry = await ethers.getContractFactory("ChannelRegistry");
      channelRegistry = await ChannelRegistry.deploy(await verifier.getAddress());
      await channelRegistry.setGuardian(guardian.address);
      await verifier.setGuardian(guardian.address);
    });

    it("Should halt new verification when the guardian revokes the verifier contract", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;
      const signature = await signClaimProof(trustedSigner, verifier, channelId, alice.address, nonce, deadline);

      await expect(channelRegistry.connect(guardian).revokeVerifier())
        .to.emit(channelRegistry, "VerifierRevoked")
        .withArgs(await verifier.getAddress(), guardian.address);

      await expect(channelRegistry.verifyChannel(channelId, alice.address, nonce, deadline, proofHash, signature))
        .to.be.revertedWithCustomError(channelRegistry, "NoVerifierConfigured");
    });

    it("Should halt new verification when the signer key is revoked at the verifier", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;
      const signature = await signClaimProof(trustedSigner, verifier, channelId, alice.address, nonce, deadline);

      await verifier.connect(guardian).revokeTrustedVerifier();

      await expect(channelRegistry.verifyChannel(channelId, alice.address, nonce, deadline, proofHash, signature))
        .to.be.revertedWithCustomError(channelRegistry, "InvalidVerifierSignature");
    });

    it("Should not disturb channels already verified before the revocation", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;
      const signature = await signClaimProof(trustedSigner, verifier, channelId, alice.address, nonce, deadline);
      await channelRegistry.verifyChannel(channelId, alice.address, nonce, deadline, proofHash, signature);

      await channelRegistry.connect(guardian).revokeVerifier();

      // Fails closed for new claims, but the existing owner keeps every downstream power.
      await expect(channelRegistry.connect(alice).takeChannelControl(channelId))
        .to.emit(channelRegistry, "ChannelControlTaken")
        .withArgs(channelId, alice.address);
      expect(await channelRegistry.channelOwner(channelId)).to.equal(alice.address);
      expect(await channelRegistry.isCreatorControlled(channelId)).to.be.true;
    });

    it("Should let the owner reinstall a verifier after revocation", async function () {
      await channelRegistry.connect(guardian).revokeVerifier();
      await channelRegistry.setVerifier(await verifier.getAddress());

      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;
      const signature = await signClaimProof(trustedSigner, verifier, channelId, alice.address, nonce, deadline);

      await expect(channelRegistry.verifyChannel(channelId, alice.address, nonce, deadline, proofHash, signature))
        .to.emit(channelRegistry, "ChannelVerified")
        .withArgs(channelId, alice.address);
    });

    it("Should reject revocation from anyone else", async function () {
      await expect(channelRegistry.connect(alice).revokeVerifier())
        .to.be.revertedWithCustomError(channelRegistry, "OnlyOwnerOrGuardian");
    });
  });
});
