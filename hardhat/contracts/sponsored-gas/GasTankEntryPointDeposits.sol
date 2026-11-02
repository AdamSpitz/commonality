// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

/// @dev Move ETH between EntryPoint deposits so one tank balance can sponsor v0.6 and v0.7.
library GasTankEntryPointDeposits {
  function ensureDeposit(IEntryPoint target, IEntryPoint other, uint256 amount) internal {
    if (amount == 0 || address(target) == address(0)) return;
    uint256 have = target.balanceOf(address(this));
    if (have >= amount) return;
    uint256 shortfall = amount - have;
    uint256 liquid = address(this).balance;
    if (liquid < shortfall && address(other) != address(0) && address(other) != address(target)) {
      uint256 otherBal = other.balanceOf(address(this));
      uint256 pull = shortfall - liquid;
      if (pull > otherBal) pull = otherBal;
      if (pull > 0) other.withdrawTo(payable(address(this)), pull);
    }
    uint256 toDeposit = address(this).balance;
    if (toDeposit > shortfall) toDeposit = shortfall;
    if (toDeposit == 0) return;
    target.depositTo{value: toDeposit}(address(this));
  }
}
