//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IdentityHeldProceeds} from "./IdentityHeldProceeds.sol";

/**
 * @notice Pays a recipient fixed at creation, and records which beneficiary
 *         that recipient controlled at the time. A later registry rotation does
 *         not retarget these proceeds.
 */
contract FixedControllerAssuranceContract is IdentityHeldProceeds {

    constructor(
        address owner,
        address controller,
        address paymentToken,
        address erc1155Addr,
        string memory projectMetadataCid,
        bytes32 _beneficiaryId,
        address registry,
        uint256 unclaimedWindow
    ) IdentityHeldProceeds(owner, paymentToken, erc1155Addr, projectMetadataCid, registry, _beneficiaryId, controller, unclaimedWindow) {}

    function recipient() external view returns (address) {
        return fixedPayout;
    }
}
