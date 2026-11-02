import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

const ZERO_BYTES32 = "0x" + "00".repeat(32);

function paymasterData(paymaster, project) {
  return ethers.solidityPacked(
    ["address", "uint128", "uint128", "address"],
    [paymaster, 0, 0, project],
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

describe("CreatorGasTank", function () {
  let deployer, creator, wallet, attacker, project, settlementToken, entryPoint, gasTank, paymaster, mockMarket;
  let accountInterface, coinbaseInterface, kernelInterface, marketInterface, erc20Interface, erc1155Interface;

  beforeEach(async function () {
    [deployer, creator, wallet, attacker, project, settlementToken] = await ethers.getSigners();

    const MockEntryPoint = await ethers.getContractFactory("MockEntryPoint");
    entryPoint = await MockEntryPoint.deploy();

    const MockPrimaryMarket = await ethers.getContractFactory("MockPrimaryMarket");
    mockMarket = await MockPrimaryMarket.deploy();

    const CreatorGasTank = await ethers.getContractFactory("CreatorGasTank");
    gasTank = await CreatorGasTank.deploy(
      settlementToken.address,
      ethers.parseEther("0.01"),
      3600,
      0,
    );
    const CreatorGasTankPaymaster = await ethers.getContractFactory("CreatorGasTankPaymaster");
    paymaster = await CreatorGasTankPaymaster.deploy(await entryPoint.getAddress(), await gasTank.getAddress());
    await gasTank.addPaymasterFace(await paymaster.getAddress());

    accountInterface = new ethers.Interface([
      "function execute(address dest,uint256 value,bytes func)",
      "function executeBatch(address[] dest,uint256[] value,bytes[] func)",
    ]);
    // Kernel v3 (ERC-7579) routes every execution through execute(bytes32 mode, bytes executionCalldata).
    coinbaseInterface = new ethers.Interface([
      "function executeBatch((address dest,uint256 value,bytes data)[] calls)",
    ]);
    kernelInterface = new ethers.Interface([
      "function execute(bytes32 mode, bytes executionCalldata)",
    ]);
    marketInterface = new ethers.Interface([
      "function buyERC1155(address buyer,address erc1155Addr,uint256[] ids,uint256[] counts,bytes data)",
      "function refundERC1155(address holder,address erc1155Addr,uint256[] ids,uint256[] counts,bytes data)",
    ]);
    erc20Interface = new ethers.Interface(["function approve(address spender,uint256 amount)"]);
    erc1155Interface = new ethers.Interface(["function setApprovalForAll(address operator,bool approved)"]);
  });

  async function fundAndEnroll(amount = ethers.parseEther("0.02")) {
    await gasTank.connect(creator).enroll(project.address);
    await gasTank.connect(deployer).fundTank(creator.address, { value: amount });
  }

  // ERC-7579 single execution: mode 0x00 (single call type) + packed target(20)||value(32)||callData.
  function kernelV3Single(target, value, callData) {
    const executionCalldata = ethers.concat([
      ethers.getAddress(target),
      ethers.zeroPadValue(ethers.toBeHex(value), 32),
      callData,
    ]);
    return kernelInterface.encodeFunctionData("execute", [ethers.ZeroHash, executionCalldata]);
  }

  // ERC-7579 batch execution: mode with CallType byte 0x01 + abi.encode(Execution[]).
  function kernelV3Batch(executions) {
    const mode = "0x0100000000000000000000000000000000000000000000000000000000000000";
    const executionCalldata = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(address target,uint256 value,bytes callData)[]"],
      [executions.map((e) => [e.target, e.value, e.callData])],
    );
    return kernelInterface.encodeFunctionData("execute", [mode, executionCalldata]);
  }

  function buyExecuteCall() {
    const buyCall = marketInterface.encodeFunctionData("buyERC1155", [
      wallet.address,
      attacker.address,
      [1],
      [2],
      "0x",
    ]);
    return accountInterface.encodeFunctionData("execute", [project.address, 0, buyCall]);
  }

  it("funds a creator tank on the vault without parking ETH on an EntryPoint", async function () {
    const amount = ethers.parseEther("0.005");

    await expect(gasTank.connect(attacker).fundTank(creator.address, { value: amount }))
      .to.emit(gasTank, "TankFunded")
      .withArgs(attacker.address, creator.address, amount);

    expect(await gasTank.tankBalance(creator.address)).to.equal(amount);
    expect(await ethers.provider.getBalance(await gasTank.getAddress())).to.equal(amount);
    expect(await entryPoint.balanceOf(await paymaster.getAddress())).to.equal(0n);
  });

  it("lets a creator self-enroll a project once", async function () {
    await expect(gasTank.connect(creator).enroll(project.address))
      .to.emit(gasTank, "ProjectEnrolled")
      .withArgs(creator.address, project.address);

    expect(await gasTank.creatorOf(project.address)).to.equal(creator.address);
    await expect(gasTank.connect(attacker).enroll(project.address))
      .to.be.revertedWithCustomError(gasTank, "ProjectAlreadyEnrolled")
      .withArgs(creator.address);
  });

  it("validates a sponsored SimpleAccount buy call for an enrolled project", async function () {
    await fundAndEnroll();
    const op = userOp(wallet.address, buyExecuteCall(), paymasterData(await paymaster.getAddress(), project.address));

    const result = await entryPoint.validatePaymasterUserOp.staticCall(paymaster, op, ethers.parseEther("0.001"));
    expect(result.validationData).to.equal(0);
    expect(ethers.AbiCoder.defaultAbiCoder().decode(["address", "address"], result.context)).to.deep.equal([
      creator.address,
      wallet.address,
    ]);
  });

  it("rejects sponsored calls that target an unenrolled project", async function () {
    const op = userOp(wallet.address, buyExecuteCall(), paymasterData(await paymaster.getAddress(), project.address));

    await expect(entryPoint.validatePaymasterUserOp(paymaster, op, ethers.parseEther("0.001")))
      .to.be.revertedWithCustomError(gasTank, "ProjectNotEnrolled")
      .withArgs(project.address);
  });

  it("rejects malformed account or inner sponsored call calldata explicitly", async function () {
    await fundAndEnroll();

    const malformedAccountOp = userOp(wallet.address, "0x123456", paymasterData(await paymaster.getAddress(), project.address));
    await expect(entryPoint.validatePaymasterUserOp(paymaster, malformedAccountOp, ethers.parseEther("0.001")))
      .to.be.revertedWithCustomError(gasTank, "InvalidAccountCallDataLength")
      .withArgs(3);

    const malformedInnerCall = "0x123456";
    const accountCall = accountInterface.encodeFunctionData("execute", [project.address, 0, malformedInnerCall]);
    const malformedInnerOp = userOp(wallet.address, accountCall, paymasterData(await paymaster.getAddress(), project.address));
    await expect(entryPoint.validatePaymasterUserOp(paymaster, malformedInnerOp, ethers.parseEther("0.001")))
      .to.be.revertedWithCustomError(gasTank, "InvalidSponsoredCallDataLength")
      .withArgs(3);
  });

  it("rejects calls outside the contribution/refund approval surface", async function () {
    await fundAndEnroll();
    const badInnerCall = erc20Interface.encodeFunctionData("approve", [attacker.address, 1]);
    const badAccountCall = accountInterface.encodeFunctionData("execute", [settlementToken.address, 0, badInnerCall]);
    const op = userOp(wallet.address, badAccountCall, paymasterData(await paymaster.getAddress(), project.address));

    await expect(entryPoint.validatePaymasterUserOp(paymaster, op, ethers.parseEther("0.001")))
      .to.be.revertedWithCustomError(gasTank, "UnsupportedSponsoredCall");
  });

  it("allows approval calls only when batched with a buy/refund primary action", async function () {
    await fundAndEnroll();
    const approveCall = erc20Interface.encodeFunctionData("approve", [project.address, 123]);
    const setApprovalCall = erc1155Interface.encodeFunctionData("setApprovalForAll", [project.address, true]);
    const buyCall = marketInterface.encodeFunctionData("buyERC1155", [
      wallet.address,
      attacker.address,
      [1],
      [2],
      "0x",
    ]);
    const approvalOnlyAccountCall = accountInterface.encodeFunctionData("executeBatch", [
      [settlementToken.address, attacker.address],
      [],
      [approveCall, setApprovalCall],
    ]);
    const approvalOnlyOp = userOp(wallet.address, approvalOnlyAccountCall, paymasterData(await paymaster.getAddress(), project.address));
    await expect(entryPoint.validatePaymasterUserOp(paymaster, approvalOnlyOp, ethers.parseEther("0.001")))
      .to.be.revertedWithCustomError(gasTank, "MissingSponsoredPrimaryAction");

    const accountCall = accountInterface.encodeFunctionData("executeBatch", [
      [settlementToken.address, attacker.address, project.address],
      [],
      [approveCall, setApprovalCall, buyCall],
    ]);
    const op = userOp(wallet.address, accountCall, paymasterData(await paymaster.getAddress(), project.address));

    const result = await entryPoint.validatePaymasterUserOp.staticCall(paymaster, op, ethers.parseEther("0.001"));
    expect(result.validationData).to.equal(0);
  });

  it("validates Kernel v3 (ERC-7579) single and batch execute account calls", async function () {
    await fundAndEnroll();
    const buyCall = marketInterface.encodeFunctionData("buyERC1155", [
      wallet.address,
      attacker.address,
      [1],
      [2],
      "0x",
    ]);
    const approveCall = erc20Interface.encodeFunctionData("approve", [project.address, 123]);

    const executeCall = kernelV3Single(project.address, 0, buyCall);
    const executeOp = userOp(wallet.address, executeCall, paymasterData(await paymaster.getAddress(), project.address));
    expect((await entryPoint.validatePaymasterUserOp.staticCall(paymaster, executeOp, ethers.parseEther("0.001"))).validationData)
      .to.equal(0);

    const batchCall = kernelV3Batch([
      { target: settlementToken.address, value: 0, callData: approveCall },
      { target: project.address, value: 0, callData: buyCall },
    ]);
    const batchOp = userOp(wallet.address, batchCall, paymasterData(await paymaster.getAddress(), project.address));
    expect((await entryPoint.validatePaymasterUserOp.staticCall(paymaster, batchOp, ethers.parseEther("0.001"))).validationData)
      .to.equal(0);
  });

  it("validates Coinbase Smart Wallet executeBatch((address,uint256,bytes)[])", async function () {
    await fundAndEnroll();
    const approveCall = erc20Interface.encodeFunctionData("approve", [project.address, 123]);
    const buyCall = marketInterface.encodeFunctionData("buyERC1155", [
      wallet.address,
      attacker.address,
      [1],
      [2],
      "0x",
    ]);
    const accountCall = coinbaseInterface.encodeFunctionData("executeBatch", [[
      [settlementToken.address, 0, approveCall],
      [project.address, 0, buyCall],
    ]]);
    const op = userOp(wallet.address, accountCall, paymasterData(await paymaster.getAddress(), project.address));
    expect((await entryPoint.validatePaymasterUserOp.staticCall(paymaster, op, ethers.parseEther("0.001"))).validationData)
      .to.equal(0);
  });

  it("rejects a Kernel v3 execute whose inner call is not a sponsored action", async function () {
    await fundAndEnroll();
    const badInnerCall = erc20Interface.encodeFunctionData("approve", [attacker.address, 1]);
    const executeCall = kernelV3Single(settlementToken.address, 0, badInnerCall);
    const op = userOp(wallet.address, executeCall, paymasterData(await paymaster.getAddress(), project.address));
    await expect(entryPoint.validatePaymasterUserOp.staticCall(paymaster, op, ethers.parseEther("0.001")))
      .to.be.reverted;
  });

  it("enforces the minimum contribution amount for sponsored buys", async function () {
    await gasTank.connect(creator).enroll(await mockMarket.getAddress());
    await gasTank.connect(deployer).fundTank(creator.address, { value: ethers.parseEther("0.02") });
    await gasTank.connect(deployer).setMinSponsoredContributionAmount(3);

    const buyCall = marketInterface.encodeFunctionData("buyERC1155", [
      wallet.address,
      attacker.address,
      [1],
      [2],
      "0x",
    ]);
    const accountCall = accountInterface.encodeFunctionData("execute", [await mockMarket.getAddress(), 0, buyCall]);
    const op = userOp(wallet.address, accountCall, paymasterData(await paymaster.getAddress(), await mockMarket.getAddress()));

    await expect(entryPoint.validatePaymasterUserOp(paymaster, op, ethers.parseEther("0.001")))
      .to.be.revertedWithCustomError(gasTank, "SponsoredContributionBelowMinimum")
      .withArgs(2, 3);

    await mockMarket.setPrice(2);
    const result = await entryPoint.validatePaymasterUserOp.staticCall(paymaster, op, ethers.parseEther("0.001"));
    expect(result.validationData).to.equal(0);
  });

  it("debits actual gas cost in postOp and applies the wallet cap to future validations", async function () {
    await fundAndEnroll();
    await gasTank.connect(deployer).setSponsorshipConfig(ethers.parseEther("0.002"), 3600);
    const op = userOp(wallet.address, buyExecuteCall(), paymasterData(await paymaster.getAddress(), project.address));
    const { context } = await entryPoint.validatePaymasterUserOp.staticCall(paymaster, op, ethers.parseEther("0.001"));

    await expect(entryPoint.postOp(paymaster, 0, context, ethers.parseEther("0.0015")))
      .to.emit(gasTank, "TankDebited")
      .withArgs(creator.address, wallet.address, ethers.parseEther("0.0015"));

    expect(await gasTank.tankBalance(creator.address)).to.equal(ethers.parseEther("0.0185"));
    await expect(entryPoint.validatePaymasterUserOp(paymaster, op, ethers.parseEther("0.001")))
      .to.be.revertedWithCustomError(gasTank, "WalletCapExceeded");
  });

  it("deposits to the v0.6 face from the vault, then can pull peer-face deposits", async function () {
    const MockEntryPoint = await ethers.getContractFactory("MockEntryPoint");
    const entryPointV06 = await MockEntryPoint.deploy();
    const CreatorGasTankPaymasterV06 = await ethers.getContractFactory("CreatorGasTankPaymasterV06");
    const paymasterV06 = await CreatorGasTankPaymasterV06.deploy(
      await entryPointV06.getAddress(),
      await gasTank.getAddress(),
    );
    await gasTank.addPaymasterFace(await paymasterV06.getAddress());
    await fundAndEnroll();
    const amount = ethers.parseEther("0.02");
    expect(await ethers.provider.getBalance(await gasTank.getAddress())).to.equal(amount);

    const paymasterAndData = ethers.solidityPacked(
      ["address", "address"],
      [await paymasterV06.getAddress(), project.address],
    );
    const opV06 = {
      sender: wallet.address,
      nonce: 0,
      initCode: "0x",
      callData: buyExecuteCall(),
      callGasLimit: 0,
      verificationGasLimit: 0,
      preVerificationGas: 0,
      maxFeePerGas: 0,
      maxPriorityFeePerGas: 0,
      paymasterAndData,
      signature: "0x",
    };
    const maxCost = ethers.parseEther("0.001");
    const result = await entryPointV06.validatePaymasterUserOpV06.staticCall(paymasterV06, opV06, maxCost);
    expect(result.validationData).to.equal(0);
    await entryPointV06.validatePaymasterUserOpV06(paymasterV06, opV06, maxCost);
    expect(await entryPointV06.balanceOf(await paymasterV06.getAddress())).to.equal(maxCost);
    expect(await ethers.provider.getBalance(await gasTank.getAddress())).to.equal(amount - maxCost);
    expect(await entryPoint.balanceOf(await paymaster.getAddress())).to.equal(0n);
  });
});
