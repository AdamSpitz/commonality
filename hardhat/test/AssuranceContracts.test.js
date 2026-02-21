import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("MultiERC1155AssuranceContract", function () {
  let assuranceContract;
  let erc1155Token;
  let owner, recipient, alice, bob, charlie;
  let threshold, deadline;

  beforeEach(async function () {
    [owner, recipient, alice, bob, charlie] = await ethers.getSigners();

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
      threshold,
      deadline,
      "ipfs://QmProjectMetadata"
    );

    // Transfer tokens to the assurance contract
    await erc1155Token.safeBatchTransferFrom(
      owner.address,
      await assuranceContract.getAddress(),
      [1, 2, 3],
      [100, 100, 100],
      "0x"
    );
  });

  describe("Deployment", function () {
    it("Should emit AssuranceContractInitialized event", async function () {
      const AssuranceContracts = await ethers.getContractFactory(
        "MultiERC1155AssuranceContract"
      );

      const contract = await AssuranceContracts.deploy(
        owner.address,
        recipient.address,
        threshold,
        deadline,
        "ipfs://QmProjectMetadata"
      );

      await expect(contract.deploymentTransaction())
        .to.emit(contract, "AssuranceContractInitialized")
        .withArgs(recipient.address, threshold, deadline);
    });

    it("Should emit ContractMetadataUpdated event", async function () {
      const AssuranceContracts = await ethers.getContractFactory(
        "MultiERC1155AssuranceContract"
      );
      const metadataCid = "ipfs://QmProjectMetadata";

      const contract = await AssuranceContracts.deploy(
        owner.address,
        recipient.address,
        threshold,
        deadline,
        metadataCid
      );

      await expect(contract.deploymentTransaction()).to.emit(
        contract,
        "ContractMetadataUpdated"
      );
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
        assuranceContract.connect(owner).setPricesERC1155(tokenAddr, ids, prices)
      )
        .to.emit(assuranceContract, "ERC1155Offered")
        .withArgs(tokenAddr, ids[0], prices[0]);
    });

    it("Should reject non-owner setting prices", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const ids = [1];
      const prices = [ethers.parseEther("1.0")];

      await expect(
        assuranceContract.connect(alice).setPricesERC1155(tokenAddr, ids, prices)
      ).to.be.revertedWithCustomError(assuranceContract, "OwnableUnauthorizedAccount");
    });

    it("Should reject mismatched array lengths", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const ids = [1, 2];
      const prices = [ethers.parseEther("1.0")];

      await expect(
        assuranceContract.connect(owner).setPricesERC1155(tokenAddr, ids, prices)
      ).to.be.revertedWith("Arrays must be the same length");
    });

    it("Should reject setting same price again (not idempotent)", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const ids = [1];
      const price = ethers.parseEther("1.0");

      await assuranceContract
        .connect(owner)
        .setPricesERC1155(tokenAddr, ids, [price]);

      await expect(
        assuranceContract
          .connect(owner)
          .setPricesERC1155(tokenAddr, ids, [price])
      ).to.be.revertedWith("Price already set");
    });

    it("Should reject changing existing price", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const ids = [1];
      const price1 = ethers.parseEther("1.0");
      const price2 = ethers.parseEther("2.0");

      await assuranceContract
        .connect(owner)
        .setPricesERC1155(tokenAddr, ids, [price1]);

      await expect(
        assuranceContract
          .connect(owner)
          .setPricesERC1155(tokenAddr, ids, [price2])
      ).to.be.revertedWith("Price already set");
    });
  });

  describe("Buying Tokens", function () {
    beforeEach(async function () {
      const tokenAddr = await erc1155Token.getAddress();
      await assuranceContract
        .connect(owner)
        .setPricesERC1155(
          tokenAddr,
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

      await assuranceContract
        .connect(alice)
        .buyERC1155(alice.address, tokenAddr, [1], [1], "0x", {
          value: cost,
        });

      expect(await erc1155Token.balanceOf(alice.address, 1)).to.equal(1);
    });

    it("Should emit ERC1155Bought event", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const cost = ethers.parseEther("1.0");

      await expect(
        assuranceContract
          .connect(alice)
          .buyERC1155(alice.address, tokenAddr, [1], [1], "0x", {
            value: cost,
          })
      )
        .to.emit(assuranceContract, "ERC1155Bought")
        .withArgs(alice.address, tokenAddr, cost, [1], [1]);
    });

    it("Should track total received value", async function () {
      const tokenAddr = await erc1155Token.getAddress();

      await assuranceContract
        .connect(alice)
        .buyERC1155(alice.address, tokenAddr, [1], [2], "0x", {
          value: ethers.parseEther("2.0"),
        });

      await assuranceContract
        .connect(bob)
        .buyERC1155(bob.address, tokenAddr, [2], [1], "0x", {
          value: ethers.parseEther("2.0"),
        });

      const progress = await assuranceContract.getAssuranceContractProgress();
      expect(progress).to.equal(ethers.parseEther("4.0"));
    });

    it("Should reject incorrect ETH amount", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const incorrectAmount = ethers.parseEther("0.5");

      await expect(
        assuranceContract
          .connect(alice)
          .buyERC1155(alice.address, tokenAddr, [1], [1], "0x", {
            value: incorrectAmount,
          })
      ).to.be.revertedWith("Incorrect amount of ETH sent");
    });

    it("Should handle buying multiple token types", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const cost = ethers.parseEther("6.0"); // 1 + 2 + 3

      await assuranceContract
        .connect(alice)
        .buyERC1155(alice.address, tokenAddr, [1, 2, 3], [1, 1, 1], "0x", {
          value: cost,
        });

      expect(await erc1155Token.balanceOf(alice.address, 1)).to.equal(1);
      expect(await erc1155Token.balanceOf(alice.address, 2)).to.equal(1);
      expect(await erc1155Token.balanceOf(alice.address, 3)).to.equal(1);
    });

    it("Should handle buying multiple quantities", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const cost = ethers.parseEther("3.0"); // 1 * 3

      await assuranceContract
        .connect(alice)
        .buyERC1155(alice.address, tokenAddr, [1], [3], "0x", {
          value: cost,
        });

      expect(await erc1155Token.balanceOf(alice.address, 1)).to.equal(3);
    });
  });

  describe("Refunds (Selling)", function () {
    beforeEach(async function () {
      const tokenAddr = await erc1155Token.getAddress();
      await assuranceContract
        .connect(owner)
        .setPricesERC1155(
          tokenAddr,
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
      await assuranceContract
        .connect(alice)
        .buyERC1155(alice.address, tokenAddr, [1], [1], "0x", {
          value: cost,
        });

      // Fast forward past deadline
      await hre.network.provider.send("evm_increaseTime", [86400]);
      await hre.network.provider.send("evm_mine");

      // Approve contract to take tokens back
      await erc1155Token
        .connect(alice)
        .setApprovalForAll(await assuranceContract.getAddress(), true);

      const balanceBefore = await ethers.provider.getBalance(alice.address);

      // Sell back
      const tx = await assuranceContract
        .connect(alice)
        .refundERC1155(alice.address, tokenAddr, [1], [1], "0x");
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(alice.address);

      expect(await erc1155Token.balanceOf(alice.address, 1)).to.equal(0);
      expect(balanceAfter - balanceBefore + gasCost).to.equal(cost);
    });

    it("Should emit ERC1155Sold event", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      const cost = ethers.parseEther("1.0");

      await assuranceContract
        .connect(alice)
        .buyERC1155(alice.address, tokenAddr, [1], [1], "0x", {
          value: cost,
        });

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

      await assuranceContract
        .connect(alice)
        .buyERC1155(alice.address, tokenAddr, [1], [1], "0x", {
          value: ethers.parseEther("1.0"),
        });

      await erc1155Token
        .connect(alice)
        .setApprovalForAll(await assuranceContract.getAddress(), true);

      await expect(
        assuranceContract
          .connect(alice)
          .refundERC1155(alice.address, tokenAddr, [1], [1], "0x")
      ).to.be.revertedWith("Project fate still undecided");
    });

    it("Should reject refund if threshold met", async function () {
      const tokenAddr = await erc1155Token.getAddress();

      // Buy enough to meet threshold (10 ETH)
      await assuranceContract
        .connect(alice)
        .buyERC1155(alice.address, tokenAddr, [1], [10], "0x", {
          value: ethers.parseEther("10.0"),
        });

      await hre.network.provider.send("evm_increaseTime", [86400]);
      await hre.network.provider.send("evm_mine");

      await erc1155Token
        .connect(alice)
        .setApprovalForAll(await assuranceContract.getAddress(), true);

      await expect(
        assuranceContract
          .connect(alice)
          .refundERC1155(alice.address, tokenAddr, [1], [1], "0x")
      ).to.be.revertedWith("Project reached funding goal");
    });

    it("Should decrease total received value on refund", async function () {
      const tokenAddr = await erc1155Token.getAddress();

      await assuranceContract
        .connect(alice)
        .buyERC1155(alice.address, tokenAddr, [1], [2], "0x", {
          value: ethers.parseEther("2.0"),
        });

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
  });

  describe("Withdrawal", function () {
    beforeEach(async function () {
      const tokenAddr = await erc1155Token.getAddress();
      await assuranceContract
        .connect(owner)
        .setPricesERC1155(
          tokenAddr,
          [1],
          [ethers.parseEther("1.0")]
        );
    });

    it("Should allow withdrawal when threshold met", async function () {
      const tokenAddr = await erc1155Token.getAddress();

      // Buy tokens to meet threshold
      await assuranceContract
        .connect(alice)
        .buyERC1155(alice.address, tokenAddr, [1], [10], "0x", {
          value: ethers.parseEther("10.0"),
        });

      const recipientBalanceBefore = await ethers.provider.getBalance(
        recipient.address
      );

      await assuranceContract.connect(recipient).withdraw();

      const recipientBalanceAfter = await ethers.provider.getBalance(
        recipient.address
      );

      // Should have received approximately 10 ETH (minus gas)
      expect(recipientBalanceAfter).to.be.gt(recipientBalanceBefore);
    });

    it("Should emit AssuranceContractWithdrawal event", async function () {
      const tokenAddr = await erc1155Token.getAddress();

      await assuranceContract
        .connect(alice)
        .buyERC1155(alice.address, tokenAddr, [1], [10], "0x", {
          value: ethers.parseEther("10.0"),
        });

      await expect(assuranceContract.connect(recipient).withdraw())
        .to.emit(assuranceContract, "AssuranceContractWithdrawal")
        .withArgs(recipient.address, ethers.parseEther("10.0"));
    });

    it("Should reject withdrawal when threshold not met", async function () {
      const tokenAddr = await erc1155Token.getAddress();

      await assuranceContract
        .connect(alice)
        .buyERC1155(alice.address, tokenAddr, [1], [5], "0x", {
          value: ethers.parseEther("5.0"),
        });

      await expect(
        assuranceContract.connect(recipient).withdraw()
      ).to.be.revertedWith("Not enough funding received");
    });

    it("Should only allow recipient to trigger withdrawal when successful", async function () {
      const tokenAddr = await erc1155Token.getAddress();

      await assuranceContract
        .connect(alice)
        .buyERC1155(alice.address, tokenAddr, [1], [10], "0x", {
          value: ethers.parseEther("10.0"),
        });

      // Alice tries to trigger withdrawal (not recipient) - should fail
      await expect(
        assuranceContract.connect(alice).withdraw()
      ).to.be.revertedWith("Only recipient can withdraw");

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
        .setPricesERC1155(tokenAddr, [1], [ethers.parseEther("1.0")]);

      await assuranceContract
        .connect(alice)
        .buyERC1155(alice.address, tokenAddr, [1], [2], "0x", {
          value: ethers.parseEther("2.0"),
        });

      await assuranceContract
        .connect(alice)
        .buyERC1155(alice.address, tokenAddr, [1], [3], "0x", {
          value: ethers.parseEther("3.0"),
        });

      expect(await erc1155Token.balanceOf(alice.address, 1)).to.equal(5);
      expect(await assuranceContract.getAssuranceContractProgress()).to.equal(
        ethers.parseEther("5.0")
      );
    });

    it("Should allow buying after deadline (always allowed)", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      await assuranceContract
        .connect(owner)
        .setPricesERC1155(tokenAddr, [1], [ethers.parseEther("1.0")]);

      // Fast forward past deadline
      await hre.network.provider.send("evm_increaseTime", [86400]);
      await hre.network.provider.send("evm_mine");

      await expect(
        assuranceContract
          .connect(alice)
          .buyERC1155(alice.address, tokenAddr, [1], [1], "0x", {
            value: ethers.parseEther("1.0"),
          })
      ).to.not.be.reverted;
    });

    it("Should allow success after some refunds", async function () {
      const tokenAddr = await erc1155Token.getAddress();
      await assuranceContract
        .connect(owner)
        .setPricesERC1155(tokenAddr, [1], [ethers.parseEther("1.0")]);

      // Alice buys
      await assuranceContract
        .connect(alice)
        .buyERC1155(alice.address, tokenAddr, [1], [5], "0x", {
          value: ethers.parseEther("5.0"),
        });

      // Fast forward past deadline
      await hre.network.provider.send("evm_increaseTime", [86400]);
      await hre.network.provider.send("evm_mine");

      // Alice gets refund
      await erc1155Token
        .connect(alice)
        .setApprovalForAll(await assuranceContract.getAddress(), true);
      await assuranceContract
        .connect(alice)
        .refundERC1155(alice.address, tokenAddr, [1], [2], "0x");

      // Progress should be 3 ETH now
      expect(await assuranceContract.getAssuranceContractProgress()).to.equal(
        ethers.parseEther("3.0")
      );

      // Bob buys enough to reach threshold
      await assuranceContract
        .connect(bob)
        .buyERC1155(bob.address, tokenAddr, [1], [7], "0x", {
          value: ethers.parseEther("7.0"),
        });

      // Should now be successful
      await expect(assuranceContract.connect(recipient).withdraw()).to.not.be
        .reverted;
    });
  });
});
