//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ICancellableCondition} from "../individual-projects/CancellableCondition.sol";

error ChannelAlreadyVerified(bytes32 channelId);
error ChannelNotVerified(bytes32 channelId);
error ChannelAlreadyCreatorControlled(bytes32 channelId);
error ChannelNotCreatorControlled(bytes32 channelId);
error InvalidClaimant();
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
error InvalidFactoryAddress();
error InvalidVetoWindowDuration();
error VetoWindowDurationCannotDecrease();

/**
 * @title IChannelVerifier
 * @notice Interface for verifying channel ownership claim proofs
 */
interface IChannelVerifier {
    function verifyClaimProof(
        bytes32 channelId,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes calldata verifierSignature
    ) external view returns (bool);
}

/**
 * @title IChannelRegistry
 * @notice Interface for the channel registry
 */
interface IChannelRegistry {
    function channelOwner(bytes32 channelId) external view returns (address);
    function channelState(bytes32 channelId) external view returns (uint8);
    function verifier() external view returns (address);
    function vetoWindowDuration() external view returns (uint256);
    function canThirdPartyContractSucceed(bytes32 channelId) external view returns (bool);
    function verifyChannel(
        bytes32 channelId,
        address claimant,
        bytes32 nonce,
        uint256 deadline,
        bytes calldata verifierSignature
    ) external;
    function takeChannelControl(bytes32 channelId) external;
    function vetoContract(address contractAddress) external;
    function setVerifier(address verifier) external;
    function setFactoryAuthorization(address factory, bool authorized) external;
    function isAuthorizedFactory(address factory) external view returns (bool);
    function setVetoWindowDuration(uint256 duration) external;
    function isVerified(bytes32 channelId) external view returns (bool);
    function isCreatorControlled(bytes32 channelId) external view returns (bool);
}

/**
 * @title ICreatorAssuranceContractFactory
 * @notice Interface for querying creator assurance contract factory state
 */
interface ICreatorAssuranceContractFactory {
    function channelIdByContract(address contractAddress) external view returns (bytes32);
    function isThirdPartyCreated(address contractAddress) external view returns (bool);
    function contractCondition(address contractAddress) external view returns (address);
    function releaseContentOnFailure(address contractAddress) external;
}

/**
 * @title ChannelRegistry
 * @notice Tracks channel ownership and verification state for the content funding system
 * @dev Channels progress through three states: Unclaimed -> Verified -> CreatorControlled.
 *      Verification requires a signed proof from an off-chain verifier (the Platform API Service).
 *      Once creator-controlled, the channel owner can veto third-party assurance contracts
 *      within a time window.
 */
contract ChannelRegistry is IChannelRegistry, Ownable2Step {
    uint256 public constant MIN_VETO_WINDOW_DURATION = 1 days;
    uint256 public constant MAX_VETO_WINDOW_DURATION = 365 days;

    /**
     * @notice Channel lifecycle states
     * @dev Unclaimed: no owner verified yet
     *      Verified: owner proven via off-chain signature, third parties can still create contracts
     *      CreatorControlled: owner has taken full control, can veto third-party contracts
     */
    enum ChannelState {
        Unclaimed,
        Verified,
        CreatorControlled
    }

    mapping(bytes32 channelId => address owner) private _channelOwners;
    mapping(bytes32 channelId => ChannelState) private _channelStates;
    mapping(bytes32 nonce => bool) private _usedNonces;

    /// @notice The verifier contract used to validate channel claim proofs
    address public verifier;
    mapping(address => bool) public authorizedFactories;
    address[] public factories;
    mapping(address => bool) private knownFactories;
    /// @notice Duration of the veto window after a creator takes channel control (default: 7 days)
    uint256 public vetoWindowDuration = 7 days;

    mapping(bytes32 channelId => uint256 controlTakenAt) private _controlTakenAt;

    /**
     * @notice Emitted when a channel's ownership is verified
     * @param channelId The verified channel
     * @param owner The verified owner address
     */
    event ChannelVerified(bytes32 indexed channelId, address indexed owner);

    /**
     * @notice Emitted when a channel owner takes full control
     * @param channelId The channel
     * @param owner The owner who took control
     */
    event ChannelControlTaken(bytes32 indexed channelId, address indexed owner);

    /**
     * @notice Emitted when a channel owner vetoes a third-party contract
     * @param channelId The channel
     * @param contractAddress The vetoed contract address
     */
    event ContractVetoed(bytes32 indexed channelId, address indexed contractAddress);

    /**
     * @notice Emitted when the verifier contract is updated
     * @param oldVerifier The previous verifier address
     * @param newVerifier The new verifier address
     */
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

    /**
     * @notice Emitted when a creator assurance contract factory is authorized/deauthorized.
     */
    event FactoryAuthorizationSet(address indexed factory, bool authorized);

    /**
     * @notice Emitted when the veto window duration is updated
     * @param oldDuration The previous duration in seconds
     * @param newDuration The new duration in seconds
     */
    event VetoWindowDurationUpdated(uint256 oldDuration, uint256 newDuration);

    /**
     * @notice Initializes the channel registry with a verifier contract
     * @param _verifier The address of the IChannelVerifier contract
     */
    constructor(address _verifier) Ownable(msg.sender) {
        if (_verifier == address(0)) revert InvalidVerifierAddress();
        verifier = _verifier;
    }

    /**
     * @notice Returns the owner of a channel
     * @param channelId The channel to query
     * @return The owner address (zero if unclaimed)
     */
    function channelOwner(bytes32 channelId) external view returns (address) {
        return _channelOwners[channelId];
    }

    /**
     * @notice Returns the current state of a channel as a uint8
     * @param channelId The channel to query
     * @return The channel state (0=Unclaimed, 1=Verified, 2=CreatorControlled)
     */
    function channelState(bytes32 channelId) external view returns (uint8) {
        return uint8(_channelStates[channelId]);
    }

    /**
     * @notice Check if a channel has been verified (Verified or CreatorControlled)
     * @param channelId The channel to check
     * @return True if the channel is at least Verified
     */
    function isVerified(bytes32 channelId) external view returns (bool) {
        return _channelStates[channelId] >= ChannelState.Verified;
    }

    /**
     * @notice Check if a channel is in the CreatorControlled state
     * @param channelId The channel to check
     * @return True if the channel is CreatorControlled
     */
    function isCreatorControlled(bytes32 channelId) external view returns (bool) {
        return _channelStates[channelId] == ChannelState.CreatorControlled;
    }

    /**
     * @notice Update the verifier contract address
     * @dev Only callable by the contract owner
     * @param _verifier The new verifier contract address
     */
    function setVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert InvalidVerifierAddress();
        address oldVerifier = verifier;
        verifier = _verifier;
        emit VerifierUpdated(oldVerifier, _verifier);
    }

    function setFactoryAuthorization(address _factory, bool authorized) external onlyOwner {
        _setFactoryAuthorization(_factory, authorized);
    }

    function factoryCount() external view returns (uint256) {
        return factories.length;
    }

    function isAuthorizedFactory(address _factory) external view returns (bool) {
        return authorizedFactories[_factory];
    }

    function _setFactoryAuthorization(address _factory, bool authorized) private {
        if (_factory == address(0)) revert InvalidFactoryAddress();
        if (authorizedFactories[_factory] == authorized) return;
        authorizedFactories[_factory] = authorized;
        if (!knownFactories[_factory]) {
            knownFactories[_factory] = true;
            factories.push(_factory);
        }
        emit FactoryAuthorizationSet(_factory, authorized);
    }

    /**
     * @notice Update the veto window duration
     * @dev Only callable by the contract owner. Bounded between MIN and MAX to prevent
     *      footguns (e.g., zero window or absurdly long lockouts). The duration may only
     *      be lengthened, never shortened, so in-flight veto windows cannot be expired early.
     * @param _duration The new veto window in seconds
     */
    function setVetoWindowDuration(uint256 _duration) external onlyOwner {
        if (_duration < MIN_VETO_WINDOW_DURATION || _duration > MAX_VETO_WINDOW_DURATION) {
            revert InvalidVetoWindowDuration();
        }
        uint256 oldDuration = vetoWindowDuration;
        if (_duration < oldDuration) revert VetoWindowDurationCannotDecrease();
        vetoWindowDuration = _duration;
        emit VetoWindowDurationUpdated(oldDuration, _duration);
    }

    /**
     * @notice Returns true once a third-party contract for this channel may become successful.
     * @dev Third-party contracts stay vetoable until the creator has verified ownership,
     *      taken control, and the veto window has elapsed. This prevents an unwanted
     *      contract from becoming irrevocably successful before the creator has a practical
     *      chance to veto it.
     */
    function canThirdPartyContractSucceed(bytes32 channelId) external view returns (bool) {
        if (_channelStates[channelId] != ChannelState.CreatorControlled) return false;
        return block.timestamp > _controlTakenAt[channelId] + vetoWindowDuration;
    }

    /**
     * @notice Verify channel ownership using a signed proof from the off-chain verifier
     * @dev Transitions the channel from Unclaimed to Verified. Can only be called once per channel.
     *      The proof must be signed by the trusted verifier and not expired.
     * @param channelId The channel to verify
     * @param claimant The address claiming ownership of the channel
     * @param nonce A unique nonce to prevent replay attacks
     * @param deadline The unix timestamp after which the proof expires
     * @param verifierSignature The signature from the off-chain verifier
     */
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
        if (claimant == address(0)) revert InvalidClaimant();
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

    /**
     * @notice Take full control of a verified channel
     * @dev Transitions the channel from Verified to CreatorControlled.
     *      Only the verified channel owner can call this. Starts the veto window.
     * @param channelId The channel to take control of
     */
    function takeChannelControl(bytes32 channelId) external {
        if (_channelStates[channelId] == ChannelState.Unclaimed) {
            revert ChannelNotVerified(channelId);
        }
        if (_channelStates[channelId] == ChannelState.CreatorControlled) {
            revert ChannelAlreadyCreatorControlled(channelId);
        }
        address caller = _msgSender();
        if (caller != _channelOwners[channelId]) {
            revert OnlyChannelOwnerCanTakeControl();
        }

        _channelStates[channelId] = ChannelState.CreatorControlled;
        _controlTakenAt[channelId] = block.timestamp;

        emit ChannelControlTaken(channelId, caller);
    }

    /**
     * @notice Veto a third-party assurance contract within the veto window
     * @dev Only callable by the creator-controlled channel owner. Cancels the contract's
     *      condition and releases the associated content IDs. Must be called within
     *      the veto window period after taking channel control.
     * @param contractAddress The address of the third-party assurance contract to veto
     */
    function vetoContract(address contractAddress) external {
        address contractFactory = _factoryForContract(contractAddress);
        if (contractFactory == address(0)) revert ContractNotCreatedByFactory(contractAddress);

        bytes32 channelId = ICreatorAssuranceContractFactory(contractFactory).channelIdByContract(contractAddress);

        if (_channelStates[channelId] != ChannelState.CreatorControlled) {
            revert ChannelNotCreatorControlled(channelId);
        }
        if (_msgSender() != _channelOwners[channelId]) revert OnlyChannelOwnerCanVeto();

        if (!ICreatorAssuranceContractFactory(contractFactory).isThirdPartyCreated(contractAddress)) {
            revert ContractNotThirdParty(channelId, contractAddress);
        }

        uint256 controlTaken = _controlTakenAt[channelId];
        if (block.timestamp > controlTaken + vetoWindowDuration) revert VetoWindowExpired();

        address conditionAddress = ICreatorAssuranceContractFactory(contractFactory).contractCondition(contractAddress);
        if (conditionAddress == address(0)) revert ContractNotCreatedByFactory(contractAddress);

        ICancellableCondition(conditionAddress).cancel();
        ICreatorAssuranceContractFactory(contractFactory).releaseContentOnFailure(contractAddress);

        emit ContractVetoed(channelId, contractAddress);
    }

    function _factoryForContract(address contractAddress) private view returns (address) {
        for (uint256 i = 0; i < factories.length; i++) {
            address candidate = factories[i];
            if (!authorizedFactories[candidate]) continue;
            if (ICreatorAssuranceContractFactory(candidate).channelIdByContract(contractAddress) != bytes32(0)) {
                return candidate;
            }
        }
        return address(0);
    }
}
