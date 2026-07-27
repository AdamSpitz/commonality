import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

/**
 * Security Regression Tests
 *
 * Covers items from the automation backlog (section 11.4):
 * - Negative access control tests
 * - Reentrancy / malicious-receiver tests
 * - Gas/griefing regression tests
 */

// ---------------------------------------------------------------------------
// Reentrancy attacker: a malicious ERC1155 receiver that tries to re-enter
// ---------------------------------------------------------------------------

async function deployMaliciousERC1155Receiver() {
  const MaliciousReceiver = await ethers.getContractFactory("MaliciousERC1155Receiver");
  return MaliciousReceiver.deploy();
}

// ---------------------------------------------------------------------------
// 1. Negative access control tests across key contracts
// ---------------------------------------------------------------------------

describe("Security Regression - Access Control", function () {
  let owner, alice, bob, recipient;

  beforeEach(async function () {
    [owner, alice, bob, recipient] = await ethers.getSigners();
  });

  describe("MultiERC1155AssuranceContract access control", function () {
    let paymentToken, erc1155Token, assuranceContract;
    let threshold, deadline;

    beforeEach(async function () {
      const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
      paymentToken = await PremintingERC20.deploy(owner.address, "PT", "PT", "ipfs://pt");
      await paymentToken.connect(owner).mint(alice.address, ethers.parseEther("1000"));

      const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
      erc1155Token = await PremintingERC1155.deploy(owner.address, "https://x/{id}.json", "ipfs://x");
      await erc1155Token.mintBatch(owner.address, [1], [100]);

      threshold = ethers.parseEther("10");
      const latestBlock = await ethers.provider.getBlock("latest");
      deadline = latestBlock.timestamp + 86400;

      const AssuranceContracts = await ethers.getContractFactory("MultiERC1155AssuranceContract");
      assuranceContract = await AssuranceContracts.deploy(
        owner.address, recipient.address,
        await paymentToken.getAddress(), await erc1155Token.getAddress(),
        "ipfs://meta"
      );

      const ValueThresholdCondition = await ethers.getContractFactory("ValueThresholdCondition");
      const condition = await ValueThresholdCondition.deploy(
        await assuranceContract.getAddress(), threshold, deadline
      );
      await assuranceContract.connect(owner).setCondition(await condition.getAddress());

      await erc1155Token.setReceiptTransferBridge(await assuranceContract.getAddress(), true);
      await erc1155Token.safeTransferFrom(owner.address, await assuranceContract.getAddress(), 1, 100, "0x");
    });

    it("rejects setCondition by non-owner", async function () {
      const ValueThresholdCondition = await ethers.getContractFactory("ValueThresholdCondition");
      const c = await ValueThresholdCondition.deploy(
        await assuranceContract.getAddress(), threshold, deadline
      );
      await expect(
        assuranceContract.connect(alice).setCondition(await c.getAddress())
      ).to.be.revertedWithCustomError(assuranceContract, "OwnableUnauthorizedAccount");
    });

    it("rejects setPricesERC1155 by non-owner", async function () {
      await expect(
        assuranceContract.connect(alice).setPricesERC1155([1], [ethers.parseEther("1")])
      ).to.be.revertedWithCustomError(assuranceContract, "OwnableUnauthorizedAccount");
    });

    it("rejects withdrawal by non-recipient (even if condition met)", async function () {
      await assuranceContract.connect(owner).setPricesERC1155([1], [ethers.parseEther("1")]);
      await paymentToken.connect(alice).approve(await assuranceContract.getAddress(), ethers.parseEther("10"));
      await assuranceContract.connect(alice).buyERC1155(alice.address, await erc1155Token.getAddress(), [1], [10], "0x");

      // Alice is not the recipient
      await expect(
        assuranceContract.connect(alice).withdraw()
      ).to.be.revertedWithCustomError(assuranceContract, "OnlyRecipientCanWithdraw");

      // Bob is not the recipient either
      await expect(
        assuranceContract.connect(bob).withdraw()
      ).to.be.revertedWithCustomError(assuranceContract, "OnlyRecipientCanWithdraw");
    });

    it("owner cannot withdraw either — only recipient", async function () {
      await assuranceContract.connect(owner).setPricesERC1155([1], [ethers.parseEther("1")]);
      await paymentToken.connect(alice).approve(await assuranceContract.getAddress(), ethers.parseEther("10"));
      await assuranceContract.connect(alice).buyERC1155(alice.address, await erc1155Token.getAddress(), [1], [10], "0x");

      await expect(
        assuranceContract.connect(owner).withdraw()
      ).to.be.revertedWithCustomError(assuranceContract, "OnlyRecipientCanWithdraw");
    });

    it("rejects withdraw when condition not met", async function () {
      await assuranceContract.connect(owner).setPricesERC1155([1], [ethers.parseEther("1")]);
      await paymentToken.connect(alice).approve(await assuranceContract.getAddress(), ethers.parseEther("5"));
      await assuranceContract.connect(alice).buyERC1155(alice.address, await erc1155Token.getAddress(), [1], [5], "0x");

      await expect(
        assuranceContract.connect(recipient).withdraw()
      ).to.be.revertedWithCustomError(assuranceContract, "ConditionNotMet");
    });

    it("rejects setCondition when already set", async function () {
      const ValueThresholdCondition = await ethers.getContractFactory("ValueThresholdCondition");
      const c = await ValueThresholdCondition.deploy(
        await assuranceContract.getAddress(), threshold, deadline
      );
      await expect(
        assuranceContract.connect(owner).setCondition(await c.getAddress())
      ).to.be.revertedWithCustomError(assuranceContract, "ConditionAlreadySet");
    });

    it("rejects refund before contract has failed (before deadline, threshold not met)", async function () {
      await assuranceContract.connect(owner).setPricesERC1155([1], [ethers.parseEther("1")]);
      await paymentToken.connect(alice).approve(await assuranceContract.getAddress(), ethers.parseEther("1"));
      await assuranceContract.connect(alice).buyERC1155(alice.address, await erc1155Token.getAddress(), [1], [1], "0x");

      await erc1155Token.connect(alice).setApprovalForAll(await assuranceContract.getAddress(), true);
      await expect(
        assuranceContract.connect(alice).refundERC1155(alice.address, await erc1155Token.getAddress(), [1], [1], "0x")
      ).to.be.revertedWithCustomError(assuranceContract, "ConditionNotFailed");
    });

    it("rejects refund after deadline if threshold was met", async function () {
      await assuranceContract.connect(owner).setPricesERC1155([1], [ethers.parseEther("1")]);
      await paymentToken.connect(alice).approve(await assuranceContract.getAddress(), ethers.parseEther("10"));
      await assuranceContract.connect(alice).buyERC1155(alice.address, await erc1155Token.getAddress(), [1], [10], "0x");

      await hre.network.provider.send("evm_increaseTime", [86400]);
      await hre.network.provider.send("evm_mine");

      await erc1155Token.connect(alice).setApprovalForAll(await assuranceContract.getAddress(), true);
      await expect(
        assuranceContract.connect(alice).refundERC1155(alice.address, await erc1155Token.getAddress(), [1], [1], "0x")
      ).to.be.revertedWithCustomError(assuranceContract, "ConditionNotFailed");
    });

    it("rejects buy after contract has failed (past deadline, below threshold)", async function () {
      await assuranceContract.connect(owner).setPricesERC1155([1], [ethers.parseEther("1")]);
      await hre.network.provider.send("evm_increaseTime", [86400]);
      await hre.network.provider.send("evm_mine");
      await paymentToken.connect(alice).approve(await assuranceContract.getAddress(), ethers.parseEther("1"));
      await expect(
        assuranceContract.connect(alice).buyERC1155(alice.address, await erc1155Token.getAddress(), [1], [1], "0x")
      ).to.be.revertedWithCustomError(assuranceContract, "ConditionHasFailed");
    });

    it("rejects refund with a zero-address holder", async function () {
      await hre.network.provider.send("evm_increaseTime", [86400]);
      await hre.network.provider.send("evm_mine");
      await expect(
        assuranceContract.connect(alice).refundERC1155(
          ethers.ZeroAddress, await erc1155Token.getAddress(), [1], [1], "0x"
        )
      ).to.be.revertedWithCustomError(assuranceContract, "ZeroAddress");
    });
  });

  describe("DelegatableNotes access control", function () {
    let notes, assuranceFactory;
    let alice, bob, charlie;

    beforeEach(async function () {
      [alice, bob, charlie] = await ethers.getSigners();
      const AssuranceContractFactory = await ethers.getContractFactory("AssuranceContractFactory");
      assuranceFactory = await AssuranceContractFactory.deploy();

      const DelegatableNotes = await ethers.getContractFactory("DelegatableNotes");
      notes = await DelegatableNotes.deploy(
        await assuranceFactory.getAddress()
      );
    });

    it("rejects setPrimaryMarketFactoryAuthorization by non-owner", async function () {
      // alice is the first signer (account[0]) which is the contract owner
      // bob tries but is not the owner
      await expect(
        notes.connect(bob).setPrimaryMarketFactoryAuthorization(alice.address, true)
      ).to.be.revertedWithCustomError(notes, "OwnableUnauthorizedAccount");
    });

    it("rejects delegation by non-owner of a note", async function () {
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: ethers.parseEther("1") });
      // bob tries to delegate a note owned by alice — chain doesn't match
      await expect(
        notes.connect(bob).delegate(1, [bob.address], bob.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(notes, "InvalidChain");
    });

    it("rejects revoke from non-chain participant", async function () {
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: ethers.parseEther("1") });
      // After full delegation, note 1 now has chain [bob, alice]
      await notes.connect(alice).delegate(1, [alice.address], bob.address, ethers.parseEther("1"));
      // Charlie is not in the chain. Chain [charlie, bob, alice] doesn't match note 1's hash
      await expect(
        notes.connect(charlie).revoke(1, [charlie.address, bob.address, alice.address])
      ).to.be.revertedWithCustomError(notes, "InvalidChain");
    });

    it("rejects reclaimFunds by non-root-owner", async function () {
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: ethers.parseEther("1") });
      // Bob is not the root owner
      await expect(
        notes.connect(bob).reclaimFunds(1)
      ).to.be.revertedWithCustomError(notes, "NotRootNoteOrNotOwner");
    });

    it("rejects reclaimFunds on delegated note (has children)", async function () {
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: ethers.parseEther("1") });
      await notes.connect(alice).delegate(1, [alice.address], bob.address, ethers.parseEther("1"));
      // Alice is root owner but note 1 was updated by delegation
      await expect(
        notes.connect(alice).reclaimFunds(1)
      ).to.be.revertedWithCustomError(notes, "NotRootNoteOrNotOwner");
    });

    it("rejects delegation to zero address", async function () {
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: ethers.parseEther("1") });
      await expect(
        notes.connect(alice).delegate(1, [alice.address], ethers.ZeroAddress, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(notes, "CannotDelegateToZeroAddress");
    });

    it("rejects delegation with empty chain", async function () {
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: ethers.parseEther("1") });
      await expect(
        notes.connect(alice).delegate(1, [], alice.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(notes, "EmptyChain");
    });

    it("rejects ETH sent with non-ERC20 token type", async function () {
      // token != address(0) + msg.value > 0 → the function treats it as invalid deposit
      // Specific error depends on token type check order
      await expect(
        notes.connect(alice).deposit(
          alice.address /* non-zero, not a real token */, 1 /* ERC20 */, 0, ethers.parseEther("1"),
          { value: ethers.parseEther("1") }
        )
      ).to.be.reverted;
    });

    it("rejects purchase with insufficient note balance", async function () {
      // First authorize a primary market, then try to buy with insufficient funds
      const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
      const pToken = await PremintingERC20.deploy(owner.address, "PT", "PT", "ipfs://pt");
      await pToken.connect(owner).mint(alice.address, ethers.parseEther("100"));

      const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
      const eToken = await PremintingERC1155.deploy(owner.address, "https://x/{id}.json", "ipfs://x");
      await eToken.mintBatch(owner.address, [1], [100]);

      // Create an authorized primary market through the factory
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;

      // Use the authorized assuranceFactory to create the market
      const tx = await assuranceFactory.createAssuranceContract(
        owner.address, recipient.address,
        await pToken.getAddress(), await eToken.getAddress(),
        "ipfs://meta"
      );
      const receipt = await tx.wait();
      const created = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "LazyGivingAssuranceContractCreated"
      );
      const AssuranceContracts = await ethers.getContractFactory("MultiERC1155AssuranceContract");
      const market = AssuranceContracts.attach(created.args[0]);

      const ValueThresholdCondition = await ethers.getContractFactory("ValueThresholdCondition");
      const c = await ValueThresholdCondition.deploy(await market.getAddress(), ethers.parseEther("10"), deadline);
      await market.connect(owner).setCondition(await c.getAddress());
      await eToken.safeTransferFrom(owner.address, await market.getAddress(), 1, 100, "0x");
      await market.connect(owner).setPricesERC1155([1], [ethers.parseEther("0.1")]);

      // Try to buy with insufficient note balance
      await pToken.connect(alice).approve(await notes.getAddress(), ethers.parseEther("0.05"));
      await notes.connect(alice).deposit(await pToken.getAddress(), 0, 0, ethers.parseEther("0.05"));

      await expect(
        notes.connect(alice).purchaseFromPrimaryMarket(
          [{ noteId: 1, chain: [alice.address], shares: 1 }],
          await market.getAddress(),
          await eToken.getAddress(),
          1, 1
        )
      ).to.be.revertedWithCustomError(notes, "InsufficientBalance");
    });

    it("rejects purchase from unauthorized market", async function () {
      const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
      const pToken = await PremintingERC20.deploy(owner.address, "PT", "PT", "ipfs://pt");
      await pToken.connect(owner).mint(alice.address, ethers.parseEther("100"));

      const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
      const eToken = await PremintingERC1155.deploy(owner.address, "https://x/{id}.json", "ipfs://x");

      await pToken.connect(alice).approve(await notes.getAddress(), ethers.parseEther("1"));
      await notes.connect(alice).deposit(await pToken.getAddress(), 0, 0, ethers.parseEther("1"));

      // A random address is not an authorized market
      await expect(
        notes.connect(alice).purchaseFromPrimaryMarket(
          [{ noteId: 1, chain: [alice.address], shares: 1 }],
          alice.address, // not a market
          await eToken.getAddress(),
          1, 1
        )
      ).to.be.revertedWithCustomError(notes, "UnauthorizedMarket");
    });
  });

  describe("CancellableCondition access control", function () {
    let assuranceContract, baseCondition, wrappedCondition;
    let paymentToken, erc1155Token;

    beforeEach(async function () {
      const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
      paymentToken = await PremintingERC20.deploy(owner.address, "PT", "PT", "ipfs://pt");
      await paymentToken.connect(owner).mint(alice.address, ethers.parseEther("1000"));

      const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
      erc1155Token = await PremintingERC1155.deploy(owner.address, "https://x/{id}.json", "ipfs://x");
      await erc1155Token.mintBatch(owner.address, [1], [100]);

      const threshold = ethers.parseEther("10");
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;

      const AssuranceContracts = await ethers.getContractFactory("MultiERC1155AssuranceContract");
      assuranceContract = await AssuranceContracts.deploy(
        owner.address, recipient.address,
        await paymentToken.getAddress(), await erc1155Token.getAddress(),
        "ipfs://meta"
      );

      const ValueThresholdCondition = await ethers.getContractFactory("ValueThresholdCondition");
      baseCondition = await ValueThresholdCondition.deploy(
        await assuranceContract.getAddress(), threshold, deadline
      );

      const MockThirdPartySuccessGate = await ethers.getContractFactory("MockThirdPartySuccessGate");
      const successGate = await MockThirdPartySuccessGate.deploy();
      await successGate.setCanSucceed(true);

      const CancellableCondition = await ethers.getContractFactory("CancellableCondition");
      wrappedCondition = await CancellableCondition.deploy(
        await baseCondition.getAddress(),
        bob.address, // bob is canceller
        await successGate.getAddress(),
        ethers.id("test-channel")
      );

      await assuranceContract.connect(owner).setCondition(await wrappedCondition.getAddress());
      await erc1155Token.setReceiptTransferBridge(await assuranceContract.getAddress(), true);
      await erc1155Token.safeTransferFrom(owner.address, await assuranceContract.getAddress(), 1, 100, "0x");
    });

    it("rejects cancel by non-canceller", async function () {
      await expect(
        wrappedCondition.connect(alice).cancel()
      ).to.be.revertedWithCustomError(wrappedCondition, "OnlyCancellerCanCancel");
    });

    it("allows cancel by the designated canceller", async function () {
      await expect(wrappedCondition.connect(bob).cancel())
        .to.emit(wrappedCondition, "ConditionCancelled");
    });

    it("rejects cancel after condition has already succeeded", async function () {
      await assuranceContract.connect(owner).setPricesERC1155([1], [ethers.parseEther("1")]);
      await paymentToken.connect(alice).approve(await assuranceContract.getAddress(), ethers.parseEther("10"));
      await assuranceContract.connect(alice).buyERC1155(alice.address, await erc1155Token.getAddress(), [1], [10], "0x");

      await expect(
        wrappedCondition.connect(bob).cancel()
      ).to.be.revertedWithCustomError(wrappedCondition, "ConditionAlreadySucceeded");
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Reentrancy / malicious receiver tests
// ---------------------------------------------------------------------------

describe("Security Regression - Reentrancy Protection", function () {
  let owner, alice, bob, recipient;

  beforeEach(async function () {
    [owner, alice, bob, recipient] = await ethers.getSigners();
  });

  describe("ERC1155PrimaryMarket reentrancy via malicious receiver", function () {
    let paymentToken, erc1155Token, maliciousReceiver, assuranceContract;
    let threshold, deadline;

    beforeEach(async function () {
      const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
      paymentToken = await PremintingERC20.deploy(owner.address, "PT", "PT", "ipfs://pt");
      await paymentToken.connect(owner).mint(alice.address, ethers.parseEther("1000"));
      await paymentToken.connect(owner).mint(bob.address, ethers.parseEther("1000"));

      const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
      erc1155Token = await PremintingERC1155.deploy(owner.address, "https://x/{id}.json", "ipfs://x");
      await erc1155Token.mintBatch(owner.address, [1, 2], [100, 100]);

      maliciousReceiver = await deployMaliciousERC1155Receiver();
      // Give the malicious receiver some payment token for attack scenarios
      await paymentToken.connect(owner).mint(await maliciousReceiver.getAddress(), ethers.parseEther("100"));

      threshold = ethers.parseEther("10");
      const latestBlock = await ethers.provider.getBlock("latest");
      deadline = latestBlock.timestamp + 86400;

      const AssuranceContracts = await ethers.getContractFactory("MultiERC1155AssuranceContract");
      assuranceContract = await AssuranceContracts.deploy(
        owner.address, recipient.address,
        await paymentToken.getAddress(), await erc1155Token.getAddress(),
        "ipfs://meta"
      );

      const ValueThresholdCondition = await ethers.getContractFactory("ValueThresholdCondition");
      const condition = await ValueThresholdCondition.deploy(
        await assuranceContract.getAddress(), threshold, deadline
      );
      await assuranceContract.connect(owner).setCondition(await condition.getAddress());
      await erc1155Token.setReceiptTransferBridge(await assuranceContract.getAddress(), true);
      await erc1155Token.safeBatchTransferFrom(owner.address, await assuranceContract.getAddress(), [1, 2], [100, 100], "0x");
      await assuranceContract.connect(owner).setPricesERC1155([1, 2], [ethers.parseEther("0.1"), ethers.parseEther("0.2")]);
    });

    it("buyERC1155 to a malicious receiver rejects a reentrant buy", async function () {
      const primaryMarketAddress = await assuranceContract.getAddress();
      const receiverAddress = await maliciousReceiver.getAddress();
      const attackPrice = ethers.parseEther("0.2");
      const buyToken2Calldata = assuranceContract.interface.encodeFunctionData("buyERC1155", [
        receiverAddress,
        await erc1155Token.getAddress(),
        [2],
        [1],
        "0x",
      ]);

      await maliciousReceiver.approveERC20For(
        await paymentToken.getAddress(),
        primaryMarketAddress,
        attackPrice
      );
      await maliciousReceiver.configureAttack(primaryMarketAddress, buyToken2Calldata);

      await paymentToken.connect(alice).approve(primaryMarketAddress, ethers.parseEther("0.1"));
      await assuranceContract.connect(alice).buyERC1155(
        receiverAddress,
        await erc1155Token.getAddress(),
        [1], [1], "0x"
      );

      expect(await maliciousReceiver.attackAttempted()).to.equal(true);
      expect(await maliciousReceiver.attackSucceeded()).to.equal(false);
      expect(await erc1155Token.balanceOf(receiverAddress, 1)).to.equal(1);
      expect(await erc1155Token.balanceOf(receiverAddress, 2)).to.equal(0);
    });

    it("buyERC1155 with batch to a malicious receiver rejects a reentrant buy", async function () {
      const primaryMarketAddress = await assuranceContract.getAddress();
      const receiverAddress = await maliciousReceiver.getAddress();
      const attackPrice = ethers.parseEther("0.2");
      const buyToken2Calldata = assuranceContract.interface.encodeFunctionData("buyERC1155", [
        receiverAddress,
        await erc1155Token.getAddress(),
        [2],
        [1],
        "0x",
      ]);

      await maliciousReceiver.approveERC20For(
        await paymentToken.getAddress(),
        primaryMarketAddress,
        attackPrice
      );
      await maliciousReceiver.configureAttack(primaryMarketAddress, buyToken2Calldata);

      await paymentToken.connect(alice).approve(primaryMarketAddress, ethers.parseEther("0.3"));
      await assuranceContract.connect(alice).buyERC1155(
        receiverAddress,
        await erc1155Token.getAddress(),
        [1, 2], [1, 1], "0x"
      );

      expect(await maliciousReceiver.attackAttempted()).to.equal(true);
      expect(await maliciousReceiver.attackSucceeded()).to.equal(false);
      expect(await erc1155Token.balanceOf(receiverAddress, 1)).to.equal(1);
      expect(await erc1155Token.balanceOf(receiverAddress, 2)).to.equal(1);
    });
  });

  // -------------------------------------------------------------------------
  // Cross-function reentrancy from the donateNormallyERC1155 mint callback.
  //
  // donateNormallyERC1155 used to record the buyer's contribution basis and
  // then forgo it back, so the ERC1155 mint callback fired while the basis was
  // temporarily inflated. A contract buyer re-entering withdrawReimbursement at
  // that moment computed its claim as (c+v)*R/(T+v) instead of c*R/T, which is
  // strictly larger whenever it is not the sole contributor -- a pro-rata skim
  // off every other contributor.
  //
  // Two independent things now prevent that, and these tests pin both:
  //   1. donateNormallyERC1155 never records the basis at all, so there is no
  //      inflated window for the callback to observe ("never inflates the
  //      contribution basis" below).
  //   2. The reimbursement entrypoints carry nonReentrant, so the callback
  //      cannot mutate reimbursement state even if (1) regresses.
  // -------------------------------------------------------------------------
  describe("reimbursement cross-function reentrancy via donateNormallyERC1155", function () {
    let paymentToken, erc1155Token, maliciousReceiver, assuranceContract;
    let receiverAddress, assuranceAddress, erc1155Address;

    const PRICE_1 = ethers.parseEther("0.3");
    const PRICE_2 = ethers.parseEther("0.2");

    beforeEach(async function () {
      const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
      paymentToken = await PremintingERC20.deploy(owner.address, "PT", "PT", "ipfs://pt");
      await paymentToken.connect(owner).mint(alice.address, ethers.parseEther("1000"));
      await paymentToken.connect(owner).mint(bob.address, ethers.parseEther("1000"));

      const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
      erc1155Token = await PremintingERC1155.deploy(owner.address, "https://x/{id}.json", "ipfs://x");
      await erc1155Token.mintBatch(owner.address, [1, 2], [100, 100]);

      maliciousReceiver = await deployMaliciousERC1155Receiver();
      receiverAddress = await maliciousReceiver.getAddress();
      erc1155Address = await erc1155Token.getAddress();
      // Funded so that a re-entrant donateRetroactive fails on the guard rather
      // than on an insufficient balance.
      await paymentToken.connect(owner).mint(receiverAddress, ethers.parseEther("100"));

      // Threshold low enough that a few purchases succeed the contract, so the
      // retroactive-donation / reimbursement machinery is reachable.
      const latestBlock = await ethers.provider.getBlock("latest");
      const AssuranceContracts = await ethers.getContractFactory("MultiERC1155AssuranceContract");
      assuranceContract = await AssuranceContracts.deploy(
        owner.address, recipient.address,
        await paymentToken.getAddress(), erc1155Address,
        "ipfs://meta"
      );
      assuranceAddress = await assuranceContract.getAddress();

      const ValueThresholdCondition = await ethers.getContractFactory("ValueThresholdCondition");
      const condition = await ValueThresholdCondition.deploy(
        assuranceAddress, ethers.parseEther("0.5"), latestBlock.timestamp + 86400
      );
      await assuranceContract.connect(owner).setCondition(await condition.getAddress());
      await erc1155Token.setReceiptTransferBridge(assuranceAddress, true);
      await erc1155Token.safeBatchTransferFrom(
        owner.address, assuranceAddress, [1, 2], [100, 100], "0x"
      );
      await assuranceContract.connect(owner).setPricesERC1155([1, 2], [PRICE_1, PRICE_2]);

      // Three early contributions of 0.3 each: the malicious receiver, alice
      // and bob. T = 0.9, over the 0.5 threshold, so the contract has succeeded.
      await paymentToken.connect(alice).approve(assuranceAddress, PRICE_1 * 3n);
      await assuranceContract.connect(alice).buyERC1155(receiverAddress, erc1155Address, [1], [1], "0x");
      await assuranceContract.connect(alice).buyERC1155(alice.address, erc1155Address, [1], [1], "0x");
      await paymentToken.connect(bob).approve(assuranceAddress, PRICE_1 + ethers.parseEther("0.3"));
      await assuranceContract.connect(bob).buyERC1155(bob.address, erc1155Address, [1], [1], "0x");

      // Retroactive donation of 0.3, so R = 0.3 against T = 0.9: every
      // contributor's honest claim is a third of their contribution.
      await assuranceContract.connect(bob).donateRetroactive(ethers.parseEther("0.3"));
    });

    it("never inflates the contribution basis during the mint callback", async function () {
      const basisBefore = await assuranceContract.earlyContributions(receiverAddress);
      const totalBefore = await assuranceContract.totalEarlyContributions();
      expect(basisBefore).to.equal(PRICE_1);

      // Point the callback at a view function and read what it saw. If
      // donateNormallyERC1155 ever goes back to record-then-forgo, the callback
      // observes PRICE_1 + PRICE_2 here and this fails.
      await maliciousReceiver.configureAttack(
        assuranceAddress,
        assuranceContract.interface.encodeFunctionData("earlyContributions", [receiverAddress])
      );

      await paymentToken.connect(alice).approve(assuranceAddress, PRICE_2);
      await assuranceContract.connect(alice).donateNormallyERC1155(
        receiverAddress, erc1155Address, [2], [1], "0x"
      );

      expect(await maliciousReceiver.attackSucceeded()).to.equal(true);
      const [basisDuringCallback] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["uint256"], await maliciousReceiver.attackReturnData()
      );
      expect(basisDuringCallback).to.equal(basisBefore);
      expect(await assuranceContract.earlyContributions(receiverAddress)).to.equal(basisBefore);
      expect(await assuranceContract.totalEarlyContributions()).to.equal(totalBefore);
    });

    it("rejects a reentrant withdrawReimbursement from the mint callback", async function () {
      const honestClaim = await assuranceContract.reimbursableAmount(receiverAddress);
      expect(honestClaim).to.equal(ethers.parseEther("0.1")); // 0.3 * 0.3 / 0.9

      const balanceBefore = await paymentToken.balanceOf(receiverAddress);

      await maliciousReceiver.configureAttack(
        assuranceAddress,
        assuranceContract.interface.encodeFunctionData("withdrawReimbursement", [])
      );

      // Alice pays; the malicious receiver is the buyer, so the inflated basis
      // is the receiver's.
      await paymentToken.connect(alice).approve(assuranceAddress, PRICE_2);
      await assuranceContract.connect(alice).donateNormallyERC1155(
        receiverAddress, erc1155Address, [2], [1], "0x"
      );

      expect(await maliciousReceiver.attackAttempted()).to.equal(true);
      expect(await maliciousReceiver.attackSucceeded()).to.equal(false);

      // Nothing was withdrawn during the callback, and the honest claim is
      // untouched -- no pro-rata skim off the other contributors.
      expect(await assuranceContract.reimbursementsWithdrawn(receiverAddress)).to.equal(0);
      expect(await paymentToken.balanceOf(receiverAddress)).to.equal(balanceBefore);
      expect(await assuranceContract.reimbursableAmount(receiverAddress)).to.equal(honestClaim);

      // The donate-normally itself still worked: receipt minted, basis restored
      // to the pre-purchase 0.3 by the trailing forgo.
      expect(await erc1155Token.balanceOf(receiverAddress, 2)).to.equal(1);
      expect(await assuranceContract.earlyContributions(receiverAddress)).to.equal(PRICE_1);
    });

    it("rejects a reentrant forgoReimbursement from the mint callback", async function () {
      await maliciousReceiver.configureAttack(
        assuranceAddress,
        assuranceContract.interface.encodeFunctionData("forgoReimbursement", [PRICE_1])
      );

      await paymentToken.connect(alice).approve(assuranceAddress, PRICE_2);
      await assuranceContract.connect(alice).donateNormallyERC1155(
        receiverAddress, erc1155Address, [2], [1], "0x"
      );

      expect(await maliciousReceiver.attackAttempted()).to.equal(true);
      expect(await maliciousReceiver.attackSucceeded()).to.equal(false);
      expect(await assuranceContract.earlyContributions(receiverAddress)).to.equal(PRICE_1);
    });

    it("rejects a reentrant donateRetroactive from the mint callback", async function () {
      const retroBefore = await assuranceContract.totalRetroReceived();

      await maliciousReceiver.approveERC20For(
        await paymentToken.getAddress(), assuranceAddress, ethers.parseEther("0.1")
      );
      await maliciousReceiver.configureAttack(
        assuranceAddress,
        assuranceContract.interface.encodeFunctionData("donateRetroactive", [ethers.parseEther("0.1")])
      );

      await paymentToken.connect(alice).approve(assuranceAddress, PRICE_2);
      await assuranceContract.connect(alice).donateNormallyERC1155(
        receiverAddress, erc1155Address, [2], [1], "0x"
      );

      expect(await maliciousReceiver.attackAttempted()).to.equal(true);
      expect(await maliciousReceiver.attackSucceeded()).to.equal(false);
      expect(await assuranceContract.totalRetroReceived()).to.equal(retroBefore);
    });
  });
});

// ---------------------------------------------------------------------------
// 3. Gas / griefing regression tests
// ---------------------------------------------------------------------------

describe("Security Regression - Gas Griefing", function () {
  let owner, alice, recipient;

  beforeEach(async function () {
    [owner, alice, recipient] = await ethers.getSigners();
  });

  describe("setPricesERC1155 gas with large arrays", function () {
    let paymentToken, erc1155Token, assuranceContract;

    beforeEach(async function () {
      const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
      paymentToken = await PremintingERC20.deploy(owner.address, "PT", "PT", "ipfs://pt");

      const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
      erc1155Token = await PremintingERC1155.deploy(owner.address, "https://x/{id}.json", "ipfs://x");

      // Mint many token IDs
      const ids = Array.from({ length: 100 }, (_, i) => i + 1);
      const amounts = Array(100).fill(10);
      await erc1155Token.mintBatch(owner.address, ids, amounts);

      const threshold = ethers.parseEther("10");
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 86400;

      const AssuranceContracts = await ethers.getContractFactory("MultiERC1155AssuranceContract");
      assuranceContract = await AssuranceContracts.deploy(
        owner.address, recipient.address,
        await paymentToken.getAddress(), await erc1155Token.getAddress(),
        "ipfs://meta"
      );

      const ValueThresholdCondition = await ethers.getContractFactory("ValueThresholdCondition");
      const condition = await ValueThresholdCondition.deploy(
        await assuranceContract.getAddress(), threshold, deadline
      );
      await assuranceContract.connect(owner).setCondition(await condition.getAddress());

      await erc1155Token.safeBatchTransferFrom(
        owner.address, await assuranceContract.getAddress(),
        ids, amounts, "0x"
      );
    });

    it("sets prices for 50 token IDs in a single transaction", async function () {
      const ids = Array.from({ length: 50 }, (_, i) => i + 1);
      const prices = Array(50).fill(ethers.parseEther("0.1"));

      const tx = await assuranceContract.connect(owner).setPricesERC1155(ids, prices);
      const receipt = await tx.wait();

      // Should succeed without running out of gas
      expect(receipt.status).to.equal(1);
    });

    it("sets prices for 100 token IDs in a single transaction", async function () {
      const ids = Array.from({ length: 100 }, (_, i) => i + 1);
      const prices = Array(100).fill(ethers.parseEther("0.1"));

      const tx = await assuranceContract.connect(owner).setPricesERC1155(ids, prices);
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
    });
  });

  describe("DelegatableNotes - max delegation depth is bounded", function () {
    let notes, assuranceFactory;

    beforeEach(async function () {
      const AssuranceContractFactory = await ethers.getContractFactory("AssuranceContractFactory");
      assuranceFactory = await AssuranceContractFactory.deploy();

      const DelegatableNotes = await ethers.getContractFactory("DelegatableNotes");
      notes = await DelegatableNotes.deploy(
        await assuranceFactory.getAddress()
      );
    });

    it("MAX_DELEGATION_DEPTH is set to 200", async function () {
      expect(await notes.MAX_DELEGATION_DEPTH()).to.equal(200);
    });

    it("rejects delegation chain that exceeds MAX_DELEGATION_DEPTH", async function () {
      await notes.connect(alice).deposit(ethers.ZeroAddress, 0, 0, 0, { value: ethers.parseEther("1") });

      // Build a chain of 201 addresses (exceeds 200 limit)
      const chainLength = 201;
      // All addresses can be the same in the array (the contract only checks length)
      const tooLongChain = Array(chainLength).fill(alice.address);

      await expect(
        notes.connect(alice).delegate(1, tooLongChain, alice.address, ethers.parseEther("0.5"))
      ).to.be.revertedWithCustomError(notes, "ChainTooLong");
    });
  });

  describe("Attestations batch gas - Implications", function () {
    let implications;

    beforeEach(async function () {
      const Implications = await ethers.getContractFactory("Implications");
      implications = await Implications.deploy();
    });

    it("can attest 50 implications in a batch", async function () {
      const statementIds = Array.from({ length: 50 }, (_, i) => ethers.id(`statement-${i}`));
      const impliedStatementIds = Array.from({ length: 50 }, (_, i) => ethers.id(`implied-${i}`));
      const explanationCids = Array.from({ length: 50 }, (_, i) => ethers.id(`explanation-${i}`));

      const tx = await implications.connect(alice).attestImplicationsInBatch(
        statementIds, impliedStatementIds, explanationCids
      );
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
    });

    it("can attest 100 implications in a batch", async function () {
      const statementIds = Array.from({ length: 100 }, (_, i) => ethers.id(`statement-${i}`));
      const impliedStatementIds = Array.from({ length: 100 }, (_, i) => ethers.id(`implied-${i}`));
      const explanationCids = Array.from({ length: 100 }, (_, i) => ethers.id(`explanation-${i}`));

      const tx = await implications.connect(alice).attestImplicationsInBatch(
        statementIds, impliedStatementIds, explanationCids
      );
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
    });
  });

  describe("NoteIntent batch attest gas", function () {
    let noteIntent, notesContract;

    beforeEach(async function () {
      const DelegatableNotes = await ethers.getContractFactory("DelegatableNotes");
      const AssuranceContractFactory = await ethers.getContractFactory("AssuranceContractFactory");
      const af = await AssuranceContractFactory.deploy();
      notesContract = await DelegatableNotes.deploy(await af.getAddress());

      // Deposit notes to have valid noteIds
      for (let i = 0; i < 50; i++) {
        await notesContract.connect(alice).deposit(
          ethers.ZeroAddress, 0, 0, 0, { value: ethers.parseEther("0.01") }
        );
      }

      const NoteIntent = await ethers.getContractFactory("NoteIntent");
      noteIntent = await NoteIntent.deploy();
    });

    it("can attest 50 note intents in batch", async function () {
      const noteIds = Array.from({ length: 50 }, (_, i) => i + 1);
      const statementIds = Array.from({ length: 50 }, (_, i) => ethers.id(`statement-${i}`));

      const tx = await noteIntent.connect(alice).attestNoteIntentsInBatch(
        await notesContract.getAddress(),
        noteIds,
        statementIds
      );
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
    });
  });
});