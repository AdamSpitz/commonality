import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("ProjectAlignment", function () {
  let projectAlignment;
  let alice, bob, charlie;
  let projectAddress1, projectAddress2, projectAddress3;
  let topicId; // Default topic for tests

  beforeEach(async function () {
    [alice, bob, charlie] = await ethers.getSigners();
    const ProjectAlignment = await ethers.getContractFactory("ProjectAlignment");
    projectAlignment = await ProjectAlignment.deploy();

    // Use some addresses to represent project contracts
    projectAddress1 = ethers.Wallet.createRandom().address;
    projectAddress2 = ethers.Wallet.createRandom().address;
    projectAddress3 = ethers.Wallet.createRandom().address;

    // Default topic for most tests
    topicId = ethers.encodeBytes32String("project-alignment");
  });

  describe("Single Attestation", function () {
    it("Should allow attesting project alignment", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress1, statementId, topicId);

      const hasAttestation = await projectAlignment.hasAttestation(
        alice.address,
        projectAddress1,
        statementId
      );
      expect(hasAttestation).to.equal(true);
    });

    it("Should emit ProjectAlignmentAttestation event with topicStatementId", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await expect(
        projectAlignment
          .connect(alice)
          .attestAlignment(projectAddress1, statementId, topicId)
      )
        .to.emit(projectAlignment, "ProjectAlignmentAttestation")
        .withArgs(alice.address, projectAddress1, statementId, topicId);
    });

    it("Should allow zero topicStatementId (no topic)", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await expect(
        projectAlignment
          .connect(alice)
          .attestAlignment(projectAddress1, statementId, ethers.ZeroHash)
      )
        .to.emit(projectAlignment, "ProjectAlignmentAttestation")
        .withArgs(alice.address, projectAddress1, statementId, ethers.ZeroHash);

      const hasAttestation = await projectAlignment.hasAttestation(
        alice.address,
        projectAddress1,
        statementId
      );
      expect(hasAttestation).to.equal(true);
    });

    it("Should reject zero project address", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await expect(
        projectAlignment
          .connect(alice)
          .attestAlignment(ethers.ZeroAddress, statementId, topicId)
      ).to.be.revertedWith("Invalid project address");
    });

    it("Should reject zero statement ID", async function () {
      await expect(
        projectAlignment
          .connect(alice)
          .attestAlignment(projectAddress1, ethers.ZeroHash, topicId)
      ).to.be.revertedWith("Invalid statement ID");
    });

    it("Should be idempotent (allow re-attesting same alignment)", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress1, statementId, topicId);
      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress1, statementId, topicId);

      const hasAttestation = await projectAlignment.hasAttestation(
        alice.address,
        projectAddress1,
        statementId
      );
      expect(hasAttestation).to.equal(true);
    });
  });

  describe("Multiple Attesters", function () {
    it("Should track attestations separately per attester", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress1, statementId, topicId);

      const aliceHas = await projectAlignment.hasAttestation(
        alice.address,
        projectAddress1,
        statementId
      );
      const bobHas = await projectAlignment.hasAttestation(
        bob.address,
        projectAddress1,
        statementId
      );

      expect(aliceHas).to.equal(true);
      expect(bobHas).to.equal(false);
    });

    it("Should allow different attesters to attest same alignment", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress1, statementId, topicId);
      await projectAlignment
        .connect(bob)
        .attestAlignment(projectAddress1, statementId, topicId);

      const aliceHas = await projectAlignment.hasAttestation(
        alice.address,
        projectAddress1,
        statementId
      );
      const bobHas = await projectAlignment.hasAttestation(
        bob.address,
        projectAddress1,
        statementId
      );

      expect(aliceHas).to.equal(true);
      expect(bobHas).to.equal(true);
    });
  });

  describe("Multiple Alignments", function () {
    it("Should allow one project to align with multiple statements", async function () {
      const climate = ethers.encodeBytes32String("climate-action");
      const poverty = ethers.encodeBytes32String("poverty-reduction");
      const education = ethers.encodeBytes32String("education");

      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress1, climate, topicId);
      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress1, poverty, topicId);
      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress1, education, topicId);

      expect(
        await projectAlignment.hasAttestation(
          alice.address,
          projectAddress1,
          climate
        )
      ).to.equal(true);
      expect(
        await projectAlignment.hasAttestation(
          alice.address,
          projectAddress1,
          poverty
        )
      ).to.equal(true);
      expect(
        await projectAlignment.hasAttestation(
          alice.address,
          projectAddress1,
          education
        )
      ).to.equal(true);
    });

    it("Should allow multiple projects to align with same statement", async function () {
      const climate = ethers.encodeBytes32String("climate-action");

      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress1, climate, topicId);
      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress2, climate, topicId);
      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress3, climate, topicId);

      expect(
        await projectAlignment.hasAttestation(
          alice.address,
          projectAddress1,
          climate
        )
      ).to.equal(true);
      expect(
        await projectAlignment.hasAttestation(
          alice.address,
          projectAddress2,
          climate
        )
      ).to.equal(true);
      expect(
        await projectAlignment.hasAttestation(
          alice.address,
          projectAddress3,
          climate
        )
      ).to.equal(true);
    });

    it("Should keep different project-statement pairs independent", async function () {
      const climate = ethers.encodeBytes32String("climate-action");
      const poverty = ethers.encodeBytes32String("poverty-reduction");

      // Project 1 aligns with climate
      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress1, climate, topicId);

      // Project 2 aligns with poverty
      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress2, poverty, topicId);

      // Verify correct alignments exist
      expect(
        await projectAlignment.hasAttestation(
          alice.address,
          projectAddress1,
          climate
        )
      ).to.equal(true);
      expect(
        await projectAlignment.hasAttestation(
          alice.address,
          projectAddress2,
          poverty
        )
      ).to.equal(true);

      // Verify cross-alignments don't exist
      expect(
        await projectAlignment.hasAttestation(
          alice.address,
          projectAddress1,
          poverty
        )
      ).to.equal(false);
      expect(
        await projectAlignment.hasAttestation(
          alice.address,
          projectAddress2,
          climate
        )
      ).to.equal(false);
    });
  });

  describe("Batch Attestations", function () {
    it("Should handle batch attestations", async function () {
      const projects = [projectAddress1, projectAddress2, projectAddress3];
      const statements = [
        ethers.encodeBytes32String("climate-action"),
        ethers.encodeBytes32String("poverty-reduction"),
        ethers.encodeBytes32String("education"),
      ];
      const topics = [topicId, topicId, topicId];

      await projectAlignment
        .connect(alice)
        .attestAlignmentsInBatch(projects, statements, topics);

      for (let i = 0; i < projects.length; i++) {
        const hasAttestation = await projectAlignment.hasAttestation(
          alice.address,
          projects[i],
          statements[i]
        );
        expect(hasAttestation).to.equal(true);
      }
    });

    it("Should emit events for each batch attestation with topicStatementId", async function () {
      const projects = [projectAddress1, projectAddress2];
      const statements = [
        ethers.encodeBytes32String("climate-action"),
        ethers.encodeBytes32String("poverty-reduction"),
      ];
      const topics = [topicId, topicId];

      const tx = await projectAlignment
        .connect(alice)
        .attestAlignmentsInBatch(projects, statements, topics);

      await expect(tx)
        .to.emit(projectAlignment, "ProjectAlignmentAttestation")
        .withArgs(alice.address, projects[0], statements[0], topics[0]);

      await expect(tx)
        .to.emit(projectAlignment, "ProjectAlignmentAttestation")
        .withArgs(alice.address, projects[1], statements[1], topics[1]);
    });

    it("Should allow different topics per attestation in batch", async function () {
      const projects = [projectAddress1, projectAddress2];
      const statements = [
        ethers.encodeBytes32String("climate-action"),
        ethers.encodeBytes32String("poverty-reduction"),
      ];
      const topic1 = ethers.encodeBytes32String("environment");
      const topic2 = ethers.encodeBytes32String("social-welfare");
      const topics = [topic1, topic2];

      const tx = await projectAlignment
        .connect(alice)
        .attestAlignmentsInBatch(projects, statements, topics);

      await expect(tx)
        .to.emit(projectAlignment, "ProjectAlignmentAttestation")
        .withArgs(alice.address, projects[0], statements[0], topic1);

      await expect(tx)
        .to.emit(projectAlignment, "ProjectAlignmentAttestation")
        .withArgs(alice.address, projects[1], statements[1], topic2);
    });

    it("Should reject batch with mismatched array lengths", async function () {
      const projects = [projectAddress1, projectAddress2];
      const statements = [ethers.encodeBytes32String("climate-action")];
      const topics = [topicId, topicId];

      await expect(
        projectAlignment
          .connect(alice)
          .attestAlignmentsInBatch(projects, statements, topics)
      ).to.be.revertedWith("Arrays must have same length");
    });

    it("Should reject batch with mismatched topics array length", async function () {
      const projects = [projectAddress1, projectAddress2];
      const statements = [
        ethers.encodeBytes32String("climate-action"),
        ethers.encodeBytes32String("poverty-reduction"),
      ];
      const topics = [topicId]; // Only one topic

      await expect(
        projectAlignment
          .connect(alice)
          .attestAlignmentsInBatch(projects, statements, topics)
      ).to.be.revertedWith("Arrays must have same length");
    });

    it("Should reject batch with zero project address", async function () {
      const projects = [ethers.ZeroAddress];
      const statements = [ethers.encodeBytes32String("climate-action")];
      const topics = [topicId];

      await expect(
        projectAlignment
          .connect(alice)
          .attestAlignmentsInBatch(projects, statements, topics)
      ).to.be.revertedWith("Invalid project address");
    });

    it("Should reject batch with zero statement ID", async function () {
      const projects = [projectAddress1];
      const statements = [ethers.ZeroHash];
      const topics = [topicId];

      await expect(
        projectAlignment
          .connect(alice)
          .attestAlignmentsInBatch(projects, statements, topics)
      ).to.be.revertedWith("Invalid statement ID");
    });

    it("Should handle empty batch", async function () {
      await projectAlignment.connect(alice).attestAlignmentsInBatch([], [], []);
      // Should not revert
    });
  });

  describe("Edge Cases", function () {
    it("Should return false for non-existent attestation", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      const hasAttestation = await projectAlignment.hasAttestation(
        alice.address,
        projectAddress1,
        statementId
      );
      expect(hasAttestation).to.equal(false);
    });

    it("Should allow using actual contract addresses as projects", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      // Use the deployed contract's address as a "project" (valid use case)
      await projectAlignment
        .connect(alice)
        .attestAlignment(await projectAlignment.getAddress(), statementId, topicId);

      const hasAttestation = await projectAlignment.hasAttestation(
        alice.address,
        await projectAlignment.getAddress(),
        statementId
      );
      expect(hasAttestation).to.equal(true);
    });

    it("Should handle statements with same content but different encodings", async function () {
      const stmt1 = ethers.encodeBytes32String("climate");
      const stmt2 = ethers.encodeBytes32String("climate ");

      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress1, stmt1, topicId);

      expect(
        await projectAlignment.hasAttestation(
          alice.address,
          projectAddress1,
          stmt1
        )
      ).to.equal(true);
      expect(
        await projectAlignment.hasAttestation(
          alice.address,
          projectAddress1,
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

      // Same project-statement with different topics
      await expect(
        projectAlignment
          .connect(alice)
          .attestAlignment(projectAddress1, statementId, topic1)
      )
        .to.emit(projectAlignment, "ProjectAlignmentAttestation")
        .withArgs(alice.address, projectAddress1, statementId, topic1);

      await expect(
        projectAlignment
          .connect(alice)
          .attestAlignment(projectAddress1, statementId, topic2)
      )
        .to.emit(projectAlignment, "ProjectAlignmentAttestation")
        .withArgs(alice.address, projectAddress1, statementId, topic2);

      // The attestation mapping only tracks project-statement pair, not topic
      const hasAttestation = await projectAlignment.hasAttestation(
        alice.address,
        projectAddress1,
        statementId
      );
      expect(hasAttestation).to.equal(true);
    });
  });
});
