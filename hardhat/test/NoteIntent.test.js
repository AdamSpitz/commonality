import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("NoteIntent", function () {
  let noteIntent;
  let alice, bob;
  let noteContractAddr;

  beforeEach(async function () {
    [alice, bob] = await ethers.getSigners();
    const NoteIntent = await ethers.getContractFactory("NoteIntent");
    noteIntent = await NoteIntent.deploy();

    // Use a random address to represent a note contract
    noteContractAddr = ethers.Wallet.createRandom().address;
  });

  describe("Single Attestation", function () {
    it("Should allow attesting a note intent", async function () {
      const statementId = ethers.encodeBytes32String("save-the-rainforest");

      await noteIntent.connect(alice).attestNoteIntent(noteContractAddr, 1, statementId);

      const stored = await noteIntent.getAttestation(alice.address, noteContractAddr, 1);
      expect(stored).to.equal(statementId);
    });

    it("Should emit NoteIntentAttested event", async function () {
      const statementId = ethers.encodeBytes32String("save-the-rainforest");

      await expect(
        noteIntent.connect(alice).attestNoteIntent(noteContractAddr, 1, statementId)
      )
        .to.emit(noteIntent, "NoteIntentAttested")
        .withArgs(alice.address, noteContractAddr, 1, statementId);
    });

    it("Should reject zero note contract address", async function () {
      const statementId = ethers.encodeBytes32String("save-the-rainforest");

      await expect(
        noteIntent.connect(alice).attestNoteIntent(ethers.ZeroAddress, 1, statementId)
      ).to.be.revertedWithCustomError(noteIntent, "InvalidNoteContractAddress");
    });

    it("Should reject zero intendedStatementId", async function () {
      await expect(
        noteIntent.connect(alice).attestNoteIntent(noteContractAddr, 1, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(noteIntent, "InvalidStatementId");
    });

    it("Should allow updating intent by re-attesting with a different statement", async function () {
      const statementId1 = ethers.encodeBytes32String("statement-1");
      const statementId2 = ethers.encodeBytes32String("statement-2");

      await noteIntent.connect(alice).attestNoteIntent(noteContractAddr, 1, statementId1);
      expect(await noteIntent.getAttestation(alice.address, noteContractAddr, 1)).to.equal(statementId1);

      await noteIntent.connect(alice).attestNoteIntent(noteContractAddr, 1, statementId2);
      expect(await noteIntent.getAttestation(alice.address, noteContractAddr, 1)).to.equal(statementId2);
    });

    it("Should be idempotent (allow re-attesting same intent)", async function () {
      const statementId = ethers.encodeBytes32String("save-the-rainforest");

      await noteIntent.connect(alice).attestNoteIntent(noteContractAddr, 1, statementId);
      await noteIntent.connect(alice).attestNoteIntent(noteContractAddr, 1, statementId);

      const stored = await noteIntent.getAttestation(alice.address, noteContractAddr, 1);
      expect(stored).to.equal(statementId);
    });
  });

  describe("Getter", function () {
    it("Should return zero for non-existent attestation", async function () {
      const stored = await noteIntent.getAttestation(alice.address, noteContractAddr, 99);
      expect(stored).to.equal(ethers.ZeroHash);
    });

    it("Should distinguish attestations by note ID", async function () {
      const stmt1 = ethers.encodeBytes32String("purpose-1");
      const stmt2 = ethers.encodeBytes32String("purpose-2");

      await noteIntent.connect(alice).attestNoteIntent(noteContractAddr, 1, stmt1);
      await noteIntent.connect(alice).attestNoteIntent(noteContractAddr, 2, stmt2);

      expect(await noteIntent.getAttestation(alice.address, noteContractAddr, 1)).to.equal(stmt1);
      expect(await noteIntent.getAttestation(alice.address, noteContractAddr, 2)).to.equal(stmt2);
    });

    it("Should distinguish attestations by note contract", async function () {
      const contractB = ethers.Wallet.createRandom().address;
      const stmt = ethers.encodeBytes32String("purpose-1");

      await noteIntent.connect(alice).attestNoteIntent(noteContractAddr, 1, stmt);

      expect(await noteIntent.getAttestation(alice.address, noteContractAddr, 1)).to.equal(stmt);
      expect(await noteIntent.getAttestation(alice.address, contractB, 1)).to.equal(ethers.ZeroHash);
    });
  });

  describe("Batch Attestation", function () {
    it("Should handle batch attestations for multiple note IDs", async function () {
      const noteIds = [1, 2, 3];
      const statementIds = [
        ethers.encodeBytes32String("purpose-1"),
        ethers.encodeBytes32String("purpose-2"),
        ethers.encodeBytes32String("purpose-3"),
      ];

      await noteIntent.connect(alice).attestNoteIntentsInBatch(noteContractAddr, noteIds, statementIds);

      for (let i = 0; i < noteIds.length; i++) {
        const stored = await noteIntent.getAttestation(alice.address, noteContractAddr, noteIds[i]);
        expect(stored).to.equal(statementIds[i]);
      }
    });

    it("Should emit NoteIntentAttested for each item in batch", async function () {
      const noteIds = [1, 2];
      const statementIds = [
        ethers.encodeBytes32String("purpose-1"),
        ethers.encodeBytes32String("purpose-2"),
      ];

      const tx = await noteIntent
        .connect(alice)
        .attestNoteIntentsInBatch(noteContractAddr, noteIds, statementIds);

      await expect(tx)
        .to.emit(noteIntent, "NoteIntentAttested")
        .withArgs(alice.address, noteContractAddr, noteIds[0], statementIds[0]);
      await expect(tx)
        .to.emit(noteIntent, "NoteIntentAttested")
        .withArgs(alice.address, noteContractAddr, noteIds[1], statementIds[1]);
    });

    it("Should reject batch with mismatched array lengths", async function () {
      const noteIds = [1, 2];
      const statementIds = [ethers.encodeBytes32String("purpose-1")];

      await expect(
        noteIntent.connect(alice).attestNoteIntentsInBatch(noteContractAddr, noteIds, statementIds)
      ).to.be.revertedWithCustomError(noteIntent, "ArrayLengthMismatch");
    });

    it("Should reject batch with zero note contract address", async function () {
      const noteIds = [1];
      const statementIds = [ethers.encodeBytes32String("purpose-1")];

      await expect(
        noteIntent.connect(alice).attestNoteIntentsInBatch(ethers.ZeroAddress, noteIds, statementIds)
      ).to.be.revertedWithCustomError(noteIntent, "InvalidNoteContractAddress");
    });

    it("Should reject batch with zero statement ID", async function () {
      const noteIds = [1];
      const statementIds = [ethers.ZeroHash];

      await expect(
        noteIntent.connect(alice).attestNoteIntentsInBatch(noteContractAddr, noteIds, statementIds)
      ).to.be.revertedWithCustomError(noteIntent, "InvalidStatementId");
    });

    it("Should handle empty batch", async function () {
      await noteIntent.connect(alice).attestNoteIntentsInBatch(noteContractAddr, [], []);
      // Should not revert
    });
  });

  describe("Multiple Attesters", function () {
    it("Should track attestations separately per attester", async function () {
      const stmtAlice = ethers.encodeBytes32String("alice-purpose");
      const stmtBob = ethers.encodeBytes32String("bob-purpose");

      await noteIntent.connect(alice).attestNoteIntent(noteContractAddr, 1, stmtAlice);
      await noteIntent.connect(bob).attestNoteIntent(noteContractAddr, 1, stmtBob);

      expect(await noteIntent.getAttestation(alice.address, noteContractAddr, 1)).to.equal(stmtAlice);
      expect(await noteIntent.getAttestation(bob.address, noteContractAddr, 1)).to.equal(stmtBob);
    });

    it("Should return zero for attester who has not attested", async function () {
      const stmt = ethers.encodeBytes32String("purpose-1");

      await noteIntent.connect(alice).attestNoteIntent(noteContractAddr, 1, stmt);

      expect(await noteIntent.getAttestation(bob.address, noteContractAddr, 1)).to.equal(ethers.ZeroHash);
    });
  });
});
