import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("ContentFunding", function () {
  let contentRegistry, channelRegistry, channelEscrow;
  let factory, erc1155Factory, marketplaceFactory, conditionFactory;
  let mockVerifier;
  let owner, recipient, alice, bob, charlie, thirdParty;

  beforeEach(async function () {
    [owner, recipient, alice, bob, charlie, thirdParty] = await ethers.getSigners();

    const MockVerifier = await ethers.getContractFactory("MockChannelVerifier");
    mockVerifier = await MockVerifier.deploy();

    const ContentRegistry = await ethers.getContractFactory("ContentRegistry");
    contentRegistry = await ContentRegistry.deploy();

    const ChannelRegistry = await ethers.getContractFactory("ChannelRegistry");
    channelRegistry = await ChannelRegistry.deploy(await mockVerifier.getAddress());

    const ChannelEscrow = await ethers.getContractFactory("ChannelEscrow");
    channelEscrow = await ChannelEscrow.deploy(await channelRegistry.getAddress());

    const PremintingERC1155Factory = await ethers.getContractFactory("PremintingERC1155Factory");
    erc1155Factory = await PremintingERC1155Factory.deploy();

    const MarketplaceFactory = await ethers.getContractFactory("MarketplaceFactory");
    marketplaceFactory = await MarketplaceFactory.deploy();

    const EthThresholdConditionFactory = await ethers.getContractFactory("EthThresholdConditionFactory");
    conditionFactory = await EthThresholdConditionFactory.deploy();

    const CreatorAssuranceContractFactory = await ethers.getContractFactory("CreatorAssuranceContractFactory");
    factory = await CreatorAssuranceContractFactory.deploy(
      await contentRegistry.getAddress(),
      await channelRegistry.getAddress(),
      await channelEscrow.getAddress(),
      await erc1155Factory.getAddress(),
      await marketplaceFactory.getAddress(),
      await conditionFactory.getAddress()
    );

    // Transfer ContentRegistry ownership to factory so it can register/release content
    await contentRegistry.connect(owner).transferOwnership(await factory.getAddress());

    await channelRegistry.connect(owner).setFactory(await factory.getAddress());
  });

  describe("ContentRegistry", function () {
    let contentId1, contentId2;

    beforeEach(async function () {
      contentId1 = 1001;
      contentId2 = 1002;
    });

    it("Should register content successfully (via factory)", async function () {
      // Content registration now happens through the factory during createContract
      const channelId = ethers.id("content-reg-test");
      await mockVerifier.setValid(true);
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;

      await channelRegistry.verifyChannel(
        channelId,
        owner.address,
        ethers.id("nonce-1"),
        deadline,
        "0x"
      );

      await factory.connect(owner).createContract(
        channelId,
        [contentId1],
        [100],
        [ethers.parseEther("0.1")],
        ethers.parseEther("5.0"),
        deadline,
        "ipfs://QmTest",
        "https://meta/{id}.json",
        "ipfs://QmContract",
        false,
        [],
        []
      );

      expect(await contentRegistry.isRegistered(contentId1)).to.be.true;
    });

    it("Should revert when non-owner calls registerContent directly", async function () {
      await expect(contentRegistry.connect(alice).registerContent(contentId1, alice.address))
        .to.be.revertedWithCustomError(contentRegistry, "OwnableUnauthorizedAccount");
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
      const channelId = ethers.id("dup-content-test");
      await mockVerifier.setValid(true);
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;

      await channelRegistry.verifyChannel(
        channelId,
        owner.address,
        ethers.id("nonce-1"),
        deadline,
        "0x"
      );

      await factory.connect(owner).createContract(
        channelId,
        [contentId1],
        [100],
        [ethers.parseEther("0.1")],
        ethers.parseEther("5.0"),
        deadline,
        "ipfs://QmTest",
        "https://meta/{id}.json",
        "ipfs://QmContract",
        false,
        [],
        []
      );

      // Create another channel to try registering same content via third-party
      const channelId2 = ethers.id("dup-content-test-2");
      await channelRegistry.verifyChannel(
        channelId2,
        owner.address,
        ethers.id("nonce-2"),
        deadline,
        "0x"
      );

      await expect(factory.connect(owner).createContract(
        channelId2,
        [contentId1],
        [100],
        [ethers.parseEther("0.1")],
        ethers.parseEther("5.0"),
        deadline,
        "ipfs://QmTest",
        "https://meta/{id}.json",
        "ipfs://QmContract",
        true,
        [contentId1],
        [1],
        { value: ethers.parseEther("0.1") }
      )).to.be.revertedWithCustomError(factory, "ContentAlreadyRegisteredForContract")
        .withArgs(contentId1);
    });

    it("Should return zero address for unregistered content", async function () {
      expect(await contentRegistry.contentContract(contentId1)).to.equal(ethers.ZeroAddress);
      expect(await contentRegistry.isRegistered(contentId1)).to.be.false;
    });
  });

  describe("ChannelRegistry", function () {
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

      await expect(channelRegistry.verifyChannel(channelId, alice.address, nonce, deadline, verifierSignature))
        .to.emit(channelRegistry, "ChannelVerified")
        .withArgs(channelId, alice.address);

      expect(await channelRegistry.channelOwner(channelId)).to.equal(alice.address);
      expect(await channelRegistry.isVerified(channelId)).to.be.true;
      expect(await channelRegistry.channelState(channelId)).to.equal(1);
    });

    it("Should revert when verifying already verified channel", async function () {
      await mockVerifier.setValid(true);
      await channelRegistry.verifyChannel(channelId, alice.address, nonce, deadline, verifierSignature);

      const nonce2 = ethers.id("nonce-2");
      await expect(channelRegistry.verifyChannel(channelId, alice.address, nonce2, deadline, verifierSignature))
        .to.be.revertedWithCustomError(channelRegistry, "ChannelAlreadyVerified")
        .withArgs(channelId);
    });

    it("Should revert when using expired deadline", async function () {
      const expiredDeadline = Math.floor(Date.now() / 1000) - 3600;

      await expect(channelRegistry.verifyChannel(channelId, alice.address, nonce, expiredDeadline, verifierSignature))
        .to.be.revertedWithCustomError(channelRegistry, "ProofExpired");
    });

    it("Should revert when verifier signature is invalid", async function () {
      const invalidSig = "0x12345678";

      await expect(channelRegistry.verifyChannel(channelId, alice.address, nonce, deadline, invalidSig))
        .to.be.revertedWithCustomError(channelRegistry, "InvalidVerifierSignature");
    });

    it("Should revert when reusing a nonce", async function () {
      await mockVerifier.setValid(true);
      await channelRegistry.verifyChannel(channelId, alice.address, nonce, deadline, verifierSignature);

      // Try to use the same nonce for a different channel
      const channelId2 = ethers.id("test-channel-2");
      await expect(channelRegistry.verifyChannel(channelId2, alice.address, nonce, deadline, verifierSignature))
        .to.be.revertedWithCustomError(channelRegistry, "InvalidNonce");
    });

    it("Should take channel control after verification", async function () {
      await mockVerifier.setValid(true);
      await channelRegistry.verifyChannel(channelId, alice.address, nonce, deadline, verifierSignature);

      await expect(channelRegistry.connect(alice).takeChannelControl(channelId))
        .to.emit(channelRegistry, "ChannelControlTaken")
        .withArgs(channelId, alice.address);

      expect(await channelRegistry.isCreatorControlled(channelId)).to.be.true;
      expect(await channelRegistry.channelState(channelId)).to.equal(2);
    });

    it("Should revert takeChannelControl when channel not verified", async function () {
      await expect(channelRegistry.connect(alice).takeChannelControl(channelId))
        .to.be.revertedWithCustomError(channelRegistry, "ChannelNotVerified")
        .withArgs(channelId);
    });

    it("Should revert takeChannelControl when not channel owner", async function () {
      await mockVerifier.setValid(true);
      await channelRegistry.verifyChannel(channelId, alice.address, nonce, deadline, verifierSignature);

      await expect(channelRegistry.connect(bob).takeChannelControl(channelId))
        .to.be.revertedWithCustomError(channelRegistry, "OnlyChannelOwnerCanTakeControl");
    });

    it("Should revert takeChannelControl when already creator controlled", async function () {
      await mockVerifier.setValid(true);
      await channelRegistry.verifyChannel(channelId, alice.address, nonce, deadline, verifierSignature);
      await channelRegistry.connect(alice).takeChannelControl(channelId);

      await expect(channelRegistry.connect(alice).takeChannelControl(channelId))
        .to.be.revertedWithCustomError(channelRegistry, "ChannelAlreadyCreatorControlled")
        .withArgs(channelId);
    });

    it("Should update verifier (owner only)", async function () {
      const newVerifier = bob;

      await expect(channelRegistry.connect(owner).setVerifier(await newVerifier.getAddress()))
        .to.emit(channelRegistry, "VerifierUpdated")
        .withArgs(await mockVerifier.getAddress(), await newVerifier.getAddress());

      expect(await channelRegistry.verifier()).to.equal(await newVerifier.getAddress());
    });

    it("Should revert setVerifier from non-owner", async function () {
      await expect(channelRegistry.connect(alice).setVerifier(await bob.getAddress()))
        .to.be.revertedWithCustomError(channelRegistry, "OwnableUnauthorizedAccount");
    });

    it("Should revert when setting invalid verifier address", async function () {
      await expect(channelRegistry.setVerifier(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(channelRegistry, "InvalidVerifierAddress");
    });

    it("Should update factory (owner only)", async function () {
      const newFactory = bob;

      await expect(channelRegistry.connect(owner).setFactory(await newFactory.getAddress()))
        .to.emit(channelRegistry, "FactoryUpdated")
        .withArgs(await factory.getAddress(), await newFactory.getAddress());

      expect(await channelRegistry.factory()).to.equal(await newFactory.getAddress());
    });

    it("Should revert setFactory from non-owner", async function () {
      await expect(channelRegistry.connect(alice).setFactory(await bob.getAddress()))
        .to.be.revertedWithCustomError(channelRegistry, "OwnableUnauthorizedAccount");
    });

    it("Should revert when setting invalid factory address", async function () {
      await expect(channelRegistry.setFactory(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(channelRegistry, "InvalidFactoryAddress");
    });
  });

  describe("ChannelEscrow", function () {
    let channelId;

    beforeEach(async function () {
      channelId = ethers.id("test-channel-escrow");
    });

    it("Should deposit ETH successfully", async function () {
      const depositAmount = ethers.parseEther("1.0");

      await expect(channelEscrow.connect(alice).deposit(channelId, { value: depositAmount }))
        .to.emit(channelEscrow, "Deposited")
        .withArgs(channelId, await alice.getAddress(), depositAmount);

      expect(await channelEscrow.balance(channelId)).to.equal(depositAmount);
    });

    it("Should revert when depositing zero ETH", async function () {
      await expect(channelEscrow.deposit(channelId, { value: 0 }))
        .to.be.revertedWithCustomError(channelEscrow, "MustSendEth");
    });

    it("Should withdraw ETH successfully", async function () {
      const depositAmount = ethers.parseEther("2.0");

      await mockVerifier.setValid(true);
      await channelRegistry.verifyChannel(
        channelId,
        bob.address,
        ethers.id("nonce-1"),
        (await ethers.provider.getBlock("latest")).timestamp + 86400,
        "0x"
      );

      await channelEscrow.connect(bob).deposit(channelId, { value: depositAmount });

      await expect(channelEscrow.connect(bob).withdraw(channelId))
        .to.emit(channelEscrow, "Withdrawn")
        .withArgs(channelId, await bob.getAddress(), depositAmount);

      expect(await channelEscrow.balance(channelId)).to.equal(0);
    });

    it("Should allow cumulative escrow withdrawal after multiple deposits for the same channel", async function () {
      const escrowedChannelId = ethers.id("cumulative-escrow-channel");
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;
      const firstDepositAmount = ethers.parseEther("0.1");
      const secondDepositAmount = ethers.parseEther("0.2");

      const firstTx = await factory.connect(thirdParty).createContract(
        escrowedChannelId,
        [9301],
        [50],
        [firstDepositAmount],
        firstDepositAmount,
        deadline,
        "ipfs://QmEscrowOne",
        "https://meta/{id}.json",
        "ipfs://QmContract",
        true,
        [9301],
        [1],
        { value: firstDepositAmount }
      );

      const firstReceipt = await firstTx.wait();
      const firstEvent = firstReceipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const firstContract = await ethers.getContractAt(
        "CreatorAssuranceContract",
        firstEvent.args.contractAddress
      );

      const secondTx = await factory.connect(owner).createContract(
        escrowedChannelId,
        [9302],
        [50],
        [secondDepositAmount],
        secondDepositAmount,
        deadline,
        "ipfs://QmEscrowTwo",
        "https://meta/{id}.json",
        "ipfs://QmContract",
        true,
        [9302],
        [1],
        { value: secondDepositAmount }
      );

      const secondReceipt = await secondTx.wait();
      const secondEvent = secondReceipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const secondContract = await ethers.getContractAt(
        "CreatorAssuranceContract",
        secondEvent.args.contractAddress
      );

      await firstContract.withdrawToEscrow();
      await secondContract.withdrawToEscrow();

      const totalEscrowBalance = firstDepositAmount + secondDepositAmount;
      expect(await channelEscrow.balance(escrowedChannelId)).to.equal(totalEscrowBalance);

      await mockVerifier.setValid(true);
      await channelRegistry.verifyChannel(
        escrowedChannelId,
        alice.address,
        ethers.id("nonce-cumulative-withdraw"),
        deadline,
        "0x"
      );

      await expect(channelEscrow.connect(alice).withdraw(escrowedChannelId))
        .to.emit(channelEscrow, "Withdrawn")
        .withArgs(escrowedChannelId, await alice.getAddress(), totalEscrowBalance);

      expect(await channelEscrow.balance(escrowedChannelId)).to.equal(0);
    });

    it("Should revert withdraw when channel not verified", async function () {
      await expect(channelEscrow.withdraw(channelId))
        .to.be.revertedWithCustomError(channelEscrow, "ChannelNotVerified");
    });

    it("Should revert withdraw when not channel owner", async function () {
      await mockVerifier.setValid(true);
      await channelRegistry.verifyChannel(
        channelId,
        bob.address,
        ethers.id("nonce-1"),
        (await ethers.provider.getBlock("latest")).timestamp + 86400,
        "0x"
      );

      await channelEscrow.connect(bob).deposit(channelId, { value: ethers.parseEther("1.0") });

      await expect(channelEscrow.connect(alice).withdraw(channelId))
        .to.be.revertedWithCustomError(channelEscrow, "OnlyChannelOwner");
    });

    it("Should revert withdraw when no balance", async function () {
      await mockVerifier.setValid(true);
      await channelRegistry.verifyChannel(
        channelId,
        bob.address,
        ethers.id("nonce-1"),
        (await ethers.provider.getBlock("latest")).timestamp + 86400,
        "0x"
      );

      await expect(channelEscrow.connect(bob).withdraw(channelId))
        .to.be.revertedWithCustomError(channelEscrow, "NoBalance");
    });
  });

  describe("CreatorAssuranceContractFactory", function () {
    let channelId, contentIds, supplies, prices;
    let threshold, deadline, metadataCid;
    let erc1155MetadataUri, erc1155ContractUri;

    beforeEach(async function () {
      channelId = ethers.id("factory-test-channel");
      contentIds = [2001, 2002, 2003];
      supplies = [100, 100, 100];
      prices = [ethers.parseEther("0.1"), ethers.parseEther("0.2"), ethers.parseEther("0.3")];
      threshold = ethers.parseEther("5.0");
      const latestBlock = await ethers.provider.getBlock("latest");
      deadline = latestBlock.timestamp + 86400;
      metadataCid = "ipfs://QmProjectMetadata";
      erc1155MetadataUri = "https://example.com/metadata/{id}.json";
      erc1155ContractUri = "ipfs://QmERC1155Contract";

      await mockVerifier.setValid(true);
      await channelRegistry.verifyChannel(
        channelId,
        owner.address,
        ethers.id("nonce-1"),
        deadline,
        "0x"
      );
    });

    it("Should create creator contract successfully", async function () {
      const tx = await factory.connect(owner).createContract(
        channelId,
        contentIds,
        supplies,
        prices,
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        false,
        [],
        []
      );

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

    it("Should create creator contract successfully on CreatorControlled channel", async function () {
      await channelRegistry.connect(owner).takeChannelControl(channelId);

      const controlledContentIds = [2101, 2102];
      const tx = await factory.connect(owner).createContract(
        channelId,
        controlledContentIds,
        [25, 25],
        [ethers.parseEther("0.15"), ethers.parseEther("0.25")],
        threshold,
        deadline,
        "ipfs://QmCreatorControlled",
        erc1155MetadataUri,
        erc1155ContractUri,
        false,
        [],
        []
      );

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

      await expect(factory.connect(owner).createContract(
        channelId,
        contentIds,
        mismatchedSupplies,
        prices,
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        false,
        [],
        []
      )).to.be.revertedWithCustomError(factory, "ArrayLengthMismatch");
    });

    it("Should revert creator contract when channel not verified", async function () {
      const unverifiedChannel = ethers.id("unverified-channel");

      await expect(factory.connect(owner).createContract(
        unverifiedChannel,
        contentIds,
        supplies,
        prices,
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        false,
        [],
        []
      )).to.be.revertedWithCustomError(factory, "ChannelNotVerifiedOrControlled")
        .withArgs(unverifiedChannel);
    });

    it("Should revert creator contract when caller is not the verified channel owner", async function () {
      await expect(factory.connect(thirdParty).createContract(
        channelId,
        contentIds,
        supplies,
        prices,
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        false,
        [],
        []
      )).to.be.revertedWithCustomError(factory, "OnlyChannelOwnerCanCreateCreatorContract")
        .withArgs(channelId);
    });

    it("Should create third-party contract with an initial token purchase", async function () {
      const purchaseAmount = prices[0];

      const tx = await factory.connect(owner).createContract(
        channelId,
        contentIds,
        supplies,
        prices,
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        true,
        [contentIds[0]],
        [1],
        { value: purchaseAmount }
      );

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
      expect(await channelEscrow.balance(channelId)).to.equal(0);
    });

    it("Should create third-party contract on Unclaimed channel without upfront escrow deposit", async function () {
      const unclaimedChannel = ethers.id("unclaimed-channel");
      const purchaseAmount = ethers.parseEther("0.1");
      const unclaimedContentIds = [9001, 9002];
      const unclaimedPrices = [ethers.parseEther("0.1"), ethers.parseEther("0.2")];

      const tx = await factory.connect(thirdParty).createContract(
        unclaimedChannel,
        unclaimedContentIds,
        [50, 50],
        unclaimedPrices,
        ethers.parseEther("5.0"),
        deadline,
        "ipfs://QmThirdParty",
        "https://meta/{id}.json",
        "ipfs://QmContract",
        true,
        [unclaimedContentIds[0]],
        [1],
        { value: purchaseAmount }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const contractAddress = event.args.contractAddress;
      const erc1155Address = await factory.contractERC1155(contractAddress);
      const erc1155 = await ethers.getContractAt("PremintingERC1155", erc1155Address);

      // Creation fee now buys tokens instead of depositing to escrow.
      expect(await channelEscrow.balance(unclaimedChannel)).to.equal(0);
      expect(await factory.isThirdPartyCreated(contractAddress)).to.be.true;
      expect(await erc1155.balanceOf(thirdParty.address, unclaimedContentIds[0])).to.equal(1);

      // Content should be registered
      expect(await contentRegistry.isRegistered(unclaimedContentIds[0])).to.be.true;
    });

    it("Should allow a successful unclaimed contract to move funds into escrow", async function () {
      const unclaimedChannel = ethers.id("successful-unclaimed-channel");
      const successThreshold = ethers.parseEther("0.1");
      const purchaseAmount = ethers.parseEther("0.1");
      const tx = await factory.connect(thirdParty).createContract(
        unclaimedChannel,
        [9101],
        [50],
        [purchaseAmount],
        successThreshold,
        deadline,
        "ipfs://QmThirdParty",
        "https://meta/{id}.json",
        "ipfs://QmContract",
        true,
        [9101],
        [1],
        { value: purchaseAmount }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const contractAddress = event.args.contractAddress;
      const createdContract = await ethers.getContractAt("CreatorAssuranceContract", contractAddress);

      await createdContract.withdrawToEscrow();

      expect(await channelEscrow.balance(unclaimedChannel)).to.equal(purchaseAmount);
    });

    it("Should revert withdrawToEscrow when contract recipient is not escrow", async function () {
      const tx = await factory.connect(owner).createContract(
        channelId,
        [9201],
        [50],
        [ethers.parseEther("0.1")],
        ethers.parseEther("5.0"),
        deadline,
        "ipfs://QmCreatorOwned",
        "https://meta/{id}.json",
        "ipfs://QmContract",
        false,
        [],
        []
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const contractAddress = event.args.contractAddress;
      const createdContract = await ethers.getContractAt("CreatorAssuranceContract", contractAddress);

      await expect(createdContract.withdrawToEscrow())
        .to.be.revertedWithCustomError(createdContract, "RecipientNotEscrow");
    });

    it("Should revert third-party contract on CreatorControlled channel", async function () {
      await channelRegistry.connect(owner).takeChannelControl(channelId);

      await expect(factory.connect(thirdParty).createContract(
        channelId,
        [8001],
        [100],
        [ethers.parseEther("0.1")],
        ethers.parseEther("5.0"),
        deadline,
        "ipfs://QmThirdParty",
        "https://meta/{id}.json",
        "ipfs://QmContract",
        true,
        [8001],
        [1],
        { value: ethers.parseEther("0.1") }
      )).to.be.revertedWithCustomError(factory, "ChannelCreatorControlled")
        .withArgs(channelId);
    });

    it("Should revert third-party creation when the initial purchase is below the minimum", async function () {
      const insufficientAmount = ethers.parseEther("0.001");
      const cheapContentId = 3001;

      await expect(factory.connect(owner).createContract(
        channelId,
        [cheapContentId],
        [100],
        [insufficientAmount],
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        true,
        [cheapContentId],
        [1],
        { value: insufficientAmount }
      )).to.be.revertedWithCustomError(factory, "InsufficientThirdPartyPurchase");
    });

    it("Should revert when content already registered for third-party", async function () {
      await factory.connect(owner).createContract(
        channelId,
        [contentIds[0]],
        [supplies[0]],
        [prices[0]],
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        false,
        [],
        []
      );

      const newChannelId = ethers.id("new-channel");
      await channelRegistry.verifyChannel(
        newChannelId,
        owner.address,
        ethers.id("nonce-2"),
        deadline,
        "0x"
      );

      await expect(factory.connect(owner).createContract(
        newChannelId,
        [contentIds[0]],
        [supplies[0]],
        [prices[0]],
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        true,
        [contentIds[0]],
        [1],
        { value: ethers.parseEther("0.1") }
      )).to.be.revertedWithCustomError(factory, "ContentAlreadyRegisteredForContract")
        .withArgs(contentIds[0]);
    });

    it("Should revert when content already registered for creator-created contract", async function () {
      await factory.connect(owner).createContract(
        channelId,
        [contentIds[0]],
        [supplies[0]],
        [prices[0]],
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        false,
        [],
        []
      );

      const newChannelId = ethers.id("new-channel-creator-duplicate");
      await channelRegistry.verifyChannel(
        newChannelId,
        owner.address,
        ethers.id("nonce-3"),
        deadline,
        "0x"
      );

      await expect(factory.connect(owner).createContract(
        newChannelId,
        [contentIds[0]],
        [supplies[0]],
        [prices[0]],
        threshold,
        deadline,
        metadataCid,
        erc1155MetadataUri,
        erc1155ContractUri,
        false,
        [],
        []
      )).to.be.revertedWithCustomError(factory, "ContentAlreadyRegisteredForContract")
        .withArgs(contentIds[0]);
    });

    it("Should set third party min purchase (owner only)", async function () {
      const newMin = ethers.parseEther("0.05");
      await factory.setThirdPartyMinPurchase(newMin);

      expect(await factory.thirdPartyMinPurchase()).to.equal(newMin);
    });

    it("Should revert setThirdPartyMinPurchase from non-owner", async function () {
      await expect(factory.connect(alice).setThirdPartyMinPurchase(ethers.parseEther("0.05")))
        .to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("Should update factory addresses", async function () {
      expect(await channelRegistry.factory()).to.equal(await factory.getAddress());
    });
  });

  describe("CreatorAssuranceContract", function () {
    let channelId, contentIds;
    let createdContract;

    beforeEach(async function () {
      channelId = ethers.id("creator-contract-test");
      contentIds = [3001, 3002];

      await mockVerifier.setValid(true);
      await channelRegistry.verifyChannel(
        channelId,
        owner.address,
        ethers.id("nonce-1"),
        (await ethers.provider.getBlock("latest")).timestamp + 86400,
        "0x"
      );

      const tx = await factory.connect(owner).createContract(
        channelId,
        contentIds,
        [100, 100],
        [ethers.parseEther("0.1"), ethers.parseEther("0.2")],
        ethers.parseEther("5.0"),
        (await ethers.provider.getBlock("latest")).timestamp + 86400,
        "ipfs://QmProject",
        "https://meta/{id}.json",
        "ipfs://QmContract",
        false,
        [],
        []
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
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

    it("Should emit content item registered event", async function () {
      const contentId = 5001;
      const canonicalId = "canonical-123";

      await expect(createdContract.connect(owner).registerContentItem(contentId, canonicalId))
        .to.emit(createdContract, "ContentItemRegistered")
        .withArgs(channelId, contentId, canonicalId);
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
      const channelId = ethers.id("veto-test-channel");
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;

      // Verify channel
      await channelRegistry.verifyChannel(
        channelId,
        alice.address,
        ethers.id("nonce-veto-1"),
        deadline,
        "0x"
      );

      // Create a third-party contract on this verified channel
      const purchaseAmount = ethers.parseEther("0.1");
      const tx = await factory.connect(thirdParty).createContract(
        channelId,
        [7001, 7002],
        [50, 50],
        [ethers.parseEther("0.1"), ethers.parseEther("0.2")],
        ethers.parseEther("5.0"),
        deadline,
        "ipfs://QmThirdParty",
        "https://meta/{id}.json",
        "ipfs://QmContract",
        true,
        [7001],
        [1],
        { value: purchaseAmount }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const thirdPartyContractAddr = event.args.contractAddress;
      const erc1155Address = await factory.contractERC1155(thirdPartyContractAddr);
      const erc1155 = await ethers.getContractAt("PremintingERC1155", erc1155Address);

      // Creator takes channel control
      await channelRegistry.connect(alice).takeChannelControl(channelId);

      // Creator vetoes the third-party contract
      await channelRegistry.connect(alice).vetoContract(thirdPartyContractAddr);

      // Verify the condition is cancelled
      const conditionAddr = await factory.contractCondition(thirdPartyContractAddr);
      const condition = await ethers.getContractAt("CancellableCondition", conditionAddr);
      expect(await condition.isCancelled()).to.be.true;
      expect(await condition.hasFailed()).to.be.true;
      expect(await contentRegistry.isRegistered(7001)).to.be.false;
      expect(await contentRegistry.isRegistered(7002)).to.be.false;
      expect(await erc1155.balanceOf(thirdParty.address, 7001)).to.equal(1);
    });

    it("Should revert veto after the veto window has expired", async function () {
      await mockVerifier.setValid(true);
      const channelId = ethers.id("veto-expired-channel");
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;

      await channelRegistry.verifyChannel(
        channelId,
        alice.address,
        ethers.id("nonce-veto-expired"),
        deadline,
        "0x"
      );

      const tx = await factory.connect(thirdParty).createContract(
        channelId,
        [7411],
        [50],
        [ethers.parseEther("0.1")],
        ethers.parseEther("5.0"),
        deadline,
        "ipfs://QmThirdParty",
        "https://meta/{id}.json",
        "ipfs://QmContract",
        true,
        [7411],
        [1],
        { value: ethers.parseEther("0.1") }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const thirdPartyContractAddr = event.args.contractAddress;
      const conditionAddress = await factory.contractCondition(thirdPartyContractAddr);
      const condition = await ethers.getContractAt("CancellableCondition", conditionAddress);

      await channelRegistry.connect(alice).takeChannelControl(channelId);

      const vetoWindowDuration = await channelRegistry.vetoWindowDuration();
      await ethers.provider.send("evm_increaseTime", [Number(vetoWindowDuration) + 1]);
      await ethers.provider.send("evm_mine");

      await expect(channelRegistry.connect(alice).vetoContract(thirdPartyContractAddr))
        .to.be.revertedWithCustomError(channelRegistry, "VetoWindowExpired");

      expect(await condition.isCancelled()).to.be.false;
      expect(await contentRegistry.isRegistered(7411)).to.be.true;
    });

    it("Should revert veto on an already-succeeded third-party contract", async function () {
      await mockVerifier.setValid(true);
      const channelId = ethers.id("veto-succeeded-channel");
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;
      const successThreshold = ethers.parseEther("0.1");

      await channelRegistry.verifyChannel(
        channelId,
        alice.address,
        ethers.id("nonce-veto-success"),
        deadline,
        "0x"
      );

      const tx = await factory.connect(thirdParty).createContract(
        channelId,
        [7401],
        [50],
        [successThreshold],
        successThreshold,
        deadline,
        "ipfs://QmThirdParty",
        "https://meta/{id}.json",
        "ipfs://QmContract",
        true,
        [7401],
        [1],
        { value: successThreshold }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const thirdPartyContractAddr = event.args.contractAddress;
      const conditionAddress = await factory.contractCondition(thirdPartyContractAddr);
      const condition = await ethers.getContractAt("CancellableCondition", conditionAddress);

      expect(await condition.hasSucceeded()).to.be.true;

      await channelRegistry.connect(alice).takeChannelControl(channelId);

      await expect(channelRegistry.connect(alice).vetoContract(thirdPartyContractAddr))
        .to.be.revertedWithCustomError(condition, "ConditionAlreadySucceeded");

      expect(await condition.isCancelled()).to.be.false;
      expect(await contentRegistry.isRegistered(7401)).to.be.true;
    });

    it("Should free vetoed content for re-registration", async function () {
      await mockVerifier.setValid(true);
      const channelId = ethers.id("veto-reregister-channel");
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;
      const vetoedContentId = 7301;

      await channelRegistry.verifyChannel(
        channelId,
        alice.address,
        ethers.id("nonce-veto-r1"),
        deadline,
        "0x"
      );

      const tx = await factory.connect(thirdParty).createContract(
        channelId,
        [vetoedContentId],
        [50],
        [ethers.parseEther("0.1")],
        ethers.parseEther("5.0"),
        deadline,
        "ipfs://QmThirdParty",
        "https://meta/{id}.json",
        "ipfs://QmContract",
        true,
        [vetoedContentId],
        [1],
        { value: ethers.parseEther("0.1") }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const thirdPartyContractAddr = event.args.contractAddress;

      await channelRegistry.connect(alice).takeChannelControl(channelId);
      await channelRegistry.connect(alice).vetoContract(thirdPartyContractAddr);

      expect(await contentRegistry.isRegistered(vetoedContentId)).to.be.false;

      await expect(factory.connect(alice).createContract(
        channelId,
        [vetoedContentId],
        [100],
        [ethers.parseEther("0.2")],
        ethers.parseEther("6.0"),
        deadline,
        "ipfs://QmCreatorRetry",
        "https://meta/{id}.json",
        "ipfs://QmContract2",
        false,
        [],
        []
      )).to.not.be.reverted;
    });

    it("Should revert veto from non-channel-owner", async function () {
      await mockVerifier.setValid(true);
      const channelId = ethers.id("veto-test-2");
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;

      await channelRegistry.verifyChannel(channelId, alice.address, ethers.id("nonce-v2"), deadline, "0x");

      const tx = await factory.connect(thirdParty).createContract(
        channelId, [7101], [50], [ethers.parseEther("0.1")],
        ethers.parseEther("5.0"), deadline, "ipfs://Qm", "https://m/{id}.json", "ipfs://Qm",
        true, [7101], [1], { value: ethers.parseEther("0.1") }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const addr = event.args.contractAddress;

      await channelRegistry.connect(alice).takeChannelControl(channelId);

      await expect(channelRegistry.connect(bob).vetoContract(addr))
        .to.be.revertedWithCustomError(channelRegistry, "OnlyChannelOwnerCanVeto");
    });

    it("Should revert veto on non-third-party contract", async function () {
      await mockVerifier.setValid(true);
      const channelId = ethers.id("veto-test-3");
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;

      await channelRegistry.verifyChannel(channelId, alice.address, ethers.id("nonce-v3"), deadline, "0x");

      // Creator creates their own contract (not third-party)
      const tx = await factory.connect(alice).createContract(
        channelId, [7201], [50], [ethers.parseEther("0.1")],
        ethers.parseEther("5.0"), deadline, "ipfs://Qm", "https://m/{id}.json", "ipfs://Qm",
        false, [], []
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const addr = event.args.contractAddress;

      await channelRegistry.connect(alice).takeChannelControl(channelId);

      await expect(channelRegistry.connect(alice).vetoContract(addr))
        .to.be.revertedWithCustomError(channelRegistry, "ContractNotThirdParty");
    });
  });

  describe("releaseContentOnFailure", function () {
    it("Should release content when condition has failed", async function () {
      await mockVerifier.setValid(true);
      const channelId = ethers.id("release-test");
      const latestBlock = await ethers.provider.getBlock("latest");
      // Use a very short deadline so we can make it fail
      const deadline = latestBlock.timestamp + 2;

      await channelRegistry.verifyChannel(channelId, owner.address, ethers.id("nonce-r1"), deadline, "0x");

      const releaseContentIds = [6001, 6002];
      const tx = await factory.connect(owner).createContract(
        channelId,
        releaseContentIds,
        [100, 100],
        [ethers.parseEther("0.1"), ethers.parseEther("0.2")],
        ethers.parseEther("5.0"),
        deadline,
        "ipfs://QmRelease",
        "https://meta/{id}.json",
        "ipfs://QmContract",
        false,
        [],
        []
      );
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
      const channelId = ethers.id("release-test-2");
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;

      await channelRegistry.verifyChannel(channelId, owner.address, ethers.id("nonce-r2"), deadline, "0x");

      const tx = await factory.connect(owner).createContract(
        channelId,
        [6101],
        [100],
        [ethers.parseEther("0.1")],
        ethers.parseEther("5.0"),
        deadline,
        "ipfs://QmRelease2",
        "https://meta/{id}.json",
        "ipfs://QmContract",
        false,
        [],
        []
      );
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
    let channelId, contentIds, supplies, prices;
    let threshold, deadline;

    beforeEach(async function () {
      channelId = ethers.id("integration-channel");
      contentIds = [10001, 10002];
      supplies = [50, 50];
      prices = [ethers.parseEther("0.5"), ethers.parseEther("1.0")];
      threshold = ethers.parseEther("10.0");
      const latestBlock = await ethers.provider.getBlock("latest");
      deadline = latestBlock.timestamp + 86400;

      await mockVerifier.setValid(true);
    });

    it("Should complete full creator contract flow", async function () {
      await channelRegistry.verifyChannel(
        channelId,
        owner.address,
        ethers.id("nonce-1"),
        deadline,
        "0x"
      );

      const tx = await factory.connect(owner).createContract(
        channelId,
        contentIds,
        supplies,
        prices,
        threshold,
        deadline,
        "ipfs://QmProject",
        "https://meta/{id}.json",
        "ipfs://QmContract",
        false,
        [],
        []
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const contractAddress = event.args.contractAddress;

      expect(await contentRegistry.contentContract(contentIds[0])).to.equal(contractAddress);
      expect(await contentRegistry.isRegistered(contentIds[0])).to.be.true;
    });

    it("Should handle third-party contract with veto flow", async function () {
      // Verify and take control of owner's channel
      await channelRegistry.verifyChannel(
        channelId,
        owner.address,
        ethers.id("nonce-1"),
        deadline,
        "0x"
      );
      await channelRegistry.connect(owner).takeChannelControl(channelId);

      // Create a third-party contract on a different verified channel
      const thirdPartyChannelId = ethers.id("third-party-channel");
      await channelRegistry.verifyChannel(
        thirdPartyChannelId,
        charlie.address,
        ethers.id("nonce-2"),
        deadline,
        "0x"
      );

      const purchaseAmount = ethers.parseEther("0.5");
      const newContentIds = [20001, 20002];
      const tx = await factory.connect(owner).createContract(
        thirdPartyChannelId,
        newContentIds,
        supplies,
        prices,
        threshold,
        deadline,
        "ipfs://QmThirdParty",
        "https://meta/{id}.json",
        "ipfs://QmContract",
        true,
        [newContentIds[0]],
        [1],
        { value: purchaseAmount }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const thirdPartyContract = event.args.contractAddress;

      expect(await channelEscrow.balance(thirdPartyChannelId)).to.equal(0);
      expect(await factory.isThirdPartyCreated(thirdPartyContract)).to.be.true;

      // Charlie takes control and vetoes
      await channelRegistry.connect(charlie).takeChannelControl(thirdPartyChannelId);
      await channelRegistry.connect(charlie).vetoContract(thirdPartyContract);

      // Verify the condition is cancelled
      const conditionAddr = await factory.contractCondition(thirdPartyContract);
      const condition = await ethers.getContractAt("CancellableCondition", conditionAddr);
      expect(await condition.isCancelled()).to.be.true;
    });
  });
});

describe("MockChannelVerifier", function () {
  let mockVerifier;
  let owner, claimant;

  beforeEach(async function () {
    [owner, claimant] = await ethers.getSigners();

    const MockChannelVerifier = await ethers.getContractFactory("MockChannelVerifier");
    mockVerifier = await MockChannelVerifier.deploy();
  });

  it("Should return valid result based on setValid", async function () {
    await mockVerifier.setValid(true);

    const channelId = ethers.id("test-channel");
    const nonce = ethers.id("nonce-1");
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;

    const message = ethers.solidityPacked(
      ["bytes32", "address", "bytes32", "uint256"],
      [channelId, claimant.address, nonce, deadline]
    );
    const hash = ethers.keccak256(message);
    const sig = await claimant.signMessage(ethers.getBytes(hash));

    expect(await mockVerifier.verifyClaimProof(channelId, claimant.address, nonce, deadline, sig)).to.be.true;
  });

  it("Should return invalid when setValid is false", async function () {
    await mockVerifier.setValid(false);

    const channelId = ethers.id("test-channel");
    const nonce = ethers.id("nonce-1");
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;

    const message = ethers.solidityPacked(
      ["bytes32", "address", "bytes32", "uint256"],
      [channelId, claimant.address, nonce, deadline]
    );
    const hash = ethers.keccak256(message);
    const sig = await claimant.signMessage(ethers.getBytes(hash));

    expect(await mockVerifier.verifyClaimProof(channelId, claimant.address, nonce, deadline, sig)).to.be.false;
  });
});
