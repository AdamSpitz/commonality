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