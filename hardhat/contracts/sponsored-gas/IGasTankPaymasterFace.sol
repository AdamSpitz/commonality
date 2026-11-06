// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

interface IGasTankPaymasterFace {
  function entryPoint() external view returns (IEntryPoint);
  function releaseDeposit(uint256 amount) external;
}
