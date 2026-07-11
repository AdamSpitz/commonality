import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

async function latestDeadline() {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp + 3600;
}

describe("GasTankFunder", function () {
  let creator;
  let funder;
  let usdc;
  let weth;
  let router;
  let entryPoint;
  let gasTank;
  let gasTankFunder;

  beforeEach(async function () {
    [, creator, funder] = await ethers.getSigners();

    const FreeERC20 = await ethers.getContractFactory("FreeERC20");
    usdc = await FreeERC20.deploy("Test USDC", "USDC", 6);

    const MockWETH = await ethers.getContractFactory("MockWETH");
    weth = await MockWETH.deploy();

    const MockUniswapV3SwapRouter = await ethers.getContractFactory("MockUniswapV3SwapRouter");
    router = await MockUniswapV3SwapRouter.deploy();

    const MockEntryPoint = await ethers.getContractFactory("MockEntryPoint");
    entryPoint = await MockEntryPoint.deploy();

    const CreatorGasTank = await ethers.getContractFactory("CreatorGasTank");
    gasTank = await CreatorGasTank.deploy(
      await entryPoint.getAddress(),
      await usdc.getAddress(),
      ethers.parseEther("0.01"),
      3600,
      ethers.parseUnits("1", 6),
    );

    const GasTankFunder = await ethers.getContractFactory("GasTankFunder");
    gasTankFunder = await GasTankFunder.deploy(
      await usdc.getAddress(),
      await weth.getAddress(),
      await router.getAddress(),
      await gasTank.getAddress(),
      500,
    );

    await funder.sendTransaction({ to: await router.getAddress(), value: ethers.parseEther("1") });
  });

  it("swaps caller USDC to ETH and credits the creator gas tank", async function () {
    const usdcAmount = ethers.parseUnits("10", 6);
    const ethOut = ethers.parseEther("0.003");
    await usdc.mintTo(funder.address, usdcAmount);
    await usdc.connect(funder).approve(await gasTankFunder.getAddress(), usdcAmount);
    await router.setEthOut(ethOut);

    await expect(
      gasTankFunder.connect(funder).fundTankWithUSDC(creator.address, usdcAmount, ethOut, await latestDeadline()),
    )
      .to.emit(gasTankFunder, "GasTankFundedWithUSDC")
      .withArgs(funder.address, creator.address, usdcAmount, ethOut)
      .and.to.emit(gasTank, "TankFunded")
      .withArgs(await gasTankFunder.getAddress(), creator.address, ethOut);

    expect(await usdc.balanceOf(funder.address)).to.equal(0n);
    expect(await gasTank.tankBalance(creator.address)).to.equal(ethOut);
    expect(await entryPoint.balanceOf(await gasTank.getAddress())).to.equal(ethOut);

    const lastParams = await router.lastParams();
    expect(lastParams.tokenIn).to.equal(await usdc.getAddress());
    expect(lastParams.tokenOut).to.equal(await weth.getAddress());
    expect(lastParams.fee).to.equal(500);
    expect(lastParams.recipient).to.equal(await gasTankFunder.getAddress());
    expect(lastParams.amountIn).to.equal(usdcAmount);
    expect(await usdc.allowance(await gasTankFunder.getAddress(), await router.getAddress())).to.equal(0n);
  });

  it("passes slippage protection through to the router", async function () {
    const usdcAmount = ethers.parseUnits("10", 6);
    await usdc.mintTo(funder.address, usdcAmount);
    await usdc.connect(funder).approve(await gasTankFunder.getAddress(), usdcAmount);
    await router.setEthOut(ethers.parseEther("0.002"));

    await expect(
      gasTankFunder.connect(funder).fundTankWithUSDC(
        creator.address,
        usdcAmount,
        ethers.parseEther("0.003"),
        await latestDeadline(),
      ),
    ).to.be.revertedWithCustomError(router, "InsufficientOutput");
  });

  it("rejects zero creator and zero input amount", async function () {
    await expect(
      gasTankFunder.fundTankWithUSDC(ethers.ZeroAddress, 1n, 1n, await latestDeadline()),
    ).to.be.revertedWithCustomError(gasTankFunder, "InvalidAddress");

    await expect(
      gasTankFunder.fundTankWithUSDC(creator.address, 0n, 1n, await latestDeadline()),
    ).to.be.revertedWithCustomError(gasTankFunder, "InvalidAmount");
  });
});
