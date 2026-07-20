import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("PremintingERC1155", function () {
  let token;
  let owner, alice, bob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    const PremintingERC1155 = await ethers.getContractFactory("PremintingERC1155");
    token = await PremintingERC1155.deploy(
      owner.address,
      "https://example.com/metadata/{id}.json",
      "ipfs://QmProjectMetadata"
    );
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should set the URI", async function () {
      expect(await token.uri(1)).to.equal(
        "https://example.com/metadata/{id}.json"
      );
    });

    it("Should allow the owner to set standard per-token metadata URIs", async function () {
      const tokenURI = 'data:application/json,{"name":"Receipt #1","image":"ipfs://bafyimage"}';
      await expect(token.setTokenURI(1, tokenURI))
        .to.emit(token, "URI")
        .withArgs(tokenURI, 1);

      expect(await token.uri(1)).to.equal(tokenURI);
      expect(await token.uri(2)).to.equal("https://example.com/metadata/{id}.json");
    });

    it("Should reject non-owner per-token metadata updates", async function () {
      await expect(
        token.connect(alice).setTokenURI(1, "ipfs://metadata")
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("Should set the contract URI", async function () {
      expect(await token.contractURI()).to.equal("ipfs://QmProjectMetadata");
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint batch", async function () {
      await token.mintBatch(alice.address, [1, 2, 3], [10, 20, 30]);

      expect(await token.balanceOf(alice.address, 1)).to.equal(10);
      expect(await token.balanceOf(alice.address, 2)).to.equal(20);
      expect(await token.balanceOf(alice.address, 3)).to.equal(30);
    });

    it("Should emit URI events when minting", async function () {
      // The URI event is emitted with the token ID, and the contract emits it for each ID
      await expect(token.mintBatch(alice.address, [1, 2], [10, 20]))
        .to.emit(token, "URI");
      // Note: Testing specific args is tricky because the URI function returns the same
      // template for all IDs, so we just verify events are emitted
    });

    it("Should reject non-owner minting", async function () {
      await expect(
        token.connect(alice).mintBatch(alice.address, [1], [10])
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("Should allow minting same token ID multiple times (increases supply)", async function () {
      await token.mintBatch(alice.address, [1], [10]);
      await token.mintBatch(alice.address, [1], [5]);

      expect(await token.balanceOf(alice.address, 1)).to.equal(15);
    });

    it("Should allow minting to different addresses", async function () {
      await token.mintBatch(alice.address, [1], [10]);
      await token.mintBatch(bob.address, [1], [20]);

      expect(await token.balanceOf(alice.address, 1)).to.equal(10);
      expect(await token.balanceOf(bob.address, 1)).to.equal(20);
    });

    it("Should handle minting zero amounts", async function () {
      await token.mintBatch(alice.address, [1], [0]);
      expect(await token.balanceOf(alice.address, 1)).to.equal(0);
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      await token.mintBatch(alice.address, [1, 2], [100, 100]);
    });

    it("Should reject holder-to-holder transfers", async function () {
      await expect(token
        .connect(alice)
        .safeTransferFrom(alice.address, bob.address, 1, 10, "0x"))
        .to.be.revertedWithCustomError(token, "NonTransferableReceipt");
    });

    it("Should reject holder-to-holder batch transfers", async function () {
      await expect(token
        .connect(alice)
        .safeBatchTransferFrom(
          alice.address,
          bob.address,
          [1, 2],
          [10, 20],
          "0x"
        ))
        .to.be.revertedWithCustomError(token, "NonTransferableReceipt");
    });

    it("Should reject holder-to-holder transfers even with approval", async function () {
      await token.connect(alice).setApprovalForAll(bob.address, true);

      await expect(token
        .connect(bob)
        .safeTransferFrom(alice.address, bob.address, 1, 10, "0x"))
        .to.be.revertedWithCustomError(token, "NonTransferableReceipt");
    });

    it("Should allow owner-configured receipt bridge transfers", async function () {
      await token.connect(owner).setReceiptTransferBridge(alice.address, true);

      await token
        .connect(alice)
        .safeTransferFrom(alice.address, bob.address, 1, 10, "0x");

      expect(await token.balanceOf(alice.address, 1)).to.equal(90);
      expect(await token.balanceOf(bob.address, 1)).to.equal(10);
    });

    it("Should reject transfer without approval", async function () {
      await expect(
        token
          .connect(bob)
          .safeTransferFrom(alice.address, bob.address, 1, 10, "0x")
      ).to.be.revertedWithCustomError(token, "ERC1155MissingApprovalForAll");
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      await token.mintBatch(alice.address, [1, 2], [100, 100]);
    });

    it("Should allow token holder to burn their tokens", async function () {
      await token.connect(alice).burn(alice.address, 1, 50);

      expect(await token.balanceOf(alice.address, 1)).to.equal(50);
    });

    it("Should allow batch burning", async function () {
      await token.connect(alice).burnBatch(alice.address, [1, 2], [30, 40]);

      expect(await token.balanceOf(alice.address, 1)).to.equal(70);
      expect(await token.balanceOf(alice.address, 2)).to.equal(60);
    });

    it("Should allow burning with approval", async function () {
      await token.connect(alice).setApprovalForAll(bob.address, true);

      await token.connect(bob).burn(alice.address, 1, 50);

      expect(await token.balanceOf(alice.address, 1)).to.equal(50);
    });

    it("Should reject burning without approval", async function () {
      await expect(
        token.connect(bob).burn(alice.address, 1, 50)
      ).to.be.revertedWithCustomError(token, "ERC1155MissingApprovalForAll");
    });

    it("Should reject burning more than balance", async function () {
      await expect(
        token.connect(alice).burn(alice.address, 1, 101)
      ).to.be.revertedWithCustomError(token, "ERC1155InsufficientBalance");
    });
  });

  describe("Approval", function () {
    it("Should allow setting approval for all", async function () {
      await token.connect(alice).setApprovalForAll(bob.address, true);

      expect(await token.isApprovedForAll(alice.address, bob.address)).to.equal(
        true
      );
    });

    it("Should allow revoking approval", async function () {
      await token.connect(alice).setApprovalForAll(bob.address, true);
      await token.connect(alice).setApprovalForAll(bob.address, false);

      expect(await token.isApprovedForAll(alice.address, bob.address)).to.equal(
        false
      );
    });

    it("Should emit ApprovalForAll event", async function () {
      await expect(token.connect(alice).setApprovalForAll(bob.address, true))
        .to.emit(token, "ApprovalForAll")
        .withArgs(alice.address, bob.address, true);
    });
  });

  describe("Batch Balance", function () {
    beforeEach(async function () {
      await token.mintBatch(alice.address, [1, 2, 3], [10, 20, 30]);
      await token.mintBatch(bob.address, [1, 2, 3], [5, 15, 25]);
    });

    it("Should return batch balances", async function () {
      const balances = await token.balanceOfBatch(
        [alice.address, alice.address, alice.address],
        [1, 2, 3]
      );

      expect(balances[0]).to.equal(10);
      expect(balances[1]).to.equal(20);
      expect(balances[2]).to.equal(30);
    });

    it("Should handle batch balances for different addresses", async function () {
      const balances = await token.balanceOfBatch(
        [alice.address, bob.address, alice.address, bob.address],
        [1, 1, 2, 2]
      );

      expect(balances[0]).to.equal(10);
      expect(balances[1]).to.equal(5);
      expect(balances[2]).to.equal(20);
      expect(balances[3]).to.equal(15);
    });
  });

  describe("Ownership", function () {
    it("Should allow owner to transfer ownership", async function () {
      await token.connect(owner).transferOwnership(alice.address);

      expect(await token.owner()).to.equal(alice.address);
    });

    it("Should reject non-owner transferring ownership", async function () {
      await expect(
        token.connect(alice).transferOwnership(bob.address)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to renounce ownership", async function () {
      await token.connect(owner).renounceOwnership();

      expect(await token.owner()).to.equal(ethers.ZeroAddress);
    });

    it("Should prevent operations after renouncing ownership", async function () {
      await token.connect(owner).renounceOwnership();

      await expect(
        token.mintBatch(alice.address, [1], [10])
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle minting large quantities", async function () {
      const largeAmount = ethers.parseEther("1000000");

      await token.mintBatch(alice.address, [1], [largeAmount]);

      expect(await token.balanceOf(alice.address, 1)).to.equal(largeAmount);
    });

    it("Should handle many different token IDs", async function () {
      const ids = Array.from({ length: 50 }, (_, i) => i + 1);
      const amounts = Array.from({ length: 50 }, () => 100);

      await token.mintBatch(alice.address, ids, amounts);

      expect(await token.balanceOf(alice.address, 1)).to.equal(100);
      expect(await token.balanceOf(alice.address, 25)).to.equal(100);
      expect(await token.balanceOf(alice.address, 50)).to.equal(100);
    });

    it("Should return zero for zero address balance queries", async function () {
      // In ERC1155, balanceOf with zero address doesn't revert, it just returns 0
      // because zero address can't hold tokens
      expect(await token.balanceOf(ethers.ZeroAddress, 1)).to.equal(0);
    });

    it("Should return zero for non-existent token balances", async function () {
      expect(await token.balanceOf(alice.address, 999)).to.equal(0);
    });

    it("Should emit TransferSingle event on burn", async function () {
      await token.mintBatch(alice.address, [1], [100]);

      await expect(token.connect(alice).burn(alice.address, 1, 10))
        .to.emit(token, "TransferSingle")
        .withArgs(alice.address, alice.address, ethers.ZeroAddress, 1, 10);
    });

    it("Should emit TransferBatch event on batch burn", async function () {
      await token.mintBatch(alice.address, [1, 2], [100, 100]);

      await expect(token.connect(alice).burnBatch(alice.address, [1, 2], [10, 20]))
        .to.emit(token, "TransferBatch")
        .withArgs(alice.address, alice.address, ethers.ZeroAddress, [1, 2], [10, 20]);
    });
  });
});
