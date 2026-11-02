// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {IGasTankPaymasterFace} from "./IGasTankPaymasterFace.sol";

/// @dev Keep ETH on the vault. Each paymaster face has its own EntryPoint deposit.
library GasTankEntryPointDeposits {
  function ensureDeposit(
    IEntryPoint targetEp,
    address paymaster,
    address[] storage faces,
    uint256 amount
  ) internal {
    if (amount == 0 || paymaster == address(0) || address(targetEp) == address(0)) return;
    uint256 have = targetEp.balanceOf(paymaster);
    if (have >= amount) return;
    uint256 need = amount - have;
    if (address(this).balance < need) {
      _pullFromPeers(faces, paymaster, need - address(this).balance);
    }
    uint256 toDeposit = address(this).balance;
    if (toDeposit > need) toDeposit = need;
    if (toDeposit == 0) return;
    targetEp.depositTo{value: toDeposit}(paymaster);
  }

  function _pullFromPeers(address[] storage faces, address recipient, uint256 amount) private {
    uint256 remaining = amount;
    for (uint256 i = 0; i < faces.length && remaining > 0; i++) {
      address face = faces[i];
      if (face == recipient) continue;
      IEntryPoint ep = IGasTankPaymasterFace(face).entryPoint();
      uint256 peerBal = ep.balanceOf(face);
      if (peerBal == 0) continue;
      uint256 pull = peerBal < remaining ? peerBal : remaining;
      IGasTankPaymasterFace(face).releaseDeposit(pull);
      remaining -= pull;
    }
  }
}
