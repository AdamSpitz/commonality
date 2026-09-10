import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
const proofHash = ethers.id("https://x.com/commonality/status/proof");

function channelIdFromCanonical(channelCanonicalId) {
  return ethers.id(channelCanonicalId);
}

function contentCanonicalId(channelCanonicalId, contentSuffix, separator = ":") {
  return `${channelCanonicalId}${separator}${contentSuffix}`;
}

function contentIdFromParts(channelCanonicalId, contentSuffix, separator = ":") {
  return ethers.toBigInt(ethers.id(contentCanonicalId(channelCanonicalId, contentSuffix, separator)));
}

function contentIdsFromSuffixes(channelCanonicalId, contentSuffixes, separator = ":") {
  return contentSuffixes.map((suffix) => contentIdFromParts(channelCanonicalId, suffix, separator));
}

async function createContentFundingContract({
  factory,
  signer,
  channelCanonicalId,
  contentSuffixes,
  supplies,
  prices,
  threshold,
  deadline,
  metadataCid,
  erc1155MetadataUri,
  erc1155ContractUri,
  isThirdParty,
  initialPurchaseContentSuffixes = [],
  initialPurchaseCounts = [],
  initialPurchaseValue,
}) {
  const channelId = channelIdFromCanonical(channelCanonicalId);
  const initialPurchaseIndices = initialPurchaseContentSuffixes.map((suffix) => contentSuffixes.indexOf(suffix));

  if (initialPurchaseValue !== undefined && initialPurchaseValue > 0n) {
    const paymentToken = await ethers.getContractAt(
      "PremintingERC20",
      await factory.paymentToken()
    );
    await paymentToken.connect(signer).approve(await factory.getAddress(), initialPurchaseValue);
  }

  const params = {
    channelId,
    channelCanonicalId,
    contentSuffixes,
    supplies,
    prices,
    threshold,
    deadline,
    metadataCid,
    erc1155MetadataUri,
    erc1155ContractUri,
    initialPurchaseIndices,
    initialPurchaseCounts
  };

  return isThirdParty
    ? factory.connect(signer).createThirdPartyContract(params)
    : factory.connect(signer).createCreatorContract(params);
}

describe("ContentFunding", function () {
  let contentRegistry, beneficiaryRegistry, beneficiaryEscrow;
  let factory, erc1155Factory, conditionFactory;
  let paymentToken;
  let mockVerifier;
  let owner, recipient, alice, bob, charlie, thirdParty;

  beforeEach(async function () {
    [owner, recipient, alice, bob, charlie, thirdParty] = await ethers.getSigners();

    const MockVerifier = await ethers.getContractFactory("MockBeneficiaryVerifier");
    mockVerifier = await MockVerifier.deploy();

    const ContentRegistry = await ethers.getContractFactory("ContentRegistry");
    contentRegistry = await ContentRegistry.deploy();

    const BeneficiaryRegistry = await ethers.getContractFactory("BeneficiaryRegistry");
    beneficiaryRegistry = await BeneficiaryRegistry.deploy(await mockVerifier.getAddress());

    const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
    paymentToken = await PremintingERC20.deploy(
      owner.address,
      "Content Funding Payment Token",
      "CFPT",
      "ipfs://QmContentFundingPaymentToken"
    );
    for (const signer of [owner, recipient, alice, bob, charlie, thirdParty]) {
      await paymentToken.connect(owner).mint(signer.address, ethers.parseEther("1000"));
    }

    const BeneficiaryEscrow = await ethers.getContractFactory("BeneficiaryEscrow");
    beneficiaryEscrow = await BeneficiaryEscrow.deploy(
      await beneficiaryRegistry.getAddress(),
      await paymentToken.getAddress()
    );

    const PremintingERC1155Factory = await ethers.getContractFactory("PremintingERC1155Factory");
    erc1155Factory = await PremintingERC1155Factory.deploy();

    const ValueThresholdConditionFactory = await ethers.getContractFactory("ValueThresholdConditionFactory");
    conditionFactory = await ValueThresholdConditionFactory.deploy();

    const CreatorAssuranceContractFactory = await ethers.getContractFactory("CreatorAssuranceContractFactory");
    factory = await CreatorAssuranceContractFactory.deploy(
      await contentRegistry.getAddress(),
      await beneficiaryRegistry.getAddress(),
      await beneficiaryEscrow.getAddress(),
      await erc1155Factory.getAddress(),
      await conditionFactory.getAddress(),
      await paymentToken.getAddress(),
      ":"
    );

    // Transfer ContentRegistry ownership to factory so it can register/release content
    await contentRegistry.connect(owner).transferOwnership(await factory.getAddress());

    await beneficiaryRegistry.connect(owner).setFactoryAuthorization(await factory.getAddress(), true);
  });

  async function approveAssuranceSpend(signer, assuranceContract, amount) {
    await paymentToken.connect(signer).approve(await assuranceContract.getAddress(), amount);
  }

  async function depositIntoEscrow(signer, channelId, amount) {
    await paymentToken.connect(signer).approve(await beneficiaryEscrow.getAddress(), amount);
    return beneficiaryEscrow.connect(signer).deposit(channelId, amount);
  }

  describe("ContentRegistry", function () {
    let channelCanonicalId, channelId, contentSuffix1, contentSuffix2, contentId1;

    beforeEach(async function () {
      channelCanonicalId = "twitter:uid:content-reg-test";
      channelId = channelIdFromCanonical(channelCanonicalId);
      contentSuffix1 = "1001";
      contentSuffix2 = "1002";
      [contentId1] = contentIdsFromSuffixes(channelCanonicalId, [contentSuffix1, contentSuffix2]);
    });

    it("Should register content successfully (via factory)", async function () {
      // Content registration now happens through the factory during contract creation.
      await mockVerifier.setValid(true);
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;

      await beneficiaryRegistry.verifyBeneficiary(
        channelId,
        owner.address,
        ethers.id("nonce-1"),
        deadline,
        proofHash,
        "0x"
      );

      await factory.connect(owner).createCreatorContract({
        channelId,
        channelCanonicalId,
        contentSuffixes: [contentSuffix1],
        supplies: [100],
        prices: [ethers.parseEther("0.1")],
        threshold: ethers.parseEther("5.0"),
        deadline,
        metadataCid: "ipfs://QmTest",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract",
        initialPurchaseIndices: [],
        initialPurchaseCounts: [],
      });

      expect(await contentRegistry.isRegistered(contentId1)).to.be.true;
    });

    it("Should revert when non-owner calls registerContent directly", async function () {
      await expect(contentRegistry.connect(alice).registerContent(contentId1, alice.address, "canonical-id"))
        .to.be.revertedWithCustomError(contentRegistry, "UnauthorizedContentRegistrar")
        .withArgs(alice.address);
    });

    it("Should revert when non-owner calls releaseContent directly", async function () {
      await expect(contentRegistry.connect(alice).releaseContent(contentId1))
        .to.be.revertedWithCustomError(contentRegistry, "OwnableUnauthorizedAccount");
    });

    it("Should revert when registering content with invalid contentId (0)", async function () {
      // Even the owner (factory) can't register contentId 0
      // We test via the view function since we can't call registerContent directly
      await expect(contentRegistry.contentContract(0))
        .to.be.revertedWithCustomError(contentRegistry, "InvalidContentId");
    });

    it("Should revert when registering duplicate content", async function () {
      const duplicateChannelCanonicalId = "twitter:uid:dup-content-test";
      const duplicateChannelId = channelIdFromCanonical(duplicateChannelCanonicalId);
      const duplicateContentSuffix = "18347";
      const duplicateContentId = contentIdFromParts(duplicateChannelCanonicalId, duplicateContentSuffix);
      await mockVerifier.setValid(true);
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;

      await beneficiaryRegistry.verifyBeneficiary(
        duplicateChannelId,
        owner.address,
        ethers.id("nonce-1"),
        deadline,
        proofHash,
        "0x"
      );

      const params = {
        channelId: duplicateChannelId,
        channelCanonicalId: duplicateChannelCanonicalId,
        contentSuffixes: [duplicateContentSuffix],
        supplies: [100],
        prices: [ethers.parseEther("0.1")],
        threshold: ethers.parseEther("5.0"),
        deadline,
        metadataCid: "ipfs://QmTest",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract",
        initialPurchaseIndices: [],
        initialPurchaseCounts: [],
      };

      await factory.connect(owner).createCreatorContract(params);

      await expect(factory.connect(owner).createCreatorContract(params))
        .to.be.revertedWithCustomError(factory, "ContentAlreadyRegisteredForContract")
        .withArgs(duplicateContentId);
    });

    it("Should return zero address for unregistered content", async function () {
      expect(await contentRegistry.contentContract(contentId1)).to.equal(ethers.ZeroAddress);
      expect(await contentRegistry.isRegistered(contentId1)).to.be.false;
    });
  });

  describe("BeneficiaryRegistry", function () {
    let channelId;
    let nonce, deadline;
    let verifierSignature;

    beforeEach(async function () {
      channelId = ethers.id("test-channel-1");
      nonce = ethers.id("nonce-1");
      const latestBlock = await ethers.provider.getBlock("latest");
      deadline = latestBlock.timestamp + 86400;

      const message = ethers.solidityPacked(
        ["bytes32", "address", "bytes32", "uint256"],
        [channelId, alice.address, nonce, deadline]
      );
      const hash = ethers.keccak256(message);
      const sig = await alice.signMessage(ethers.getBytes(hash));
      verifierSignature = sig;
    });

    it("Should verify channel successfully", async function () {
      await mockVerifier.setValid(true);

      await expect(beneficiaryRegistry.verifyBeneficiary(channelId, alice.address, nonce, deadline, proofHash, verifierSignature))
        .to.emit(beneficiaryRegistry, "BeneficiaryVerified")
        .withArgs(channelId, alice.address);

      expect(await beneficiaryRegistry.payoutAddress(channelId)).to.equal(alice.address);
      expect(await beneficiaryRegistry.isVerified(channelId)).to.be.true;
      expect(await beneficiaryRegistry.channelState(channelId)).to.equal(1);
    });

    it("Should reject zero-address claimants", async function () {
      await mockVerifier.setValid(true);

      await expect(beneficiaryRegistry.verifyBeneficiary(channelId, ethers.ZeroAddress, nonce, deadline, proofHash, verifierSignature))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "InvalidClaimant");
    });

    it("Should allow only monotonic veto window lengthening", async function () {
      const initialDuration = await beneficiaryRegistry.vetoWindowDuration();
      const longerDuration = initialDuration + 1n;

      await expect(beneficiaryRegistry.setVetoWindowDuration(longerDuration))
        .to.emit(beneficiaryRegistry, "VetoWindowDurationUpdated")
        .withArgs(initialDuration, longerDuration);

      await expect(beneficiaryRegistry.setVetoWindowDuration(initialDuration))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "VetoWindowDurationCannotDecrease");

      expect(await beneficiaryRegistry.vetoWindowDuration()).to.equal(longerDuration);
    });

    it("Should revert when verifying already verified channel", async function () {
      await mockVerifier.setValid(true);
      await beneficiaryRegistry.verifyBeneficiary(channelId, alice.address, nonce, deadline, proofHash, verifierSignature);

      const nonce2 = ethers.id("nonce-2");
      await expect(beneficiaryRegistry.verifyBeneficiary(channelId, alice.address, nonce2, deadline, proofHash, verifierSignature))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "BeneficiaryAlreadyVerified")
        .withArgs(channelId);
    });

    it("Should revert when using expired deadline", async function () {
      const expiredDeadline = Math.floor(Date.now() / 1000) - 3600;

      await expect(beneficiaryRegistry.verifyBeneficiary(channelId, alice.address, nonce, expiredDeadline, proofHash, verifierSignature))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "ProofExpired");
    });

    it("Should revert when verifier signature is invalid", async function () {
      const invalidSig = "0x12345678";

      await expect(beneficiaryRegistry.verifyBeneficiary(channelId, alice.address, nonce, deadline, proofHash, invalidSig))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "InvalidVerifierSignature");
    });

    it("Should revert when reusing a nonce", async function () {
      await mockVerifier.setValid(true);
      await beneficiaryRegistry.verifyBeneficiary(channelId, alice.address, nonce, deadline, proofHash, verifierSignature);

      // Try to use the same nonce for a different channel
      const channelId2 = ethers.id("test-channel-2");
      await expect(beneficiaryRegistry.verifyBeneficiary(channelId2, alice.address, nonce, deadline, proofHash, verifierSignature))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "InvalidNonce");
    });

    it("Should allow only the verified owner to rotate the payout address", async function () {
      await mockVerifier.setValid(true);
      await beneficiaryRegistry.verifyBeneficiary(channelId, alice.address, nonce, deadline, proofHash, verifierSignature);

      await expect(beneficiaryRegistry.connect(alice).rotatePayoutAddress(channelId, bob.address))
        .to.emit(beneficiaryRegistry, "PayoutAddressRotated")
        .withArgs(channelId, alice.address, bob.address);

      expect(await beneficiaryRegistry.payoutAddress(channelId)).to.equal(bob.address);
      expect(await beneficiaryRegistry.channelState(channelId)).to.equal(1);
    });

    it("Should not allow a verifier, administrator, or unrelated wallet to rotate an established owner", async function () {
      await mockVerifier.setValid(true);
      await beneficiaryRegistry.verifyBeneficiary(channelId, alice.address, nonce, deadline, proofHash, verifierSignature);

      await expect(beneficiaryRegistry.connect(owner).rotatePayoutAddress(channelId, bob.address))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "OnlyPayoutAddressCanRotate");
      await expect(beneficiaryRegistry.connect(bob).rotatePayoutAddress(channelId, bob.address))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "OnlyPayoutAddressCanRotate");
      expect(await beneficiaryRegistry.payoutAddress(channelId)).to.equal(alice.address);
    });

    it("Should reject payout rotation before verification or to the zero address", async function () {
      await expect(beneficiaryRegistry.connect(alice).rotatePayoutAddress(channelId, bob.address))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "BeneficiaryNotVerified")
        .withArgs(channelId);

      await mockVerifier.setValid(true);
      await beneficiaryRegistry.verifyBeneficiary(channelId, alice.address, nonce, deadline, proofHash, verifierSignature);
      await expect(beneficiaryRegistry.connect(alice).rotatePayoutAddress(channelId, ethers.ZeroAddress))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "InvalidNewPayoutAddress");
    });

    it("Should apply a namespace waiting period before first escrow withdrawal", async function () {
      await mockVerifier.setValid(true);
      const waitingPeriod = 7 * 24 * 60 * 60;
      const namespaceHash = ethers.keccak256(ethers.toUtf8Bytes("dns"));
      await expect(beneficiaryRegistry.setNamespaceClaimWaitingPeriod(namespaceHash, waitingPeriod))
        .to.emit(beneficiaryRegistry, "NamespaceClaimWaitingPeriodUpdated")
        .withArgs(namespaceHash, waitingPeriod);

      await beneficiaryRegistry.verifyNamespacedBeneficiary(
        "dns",
        "example.org",
        alice.address,
        nonce,
        deadline,
        proofHash,
        verifierSignature
      );

      const beneficiaryId = ethers.keccak256(ethers.toUtf8Bytes("dns:example.org"));
      expect(beneficiaryId).to.equal(channelIdFromCanonical("dns:example.org"));
      expect(await beneficiaryRegistry.isVerified(beneficiaryId)).to.be.true;
      const verifiedBlock = await ethers.provider.getBlock("latest");
      expect(await beneficiaryRegistry.claimWithdrawableAt(beneficiaryId)).to.equal(
        BigInt(verifiedBlock.timestamp) + BigInt(waitingPeriod)
      );

      const depositAmount = ethers.parseEther("1.0");
      await depositIntoEscrow(alice, beneficiaryId, depositAmount);
      await expect(beneficiaryEscrow.connect(alice).withdraw(beneficiaryId))
        .to.be.revertedWithCustomError(beneficiaryEscrow, "ClaimWaitingPeriodNotElapsed");

      await ethers.provider.send("evm_increaseTime", [waitingPeriod]);
      await ethers.provider.send("evm_mine", []);
      await expect(beneficiaryEscrow.connect(alice).withdraw(beneficiaryId))
        .to.emit(beneficiaryEscrow, "Withdrawn")
        .withArgs(beneficiaryId, alice.address, depositAmount);
    });

    it("Should keep the content verify path immediately withdrawable", async function () {
      await mockVerifier.setValid(true);
      await beneficiaryRegistry.setNamespaceClaimWaitingPeriod(
        ethers.keccak256(ethers.toUtf8Bytes("dns")),
        7 * 24 * 60 * 60
      );
      await beneficiaryRegistry.verifyBeneficiary(channelId, alice.address, nonce, deadline, proofHash, verifierSignature);
      const verifiedBlock = await ethers.provider.getBlock("latest");
      expect(await beneficiaryRegistry.claimWithdrawableAt(channelId)).to.equal(verifiedBlock.timestamp);
    });

    it("Should take channel control after verification", async function () {
      await mockVerifier.setValid(true);
      await beneficiaryRegistry.verifyBeneficiary(channelId, alice.address, nonce, deadline, proofHash, verifierSignature);

      await expect(beneficiaryRegistry.connect(alice).takeChannelControl(channelId))
        .to.emit(beneficiaryRegistry, "ChannelControlTaken")
        .withArgs(channelId, alice.address);

      expect(await beneficiaryRegistry.isCreatorControlled(channelId)).to.be.true;
      expect(await beneficiaryRegistry.channelState(channelId)).to.equal(2);
    });

    it("Should revert takeChannelControl when channel not verified", async function () {
      await expect(beneficiaryRegistry.connect(alice).takeChannelControl(channelId))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "BeneficiaryNotVerified")
        .withArgs(channelId);
    });

    it("Should revert takeChannelControl when not channel owner", async function () {
      await mockVerifier.setValid(true);
      await beneficiaryRegistry.verifyBeneficiary(channelId, alice.address, nonce, deadline, proofHash, verifierSignature);

      await expect(beneficiaryRegistry.connect(bob).takeChannelControl(channelId))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "OnlyChannelOwnerCanTakeControl");
    });

    it("Should revert takeChannelControl when already creator controlled", async function () {
      await mockVerifier.setValid(true);
      await beneficiaryRegistry.verifyBeneficiary(channelId, alice.address, nonce, deadline, proofHash, verifierSignature);
      await beneficiaryRegistry.connect(alice).takeChannelControl(channelId);

      await expect(beneficiaryRegistry.connect(alice).takeChannelControl(channelId))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "ChannelAlreadyCreatorControlled")
        .withArgs(channelId);
    });

    it("Should update verifier (owner only)", async function () {
      const newVerifier = bob;

      await expect(beneficiaryRegistry.connect(owner).setVerifier(await newVerifier.getAddress()))
        .to.emit(beneficiaryRegistry, "VerifierUpdated")
        .withArgs(await mockVerifier.getAddress(), await newVerifier.getAddress());

      expect(await beneficiaryRegistry.verifier()).to.equal(await newVerifier.getAddress());
    });

    it("Should revert setVerifier from non-owner", async function () {
      await expect(beneficiaryRegistry.connect(alice).setVerifier(await bob.getAddress()))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "OwnableUnauthorizedAccount");
    });

    it("Should revert when setting invalid verifier address", async function () {
      await expect(beneficiaryRegistry.setVerifier(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "InvalidVerifierAddress");
    });

    it("Should authorize multiple factory generations", async function () {
      const CreatorAssuranceContractFactory = await ethers.getContractFactory("CreatorAssuranceContractFactory");
      const newFactory = await CreatorAssuranceContractFactory.deploy(
        await contentRegistry.getAddress(),
        await beneficiaryRegistry.getAddress(),
        await beneficiaryEscrow.getAddress(),
        await erc1155Factory.getAddress(),
        await conditionFactory.getAddress(),
        await paymentToken.getAddress(),
        ":"
      );

      await expect(beneficiaryRegistry.connect(owner).setFactoryAuthorization(await newFactory.getAddress(), true))
        .to.emit(beneficiaryRegistry, "FactoryAuthorizationSet")
        .withArgs(await newFactory.getAddress(), true);

      expect(await beneficiaryRegistry.factoryCount()).to.equal(2);
      expect(await beneficiaryRegistry.isAuthorizedFactory(await factory.getAddress())).to.equal(true);
      expect(await beneficiaryRegistry.isAuthorizedFactory(await newFactory.getAddress())).to.equal(true);

      await beneficiaryRegistry.connect(owner).setFactoryAuthorization(await newFactory.getAddress(), false);
      expect(await beneficiaryRegistry.isAuthorizedFactory(await newFactory.getAddress())).to.equal(false);
    });

    it("Should revert setFactoryAuthorization from non-owner", async function () {
      await expect(beneficiaryRegistry.connect(alice).setFactoryAuthorization(await bob.getAddress(), true))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "OwnableUnauthorizedAccount");
    });

    it("Should revert when setting invalid factory address", async function () {
      await expect(beneficiaryRegistry.setFactoryAuthorization(ethers.ZeroAddress, true))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "InvalidFactoryAddress");
    });
  });

  describe("BeneficiaryEscrow", function () {
    let channelId;

    beforeEach(async function () {
      channelId = ethers.id("test-channel-escrow");
    });

    it("Should deposit settlement tokens successfully", async function () {
      const depositAmount = ethers.parseEther("1.0");

      await expect(depositIntoEscrow(alice, channelId, depositAmount))
        .to.emit(beneficiaryEscrow, "Deposited")
        .withArgs(channelId, await alice.getAddress(), depositAmount);

      expect(await beneficiaryEscrow.balance(channelId)).to.equal(depositAmount);
    });

    it("Should revert when depositing zero tokens", async function () {
      await expect(beneficiaryEscrow.deposit(channelId, 0))
        .to.be.revertedWithCustomError(beneficiaryEscrow, "MustSendTokens");
    });

    it("Should withdraw settlement tokens successfully", async function () {
      const depositAmount = ethers.parseEther("2.0");

      await mockVerifier.setValid(true);
      await beneficiaryRegistry.verifyBeneficiary(
        channelId,
        bob.address,
        ethers.id("nonce-1"),
        (await ethers.provider.getBlock("latest")).timestamp + 86400,
        proofHash,
        "0x"
      );

      await depositIntoEscrow(bob, channelId, depositAmount);

      await expect(beneficiaryEscrow.connect(bob).withdraw(channelId))
        .to.emit(beneficiaryEscrow, "Withdrawn")
        .withArgs(channelId, await bob.getAddress(), depositAmount);

      expect(await beneficiaryEscrow.balance(channelId)).to.equal(0);
    });

    it("Should allow cumulative escrow withdrawal after multiple deposits for the same channel", async function () {
      const escrowedChannelCanonicalId = "twitter:uid:cumulative-escrow-channel";
      const escrowedChannelId = channelIdFromCanonical(escrowedChannelCanonicalId);
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;
      const firstDepositAmount = ethers.parseEther("0.1");
      const secondDepositAmount = ethers.parseEther("0.2");

      const firstTx = await createContentFundingContract({
        factory,
        signer: thirdParty,
        channelCanonicalId: escrowedChannelCanonicalId,
        contentSuffixes: ["9301"],
        supplies: [50],
        prices: [firstDepositAmount],
        threshold: firstDepositAmount * 2n,
        deadline,
        metadataCid: "ipfs://QmEscrowOne",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract",
        isThirdParty: true,
        initialPurchaseContentSuffixes: ["9301"],
        initialPurchaseCounts: [1],
        initialPurchaseValue: firstDepositAmount,
        paymentToken,
      });

      const firstReceipt = await firstTx.wait();
      const firstEvent = firstReceipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const firstContract = await ethers.getContractAt(
        "CreatorAssuranceContract",
        firstEvent.args.contractAddress
      );

      const secondTx = await createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId: escrowedChannelCanonicalId,
        contentSuffixes: ["9302"],
        supplies: [50],
        prices: [secondDepositAmount],
        threshold: secondDepositAmount * 2n,
        deadline,
        metadataCid: "ipfs://QmEscrowTwo",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract",
        isThirdParty: true,
        initialPurchaseContentSuffixes: ["9302"],
        initialPurchaseCounts: [1],
        initialPurchaseValue: secondDepositAmount,
        paymentToken,
      });

      const secondReceipt = await secondTx.wait();
      const secondEvent = secondReceipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const secondContract = await ethers.getContractAt(
        "CreatorAssuranceContract",
        secondEvent.args.contractAddress
      );

      await mockVerifier.setValid(true);
      await beneficiaryRegistry.verifyBeneficiary(
        escrowedChannelId,
        alice.address,
        ethers.id("nonce-cumulative-success-gate"),
        deadline,
        proofHash,
        "0x"
      );
      await approveAssuranceSpend(alice, firstContract, firstDepositAmount);
      await firstContract.connect(alice).buyERC1155(
        alice.address,
        await factory.contractERC1155(await firstContract.getAddress()),
        [contentIdFromParts(escrowedChannelCanonicalId, "9301")],
        [1],
        "0x"
      );
      await approveAssuranceSpend(alice, secondContract, secondDepositAmount);
      await secondContract.connect(alice).buyERC1155(
        alice.address,
        await factory.contractERC1155(await secondContract.getAddress()),
        [contentIdFromParts(escrowedChannelCanonicalId, "9302")],
        [1],
        "0x"
      );

      await beneficiaryRegistry.connect(alice).takeChannelControl(escrowedChannelId);
      const vetoWindowDuration = await beneficiaryRegistry.vetoWindowDuration();
      await ethers.provider.send("evm_increaseTime", [Number(vetoWindowDuration) + 1]);
      await ethers.provider.send("evm_mine");

      await firstContract.withdrawToEscrow();
      await secondContract.withdrawToEscrow();

      const totalEscrowBalance = (firstDepositAmount + secondDepositAmount) * 2n;
      expect(await beneficiaryEscrow.balance(escrowedChannelId)).to.equal(totalEscrowBalance);

      await mockVerifier.setValid(true);

      await expect(beneficiaryEscrow.connect(alice).withdraw(escrowedChannelId))
        .to.emit(beneficiaryEscrow, "Withdrawn")
        .withArgs(escrowedChannelId, await alice.getAddress(), totalEscrowBalance);

      expect(await beneficiaryEscrow.balance(escrowedChannelId)).to.equal(0);
    });

    it("Should revert withdraw when channel not verified", async function () {
      await expect(beneficiaryEscrow.withdraw(channelId))
        .to.be.revertedWithCustomError(beneficiaryEscrow, "BeneficiaryNotVerified");
    });

    it("Should revert withdraw when not channel owner", async function () {
      await mockVerifier.setValid(true);
      await beneficiaryRegistry.verifyBeneficiary(
        channelId,
        bob.address,
        ethers.id("nonce-1"),
        (await ethers.provider.getBlock("latest")).timestamp + 86400,
        proofHash,
        "0x"
      );

      await depositIntoEscrow(bob, channelId, ethers.parseEther("1.0"));

      await expect(beneficiaryEscrow.connect(alice).withdraw(channelId))
        .to.be.revertedWithCustomError(beneficiaryEscrow, "OnlyBeneficiaryPayoutAddress");
    });

    it("Should revert withdraw when no balance", async function () {
      await mockVerifier.setValid(true);
      await beneficiaryRegistry.verifyBeneficiary(
        channelId,
        bob.address,
        ethers.id("nonce-1"),
        (await ethers.provider.getBlock("latest")).timestamp + 86400,
        proofHash,
        "0x"
      );

      await expect(beneficiaryEscrow.connect(bob).withdraw(channelId))
        .to.be.revertedWithCustomError(beneficiaryEscrow, "NoBalance");
    });

    it("Should pay existing escrow to an owner-authorized replacement address", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await depositIntoEscrow(owner, channelId, depositAmount);
      await mockVerifier.setValid(true);
      await beneficiaryRegistry.verifyBeneficiary(
        channelId,
        alice.address,
        ethers.id("nonce-owner-rotation"),
        (await ethers.provider.getBlock("latest")).timestamp + 86400,
        proofHash,
        "0x"
      );

      await beneficiaryRegistry.connect(alice).rotatePayoutAddress(channelId, bob.address);

      await expect(beneficiaryEscrow.connect(alice).withdraw(channelId))
        .to.be.revertedWithCustomError(beneficiaryEscrow, "OnlyBeneficiaryPayoutAddress");
      await expect(beneficiaryEscrow.connect(bob).withdraw(channelId))
        .to.emit(beneficiaryEscrow, "Withdrawn")
        .withArgs(channelId, bob.address, depositAmount);
    });
  });

  describe("CreatorAssuranceContractFactory", function () {
    let channelCanonicalId, channelId, contentSuffixes, contentIds, supplies, prices;
    let threshold, deadline, metadataCid;
    let erc1155MetadataUri, erc1155ContractUri;

    beforeEach(async function () {
      channelCanonicalId = "twitter:uid:factory-test-channel";
      channelId = channelIdFromCanonical(channelCanonicalId);
      contentSuffixes = ["2001", "2002", "2003"];
      contentIds = contentIdsFromSuffixes(channelCanonicalId, contentSuffixes);
      supplies = [100, 100, 100];
      prices = [ethers.parseEther("0.1"), ethers.parseEther("0.2"), ethers.parseEther("0.3")];
      threshold = ethers.parseEther("5.0");
      const latestBlock = await ethers.provider.getBlock("latest");
      deadline = latestBlock.timestamp + 86400;
      metadataCid = "ipfs://QmProjectMetadata";
      erc1155MetadataUri = "https://example.com/metadata/{id}.json";
      erc1155ContractUri = "ipfs://QmERC1155Contract";

      await mockVerifier.setValid(true);
      await beneficiaryRegistry.verifyBeneficiary(
        channelId,
        owner.address,
        ethers.id("nonce-1"),
        deadline,
        proofHash,
        "0x"
      );
    });

    it("allows the owner to authorize multiple prospective factory generations", async function () {
      await expect(factory.connect(alice).setProspectiveRoundFactoryAuthorization(alice.address, true))
        .to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");

      await factory.setProspectiveRoundFactoryAuthorization(alice.address, true);
      await factory.setProspectiveRoundFactoryAuthorization(bob.address, true);
      expect(await factory.isAuthorizedProspectiveRoundFactory(alice.address)).to.equal(true);
      expect(await factory.isAuthorizedProspectiveRoundFactory(bob.address)).to.equal(true);
      expect(await contentRegistry.isRegistrar(alice.address)).to.equal(true);

      await factory.connect(alice).authorizeMaterializedRegistrar(charlie.address);
      expect(await contentRegistry.isRegistrar(charlie.address)).to.equal(true);

      await factory.setProspectiveRoundFactoryAuthorization(alice.address, false);
      expect(await contentRegistry.isRegistrar(alice.address)).to.equal(false);
      await expect(factory.connect(alice).authorizeMaterializedRegistrar(thirdParty.address))
        .to.be.revertedWithCustomError(factory, "OnlyProspectiveRoundFactory");
    });

    it("Should create creator contract successfully", async function () {
      const tx = await createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId,
        contentSuffixes,
        supplies,
        prices,
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        isThirdParty: false,
      });

      const receipt = await tx.wait();
      const creatorContractCreatedEvent = receipt.logs.find(
        (log) => log.fragment?.name === "CreatorContractCreated"
      );

      const contractAddress = creatorContractCreatedEvent.args.contractAddress;

      expect(await factory.channelIdByContract(contractAddress)).to.equal(channelId);
      expect(await factory.isThirdPartyCreated(contractAddress)).to.be.false;

      expect(await contentRegistry.isRegistered(contentIds[0])).to.be.true;
      expect(await contentRegistry.isRegistered(contentIds[1])).to.be.true;
      expect(await contentRegistry.isRegistered(contentIds[2])).to.be.true;
    });

    it("Should authorize creator contracts for delegated primary-market purchases", async function () {
      const AssuranceContractFactory = await ethers.getContractFactory("AssuranceContractFactory");
      const assuranceFactory = await AssuranceContractFactory.deploy();
      const DelegatableNotes = await ethers.getContractFactory("DelegatableNotes");
      const notes = await DelegatableNotes.deploy(
        await assuranceFactory.getAddress()
      );
      await notes.setPrimaryMarketFactoryAuthorization(await factory.getAddress(), true);

      const tx = await createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId,
        contentSuffixes,
        supplies,
        prices,
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        isThirdParty: false,
      });

      const receipt = await tx.wait();
      const creatorContractCreatedEvent = receipt.logs.find(
        (log) => log.fragment?.name === "CreatorContractCreated"
      );
      const contractAddress = creatorContractCreatedEvent.args.contractAddress;
      const erc1155Address = await factory.contractERC1155(contractAddress);
      const paymentAmount = prices[0] * 2n;

      expect(await notes.isAuthorizedPrimaryMarket(contractAddress)).to.be.true;

      await paymentToken.connect(alice).approve(await notes.getAddress(), paymentAmount);
      await notes.connect(alice).deposit(await paymentToken.getAddress(), 0, 0, paymentAmount);

      await expect(notes.connect(alice).purchaseFromPrimaryMarket(
        [{ noteId: 1, chain: [alice.address], shares: 2 }],
        contractAddress,
        erc1155Address,
        contentIds[0],
        2
      )).to.emit(notes, "ERC1155Purchased");

      const outputNote = await notes.notes(2);
      expect(outputNote.token).to.equal(erc1155Address);
      expect(outputNote.tokenId).to.equal(contentIds[0]);
      expect(outputNote.amount).to.equal(2);
    });

    it("Should create creator contract successfully on CreatorControlled channel", async function () {
      await beneficiaryRegistry.connect(owner).takeChannelControl(channelId);

      const controlledContentSuffixes = ["2101", "2102"];
      const controlledContentIds = contentIdsFromSuffixes(channelCanonicalId, controlledContentSuffixes);
      const tx = await createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId,
        contentSuffixes: controlledContentSuffixes,
        supplies: [25, 25],
        prices: [ethers.parseEther("0.15"), ethers.parseEther("0.25")],
        threshold,
        deadline,
        metadataCid: "ipfs://QmCreatorControlled",
        erc1155MetadataUri,
        erc1155ContractUri,
        isThirdParty: false,
      });

      const receipt = await tx.wait();
      const creatorContractCreatedEvent = receipt.logs.find(
        (log) => log.fragment?.name === "CreatorContractCreated"
      );

      const contractAddress = creatorContractCreatedEvent.args.contractAddress;

      expect(await factory.channelIdByContract(contractAddress)).to.equal(channelId);
      expect(await factory.isThirdPartyCreated(contractAddress)).to.be.false;
      expect(await contentRegistry.isRegistered(controlledContentIds[0])).to.be.true;
      expect(await contentRegistry.isRegistered(controlledContentIds[1])).to.be.true;
    });

    it("Should revert when array lengths mismatch", async function () {
      const mismatchedSupplies = [100, 100];

      await expect(createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId,
        contentSuffixes,
        supplies: mismatchedSupplies,
        prices,
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        isThirdParty: false,
      })).to.be.revertedWithCustomError(factory, "ArrayLengthMismatch");
    });

    it("Should revert creator contract when channel not verified", async function () {
      const unverifiedChannelCanonicalId = "twitter:uid:unverified-channel";
      const unverifiedChannelId = channelIdFromCanonical(unverifiedChannelCanonicalId);

      await expect(createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId: unverifiedChannelCanonicalId,
        contentSuffixes,
        supplies,
        prices,
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        isThirdParty: false,
      })).to.be.revertedWithCustomError(factory, "BeneficiaryNotVerifiedOrControlled")
        .withArgs(unverifiedChannelId);
    });

    it("Should revert creator contract when caller is not the verified channel owner", async function () {
      await expect(createContentFundingContract({
        factory,
        signer: thirdParty,
        channelCanonicalId,
        contentSuffixes,
        supplies,
        prices,
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        isThirdParty: false,
      })).to.be.revertedWithCustomError(factory, "OnlyChannelOwnerCanCreateCreatorContract")
        .withArgs(channelId);
    });

    it("Should create third-party contract with an initial token purchase", async function () {
      const purchaseAmount = prices[0];

      const tx = await createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId,
        contentSuffixes,
        supplies,
        prices,
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        isThirdParty: true,
        initialPurchaseContentSuffixes: [contentSuffixes[0]],
        initialPurchaseCounts: [1],
        initialPurchaseValue: purchaseAmount,
      });

      const receipt = await tx.wait();
      const creatorContractCreatedEvent = receipt.logs.find(
        (log) => log.fragment?.name === "CreatorContractCreated"
      );

      const contractAddress = creatorContractCreatedEvent.args.contractAddress;
      const erc1155Address = await factory.contractERC1155(contractAddress);
      const erc1155 = await ethers.getContractAt("PremintingERC1155", erc1155Address);
      const createdContract = await ethers.getContractAt("CreatorAssuranceContract", contractAddress);

      expect(await factory.isThirdPartyCreated(contractAddress)).to.be.true;
      expect(await erc1155.balanceOf(owner.address, contentIds[0])).to.equal(1);
      expect(await createdContract.getAssuranceContractProgress()).to.equal(purchaseAmount);
      expect(await beneficiaryEscrow.balance(channelId)).to.equal(0);
    });

    it("Should create third-party contract on Unclaimed channel without upfront escrow deposit", async function () {
      const unclaimedChannelCanonicalId = "twitter:uid:unclaimed-channel";
      const unclaimedChannel = channelIdFromCanonical(unclaimedChannelCanonicalId);
      const purchaseAmount = ethers.parseEther("0.1");
      const unclaimedContentSuffixes = ["9001", "9002"];
      const unclaimedContentIds = contentIdsFromSuffixes(unclaimedChannelCanonicalId, unclaimedContentSuffixes);
      const unclaimedPrices = [ethers.parseEther("0.1"), ethers.parseEther("0.2")];

      const tx = await createContentFundingContract({
        factory,
        signer: thirdParty,
        channelCanonicalId: unclaimedChannelCanonicalId,
        contentSuffixes: unclaimedContentSuffixes,
        supplies: [50, 50],
        prices: unclaimedPrices,
        threshold: ethers.parseEther("5.0"),
        deadline,
        metadataCid: "ipfs://QmThirdParty",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract",
        isThirdParty: true,
        initialPurchaseContentSuffixes: [unclaimedContentSuffixes[0]],
        initialPurchaseCounts: [1],
        initialPurchaseValue: purchaseAmount,
      });

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const contractAddress = event.args.contractAddress;
      const erc1155Address = await factory.contractERC1155(contractAddress);
      const erc1155 = await ethers.getContractAt("PremintingERC1155", erc1155Address);

      // Creation fee now buys tokens instead of depositing to escrow.
      expect(await beneficiaryEscrow.balance(unclaimedChannel)).to.equal(0);
      expect(await factory.isThirdPartyCreated(contractAddress)).to.be.true;
      expect(await erc1155.balanceOf(thirdParty.address, unclaimedContentIds[0])).to.equal(1);

      // Content should be registered
      expect(await contentRegistry.isRegistered(unclaimedContentIds[0])).to.be.true;
    });

    it("Should allow a successful unclaimed contract to move funds into escrow", async function () {
      const unclaimedChannelCanonicalId = "twitter:uid:successful-unclaimed-channel";
      const unclaimedChannel = channelIdFromCanonical(unclaimedChannelCanonicalId);
      const unclaimedContentSuffix = "9101";
      const purchaseAmount = ethers.parseEther("0.1");
      const tx = await createContentFundingContract({
        factory,
        signer: thirdParty,
        channelCanonicalId: unclaimedChannelCanonicalId,
        contentSuffixes: [unclaimedContentSuffix],
        supplies: [50],
        prices: [purchaseAmount],
        threshold: purchaseAmount * 2n,
        deadline,
        metadataCid: "ipfs://QmThirdParty",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract",
        isThirdParty: true,
        initialPurchaseContentSuffixes: [unclaimedContentSuffix],
        initialPurchaseCounts: [1],
        initialPurchaseValue: purchaseAmount,
      });

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const contractAddress = event.args.contractAddress;
      const createdContract = await ethers.getContractAt("CreatorAssuranceContract", contractAddress);

      await mockVerifier.setValid(true);
      await beneficiaryRegistry.verifyBeneficiary(
        unclaimedChannel,
        alice.address,
        ethers.id("nonce-unclaimed-success-gate"),
        deadline,
        proofHash,
        "0x"
      );
      await approveAssuranceSpend(alice, createdContract, purchaseAmount);
      await createdContract.connect(alice).buyERC1155(
        alice.address,
        await factory.contractERC1155(await createdContract.getAddress()),
        [contentIdFromParts(unclaimedChannelCanonicalId, unclaimedContentSuffix)],
        [1],
        "0x"
      );

      await beneficiaryRegistry.connect(alice).takeChannelControl(unclaimedChannel);
      const vetoWindowDuration = await beneficiaryRegistry.vetoWindowDuration();
      await ethers.provider.send("evm_increaseTime", [Number(vetoWindowDuration) + 1]);
      await ethers.provider.send("evm_mine");

      await createdContract.withdrawToEscrow();

      expect(await beneficiaryEscrow.balance(unclaimedChannel)).to.equal(purchaseAmount * 2n);
    });

    it("Should revert withdrawToEscrow when contract recipient is not escrow", async function () {
      const tx = await createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId,
        contentSuffixes: ["9201"],
        supplies: [50],
        prices: [ethers.parseEther("0.1")],
        threshold: ethers.parseEther("5.0"),
        deadline,
        metadataCid: "ipfs://QmCreatorOwned",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract",
        isThirdParty: false,
      });

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const contractAddress = event.args.contractAddress;
      const createdContract = await ethers.getContractAt("CreatorAssuranceContract", contractAddress);

      await expect(createdContract.withdrawToEscrow())
        .to.be.revertedWithCustomError(createdContract, "RecipientNotEscrow");
    });

    it("Should revert third-party contract on CreatorControlled channel", async function () {
      await beneficiaryRegistry.connect(owner).takeChannelControl(channelId);

      await expect(createContentFundingContract({
        factory,
        signer: thirdParty,
        channelCanonicalId,
        contentSuffixes: ["8001"],
        supplies: [100],
        prices: [ethers.parseEther("0.1")],
        threshold: ethers.parseEther("5.0"),
        deadline,
        metadataCid: "ipfs://QmThirdParty",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract",
        isThirdParty: true,
        initialPurchaseContentSuffixes: ["8001"],
        initialPurchaseCounts: [1],
        initialPurchaseValue: ethers.parseEther("0.1"),
      })).to.be.revertedWithCustomError(factory, "ChannelCreatorControlled")
        .withArgs(channelId);
    });

    it("Should revert third-party creation when the initial purchase is below the minimum", async function () {
      const insufficientAmount = 0; // Less than minimum of 1 token unit
      const cheapContentSuffix = "3001";

      await expect(createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId,
        contentSuffixes: [cheapContentSuffix],
        supplies: [100],
        prices: [insufficientAmount],
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        isThirdParty: true,
        initialPurchaseContentSuffixes: [cheapContentSuffix],
        initialPurchaseCounts: [1],
        initialPurchaseValue: insufficientAmount,
      })).to.be.revertedWithCustomError(factory, "InsufficientThirdPartyPurchase");
    });

    it("Should reject third-party deadlines beyond the configured max duration", async function () {
      const maxDuration = await factory.thirdPartyMaxDuration();
      const latestBlock = await ethers.provider.getBlock("latest");
      const tooLateDeadline = latestBlock.timestamp + Number(maxDuration) + 3600;
      const contentSuffix = "3002";

      await expect(createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId,
        contentSuffixes: [contentSuffix],
        supplies: [100],
        prices: [ethers.parseEther("0.1")],
        threshold,
        deadline: tooLateDeadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        isThirdParty: true,
        initialPurchaseContentSuffixes: [contentSuffix],
        initialPurchaseCounts: [1],
        initialPurchaseValue: ethers.parseEther("0.1"),
      })).to.be.revertedWithCustomError(factory, "ThirdPartyDeadlineTooLong");
    });

    it("Should reject zero thresholds", async function () {
      await expect(createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId,
        contentSuffixes: ["3901"],
        supplies: [100],
        prices: [ethers.parseEther("0.1")],
        threshold: 0,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        isThirdParty: false,
      })).to.be.revertedWithCustomError(factory, "InvalidFundingThreshold");
    });

    it("Should reject expired creator deadlines", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");

      await expect(createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId,
        contentSuffixes: ["3902"],
        supplies: [100],
        prices: [ethers.parseEther("0.1")],
        threshold,
        deadline: latestBlock.timestamp,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        isThirdParty: false,
      })).to.be.revertedWithCustomError(factory, "InvalidFundingDeadline");
    });

    it("Should revert when verified-channel third-party threshold does not exceed initial purchase", async function () {
      await mockVerifier.setValid(true);
      const channelCanonicalId = "twitter:uid:test-channel";
      const contentSuffix = "4001";
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;

      await beneficiaryRegistry.verifyBeneficiary(
        channelIdFromCanonical(channelCanonicalId),
        alice.address,
        ethers.id("nonce-threshold-test"),
        deadline,
        proofHash,
        "0x"
      );

      const initialPurchaseValue = ethers.parseEther("0.1");

      await expect(createContentFundingContract({
        factory,
        signer: thirdParty,
        channelCanonicalId,
        contentSuffixes: [contentSuffix],
        supplies: [100],
        prices: [initialPurchaseValue],
        threshold: initialPurchaseValue,
        deadline,
        metadataCid: "ipfs://QmTest",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract",
        isThirdParty: true,
        initialPurchaseContentSuffixes: [contentSuffix],
        initialPurchaseCounts: [1],
        initialPurchaseValue,
      })).to.be.revertedWithCustomError(factory, "ThresholdMustExceedInitialPurchase");
    });

    it("Should revert when unclaimed-channel third-party threshold does not exceed initial purchase", async function () {
      const unclaimedChannelCanonicalId = "twitter:uid:unclaimed-threshold-test";
      const initialPurchaseValue = ethers.parseEther("0.1");

      await expect(createContentFundingContract({
        factory,
        signer: thirdParty,
        channelCanonicalId: unclaimedChannelCanonicalId,
        contentSuffixes: ["4002"],
        supplies: [100],
        prices: [initialPurchaseValue],
        threshold: initialPurchaseValue,
        deadline,
        metadataCid: "ipfs://QmTest",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract",
        isThirdParty: true,
        initialPurchaseContentSuffixes: ["4002"],
        initialPurchaseCounts: [1],
        initialPurchaseValue,
      })).to.be.revertedWithCustomError(factory, "ThresholdMustExceedInitialPurchase");
    });

    it("Should revert when content already registered for third-party", async function () {
      await createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId,
        contentSuffixes: [contentSuffixes[0]],
        supplies: [supplies[0]],
        prices: [prices[0]],
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        isThirdParty: false,
      });

      await expect(createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId,
        contentSuffixes: [contentSuffixes[0]],
        supplies: [supplies[0]],
        prices: [prices[0]],
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        isThirdParty: true,
        initialPurchaseContentSuffixes: [contentSuffixes[0]],
        initialPurchaseCounts: [1],
        initialPurchaseValue: ethers.parseEther("0.1"),
      })).to.be.revertedWithCustomError(factory, "ContentAlreadyRegisteredForContract")
        .withArgs(contentIds[0]);
    });

    it("Should revert when content already registered for creator-created contract", async function () {
      await createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId,
        contentSuffixes: [contentSuffixes[0]],
        supplies: [supplies[0]],
        prices: [prices[0]],
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        isThirdParty: false,
      });

      await expect(createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId,
        contentSuffixes: [contentSuffixes[0]],
        supplies: [supplies[0]],
        prices: [prices[0]],
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        isThirdParty: false,
      })).to.be.revertedWithCustomError(factory, "ContentAlreadyRegisteredForContract")
        .withArgs(contentIds[0]);
    });

    it("Should reject a zero channel ID", async function () {
      await expect(factory.connect(owner).createCreatorContract({
        channelId: ethers.ZeroHash,
        channelCanonicalId,
        contentSuffixes,
        supplies,
        prices,
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        initialPurchaseIndices: [],
        initialPurchaseCounts: [],
      })).to.be.revertedWithCustomError(factory, "InvalidChannelId");
    });

    it("Should reject a channel canonical ID that does not match the supplied hash", async function () {
      await expect(factory.connect(owner).createCreatorContract({
        channelId,
        channelCanonicalId: "twitter:uid:someone-else",
        contentSuffixes,
        supplies,
        prices,
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        initialPurchaseIndices: [],
        initialPurchaseCounts: [],
      })).to.be.revertedWithCustomError(factory, "ChannelCanonicalIdMismatch");
    });

    it("Should set third party min purchase (owner only)", async function () {
      const newMin = 100; // 100 units of the payment token (e.g., 100 USDC)
      await factory.setThirdPartyMinPurchase(newMin);

      expect(await factory.thirdPartyMinPurchase()).to.equal(newMin);
    });

    it("Should revert setThirdPartyMinPurchase from non-owner", async function () {
      await expect(factory.connect(alice).setThirdPartyMinPurchase(100))
        .to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("Should authorize the deployed factory", async function () {
      expect(await beneficiaryRegistry.isAuthorizedFactory(await factory.getAddress())).to.equal(true);
    });
  });

  describe("CreatorAssuranceContract", function () {
    let channelCanonicalId, channelId, contentSuffixes, contentIds;
    let createdContract, creationReceipt;

    beforeEach(async function () {
      channelCanonicalId = "twitter:uid:creator-contract-test";
      channelId = channelIdFromCanonical(channelCanonicalId);
      contentSuffixes = ["3001", "3002"];
      contentIds = contentIdsFromSuffixes(channelCanonicalId, contentSuffixes);

      await mockVerifier.setValid(true);
      await beneficiaryRegistry.verifyBeneficiary(
        channelId,
        owner.address,
        ethers.id("nonce-1"),
        (await ethers.provider.getBlock("latest")).timestamp + 86400,
        proofHash,
        "0x"
      );

      const tx = await createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId,
        contentSuffixes,
        supplies: [100, 100],
        prices: [ethers.parseEther("0.1"), ethers.parseEther("0.2")],
        threshold: ethers.parseEther("5.0"),
        deadline: (await ethers.provider.getBlock("latest")).timestamp + 86400,
        metadataCid: "ipfs://QmProject",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract",
        isThirdParty: false,
      });

      creationReceipt = await tx.wait();
      const event = creationReceipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      createdContract = await ethers.getContractAt("CreatorAssuranceContract", event.args.contractAddress);
    });

    it("Should expose the initialized content IDs", async function () {
      const storedIds = await createdContract.getContentIds();
      expect(storedIds).to.deep.equal(contentIds);
    });

    it("Should not allow content IDs to be changed after initialization", async function () {
      await expect(createdContract.setContentIds([4001, 4002, 4003]))
        .to.be.revertedWithCustomError(createdContract, "ContentIdsAlreadySet");
    });

    it("Should emit content item registered events from the registry with canonical IDs", async function () {
      const registryEvents = await contentRegistry.queryFilter(
        contentRegistry.filters.ContentItemRegistered(),
        creationReceipt.blockNumber,
        creationReceipt.blockNumber
      );

      expect(registryEvents).to.have.length(2);
      expect(registryEvents[0].args.contentId).to.equal(contentIds[0]);
      expect(registryEvents[0].args.canonicalId).to.equal(contentCanonicalId(channelCanonicalId, contentSuffixes[0]));
      expect(registryEvents[1].args.contentId).to.equal(contentIds[1]);
      expect(registryEvents[1].args.canonicalId).to.equal(contentCanonicalId(channelCanonicalId, contentSuffixes[1]));
    });

    it("Should have correct channel ID", async function () {
      expect(await createdContract.channelId()).to.equal(channelId);
    });

    it("Should only allow owner to set content IDs", async function () {
      await expect(createdContract.connect(alice).setContentIds([4001]))
        .to.be.revertedWithCustomError(createdContract, "OnlyOwnerOrSelf");
    });
  });

  describe("Veto flow", function () {
    it("Should veto a third-party contract within the veto window", async function () {
      await mockVerifier.setValid(true);
      const channelCanonicalId = "twitter:uid:veto-test-channel";
      const channelId = channelIdFromCanonical(channelCanonicalId);
      const contentSuffixes = ["7001", "7002"];
      const contentIds = contentIdsFromSuffixes(channelCanonicalId, contentSuffixes);
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;

      // Verify channel
      await beneficiaryRegistry.verifyBeneficiary(
        channelId,
        alice.address,
        ethers.id("nonce-veto-1"),
        deadline,
        proofHash,
        "0x"
      );

      // Create a third-party contract on this verified channel
      const purchaseAmount = ethers.parseEther("0.1");
      const tx = await createContentFundingContract({
        factory,
        signer: thirdParty,
        channelCanonicalId,
        contentSuffixes,
        supplies: [50, 50],
        prices: [ethers.parseEther("0.1"), ethers.parseEther("0.2")],
        threshold: ethers.parseEther("5.0"),
        deadline,
        metadataCid: "ipfs://QmThirdParty",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract",
        isThirdParty: true,
        initialPurchaseContentSuffixes: [contentSuffixes[0]],
        initialPurchaseCounts: [1],
        initialPurchaseValue: purchaseAmount,
      });

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const thirdPartyContractAddr = event.args.contractAddress;
      const erc1155Address = await factory.contractERC1155(thirdPartyContractAddr);
      const erc1155 = await ethers.getContractAt("PremintingERC1155", erc1155Address);
      const thirdPartyContract = await ethers.getContractAt("CreatorAssuranceContract", thirdPartyContractAddr);
      const conditionAddr = await factory.contractCondition(thirdPartyContractAddr);
      const condition = await ethers.getContractAt("CancellableCondition", conditionAddr);

      // Even if a buyer funds the rest of the threshold immediately, third-party
      // success is gated until creator control plus veto-window expiry.
      const remainingPurchase = ethers.parseEther("4.9");
      await approveAssuranceSpend(charlie, thirdPartyContract, remainingPurchase);
      await thirdPartyContract.connect(charlie).buyERC1155(
        charlie.address,
        erc1155Address,
        [contentIds[0]],
        [49],
        "0x"
      );
      expect(await condition.hasSucceeded()).to.equal(false);
      await expect(thirdPartyContract.connect(alice).withdraw())
        .to.be.revertedWithCustomError(thirdPartyContract, "ConditionNotMet");

      // Creator takes channel control
      await beneficiaryRegistry.connect(alice).takeChannelControl(channelId);

      // Creator vetoes the third-party contract
      await beneficiaryRegistry.connect(alice).vetoContract(thirdPartyContractAddr);

      // Verify the condition is cancelled
      expect(await condition.isCancelled()).to.be.true;
      expect(await condition.hasFailed()).to.be.true;
      expect(await contentRegistry.isRegistered(contentIds[0])).to.be.false;
      expect(await contentRegistry.isRegistered(contentIds[1])).to.be.false;
      expect(await erc1155.balanceOf(thirdParty.address, contentIds[0])).to.equal(1);
    });

    it("Should revert veto after the veto window has expired", async function () {
      await mockVerifier.setValid(true);
      const channelCanonicalId = "twitter:uid:veto-expired-channel";
      const channelId = channelIdFromCanonical(channelCanonicalId);
      const contentSuffix = "7411";
      const contentId = contentIdFromParts(channelCanonicalId, contentSuffix);
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;

      await beneficiaryRegistry.verifyBeneficiary(
        channelId,
        alice.address,
        ethers.id("nonce-veto-expired"),
        deadline,
        proofHash,
        "0x"
      );

      const tx = await createContentFundingContract({
        factory,
        signer: thirdParty,
        channelCanonicalId,
        contentSuffixes: [contentSuffix],
        supplies: [50],
        prices: [ethers.parseEther("0.1")],
        threshold: ethers.parseEther("5.0"),
        deadline,
        metadataCid: "ipfs://QmThirdParty",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract",
        isThirdParty: true,
        initialPurchaseContentSuffixes: [contentSuffix],
        initialPurchaseCounts: [1],
        initialPurchaseValue: ethers.parseEther("0.1"),
      });

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const thirdPartyContractAddr = event.args.contractAddress;
      const conditionAddress = await factory.contractCondition(thirdPartyContractAddr);
      const condition = await ethers.getContractAt("CancellableCondition", conditionAddress);

      await beneficiaryRegistry.connect(alice).takeChannelControl(channelId);

      const vetoWindowDuration = await beneficiaryRegistry.vetoWindowDuration();
      await ethers.provider.send("evm_increaseTime", [Number(vetoWindowDuration) + 1]);
      await ethers.provider.send("evm_mine");

      await expect(beneficiaryRegistry.connect(alice).vetoContract(thirdPartyContractAddr))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "VetoWindowExpired");

      expect(await condition.isCancelled()).to.be.false;
      expect(await contentRegistry.isRegistered(contentId)).to.be.true;
    });

    it("Should free vetoed content for re-registration", async function () {
      await mockVerifier.setValid(true);
      const channelCanonicalId = "twitter:uid:veto-reregister-channel";
      const channelId = channelIdFromCanonical(channelCanonicalId);
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;
      const vetoedContentSuffix = "7301";
      const vetoedContentId = contentIdFromParts(channelCanonicalId, vetoedContentSuffix);

      await beneficiaryRegistry.verifyBeneficiary(
        channelId,
        alice.address,
        ethers.id("nonce-veto-r1"),
        deadline,
        proofHash,
        "0x"
      );

      const tx = await createContentFundingContract({
        factory,
        signer: thirdParty,
        channelCanonicalId,
        contentSuffixes: [vetoedContentSuffix],
        supplies: [50],
        prices: [ethers.parseEther("0.1")],
        threshold: ethers.parseEther("5.0"),
        deadline,
        metadataCid: "ipfs://QmThirdParty",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract",
        isThirdParty: true,
        initialPurchaseContentSuffixes: [vetoedContentSuffix],
        initialPurchaseCounts: [1],
        initialPurchaseValue: ethers.parseEther("0.1"),
      });

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const thirdPartyContractAddr = event.args.contractAddress;

      await beneficiaryRegistry.connect(alice).takeChannelControl(channelId);
      await beneficiaryRegistry.connect(alice).vetoContract(thirdPartyContractAddr);

      expect(await contentRegistry.isRegistered(vetoedContentId)).to.be.false;

      await expect(createContentFundingContract({
        factory,
        signer: alice,
        channelCanonicalId,
        contentSuffixes: [vetoedContentSuffix],
        supplies: [100],
        prices: [ethers.parseEther("0.2")],
        threshold: ethers.parseEther("6.0"),
        deadline,
        metadataCid: "ipfs://QmCreatorRetry",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract2",
        isThirdParty: false,
      })).to.not.be.reverted;
    });

    it("Should revert veto from non-channel-owner", async function () {
      await mockVerifier.setValid(true);
      const channelCanonicalId = "twitter:uid:veto-test-2";
      const channelId = channelIdFromCanonical(channelCanonicalId);
      const contentSuffix = "7101";
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;

      await beneficiaryRegistry.verifyBeneficiary(channelId, alice.address, ethers.id("nonce-v2"), deadline, proofHash, "0x");

      const tx = await createContentFundingContract({
        factory,
        signer: thirdParty,
        channelCanonicalId,
        contentSuffixes: [contentSuffix],
        supplies: [50],
        prices: [ethers.parseEther("0.1")],
        threshold: ethers.parseEther("5.0"),
        deadline,
        metadataCid: "ipfs://Qm",
        erc1155MetadataUri: "https://m/{id}.json",
        erc1155ContractUri: "ipfs://Qm",
        isThirdParty: true,
        initialPurchaseContentSuffixes: [contentSuffix],
        initialPurchaseCounts: [1],
        initialPurchaseValue: ethers.parseEther("0.1"),
      });
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const addr = event.args.contractAddress;

      await beneficiaryRegistry.connect(alice).takeChannelControl(channelId);

      await expect(beneficiaryRegistry.connect(bob).vetoContract(addr))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "OnlyChannelOwnerCanVeto");
    });

    it("Should revert veto on non-third-party contract", async function () {
      await mockVerifier.setValid(true);
      const channelCanonicalId = "twitter:uid:veto-test-3";
      const channelId = channelIdFromCanonical(channelCanonicalId);
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;

      await beneficiaryRegistry.verifyBeneficiary(channelId, alice.address, ethers.id("nonce-v3"), deadline, proofHash, "0x");

      // Creator creates their own contract (not third-party)
      const tx = await createContentFundingContract({
        factory,
        signer: alice,
        channelCanonicalId,
        contentSuffixes: ["7201"],
        supplies: [50],
        prices: [ethers.parseEther("0.1")],
        threshold: ethers.parseEther("5.0"),
        deadline,
        metadataCid: "ipfs://Qm",
        erc1155MetadataUri: "https://m/{id}.json",
        erc1155ContractUri: "ipfs://Qm",
        isThirdParty: false,
      });
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const addr = event.args.contractAddress;

      await beneficiaryRegistry.connect(alice).takeChannelControl(channelId);

      await expect(beneficiaryRegistry.connect(alice).vetoContract(addr))
        .to.be.revertedWithCustomError(beneficiaryRegistry, "ContractNotThirdParty");
    });
  });

  describe("releaseContentOnFailure", function () {
    it("Should release content when condition has failed", async function () {
      await mockVerifier.setValid(true);
      const channelCanonicalId = "twitter:uid:release-test";
      const channelId = channelIdFromCanonical(channelCanonicalId);
      const latestBlock = await ethers.provider.getBlock("latest");
      // Use a short deadline so we can make it fail after creation.
      const deadline = latestBlock.timestamp + 10;

      await beneficiaryRegistry.verifyBeneficiary(channelId, owner.address, ethers.id("nonce-r1"), deadline, proofHash, "0x");

      const releaseContentSuffixes = ["6001", "6002"];
      const releaseContentIds = contentIdsFromSuffixes(channelCanonicalId, releaseContentSuffixes);
      const tx = await createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId,
        contentSuffixes: releaseContentSuffixes,
        supplies: [100, 100],
        prices: [ethers.parseEther("0.1"), ethers.parseEther("0.2")],
        threshold: ethers.parseEther("5.0"),
        deadline,
        metadataCid: "ipfs://QmRelease",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract",
        isThirdParty: false,
      });
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const contractAddress = event.args.contractAddress;

      // Content should be registered
      expect(await contentRegistry.isRegistered(releaseContentIds[0])).to.be.true;
      expect(await contentRegistry.isRegistered(releaseContentIds[1])).to.be.true;

      // Mine blocks to pass the deadline
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");

      // Now the condition should have failed (deadline passed, threshold not met)
      await factory.releaseContentOnFailure(contractAddress);

      // Content should be released
      expect(await contentRegistry.isRegistered(releaseContentIds[0])).to.be.false;
      expect(await contentRegistry.isRegistered(releaseContentIds[1])).to.be.false;
    });

    it("Should revert releaseContentOnFailure when condition has not failed", async function () {
      await mockVerifier.setValid(true);
      const channelCanonicalId = "twitter:uid:release-test-2";
      const channelId = channelIdFromCanonical(channelCanonicalId);
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;

      await beneficiaryRegistry.verifyBeneficiary(channelId, owner.address, ethers.id("nonce-r2"), deadline, proofHash, "0x");

      const tx = await createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId,
        contentSuffixes: ["6101"],
        supplies: [100],
        prices: [ethers.parseEther("0.1")],
        threshold: ethers.parseEther("5.0"),
        deadline,
        metadataCid: "ipfs://QmRelease2",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract",
        isThirdParty: false,
      });
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");

      await expect(factory.releaseContentOnFailure(event.args.contractAddress))
        .to.be.revertedWithCustomError(factory, "ConditionNotFailed");
    });

    it("Should revert releaseContentOnFailure for unknown contract", async function () {
      await expect(factory.releaseContentOnFailure(alice.address))
        .to.be.revertedWithCustomError(factory, "NotCreatorContract");
    });
  });

  describe("Integration: Full Content Funding Flow", function () {
    let channelCanonicalId, channelId, contentSuffixes, contentIds, supplies, prices;
    let threshold, deadline;

    beforeEach(async function () {
      channelCanonicalId = "twitter:uid:integration-channel";
      channelId = channelIdFromCanonical(channelCanonicalId);
      contentSuffixes = ["10001", "10002"];
      contentIds = contentIdsFromSuffixes(channelCanonicalId, contentSuffixes);
      supplies = [50, 50];
      prices = [ethers.parseEther("0.5"), ethers.parseEther("1.0")];
      threshold = ethers.parseEther("10.0");
      const latestBlock = await ethers.provider.getBlock("latest");
      deadline = latestBlock.timestamp + 86400;

      await mockVerifier.setValid(true);
    });

    it("Should complete full creator contract flow", async function () {
      await beneficiaryRegistry.verifyBeneficiary(
        channelId,
        owner.address,
        ethers.id("nonce-1"),
        deadline,
        proofHash,
        "0x"
      );

      const tx = await createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId,
        contentSuffixes,
        supplies,
        prices,
        threshold,
        deadline,
        metadataCid: "ipfs://QmProject",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract",
        isThirdParty: false,
      });

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const contractAddress = event.args.contractAddress;

      expect(await contentRegistry.contentContract(contentIds[0])).to.equal(contractAddress);
      expect(await contentRegistry.isRegistered(contentIds[0])).to.be.true;
    });

    it("Should handle third-party contract with veto flow", async function () {
      // Verify and take control of owner's channel
      await beneficiaryRegistry.verifyBeneficiary(
        channelId,
        owner.address,
        ethers.id("nonce-1"),
        deadline,
        proofHash,
        "0x"
      );
      await beneficiaryRegistry.connect(owner).takeChannelControl(channelId);

      // Create a third-party contract on a different verified channel
      const thirdPartyChannelCanonicalId = "twitter:uid:third-party-channel";
      const thirdPartyChannelId = channelIdFromCanonical(thirdPartyChannelCanonicalId);
      await beneficiaryRegistry.verifyBeneficiary(
        thirdPartyChannelId,
        charlie.address,
        ethers.id("nonce-2"),
        deadline,
        proofHash,
        "0x"
      );

      const purchaseAmount = ethers.parseEther("0.5");
      const newContentSuffixes = ["20001", "20002"];
      const tx = await createContentFundingContract({
        factory,
        signer: owner,
        channelCanonicalId: thirdPartyChannelCanonicalId,
        contentSuffixes: newContentSuffixes,
        supplies,
        prices,
        threshold,
        deadline,
        metadataCid: "ipfs://QmThirdParty",
        erc1155MetadataUri: "https://meta/{id}.json",
        erc1155ContractUri: "ipfs://QmContract",
        isThirdParty: true,
        initialPurchaseContentSuffixes: [newContentSuffixes[0]],
        initialPurchaseCounts: [1],
        initialPurchaseValue: purchaseAmount,
      });
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const thirdPartyContract = event.args.contractAddress;

      expect(await beneficiaryEscrow.balance(thirdPartyChannelId)).to.equal(0);
      expect(await factory.isThirdPartyCreated(thirdPartyContract)).to.be.true;

      // Charlie takes control and vetoes
      await beneficiaryRegistry.connect(charlie).takeChannelControl(thirdPartyChannelId);
      await beneficiaryRegistry.connect(charlie).vetoContract(thirdPartyContract);

      // Verify the condition is cancelled
      const conditionAddr = await factory.contractCondition(thirdPartyContract);
      const condition = await ethers.getContractAt("CancellableCondition", conditionAddr);
      expect(await condition.isCancelled()).to.be.true;
    });
  });
});
