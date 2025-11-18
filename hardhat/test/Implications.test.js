// AI-generated tests for Implications contract
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Implications", function () {
  let implications;
  let attester1;
  let attester2;
  let user;

  // Sample statement IDs (IPFS CIDs represented as bytes32)
  const statementA = ethers.encodeBytes32String("QmTestA");
  const statementB = ethers.encodeBytes32String("QmTestB");
  const statementC = ethers.encodeBytes32String("QmTestC");
  const statementD = ethers.encodeBytes32String("QmTestD");
  const zeroHash = ethers.ZeroHash;

  beforeEach(async function () {
    [attester1, attester2, user] = await ethers.getSigners();

    const Implications = await ethers.getContractFactory("Implications");
    implications = await Implications.deploy();
  });

  describe("attestImplication", function () {
    it("should allow attesting an implication", async function () {
      await expect(
        implications.connect(attester1).attestImplication(statementA, statementB)
      )
        .to.emit(implications, "ImplicationAttestation")
        .withArgs(attester1.address, statementA, statementB);

      expect(
        await implications.hasAttestation(
          attester1.address,
          statementA,
          statementB
        )
      ).to.be.true;
    });

    it("should allow multiple implications from one statement", async function () {
      await implications
        .connect(attester1)
        .attestImplication(statementA, statementB);
      await implications
        .connect(attester1)
        .attestImplication(statementA, statementC);

      expect(
        await implications.hasAttestation(
          attester1.address,
          statementA,
          statementB
        )
      ).to.be.true;
      expect(
        await implications.hasAttestation(
          attester1.address,
          statementA,
          statementC
        )
      ).to.be.true;
    });

    it("should allow multiple implications to one statement", async function () {
      await implications
        .connect(attester1)
        .attestImplication(statementA, statementC);
      await implications
        .connect(attester1)
        .attestImplication(statementB, statementC);

      expect(
        await implications.hasAttestation(
          attester1.address,
          statementA,
          statementC
        )
      ).to.be.true;
      expect(
        await implications.hasAttestation(
          attester1.address,
          statementB,
          statementC
        )
      ).to.be.true;
    });

    it("should allow different attesters to attest the same implication", async function () {
      await implications
        .connect(attester1)
        .attestImplication(statementA, statementB);
      await implications
        .connect(attester2)
        .attestImplication(statementA, statementB);

      expect(
        await implications.hasAttestation(
          attester1.address,
          statementA,
          statementB
        )
      ).to.be.true;
      expect(
        await implications.hasAttestation(
          attester2.address,
          statementA,
          statementB
        )
      ).to.be.true;
    });

    it("should be idempotent (allow re-attesting same implication)", async function () {
      await implications
        .connect(attester1)
        .attestImplication(statementA, statementB);
      await implications
        .connect(attester1)
        .attestImplication(statementA, statementB);

      expect(
        await implications.hasAttestation(
          attester1.address,
          statementA,
          statementB
        )
      ).to.be.true;
    });

    it("should reject statement implying itself", async function () {
      await expect(
        implications.connect(attester1).attestImplication(statementA, statementA)
      ).to.be.revertedWith("Statement cannot imply itself");
    });

    it("should reject zero statement IDs", async function () {
      await expect(
        implications.connect(attester1).attestImplication(zeroHash, statementB)
      ).to.be.revertedWith("Invalid statement ID");

      await expect(
        implications.connect(attester1).attestImplication(statementA, zeroHash)
      ).to.be.revertedWith("Invalid statement ID");
    });

    it("should allow bidirectional implications (A->B and B->A)", async function () {
      await implications
        .connect(attester1)
        .attestImplication(statementA, statementB);
      await implications
        .connect(attester1)
        .attestImplication(statementB, statementA);

      expect(
        await implications.hasAttestation(
          attester1.address,
          statementA,
          statementB
        )
      ).to.be.true;
      expect(
        await implications.hasAttestation(
          attester1.address,
          statementB,
          statementA
        )
      ).to.be.true;
    });
  });

  describe("hasAttestation", function () {
    it("should return false for non-existent attestation", async function () {
      expect(
        await implications.hasAttestation(
          attester1.address,
          statementA,
          statementB
        )
      ).to.be.false;
    });

    it("should return true for existing attestation", async function () {
      await implications
        .connect(attester1)
        .attestImplication(statementA, statementB);

      expect(
        await implications.hasAttestation(
          attester1.address,
          statementA,
          statementB
        )
      ).to.be.true;
    });

    it("should differentiate between attesters", async function () {
      await implications
        .connect(attester1)
        .attestImplication(statementA, statementB);

      expect(
        await implications.hasAttestation(
          attester1.address,
          statementA,
          statementB
        )
      ).to.be.true;
      expect(
        await implications.hasAttestation(
          attester2.address,
          statementA,
          statementB
        )
      ).to.be.false;
    });
  });

  describe("attestImplicationsInBatch", function () {
    it("should attest multiple implications in one transaction", async function () {
      const fromStatements = [statementA, statementB, statementC];
      const toStatements = [statementB, statementC, statementD];

      await implications
        .connect(attester1)
        .attestImplicationsInBatch(fromStatements, toStatements);

      expect(
        await implications.hasAttestation(
          attester1.address,
          statementA,
          statementB
        )
      ).to.be.true;
      expect(
        await implications.hasAttestation(
          attester1.address,
          statementB,
          statementC
        )
      ).to.be.true;
      expect(
        await implications.hasAttestation(
          attester1.address,
          statementC,
          statementD
        )
      ).to.be.true;
    });

    it("should emit ImplicationAttestation events for each attestation", async function () {
      const fromStatements = [statementA, statementB];
      const toStatements = [statementB, statementC];

      const tx = await implications
        .connect(attester1)
        .attestImplicationsInBatch(fromStatements, toStatements);

      const receipt = await tx.wait();
      const events = receipt.logs.filter(
        (log) => log.fragment && log.fragment.name === "ImplicationAttestation"
      );

      expect(events).to.have.lengthOf(2);
    });

    it("should reject arrays of different lengths", async function () {
      const fromStatements = [statementA, statementB];
      const toStatements = [statementB]; // Mismatched length

      await expect(
        implications
          .connect(attester1)
          .attestImplicationsInBatch(fromStatements, toStatements)
      ).to.be.revertedWith("Arrays must have same length");
    });

    it("should reject statement implying itself in batch", async function () {
      const fromStatements = [statementA, statementB];
      const toStatements = [statementB, statementB]; // statementB implies itself

      await expect(
        implications
          .connect(attester1)
          .attestImplicationsInBatch(fromStatements, toStatements)
      ).to.be.revertedWith("Statement cannot imply itself");
    });

    it("should reject zero statement IDs in batch", async function () {
      const fromStatements = [zeroHash, statementB];
      const toStatements = [statementB, statementC];

      await expect(
        implications
          .connect(attester1)
          .attestImplicationsInBatch(fromStatements, toStatements)
      ).to.be.revertedWith("Invalid statement ID");
    });

    it("should handle empty arrays", async function () {
      await implications.connect(attester1).attestImplicationsInBatch([], []);
      // Should not revert
    });
  });

  describe("Public mapping access", function () {
    it("should allow direct access to attestations mapping", async function () {
      await implications
        .connect(attester1)
        .attestImplication(statementA, statementB);

      const hasAttestation = await implications.attestations(
        attester1.address,
        statementA,
        statementB
      );
      expect(hasAttestation).to.be.true;
    });
  });

  describe("Implication chains", function () {
    it("should support creating transitive implication chains", async function () {
      // Create chain: A -> B -> C -> D
      await implications
        .connect(attester1)
        .attestImplication(statementA, statementB);
      await implications
        .connect(attester1)
        .attestImplication(statementB, statementC);
      await implications
        .connect(attester1)
        .attestImplication(statementC, statementD);

      expect(
        await implications.hasAttestation(
          attester1.address,
          statementA,
          statementB
        )
      ).to.be.true;
      expect(
        await implications.hasAttestation(
          attester1.address,
          statementB,
          statementC
        )
      ).to.be.true;
      expect(
        await implications.hasAttestation(
          attester1.address,
          statementC,
          statementD
        )
      ).to.be.true;
    });
  });
});
