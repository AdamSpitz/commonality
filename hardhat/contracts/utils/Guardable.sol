//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

error OnlyOwnerOrGuardian();

/**
 * @title Guardable
 * @notice Adds a guardian role alongside the owner, for levers that must have a
 *         fast "off" switch even when the owner is deliberately slow.
 * @dev The governance model for this project's admin levers is a timelock behind
 *      a multisig (see `workflow/security-recoverability.md`). A delay is the
 *      right default for *installing* trust — it gives the world a warning
 *      window — but it is exactly wrong for *withdrawing* it: if a hot signing
 *      key leaks, a 48-hour delay means 48 hours of exposure.
 *
 *      So powers split by direction. Anything that grants or replaces trust
 *      stays `onlyOwner` and therefore timelocked. Anything that can only
 *      *reduce* power is `onlyOwnerOrGuardian`, and the guardian is a plain key
 *      that can act immediately.
 *
 *      This is safe precisely because the guardian's power is one-directional:
 *      a compromised guardian can halt new trust-dependent operations (a
 *      denial of service until the owner installs a replacement through the
 *      timelock) but can never redirect them. Losing availability for one
 *      timelock delay is a far better failure than losing funds.
 *
 *      The guardian is optional; while unset (the zero address) only the owner
 *      can revoke.
 */
abstract contract Guardable is Ownable2Step {
    /// @notice Address allowed to exercise revoke-only powers without waiting on the owner
    address public guardian;

    /**
     * @notice Emitted when the guardian address is updated
     * @param oldGuardian The previous guardian (zero if none)
     * @param newGuardian The new guardian (zero to disable the role)
     */
    event GuardianUpdated(address indexed oldGuardian, address indexed newGuardian);

    /// @dev Restricts to the owner or the guardian. Use only for powers that reduce trust.
    modifier onlyOwnerOrGuardian() {
        if (_msgSender() != owner() && _msgSender() != guardian) revert OnlyOwnerOrGuardian();
        _;
    }

    /**
     * @notice Set (or clear) the guardian address
     * @dev Only callable by the owner, so appointing a guardian is itself timelocked.
     *      Pass the zero address to disable the role.
     * @param _guardian The new guardian address
     */
    function setGuardian(address _guardian) external onlyOwner {
        address oldGuardian = guardian;
        guardian = _guardian;
        emit GuardianUpdated(oldGuardian, _guardian);
    }
}
