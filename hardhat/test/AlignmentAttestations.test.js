import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("AlignmentAttestations", function () {
  let alignmentAttestations;
  let alice, bob, charlie;
  let subjectAddress1, subjectAddress2, subjectAddress3;
  let topicId; // Default topic for tests

  beforeEach(async function () {
    [alice, bob, charlie] = await ethers.getSigners();
    const AlignmentAttestations = await ethers.getContractFactory("AlignmentAttestations");
    alignmentAttestations = await AlignmentAttestations.deploy();

    // Use some addresses to represent subject addresses (projects, users, etc.)
    subjectAddress1 = ethers.Wallet.createRandom().address;
    subjectAddress2 = ethers.Wallet.createRandom().address;
    subjectAddress3 = ethers.Wallet.createRandom().address;

    // Default topic for most tests
    topicId = ethers.encodeBytes32String("alignment-topic");
  });

  describe("Single Attestation", function () {
    it("Should allow attesting alignment", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectAddress1, statementId, topicId);

      const hasAttestation = await alignmentAttestations.hasAttestation(
        alice.address,
        topicId,
        subjectAddress1,
        statementId
      );
      expect(hasAttestation).to.equal(true);
    });

    it("Should emit AlignmentAttestation event with topicStatementId", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignment(subjectAddress1, statementId, topicId)
      )
        .to.emit(alignmentAttestations, "AlignmentAttestation")
        .withArgs(alice.address, subjectAddress1, statementId, topicId);
    });

    it("Should reject zero topicStatementId", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignment(subjectAddress1, statementId, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(alignmentAttestations, "InvalidTopicStatementId");
    });

    it("Should reject zero subject address", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignment(ethers.ZeroAddress, statementId, topicId)
      ).to.be.revertedWithCustomError(alignmentAttestations, "InvalidSubjectAddress");
    });

    it("Should reject zero statement ID", async function () {
      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignment(subjectAddress1, ethers.ZeroHash, topicId)
      ).to.be.revertedWithCustomError(alignmentAttestations, "InvalidStatementId");
    });

    it("Should be idempotent (allow re-attesting same alignment)", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectAddress1, statementId, topicId);
      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectAddress1, statementId, topicId);

      const hasAttestation = await alignmentAttestations.hasAttestation(
        alice.address,
        topicId,
        subjectAddress1,
        statementId
      );
      expect(hasAttestation).to.equal(true);
    });
  });

  describe("Multiple Attesters", function () {
    it("Should track attestations separately per attester", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectAddress1, statementId, topicId);

      const aliceHas = await alignmentAttestations.hasAttestation(
        alice.address,
        topicId,
        subjectAddress1,
        statementId
      );
      const bobHas = await alignmentAttestations.hasAttestation(
        bob.address,
        topicId,
        subjectAddress1,
        statementId
      );

      expect(aliceHas).to.equal(true);
      expect(bobHas).to.equal(false);
    });

    it("Should allow different attesters to attest same alignment", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectAddress1, statementId, topicId);
      await alignmentAttestations
        .connect(bob)
        .attestAlignment(subjectAddress1, statementId, topicId);

      const aliceHas = await alignmentAttestations.hasAttestation(
        alice.address,
        topicId,
        subjectAddress1,
        statementId
      );
      const bobHas = await alignmentAttestations.hasAttestation(
        bob.address,
        topicId,
        subjectAddress1,
        statementId
      );

      expect(aliceHas).to.equal(true);
      expect(bobHas).to.equal(true);
    });
  });

  describe("Multiple Alignments", function () {
    it("Should allow one subject to align with multiple statements", async function () {
      const climate = ethers.encodeBytes32String("climate-action");
      const poverty = ethers.encodeBytes32String("poverty-reduction");
      const education = ethers.encodeBytes32String("education");

      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectAddress1, climate, topicId);
      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectAddress1, poverty, topicId);
      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectAddress1, education, topicId);

      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectAddress1,
          climate
        )
      ).to.equal(true);
      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectAddress1,
          poverty
        )
      ).to.equal(true);
      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectAddress1,
          education
        )
      ).to.equal(true);
    });

    it("Should allow multiple subjects to align with same statement", async function () {
      const climate = ethers.encodeBytes32String("climate-action");

      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectAddress1, climate, topicId);
      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectAddress2, climate, topicId);
      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectAddress3, climate, topicId);

      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectAddress1,
          climate
        )
      ).to.equal(true);
      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectAddress2,
          climate
        )
      ).to.equal(true);
      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectAddress3,
          climate
        )
      ).to.equal(true);
    });

    it("Should keep different subject-statement pairs independent", async function () {
      const climate = ethers.encodeBytes32String("climate-action");
      const poverty = ethers.encodeBytes32String("poverty-reduction");

      // Subject 1 aligns with climate
      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectAddress1, climate, topicId);

      // Subject 2 aligns with poverty
      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectAddress2, poverty, topicId);

      // Verify correct alignments exist
      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectAddress1,
          climate
        )
      ).to.equal(true);
      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectAddress2,
          poverty
        )
      ).to.equal(true);

      // Verify cross-alignments don't exist
      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectAddress1,
          poverty
        )
      ).to.equal(false);
      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectAddress2,
          climate
        )
      ).to.equal(false);
    });
  });

  describe("Batch Attestations", function () {
    it("Should handle batch attestations", async function () {
      const subjects = [subjectAddress1, subjectAddress2, subjectAddress3];
      const statements = [
        ethers.encodeBytes32String("climate-action"),
        ethers.encodeBytes32String("poverty-reduction"),
        ethers.encodeBytes32String("education"),
      ];
      const topics = [topicId, topicId, topicId];

      await alignmentAttestations
        .connect(alice)
        .attestAlignmentsInBatch(subjects, statements, topics);

      for (let i = 0; i < subjects.length; i++) {
        const hasAttestation = await alignmentAttestations.hasAttestation(
          alice.address,
          topics[i],
          subjects[i],
          statements[i]
        );
        expect(hasAttestation).to.equal(true);
      }
    });

    it("Should emit events for each batch attestation with topicStatementId", async function () {
      const subjects = [subjectAddress1, subjectAddress2];
      const statements = [
        ethers.encodeBytes32String("climate-action"),
        ethers.encodeBytes32String("poverty-reduction"),
      ];
      const topics = [topicId, topicId];

      const tx = await alignmentAttestations
        .connect(alice)
        .attestAlignmentsInBatch(subjects, statements, topics);

      await expect(tx)
        .to.emit(alignmentAttestations, "AlignmentAttestation")
        .withArgs(alice.address, subjects[0], statements[0], topics[0]);

      await expect(tx)
        .to.emit(alignmentAttestations, "AlignmentAttestation")
        .withArgs(alice.address, subjects[1], statements[1], topics[1]);
    });

    it("Should allow different topics per attestation in batch", async function () {
      const subjects = [subjectAddress1, subjectAddress2];
      const statements = [
        ethers.encodeBytes32String("climate-action"),
        ethers.encodeBytes32String("poverty-reduction"),
      ];
      const topic1 = ethers.encodeBytes32String("environment");
      const topic2 = ethers.encodeBytes32String("social-welfare");
      const topics = [topic1, topic2];

      const tx = await alignmentAttestations
        .connect(alice)
        .attestAlignmentsInBatch(subjects, statements, topics);

      await expect(tx)
        .to.emit(alignmentAttestations, "AlignmentAttestation")
        .withArgs(alice.address, subjects[0], statements[0], topic1);

      await expect(tx)
        .to.emit(alignmentAttestations, "AlignmentAttestation")
        .withArgs(alice.address, subjects[1], statements[1], topic2);
    });

    it("Should reject batch with mismatched array lengths", async function () {
      const subjects = [subjectAddress1, subjectAddress2];
      const statements = [ethers.encodeBytes32String("climate-action")];
      const topics = [topicId, topicId];

      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignmentsInBatch(subjects, statements, topics)
      ).to.be.revertedWithCustomError(alignmentAttestations, "ArrayLengthMismatch");
    });

    it("Should reject batch with mismatched topics array length", async function () {
      const subjects = [subjectAddress1, subjectAddress2];
      const statements = [
        ethers.encodeBytes32String("climate-action"),
        ethers.encodeBytes32String("poverty-reduction"),
      ];
      const topics = [topicId]; // Only one topic

      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignmentsInBatch(subjects, statements, topics)
      ).to.be.revertedWithCustomError(alignmentAttestations, "ArrayLengthMismatch");
    });

    it("Should reject batch with zero subject address", async function () {
      const subjects = [ethers.ZeroAddress];
      const statements = [ethers.encodeBytes32String("climate-action")];
      const topics = [topicId];

      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignmentsInBatch(subjects, statements, topics)
      ).to.be.revertedWithCustomError(alignmentAttestations, "InvalidSubjectAddress");
    });

    it("Should reject batch with zero statement ID", async function () {
      const subjects = [subjectAddress1];
      const statements = [ethers.ZeroHash];
      const topics = [topicId];

      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignmentsInBatch(subjects, statements, topics)
      ).to.be.revertedWithCustomError(alignmentAttestations, "InvalidStatementId");
    });

    it("Should reject batch with zero topic statement ID", async function () {
      const subjects = [subjectAddress1];
      const statements = [ethers.encodeBytes32String("climate-action")];
      const topics = [ethers.ZeroHash];

      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignmentsInBatch(subjects, statements, topics)
      ).to.be.revertedWithCustomError(alignmentAttestations, "InvalidTopicStatementId");
    });

    it("Should handle empty batch", async function () {
      await alignmentAttestations.connect(alice).attestAlignmentsInBatch([], [], []);
      // Should not revert
    });
  });

  describe("Edge Cases", function () {
    it("Should return false for non-existent attestation", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      const hasAttestation = await alignmentAttestations.hasAttestation(
        alice.address,
        topicId,
        subjectAddress1,
        statementId
      );
      expect(hasAttestation).to.equal(false);
    });

    it("Should allow using actual contract addresses as subjects", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      // Use the deployed contract's address as a "subject" (valid use case)
      await alignmentAttestations
        .connect(alice)
        .attestAlignment(await alignmentAttestations.getAddress(), statementId, topicId);

      const hasAttestation = await alignmentAttestations.hasAttestation(
        alice.address,
        topicId,
        await alignmentAttestations.getAddress(),
        statementId
      );
      expect(hasAttestation).to.equal(true);
    });

    it("Should handle statements with same content but different encodings", async function () {
      const stmt1 = ethers.encodeBytes32String("climate");
      const stmt2 = ethers.encodeBytes32String("climate ");

      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectAddress1, stmt1, topicId);

      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectAddress1,
          stmt1
        )
      ).to.equal(true);
      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectAddress1,
          stmt2
        )
      ).to.equal(false);
    });
  });

  describe("Topic Filtering", function () {
    it("Should emit same attestation with different topics as separate events", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");
      const topic1 = ethers.encodeBytes32String("environment");
      const topic2 = ethers.encodeBytes32String("sustainability");

      // Same subject-statement with different topics
      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignment(subjectAddress1, statementId, topic1)
      )
        .to.emit(alignmentAttestations, "AlignmentAttestation")
        .withArgs(alice.address, subjectAddress1, statementId, topic1);

      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignment(subjectAddress1, statementId, topic2)
      )
        .to.emit(alignmentAttestations, "AlignmentAttestation")
        .withArgs(alice.address, subjectAddress1, statementId, topic2);

      // The attestation mapping tracks per topic; both topic1 and topic2 have the attestation
      const hasAttestation1 = await alignmentAttestations.hasAttestation(
        alice.address,
        topic1,
        subjectAddress1,
        statementId
      );
      const hasAttestation2 = await alignmentAttestations.hasAttestation(
        alice.address,
        topic2,
        subjectAddress1,
        statementId
      );
      expect(hasAttestation1).to.equal(true);
      expect(hasAttestation2).to.equal(true);
    });
  });
});
