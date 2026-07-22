import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("MultiERC1155AssuranceContract", function () {
  let assuranceContract;
  let erc1155Token;
  let paymentToken;
  let condition;
  let owner, recipient, alice, bob, charlie;
  let threshold, deadline;

  async function deployCondition(progressSource, thresh, dl) {
    const ValueThresholdCondition = await ethers.getContractFactory("ValueThresholdCondition");
    return ValueThresholdCondition.deploy(progressSource, thresh, dl);
  }

  async function deployCancellableCondition(progressSource, thresh, dl, canceller) {
    const baseCondition = await deployCondition(progressSource, thresh, dl);
    const MockThirdPartySuccessGate = await ethers.getContractFactory("MockThirdPartySuccessGate");
    const successGate = await MockThirdPartySuccessGate.deploy();
    await successGate.setCanSucceed(true);
    const CancellableCondition = await ethers.getContractFactory("CancellableCondition");
    const wrappedCondition = await CancellableCondition.deploy(
      await baseCondition.getAddress(),
      canceller,
      await successGate.getAddress(),
      ethers.id("cancellable-test-channel")
    );
    return { baseCondition, wrappedCondition };
  }

  beforeEach(async function () {
    [owner, recipient, alice, bob, charlie] = await ethers.getSigners();

    const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
    paymentToken = await PremintingERC20.deploy(
      owner.address,
      "Test Payment Token",
      "TPT",
      "ipfs://QmPaymentToken"
    );
    for (const signer of [owner, recipient, alice, bob, charlie]) {
      await paymentToken.connect(owner).mint(signer.address, ethers.parseEther("1000"));
    }

    // Deploy a simple ERC1155 token for testing
    const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
    erc1155Token = await PremintingERC1155.deploy(
      owner.address,
      "https://example.com/metadata/{id}.json",
      "ipfs://QmExample"
    );

    // Mint some tokens to the owner
    await erc1155Token.mintBatch(
      owner.address,
      [1, 2, 3],
      [100, 100, 100]
    );

    // Set up assurance contract parameters
    threshold = ethers.parseEther("10.0"); // 10 ETH threshold
    const latestBlock = await ethers.provider.getBlock("latest");
    deadline = latestBlock.timestamp + 86400; // 24 hours from now

    const AssuranceContracts = await ethers.getContractFactory(
      "MultiERC1155AssuranceContract"
    );
    assuranceContract = await AssuranceContracts.deploy(
      owner.address,
      recipient.address,
      await paymentToken.getAddress(),
      await erc1155Token.getAddress(),
      "ipfs://QmProjectMetadata"
    );

    // Deploy condition pointing at assurance contract
    condition = await deployCondition(
      await assuranceContract.getAddress(),
      threshold,
      deadline
    );

    // Set condition on assurance contract
    await assuranceContract.connect(owner).setCondition(await condition.getAddress());

    // Transfer tokens to the assurance contract
    await erc1155Token.setReceiptTransferBridge(await assuranceContract.getAddress(), true);
    await erc1155Token.safeBatchTransferFrom(
      owner.address,
      await assuranceContract.getAddress(),
      [1, 2, 3],
      [100, 100, 100],
      "0x"
    );
  });

  async function approveAndBuy(contract, signer, erc1155Addr, ids, counts, cost, buyer = signer.address) {
    await paymentToken.connect(signer).approve(await contract.getAddress(), cost);
    return contract.connect(signer).buyERC1155(buyer, erc1155Addr, ids, counts, "0x");
  }

  describe("Deployment", function () {
    it("Should emit AssuranceContractInitialized event when condition is set", async function () {
      const AssuranceContracts = await ethers.getContractFactory(
        "MultiERC1155AssuranceContract"
      );

      const contract = await AssuranceContracts.deploy(
        owner.address,
        recipient.address,
        await paymentToken.getAddress(),
        await erc1155Token.getAddress(),
        "ipfs://QmProjectMetadata"
      );

      const cond = await deployCondition(
        await contract.getAddress(),
        threshold,
        deadline
      );

      await expect(contract.connect(owner).setCondition(await cond.getAddress()))
        .to.emit(contract, "AssuranceContractInitialized")
        .withArgs(recipient.address, await cond.getAddress());
    });

    it("Should emit ContractMetadataUpdated event", async function () {
      const AssuranceContracts = await ethers.getContractFactory(
        "MultiERC1155AssuranceContract"
      );
      const metadataCid = "ipfs://QmProjectMetadata";

      const contract = await AssuranceContracts.deploy(
        owner.address,
        recipient.address,
        await paymentToken.getAddress(),
        await erc1155Token.getAddress(),
        metadataCid
      );

      await expect(contract.deploymentTransaction()).to.emit(
        contract,
        "ContractMetadataUpdated"
      );
    });
  });

  describe("Condition Setting", function () {
    it("Should reject setting condition twice", async function () {
      const cond = await deployCondition(
        await assuranceContract.getAddress(),
        threshold,
        deadline
      );

      await expect(
        assuranceContract.connect(owner).setCondition(await cond.getAddress())
      ).to.be.revertedWithCustomError(assuranceContract, "ConditionAlreadySet");
    });

    it("Should reject non-owner setting condition", async function () {
      const AssuranceContracts = await ethers.getContractFactory(
        "MultiERC1155AssuranceContract"
      );
      const contract = await AssuranceContracts.deploy(
        owner.address,
        recipient.address,
        await paymentToken.getAddress(),
        await erc1155Token.getAddress(),
        "ipfs://QmProjectMetadata"
      );

      const cond = await deployCondition(
        await contract.getAddress(),
        threshold,
        deadline
      );

      await expect(
        contract.connect(alice).setCondition(await cond.getAddress())
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });
  });

  describe("Price Setting", function () {
    it("Should allow owner to set prices", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const ids = [1, 2, 3];
      const prices = [
        ethers.parseEther("1.0"),
        ethers.parseEther("2.0"),
        ethers.parseEther("3.0"),
      ];

      await expect(
        assuranceContract.connect(owner).setPricesERC1155( ids, prices)
      )
        .to.emit(assuranceContract, "ERC1155Offered")
        .withArgs(tokenAddr, ids[0], prices[0]);
    });

    it("Should reject non-owner setting prices", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const ids = [1];
      const prices = [ethers.parseEther("1.0")];

      await expect(
        assuranceContract.connect(alice).setPricesERC1155( ids, prices)
      ).to.be.revertedWithCustomError(assuranceContract, "OwnableUnauthorizedAccount");
    });

    it("Should reject mismatched array lengths", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const ids = [1, 2];
      const prices = [ethers.parseEther("1.0")];

      await expect(
        assuranceContract.connect(owner).setPricesERC1155( ids, prices)
      ).to.be.revertedWithCustomError(assuranceContract, "ArrayLengthMismatch");
    });

    it("Should reject setting same price again (not idempotent)", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const ids = [1];
      const price = ethers.parseEther("1.0");

      await assuranceContract
        .connect(owner)
        .setPricesERC1155( ids, [price]);

      await expect(
        assuranceContract
          .connect(owner)
          .setPricesERC1155( ids, [price])
      ).to.be.revertedWithCustomError(assuranceContract, "PriceAlreadySet");
    });

    it("Should reject changing existing price", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const ids = [1];
      const price1 = ethers.parseEther("1.0");
      const price2 = ethers.parseEther("2.0");

      await assuranceContract
        .connect(owner)
        .setPricesERC1155( ids, [price1]);

      await expect(
        assuranceContract
          .connect(owner)
          .setPricesERC1155( ids, [price2])
      ).to.be.revertedWithCustomError(assuranceContract, "PriceAlreadySet");
    });
  });

  describe("Buying Tokens", function () {
    beforeEach(async function () {
      const tokenAddr = await erc1155Token.getAddress();
      await assuranceContract
        .connect(owner)
        .setPricesERC1155(
          [1, 2, 3],
          [
            ethers.parseEther("1.0"),
            ethers.parseEther("2.0"),
            ethers.parseEther("3.0"),
          ]
        );
    });

    it("Should allow buying tokens", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const cost = ethers.parseEther("1.0");

      await approveAndBuy(assuranceContract, alice, tokenAddr, [1], [1], cost);

      expect(await erc1155Token.balanceOf(alice.address, 1)).to.equal(1);
    });

    it("Should emit ERC1155Bought event", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const cost = ethers.parseEther("1.0");

      await expect(
        approveAndBuy(assuranceContract, alice, tokenAddr, [1], [1], cost)
      )
        .to.emit(assuranceContract, "ERC1155Bought")
        .withArgs(alice.address, tokenAddr, cost, [1], [1]);
    });

    it("Should track total received value", async function () {
      const tokenAddr = await erc1155Token.getAddress();

      await approveAndBuy(
        assuranceContract,
        alice,
        tokenAddr,
        [1],
        [2],
        ethers.parseEther("2.0")
      );

      await approveAndBuy(
        assuranceContract,
        bob,
        tokenAddr,
        [2],
        [1],
        ethers.parseEther("2.0")
      );

      const progress = await assuranceContract.getAssuranceContractProgress();
      expect(progress).to.equal(ethers.parseEther("4.0"));
    });

    it("Should reject incorrect ETH amount", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const incorrectAmount = ethers.parseEther("0.5");

      await expect(
        approveAndBuy(assuranceContract, alice, tokenAddr, [1], [1], incorrectAmount)
      ).to.be.reverted;
    });

    it("Should handle buying multiple token types", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const cost = ethers.parseEther("6.0"); // 1 + 2 + 3

      await approveAndBuy(assuranceContract, alice, tokenAddr, [1, 2, 3], [1, 1, 1], cost);

      expect(await erc1155Token.balanceOf(alice.address, 1)).to.equal(1);
      expect(await erc1155Token.balanceOf(alice.address, 2)).to.equal(1);
      expect(await erc1155Token.balanceOf(alice.address, 3)).to.equal(1);
    });

    it("Should handle buying multiple quantities", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const cost = ethers.parseEther("3.0"); // 1 * 3

      await approveAndBuy(assuranceContract, alice, tokenAddr, [1], [3], cost);

      expect(await erc1155Token.balanceOf(alice.address, 1)).to.equal(3);
    });

    it("Should reject buying a token ID whose price has not been set", async function () {
      const tokenAddr = await erc1155Token.getAddress();

      await expect(
        approveAndBuy(
          assuranceContract,
          alice,
          tokenAddr,
          [99],
          [1],
          ethers.parseEther("1.0")
        )
      ).to.be.revertedWithCustomError(assuranceContract, "PriceNotSet");
    });

    it("Should reject buying from an unsupported ERC1155 collection", async function () {
      const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
      const otherToken = await PremintingERC1155.deploy(
        owner.address,
        "https://example.com/other/{id}.json",
        "ipfs://QmOtherToken"
      );
      await otherToken.mintBatch(alice.address, [1], [1]);

      await expect(
        approveAndBuy(
          assuranceContract,
          alice,
          await otherToken.getAddress(),
          [1],
          [1],
          ethers.parseEther("1.0")
        )
      ).to.be.revertedWithCustomError(assuranceContract, "UnsupportedERC1155");
    });
  });

  describe("Refunds (Selling)", function () {
    beforeEach(async function () {
      const tokenAddr = await erc1155Token.getAddress();
      await assuranceContract
        .connect(owner)
        .setPricesERC1155(
          [1, 2, 3],
          [
            ethers.parseEther("1.0"),
            ethers.parseEther("2.0"),
            ethers.parseEther("3.0"),
          ]
        );
    });

    it("Should allow refund after deadline when threshold not met", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const cost = ethers.parseEther("1.0");

      // Buy tokens
      await approveAndBuy(assuranceContract, alice, tokenAddr, [1], [1], cost);

      // Fast forward past deadline
      await hre.network.provider.send("evm_increaseTime", [86400]);
      await hre.network.provider.send("evm_mine");

      // Approve contract to take tokens back
      await erc1155Token
        .connect(alice)
        .setApprovalForAll(await assuranceContract.getAddress(), true);

      const balanceBefore = await paymentToken.balanceOf(alice.address);

      // Sell back
      const tx = await assuranceContract
        .connect(alice)
        .refundERC1155(alice.address, tokenAddr, [1], [1], "0x");
      await tx.wait();
      const balanceAfter = await paymentToken.balanceOf(alice.address);

      expect(await erc1155Token.balanceOf(alice.address, 1)).to.equal(0);
      expect(balanceAfter - balanceBefore).to.equal(cost);
    });

    it("Should emit ERC1155Sold event", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const cost = ethers.parseEther("1.0");

      await approveAndBuy(assuranceContract, alice, tokenAddr, [1], [1], cost);

      await hre.network.provider.send("evm_increaseTime", [86400]);
      await hre.network.provider.send("evm_mine");

      await erc1155Token
        .connect(alice)
        .setApprovalForAll(await assuranceContract.getAddress(), true);

      await expect(
        assuranceContract
          .connect(alice)
          .refundERC1155(alice.address, tokenAddr, [1], [1], "0x")
      )
        .to.emit(assuranceContract, "ERC1155Sold")
        .withArgs(alice.address, tokenAddr, cost, [1], [1]);
    });

    it("Should reject refund before deadline", async function () {
      const tokenAddr = await erc1155Token.getAddress();

      await approveAndBuy(
        assuranceContract,
        alice,
        tokenAddr,
        [1],
        [1],
        ethers.parseEther("1.0")
      );

      await erc1155Token
        .connect(alice)
        .setApprovalForAll(await assuranceContract.getAddress(), true);

      await expect(
        assuranceContract
          .connect(alice)
          .refundERC1155(alice.address, tokenAddr, [1], [1], "0x")
      ).to.be.revertedWithCustomError(assuranceContract, "ConditionNotFailed");
    });

    it("Should reject refund if threshold met", async function () {
      const tokenAddr = await erc1155Token.getAddress();

      // Buy enough to meet threshold (10 ETH)
      await approveAndBuy(
        assuranceContract,
        alice,
        tokenAddr,
        [1],
        [10],
        ethers.parseEther("10.0")
      );

      await hre.network.provider.send("evm_increaseTime", [86400]);
      await hre.network.provider.send("evm_mine");

      await erc1155Token
        .connect(alice)
        .setApprovalForAll(await assuranceContract.getAddress(), true);

      await expect(
        assuranceContract
          .connect(alice)
          .refundERC1155(alice.address, tokenAddr, [1], [1], "0x")
      ).to.be.revertedWithCustomError(assuranceContract, "ConditionNotFailed");
    });

    it("Should decrease total received value on refund", async function () {
      const tokenAddr = await erc1155Token.getAddress();

      await approveAndBuy(
        assuranceContract,
        alice,
        tokenAddr,
        [1],
        [2],
        ethers.parseEther("2.0")
      );

      expect(await assuranceContract.getAssuranceContractProgress()).to.equal(
        ethers.parseEther("2.0")
      );

      await hre.network.provider.send("evm_increaseTime", [86400]);
      await hre.network.provider.send("evm_mine");

      await erc1155Token
        .connect(alice)
        .setApprovalForAll(await assuranceContract.getAddress(), true);

      await assuranceContract
        .connect(alice)
        .refundERC1155(alice.address, tokenAddr, [1], [1], "0x");

      expect(await assuranceContract.getAssuranceContractProgress()).to.equal(
        ethers.parseEther("1.0")
      );
    });

    it("Should preserve ERC20/progress accounting across staggered buys and partial refunds", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const contractAddress = await assuranceContract.getAddress();

      await approveAndBuy(assuranceContract, alice, tokenAddr, [1], [2], ethers.parseEther("2.0"));
      await approveAndBuy(assuranceContract, bob, tokenAddr, [2], [1], ethers.parseEther("2.0"));
      await approveAndBuy(assuranceContract, charlie, tokenAddr, [3], [1], ethers.parseEther("3.0"));

      expect(await assuranceContract.getAssuranceContractProgress()).to.equal(ethers.parseEther("7.0"));
      expect(await paymentToken.balanceOf(contractAddress)).to.equal(ethers.parseEther("7.0"));

      await hre.network.provider.send("evm_increaseTime", [86400]);
      await hre.network.provider.send("evm_mine");

      await erc1155Token.connect(alice).setApprovalForAll(contractAddress, true);
      await erc1155Token.connect(bob).setApprovalForAll(contractAddress, true);

      const aliceBalanceBefore = await paymentToken.balanceOf(alice.address);
      const bobBalanceBefore = await paymentToken.balanceOf(bob.address);

      await assuranceContract.connect(bob).refundERC1155(bob.address, tokenAddr, [2], [1], "0x");
      expect(await paymentToken.balanceOf(bob.address) - bobBalanceBefore).to.equal(ethers.parseEther("2.0"));
      expect(await erc1155Token.balanceOf(bob.address, 2)).to.equal(0);
      expect(await assuranceContract.getAssuranceContractProgress()).to.equal(ethers.parseEther("5.0"));
      expect(await paymentToken.balanceOf(contractAddress)).to.equal(ethers.parseEther("5.0"));

      await assuranceContract.connect(alice).refundERC1155(alice.address, tokenAddr, [1], [1], "0x");
      expect(await paymentToken.balanceOf(alice.address) - aliceBalanceBefore).to.equal(ethers.parseEther("1.0"));
      expect(await erc1155Token.balanceOf(alice.address, 1)).to.equal(1);
      expect(await assuranceContract.getAssuranceContractProgress()).to.equal(ethers.parseEther("4.0"));
      expect(await paymentToken.balanceOf(contractAddress)).to.equal(ethers.parseEther("4.0"));
    });
  });

  describe("Retroactive reimbursement", function () {
    it("accepts capped retroactive donations and lets early contributors withdraw pro rata", async function () {
      await assuranceContract.connect(owner).setPricesERC1155([1], [ethers.parseEther("1.0")]);
      await approveAndBuy(assuranceContract, alice, await erc1155Token.getAddress(), [1], [4], ethers.parseEther("4.0"));
      await approveAndBuy(assuranceContract, bob, await erc1155Token.getAddress(), [1], [6], ethers.parseEther("6.0"));

      await paymentToken.connect(charlie).approve(await assuranceContract.getAddress(), ethers.parseEther("5.0"));
      await expect(assuranceContract.connect(charlie).donateRetroactive(ethers.parseEther("5.0")))
        .to.emit(assuranceContract, "RetroactiveDonationReceived")
        .withArgs(charlie.address, ethers.parseEther("5.0"));

      expect(await assuranceContract.totalEarlyContributions()).to.equal(ethers.parseEther("10.0"));
      expect(await assuranceContract.totalRetroReceived()).to.equal(ethers.parseEther("5.0"));
      expect(await assuranceContract.outstandingReimbursementTotal()).to.equal(ethers.parseEther("5.0"));
      expect(await assuranceContract.reimbursableAmount(alice.address)).to.equal(ethers.parseEther("2.0"));
      expect(await assuranceContract.reimbursableAmount(bob.address)).to.equal(ethers.parseEther("3.0"));

      await expect(assuranceContract.connect(alice).withdrawReimbursement())
        .to.emit(assuranceContract, "ReimbursementWithdrawn")
        .withArgs(alice.address, ethers.parseEther("2.0"));
      await expect(assuranceContract.connect(bob).withdrawReimbursement())
        .to.emit(assuranceContract, "ReimbursementWithdrawn")
        .withArgs(bob.address, ethers.parseEther("3.0"));
    });

    it("rejects retroactive donations above total early contributions", async function () {
      await assuranceContract.connect(owner).setPricesERC1155([1], [ethers.parseEther("1.0")]);
      await approveAndBuy(assuranceContract, alice, await erc1155Token.getAddress(), [1], [10], ethers.parseEther("10.0"));

      await paymentToken.connect(charlie).approve(await assuranceContract.getAddress(), ethers.parseEther("10.000001"));
      await expect(assuranceContract.connect(charlie).donateRetroactive(ethers.parseEther("10.000001")))
        .to.be.revertedWithCustomError(assuranceContract, "RetroactiveDonationExceedsOutstandingReimbursement");
    });
  });

  describe("Forgo reimbursement", function () {
    let tokenAddr;

    beforeEach(async function () {
      tokenAddr = await erc1155Token.getAddress();
      await assuranceContract.connect(owner).setPricesERC1155([1], [ethers.parseEther("1.0")]);
    });

    async function donateRetro(signer, amount) {
      await paymentToken.connect(signer).approve(await assuranceContract.getAddress(), amount);
      return assuranceContract.connect(signer).donateRetroactive(amount);
    }

    it("atomically contributes and forgoes the full claim while keeping the receipt", async function () {
      const amount = ethers.parseEther("4.0");
      await paymentToken.connect(alice).approve(await assuranceContract.getAddress(), amount);

      await expect(
        assuranceContract.connect(alice).donateNormallyERC1155(
          alice.address,
          tokenAddr,
          [1],
          [4],
          "0x"
        )
      )
        .to.emit(assuranceContract, "ReimbursementForgone")
        .withArgs(alice.address, amount);

      expect(await erc1155Token.balanceOf(alice.address, 1)).to.equal(4);
      expect(await assuranceContract.getAssuranceContractProgress()).to.equal(amount);
      expect(await assuranceContract.earlyContributions(alice.address)).to.equal(0);
      expect(await assuranceContract.totalEarlyContributions()).to.equal(0);
    });

    it("atomically forgoes the recipient's claim when another address pays", async function () {
      const amount = ethers.parseEther("2.0");
      await paymentToken.connect(alice).approve(await assuranceContract.getAddress(), amount);

      await expect(
        assuranceContract.connect(alice).donateNormallyERC1155(
          bob.address,
          tokenAddr,
          [1],
          [2],
          "0x"
        )
      )
        .to.emit(assuranceContract, "ReimbursementForgone")
        .withArgs(bob.address, amount);

      expect(await erc1155Token.balanceOf(bob.address, 1)).to.equal(2);
      expect(await assuranceContract.earlyContributions(bob.address)).to.equal(0);
    });

    it("lets a contributor forgo their whole claim, turning it into a pure donation", async function () {
      // Alice contributes 4, Bob 6 (threshold met → success).
      await approveAndBuy(assuranceContract, alice, tokenAddr, [1], [4], ethers.parseEther("4.0"));
      await approveAndBuy(assuranceContract, bob, tokenAddr, [1], [6], ethers.parseEther("6.0"));

      await expect(assuranceContract.connect(alice).forgoReimbursement(ethers.parseEther("4.0")))
        .to.emit(assuranceContract, "ReimbursementForgone")
        .withArgs(alice.address, ethers.parseEther("4.0"));

      expect(await assuranceContract.earlyContributions(alice.address)).to.equal(0);
      expect(await assuranceContract.totalEarlyContributions()).to.equal(ethers.parseEther("6.0"));

      // A retroactive donor can now only be asked for what Bob is still owed.
      expect(await assuranceContract.outstandingReimbursementTotal()).to.equal(ethers.parseEther("6.0"));
      await donateRetro(charlie, ethers.parseEther("6.0"));
      expect(await assuranceContract.reimbursableAmount(alice.address)).to.equal(0);
      expect(await assuranceContract.reimbursableAmount(bob.address)).to.equal(ethers.parseEther("6.0"));
    });

    it("redistributes already-received retro money pro-rata to the remaining contributors", async function () {
      await approveAndBuy(assuranceContract, alice, tokenAddr, [1], [4], ethers.parseEther("4.0"));
      await approveAndBuy(assuranceContract, bob, tokenAddr, [1], [6], ethers.parseEther("6.0"));

      await donateRetro(charlie, ethers.parseEther("5.0"));
      expect(await assuranceContract.reimbursableAmount(alice.address)).to.equal(ethers.parseEther("2.0"));
      expect(await assuranceContract.reimbursableAmount(bob.address)).to.equal(ethers.parseEther("3.0"));

      // Alice forgoes her full contribution; the 5 already in redistributes to Bob.
      await assuranceContract.connect(alice).forgoReimbursement(ethers.parseEther("4.0"));
      expect(await assuranceContract.reimbursableAmount(alice.address)).to.equal(0);
      expect(await assuranceContract.reimbursableAmount(bob.address)).to.equal(ethers.parseEther("5.0"));
      // Bob is never reimbursed above his own cost of 6.
      expect(await assuranceContract.outstandingReimbursementTotal()).to.equal(ethers.parseEther("1.0"));
    });

    it("caps forgo at the outstanding reimbursement total (T - R)", async function () {
      await approveAndBuy(assuranceContract, alice, tokenAddr, [1], [4], ethers.parseEther("4.0"));
      await approveAndBuy(assuranceContract, bob, tokenAddr, [1], [6], ethers.parseEther("6.0"));

      await donateRetro(charlie, ethers.parseEther("8.0")); // outstanding now 2
      await expect(assuranceContract.connect(alice).forgoReimbursement(ethers.parseEther("3.0")))
        .to.be.revertedWithCustomError(assuranceContract, "ForgoAmountExceedsAllowed");
      // Exactly the outstanding amount is allowed.
      await expect(assuranceContract.connect(alice).forgoReimbursement(ethers.parseEther("2.0")))
        .to.emit(assuranceContract, "ReimbursementForgone");
    });

    it("rejects forgo above your own contribution and zero forgo", async function () {
      await approveAndBuy(assuranceContract, alice, tokenAddr, [1], [4], ethers.parseEther("4.0"));
      await approveAndBuy(assuranceContract, bob, tokenAddr, [1], [6], ethers.parseEther("6.0"));

      await expect(assuranceContract.connect(alice).forgoReimbursement(ethers.parseEther("5.0")))
        .to.be.revertedWithCustomError(assuranceContract, "ForgoAmountExceedsAllowed");
      await expect(assuranceContract.connect(alice).forgoReimbursement(0))
        .to.be.revertedWithCustomError(assuranceContract, "ForgoAmountExceedsAllowed");
    });

    it("won't let a contributor forgo below what they already withdrew", async function () {
      await approveAndBuy(assuranceContract, alice, tokenAddr, [1], [4], ethers.parseEther("4.0"));
      await approveAndBuy(assuranceContract, bob, tokenAddr, [1], [6], ethers.parseEther("6.0"));

      await donateRetro(charlie, ethers.parseEther("5.0"));
      await assuranceContract.connect(alice).withdrawReimbursement(); // withdraws 2, earned == withdrawn
      await expect(assuranceContract.connect(alice).forgoReimbursement(ethers.parseEther("1.0")))
        .to.be.revertedWithCustomError(assuranceContract, "ForgoWouldStrandWithdrawnReimbursement");
    });

    it("still refunds a forgoer if the project later fails (clamped, no underflow)", async function () {
      // Alice contributes 4 but chooses to donate normally (full forgo up front),
      // while the project is still open and under threshold.
      await approveAndBuy(assuranceContract, alice, tokenAddr, [1], [4], ethers.parseEther("4.0"));
      await assuranceContract.connect(alice).forgoReimbursement(ethers.parseEther("4.0"));
      expect(await assuranceContract.earlyContributions(alice.address)).to.equal(0);
      expect(await assuranceContract.totalEarlyContributions()).to.equal(0);

      // Project fails to reach threshold by the deadline.
      await hre.network.provider.send("evm_increaseTime", [86400]);
      await hre.network.provider.send("evm_mine");
      await erc1155Token.connect(alice).setApprovalForAll(await assuranceContract.getAddress(), true);

      const before = await paymentToken.balanceOf(alice.address);
      await expect(
        assuranceContract.connect(alice).refundERC1155(alice.address, tokenAddr, [1], [4], "0x")
      ).to.not.be.reverted;
      const after = await paymentToken.balanceOf(alice.address);
      expect(after - before).to.equal(ethers.parseEther("4.0"));
      // Basis stays consistent (clamped, not underflowed).
      expect(await assuranceContract.totalEarlyContributions()).to.equal(0);
    });
  });

  describe("Withdrawal", function () {
    beforeEach(async function () {
      const tokenAddr = await erc1155Token.getAddress();
      await assuranceContract
        .connect(owner)
        .setPricesERC1155(
          [1],
          [ethers.parseEther("1.0")]
        );
    });

    it("Should allow withdrawal when threshold met", async function () {
      const tokenAddr = await erc1155Token.getAddress();

      // Buy tokens to meet threshold
      await approveAndBuy(
        assuranceContract,
        alice,
        tokenAddr,
        [1],
        [10],
        ethers.parseEther("10.0")
      );

      const recipientBalanceBefore = await paymentToken.balanceOf(recipient.address);

      await assuranceContract.connect(recipient).withdraw();

      const recipientBalanceAfter = await paymentToken.balanceOf(recipient.address);

      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(ethers.parseEther("10.0"));
    });

    it("Should emit AssuranceContractWithdrawal event", async function () {
      const tokenAddr = await erc1155Token.getAddress();

      await approveAndBuy(
        assuranceContract,
        alice,
        tokenAddr,
        [1],
        [10],
        ethers.parseEther("10.0")
      );

      await expect(assuranceContract.connect(recipient).withdraw())
        .to.emit(assuranceContract, "AssuranceContractWithdrawal")
        .withArgs(recipient.address, ethers.parseEther("10.0"));
    });

    it("Should reject withdrawal when threshold not met", async function () {
      const tokenAddr = await erc1155Token.getAddress();

      await approveAndBuy(
        assuranceContract,
        alice,
        tokenAddr,
        [1],
        [5],
        ethers.parseEther("5.0")
      );

      await expect(
        assuranceContract.connect(recipient).withdraw()
      ).to.be.revertedWithCustomError(assuranceContract, "ConditionNotMet");
    });

    it("Should only allow recipient to trigger withdrawal when successful", async function () {
      const tokenAddr = await erc1155Token.getAddress();

      await approveAndBuy(
        assuranceContract,
        alice,
        tokenAddr,
        [1],
        [10],
        ethers.parseEther("10.0")
      );

      // Alice tries to trigger withdrawal (not recipient) - should fail
      await expect(
        assuranceContract.connect(alice).withdraw()
      ).to.be.revertedWithCustomError(assuranceContract, "OnlyRecipientCanWithdraw");

      // Recipient can withdraw
      await expect(assuranceContract.connect(recipient).withdraw()).to.not.be
        .reverted;
    });
  });

  describe("Edge Cases", function () {
    it("Should return zero progress initially", async function () {
      expect(await assuranceContract.getAssuranceContractProgress()).to.equal(0);
    });

    it("Should handle multiple buys from same buyer", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      await assuranceContract
        .connect(owner)
        .setPricesERC1155( [1], [ethers.parseEther("1.0")]);

      await approveAndBuy(
        assuranceContract,
        alice,
        tokenAddr,
        [1],
        [2],
        ethers.parseEther("2.0")
      );

      await approveAndBuy(
        assuranceContract,
        alice,
        tokenAddr,
        [1],
        [3],
        ethers.parseEther("3.0")
      );

      expect(await erc1155Token.balanceOf(alice.address, 1)).to.equal(5);
      expect(await assuranceContract.getAssuranceContractProgress()).to.equal(
        ethers.parseEther("5.0")
      );
    });

    it("Should reject buying after deadline when threshold not met", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      await assuranceContract
        .connect(owner)
        .setPricesERC1155( [1], [ethers.parseEther("1.0")]);

      // Fast forward past deadline
      await hre.network.provider.send("evm_increaseTime", [86400]);
      await hre.network.provider.send("evm_mine");

      await expect(
        approveAndBuy(
          assuranceContract,
          alice,
          tokenAddr,
          [1],
          [1],
          ethers.parseEther("1.0")
        )
      ).to.be.revertedWithCustomError(assuranceContract, "ConditionHasFailed");
    });

    it("Should treat exact threshold funding as success at the deadline", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      await assuranceContract
        .connect(owner)
        .setPricesERC1155( [1], [ethers.parseEther("1.0")]);

      await approveAndBuy(
        assuranceContract,
        alice,
        tokenAddr,
        [1],
        [10],
        ethers.parseEther("10.0")
      );

      await hre.network.provider.send("evm_setNextBlockTimestamp", [deadline]);
      await hre.network.provider.send("evm_mine");

      await erc1155Token
        .connect(alice)
        .setApprovalForAll(await assuranceContract.getAddress(), true);

      await expect(
        assuranceContract
          .connect(alice)
          .refundERC1155(alice.address, tokenAddr, [1], [1], "0x")
      ).to.be.revertedWithCustomError(assuranceContract, "ConditionNotFailed");

      await expect(assuranceContract.connect(recipient).withdraw()).to.not.be
        .reverted;
    });

    it("Should treat one wei below threshold as failed at the deadline", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      await assuranceContract
        .connect(owner)
        .setPricesERC1155( [1], [threshold - 1n]);

      await approveAndBuy(
        assuranceContract,
        alice,
        tokenAddr,
        [1],
        [1],
        threshold - 1n
      );

      await hre.network.provider.send("evm_setNextBlockTimestamp", [deadline]);
      await hre.network.provider.send("evm_mine");

      await expect(
        assuranceContract.connect(recipient).withdraw()
      ).to.be.revertedWithCustomError(assuranceContract, "ConditionNotMet");

      await erc1155Token
        .connect(alice)
        .setApprovalForAll(await assuranceContract.getAddress(), true);

      await expect(
        assuranceContract
          .connect(alice)
          .refundERC1155(alice.address, tokenAddr, [1], [1], "0x")
      ).to.not.be.reverted;
    });
  });

  describe("CancellableCondition", function () {
    let cancellableContract;
    let cancellableToken;
    let baseCondition;
    let wrappedCondition;

    beforeEach(async function () {
      const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
      cancellableToken = await PremintingERC1155.deploy(
        owner.address,
        "https://example.com/cancellable/{id}.json",
        "ipfs://QmCancellableToken"
      );
      await cancellableToken.mintBatch(owner.address, [1], [100]);

      const AssuranceContracts = await ethers.getContractFactory(
        "MultiERC1155AssuranceContract"
      );
      cancellableContract = await AssuranceContracts.deploy(
        owner.address,
        recipient.address,
        await paymentToken.getAddress(),
        await cancellableToken.getAddress(),
        "ipfs://QmCancellableProject"
      );

      const deployed = await deployCancellableCondition(
        await cancellableContract.getAddress(),
        threshold,
        deadline,
        charlie.address
      );
      baseCondition = deployed.baseCondition;
      wrappedCondition = deployed.wrappedCondition;

      await cancellableContract
        .connect(owner)
        .setCondition(await wrappedCondition.getAddress());

      await cancellableToken.setReceiptTransferBridge(await cancellableContract.getAddress(), true);
      await cancellableToken.safeBatchTransferFrom(
        owner.address,
        await cancellableContract.getAddress(),
        [1],
        [100],
        "0x"
      );

      await cancellableContract.connect(owner).setPricesERC1155(
        [1],
        [ethers.parseEther("1.0")]
      );
    });

    it("Should allow the canceller to force early failure and refunds", async function () {
      await approveAndBuy(
        cancellableContract,
        alice,
        await cancellableToken.getAddress(),
        [1],
        [1],
        ethers.parseEther("1.0")
      );

      await expect(wrappedCondition.connect(charlie).cancel())
        .to.emit(wrappedCondition, "ConditionCancelled")
        .withArgs(charlie.address);

      expect(await wrappedCondition.hasSucceeded()).to.equal(false);
      expect(await wrappedCondition.hasFailed()).to.equal(true);
      expect(await baseCondition.hasFailed()).to.equal(false);

      await cancellableToken
        .connect(alice)
        .setApprovalForAll(await cancellableContract.getAddress(), true);

      await expect(
        cancellableContract.connect(alice).refundERC1155(
          alice.address,
          await cancellableToken.getAddress(),
          [1],
          [1],
          "0x"
        )
      ).to.not.be.reverted;
    });

    it("Should reject cancellation by a non-canceller", async function () {
      await expect(
        wrappedCondition.connect(alice).cancel()
      ).to.be.revertedWithCustomError(wrappedCondition, "OnlyCancellerCanCancel");
    });

    it("Should reject buying after cancellation", async function () {
      await wrappedCondition.connect(charlie).cancel();

      await expect(
        approveAndBuy(
          cancellableContract,
          alice,
          await cancellableToken.getAddress(),
          [1],
          [1],
          ethers.parseEther("1.0")
        )
      ).to.be.revertedWithCustomError(cancellableContract, "ConditionHasFailed");
    });

    it("Should reject cancellation after success", async function () {
      await approveAndBuy(
        cancellableContract,
        alice,
        await cancellableToken.getAddress(),
        [1],
        [10],
        ethers.parseEther("10.0")
      );

      await expect(
        wrappedCondition.connect(charlie).cancel()
      ).to.be.revertedWithCustomError(wrappedCondition, "ConditionAlreadySucceeded");
    });
  });

  describe("OracleCondition", function () {
    let oracleToken;

    beforeEach(async function () {
      // Deploy a separate token for oracle tests (main beforeEach consumes all tokens)
      const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
      oracleToken = await PremintingERC1155.deploy(
        owner.address,
        "https://example.com/oracle/{id}.json",
        "ipfs://QmOracleToken"
      );
      await oracleToken.mintBatch(owner.address, [1, 2], [100, 100]);
    });

    it("Should work with an oracle-based condition", async function () {
      const MockOracle = await ethers.getContractFactory("MockOracle");
      const mockOracle = await MockOracle.deploy();

      const OracleCondition = await ethers.getContractFactory("OracleCondition");
      const oracleCondition = await OracleCondition.deploy(await mockOracle.getAddress());

      const AssuranceContracts = await ethers.getContractFactory(
        "MultiERC1155AssuranceContract"
      );
      const ac = await AssuranceContracts.deploy(
        owner.address,
        recipient.address,
        await paymentToken.getAddress(),
        await oracleToken.getAddress(),
        "ipfs://QmOracleProject"
      );
      await ac.connect(owner).setCondition(await oracleCondition.getAddress());

      await oracleToken.setReceiptTransferBridge(await ac.getAddress(), true);
      await oracleToken.safeBatchTransferFrom(
        owner.address,
        await ac.getAddress(),
        [1, 2],
        [10, 10],
        "0x"
      );
      await ac.connect(owner).setPricesERC1155(
        [1],
        [ethers.parseEther("1.0")]
      );

      await approveAndBuy(
        ac,
        alice,
        await oracleToken.getAddress(),
        [1],
        [1],
        ethers.parseEther("1.0")
      );

      // Oracle says undecided — can't withdraw or refund
      await expect(ac.connect(recipient).withdraw())
        .to.be.revertedWithCustomError(ac, "ConditionNotMet");

      // Oracle says succeeded
      await mockOracle.setResult(1);
      await expect(ac.connect(recipient).withdraw()).to.not.be.reverted;
    });

    it("Should allow refund when oracle says failed", async function () {
      const MockOracle = await ethers.getContractFactory("MockOracle");
      const mockOracle = await MockOracle.deploy();

      const OracleCondition = await ethers.getContractFactory("OracleCondition");
      const oracleCondition = await OracleCondition.deploy(await mockOracle.getAddress());

      const AssuranceContracts = await ethers.getContractFactory(
        "MultiERC1155AssuranceContract"
      );
      const ac = await AssuranceContracts.deploy(
        owner.address,
        recipient.address,
        await paymentToken.getAddress(),
        await oracleToken.getAddress(),
        "ipfs://QmOracleProject"
      );
      await ac.connect(owner).setCondition(await oracleCondition.getAddress());

      await oracleToken.setReceiptTransferBridge(await ac.getAddress(), true);
      await oracleToken.safeBatchTransferFrom(
        owner.address,
        await ac.getAddress(),
        [1],
        [10],
        "0x"
      );
      await ac.connect(owner).setPricesERC1155(
        [1],
        [ethers.parseEther("1.0")]
      );

      await approveAndBuy(
        ac,
        alice,
        await oracleToken.getAddress(),
        [1],
        [1],
        ethers.parseEther("1.0")
      );

      // Oracle says failed
      await mockOracle.setResult(2);

      await oracleToken
        .connect(alice)
        .setApprovalForAll(await ac.getAddress(), true);

      await expect(
        ac.connect(alice).refundERC1155(
          alice.address,
          await oracleToken.getAddress(),
          [1], [1], "0x"
        )
      ).to.not.be.reverted;
    });
  });
});
