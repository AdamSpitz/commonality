//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {ClaimTicketAssuranceContract} from "./ClaimTicketAssuranceContract.sol";

/// @notice Deploys ticket assurance contracts. Kept separate so neither
///         ProjectFactory nor FixedControllerFactory has to carry the bytecode.
contract ClaimTicketFactory {
    uint256 public constant UNCLAIMED_PROCEEDS_WINDOW = 90 days;
    mapping(address => bool) public isDeployedPrimaryMarket;

    error InvalidTransitAddress();

    event ClaimTicketAssuranceCreated(address indexed assuranceContract, address indexed transitAddress);

    function create(
        address owner,
        address transitAddress,
        address paymentToken,
        address erc1155Addr,
        string memory projectMetadataCid
    ) external returns (ClaimTicketAssuranceContract ac) {
        if (transitAddress == address(0)) revert InvalidTransitAddress();
        ac = new ClaimTicketAssuranceContract(
            owner, transitAddress, paymentToken, erc1155Addr, projectMetadataCid, UNCLAIMED_PROCEEDS_WINDOW
        );
        isDeployedPrimaryMarket[address(ac)] = true;
        emit ClaimTicketAssuranceCreated(address(ac), transitAddress);
    }
}
