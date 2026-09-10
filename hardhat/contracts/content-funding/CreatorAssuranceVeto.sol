//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ICancellableCondition} from "../individual-projects/CancellableCondition.sol";
import {BeneficiaryRegistry} from "./BeneficiaryRegistry.sol";

error OnlyChannelOwnerCanVeto();
error VetoWindowExpired();
error ContractNotThirdParty(bytes32 channelId, address contractAddress);
error ContractNotCreatedByFactory(address contractAddress);
error InvalidVetoWindowDuration();
error VetoWindowDurationCannotDecrease();
error ChannelNotCreatorControlled(bytes32 channelId);
error InvalidFactoryAddress();
error InvalidRegistryAddress();

interface ICreatorAssuranceContractFactory {
    function channelIdByContract(address contractAddress) external view returns (bytes32);
    function isThirdPartyCreated(address contractAddress) external view returns (bool);
    function contractCondition(address contractAddress) external view returns (address);
    function releaseContentOnFailure(address contractAddress) external;
}

/**
 * @title CreatorAssuranceVeto
 * @notice Content-only veto window and third-party success gate for one factory
 */
contract CreatorAssuranceVeto is Ownable {
    uint256 public constant MIN_VETO_WINDOW_DURATION = 1 days;
    uint256 public constant MAX_VETO_WINDOW_DURATION = 365 days;

    ICreatorAssuranceContractFactory public immutable factory;
    BeneficiaryRegistry public immutable beneficiaryRegistry;
    uint256 public vetoWindowDuration = 7 days;

    event VetoWindowDurationUpdated(uint256 oldDuration, uint256 newDuration);
    event ContractVetoed(bytes32 indexed channelId, address indexed contractAddress);

    constructor(address _factory, address _beneficiaryRegistry, address owner_) Ownable(owner_) {
        if (_factory == address(0)) revert InvalidFactoryAddress();
        if (_beneficiaryRegistry == address(0)) revert InvalidRegistryAddress();
        factory = ICreatorAssuranceContractFactory(_factory);
        beneficiaryRegistry = BeneficiaryRegistry(_beneficiaryRegistry);
    }

    function setVetoWindowDuration(uint256 _duration) external onlyOwner {
        if (_duration < MIN_VETO_WINDOW_DURATION || _duration > MAX_VETO_WINDOW_DURATION) {
            revert InvalidVetoWindowDuration();
        }
        uint256 oldDuration = vetoWindowDuration;
        if (_duration < oldDuration) revert VetoWindowDurationCannotDecrease();
        vetoWindowDuration = _duration;
        emit VetoWindowDurationUpdated(oldDuration, _duration);
    }

    function canThirdPartyContractSucceed(bytes32 channelId) external view returns (bool) {
        if (!beneficiaryRegistry.isBeneficiaryControlled(channelId)) return false;
        return block.timestamp > beneficiaryRegistry.controlTakenAt(channelId) + vetoWindowDuration;
    }

    function vetoContract(address contractAddress) external {
        bytes32 channelId = factory.channelIdByContract(contractAddress);
        if (channelId == bytes32(0)) revert ContractNotCreatedByFactory(contractAddress);
        if (!beneficiaryRegistry.isBeneficiaryControlled(channelId)) {
            revert ChannelNotCreatorControlled(channelId);
        }
        if (msg.sender != beneficiaryRegistry.payoutAddress(channelId)) revert OnlyChannelOwnerCanVeto();
        if (!factory.isThirdPartyCreated(contractAddress)) {
            revert ContractNotThirdParty(channelId, contractAddress);
        }
        uint256 controlTaken = beneficiaryRegistry.controlTakenAt(channelId);
        if (block.timestamp > controlTaken + vetoWindowDuration) revert VetoWindowExpired();

        address conditionAddress = factory.contractCondition(contractAddress);
        if (conditionAddress == address(0)) revert ContractNotCreatedByFactory(contractAddress);

        ICancellableCondition(conditionAddress).cancel();
        factory.releaseContentOnFailure(contractAddress);

        emit ContractVetoed(channelId, contractAddress);
    }
}
