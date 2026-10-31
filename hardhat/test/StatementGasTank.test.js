import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

const ZERO_BYTES32 = "0x" + "00".repeat(32);
const STATEMENT_A = ethers.id("statement-a");
const STATEMENT_B = ethers.id("statement-b");
const STATEMENT_C = ethers.id("statement-c");
const BELIEVES = 1;
const DISBELIEVES = 2;

function paymasterData(paymaster, statementId) {
  return ethers.solidityPacked(
    ["address", "uint128", "uint128", "bytes32"],
    [paymaster, 0, 0, statementId],
  );
}

function userOp(sender, callData, paymasterAndData) {
  return {
    sender,
    nonce: 0,
    initCode: "0x",
    callData,
    accountGasLimits: ZERO_BYTES32,
    preVerificationGas: 0,
    gasFees: ZERO_BYTES32,
    paymasterAndData,
    signature: "0x",
  };
}

describe("StatementGasTank", function () {
  let deployer, sponsor, otherSponsor, wallet, beliefs, stranger, entryPoint, gasTank;
  let accountInterface, kernelInterface, beliefsInterface;

  beforeEach(async function () {
    [deployer, sponsor, otherSponsor, wallet, beliefs, stranger] = await ethers.getSigners();

    const MockEntryPoint = await ethers.getContractFactory("MockEntryPoint");
    entryPoint = await MockEntryPoint.deploy();

    const StatementGasTank = await ethers.getContractFactory("StatementGasTank");
    gasTank = await StatementGasTank.deploy(
      await entryPoint.getAddress(),
      beliefs.address,
      ethers.parseEther("0.01"),
      3600,
    );

    accountInterface = new ethers.Interface([
      "function execute(address dest,uint256 value,bytes func)",
      "function executeBatch(address[] dest,uint256[] value,bytes[] func)",
    ]);
    kernelInterface = new ethers.Interface([
      "function execute(bytes32 mode, bytes executionCalldata)",
    ]);
    beliefsInterface = new ethers.Interface([
      "function setBelief(bytes32 statementId,uint8 beliefState)",
      "function setBeliefsInBatch(bytes32[] statementIds,uint8[] beliefStates)",
    ]);
  });

  async function fundAndEnroll(statementId = STATEMENT_A, amount = ethers.parseEther("0.02")) {
    await gasTank.connect(sponsor).enroll(statementId);
    await gasTank.connect(deployer).fundTank(sponsor.address, { value: amount });
  }

  function setBeliefCall(statementId, beliefState = BELIEVES) {
    return beliefsInterface.encodeFunctionData("setBelief", [statementId, beliefState]);
  }

  function kernelV3Single(target, value, callData) {
    const executionCalldata = ethers.concat([
      ethers.getAddress(target),
      ethers.zeroPadValue(ethers.toBeHex(value), 32),
      callData,
    ]);
    return kernelInterface.encodeFunctionData("execute", [ethers.ZeroHash, executionCalldata]);
  }

  function kernelV3Batch(executions) {
    const mode = "0x0100000000000000000000000000000000000000000000000000000000000000";
    const executionCalldata = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(address target,uint256 value,bytes callData)[]"],
      [executions.map((e) => [e.target, e.value, e.callData])],
    );
    return kernelInterface.encodeFunctionData("execute", [mode, executionCalldata]);
  }

  async function signedOp(accountCall, statementId = STATEMENT_A) {
    return userOp(
      wallet.address,
      accountCall,
      paymasterData(await gasTank.getAddress(), statementId),
    );
  }

  it("funds a sponsor tank and forwards ETH into the EntryPoint deposit", async function () {
    const amount = ethers.parseEther("0.005");
    await expect(gasTank.connect(stranger).fundTank(sponsor.address, { value: amount }))
      .to.emit(gasTank, "TankFunded")
      .withArgs(stranger.address, sponsor.address, amount);
    expect(await gasTank.tankBalance(sponsor.address)).to.equal(amount);
    expect(await entryPoint.balanceOf(await gasTank.getAddress())).to.equal(amount);
  });

  it("lets a sponsor enroll a statement once", async function () {
    await expect(gasTank.connect(sponsor).enroll(STATEMENT_A))
      .to.emit(gasTank, "StatementEnrolled")
      .withArgs(sponsor.address, STATEMENT_A);
    expect(await gasTank.sponsorOf(STATEMENT_A)).to.equal(sponsor.address);
    await expect(gasTank.connect(otherSponsor).enroll(STATEMENT_A))
      .to.be.revertedWithCustomError(gasTank, "StatementAlreadyEnrolled")
      .withArgs(sponsor.address);
  });

  it("sponsors a Kernel v3 setBelief of believes on an enrolled statement", async function () {
    await fundAndEnroll();
    const accountCall = kernelV3Single(beliefs.address, 0, setBeliefCall(STATEMENT_A));
    const result = await entryPoint.validatePaymasterUserOp.staticCall(
      gasTank,
      await signedOp(accountCall),
      ethers.parseEther("0.001"),
    );
    expect(result.validationData).to.equal(0);
  });

  it("sponsors a batch of believes calls that share one sponsor and include the anchor", async function () {
    await fundAndEnroll(STATEMENT_A);
    await gasTank.connect(sponsor).enroll(STATEMENT_B);
    const accountCall = kernelV3Batch([
      { target: beliefs.address, value: 0, callData: setBeliefCall(STATEMENT_A) },
      {
        target: beliefs.address,
        value: 0,
        callData: beliefsInterface.encodeFunctionData("setBeliefsInBatch", [
          [STATEMENT_B, STATEMENT_A],
          [BELIEVES, BELIEVES],
        ]),
      },
    ]);
    const result = await entryPoint.validatePaymasterUserOp.staticCall(
      gasTank,
      await signedOp(accountCall, STATEMENT_B),
      ethers.parseEther("0.001"),
    );
    expect(result.validationData).to.equal(0);
  });

  it("rejects disbelief, a missing anchor, a foreign statement, and the wrong contract", async function () {
    await fundAndEnroll();
    await gasTank.connect(otherSponsor).enroll(STATEMENT_C);

    await expect(entryPoint.validatePaymasterUserOp(
      gasTank,
      await signedOp(kernelV3Single(beliefs.address, 0, setBeliefCall(STATEMENT_A, DISBELIEVES))),
      ethers.parseEther("0.001"),
    )).to.be.revertedWithCustomError(gasTank, "SponsoredBeliefMustBeSupport").withArgs(DISBELIEVES);

    await expect(entryPoint.validatePaymasterUserOp(
      gasTank,
      await signedOp(kernelV3Single(beliefs.address, 0, setBeliefCall(STATEMENT_A)), STATEMENT_B),
      ethers.parseEther("0.001"),
    )).to.be.revertedWithCustomError(gasTank, "StatementNotEnrolled");

    await gasTank.connect(sponsor).enroll(STATEMENT_B);
    await expect(entryPoint.validatePaymasterUserOp(
      gasTank,
      await signedOp(kernelV3Single(beliefs.address, 0, setBeliefCall(STATEMENT_B)), STATEMENT_A),
      ethers.parseEther("0.001"),
    )).to.be.revertedWithCustomError(gasTank, "AnchorStatementMissing").withArgs(STATEMENT_A);

    await expect(entryPoint.validatePaymasterUserOp(
      gasTank,
      await signedOp(kernelV3Batch([
        { target: beliefs.address, value: 0, callData: setBeliefCall(STATEMENT_A) },
        { target: beliefs.address, value: 0, callData: setBeliefCall(STATEMENT_C) },
      ])),
      ethers.parseEther("0.001"),
    )).to.be.revertedWithCustomError(gasTank, "StatementSponsorMismatch");

    await expect(entryPoint.validatePaymasterUserOp(
      gasTank,
      await signedOp(accountInterface.encodeFunctionData("execute", [
        stranger.address,
        0,
        setBeliefCall(STATEMENT_A),
      ])),
      ethers.parseEther("0.001"),
    )).to.be.revertedWithCustomError(gasTank, "UnsupportedSponsoredCall");
  });

  it("charges the maximum cost during validation and applies the wallet cap before execution", async function () {
    await fundAndEnroll();
    await gasTank.connect(deployer).setSponsorshipConfig(ethers.parseEther("0.002"), 3600);
    const op = await signedOp(kernelV3Single(beliefs.address, 0, setBeliefCall(STATEMENT_A)));
    const { context } = await entryPoint.validatePaymasterUserOp.staticCall(gasTank, op, ethers.parseEther("0.0015"));
    expect(context).to.equal("0x");

    await expect(entryPoint.validatePaymasterUserOp(gasTank, op, ethers.parseEther("0.0015")))
      .to.emit(gasTank, "TankDebited")
      .withArgs(sponsor.address, wallet.address, ethers.parseEther("0.0015"));

    expect(await gasTank.tankBalance(sponsor.address)).to.equal(ethers.parseEther("0.0185"));
    await expect(entryPoint.validatePaymasterUserOp(gasTank, op, ethers.parseEther("0.001")))
      .to.be.revertedWithCustomError(gasTank, "WalletCapExceeded");
  });

  it("reserves sponsor funds before another operation can use the shared deposit", async function () {
    await fundAndEnroll(STATEMENT_A, ethers.parseEther("0.0015"));
    await gasTank.connect(otherSponsor).enroll(STATEMENT_B);
    await gasTank.fundTank(otherSponsor.address, { value: ethers.parseEther("0.02") });
    const op = await signedOp(kernelV3Single(beliefs.address, 0, setBeliefCall(STATEMENT_A)));
    await entryPoint.validatePaymasterUserOp(gasTank, op, ethers.parseEther("0.001"));
    await expect(entryPoint.validatePaymasterUserOp(gasTank, op, ethers.parseEther("0.001")))
      .to.be.revertedWithCustomError(gasTank, "InsufficientTankBalance");
    expect(await gasTank.tankBalance(otherSponsor.address)).to.equal(ethers.parseEther("0.02"));
  });

  it("rejects value transfers and malformed or empty batches", async function () {
    await fundAndEnroll();
    const cases = [
      [kernelV3Single(beliefs.address, 1, setBeliefCall(STATEMENT_A)), "SponsoredCallValueNotAllowed"],
      [kernelV3Batch([]), "EmptySponsoredBatch"],
      [accountInterface.encodeFunctionData("executeBatch", [[beliefs.address], [], []]), "InvalidBatchLengths"],
      [kernelV3Single(beliefs.address, 0, beliefsInterface.encodeFunctionData("setBeliefsInBatch", [[STATEMENT_A], []])), "InvalidBatchLengths"],
      [kernelV3Single(beliefs.address, 0, beliefsInterface.encodeFunctionData("setBeliefsInBatch", [[], []])), "EmptySponsoredBatch"],
    ];
    for (const [call, error] of cases) {
      await expect(entryPoint.validatePaymasterUserOp(gasTank, await signedOp(call), 1000))
        .to.be.revertedWithCustomError(gasTank, error);
    }
    expect(await gasTank.tankBalance(sponsor.address)).to.equal(ethers.parseEther("0.02"));
  });

  it("starts a new wallet budget after the window expires", async function () {
    await fundAndEnroll();
    await gasTank.setSponsorshipConfig(1000, 3600);
    const op = await signedOp(kernelV3Single(beliefs.address, 0, setBeliefCall(STATEMENT_A)));
    await entryPoint.validatePaymasterUserOp(gasTank, op, 1000);
    await expect(entryPoint.validatePaymasterUserOp(gasTank, op, 1))
      .to.be.revertedWithCustomError(gasTank, "WalletCapExceeded");
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);
    await entryPoint.validatePaymasterUserOp(gasTank, op, 600);
    expect((await gasTank.walletUsage(sponsor.address, wallet.address)).sponsoredWei).to.equal(600);
    expect(await gasTank.tankBalance(sponsor.address)).to.equal(ethers.parseEther("0.02") - 1600n);
  });
});
