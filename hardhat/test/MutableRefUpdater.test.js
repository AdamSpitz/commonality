import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("MutableRefUpdater", function () {
  let mutableRefUpdater;
  let alice, bob, charlie;

  beforeEach(async function () {
    [alice, bob, charlie] = await ethers.getSigners();
    const MutableRefUpdater = await ethers.getContractFactory("MutableRefUpdater");
    mutableRefUpdater = await MutableRefUpdater.deploy();
  });

  describe("Basic functionality", function () {
    it("Should create and retrieve a new ref", async function () {
      const refName = "my-statements";
      const refValue = "QmTest123";

      await mutableRefUpdater.connect(alice).updateRef(refName, refValue);

      const retrieved = await mutableRefUpdater.getRef(alice.address, refName);
      expect(retrieved).to.equal(refValue);
    });

    it("Should update an existing ref", async function () {
      const refName = "my-statements";
      const refValue1 = "QmTest123";
      const refValue2 = "QmTest456";

      await mutableRefUpdater.connect(alice).updateRef(refName, refValue1);
      await mutableRefUpdater.connect(alice).updateRef(refName, refValue2);

      const retrieved = await mutableRefUpdater.getRef(alice.address, refName);
      expect(retrieved).to.equal(refValue2);
    });

    it("Should return empty string for non-existent ref", async function () {
      const retrieved = await mutableRefUpdater.getRef(alice.address, "nonexistent");
      expect(retrieved).to.equal("");
    });

    it("Should emit RefUpdated event when creating ref", async function () {
      const refName = "my-statements";
      const refValue = "QmTest123";

      await expect(mutableRefUpdater.connect(alice).updateRef(refName, refValue))
        .to.emit(mutableRefUpdater, "RefUpdated")
        .withArgs(alice.address, refName, refValue);
    });

    it("Should emit RefUpdated event when updating ref", async function () {
      const refName = "my-statements";
      const refValue1 = "QmTest123";
      const refValue2 = "QmTest456";

      await mutableRefUpdater.connect(alice).updateRef(refName, refValue1);

      await expect(mutableRefUpdater.connect(alice).updateRef(refName, refValue2))
        .to.emit(mutableRefUpdater, "RefUpdated")
        .withArgs(alice.address, refName, refValue2);
    });
  });

  describe("Multi-user scenarios", function () {
    it("Should keep refs independent between users", async function () {
      const refName = "my-statements";
      const aliceValue = "QmAlice123";
      const bobValue = "QmBob456";

      await mutableRefUpdater.connect(alice).updateRef(refName, aliceValue);
      await mutableRefUpdater.connect(bob).updateRef(refName, bobValue);

      const aliceRetrieved = await mutableRefUpdater.getRef(alice.address, refName);
      const bobRetrieved = await mutableRefUpdater.getRef(bob.address, refName);

      expect(aliceRetrieved).to.equal(aliceValue);
      expect(bobRetrieved).to.equal(bobValue);
    });

    it("Should allow same ref name for different users without interference", async function () {
      const refName = "created-statements";

      await mutableRefUpdater.connect(alice).updateRef(refName, "QmAlice1");
      await mutableRefUpdater.connect(bob).updateRef(refName, "QmBob1");
      await mutableRefUpdater.connect(charlie).updateRef(refName, "QmCharlie1");

      expect(await mutableRefUpdater.getRef(alice.address, refName)).to.equal("QmAlice1");
      expect(await mutableRefUpdater.getRef(bob.address, refName)).to.equal("QmBob1");
      expect(await mutableRefUpdater.getRef(charlie.address, refName)).to.equal("QmCharlie1");
    });

    it("Should allow multiple refs per user", async function () {
      await mutableRefUpdater.connect(alice).updateRef("created-statements", "QmCreated");
      await mutableRefUpdater.connect(alice).updateRef("bookmarked-statements", "QmBookmarked");
      await mutableRefUpdater.connect(alice).updateRef("draft-statements", "QmDraft");

      expect(await mutableRefUpdater.getRef(alice.address, "created-statements")).to.equal("QmCreated");
      expect(await mutableRefUpdater.getRef(alice.address, "bookmarked-statements")).to.equal("QmBookmarked");
      expect(await mutableRefUpdater.getRef(alice.address, "draft-statements")).to.equal("QmDraft");
    });
  });

  describe("Edge cases", function () {
    it("Should handle empty string values", async function () {
      const refName = "my-ref";

      // Set to non-empty first
      await mutableRefUpdater.connect(alice).updateRef(refName, "QmTest123");
      expect(await mutableRefUpdater.getRef(alice.address, refName)).to.equal("QmTest123");

      // Update to empty string
      await mutableRefUpdater.connect(alice).updateRef(refName, "");
      expect(await mutableRefUpdater.getRef(alice.address, refName)).to.equal("");
    });

    it("Should handle special characters in ref names", async function () {
      const specialNames = [
        "my-statements",
        "my_statements",
        "my.statements",
        "commonality:created-statements",
        "app/feature/ref-name"
      ];

      for (const name of specialNames) {
        await mutableRefUpdater.connect(alice).updateRef(name, `Value-${name}`);
        const retrieved = await mutableRefUpdater.getRef(alice.address, name);
        expect(retrieved).to.equal(`Value-${name}`);
      }
    });

    it("Should handle long ref values", async function () {
      // IPFS CIDv1 can be quite long, plus we might store JSON with multiple CIDs
      // please use actual long CID values
      const longValue = ["bafybeigdyrzt5sfp7edupa6g6csmvofsnquhcsstrmfe737k63zgla52gq", "bafybeihdwdcefgh4dqkjv67uuc9sywrbrmdn23ai8momj7ci7bouq6mjq", "bafybeigvgzoolc6oj6wstg6xv4nahyomkptlzfp35ghnik4jefe5gzlwe", "bafybeihyrpefgqwz3vvsnwvm7v7ajaajfd3ombkeyivziit52ujanuqd4"].join(",");

      await mutableRefUpdater.connect(alice).updateRef("long-ref", longValue);
      const retrieved = await mutableRefUpdater.getRef(alice.address, "long-ref");
      expect(retrieved).to.equal(longValue);
    });

    it("Should handle Unicode characters in ref names and values", async function () {
      const unicodeName = "my-statements-🚀";
      const unicodeValue = "Qm-value-with-emoji-✨";

      await mutableRefUpdater.connect(alice).updateRef(unicodeName, unicodeValue);
      const retrieved = await mutableRefUpdater.getRef(alice.address, unicodeName);
      expect(retrieved).to.equal(unicodeValue);
    });
  });

  describe("Event emissions", function () {
    it("Should emit events in correct order for multiple updates", async function () {
      const refName = "my-statements";

      const tx1 = await mutableRefUpdater.connect(alice).updateRef(refName, "v1");
      await expect(tx1).to.emit(mutableRefUpdater, "RefUpdated").withArgs(alice.address, refName, "v1");

      const tx2 = await mutableRefUpdater.connect(alice).updateRef(refName, "v2");
      await expect(tx2).to.emit(mutableRefUpdater, "RefUpdated").withArgs(alice.address, refName, "v2");

      const tx3 = await mutableRefUpdater.connect(alice).updateRef(refName, "v3");
      await expect(tx3).to.emit(mutableRefUpdater, "RefUpdated").withArgs(alice.address, refName, "v3");
    });

    it("Should emit separate events for different users updating same ref name", async function () {
      const refName = "created-statements";

      const tx1 = await mutableRefUpdater.connect(alice).updateRef(refName, "QmAlice");
      await expect(tx1).to.emit(mutableRefUpdater, "RefUpdated").withArgs(alice.address, refName, "QmAlice");

      const tx2 = await mutableRefUpdater.connect(bob).updateRef(refName, "QmBob");
      await expect(tx2).to.emit(mutableRefUpdater, "RefUpdated").withArgs(bob.address, refName, "QmBob");
    });
  });

  describe("Gas cost validation", function () {
    it("Should not fail with reasonable ref values", async function () {
      // Test with typical IPFS CID
      const typicalCid = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
      const tx = await mutableRefUpdater.connect(alice).updateRef("test", typicalCid);
      const receipt = await tx.wait();

      // Just verify it succeeded and didn't use an absurd amount of gas
      expect(receipt.status).to.equal(1);
      // Gas limit for simple operations should be reasonable (< 100k gas)
      expect(receipt.gasUsed).to.be.lessThan(100000);
    });
  });

  describe("Real-world usage patterns", function () {
    it("Should support created statements workflow", async function () {
      // User creates first statement
      await mutableRefUpdater.connect(alice).updateRef("created-statements", "QmFirstStatement");
      expect(await mutableRefUpdater.getRef(alice.address, "created-statements")).to.equal("QmFirstStatement");

      // User creates more statements, updates the ref to point to new list
      await mutableRefUpdater.connect(alice).updateRef("created-statements", "QmListWithThreeStatements");
      expect(await mutableRefUpdater.getRef(alice.address, "created-statements")).to.equal("QmListWithThreeStatements");
    });

    it("Should support bookmarks workflow", async function () {
      await mutableRefUpdater.connect(alice).updateRef("bookmarks", "QmBookmarksList1");
      await mutableRefUpdater.connect(alice).updateRef("bookmarks", "QmBookmarksList2");

      const currentBookmarks = await mutableRefUpdater.getRef(alice.address, "bookmarks");
      expect(currentBookmarks).to.equal("QmBookmarksList2");
    });

    it("Should support draft/WIP workflow", async function () {
      // Save draft
      await mutableRefUpdater.connect(alice).updateRef("draft-post", "QmDraft1");

      // Update draft multiple times
      await mutableRefUpdater.connect(alice).updateRef("draft-post", "QmDraft2");
      await mutableRefUpdater.connect(alice).updateRef("draft-post", "QmDraft3");

      // Clear draft (publish)
      await mutableRefUpdater.connect(alice).updateRef("draft-post", "");

      expect(await mutableRefUpdater.getRef(alice.address, "draft-post")).to.equal("");
    });
  });
});
