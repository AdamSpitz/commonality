import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("ProjectAlignment", function () {
  let projectAlignment;
  let alice, bob, charlie;
  let projectAddress1, projectAddress2, projectAddress3;

  beforeEach(async function () {
    [alice, bob, charlie] = await ethers.getSigners();
    const ProjectAlignment = await ethers.getContractFactory("ProjectAlignment");
    projectAlignment = await ProjectAlignment.deploy();

    // Use some addresses to represent project contracts
    projectAddress1 = ethers.Wallet.createRandom().address;
    projectAddress2 = ethers.Wallet.createRandom().address;
    projectAddress3 = ethers.Wallet.createRandom().address;
  });

  describe("Single Attestation", function () {
    it("Should allow attesting project alignment", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress1, statementId);

      const hasAttestation = await projectAlignment.hasAttestation(
        alice.address,
        projectAddress1,
        statementId
      );
      expect(hasAttestation).to.equal(true);
    });

    it("Should emit ProjectAlignmentAttestation event", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await expect(
        projectAlignment
          .connect(alice)
          .attestAlignment(projectAddress1, statementId)
      )
        .to.emit(projectAlignment, "ProjectAlignmentAttestation")
        .withArgs(alice.address, projectAddress1, statementId);
    });

    it("Should reject zero project address", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await expect(
        projectAlignment
          .connect(alice)
          .attestAlignment(ethers.ZeroAddress, statementId)
      ).to.be.revertedWith("Invalid project address");
    });

    it("Should reject zero statement ID", async function () {
      await expect(
        projectAlignment
          .connect(alice)
          .attestAlignment(projectAddress1, ethers.ZeroHash)
      ).to.be.revertedWith("Invalid statement ID");
    });

    it("Should be idempotent (allow re-attesting same alignment)", async function () {
      const statementId = ethers.encodeBytes32String("climate-action");

      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress1, statementId);
      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress1, statementId);

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
        .attestAlignment(projectAddress1, statementId);

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
        .attestAlignment(projectAddress1, statementId);
      await projectAlignment
        .connect(bob)
        .attestAlignment(projectAddress1, statementId);

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
        .attestAlignment(projectAddress1, climate);
      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress1, poverty);
      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress1, education);

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
        .attestAlignment(projectAddress1, climate);
      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress2, climate);
      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress3, climate);

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
        .attestAlignment(projectAddress1, climate);

      // Project 2 aligns with poverty
      await projectAlignment
        .connect(alice)
        .attestAlignment(projectAddress2, poverty);

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

      await projectAlignment
        .connect(alice)
        .attestAlignmentsInBatch(projects, statements);

      for (let i = 0; i < projects.length; i++) {
        const hasAttestation = await projectAlignment.hasAttestation(
          alice.address,
          projects[i],
          statements[i]
        );
        expect(hasAttestation).to.equal(true);
      }
    });

    it("Should emit events for each batch attestation", async function () {
      const projects = [projectAddress1, projectAddress2];
      const statements = [
        ethers.encodeBytes32String("climate-action"),
        ethers.encodeBytes32String("poverty-reduction"),
      ];

      const tx = await projectAlignment
        .connect(alice)
        .attestAlignmentsInBatch(projects, statements);

      await expect(tx)
        .to.emit(projectAlignment, "ProjectAlignmentAttestation")
        .withArgs(alice.address, projects[0], statements[0]);

      await expect(tx)
        .to.emit(projectAlignment, "ProjectAlignmentAttestation")
        .withArgs(alice.address, projects[1], statements[1]);
    });

    it("Should reject batch with mismatched array lengths", async function () {
      const projects = [projectAddress1, projectAddress2];
      const statements = [ethers.encodeBytes32String("climate-action")];

      await expect(
        projectAlignment
          .connect(alice)
          .attestAlignmentsInBatch(projects, statements)
      ).to.be.revertedWith("Arrays must have same length");
    });

    it("Should reject batch with zero project address", async function () {
      const projects = [ethers.ZeroAddress];
      const statements = [ethers.encodeBytes32String("climate-action")];

      await expect(
        projectAlignment
          .connect(alice)
          .attestAlignmentsInBatch(projects, statements)
      ).to.be.revertedWith("Invalid project address");
    });

    it("Should reject batch with zero statement ID", async function () {
      const projects = [projectAddress1];
      const statements = [ethers.ZeroHash];

      await expect(
        projectAlignment
          .connect(alice)
          .attestAlignmentsInBatch(projects, statements)
      ).to.be.revertedWith("Invalid statement ID");
    });

    it("Should handle empty batch", async function () {
      await projectAlignment.connect(alice).attestAlignmentsInBatch([], []);
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
        .attestAlignment(await projectAlignment.getAddress(), statementId);

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
        .attestAlignment(projectAddress1, stmt1);

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
});
