//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {MultiERC1155AssuranceContract} from "../individual-projects/AssuranceContracts.sol";

error OnlyProspectiveRoundFactory();
error InvalidMaterializedContentTokens();
error MaterializedContentTokensAlreadySet();

/** Assurance market carrying the channel and one-time materialization link for a prospective round. */
contract ProspectiveContentAssuranceContract is MultiERC1155AssuranceContract {
    address public immutable prospectiveRoundFactory;
    bytes32 public immutable channelId;
    address public materializedContentTokens;

    event MaterializedContentTokensSet(address indexed tokenContract);

    constructor(
        address owner,
        address recipient,
        address paymentToken,
        address erc1155Address,
        string memory metadataCid,
        bytes32 _channelId
    ) MultiERC1155AssuranceContract(owner, recipient, paymentToken, erc1155Address, metadataCid) {
        prospectiveRoundFactory = owner;
        channelId = _channelId;
    }

    function hasSucceeded() external view returns (bool) {
        return address(_condition) != address(0) && _condition.hasSucceeded();
    }

    function setMaterializedContentTokens(address tokenContract) external {
        if (msg.sender != prospectiveRoundFactory) revert OnlyProspectiveRoundFactory();
        if (tokenContract == address(0)) revert InvalidMaterializedContentTokens();
        if (materializedContentTokens != address(0)) revert MaterializedContentTokensAlreadySet();
        materializedContentTokens = tokenContract;
        emit MaterializedContentTokensSet(tokenContract);
    }
}
