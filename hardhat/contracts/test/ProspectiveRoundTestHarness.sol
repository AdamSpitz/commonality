//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {ContentRegistry} from "../content-funding/ContentRegistry.sol";

contract ProspectiveChannelRegistryHarness {
    mapping(bytes32 => address) public channelOwner;
    mapping(bytes32 => bool) public isVerified;
    function setChannel(bytes32 id, address owner, bool verified) external { channelOwner[id] = owner; isVerified[id] = verified; }
}

contract RegistrarAuthorityHarness {
    ContentRegistry public immutable registry;
    address public factory;
    constructor(address registryAddress) { registry = ContentRegistry(registryAddress); }
    function setFactory(address value) external { factory = value; }
    function authorizeMaterializedRegistrar(address registrar) external {
        require(msg.sender == factory);
        registry.setRegistrar(registrar, true);
    }
}
