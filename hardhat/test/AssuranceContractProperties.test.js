import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

/**
 * Assurance Contract Property / Invariant Tests
 *
 * Covers item 11.4 from the automation backlog:
 * Property/invariant tests for assurance-contract accounting:
 * contributions, refunds, withdrawals, token balances, and exact goal/deadline boundaries.
 *
 * NOTE: All deadlines are set generously (30 days) to avoid shared-hardhat-evm-time
 * contamination across tests. Time-sensitive boundary tests already live in
 * AssuranceContracts.test.js and are validated there in isolation.
 */

describe("AssuranceContract - Property/Invariant Tests", function () {
  let paymentToken;
  let erc1155Token;
  let owner, recipient, alice, bob, charlie;

  async function deployContract(ownerSigner, ownerAddr, recipientAddr, threshold) {
    const latestBlock = await ethers.provider.getBlock("latest");
    // Use a very generous deadline to avoid time-shift contamination across tests
    const deadline = latestBlock.timestamp + 30 * 86400; // 30 days

    const AssuranceContracts = await ethers.getContractFactory("MultiERC1155AssuranceContract");
    const ac = await AssuranceContracts.deploy(
      ownerAddr, recipientAddr,
      await paymentToken.getAddress(), await erc1155Token.getAddress(),
      "ipfs://meta"
    );

    const ValueThresholdCondition = await ethers.getContractFactory("ValueThresholdCondition");
    const condition = await ValueThresholdCondition.deploy(
      await ac.getAddress(), threshold, deadline
    );
    await ac.connect(ownerSigner).setCondition(await condition.getAddress());

    await erc1155Token.connect(ownerSigner).safeBatchTransferFrom(
      ownerAddr, await ac.getAddress(),
      [1, 2, 3], [100, 100, 100], "0x"
    );

    return { ac, condition, deadline };
  }

  async function buy(contract, buyer, ids, counts, cost) {
    await paymentToken.connect(buyer).approve(await contract.getAddress(), cost);
    return contract.connect(buyer).buyERC1155(
      buyer.address, await erc1155Token.getAddress(), ids, counts, "0x"
    );
  }

  async function refund(contract, holder, ids, counts) {
    await erc1155Token.connect(holder).setApprovalForAll(await contract.getAddress(), true);
    return contract.connect(holder).refundERC1155(
      holder.address, await erc1155Token.getAddress(), ids, counts, "0x"
    );
  }

  async function fastForwardPastDeadline(contractDeadline) {
    const latestBlock = await ethers.provider.getBlock("latest");
    const delta = Number(contractDeadline) - latestBlock.timestamp + 10;
    if (delta > 0) {
      await hre.network.provider.send("evm_increaseTime", [delta]);
      await hre.network.provider.send("evm_mine");
    }
  }

  beforeEach(async function () {
    [owner, recipient, alice, bob, charlie] = await ethers.getSigners();

    const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
    paymentToken = await PremintingERC20.deploy(
      owner.address, "PT", "PT", "ipfs://pt"
    );
    for (const signer of [owner, recipient, alice, bob, charlie]) {
      await paymentToken.connect(owner).mint(signer.address, ethers.parseEther("10000"));
    }

    const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
    erc1155Token = await PremintingERC1155.deploy(
      owner.address, "https://x/{id}.json", "ipfs://x"
    );
    await erc1155Token.mintBatch(owner.address, [1, 2, 3], [1000, 1000, 1000]);
  });

  describe("Progress invariant: sum of contributions minus refunds equals progress", function () {
    it("progress = 0 initially", async function () {
      const { ac } = await deployContract(owner, owner.address, recipient.address, ethers.parseEther("10"));
      expect(await ac.getAssuranceContractProgress()).to.equal(0);
    });

    it("progress increases by exact contribution amount", async function () {
      const { ac } = await deployContract(owner, owner.address, recipient.address, ethers.parseEther("10"));
      await ac.connect(owner).setPricesERC1155([1], [ethers.parseEther("0.5")]);

      const before = await ac.getAssuranceContractProgress();
      await buy(ac, alice, [1], [3], ethers.parseEther("1.5"));
      const after = await ac.getAssuranceContractProgress();

      expect(after - before).to.equal(ethers.parseEther("1.5"));
    });

    it("progress decreases by exact refund amount after failure", async function () {
      const { ac, deadline } = await deployContract(owner, owner.address, recipient.address, ethers.parseEther("10"));
      await ac.connect(owner).setPricesERC1155([1], [ethers.parseEther("0.5")]);

      await buy(ac, alice, [1], [2], ethers.parseEther("1.0"));
      expect(await ac.getAssuranceContractProgress()).to.equal(ethers.parseEther("1.0"));

      await fastForwardPastDeadline(deadline);
      await refund(ac, alice, [1], [1]);
      expect(await ac.getAssuranceContractProgress()).to.equal(ethers.parseEther("0.5"));
    });

    it("cumulative contributions minus refunds = progress after mixed operations", async function () {
      const { ac, deadline } = await deployContract(owner, owner.address, recipient.address, ethers.parseEther("10"));
      await ac.connect(owner).setPricesERC1155(
        [1, 2], [ethers.parseEther("0.5"), ethers.parseEther("1.0")]
      );

      await buy(ac, alice, [1], [2], ethers.parseEther("1.0"));
      await buy(ac, bob, [2], [1], ethers.parseEther("1.0"));
      await buy(ac, charlie, [1], [1], ethers.parseEther("0.5"));

      expect(await ac.getAssuranceContractProgress()).to.equal(ethers.parseEther("2.5"));

      await fastForwardPastDeadline(deadline);

      await refund(ac, alice, [1], [1]);
      expect(await ac.getAssuranceContractProgress()).to.equal(ethers.parseEther("2.0"));

      await refund(ac, charlie, [1], [1]);
      expect(await ac.getAssuranceContractProgress()).to.equal(ethers.parseEther("1.5"));

      await refund(ac, bob, [2], [1]);
      expect(await ac.getAssuranceContractProgress()).to.equal(ethers.parseEther("0.5"));
    });
  });

  describe("Token balance invariant: contract holds ERC1155 sold tokens", function () {
    it("contract ERC1155 balance + buyers' balances = original supply", async function () {
      const { ac } = await deployContract(owner, owner.address, recipient.address, ethers.parseEther("10"));
      await ac.connect(owner).setPricesERC1155([1], [ethers.parseEther("0.5")]);

      const contractBefore = await erc1155Token.balanceOf(await ac.getAddress(), 1);
      await buy(ac, alice, [1], [3], ethers.parseEther("1.5"));
      const contractAfter = await erc1155Token.balanceOf(await ac.getAddress(), 1);
      const aliceBalance = await erc1155Token.balanceOf(alice.address, 1);

      expect(contractAfter).to.equal(contractBefore - 3n);
      expect(aliceBalance).to.equal(3);
      expect(contractAfter + aliceBalance).to.equal(contractBefore);
    });

    it("contract ERC1155 balance returns on refund, buyer's decreases", async function () {
      const { ac, deadline } = await deployContract(owner, owner.address, recipient.address, ethers.parseEther("10"));
      await ac.connect(owner).setPricesERC1155([1], [ethers.parseEther("0.5")]);

      await buy(ac, alice, [1], [3], ethers.parseEther("1.5"));
      const contractAfterBuy = await erc1155Token.balanceOf(await ac.getAddress(), 1);

      await fastForwardPastDeadline(deadline);
      await refund(ac, alice, [1], [1]);
      const contractAfterRefund = await erc1155Token.balanceOf(await ac.getAddress(), 1);

      expect(contractAfterRefund).to.equal(contractAfterBuy + 1n);
      expect(await erc1155Token.balanceOf(alice.address, 1)).to.equal(2);
    });
  });

  describe("Payment token invariant: contract holds contributions until withdrawn/refunded", function () {
    it("payment token balance matches progress before any withdrawal", async function () {
      const { ac } = await deployContract(owner, owner.address, recipient.address, ethers.parseEther("10"));
      await ac.connect(owner).setPricesERC1155([1], [ethers.parseEther("0.5")]);

      await buy(ac, alice, [1], [3], ethers.parseEther("1.5"));
      await buy(ac, bob, [1], [2], ethers.parseEther("1.0"));

      const contractBalance = await paymentToken.balanceOf(await ac.getAddress());
      const progress = await ac.getAssuranceContractProgress();

      expect(contractBalance).to.equal(progress);
      expect(contractBalance).to.equal(ethers.parseEther("2.5"));
    });

    it("payment token balance decreases on refund", async function () {
      const { ac, deadline } = await deployContract(owner, owner.address, recipient.address, ethers.parseEther("10"));
      await ac.connect(owner).setPricesERC1155([1], [ethers.parseEther("0.5")]);

      await buy(ac, alice, [1], [3], ethers.parseEther("1.5"));
      const balanceBeforeRefund = await paymentToken.balanceOf(await ac.getAddress());

      await fastForwardPastDeadline(deadline);
      await refund(ac, alice, [1], [1]);
      const balanceAfterRefund = await paymentToken.balanceOf(await ac.getAddress());

      expect(balanceAfterRefund).to.equal(balanceBeforeRefund - ethers.parseEther("0.5"));
    });

    it("alice's payment token reflects buy then refund", async function () {
      const { ac, deadline } = await deployContract(owner, owner.address, recipient.address, ethers.parseEther("10"));
      await ac.connect(owner).setPricesERC1155([1], [ethers.parseEther("0.5")]);

      const aliceBefore = await paymentToken.balanceOf(alice.address);
      await buy(ac, alice, [1], [3], ethers.parseEther("1.5"));
      const aliceAfterBuy = await paymentToken.balanceOf(alice.address);

      // alice spent 1.5 (minus gas)
      expect(aliceBefore - aliceAfterBuy).to.be.greaterThan(ethers.parseEther("1.4"));

      await fastForwardPastDeadline(deadline);
      await refund(ac, alice, [1], [1]);
      const aliceAfterRefund = await paymentToken.balanceOf(alice.address);

      // alice got back 0.5
      expect(aliceAfterRefund - aliceAfterBuy).to.equal(ethers.parseEther("0.5"));
    });
  });

  describe("Withdrawal invariants", function () {
    it("withdrawal sends exact progress amount to recipient", async function () {
      const { ac } = await deployContract(owner, owner.address, recipient.address, ethers.parseEther("5"));
      await ac.connect(owner).setPricesERC1155([1], [ethers.parseEther("1.0")]);

      await buy(ac, alice, [1], [3], ethers.parseEther("3.0"));
      await buy(ac, bob, [1], [3], ethers.parseEther("3.0"));

      const recipientBefore = await paymentToken.balanceOf(recipient.address);
      await ac.connect(recipient).withdraw();

      const recipientAfter = await paymentToken.balanceOf(recipient.address);
      const contractAfter = await paymentToken.balanceOf(await ac.getAddress());

      expect(recipientAfter - recipientBefore).to.equal(ethers.parseEther("6.0"));
      expect(contractAfter).to.equal(0);
    });

    it("withdrawal is rejected before goal is met", async function () {
      const { ac } = await deployContract(owner, owner.address, recipient.address, ethers.parseEther("10"));
      await ac.connect(owner).setPricesERC1155([1], [ethers.parseEther("1.0")]);

      await buy(ac, alice, [1], [5], ethers.parseEther("5.0"));

      await expect(
        ac.connect(recipient).withdraw()
      ).to.be.revertedWithCustomError(ac, "ConditionNotMet");
    });

    it("progress is unchanged after successful withdrawal", async function () {
      const { ac } = await deployContract(owner, owner.address, recipient.address, ethers.parseEther("5"));
      await ac.connect(owner).setPricesERC1155([1], [ethers.parseEther("1.0")]);

      await buy(ac, alice, [1], [6], ethers.parseEther("6.0"));
      const progressBefore = await ac.getAssuranceContractProgress();

      await ac.connect(recipient).withdraw();

      expect(await ac.getAssuranceContractProgress()).to.equal(progressBefore);
    });

    it("withdrawal consumes full balance even with multiple token types bought", async function () {
      const { ac } = await deployContract(owner, owner.address, recipient.address, ethers.parseEther("5"));
      await ac.connect(owner).setPricesERC1155(
        [1, 2, 3], [
          ethers.parseEther("1.0"),
          ethers.parseEther("2.0"),
          ethers.parseEther("3.0"),
        ]
      );

      await buy(ac, alice, [1], [2], ethers.parseEther("2.0"));
      await buy(ac, bob, [2], [1], ethers.parseEther("2.0"));
      await buy(ac, charlie, [3], [1], ethers.parseEther("3.0")); // 7.0 total

      const recipientBefore = await paymentToken.balanceOf(recipient.address);
      await ac.connect(recipient).withdraw();
      const recipientAfter = await paymentToken.balanceOf(recipient.address);

      expect(recipientAfter - recipientBefore).to.equal(ethers.parseEther("7.0"));
    });

    it("exact goal contribution is sufficient for success", async function () {
      const { ac } = await deployContract(owner, owner.address, recipient.address, ethers.parseEther("10"));
      await ac.connect(owner).setPricesERC1155([1], [ethers.parseEther("2.0")]);

      await buy(ac, alice, [1], [5], ethers.parseEther("10.0"));

      await expect(ac.connect(recipient).withdraw()).to.not.be.reverted;
    });

    it("multiple contributions from same buyer count cumulatively toward success", async function () {
      const { ac } = await deployContract(owner, owner.address, recipient.address, ethers.parseEther("10"));
      await ac.connect(owner).setPricesERC1155([1], [ethers.parseEther("1.0")]);

      await buy(ac, alice, [1], [3], ethers.parseEther("3.0"));
      await buy(ac, alice, [1], [5], ethers.parseEther("5.0"));
      await buy(ac, alice, [1], [2], ethers.parseEther("2.0"));

      expect(await ac.getAssuranceContractProgress()).to.equal(ethers.parseEther("10.0"));
      await expect(ac.connect(recipient).withdraw()).to.not.be.reverted;
    });
  });

  describe("CancellableCondition properties", function () {
    let successGate;

    beforeEach(async function () {
      const MockThirdPartySuccessGate = await ethers.getContractFactory("MockThirdPartySuccessGate");
      successGate = await MockThirdPartySuccessGate.deploy();
      await successGate.setCanSucceed(true);
    });

    async function deployCancellable(threshold, canceller) {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 30 * 86400; // 30 days

      const AssuranceContracts = await ethers.getContractFactory("MultiERC1155AssuranceContract");
      const ac = await AssuranceContracts.deploy(
        owner.address, recipient.address,
        await paymentToken.getAddress(), await erc1155Token.getAddress(),
        "ipfs://meta"
      );

      const ValueThresholdCondition = await ethers.getContractFactory("ValueThresholdCondition");
      const baseCond = await ValueThresholdCondition.deploy(
        await ac.getAddress(), threshold, deadline
      );

      const CancellableCondition = await ethers.getContractFactory("CancellableCondition");
      const wrapped = await CancellableCondition.deploy(
        await baseCond.getAddress(),
        canceller,
        await successGate.getAddress(),
        ethers.id("test-channel")
      );

      await ac.connect(owner).setCondition(await wrapped.getAddress());
      await erc1155Token.connect(owner).safeBatchTransferFrom(
        owner.address, await ac.getAddress(),
        [1], [100], "0x"
      );

      return { ac, wrapped };
    }

    it("cancellation makes condition failed even before base deadline", async function () {
      const { ac, wrapped } = await deployCancellable(ethers.parseEther("10"), bob.address);
      await ac.connect(owner).setPricesERC1155([1], [ethers.parseEther("1.0")]);

      await buy(ac, alice, [1], [1], ethers.parseEther("1.0"));

      await wrapped.connect(bob).cancel();

      await erc1155Token.connect(alice).setApprovalForAll(await ac.getAddress(), true);
      await expect(
        ac.connect(alice).refundERC1155(
          alice.address, await erc1155Token.getAddress(), [1], [1], "0x"
        )
      ).to.not.be.reverted;
    });

    it("cancellation cannot be undone by base condition reaching threshold", async function () {
      const { ac, wrapped } = await deployCancellable(ethers.parseEther("10"), bob.address);
      await ac.connect(owner).setPricesERC1155([1], [ethers.parseEther("1.0")]);

      await wrapped.connect(bob).cancel();

      await paymentToken.connect(alice).approve(await ac.getAddress(), ethers.parseEther("10.0"));
      await expect(
        ac.connect(alice).buyERC1155(
          alice.address, await erc1155Token.getAddress(), [1], [10], "0x"
        )
      ).to.be.revertedWithCustomError(ac, "ConditionHasFailed");

      await expect(
        ac.connect(recipient).withdraw()
      ).to.be.revertedWithCustomError(ac, "ConditionNotMet");
    });
  });

  describe("OracleCondition properties", function () {
    it("undecided oracle blocks both withdraw and refund", async function () {
      const MockOracle = await ethers.getContractFactory("MockOracle");
      const oracle = await MockOracle.deploy();

      const OracleCondition = await ethers.getContractFactory("OracleCondition");
      const condition = await OracleCondition.deploy(await oracle.getAddress());

      const AssuranceContracts = await ethers.getContractFactory("MultiERC1155AssuranceContract");
      const ac = await AssuranceContracts.deploy(
        owner.address, recipient.address,
        await paymentToken.getAddress(), await erc1155Token.getAddress(),
        "ipfs://meta"
      );
      await ac.connect(owner).setCondition(await condition.getAddress());
      await erc1155Token.connect(owner).safeTransferFrom(owner.address, await ac.getAddress(), 1, 100, "0x");
      await ac.connect(owner).setPricesERC1155([1], [ethers.parseEther("1.0")]);

      await buy(ac, alice, [1], [1], ethers.parseEther("1.0"));

      await expect(ac.connect(recipient).withdraw())
        .to.be.revertedWithCustomError(ac, "ConditionNotMet");

      await erc1155Token.connect(alice).setApprovalForAll(await ac.getAddress(), true);
      await expect(
        ac.connect(alice).refundERC1155(
          alice.address, await erc1155Token.getAddress(), [1], [1], "0x"
        )
      ).to.be.revertedWithCustomError(ac, "ConditionNotFailed");
    });

    it("oracle success (1) enables withdrawal", async function () {
      const MockOracle = await ethers.getContractFactory("MockOracle");
      const oracle = await MockOracle.deploy();
      await oracle.setResult(1); // success

      const OracleCondition = await ethers.getContractFactory("OracleCondition");
      const condition = await OracleCondition.deploy(await oracle.getAddress());

      const AssuranceContracts = await ethers.getContractFactory("MultiERC1155AssuranceContract");
      const ac = await AssuranceContracts.deploy(
        owner.address, recipient.address,
        await paymentToken.getAddress(), await erc1155Token.getAddress(),
        "ipfs://meta"
      );
      await ac.connect(owner).setCondition(await condition.getAddress());
      await erc1155Token.connect(owner).safeTransferFrom(owner.address, await ac.getAddress(), 1, 100, "0x");
      await ac.connect(owner).setPricesERC1155([1], [ethers.parseEther("1.0")]);

      await buy(ac, alice, [1], [5], ethers.parseEther("5.0"));

      await expect(ac.connect(recipient).withdraw()).to.not.be.reverted;
    });

    it("oracle failure (2) enables refund", async function () {
      const MockOracle = await ethers.getContractFactory("MockOracle");
      const oracle = await MockOracle.deploy();
      // Start undecided, buy first, then set to failed

      const OracleCondition = await ethers.getContractFactory("OracleCondition");
      const condition = await OracleCondition.deploy(await oracle.getAddress());

      const AssuranceContracts = await ethers.getContractFactory("MultiERC1155AssuranceContract");
      const ac = await AssuranceContracts.deploy(
        owner.address, recipient.address,
        await paymentToken.getAddress(), await erc1155Token.getAddress(),
        "ipfs://meta"
      );
      await ac.connect(owner).setCondition(await condition.getAddress());
      await erc1155Token.connect(owner).safeTransferFrom(owner.address, await ac.getAddress(), 1, 100, "0x");
      await ac.connect(owner).setPricesERC1155([1], [ethers.parseEther("1.0")]);

      await buy(ac, alice, [1], [5], ethers.parseEther("5.0"));

      // Now set oracle to failed
      await oracle.setResult(2);

      await erc1155Token.connect(alice).setApprovalForAll(await ac.getAddress(), true);
      await expect(
        ac.connect(alice).refundERC1155(
          alice.address, await erc1155Token.getAddress(), [1], [1], "0x"
        )
      ).to.not.be.reverted;
    });
  });
});
