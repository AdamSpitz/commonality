import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("Implications", function () {
  let implications;
  let alice, bob, charlie;

  beforeEach(async function () {
    [alice, bob, charlie] = await ethers.getSigners();
    const Implications = await ethers.getContractFactory("Implications");
    implications = await Implications.deploy();
  });

  describe("Single Attestation", function () {
    it("Should allow attesting an implication", async function () {
      const fromStmt = ethers.encodeBytes32String("statement-A");
      const toStmt = ethers.encodeBytes32String("statement-B");

      await implications.connect(alice).attestImplication(fromStmt, toStmt);

      const hasAttestation = await implications.hasAttestation(
        alice.address,
        fromStmt,
        toStmt
      );
      expect(hasAttestation).to.equal(true);
    });

    it("Should emit ImplicationAttestation event", async function () {
      const fromStmt = ethers.encodeBytes32String("statement-A");
      const toStmt = ethers.encodeBytes32String("statement-B");

      await expect(
        implications.connect(alice).attestImplication(fromStmt, toStmt)
      )
        .to.emit(implications, "ImplicationAttestation")
        .withArgs(alice.address, fromStmt, toStmt);
    });

    it("Should reject self-implication", async function () {
      const stmt = ethers.encodeBytes32String("statement-A");

      await expect(
        implications.connect(alice).attestImplication(stmt, stmt)
      ).to.be.revertedWith("Statement cannot imply itself");
    });

    it("Should reject zero fromStatementId", async function () {
      const toStmt = ethers.encodeBytes32String("statement-B");

      await expect(
        implications.connect(alice).attestImplication(ethers.ZeroHash, toStmt)
      ).to.be.revertedWith("Invalid statement ID");
    });

    it("Should reject zero toStatementId", async function () {
      const fromStmt = ethers.encodeBytes32String("statement-A");

      await expect(
        implications.connect(alice).attestImplication(fromStmt, ethers.ZeroHash)
      ).to.be.revertedWith("Invalid statement ID");
    });

    it("Should be idempotent (allow re-attesting same implication)", async function () {
      const fromStmt = ethers.encodeBytes32String("statement-A");
      const toStmt = ethers.encodeBytes32String("statement-B");

      await implications.connect(alice).attestImplication(fromStmt, toStmt);
      await implications.connect(alice).attestImplication(fromStmt, toStmt);

      const hasAttestation = await implications.hasAttestation(
        alice.address,
        fromStmt,
        toStmt
      );
      expect(hasAttestation).to.equal(true);
    });
  });

  describe("Multiple Attesters", function () {
    it("Should track attestations separately per attester", async function () {
      const fromStmt = ethers.encodeBytes32String("statement-A");
      const toStmt = ethers.encodeBytes32String("statement-B");

      await implications.connect(alice).attestImplication(fromStmt, toStmt);

      const aliceHas = await implications.hasAttestation(
        alice.address,
        fromStmt,
        toStmt
      );
      const bobHas = await implications.hasAttestation(
        bob.address,
        fromStmt,
        toStmt
      );

      expect(aliceHas).to.equal(true);
      expect(bobHas).to.equal(false);
    });

    it("Should allow different attesters to attest same implication", async function () {
      const fromStmt = ethers.encodeBytes32String("statement-A");
      const toStmt = ethers.encodeBytes32String("statement-B");

      await implications.connect(alice).attestImplication(fromStmt, toStmt);
      await implications.connect(bob).attestImplication(fromStmt, toStmt);

      const aliceHas = await implications.hasAttestation(
        alice.address,
        fromStmt,
        toStmt
      );
      const bobHas = await implications.hasAttestation(
        bob.address,
        fromStmt,
        toStmt
      );

      expect(aliceHas).to.equal(true);
      expect(bobHas).to.equal(true);
    });
  });

  describe("Directional Nature", function () {
    it("Should treat implications as unidirectional", async function () {
      const stmtA = ethers.encodeBytes32String("statement-A");
      const stmtB = ethers.encodeBytes32String("statement-B");

      // Alice attests A → B
      await implications.connect(alice).attestImplication(stmtA, stmtB);

      const aToB = await implications.hasAttestation(
        alice.address,
        stmtA,
        stmtB
      );
      const bToA = await implications.hasAttestation(
        alice.address,
        stmtB,
        stmtA
      );

      expect(aToB).to.equal(true);
      expect(bToA).to.equal(false);
    });
  });

  describe("Batch Attestations", function () {
    it("Should handle batch attestations", async function () {
      const fromStmts = [
        ethers.encodeBytes32String("statement-A"),
        ethers.encodeBytes32String("statement-B"),
        ethers.encodeBytes32String("statement-C"),
      ];
      const toStmts = [
        ethers.encodeBytes32String("statement-X"),
        ethers.encodeBytes32String("statement-Y"),
        ethers.encodeBytes32String("statement-Z"),
      ];

      await implications
        .connect(alice)
        .attestImplicationsInBatch(fromStmts, toStmts);

      for (let i = 0; i < fromStmts.length; i++) {
        const hasAttestation = await implications.hasAttestation(
          alice.address,
          fromStmts[i],
          toStmts[i]
        );
        expect(hasAttestation).to.equal(true);
      }
    });

    it("Should emit events for each batch attestation", async function () {
      const fromStmts = [
        ethers.encodeBytes32String("statement-A"),
        ethers.encodeBytes32String("statement-B"),
      ];
      const toStmts = [
        ethers.encodeBytes32String("statement-X"),
        ethers.encodeBytes32String("statement-Y"),
      ];

      const tx = await implications
        .connect(alice)
        .attestImplicationsInBatch(fromStmts, toStmts);

      await expect(tx)
        .to.emit(implications, "ImplicationAttestation")
        .withArgs(alice.address, fromStmts[0], toStmts[0]);

      await expect(tx)
        .to.emit(implications, "ImplicationAttestation")
        .withArgs(alice.address, fromStmts[1], toStmts[1]);
    });

    it("Should reject batch with mismatched array lengths", async function () {
      const fromStmts = [
        ethers.encodeBytes32String("statement-A"),
        ethers.encodeBytes32String("statement-B"),
      ];
      const toStmts = [ethers.encodeBytes32String("statement-X")];

      await expect(
        implications.connect(alice).attestImplicationsInBatch(fromStmts, toStmts)
      ).to.be.revertedWith("Arrays must have same length");
    });

    it("Should reject batch with self-implication", async function () {
      const stmt = ethers.encodeBytes32String("statement-A");
      const fromStmts = [stmt];
      const toStmts = [stmt];

      await expect(
        implications.connect(alice).attestImplicationsInBatch(fromStmts, toStmts)
      ).to.be.revertedWith("Statement cannot imply itself");
    });

    it("Should reject batch with zero statement ID", async function () {
      const fromStmts = [ethers.ZeroHash];
      const toStmts = [ethers.encodeBytes32String("statement-X")];

      await expect(
        implications.connect(alice).attestImplicationsInBatch(fromStmts, toStmts)
      ).to.be.revertedWith("Invalid statement ID");
    });

    it("Should handle empty batch", async function () {
      await implications.connect(alice).attestImplicationsInBatch([], []);
      // Should not revert
    });
  });

  describe("Complex Implication Chains", function () {
    it("Should allow creating implication chains (A→B, B→C, C→D)", async function () {
      const stmtA = ethers.encodeBytes32String("statement-A");
      const stmtB = ethers.encodeBytes32String("statement-B");
      const stmtC = ethers.encodeBytes32String("statement-C");
      const stmtD = ethers.encodeBytes32String("statement-D");

      await implications.connect(alice).attestImplication(stmtA, stmtB);
      await implications.connect(alice).attestImplication(stmtB, stmtC);
      await implications.connect(alice).attestImplication(stmtC, stmtD);

      expect(
        await implications.hasAttestation(alice.address, stmtA, stmtB)
      ).to.equal(true);
      expect(
        await implications.hasAttestation(alice.address, stmtB, stmtC)
      ).to.equal(true);
      expect(
        await implications.hasAttestation(alice.address, stmtC, stmtD)
      ).to.equal(true);

      // Direct A→D should not exist
      expect(
        await implications.hasAttestation(alice.address, stmtA, stmtD)
      ).to.equal(false);
    });

    it("Should allow one statement to imply multiple others", async function () {
      const stmtA = ethers.encodeBytes32String("statement-A");
      const stmtB = ethers.encodeBytes32String("statement-B");
      const stmtC = ethers.encodeBytes32String("statement-C");
      const stmtD = ethers.encodeBytes32String("statement-D");

      // A implies B, C, and D
      await implications.connect(alice).attestImplication(stmtA, stmtB);
      await implications.connect(alice).attestImplication(stmtA, stmtC);
      await implications.connect(alice).attestImplication(stmtA, stmtD);

      expect(
        await implications.hasAttestation(alice.address, stmtA, stmtB)
      ).to.equal(true);
      expect(
        await implications.hasAttestation(alice.address, stmtA, stmtC)
      ).to.equal(true);
      expect(
        await implications.hasAttestation(alice.address, stmtA, stmtD)
      ).to.equal(true);
    });

    it("Should allow multiple statements to imply the same statement", async function () {
      const stmtA = ethers.encodeBytes32String("statement-A");
      const stmtB = ethers.encodeBytes32String("statement-B");
      const stmtC = ethers.encodeBytes32String("statement-C");
      const stmtX = ethers.encodeBytes32String("statement-X");

      // A, B, and C all imply X
      await implications.connect(alice).attestImplication(stmtA, stmtX);
      await implications.connect(alice).attestImplication(stmtB, stmtX);
      await implications.connect(alice).attestImplication(stmtC, stmtX);

      expect(
        await implications.hasAttestation(alice.address, stmtA, stmtX)
      ).to.equal(true);
      expect(
        await implications.hasAttestation(alice.address, stmtB, stmtX)
      ).to.equal(true);
      expect(
        await implications.hasAttestation(alice.address, stmtC, stmtX)
      ).to.equal(true);
    });
  });

  describe("Edge Cases", function () {
    it("Should return false for non-existent attestation", async function () {
      const fromStmt = ethers.encodeBytes32String("statement-A");
      const toStmt = ethers.encodeBytes32String("statement-B");

      const hasAttestation = await implications.hasAttestation(
        alice.address,
        fromStmt,
        toStmt
      );
      expect(hasAttestation).to.equal(false);
    });

    it("Should handle attestations with same content but different encodings", async function () {
      // Different byte32 values should be treated as different statements
      const stmt1 = ethers.encodeBytes32String("test");
      const stmt2 = ethers.encodeBytes32String("test ");
      const target = ethers.encodeBytes32String("target");

      await implications.connect(alice).attestImplication(stmt1, target);

      expect(
        await implications.hasAttestation(alice.address, stmt1, target)
      ).to.equal(true);
      expect(
        await implications.hasAttestation(alice.address, stmt2, target)
      ).to.equal(false);
    });
  });
});
