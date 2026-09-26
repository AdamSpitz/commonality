//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {MultiERC1155AssuranceContract} from "./AssuranceContracts.sol";

/**
 * @notice Pays a recipient fixed at creation, and records which beneficiary
 *         that recipient controlled at the time. A later registry rotation does
 *         not retarget these proceeds.
 */
contract FixedControllerAssuranceContract is MultiERC1155AssuranceContract {
    bytes32 public immutable beneficiaryId;
    address public immutable proceedsRegistry;

    constructor(
        address owner,
        address controller,
        address paymentToken,
        address erc1155Addr,
        string memory projectMetadataCid,
        bytes32 _beneficiaryId,
        address registry
    ) MultiERC1155AssuranceContract(owner, controller, paymentToken, erc1155Addr, projectMetadataCid) {
        beneficiaryId = _beneficiaryId;
        proceedsRegistry = registry;
    }

    function recipient() external view returns (address) {
        return _recipient;
    }
}
