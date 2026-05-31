import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

/**
 * ERC1155SecondaryMarket Edge Case Tests
 *
 * Covers secondary-market settlement edge cases from the automation backlog (section 11.4):
 * - Race conditions / concurrent operation edge cases
 * - Insufficient approval / balance scenarios
 * - Order exhaustion edge cases
 * - Cancellation during concurrent fulfillment attempts
 */

describe("ERC1155SecondaryMarket - Edge Cases", function () {
  let marketplace;
  let paymentToken;
  let erc1155Token;
  let alice, bob, charlie, dave;

  beforeEach(async function () {
    [alice, bob, charlie, dave] = await ethers.getSigners();

    const PremintingERC20 = await ethers.getContractFactory("PremintingERC20");
    paymentToken = await PremintingERC20.deploy(
      alice.address, "Payment", "PAY", "ipfs://pay"
    );
    for (const signer of [alice, bob, charlie, dave]) {
      await paymentToken.connect(alice).mint(signer.address, ethers.parseEther("1000"));
    }

    const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
    erc1155Token = await PremintingERC1155.deploy(
      alice.address, "https://x/{id}.json", "ipfs://x"
    );
    // Give tokens to multiple participants
    await erc1155Token.mintBatch(alice.address, [1, 2, 3], [50, 50, 50]);
    await erc1155Token.mintBatch(bob.address, [1, 2], [50, 50]);
    await erc1155Token.mintBatch(charlie.address, [1], [50]);

    const ERC1155SecondaryMarket = await ethers.getContractFactory("ERC1155SecondaryMarket");
    marketplace = await ERC1155SecondaryMarket.deploy(
      await erc1155Token.getAddress(),
      await paymentToken.getAddress()
    );
  });

  async function createListing(seller, tokenId, count, pricePerToken) {
    await erc1155Token.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
    const tx = await marketplace.connect(seller).createSaleListing(tokenId, count, pricePerToken);
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (log) => log.fragment && log.fragment.name === "SaleListingCreated"
    );
    return event.args[0]; // listingId
  }

  async function fulfillListing(buyer, listingId, count, expectedPrice) {
    const totalCost = BigInt(count) * BigInt(expectedPrice);
    await paymentToken.connect(buyer).approve(await marketplace.getAddress(), totalCost);
    return marketplace.connect(buyer).fulfillSaleListing(listingId, count, expectedPrice);
  }

  async function createBuyOrder(buyer, tokenId, count, pricePerToken) {
    const totalCost = BigInt(count) * BigInt(pricePerToken);
    await paymentToken.connect(buyer).approve(await marketplace.getAddress(), totalCost);
    return marketplace.connect(buyer).createBuyOrder(tokenId, count, pricePerToken);
  }

  async function getBuyOrderId(receipt) {
    for (const log of receipt.logs) {
      if (log.fragment && log.fragment.name === "BuyOrderCreated") {
        return log.args[0];
      }
    }
    return null;
  }

  async function fulfillBuyOrder(seller, orderId, count, expectedPrice) {
    await erc1155Token.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
    return marketplace.connect(seller).fulfillBuyOrder(orderId, count, expectedPrice);
  }

  describe("Sale listing edge cases", function () {
    it("rejects creating listing without ERC1155 approval", async function () {
      // Don't setApprovalForAll
      await expect(
        marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"))
      ).to.be.reverted; // ERC1155: caller is not approved
    });

    it("rejects fulfilling listing without payment token approval", async function () {
      const listingId = await createListing(alice, 1, 10, ethers.parseEther("0.1"));
      // Don't approve payment token
      await expect(
        marketplace.connect(bob).fulfillSaleListing(listingId, 1, ethers.parseEther("0.1"))
      ).to.be.reverted; // ERC20: insufficient allowance
    });

    it("rejects fulfilling listing with insufficient payment token balance", async function () {
      // Bob has 1000, but we need to spend more than that
      const highPrice = ethers.parseEther("600"); // 2 * 600 = 1200 > 1000
      const listingId = await createListing(alice, 1, 2, highPrice);
      await paymentToken.connect(bob).approve(await marketplace.getAddress(), highPrice * 2n);
      await expect(
        marketplace.connect(bob).fulfillSaleListing(listingId, 2, highPrice)
      ).to.be.reverted; // ERC20: transfer amount exceeds balance
    });

    it("listing seller still holds original balance minus escrowed amount", async function () {
      const balanceBefore = await erc1155Token.balanceOf(alice.address, 1);
      await createListing(alice, 1, 5, ethers.parseEther("0.1"));
      const balanceAfter = await erc1155Token.balanceOf(alice.address, 1);
      expect(balanceAfter).to.equal(balanceBefore - 5n);
    });

    it("two concurrent partial fulfillments from different buyers sum correctly", async function () {
      const listingId = await createListing(alice, 1, 10, ethers.parseEther("0.05"));

      const bobBalanceBefore = await erc1155Token.balanceOf(bob.address, 1);
      const charlieBalanceBefore = await erc1155Token.balanceOf(charlie.address, 1);

      await fulfillListing(bob, listingId, 4, ethers.parseEther("0.05"));
      await fulfillListing(charlie, listingId, 6, ethers.parseEther("0.05"));

      const listing = await marketplace.getSaleListing(listingId);
      expect(listing.seller).to.equal(ethers.ZeroAddress); // fully consumed

      // Both buyers got their tokens (on top of existing balances)
      expect(await erc1155Token.balanceOf(bob.address, 1)).to.equal(bobBalanceBefore + 4n);
      expect(await erc1155Token.balanceOf(charlie.address, 1)).to.equal(charlieBalanceBefore + 6n);
    });

    it("cancellation after partial fulfillment returns remaining to seller", async function () {
      const listingId = await createListing(alice, 1, 10, ethers.parseEther("0.05"));
      await fulfillListing(bob, listingId, 3, ethers.parseEther("0.05"));

      const balanceBeforeCancel = await erc1155Token.balanceOf(alice.address, 1);

      await marketplace.connect(alice).cancelSaleListing(listingId);

      const balanceAfterCancel = await erc1155Token.balanceOf(alice.address, 1);
      // 7 remaining tokens returned (10-3)
      expect(balanceAfterCancel - balanceBeforeCancel).to.equal(7);

      const listing = await marketplace.getSaleListing(listingId);
      expect(listing.seller).to.equal(ethers.ZeroAddress);
    });

    it("cannot fulfill already-cancelled listing", async function () {
      const listingId = await createListing(alice, 1, 10, ethers.parseEther("0.05"));
      await marketplace.connect(alice).cancelSaleListing(listingId);

      await expect(
        fulfillListing(bob, listingId, 1, ethers.parseEther("0.05"))
      ).to.be.revertedWithCustomError(marketplace, "ListingDoesNotExist");
    });

    it("multiple listings for different token IDs from same seller", async function () {
      const listing1Id = await createListing(alice, 1, 5, ethers.parseEther("0.1"));
      const listing2Id = await createListing(alice, 2, 5, ethers.parseEther("0.2"));

      const bobToken1Before = await erc1155Token.balanceOf(bob.address, 1);
      const bobToken2Before = await erc1155Token.balanceOf(bob.address, 2);

      await fulfillListing(bob, listing1Id, 3, ethers.parseEther("0.1"));
      await fulfillListing(bob, listing2Id, 2, ethers.parseEther("0.2"));

      expect(await erc1155Token.balanceOf(bob.address, 1)).to.equal(bobToken1Before + 3n);
      expect(await erc1155Token.balanceOf(bob.address, 2)).to.equal(bobToken2Before + 2n);

      // Cancelling one doesn't affect the other
      await marketplace.connect(alice).cancelSaleListing(listing1Id);
      const listing2 = await marketplace.getSaleListing(listing2Id);
      expect(listing2.seller).to.equal(alice.address);
      expect(listing2.count).to.equal(3); // 5 - 2
    });
  });

  describe("Buy order edge cases", function () {
    it("rejects creating buy order without payment approval", async function () {
      // Don't approve payment token
      await expect(
        marketplace.connect(bob).createBuyOrder(1, 10, ethers.parseEther("0.1"))
      ).to.be.reverted; // ERC20: insufficient allowance
    });

    it("rejects creating buy order with insufficient payment balance", async function () {
      // Bob has 1000, try to spend 2000
      const totalCost = ethers.parseEther("2000");
      await paymentToken.connect(bob).approve(await marketplace.getAddress(), totalCost);
      await expect(
        marketplace.connect(bob).createBuyOrder(1, 20, ethers.parseEther("100"))
      ).to.be.reverted; // ERC20: transfer amount exceeds balance
    });

    it("rejects fulfilling buy order without ERC1155 approval", async function () {
      const tx = await createBuyOrder(bob, 1, 5, ethers.parseEther("0.05"));
      const receipt = await tx.wait();
      const orderId = await getBuyOrderId(receipt);

      // Don't approve ERC1155
      await expect(
        marketplace.connect(alice).fulfillBuyOrder(orderId, 1, ethers.parseEther("0.05"))
      ).to.be.reverted; // ERC1155: caller is not approved
    });

    it("rejects fulfilling buy order when seller has insufficient token balance", async function () {
      const tx = await createBuyOrder(bob, 3, 5, ethers.parseEther("0.05")); // token ID 3, bob wants 5
      const receipt = await tx.wait();
      const orderId = await getBuyOrderId(receipt);

      // dave has no token ID 3
      await erc1155Token.connect(dave).setApprovalForAll(await marketplace.getAddress(), true);
      await expect(
        marketplace.connect(dave).fulfillBuyOrder(orderId, 1, ethers.parseEther("0.05"))
      ).to.be.reverted; // ERC1155: insufficient balance
    });

    it("buy order cancellation returns payment token after partial fulfillment", async function () {
      const price = ethers.parseEther("0.05");
      const totalCount = 5n;
      const sellCount = 2n;

      const tx = await createBuyOrder(bob, 1, totalCount, price);
      const receipt = await tx.wait();
      const orderId = await getBuyOrderId(receipt);

      // Alice sells 2 tokens
      await fulfillBuyOrder(alice, orderId, sellCount, price);

      const balanceBeforeCancel = await paymentToken.balanceOf(bob.address);

      // Bob cancels remaining 3
      await marketplace.connect(bob).cancelBuyOrder(orderId);

      const balanceAfterCancel = await paymentToken.balanceOf(bob.address);
      const expectedRefund = price * (totalCount - sellCount);
      expect(balanceAfterCancel - balanceBeforeCancel).to.equal(expectedRefund);
    });
  });

  describe("Cross-order interactions", function () {
    it("listing and buy order for same token ID coexist independently", async function () {
      // Alice lists at 0.1
      const listingId = await createListing(alice, 1, 5, ethers.parseEther("0.1"));

      // Bob creates buy order at 0.05 (different price)
      const boTx = await createBuyOrder(bob, 1, 5, ethers.parseEther("0.05"));
      const boReceipt = await boTx.wait();
      const orderId = await getBuyOrderId(boReceipt);

      // Both exist
      const listing = await marketplace.getSaleListing(listingId);
      const order = await marketplace.getBuyOrder(orderId);
      expect(listing.seller).to.equal(alice.address);
      expect(order.buyer).to.equal(bob.address);
    });

    it("seller can sell to a buy order from a different participant", async function () {
      // Bob creates buy order at 0.05
      const boTx = await createBuyOrder(bob, 1, 3, ethers.parseEther("0.05"));
      const boReceipt = await boTx.wait();
      const orderId = await getBuyOrderId(boReceipt);

      // Charlie sells to Bob's buy order
      await fulfillBuyOrder(charlie, orderId, 2, ethers.parseEther("0.05"));

      // Remaining count
      const order = await marketplace.getBuyOrder(orderId);
      expect(order.count).to.equal(1);

      expect(await paymentToken.balanceOf(charlie.address)).to.equal(
        ethers.parseEther("1000.1")
      );
      expect(order.buyer).to.equal(bob.address);
    });

    it("rejects fulfilling with zero count", async function () {
      const listingId = await createListing(alice, 1, 10, ethers.parseEther("0.1"));

      await expect(
        marketplace.connect(bob).fulfillSaleListing(listingId, 0, ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(marketplace, "InvalidCount");
    });

    it("rejects creating listing with zero price", async function () {
      await erc1155Token.connect(alice).setApprovalForAll(await marketplace.getAddress(), true);
      await expect(
        marketplace.connect(alice).createSaleListing(1, 10, 0)
      ).to.be.revertedWithCustomError(marketplace, "PriceMustBeGreaterThanZero");
    });

    it("order fulfillment after exhaustion rejects cleanly", async function () {
      const listingId = await createListing(alice, 1, 5, ethers.parseEther("0.05"));

      // First buyer takes all
      await fulfillListing(bob, listingId, 5, ethers.parseEther("0.05"));

      // Second buyer tries — listing no longer exists
      await expect(
        fulfillListing(charlie, listingId, 1, ethers.parseEther("0.05"))
      ).to.be.revertedWithCustomError(marketplace, "ListingDoesNotExist");
    });
  });
});
