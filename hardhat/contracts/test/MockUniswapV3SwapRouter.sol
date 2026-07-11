// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IUniswapV3SwapRouter} from "../sponsored-gas/GasTankFunder.sol";

interface IMockWETH {
  function deposit() external payable;
}

contract MockUniswapV3SwapRouter is IUniswapV3SwapRouter {
  using SafeERC20 for IERC20;

  uint256 public ethOut;
  ExactInputSingleParams public lastParams;

  error InsufficientOutput();
  error Expired();

  receive() external payable {}

  function setEthOut(uint256 ethOut_) external {
    ethOut = ethOut_;
  }

  function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut) {
    if (params.deadline < block.timestamp) revert Expired();
    amountOut = ethOut;
    if (amountOut < params.amountOutMinimum) revert InsufficientOutput();
    lastParams = params;

    IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
    IMockWETH(params.tokenOut).deposit{value: amountOut}();
    IERC20(params.tokenOut).safeTransfer(params.recipient, amountOut);
  }
}
