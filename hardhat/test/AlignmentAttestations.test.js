import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Convert an address to a bytes32 subject ID (left-padded)
function addressToSubjectId(addr) {
  return ethers.zeroPadValue(addr, 32);
}

describe("AlignmentAttestations", function () {
  let alignmentAttestations;
  let alice, bob, charlie;
  let subjectId1, subjectId2, subjectId3;
  let topicId; // Default topic for tests

  beforeEach(async function () {
    [alice, bob, charlie] = await ethers.getSigners();
    const AlignmentAttestations = await ethers.getContractFactory("AlignmentAttestations");
    alignmentAttestations = await AlignmentAttestations.deploy();

    // Use address-derived subject IDs (the common case for projects/users)
    subjectId1 = addressToSubjectId(ethers.Wallet.createRandom().address);
    subjectId2 = addressToSubjectId(ethers.Wallet.createRandom().address);
    subjectId3 = addressToSubjectId(ethers.Wallet.createRandom().address);

    // Default topic for most tests
    topicId = ethers.encodeBytes32String("alignment-topic");
  });

  describe("Single Attestation", function () {
    it("Should allow attesting alignment", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectId1, statementId, topicId);

      const hasAttestation = await alignmentAttestations.hasAttestation(
        alice.address,
        topicId,
        subjectId1,
        statementId
      );
      expect(hasAttestation).to.equal(true);
    });

    it("Should emit AlignmentAttestation event with topicStatementId", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignment(subjectId1, statementId, topicId)
      )
        .to.emit(alignmentAttestations, "AlignmentAttestation")
        .withArgs(alice.address, subjectId1, statementId, topicId);
    });

    it("Should reject zero topicStatementId", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignment(subjectId1, statementId, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(alignmentAttestations, "InvalidTopicStatementId");
    });

    it("Should reject zero subject ID", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignment(ethers.ZeroHash, statementId, topicId)
      ).to.be.revertedWithCustomError(alignmentAttestations, "InvalidSubjectId");
    });

    it("Should reject zero statement ID", async function () {
      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignment(subjectId1, ethers.ZeroHash, topicId)
      ).to.be.revertedWithCustomError(alignmentAttestations, "InvalidStatementId");
    });

    it("Should be idempotent (allow re-attesting same alignment)", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectId1, statementId, topicId);
      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectId1, statementId, topicId);

      const hasAttestation = await alignmentAttestations.hasAttestation(
        alice.address,
        topicId,
        subjectId1,
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
        .attestAlignment(subjectId1, statementId, topicId);

      const aliceHas = await alignmentAttestations.hasAttestation(
        alice.address,
        topicId,
        subjectId1,
        statementId
      );
      const bobHas = await alignmentAttestations.hasAttestation(
        bob.address,
        topicId,
        subjectId1,
        statementId
      );

      expect(aliceHas).to.equal(true);
      expect(bobHas).to.equal(false);
    });

    it("Should allow different attesters to attest same alignment", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectId1, statementId, topicId);
      await alignmentAttestations
        .connect(bob)
        .attestAlignment(subjectId1, statementId, topicId);

      const aliceHas = await alignmentAttestations.hasAttestation(
        alice.address,
        topicId,
        subjectId1,
        statementId
      );
      const bobHas = await alignmentAttestations.hasAttestation(
        bob.address,
        topicId,
        subjectId1,
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
        .attestAlignment(subjectId1, climate, topicId);
      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectId1, poverty, topicId);
      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectId1, education, topicId);

      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectId1,
          climate
        )
      ).to.equal(true);
      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectId1,
          poverty
        )
      ).to.equal(true);
      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectId1,
          education
        )
      ).to.equal(true);
    });

    it("Should allow multiple subjects to align with same statement", async function () {
      const climate = ethers.encodeBytes32String("climate-action");

      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectId1, climate, topicId);
      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectId2, climate, topicId);
      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectId3, climate, topicId);

      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectId1,
          climate
        )
      ).to.equal(true);
      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectId2,
          climate
        )
      ).to.equal(true);
      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectId3,
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
        .attestAlignment(subjectId1, climate, topicId);

      // Subject 2 aligns with poverty
      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectId2, poverty, topicId);

      // Verify correct alignments exist
      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectId1,
          climate
        )
      ).to.equal(true);
      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectId2,
          poverty
        )
      ).to.equal(true);

      // Verify cross-alignments don't exist
      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectId1,
          poverty
        )
      ).to.equal(false);
      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectId2,
          climate
        )
      ).to.equal(false);
    });
  });

  describe("Batch Attestations", function () {
    it("Should handle batch attestations", async function () {
      const subjects = [subjectId1, subjectId2, subjectId3];
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
      const subjects = [subjectId1, subjectId2];
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
      const subjects = [subjectId1, subjectId2];
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
      const subjects = [subjectId1, subjectId2];
      const statements = [ethers.encodeBytes32String("climate-action")];
      const topics = [topicId, topicId];

      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignmentsInBatch(subjects, statements, topics)
      ).to.be.revertedWithCustomError(alignmentAttestations, "ArrayLengthMismatch");
    });

    it("Should reject batch with mismatched topics array length", async function () {
      const subjects = [subjectId1, subjectId2];
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

    it("Should reject batch with zero subject ID", async function () {
      const subjects = [ethers.ZeroHash];
      const statements = [ethers.encodeBytes32String("climate-action")];
      const topics = [topicId];

      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignmentsInBatch(subjects, statements, topics)
      ).to.be.revertedWithCustomError(alignmentAttestations, "InvalidSubjectId");
    });

    it("Should reject batch with zero statement ID", async function () {
      const subjects = [subjectId1];
      const statements = [ethers.ZeroHash];
      const topics = [topicId];

      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignmentsInBatch(subjects, statements, topics)
      ).to.be.revertedWithCustomError(alignmentAttestations, "InvalidStatementId");
    });

    it("Should reject batch with zero topic statement ID", async function () {
      const subjects = [subjectId1];
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

  describe("Content Item Subjects", function () {
    it("Should allow attesting about a content item by its content ID hash", async function () {
      // Content ID: keccak256("twitter:18347") — same scheme as the content registry
      const contentId = ethers.keccak256(ethers.toUtf8Bytes("twitter:18347"));
      const statementId = ethers.encodeBytes32String("noninflammatory");

      await alignmentAttestations
        .connect(alice)
        .attestAlignment(contentId, statementId, topicId);

      const hasAttestation = await alignmentAttestations.hasAttestation(
        alice.address,
        topicId,
        contentId,
        statementId
      );
      expect(hasAttestation).to.equal(true);
    });

    it("Should keep address-derived and content-hash subjects independent", async function () {
      const contentId = ethers.keccak256(ethers.toUtf8Bytes("youtube:dQw4w9WgXcQ"));
      const statementId = ethers.encodeBytes32String("noninflammatory");

      await alignmentAttestations
        .connect(alice)
        .attestAlignment(contentId, statementId, topicId);
      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectId1, statementId, topicId);

      expect(
        await alignmentAttestations.hasAttestation(alice.address, topicId, contentId, statementId)
      ).to.equal(true);
      expect(
        await alignmentAttestations.hasAttestation(alice.address, topicId, subjectId1, statementId)
      ).to.equal(true);

      // They are independent — revoking one doesn't affect the other
      await alignmentAttestations
        .connect(alice)
        .removeAttestation(contentId, statementId, topicId);

      expect(
        await alignmentAttestations.hasAttestation(alice.address, topicId, contentId, statementId)
      ).to.equal(false);
      expect(
        await alignmentAttestations.hasAttestation(alice.address, topicId, subjectId1, statementId)
      ).to.equal(true);
    });

    it("Should batch attest mixed address and content subjects", async function () {
      const contentId = ethers.keccak256(ethers.toUtf8Bytes("twitter:29451"));
      const subjects = [subjectId1, contentId];
      const statements = [
        ethers.encodeBytes32String("climate-action"),
        ethers.encodeBytes32String("noninflammatory"),
      ];
      const topics = [topicId, topicId];

      await alignmentAttestations
        .connect(alice)
        .attestAlignmentsInBatch(subjects, statements, topics);

      expect(
        await alignmentAttestations.hasAttestation(alice.address, topicId, subjectId1, statements[0])
      ).to.equal(true);
      expect(
        await alignmentAttestations.hasAttestation(alice.address, topicId, contentId, statements[1])
      ).to.equal(true);
    });
  });

  describe("Revocation", function () {
    it("Should allow revoking an attestation", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectId1, statementId, topicId);

      expect(
        await alignmentAttestations.hasAttestation(alice.address, topicId, subjectId1, statementId)
      ).to.equal(true);

      await alignmentAttestations
        .connect(alice)
        .removeAttestation(subjectId1, statementId, topicId);

      expect(
        await alignmentAttestations.hasAttestation(alice.address, topicId, subjectId1, statementId)
      ).to.equal(false);
    });

    it("Should emit AlignmentRevoked event", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectId1, statementId, topicId);

      await expect(
        alignmentAttestations
          .connect(alice)
          .removeAttestation(subjectId1, statementId, topicId)
      )
        .to.emit(alignmentAttestations, "AlignmentRevoked")
        .withArgs(alice.address, subjectId1, statementId, topicId);
    });
  });

  describe("Edge Cases", function () {
    it("Should return false for non-existent attestation", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      const hasAttestation = await alignmentAttestations.hasAttestation(
        alice.address,
        topicId,
        subjectId1,
        statementId
      );
      expect(hasAttestation).to.equal(false);
    });

    it("Should allow using a contract address as subject (left-padded to bytes32)", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      const contractSubjectId = addressToSubjectId(await alignmentAttestations.getAddress());
      await alignmentAttestations
        .connect(alice)
        .attestAlignment(contractSubjectId, statementId, topicId);

      const hasAttestation = await alignmentAttestations.hasAttestation(
        alice.address,
        topicId,
        contractSubjectId,
        statementId
      );
      expect(hasAttestation).to.equal(true);
    });

    it("Should handle statements with same content but different encodings", async function () {
      const stmt1 = ethers.encodeBytes32String("climate");
      const stmt2 = ethers.encodeBytes32String("climate ");

      await alignmentAttestations
        .connect(alice)
        .attestAlignment(subjectId1, stmt1, topicId);

      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectId1,
          stmt1
        )
      ).to.equal(true);
      expect(
        await alignmentAttestations.hasAttestation(
          alice.address,
          topicId,
          subjectId1,
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
          .attestAlignment(subjectId1, statementId, topic1)
      )
        .to.emit(alignmentAttestations, "AlignmentAttestation")
        .withArgs(alice.address, subjectId1, statementId, topic1);

      await expect(
        alignmentAttestations
          .connect(alice)
          .attestAlignment(subjectId1, statementId, topic2)
      )
        .to.emit(alignmentAttestations, "AlignmentAttestation")
        .withArgs(alice.address, subjectId1, statementId, topic2);

      // The attestation mapping tracks per topic; both topic1 and topic2 have the attestation
      const hasAttestation1 = await alignmentAttestations.hasAttestation(
        alice.address,
        topic1,
        subjectId1,
        statementId
      );
      const hasAttestation2 = await alignmentAttestations.hasAttestation(
        alice.address,
        topic2,
        subjectId1,
        statementId
      );
      expect(hasAttestation1).to.equal(true);
      expect(hasAttestation2).to.equal(true);
    });
  });
});
