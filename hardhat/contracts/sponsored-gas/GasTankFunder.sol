// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICreatorGasTankFunding {
  function fundTank(address creator) external payable;
}

interface IWETH9 {
  function withdraw(uint256 amount) external;
}

interface IUniswapV3SwapRouter {
  struct ExactInputSingleParams {
    address tokenIn;
    address tokenOut;
    uint24 fee;
    address recipient;
    uint256 deadline;
    uint256 amountIn;
    uint256 amountOutMinimum;
    uint160 sqrtPriceLimitX96;
  }

  function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

/**
 * @title GasTankFunder
 * @notice Pulls USDC from a caller, swaps it to WETH through a Uniswap-v3-compatible router,
 *         unwraps to ETH, and credits a creator's CreatorGasTank balance.
 * @dev This deliberately knows nothing about assurance-contract proceeds. Callers must only fund
 *      with USDC they are allowed to spend: withdrawn proceeds, earmarked donations, or a dedicated
 *      gas-funding cause — never in-flight refundable backer funds.
 */
contract GasTankFunder is ReentrancyGuard {
  using SafeERC20 for IERC20;

  IERC20 public immutable usdc;
  IWETH9 public immutable weth;
  IUniswapV3SwapRouter public immutable swapRouter;
  ICreatorGasTankFunding public immutable gasTank;
  uint24 public immutable poolFee;

  event GasTankFundedWithUSDC(
    address indexed funder,
    address indexed creator,
    uint256 usdcAmount,
    uint256 ethAmount
  );

  error InvalidAddress();
  error InvalidAmount();
  error EthTransferFailed();

  constructor(
    IERC20 usdc_,
    IWETH9 weth_,
    IUniswapV3SwapRouter swapRouter_,
    ICreatorGasTankFunding gasTank_,
    uint24 poolFee_
  ) {
    if (
      address(usdc_) == address(0) ||
      address(weth_) == address(0) ||
      address(swapRouter_) == address(0) ||
      address(gasTank_) == address(0)
    ) revert InvalidAddress();
    usdc = usdc_;
    weth = weth_;
    swapRouter = swapRouter_;
    gasTank = gasTank_;
    poolFee = poolFee_;
  }

  receive() external payable {}

  function fundTankWithUSDC(
    address creator,
    uint256 usdcAmount,
    uint256 minEthOut,
    uint256 deadline
  ) external nonReentrant returns (uint256 ethAmount) {
    if (creator == address(0)) revert InvalidAddress();
    if (usdcAmount == 0) revert InvalidAmount();

    usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
    usdc.forceApprove(address(swapRouter), usdcAmount);
    ethAmount = swapRouter.exactInputSingle(IUniswapV3SwapRouter.ExactInputSingleParams({
      tokenIn: address(usdc),
      tokenOut: address(weth),
      fee: poolFee,
      recipient: address(this),
      deadline: deadline,
      amountIn: usdcAmount,
      amountOutMinimum: minEthOut,
      sqrtPriceLimitX96: 0
    }));
    usdc.forceApprove(address(swapRouter), 0);

    if (ethAmount == 0) revert InvalidAmount();
    weth.withdraw(ethAmount);
    gasTank.fundTank{value: ethAmount}(creator);

    emit GasTankFundedWithUSDC(msg.sender, creator, usdcAmount, ethAmount);
  }
}
