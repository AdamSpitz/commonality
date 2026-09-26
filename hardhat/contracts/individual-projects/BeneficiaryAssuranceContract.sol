//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IdentityHeldProceeds} from "./IdentityHeldProceeds.sol";

/**
 * @notice A LazyGiving assurance contract whose successful proceeds stay here
 *         until the named beneficiary claims or refuses them.
 */
contract BeneficiaryAssuranceContract is IdentityHeldProceeds {
    constructor(
        address owner,
        address paymentToken,
        address erc1155Addr,
        string memory projectMetadataCid,
        bytes32 _beneficiaryId,
        address registry,
        uint256 unclaimedWindow
    ) IdentityHeldProceeds(owner, paymentToken, erc1155Addr, projectMetadataCid, registry, _beneficiaryId, unclaimedWindow) {}

    function recipient() external view returns (address) {
        return _recipient;
    }
}
