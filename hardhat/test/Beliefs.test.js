// AI-generated tests for Beliefs contract
import { expect } from "chai";
import hre from "hardhat";

describe("Beliefs", function () {
  let beliefs;
  let owner;
  let user1;
  let user2;

  // Sample statement IDs (IPFS CIDs represented as bytes32)
  const statementId1 = hre.ethers.encodeBytes32String("QmTest1");
  const statementId2 = hre.ethers.encodeBytes32String("QmTest2");
  const statementId3 = hre.ethers.encodeBytes32String("QmTest3");

  const NO_OPINION = 0;
  const BELIEVES = 1;
  const DISBELIEVES = 2;

  beforeEach(async function () {
    [owner, user1, user2] = await hre.ethers.getSigners();

    const Beliefs = await hre.ethers.getContractFactory("Beliefs");
    beliefs = await Beliefs.deploy();
  });

  describe("Constants", function () {
    it("should have correct belief state constants", async function () {
      expect(await beliefs.NO_OPINION()).to.equal(NO_OPINION);
      expect(await beliefs.BELIEVES()).to.equal(BELIEVES);
      expect(await beliefs.DISBELIEVES()).to.equal(DISBELIEVES);
    });
  });

  describe("setBelief", function () {
    it("should allow setting belief to BELIEVES", async function () {
      await expect(beliefs.connect(user1).setBelief(statementId1, BELIEVES))
        .to.emit(beliefs, "DirectSupport")
        .withArgs(user1.address, statementId1, BELIEVES);

      expect(await beliefs.getBelief(user1.address, statementId1)).to.equal(
        BELIEVES
      );
    });

    it("should allow setting belief to DISBELIEVES", async function () {
      await expect(beliefs.connect(user1).setBelief(statementId1, DISBELIEVES))
        .to.emit(beliefs, "DirectSupport")
        .withArgs(user1.address, statementId1, DISBELIEVES);

      expect(await beliefs.getBelief(user1.address, statementId1)).to.equal(
        DISBELIEVES
      );
    });

    it("should allow setting belief to NO_OPINION", async function () {
      // First set to BELIEVES
      await beliefs.connect(user1).setBelief(statementId1, BELIEVES);

      // Then set back to NO_OPINION
      await expect(beliefs.connect(user1).setBelief(statementId1, NO_OPINION))
        .to.emit(beliefs, "DirectSupport")
        .withArgs(user1.address, statementId1, NO_OPINION);

      expect(await beliefs.getBelief(user1.address, statementId1)).to.equal(
        NO_OPINION
      );
    });

    it("should allow changing belief", async function () {
      await beliefs.connect(user1).setBelief(statementId1, BELIEVES);
      await beliefs.connect(user1).setBelief(statementId1, DISBELIEVES);

      expect(await beliefs.getBelief(user1.address, statementId1)).to.equal(
        DISBELIEVES
      );
    });

    it("should reject invalid belief states", async function () {
      await expect(
        beliefs.connect(user1).setBelief(statementId1, 3)
      ).to.be.revertedWith("Invalid belief state");

      await expect(
        beliefs.connect(user1).setBelief(statementId1, 255)
      ).to.be.revertedWith("Invalid belief state");
    });

    it("should allow different users to have different beliefs", async function () {
      await beliefs.connect(user1).setBelief(statementId1, BELIEVES);
      await beliefs.connect(user2).setBelief(statementId1, DISBELIEVES);

      expect(await beliefs.getBelief(user1.address, statementId1)).to.equal(
        BELIEVES
      );
      expect(await beliefs.getBelief(user2.address, statementId1)).to.equal(
        DISBELIEVES
      );
    });

    it("should allow user to have beliefs about multiple statements", async function () {
      await beliefs.connect(user1).setBelief(statementId1, BELIEVES);
      await beliefs.connect(user1).setBelief(statementId2, DISBELIEVES);
      await beliefs.connect(user1).setBelief(statementId3, NO_OPINION);

      expect(await beliefs.getBelief(user1.address, statementId1)).to.equal(
        BELIEVES
      );
      expect(await beliefs.getBelief(user1.address, statementId2)).to.equal(
        DISBELIEVES
      );
      expect(await beliefs.getBelief(user1.address, statementId3)).to.equal(
        NO_OPINION
      );
    });
  });

  describe("getBelief", function () {
    it("should return NO_OPINION by default", async function () {
      expect(await beliefs.getBelief(user1.address, statementId1)).to.equal(
        NO_OPINION
      );
    });

    it("should return correct belief after setting", async function () {
      await beliefs.connect(user1).setBelief(statementId1, BELIEVES);
      expect(await beliefs.getBelief(user1.address, statementId1)).to.equal(
        BELIEVES
      );
    });
  });

  describe("setBeliefsInBatch", function () {
    it("should set multiple beliefs in one transaction", async function () {
      const statementIds = [statementId1, statementId2, statementId3];
      const beliefStates = [BELIEVES, DISBELIEVES, NO_OPINION];

      await beliefs.connect(user1).setBeliefsInBatch(statementIds, beliefStates);

      expect(await beliefs.getBelief(user1.address, statementId1)).to.equal(
        BELIEVES
      );
      expect(await beliefs.getBelief(user1.address, statementId2)).to.equal(
        DISBELIEVES
      );
      expect(await beliefs.getBelief(user1.address, statementId3)).to.equal(
        NO_OPINION
      );
    });

    it("should emit DirectSupport events for each belief", async function () {
      const statementIds = [statementId1, statementId2];
      const beliefStates = [BELIEVES, DISBELIEVES];

      const tx = await beliefs
        .connect(user1)
        .setBeliefsInBatch(statementIds, beliefStates);

      const receipt = await tx.wait();
      const events = receipt.logs.filter(
        (log) => log.fragment && log.fragment.name === "DirectSupport"
      );

      expect(events).to.have.lengthOf(2);
    });

    it("should reject arrays of different lengths", async function () {
      const statementIds = [statementId1, statementId2];
      const beliefStates = [BELIEVES]; // Mismatched length

      await expect(
        beliefs.connect(user1).setBeliefsInBatch(statementIds, beliefStates)
      ).to.be.revertedWith("Arrays must have same length");
    });

    it("should reject invalid belief states in batch", async function () {
      const statementIds = [statementId1, statementId2];
      const beliefStates = [BELIEVES, 5]; // Invalid state

      await expect(
        beliefs.connect(user1).setBeliefsInBatch(statementIds, beliefStates)
      ).to.be.revertedWith("Invalid belief state");
    });

    it("should handle empty arrays", async function () {
      await beliefs.connect(user1).setBeliefsInBatch([], []);
      // Should not revert
    });
  });

  describe("Public mapping access", function () {
    it("should allow direct access to beliefs mapping", async function () {
      await beliefs.connect(user1).setBelief(statementId1, BELIEVES);

      const beliefState = await beliefs.beliefs(user1.address, statementId1);
      expect(beliefState).to.equal(BELIEVES);
    });
  });
});
