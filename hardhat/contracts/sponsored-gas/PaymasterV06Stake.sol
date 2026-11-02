// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

/// @dev v0.6 uses the same stake-manager ABI as v0.7. Stake is separate from tank funds.
abstract contract PaymasterV06Stake is Ownable {
  IEntryPoint public immutable entryPoint;

  constructor(IEntryPoint entryPoint_) Ownable(msg.sender) {
    entryPoint = entryPoint_;
  }

  function addStake(uint32 unstakeDelaySec) external payable onlyOwner {
    entryPoint.addStake{value: msg.value}(unstakeDelaySec);
  }

  function unlockStake() external onlyOwner {
    entryPoint.unlockStake();
  }

  function withdrawStake(address payable recipient) external onlyOwner {
    entryPoint.withdrawStake(recipient);
  }
}
