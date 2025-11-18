import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("ERC1155Marketplace", function () {
  let marketplace;
  let token;
  let owner, alice, bob, charlie;

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await ethers.getSigners();

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
    const ERC1155Marketplace = await ethers.getContractFactory("ERC1155Marketplace");
    marketplace = await ERC1155Marketplace.deploy(await token.getAddress());
  });

  describe("Deployment", function () {
    it("Should emit ERC1155MarketplaceCreated event", async function () {
      const ERC1155Marketplace = await ethers.getContractFactory("ERC1155Marketplace");
      const tokenAddr = await token.getAddress();

      const newMarketplace = await ERC1155Marketplace.deploy(tokenAddr);

      await expect(newMarketplace.deploymentTransaction())
        .to.emit(newMarketplace, "ERC1155MarketplaceCreated")
        .withArgs(tokenAddr);
    });

    it("Should set the correct ERC1155 address", async function () {
      expect(await marketplace.erc1155()).to.equal(await token.getAddress());
    });
  });

  describe("Sale Listings", function () {
    beforeEach(async function () {
      await token.connect(alice).setApprovalForAll(await marketplace.getAddress(), true);
    });

    it("Should allow creating a sale listing", async function () {
      await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));

      const [seller, tokenId, count, price] = await marketplace.getSaleListing(0);
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
      ).to.be.revertedWith("Count must be greater than 0");
    });

    it("Should reject listing with zero price", async function () {
      await expect(
        marketplace.connect(alice).createSaleListing(1, 10, 0)
      ).to.be.revertedWith("Price must be greater than 0");
    });

    it("Should increment listing IDs", async function () {
      await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));
      await marketplace.connect(alice).createSaleListing(2, 20, ethers.parseEther("0.2"));

      const [seller1] = await marketplace.getSaleListing(0);
      const [seller2] = await marketplace.getSaleListing(1);

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

      await marketplace.connect(bob).fulfillSaleListing(0, 10, { value: cost });

      expect(await token.balanceOf(bob.address, 1)).to.equal(110);
      expect(await token.balanceOf(await marketplace.getAddress(), 1)).to.equal(0);
    });

    it("Should emit SaleListingFulfilled event", async function () {
      const cost = ethers.parseEther("1.0");

      await expect(
        marketplace.connect(bob).fulfillSaleListing(0, 10, { value: cost })
      )
        .to.emit(marketplace, "SaleListingFulfilled")
        .withArgs(0, bob.address, 10);
    });

    it("Should transfer payment to seller", async function () {
      const cost = ethers.parseEther("1.0");
      const balanceBefore = await ethers.provider.getBalance(alice.address);

      await marketplace.connect(bob).fulfillSaleListing(0, 10, { value: cost });

      const balanceAfter = await ethers.provider.getBalance(alice.address);
      expect(balanceAfter - balanceBefore).to.equal(cost);
    });

    it("Should allow partial fulfillment", async function () {
      const cost = ethers.parseEther("0.5"); // 5 * 0.1

      await marketplace.connect(bob).fulfillSaleListing(0, 5, { value: cost });

      expect(await token.balanceOf(bob.address, 1)).to.equal(105);

      const [, , count] = await marketplace.getSaleListing(0);
      expect(count).to.equal(5);
    });

    it("Should delete listing when fully fulfilled", async function () {
      const cost = ethers.parseEther("1.0");

      await marketplace.connect(bob).fulfillSaleListing(0, 10, { value: cost });

      const [seller] = await marketplace.getSaleListing(0);
      expect(seller).to.equal(ethers.ZeroAddress);
    });

    it("Should reject incorrect payment", async function () {
      const incorrectCost = ethers.parseEther("0.5");

      await expect(
        marketplace.connect(bob).fulfillSaleListing(0, 10, { value: incorrectCost })
      ).to.be.revertedWith("Incorrect payment");
    });

    it("Should reject zero count", async function () {
      await expect(
        marketplace.connect(bob).fulfillSaleListing(0, 0, { value: 0 })
      ).to.be.revertedWith("Invalid count");
    });

    it("Should reject count exceeding listing", async function () {
      await expect(
        marketplace.connect(bob).fulfillSaleListing(0, 11, {
          value: ethers.parseEther("1.1"),
        })
      ).to.be.revertedWith("Invalid count");
    });

    it("Should reject fulfilling non-existent listing", async function () {
      await expect(
        marketplace.connect(bob).fulfillSaleListing(999, 10, {
          value: ethers.parseEther("1.0"),
        })
      ).to.be.revertedWith("Listing does not exist");
    });
  });

  describe("Fulfilling Sale Listings To Recipient", function () {
    beforeEach(async function () {
      await token.connect(alice).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));
    });

    it("Should allow fulfilling to a specific recipient", async function () {
      const cost = ethers.parseEther("1.0");

      await marketplace
        .connect(bob)
        .fulfillSaleListingTo(0, 10, charlie.address, { value: cost });

      expect(await token.balanceOf(charlie.address, 1)).to.equal(10);
      expect(await token.balanceOf(bob.address, 1)).to.equal(100);
    });

    it("Should reject zero address recipient", async function () {
      const cost = ethers.parseEther("1.0");

      await expect(
        marketplace
          .connect(bob)
          .fulfillSaleListingTo(0, 10, ethers.ZeroAddress, { value: cost })
      ).to.be.revertedWith("Invalid recipient");
    });

    it("Should emit SaleListingFulfilled with buyer not recipient", async function () {
      const cost = ethers.parseEther("1.0");

      await expect(
        marketplace
          .connect(bob)
          .fulfillSaleListingTo(0, 10, charlie.address, { value: cost })
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

      const [seller] = await marketplace.getSaleListing(0);
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
      ).to.be.revertedWith("Not the seller");
    });

    it("Should reject cancelling non-existent listing", async function () {
      await expect(
        marketplace.connect(alice).cancelSaleListing(999)
      ).to.be.revertedWith("Listing does not exist");
    });
  });

  describe("Buy Orders", function () {
    it("Should allow creating a buy order", async function () {
      const cost = ethers.parseEther("1.0"); // 10 * 0.1

      await marketplace
        .connect(bob)
        .createBuyOrder(1, 10, ethers.parseEther("0.1"), { value: cost });

      const [buyer, tokenId, count, price] = await marketplace.getBuyOrder(0);
      expect(buyer).to.equal(bob.address);
      expect(tokenId).to.equal(1);
      expect(count).to.equal(10);
      expect(price).to.equal(ethers.parseEther("0.1"));
    });

    it("Should emit BuyOrderCreated event", async function () {
      const cost = ethers.parseEther("1.0");

      await expect(
        marketplace
          .connect(bob)
          .createBuyOrder(1, 10, ethers.parseEther("0.1"), { value: cost })
      )
        .to.emit(marketplace, "BuyOrderCreated")
        .withArgs(0, bob.address, 1, 10, ethers.parseEther("0.1"));
    });

    it("Should hold ETH in marketplace", async function () {
      const cost = ethers.parseEther("1.0");
      const marketplaceAddr = await marketplace.getAddress();

      await marketplace
        .connect(bob)
        .createBuyOrder(1, 10, ethers.parseEther("0.1"), { value: cost });

      expect(await ethers.provider.getBalance(marketplaceAddr)).to.equal(cost);
    });

    it("Should reject zero count", async function () {
      await expect(
        marketplace.connect(bob).createBuyOrder(1, 0, ethers.parseEther("0.1"), {
          value: 0,
        })
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should reject zero price", async function () {
      await expect(
        marketplace.connect(bob).createBuyOrder(1, 10, 0, { value: 0 })
      ).to.be.revertedWith("Must send ETH");
    });

    it("Should reject incorrect ETH amount", async function () {
      const incorrectAmount = ethers.parseEther("0.5");

      await expect(
        marketplace
          .connect(bob)
          .createBuyOrder(1, 10, ethers.parseEther("0.1"), {
            value: incorrectAmount,
          })
      ).to.be.revertedWith("Incorrect amount of ETH sent");
    });

    it("Should increment buy order IDs", async function () {
      const cost = ethers.parseEther("1.0");

      await marketplace
        .connect(bob)
        .createBuyOrder(1, 10, ethers.parseEther("0.1"), { value: cost });
      await marketplace
        .connect(bob)
        .createBuyOrder(2, 10, ethers.parseEther("0.1"), { value: cost });

      const [buyer1] = await marketplace.getBuyOrder(0);
      const [buyer2] = await marketplace.getBuyOrder(1);

      expect(buyer1).to.equal(bob.address);
      expect(buyer2).to.equal(bob.address);
    });
  });

  describe("Fulfilling Buy Orders", function () {
    beforeEach(async function () {
      const cost = ethers.parseEther("1.0");
      await marketplace
        .connect(bob)
        .createBuyOrder(1, 10, ethers.parseEther("0.1"), { value: cost });
      await token.connect(alice).setApprovalForAll(await marketplace.getAddress(), true);
    });

    it("Should allow fulfilling a buy order", async function () {
      await marketplace.connect(alice).fulfillBuyOrder(0, 10);

      expect(await token.balanceOf(bob.address, 1)).to.equal(110);
      expect(await token.balanceOf(alice.address, 1)).to.equal(90);
    });

    it("Should emit BuyOrderFulfilled event", async function () {
      await expect(marketplace.connect(alice).fulfillBuyOrder(0, 10))
        .to.emit(marketplace, "BuyOrderFulfilled")
        .withArgs(0, alice.address, 10);
    });

    it("Should transfer payment to seller", async function () {
      const balanceBefore = await ethers.provider.getBalance(alice.address);

      const tx = await marketplace.connect(alice).fulfillBuyOrder(0, 10);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(alice.address);
      const expectedGain = ethers.parseEther("1.0") - gasCost;

      expect(balanceAfter - balanceBefore).to.equal(expectedGain);
    });

    it("Should allow partial fulfillment", async function () {
      await marketplace.connect(alice).fulfillBuyOrder(0, 5);

      expect(await token.balanceOf(bob.address, 1)).to.equal(105);

      const [, , count] = await marketplace.getBuyOrder(0);
      expect(count).to.equal(5);
    });

    it("Should delete buy order when fully fulfilled", async function () {
      await marketplace.connect(alice).fulfillBuyOrder(0, 10);

      const [buyer] = await marketplace.getBuyOrder(0);
      expect(buyer).to.equal(ethers.ZeroAddress);
    });

    it("Should reject zero count", async function () {
      await expect(
        marketplace.connect(alice).fulfillBuyOrder(0, 0)
      ).to.be.revertedWith("Invalid count");
    });

    it("Should reject count exceeding order", async function () {
      await expect(
        marketplace.connect(alice).fulfillBuyOrder(0, 11)
      ).to.be.revertedWith("Invalid count");
    });

    it("Should reject fulfilling non-existent order", async function () {
      await expect(
        marketplace.connect(alice).fulfillBuyOrder(999, 10)
      ).to.be.revertedWith("Order does not exist");
    });
  });

  describe("Cancelling Buy Orders", function () {
    beforeEach(async function () {
      const cost = ethers.parseEther("1.0");
      await marketplace
        .connect(bob)
        .createBuyOrder(1, 10, ethers.parseEther("0.1"), { value: cost });
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
      const balanceBefore = await ethers.provider.getBalance(bob.address);

      const tx = await marketplace.connect(bob).cancelBuyOrder(0);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(bob.address);
      const expectedGain = ethers.parseEther("1.0") - gasCost;

      expect(balanceAfter - balanceBefore).to.equal(expectedGain);
    });

    it("Should reject non-buyer cancelling", async function () {
      await expect(
        marketplace.connect(alice).cancelBuyOrder(0)
      ).to.be.revertedWith("Not the buyer");
    });
  });

  describe("Edge Cases", function () {
    beforeEach(async function () {
      await token.connect(alice).setApprovalForAll(await marketplace.getAddress(), true);
    });

    it("Should handle multiple listings from same seller", async function () {
      await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));
      await marketplace.connect(alice).createSaleListing(2, 20, ethers.parseEther("0.2"));

      const [, tokenId1] = await marketplace.getSaleListing(0);
      const [, tokenId2] = await marketplace.getSaleListing(1);

      expect(tokenId1).to.equal(1);
      expect(tokenId2).to.equal(2);
    });

    it("Should handle listings from different sellers", async function () {
      await token.connect(bob).setApprovalForAll(await marketplace.getAddress(), true);

      await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));
      await marketplace.connect(bob).createSaleListing(1, 20, ethers.parseEther("0.2"));

      const [seller1] = await marketplace.getSaleListing(0);
      const [seller2] = await marketplace.getSaleListing(1);

      expect(seller1).to.equal(alice.address);
      expect(seller2).to.equal(bob.address);
    });

    it("Should handle cancelling after partial fulfillment", async function () {
      await marketplace.connect(alice).createSaleListing(1, 10, ethers.parseEther("0.1"));

      await marketplace.connect(bob).fulfillSaleListing(0, 5, {
        value: ethers.parseEther("0.5"),
      });

      await marketplace.connect(alice).cancelSaleListing(0);

      expect(await token.balanceOf(alice.address, 1)).to.equal(95);
    });

    it("Should handle multiple buy orders for same token", async function () {
      await marketplace
        .connect(bob)
        .createBuyOrder(1, 10, ethers.parseEther("0.1"), {
          value: ethers.parseEther("1.0"),
        });
      await marketplace
        .connect(charlie)
        .createBuyOrder(1, 5, ethers.parseEther("0.2"), {
          value: ethers.parseEther("1.0"),
        });

      const [buyer1] = await marketplace.getBuyOrder(0);
      const [buyer2] = await marketplace.getBuyOrder(1);

      expect(buyer1).to.equal(bob.address);
      expect(buyer2).to.equal(charlie.address);
    });
  });
});
