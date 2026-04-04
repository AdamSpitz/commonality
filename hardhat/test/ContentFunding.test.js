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

    await channelRegistry.connect(owner).setFactory(await factory.getAddress());
  });

  describe("ContentRegistry", function () {
    let contentId1, contentId2;

    beforeEach(async function () {
      contentId1 = 1001;
      contentId2 = 1002;
    });

    it("Should register content successfully", async function () {
      const AssuranceContract = await ethers.getContractFactory("MultiERC1155AssuranceContract");
      const assuranceContract = await AssuranceContract.deploy(
        owner.address,
        recipient.address,
        "ipfs://QmTest"
      );

      await expect(contentRegistry.registerContent(contentId1, await assuranceContract.getAddress()))
        .to.emit(contentRegistry, "ContentRegistered")
        .withArgs(contentId1, await assuranceContract.getAddress());

      expect(await contentRegistry.contentContract(contentId1)).to.equal(await assuranceContract.getAddress());
      expect(await contentRegistry.isRegistered(contentId1)).to.be.true;
    });

    it("Should revert when registering content with invalid contentId (0)", async function () {
      await expect(contentRegistry.registerContent(0, owner.address))
        .to.be.revertedWithCustomError(contentRegistry, "InvalidContentId");
    });

    it("Should revert when registering duplicate content", async function () {
      const AssuranceContract = await ethers.getContractFactory("MultiERC1155AssuranceContract");
      const assuranceContract = await AssuranceContract.deploy(
        owner.address,
        recipient.address,
        "ipfs://QmTest"
      );

      await contentRegistry.registerContent(contentId1, await assuranceContract.getAddress());

      await expect(contentRegistry.registerContent(contentId1, await assuranceContract.getAddress()))
        .to.be.revertedWithCustomError(contentRegistry, "ContentAlreadyRegistered")
        .withArgs(contentId1, await assuranceContract.getAddress());
    });

    it("Should release content successfully", async function () {
      const AssuranceContract = await ethers.getContractFactory("MultiERC1155AssuranceContract");
      const assuranceContract = await AssuranceContract.deploy(
        owner.address,
        recipient.address,
        "ipfs://QmTest"
      );

      await contentRegistry.registerContent(contentId1, await assuranceContract.getAddress());
      
      await expect(contentRegistry.releaseContent(contentId1))
        .to.emit(contentRegistry, "ContentReleased")
        .withArgs(contentId1);

      expect(await contentRegistry.contentContract(contentId1)).to.equal(ethers.ZeroAddress);
      expect(await contentRegistry.isRegistered(contentId1)).to.be.false;
    });

    it("Should revert when releasing unregistered content", async function () {
      await expect(contentRegistry.releaseContent(contentId1))
        .to.be.revertedWithCustomError(contentRegistry, "ContentNotRegistered")
        .withArgs(contentId1);
    });

    it("Should return zero address for unregistered content", async function () {
      expect(await contentRegistry.contentContract(contentId1)).to.equal(ethers.ZeroAddress);
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
        .to.be.revertedWithCustomError(channelRegistry, "ChannelNotVerified")
        .withArgs(channelId);
    });

    it("Should update verifier", async function () {
      const newVerifier = bob;
      
      await expect(channelRegistry.connect(owner).setVerifier(await newVerifier.getAddress()))
        .to.emit(channelRegistry, "VerifierUpdated")
        .withArgs(await mockVerifier.getAddress(), await newVerifier.getAddress());

      expect(await channelRegistry.verifier()).to.equal(await newVerifier.getAddress());
    });

    it("Should revert when setting invalid verifier address", async function () {
      await expect(channelRegistry.setVerifier(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid verifier address");
    });

    it("Should update factory", async function () {
      const newFactory = bob;
      
      await expect(channelRegistry.connect(owner).setFactory(await newFactory.getAddress()))
        .to.emit(channelRegistry, "FactoryUpdated")
        .withArgs(await factory.getAddress(), await newFactory.getAddress());

      expect(await channelRegistry.factory()).to.equal(await newFactory.getAddress());
    });

    it("Should check canCreateContract correctly", async function () {
      await mockVerifier.setValid(true);
      expect(await channelRegistry.canCreateContract(channelId)).to.be.equal(true);

      await channelRegistry.verifyChannel(channelId, alice.address, nonce, deadline, verifierSignature);
      expect(await channelRegistry.canCreateContract(channelId)).to.be.equal(true);
    });
  });

  describe("ChannelEscrow", function () {
    let channelId;

    beforeEach(async function () {
      channelId = ethers.id("test-channel-escrow");
    });

    it("Should deposit ETH successfully", async function () {
      const depositAmount = ethers.parseEther("1.0");
      
      await expect(channelRegistry.connect(bob).verifyChannel(
        channelId,
        bob.address,
        ethers.id("nonce-1"),
        (await ethers.provider.getBlock("latest")).timestamp + 86400,
        "0x"
      )).to.be.reverted;

      await mockVerifier.setValid(true);
      await channelRegistry.verifyChannel(
        channelId,
        bob.address,
        ethers.id("nonce-1"),
        (await ethers.provider.getBlock("latest")).timestamp + 86400,
        "0x"
      );

      await expect(channelRegistry.connect(bob).verifyChannel(channelId, bob.address, ethers.id("nonce-2"), (await ethers.provider.getBlock("latest")).timestamp + 86400, "0x")).to.be.reverted;

      await expect(channelEscrow.connect(alice).deposit(channelId, { value: depositAmount }))
        .to.emit(channelEscrow, "Deposited")
        .withArgs(channelId, await alice.getAddress(), depositAmount);

      expect(await channelEscrow.balance(channelId)).to.equal(depositAmount);
    });

    it("Should revert when depositing zero ETH", async function () {
      await expect(channelEscrow.deposit(channelId, { value: 0 }))
        .to.be.revertedWith("Must send ETH");
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

      const bobBalanceBefore = await ethers.provider.getBalance(bob.address);
      
      await expect(channelEscrow.connect(bob).withdraw(channelId))
        .to.emit(channelEscrow, "Withdrawn")
        .withArgs(channelId, await bob.getAddress(), depositAmount);

      expect(await channelEscrow.balance(channelId)).to.equal(0);
    });

    it("Should revert withdraw when channel not verified", async function () {
      await expect(channelEscrow.withdraw(channelId))
        .to.be.revertedWith("Channel not verified");
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
        .to.be.revertedWith("Only channel owner");
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
        .to.be.revertedWith("No balance");
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
        false
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
        false
      )).to.be.revertedWithCustomError(factory, "ArrayLengthMismatch");
    });

    it("Should revert when channel not verified or controlled", async function () {
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
        false
      )).to.be.revertedWithCustomError(factory, "ChannelNotVerifiedOrControlled")
        .withArgs(unverifiedChannel);
    });

    it("Should create third-party contract with ETH deposit", async function () {
      const depositAmount = ethers.parseEther("0.1");
      
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
        { value: depositAmount }
      );

      const receipt = await tx.wait();
      const creatorContractCreatedEvent = receipt.logs.find(
        (log) => log.fragment?.name === "CreatorContractCreated"
      );
      
      const contractAddress = creatorContractCreatedEvent.args.contractAddress;

      expect(await factory.isThirdPartyCreated(contractAddress)).to.be.true;
      expect(await channelEscrow.balance(channelId)).to.equal(depositAmount);
    });

    it("Should revert third-party creation with insufficient ETH", async function () {
      const insufficientAmount = ethers.parseEther("0.001");
      
      await expect(factory.connect(owner).createContract(
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
        false
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
        { value: ethers.parseEther("0.1") }
      )).to.be.revertedWithCustomError(factory, "ContentAlreadyRegisteredForContract")
        .withArgs(contentIds[0]);
    });

    it("Should set third party min purchase", async function () {
      const newMin = ethers.parseEther("0.05");
      await factory.setThirdPartyMinPurchase(newMin);
      
      expect(await factory.thirdPartyMinPurchase()).to.equal(newMin);
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
        false
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      createdContract = await ethers.getContractAt("CreatorAssuranceContract", event.args.contractAddress);
    });

    it("Should set content IDs", async function () {
      const newContentIds = [4001, 4002, 4003];
      
      await createdContract.setContentIds(newContentIds);

      const storedIds = await createdContract.getContentIds();
      expect(storedIds).to.deep.equal(newContentIds);
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
        .to.be.revertedWith("Only owner or self");
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
        false
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const contractAddress = event.args.contractAddress;

      const assuranceContract = await ethers.getContractAt("MultiERC1155AssuranceContract", contractAddress);
      
      expect(await contentRegistry.contentContract(contentIds[0])).to.equal(contractAddress);
      expect(await contentRegistry.isRegistered(contentIds[0])).to.be.true;
    });

    it("Should handle third-party contract with veto flow", async function () {
      await channelRegistry.verifyChannel(
        channelId,
        owner.address,
        ethers.id("nonce-1"),
        deadline,
        "0x"
      );

      await channelRegistry.connect(owner).takeChannelControl(channelId);

      const thirdPartyChannelId = ethers.id("third-party-channel");
      await channelRegistry.verifyChannel(
        thirdPartyChannelId,
        charlie.address,
        ethers.id("nonce-2"),
        deadline,
        "0x"
      );

      const depositAmount = ethers.parseEther("0.1");
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
        { value: depositAmount }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment?.name === "CreatorContractCreated");
      const thirdPartyContract = event.args.contractAddress;

      expect(await channelEscrow.balance(thirdPartyChannelId)).to.equal(depositAmount);
      expect(await factory.isThirdPartyCreated(thirdPartyContract)).to.be.true;
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
