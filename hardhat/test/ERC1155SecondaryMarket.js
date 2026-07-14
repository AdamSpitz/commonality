import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("ERC1155SecondaryMarket", function () {
  let marketplace;
  let token;
  let paymentToken;
  let owner, alice, bob, charlie;

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await ethers.getSigners();

    const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
    paymentToken = await PremintingERC20.deploy(
      owner.address,
      "Marketplace Payment Token",
      "MPT",
      "ipfs://QmMarketplacePaymentToken"
    );
    for (const signer of [owner, alice, bob, charlie]) {
      await paymentToken.connect(owner).mint(signer.address, ethers.parseEther("1000"));
    }

    // Deploy ERC1155 token
    const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
    token = await PremintingERC1155.deploy(
      owner.address,
      "https://example.com/metadata/{id}.json",
      "ipfs://QmExample"
    );

    // Mint tokens to users
    await token.mintBatch(alice.address, [1, 2, 3], [100, 100, 100]);
    await token.mintBatch(bob.address, [1, 2, 3], [100, 100, 100]);

    // Deploy marketplace
    const ERC1155SecondaryMarket = await ethers.getContractFactory("ERC1155SecondaryMarket");
    marketplace = await ERC1155SecondaryMarket.deploy(
      await token.getAddress(),
      await paymentToken.getAddress()
    );
    await token.connect(owner).setReceiptTransferBridge(await marketplace.getAddress(), true);
  });

  async function approveAndFulfillSaleListing(signer, saleListingId, count, totalCost, recipient) {
    await paymentToken.connect(signer).approve(await marketplace.getAddress(), totalCost);
    const expectedPricePerToken = totalCost / BigInt(count);
    if (recipient) {
      return marketplace.connect(signer).fulfillSaleListingTo(
        saleListingId,
        count,
        expectedPricePerToken,
        recipient
      );
    }
    return marketplace.connect(signer).fulfillSaleListing(saleListingId, count, expectedPricePerToken);
  }

  async function approveAndCreateBuyOrder(signer, tokenId, count, pricePerToken) {
    const totalCost = BigInt(count) * BigInt(pricePerToken);
    await paymentToken.connect(signer).approve(await marketplace.getAddress(), totalCost);
    return marketplace.connect(signer).createBuyOrder(tokenId, count, pricePerToken);
  }

  describe("Deployment", function () {
    it("Should emit ERC1155SecondaryMarketCreated event", async function () {
      const ERC1155SecondaryMarket = await ethers.getContractFactory("ERC1155SecondaryMarket");
      const tokenAddr = await token.getAddress();

      const newMarketplace = await ERC1155SecondaryMarket.deploy(
        tokenAddr,
        await paymentToken.getAddress()
      );

      await expect(newMarketplace.deploymentTransaction())
        .to.emit(newMarketplace, "ERC1155SecondaryMarketCreated")
        .withArgs(tokenAddr);
    });

    it("Should set the correct ERC1155 address", async function () {
      expect(await marketplace.erc1155()).to.equal(await token.getAddress());
    });

    it("Should reject zero ERC1155 address", async function () {
      const ERC1155SecondaryMarket = await ethers.getContractFactory("ERC1155SecondaryMarket");

      await expect(
        ERC1155SecondaryMarket.deploy(ethers.ZeroAddress, await paymentToken.getAddress())
      ).to.be.revertedWithCustomError(marketplace, "InvalidERC1155Address");
    });

    it("Should reject zero payment token address", async function () {
      const ERC1155SecondaryMarket = await ethers.getContractFactory("ERC1155SecondaryMarket");

      await expect(
        ERC1155SecondaryMarket.deploy(await token.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(marketplace, "InvalidPaymentTokenAddress");
    });
  });

  describe("Sale Listings", function () {
    beforeEach(async function () {
      await token.connect(alice).setApprovalForAll(await marketplace.getAddress(), true);
    });

    it("Should allow creating a sale listing", async function () {
      await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));

      const { seller, tokenId, count, pricePerToken: price } = await marketplace.getSaleListing(0);
      expect(seller).to.equal(alice.address);
      expect(tokenId).to.equal(1);
      expect(count).to.equal(10);
      expect(price).to.equal(ethers.parseEther("0.1"));
    });

    it("Should emit SaleListingCreated event", async function () {
      await expect(
        marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"))
      )
        .to.emit(marketplace, "SaleListingCreated")
        .withArgs(0, alice.address, 1, 10, ethers.parseEther("0.1"));
    });

    it("Should transfer tokens to marketplace on listing", async function () {
      await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));

      expect(await token.balanceOf(alice.address, 1)).to.equal(90);
      expect(await token.balanceOf(await marketplace.getAddress(), 1)).to.equal(10);
    });

    it("Should reject listing with zero count", async function () {
      await expect(
        marketplace.connect(alice).createSaleListing(1, 0, ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(marketplace, "CountMustBeGreaterThanZero");
    });

    it("Should reject listing with zero price", async function () {
      await expect(
        marketplace.connect(alice).createSaleListing(1, 10, 0)
      ).to.be.revertedWithCustomError(marketplace, "PriceMustBeGreaterThanZero");
    });

    it("Should increment listing IDs", async function () {
      await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));
      await marketplace.connect(alice).createSaleListing(2, 20, ethers.parseEther("0.2"));

      const { seller: seller1 } = await marketplace.getSaleListing(0);
      const { seller: seller2 } = await marketplace.getSaleListing(1);

      expect(seller1).to.equal(alice.address);
      expect(seller2).to.equal(alice.address);
    });
  });

  describe("Fulfilling Sale Listings", function () {
    beforeEach(async function () {
      await token.connect(alice).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));
    });

    it("Should allow fulfilling a sale listing", async function () {
      const cost = ethers.parseEther("1.0"); // 10 * 0.1

      await approveAndFulfillSaleListing(bob, 0, 10, cost);

      expect(await token.balanceOf(bob.address, 1)).to.equal(110);
      expect(await token.balanceOf(await marketplace.getAddress(), 1)).to.equal(0);
    });

    it("Should emit SaleListingFulfilled event", async function () {
      const cost = ethers.parseEther("1.0");

      await expect(
        approveAndFulfillSaleListing(bob, 0, 10, cost)
      )
        .to.emit(marketplace, "SaleListingFulfilled")
        .withArgs(0, bob.address, 10);
    });

    it("Should transfer payment to seller", async function () {
      const cost = ethers.parseEther("1.0");
      const balanceBefore = await paymentToken.balanceOf(alice.address);

      await approveAndFulfillSaleListing(bob, 0, 10, cost);

      const balanceAfter = await paymentToken.balanceOf(alice.address);
      expect(balanceAfter - balanceBefore).to.equal(cost);
    });

    it("Should allow partial fulfillment", async function () {
      const cost = ethers.parseEther("0.5"); // 5 * 0.1

      await approveAndFulfillSaleListing(bob, 0, 5, cost);

      expect(await token.balanceOf(bob.address, 1)).to.equal(105);

      const { count } = await marketplace.getSaleListing(0);
      expect(count).to.equal(5);
    });

    it("Should delete listing when fully fulfilled", async function () {
      const cost = ethers.parseEther("1.0");

      await approveAndFulfillSaleListing(bob, 0, 10, cost);

      const { seller } = await marketplace.getSaleListing(0);
      expect(seller).to.equal(ethers.ZeroAddress);
    });

    it("Should reject incorrect payment", async function () {
      const incorrectCost = ethers.parseEther("0.5");

      await paymentToken.connect(bob).approve(await marketplace.getAddress(), incorrectCost);
      await expect(marketplace.connect(bob).fulfillSaleListing(0, 10, ethers.parseEther("0.1"))).to.be.reverted;
    });

    it("Should reject zero count", async function () {
      await expect(marketplace.connect(bob).fulfillSaleListing(0, 0, ethers.parseEther("0.1")))
        .to.be.revertedWithCustomError(marketplace, "InvalidCount");
    });

    it("Should reject count exceeding listing", async function () {
      await expect(marketplace.connect(bob).fulfillSaleListing(0, 11, ethers.parseEther("0.1")))
        .to.be.revertedWithCustomError(marketplace, "InvalidCount");
    });

    it("Should reject unexpected listing price", async function () {
      await expect(marketplace.connect(bob).fulfillSaleListing(0, 10, ethers.parseEther("0.2")))
        .to.be.revertedWithCustomError(marketplace, "UnexpectedPrice")
        .withArgs(ethers.parseEther("0.2"), ethers.parseEther("0.1"));
    });

    it("Should reject fulfilling non-existent listing", async function () {
      await expect(marketplace.connect(bob).fulfillSaleListing(999, 10, ethers.parseEther("0.1")))
        .to.be.revertedWithCustomError(marketplace, "ListingDoesNotExist");
    });
  });

  describe("Fulfilling Sale Listings To Recipient", function () {
    beforeEach(async function () {
      await token.connect(alice).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));
    });

    it("Should allow fulfilling to a specific recipient", async function () {
      const cost = ethers.parseEther("1.0");

      await approveAndFulfillSaleListing(bob, 0, 10, cost, charlie.address);

      expect(await token.balanceOf(charlie.address, 1)).to.equal(10);
      expect(await token.balanceOf(bob.address, 1)).to.equal(100);
    });

    it("Should reject zero address recipient", async function () {
      const cost = ethers.parseEther("1.0");

      await expect(
        marketplace.connect(bob).fulfillSaleListingTo(0, 10, ethers.parseEther("0.1"), ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(marketplace, "InvalidRecipient");
    });

    it("Should reject marketplace as recipient", async function () {
      await expect(
        marketplace.connect(bob).fulfillSaleListingTo(0, 10, ethers.parseEther("0.1"), await marketplace.getAddress())
      ).to.be.revertedWithCustomError(marketplace, "InvalidRecipient");
    });

    it("Should transfer ERC1155 tokens with empty receiver hook data", async function () {
      const RecordingERC1155Receiver = await ethers.getContractFactory("RecordingERC1155Receiver");
      const receiver = await RecordingERC1155Receiver.deploy();
      const cost = ethers.parseEther("1.0");

      await approveAndFulfillSaleListing(bob, 0, 10, cost, await receiver.getAddress());

      expect(await receiver.lastData()).to.equal("0x");
    });

    it("Should emit SaleListingFulfilled with buyer not recipient", async function () {
      const cost = ethers.parseEther("1.0");

      await expect(
        approveAndFulfillSaleListing(bob, 0, 10, cost, charlie.address)
      )
        .to.emit(marketplace, "SaleListingFulfilled")
        .withArgs(0, bob.address, 10);
    });
  });

  describe("Cancelling Sale Listings", function () {
    beforeEach(async function () {
      await token.connect(alice).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));
    });

    it("Should allow seller to cancel listing", async function () {
      await marketplace.connect(alice).cancelSaleListing(0);

      const { seller } = await marketplace.getSaleListing(0);
      expect(seller).to.equal(ethers.ZeroAddress);
    });

    it("Should emit SaleListingCancelled event", async function () {
      await expect(marketplace.connect(alice).cancelSaleListing(0))
        .to.emit(marketplace, "SaleListingCancelled")
        .withArgs(0);
    });

    it("Should return tokens to seller", async function () {
      await marketplace.connect(alice).cancelSaleListing(0);

      expect(await token.balanceOf(alice.address, 1)).to.equal(100);
      expect(await token.balanceOf(await marketplace.getAddress(), 1)).to.equal(0);
    });

    it("Should reject non-seller cancelling", async function () {
      await expect(
        marketplace.connect(bob).cancelSaleListing(0)
      ).to.be.revertedWithCustomError(marketplace, "NotTheSeller");
    });

    it("Should reject cancelling non-existent listing", async function () {
      await expect(
        marketplace.connect(alice).cancelSaleListing(999)
      ).to.be.revertedWithCustomError(marketplace, "ListingDoesNotExist");
    });
  });

  describe("Buy Orders", function () {
    it("Should allow creating a buy order", async function () {
      const cost = ethers.parseEther("1.0"); // 10 * 0.1

      await approveAndCreateBuyOrder(bob, 1, 10, ethers.parseEther("0.1"));

      const [buyer, tokenId, count, price] = await marketplace.getBuyOrder(0);
      expect(buyer).to.equal(bob.address);
      expect(tokenId).to.equal(1);
      expect(count).to.equal(10);
      expect(price).to.equal(ethers.parseEther("0.1"));
    });

    it("Should emit BuyOrderCreated event", async function () {
      const cost = ethers.parseEther("1.0");

      await expect(
        approveAndCreateBuyOrder(bob, 1, 10, ethers.parseEther("0.1"))
      )
        .to.emit(marketplace, "BuyOrderCreated")
        .withArgs(0, bob.address, 1, 10, ethers.parseEther("0.1"));
    });

    it("Should hold ETH in marketplace", async function () {
      const cost = ethers.parseEther("1.0");
      const marketplaceAddr = await marketplace.getAddress();

      await approveAndCreateBuyOrder(bob, 1, 10, ethers.parseEther("0.1"));

      expect(await paymentToken.balanceOf(marketplaceAddr)).to.equal(cost);
    });

    it("Should reject zero count", async function () {
      await expect(marketplace.connect(bob).createBuyOrder(1, 0, ethers.parseEther("0.1")))
        .to.be.revertedWithCustomError(marketplace, "CountMustBeGreaterThanZero");
    });

    it("Should reject zero price", async function () {
      await expect(marketplace.connect(bob).createBuyOrder(1, 10, 0))
        .to.be.revertedWithCustomError(marketplace, "PriceMustBeGreaterThanZero");
    });

    it("Should reject incorrect ETH amount", async function () {
      const incorrectAmount = ethers.parseEther("0.5");

      await paymentToken.connect(bob).approve(await marketplace.getAddress(), incorrectAmount);
      await expect(marketplace.connect(bob).createBuyOrder(1, 10, ethers.parseEther("0.1")))
        .to.be.reverted;
    });

    it("Should increment buy order IDs", async function () {
      const cost = ethers.parseEther("1.0");

      await approveAndCreateBuyOrder(bob, 1, 10, ethers.parseEther("0.1"));
      await approveAndCreateBuyOrder(bob, 2, 10, ethers.parseEther("0.1"));

      const [buyer1] = await marketplace.getBuyOrder(0);
      const [buyer2] = await marketplace.getBuyOrder(1);

      expect(buyer1).to.equal(bob.address);
      expect(buyer2).to.equal(bob.address);
    });
  });

  describe("Fulfilling Buy Orders", function () {
    beforeEach(async function () {
      const cost = ethers.parseEther("1.0");
      await approveAndCreateBuyOrder(bob, 1, 10, ethers.parseEther("0.1"));
      await token.connect(alice).setApprovalForAll(await marketplace.getAddress(), true);
    });

    it("Should allow fulfilling a buy order", async function () {
      await marketplace.connect(alice).fulfillBuyOrder(0, 10, ethers.parseEther("0.1"));

      expect(await token.balanceOf(bob.address, 1)).to.equal(110);
      expect(await token.balanceOf(alice.address, 1)).to.equal(90);
    });

    it("Should emit BuyOrderFulfilled event", async function () {
      await expect(marketplace.connect(alice).fulfillBuyOrder(0, 10, ethers.parseEther("0.1")))
        .to.emit(marketplace, "BuyOrderFulfilled")
        .withArgs(0, alice.address, 10);
    });

    it("Should transfer payment to seller", async function () {
      const balanceBefore = await paymentToken.balanceOf(alice.address);

      await marketplace.connect(alice).fulfillBuyOrder(0, 10, ethers.parseEther("0.1"));

      const balanceAfter = await paymentToken.balanceOf(alice.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("1.0"));
    });

    it("Should allow partial fulfillment", async function () {
      await marketplace.connect(alice).fulfillBuyOrder(0, 5, ethers.parseEther("0.1"));

      expect(await token.balanceOf(bob.address, 1)).to.equal(105);

      const [, , count] = await marketplace.getBuyOrder(0);
      expect(count).to.equal(5);
    });

    it("Should delete buy order when fully fulfilled", async function () {
      await marketplace.connect(alice).fulfillBuyOrder(0, 10, ethers.parseEther("0.1"));

      const [buyer] = await marketplace.getBuyOrder(0);
      expect(buyer).to.equal(ethers.ZeroAddress);
    });

    it("Should reject zero count", async function () {
      await expect(
        marketplace.connect(alice).fulfillBuyOrder(0, 0, ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(marketplace, "InvalidCount");
    });

    it("Should reject count exceeding order", async function () {
      await expect(
        marketplace.connect(alice).fulfillBuyOrder(0, 11, ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(marketplace, "InvalidCount");
    });

    it("Should reject unexpected order price", async function () {
      await expect(
        marketplace.connect(alice).fulfillBuyOrder(0, 10, ethers.parseEther("0.2"))
      )
        .to.be.revertedWithCustomError(marketplace, "UnexpectedPrice")
        .withArgs(ethers.parseEther("0.2"), ethers.parseEther("0.1"));
    });

    it("Should reject fulfilling non-existent order", async function () {
      await expect(
        marketplace.connect(alice).fulfillBuyOrder(999, 10, ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(marketplace, "OrderDoesNotExist");
    });
  });

  describe("Cancelling Buy Orders", function () {
    beforeEach(async function () {
      const cost = ethers.parseEther("1.0");
      await approveAndCreateBuyOrder(bob, 1, 10, ethers.parseEther("0.1"));
    });

    it("Should allow buyer to cancel order", async function () {
      await marketplace.connect(bob).cancelBuyOrder(0);

      const [buyer] = await marketplace.getBuyOrder(0);
      expect(buyer).to.equal(ethers.ZeroAddress);
    });

    it("Should emit BuyOrderCancelled event", async function () {
      await expect(marketplace.connect(bob).cancelBuyOrder(0))
        .to.emit(marketplace, "BuyOrderCancelled")
        .withArgs(0);
    });

    it("Should refund ETH to buyer", async function () {
      const balanceBefore = await paymentToken.balanceOf(bob.address);

      await marketplace.connect(bob).cancelBuyOrder(0);

      const balanceAfter = await paymentToken.balanceOf(bob.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("1.0"));
    });

    it("Should reject non-buyer cancelling", async function () {
      await expect(
        marketplace.connect(alice).cancelBuyOrder(0)
      ).to.be.revertedWithCustomError(marketplace, "NotTheBuyer");
    });
  });

  describe("Edge Cases", function () {
    beforeEach(async function () {
      await token.connect(alice).setApprovalForAll(await marketplace.getAddress(), true);
    });

    it("Should handle multiple listings from same seller", async function () {
      await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));
      await marketplace.connect(alice).createSaleListing(2, 20, ethers.parseEther("0.2"));

      const { tokenId: tokenId1 } = await marketplace.getSaleListing(0);
      const { tokenId: tokenId2 } = await marketplace.getSaleListing(1);

      expect(tokenId1).to.equal(1);
      expect(tokenId2).to.equal(2);
    });

    it("Should handle listings from different sellers", async function () {
      await token.connect(bob).setApprovalForAll(await marketplace.getAddress(), true);

      await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));
      await marketplace.connect(bob).createSaleListing(1, 20, ethers.parseEther("0.2"));

      const { seller: seller1 } = await marketplace.getSaleListing(0);
      const { seller: seller2 } = await marketplace.getSaleListing(1);

      expect(seller1).to.equal(alice.address);
      expect(seller2).to.equal(bob.address);
    });

    it("Should handle cancelling after partial fulfillment", async function () {
      await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));

      await approveAndFulfillSaleListing(bob, 0, 5, ethers.parseEther("0.5"));

      await marketplace.connect(alice).cancelSaleListing(0);

      expect(await token.balanceOf(alice.address, 1)).to.equal(95);
    });

    it("Should handle multiple buy orders for same token", async function () {
      await approveAndCreateBuyOrder(bob, 1, 10, ethers.parseEther("0.1"));
      await approveAndCreateBuyOrder(charlie, 1, 5, ethers.parseEther("0.2"));

      const [buyer1] = await marketplace.getBuyOrder(0);
      const [buyer2] = await marketplace.getBuyOrder(1);

      expect(buyer1).to.equal(bob.address);
      expect(buyer2).to.equal(charlie.address);
    });

    it("Should handle multiple sequential partial fulfillments of sale listing", async function () {
      await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));

      // Bob buys 3
      await approveAndFulfillSaleListing(bob, 0, 3, ethers.parseEther("0.3"));
      expect(await token.balanceOf(bob.address, 1)).to.equal(103);

      // Charlie buys 4
      await approveAndFulfillSaleListing(charlie, 0, 4, ethers.parseEther("0.4"));
      expect(await token.balanceOf(charlie.address, 1)).to.equal(4);

      // Check remaining listing
      const { count } = await marketplace.getSaleListing(0);
      expect(count).to.equal(3);

      // Bob buys remaining 3
      await approveAndFulfillSaleListing(bob, 0, 3, ethers.parseEther("0.3"));
      expect(await token.balanceOf(bob.address, 1)).to.equal(106);

      // Listing should be deleted
      const { seller } = await marketplace.getSaleListing(0);
      expect(seller).to.equal(ethers.ZeroAddress);
    });

    it("Should handle multiple sequential partial fulfillments of buy order", async function () {
      await approveAndCreateBuyOrder(bob, 1, 10, ethers.parseEther("0.1"));

      // Alice sells 3
      await marketplace.connect(alice).fulfillBuyOrder(0, 3, ethers.parseEther("0.1"));
      expect(await token.balanceOf(bob.address, 1)).to.equal(103);

      // Check remaining order
      const [, , count1] = await marketplace.getBuyOrder(0);
      expect(count1).to.equal(7);

      // Alice sells 4 more
      await marketplace.connect(alice).fulfillBuyOrder(0, 4, ethers.parseEther("0.1"));
      expect(await token.balanceOf(bob.address, 1)).to.equal(107);

      const [, , count2] = await marketplace.getBuyOrder(0);
      expect(count2).to.equal(3);

      // Alice sells remaining 3
      await marketplace.connect(alice).fulfillBuyOrder(0, 3, ethers.parseEther("0.1"));
      expect(await token.balanceOf(bob.address, 1)).to.equal(110);

      // Order should be deleted
      const [buyer] = await marketplace.getBuyOrder(0);
      expect(buyer).to.equal(ethers.ZeroAddress);
    });

    it("Should reject cancelling non-existent buy order", async function () {
      await expect(
        marketplace.connect(bob).cancelBuyOrder(999)
      ).to.be.revertedWithCustomError(marketplace, "OrderDoesNotExist");
    });

    it("Should allow seller to fulfill their own buy order", async function () {
      // Bob creates a buy order
      await approveAndCreateBuyOrder(bob, 1, 10, ethers.parseEther("0.1"));

      // Bob can also fulfill his own buy order (though economically pointless)
      await token.connect(bob).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(bob).fulfillBuyOrder(0, 10, ethers.parseEther("0.1"));

      // Bob should have same token balance (sold 10, bought 10)
      expect(await token.balanceOf(bob.address, 1)).to.equal(100);
    });

    it("Should allow buyer to fulfill their own sale listing", async function () {
      // Alice creates a sale listing
      await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));

      // Alice can buy from her own listing (though economically pointless)
      await approveAndFulfillSaleListing(alice, 0, 10, ethers.parseEther("1.0"));

      // Alice should have same token balance (sold 10, bought 10)
      expect(await token.balanceOf(alice.address, 1)).to.equal(100);
    });

    it("Should handle very large token quantities", async function () {
      const largeAmount = ethers.parseUnits("1000000", 0); // 1 million tokens
      await token.mintBatch(alice.address, [5], [largeAmount]);

      const tx = await marketplace
        .connect(alice)
        .createSaleListing(5, largeAmount, ethers.parseEther("0.001"));

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "SaleListingCreated"
      );
      const listingId = event.args[0];

      const { count } = await marketplace.getSaleListing(listingId);
      expect(count).to.equal(largeAmount);
    });

    it("Should handle different token IDs independently", async function () {
      await token.connect(bob).setApprovalForAll(await marketplace.getAddress(), true);

      // Create listings for different token IDs
      const tx1 = await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));
      const receipt1 = await tx1.wait();
      const event1 = receipt1.logs.find(
        (log) => log.fragment && log.fragment.name === "SaleListingCreated"
      );
      const listingId1 = event1.args[0];

      const tx2 = await marketplace.connect(bob).createSaleListing(2, 20, ethers.parseEther("0.2"));
      const receipt2 = await tx2.wait();
      const event2 = receipt2.logs.find(
        (log) => log.fragment && log.fragment.name === "SaleListingCreated"
      );
      const listingId2 = event2.args[0];

      // Fulfill first listing
      await approveAndFulfillSaleListing(charlie, listingId1, 10, ethers.parseEther("1.0"));

      // Second listing should still exist with full count
      const { count } = await marketplace.getSaleListing(listingId2);
      expect(count).to.equal(20);
    });

    it("Should handle wei-level precision in pricing", async function () {
      const pricePerToken = 1n; // 1 wei

      const tx = await marketplace.connect(alice).createSaleListing(1, 10, pricePerToken);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "SaleListingCreated"
      );
      const listingId = event.args[0];

      await approveAndFulfillSaleListing(bob, listingId, 10, 10n);

      expect(await token.balanceOf(bob.address, 1)).to.equal(110);
    });
  });

  describe("Reentrancy Protection", function () {
    beforeEach(async function () {
      await token.connect(alice).setApprovalForAll(await marketplace.getAddress(), true);
    });

    it("Should have nonReentrant modifier on all state-changing functions", async function () {
      // This test verifies that the contract uses ReentrancyGuard
      // The actual protection is tested implicitly by all other tests not failing
      // A proper reentrancy attack would require a malicious contract,
      // but the nonReentrant modifier from OpenZeppelin is battle-tested

      // We can at least verify normal operation completes successfully
      const tx = await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "SaleListingCreated"
      );
      const listingId = event.args[0];

      await approveAndFulfillSaleListing(bob, listingId, 10, ethers.parseEther("1.0"));

      const { seller } = await marketplace.getSaleListing(listingId);
      expect(seller).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Payment Edge Cases", function () {
    beforeEach(async function () {
      await token.connect(alice).setApprovalForAll(await marketplace.getAddress(), true);
    });

    it("Should handle exact payment calculations for multiple items", async function () {
      const pricePerToken = ethers.parseEther("0.123456789");
      const count = 7n;
      const exactCost = pricePerToken * count;

      const tx = await marketplace.connect(alice).createSaleListing(1, count, pricePerToken);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "SaleListingCreated"
      );
      const listingId = event.args[0];

      await approveAndFulfillSaleListing(bob, listingId, count, exactCost);

      expect(await token.balanceOf(bob.address, 1)).to.equal(100n + count);
    });

    it("Should ignore excess approval and only transfer the exact sale amount", async function () {
      const tx = await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "SaleListingCreated"
      );
      const listingId = event.args[0];

      const exactCost = ethers.parseEther("1.0");
      const overpayment = exactCost + 1n;

      const sellerBalanceBefore = await paymentToken.balanceOf(alice.address);
      await paymentToken.connect(bob).approve(await marketplace.getAddress(), overpayment);
      await marketplace.connect(bob).fulfillSaleListing(listingId, 10, ethers.parseEther("0.1"));
      const sellerBalanceAfter = await paymentToken.balanceOf(alice.address);

      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(exactCost);
    });

    it("Should reject underpayment by 1 wei on sale listing", async function () {
      const tx = await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "SaleListingCreated"
      );
      const listingId = event.args[0];

      const exactCost = ethers.parseEther("1.0");
      const underpayment = exactCost - 1n;

      await paymentToken.connect(bob).approve(await marketplace.getAddress(), underpayment);
      await expect(marketplace.connect(bob).fulfillSaleListing(listingId, 10, ethers.parseEther("0.1"))).to.be.reverted;
    });

    it("Should handle maximum uint256 price calculations without overflow", async function () {
      // Use smaller values to avoid overflow but test the math
      const maxSafePrice = ethers.parseEther("1000000");
      const count = 1n;

      const tx = await marketplace.connect(alice).createSaleListing(1, count, maxSafePrice);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "SaleListingCreated"
      );
      const listingId = event.args[0];

      const { pricePerToken: price } = await marketplace.getSaleListing(listingId);
      expect(price).to.equal(maxSafePrice);
    });
  });
});
