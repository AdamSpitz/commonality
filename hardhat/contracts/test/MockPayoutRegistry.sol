// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

contract MockPayoutRegistry {
  address public payout;

  function setPayout(address payout_) external {
    payout = payout_;
  }

  function payoutAddress(bytes32) external view returns (address) {
    return payout;
  }
}
