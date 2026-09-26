//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {FixedControllerAssuranceContract} from "./FixedControllerAssuranceContract.sol";

/// @notice Deploys fixed-controller assurance contracts. DelegatableNotes authorizes
///         this factory on its own so AssuranceContractFactory stays under the size limit.
contract FixedControllerFactory {
    mapping(address => bool) public isDeployedPrimaryMarket;

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
        ac = new FixedControllerAssuranceContract(
            owner, recipient, paymentToken, erc1155Addr, projectMetadataCid, beneficiaryId, registry
        );
        isDeployedPrimaryMarket[address(ac)] = true;
        emit FixedControllerAssuranceCreated(address(ac));
    }
}
