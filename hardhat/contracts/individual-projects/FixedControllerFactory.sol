//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {FixedControllerAssuranceContract} from "./FixedControllerAssuranceContract.sol";

/// @notice Deploys fixed-controller assurance contracts. DelegatableNotes authorizes
///         this factory on its own so AssuranceContractFactory stays under the size limit.
contract FixedControllerFactory {
    error InvalidRegistry();
    address public immutable beneficiaryRegistry;
    mapping(address => bool) public isDeployedPrimaryMarket;

    constructor(address registry) {
        if (registry == address(0)) revert InvalidRegistry();
        beneficiaryRegistry = registry;
    }

    event FixedControllerAssuranceCreated(address indexed assuranceContract);

    function create(
        address owner,
        address recipient,
        address paymentToken,
        address erc1155Addr,
        string memory projectMetadataCid,
        bytes32 beneficiaryId,
        address registry
    ) external returns (FixedControllerAssuranceContract ac) {
        if (registry != beneficiaryRegistry) revert InvalidRegistry();
        ac = new FixedControllerAssuranceContract(
            owner, recipient, paymentToken, erc1155Addr, projectMetadataCid, beneficiaryId, registry
        );
        isDeployedPrimaryMarket[address(ac)] = true;
        emit FixedControllerAssuranceCreated(address(ac));
    }
}
