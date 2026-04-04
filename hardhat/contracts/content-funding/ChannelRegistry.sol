//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

error ChannelAlreadyVerified(bytes32 channelId);
error ChannelNotVerified(bytes32 channelId);
error ChannelAlreadyCreatorControlled(bytes32 channelId);
error ChannelNotCreatorControlled(bytes32 channelId);
error OnlyChannelOwnerCanVerify();
error OnlyChannelOwnerCanTakeControl();
error OnlyChannelOwnerCanVeto();
error InvalidNonce();
error ProofExpired();
error InvalidVerifierSignature();
error VetoWindowExpired();
error ContractNotThirdParty(bytes32 channelId, address contractAddress);
error ContractAlreadySucceeded(address contractAddress);
error ContractNotCreatedByFactory(address contractAddress);
error OnlyFactoryCanRegister();
error InvalidVerifierAddress();
error FactoryNotSet();

interface IChannelVerifier {
    function verifyClaimProof(
        bytes32 channelId,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes calldata verifierSignature
    ) external view returns (bool);
}

interface IChannelRegistry {
    function channelOwner(bytes32 channelId) external view returns (address);
    function channelState(bytes32 channelId) external view returns (uint8);
    function verifyChannel(
        bytes32 channelId,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes calldata verifierSignature
    ) external;
    function takeChannelControl(bytes32 channelId) external;
    function setVerifier(address verifier) external;
    function setFactory(address factory) external;
    function isVerified(bytes32 channelId) external view returns (bool);
    function isCreatorControlled(bytes32 channelId) external view returns (bool);
}

interface ICreatorAssuranceContractFactory {
    function channelIdByContract(address contractAddress) external view returns (bytes32);
    function isThirdPartyCreated(address contractAddress) external view returns (bool);
    function contractCondition(address contractAddress) external view returns (address);
}

contract ChannelRegistry is IChannelRegistry {
    enum ChannelState {
        Unclaimed,
        Verified,
        CreatorControlled
    }

    mapping(bytes32 channelId => address owner) private _channelOwners;
    mapping(bytes32 channelId => ChannelState) private _channelStates;
    mapping(bytes32 nonce => bool) private _usedNonces;

    address public verifier;
    address public factory;
    uint256 public vetoWindowDuration = 7 days;

    mapping(bytes32 channelId => uint256 controlTakenAt) private _controlTakenAt;

    event ChannelVerified(bytes32 indexed channelId, address indexed owner);
    event ChannelControlTaken(bytes32 indexed channelId, address indexed owner);
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event FactoryUpdated(address indexed oldFactory, address indexed newFactory);

    constructor(address _verifier) {
        if (_verifier == address(0)) revert InvalidVerifierAddress();
        verifier = _verifier;
    }

    function channelOwner(bytes32 channelId) external view returns (address) {
        return _channelOwners[channelId];
    }

    function channelState(bytes32 channelId) external view returns (uint8) {
        return uint8(_channelStates[channelId]);
    }

    function isVerified(bytes32 channelId) external view returns (bool) {
        return _channelStates[channelId] >= ChannelState.Verified;
    }

    function isCreatorControlled(bytes32 channelId) external view returns (bool) {
        return _channelStates[channelId] == ChannelState.CreatorControlled;
    }

    function setVerifier(address _verifier) external {
        if (_verifier == address(0)) revert InvalidVerifierAddress();
        address oldVerifier = verifier;
        verifier = _verifier;
        emit VerifierUpdated(oldVerifier, _verifier);
    }

    function setFactory(address _factory) external {
        if (_factory == address(0)) revert InvalidVerifierAddress();
        address oldFactory = factory;
        factory = _factory;
        emit FactoryUpdated(oldFactory, _factory);
    }

    function verifyChannel(
        bytes32 channelId,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes calldata verifierSignature
    ) external {
        if (_channelStates[channelId] >= ChannelState.Verified) {
            revert ChannelAlreadyVerified(channelId);
        }
        if (_usedNonces[nonce]) revert InvalidNonce();
        if (block.timestamp > deadline) revert ProofExpired();

        bool validProof = IChannelVerifier(verifier).verifyClaimProof(
            channelId,
            claimant,
            nonce,
            deadline,
            verifierSignature
        );
        if (!validProof) revert InvalidVerifierSignature();

        _usedNonces[nonce] = true;
        _channelOwners[channelId] = claimant;
        _channelStates[channelId] = ChannelState.Verified;

        emit ChannelVerified(channelId, claimant);
    }

    function takeChannelControl(bytes32 channelId) external {
        if (_channelStates[channelId] != ChannelState.Verified) {
            revert ChannelNotVerified(channelId);
        }
        if (_channelStates[channelId] == ChannelState.CreatorControlled) {
            revert ChannelAlreadyCreatorControlled(channelId);
        }
        if (msg.sender != _channelOwners[channelId]) {
            revert OnlyChannelOwnerCanTakeControl();
        }

        _channelStates[channelId] = ChannelState.CreatorControlled;
        _controlTakenAt[channelId] = block.timestamp;

        emit ChannelControlTaken(channelId, msg.sender);
    }

    function vetoContract(address contractAddress) external {
        if (factory == address(0)) revert FactoryNotSet();
        
        bytes32 channelId = ICreatorAssuranceContractFactory(factory).channelIdByContract(contractAddress);
        if (channelId == bytes32(0)) revert ContractNotCreatedByFactory(contractAddress);
        
        if (_channelStates[channelId] != ChannelState.CreatorControlled) {
            revert ChannelNotCreatorControlled(channelId);
        }
        if (msg.sender != _channelOwners[channelId]) revert OnlyChannelOwnerCanVeto();
        
        if (!ICreatorAssuranceContractFactory(factory).isThirdPartyCreated(contractAddress)) {
            revert ContractNotThirdParty(channelId, contractAddress);
        }
        
        uint256 controlTaken = _controlTakenAt[channelId];
        if (block.timestamp > controlTaken + vetoWindowDuration) revert VetoWindowExpired();
        
        address conditionAddress = ICreatorAssuranceContractFactory(factory).contractCondition(contractAddress);
        if (conditionAddress == address(0)) revert ContractNotCreatedByFactory(contractAddress);
        
        ICancellableCondition(conditionAddress).cancel();
    }

    function canCreateContract(bytes32 channelId) external view returns (bool) {
        ChannelState state = _channelStates[channelId];
        return state != ChannelState.CreatorControlled;
    }
}

interface ICancellableCondition {
    function cancel() external;
    function hasSucceeded() external view returns (bool);
}
