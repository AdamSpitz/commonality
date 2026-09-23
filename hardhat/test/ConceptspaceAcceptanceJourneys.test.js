import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

const NO_OPINION = 0;
const BELIEVES = 1;
const DISBELIEVES = 2;

/**
 * On-chain half of the two journeys in
 * specs/tech/conceptspace-repo-split-analysis.md.
 *
 * Subscribing to and muting a mediator is a browser list
 * (`commonality:trustedNudgers`, `commonality:mutedNudgers`), not a contract.
 * This file records the chain facts that list would follow: the mediator's
 * parent→modified batch, and a trust score the reader can set to zero.
 * Document shape is covered in the SDK acceptance-journey test.
 */

function statementId(label) {
  return ethers.sha256(ethers.toUtf8Bytes(label));
}

async function deployConceptspace() {
  const [reader, mediator, stranger] = await ethers.getSigners();
  const publishedData = await ethers.deployContract("PublishedData");
  const beliefs = await ethers.deployContract("Beliefs");
  const implications = await ethers.deployContract("Implications");
  const trust = await ethers.deployContract("TrustRegistry");
  const refs = await ethers.deployContract("MutableRefUpdater");
  const nudges = await ethers.deployContract("NudgePublications");
  const alignment = await ethers.deployContract("AlignmentAttestations");
  return { reader, mediator, stranger, publishedData, beliefs, implications, trust, refs, nudges, alignment };
}

describe("Conceptspace acceptance journeys", function () {
  it("signs, revises, and mediates a statement without a funding contract", async function () {
    const { reader, mediator, stranger, publishedData, beliefs, implications, trust, refs, nudges } =
      await deployConceptspace();

    const parentLabel = "statement:parents-should-choose";
    const modifiedLabel = "statement:parents-should-choose-rewritten";
    const parentId = statementId(parentLabel);
    const modifiedId = statementId(modifiedLabel);

    await publishedData.connect(reader).publishData(ethers.toUtf8Bytes(parentLabel));
    expect(await publishedData.isPublished(reader.address, parentId)).to.equal(true);

    await beliefs.connect(reader).setBelief(parentId, BELIEVES);
    expect(await beliefs.getBelief(reader.address, parentId)).to.equal(BELIEVES);

    await beliefs.connect(reader).setBelief(parentId, DISBELIEVES);
    expect(await beliefs.getBelief(reader.address, parentId)).to.equal(DISBELIEVES);

    await beliefs.connect(reader).setBelief(parentId, NO_OPINION);
    expect(await beliefs.getBelief(reader.address, parentId)).to.equal(NO_OPINION);

    await beliefs.connect(reader).setBelief(parentId, BELIEVES);
    await publishedData.connect(mediator).publishData(ethers.toUtf8Bytes(modifiedLabel));
    await implications.connect(mediator).attestImplication(modifiedId, parentId, ethers.ZeroHash);
    expect(await implications.attestations(mediator.address, modifiedId, parentId)).to.equal(true);
    // Implication-derived support: the reader believes the parent and has no direct opinion on the rewrite.
    expect(await beliefs.getBelief(reader.address, modifiedId)).to.equal(NO_OPINION);

    await implications.connect(stranger).attestImplication(parentId, modifiedId, ethers.ZeroHash);
    await trust.connect(reader).setTrust(mediator.address, 80);
    await trust.connect(reader).setTrust(stranger.address, 0);
    expect(await trust.getTrust(reader.address, mediator.address)).to.equal(80);
    expect(await trust.getTrust(reader.address, stranger.address)).to.equal(0);

    const nudgeBody = JSON.stringify({
      kind: "nudge-batch",
      nudges: [{ targetStatementCid: parentLabel, suggestedStatementCid: modifiedLabel }],
    });
    const batchId = ethers.sha256(ethers.toUtf8Bytes(nudgeBody));
    await publishedData.connect(mediator).publishData(ethers.toUtf8Bytes(nudgeBody));
    await expect(nudges.connect(mediator).publishNudgeBatch(batchId))
      .to.emit(nudges, "NudgesPublished")
      .withArgs(mediator.address, batchId);

    const publicationName = "statement-publication";
    await refs.connect(reader).updateRef(publicationName, parentLabel);
    expect(await refs.getRef(reader.address, publicationName)).to.equal(parentLabel);
    await refs.connect(reader).updateRef(publicationName, modifiedLabel);
    await publishedData.connect(reader).retractData(parentId);
    expect(await refs.getRef(reader.address, publicationName)).to.equal(modifiedLabel);
    expect(await publishedData.isRetracted(reader.address, parentId)).to.equal(true);
    expect(await publishedData.isPublished(reader.address, parentId)).to.equal(true);
    expect(await publishedData.isRetracted(reader.address, modifiedId)).to.equal(false);
  });

  it("funds a project aligned to that same statement", async function () {
    const { reader, publishedData, alignment } = await deployConceptspace();
    const statementLabel = "statement:shared-with-funding";
    const statement = statementId(statementLabel);
    await publishedData.connect(reader).publishData(ethers.toUtf8Bytes(statementLabel));

    const tokenFactory = await ethers.deployContract("PremintingERC1155Factory");
    const assuranceFactory = await ethers.deployContract("AssuranceContractFactory");
    const conditionFactory = await ethers.deployContract("ValueThresholdConditionFactory");
    const verifier = await ethers.deployContract("MockBeneficiaryVerifier");
    const paymentToken = await ethers.deployContract("FreeERC20", ["USD Coin", "USDC", 6]);
    const beneficiaryRegistry = await ethers.deployContract("BeneficiaryRegistry", [verifier.target]);
    const beneficiaryEscrow = await ethers.deployContract("BeneficiaryEscrow", [
      beneficiaryRegistry.target,
      paymentToken.target,
    ]);
    const projectFactory = await ethers.deployContract("ProjectFactory", [
      tokenFactory.target,
      assuranceFactory.target,
      conditionFactory.target,
      beneficiaryRegistry.target,
      beneficiaryEscrow.target,
    ]);

    const [, owner, recipient] = await ethers.getSigners();
    const deadline = BigInt((await ethers.provider.getBlock("latest")).timestamp + 3600);
    const tx = await projectFactory.connect(reader).createERC1155AndAssuranceContract(
      "ipfs://tokens/{id}.json",
      "ipfs://contract.json",
      owner.address,
      recipient.address,
      paymentToken.target,
      100n,
      deadline,
      "bafyproject",
      [1n],
      [10n],
      [5n],
    );
    const receipt = await tx.wait();
    const created = receipt.logs
      .map((log) => {
        try {
          return projectFactory.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((log) => log?.name === "ProjectCreated");

    const subjectId = ethers.zeroPadValue(created.args.assuranceContract, 32);
    const topicId = statementId("topic:project-alignment");
    await alignment.connect(reader).attestAlignment(subjectId, statement, topicId);
    expect(await alignment.hasAttestation(reader.address, topicId, subjectId, statement)).to.equal(true);

    const assurance = await ethers.getContractAt(
      "MultiERC1155AssuranceContract",
      created.args.assuranceContract,
    );
    await paymentToken.connect(reader).mint(5n);
    await paymentToken.connect(reader).approve(assurance.target, 5n);
    await assurance.connect(reader).buyERC1155(reader.address, created.args.token, [1n], [1n], "0x");
    expect(await paymentToken.balanceOf(assurance.target)).to.equal(5n);

    // The statement publication is still readable after funding.
    expect(await publishedData.isPublished(reader.address, statement)).to.equal(true);
    expect(await publishedData.isRetracted(reader.address, statement)).to.equal(false);
  });
});
