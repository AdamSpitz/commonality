// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {IGasTankPaymasterFace} from "./IGasTankPaymasterFace.sol";

/// @dev Keep the treasury on the vault. Each paymaster face holds a small EntryPoint float.
///      Top-ups must happen before handleOps; EntryPoint reserves deposit before validation.
library GasTankEntryPointDeposits {
  function topUpToFloor(address[] storage faces, uint256 floor) internal {
    if (floor == 0) return;
    uint256[] memory shortfalls = new uint256[](faces.length);
    uint256 remainingShortfall;
    for (uint256 i = 0; i < faces.length; i++) {
      uint256 have = IGasTankPaymasterFace(faces[i]).entryPoint().balanceOf(faces[i]);
      if (have < floor) {
        shortfalls[i] = floor - have;
        remainingShortfall += shortfalls[i];
      }
    }
    // Allocate scarce liquidity across every face instead of exhausting it on the first.
    for (uint256 i = 0; i < faces.length; i++) {
      uint256 need = shortfalls[i];
      if (need == 0) continue;
      uint256 available = address(this).balance;
      uint256 send = available >= remainingShortfall ? need : available * need / remainingShortfall;
      remainingShortfall -= need;
      if (send != 0) {
        IGasTankPaymasterFace(faces[i]).entryPoint().depositTo{value: send}(faces[i]);
      }
    }
  }

  function topUp(address face, uint256 target) internal {
    if (face == address(0) || target == 0) return;
    IEntryPoint ep = IGasTankPaymasterFace(face).entryPoint();
    if (address(ep) == address(0)) return;
    uint256 have = ep.balanceOf(face);
    if (have >= target) return;
    uint256 need = target - have;
    uint256 send = address(this).balance;
    if (send > need) send = need;
    if (send == 0) return;
    ep.depositTo{value: send}(face);
  }

  function pullDownToFloor(address[] storage faces, uint256 floor) internal {
    for (uint256 i = 0; i < faces.length; i++) {
      address face = faces[i];
      IEntryPoint ep = IGasTankPaymasterFace(face).entryPoint();
      uint256 have = ep.balanceOf(face);
      if (have <= floor) continue;
      IGasTankPaymasterFace(face).releaseDeposit(have - floor);
    }
  }
}
