//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {CreatorAssuranceContract, ICreatorAssuranceContract} from "./CreatorAssuranceContract.sol";
import {ContentRegistry} from "./ContentRegistry.sol";
import {ChannelRegistry} from "./ChannelRegistry.sol";
import {ChannelEscrow} from "./ChannelEscrow.sol";
import {PremintingERC1155} from "../utils/PremintingERC1155.sol";
import {PremintingERC1155Factory} from "../individual-projects/Pubstarter.sol";
import {MarketplaceFactory, ERC1155SecondaryMarket} from "../individual-projects/Pubstarter.sol";
import {ValueThresholdCondition} from "../individual-projects/ValueThresholdCondition.sol";
import {ValueThresholdConditionFactory} from "../individual-projects/Pubstarter.sol";
import {CancellableCondition} from "../individual-projects/CancellableCondition.sol";
import {IAssuranceCondition} from "../individual-projects/IAssuranceCondition.sol";

error ArrayLengthMismatch();
error InvalidChannelId();
error InvalidContentIdSeparator();
error InvalidPaymentTokenAddress();
error ChannelCanonicalIdMismatch(bytes32 channelId, bytes32 canonicalChannelIdHash);
error ChannelNotVerifiedOrControlled(bytes32 channelId);
error ChannelCreatorControlled(bytes32 channelId);
error InsufficientThirdPartyPurchase();
error ContentAlreadyRegisteredForContract(uint256 contentId);
error InvalidInitialPurchaseIndex(uint256 index);
error EmptyContentSuffix(uint256 index);
error ConditionNotFailed();
error NotCreatorContract(address contractAddress);
error MarketplaceCreationFailed();
error OnlyChannelOwnerCanCreateCreatorContract(bytes32 channelId);
error ThresholdMustExceedInitialPurchase();
error InvalidDelegatableNotesAddress();

/**
 * @title IChannelRegistry
 * @notice Interface for the channel registry used by the factory
 */
interface IChannelRegistry {
    function channelOwner(bytes32 channelId) external view returns (address);
    function isVerified(bytes32 channelId) external view returns (bool);
    function isCreatorControlled(bytes32 channelId) external view returns (bool);
}

/**
 * @title IContentRegistry
 * @notice Interface for the content registry used by the factory
 */
interface IContentRegistry {
    function contentContract(uint256 contentId) external view returns (address);
    function registerContent(uint256 contentId, address assuranceContract, string calldata canonicalId) external;
    function releaseContent(uint256 contentId) external;
    function isRegistered(uint256 contentId) external view returns (bool);
}

interface IDelegatableNotesPrimaryMarketAuthorizer {
    function authorizePrimaryMarket(address primaryMarket) external;
}

/**
 * @title CreatorAssuranceContractFactory
 * @notice Factory for creating CreatorAssuranceContracts with full project setup
 * @dev Orchestrates the creation of ERC1155 tokens, secondary marketplaces, assurance
 *      contracts, and funding conditions in a single transaction. Supports both
 *      creator-initiated and third-party-initiated contracts. Third-party contracts
 *      use a CancellableCondition so the creator can veto them within a time window.
 *
 *      Token assumptions: The paymentToken must be a standard ERC-20 token with:
 *      - 18 decimals (for MVP; multi-decimal support is a future enhancement)
 *      - No transfer fees or callbacks
 *      - No rebasing behavior
 *      - Standard transfer/transferFrom/approve interface
 *
 *      This implementation uses SafeERC20 for all token transfers to handle
 *      non-standard tokens that may not return boolean success values.
 */
contract CreatorAssuranceContractFactory is Ownable2Step {
    using SafeERC20 for IERC20;

    struct CreateContractParams {
        bytes32 channelId;
        string channelCanonicalId;
        string[] contentSuffixes;
        uint256[] supplies;
        uint256[] prices;
        uint256 threshold;
        uint256 deadline;
        string metadataCid;
        string erc1155MetadataUri;
        string erc1155ContractUri;
        uint256[] initialPurchaseIndices;
        uint256[] initialPurchaseCounts;
    }

    struct BuiltContent {
        uint256[] ids;
        string[] canonicalIds;
    }

    struct ChannelCreationContext {
        bool verified;
        address channelOwner;
        address recipient;
    }

    /**
     * @notice Emitted when a new creator assurance contract is created
     * @param contractAddress The address of the created assurance contract
     * @param channelId The channel the contract is associated with
     * @param creator The address that created the contract
     * @param isThirdParty Whether the contract was created by a third party (not the channel owner)
     */
    event CreatorContractCreated(
        address indexed contractAddress,
        bytes32 indexed channelId,
        address indexed creator,
        bool isThirdParty
    );

    /**
     * @notice Emitted when the minimum third-party purchase amount is updated
     * @param oldValue The previous minimum purchase amount
     * @param newValue The new minimum purchase amount
     */
    event ThirdPartyMinPurchaseUpdated(uint256 oldValue, uint256 newValue);
    event DelegatableNotesUpdated(address oldValue, address newValue);

    /// @notice The content registry for tracking content-to-contract mappings
    ContentRegistry public contentRegistry;
    /// @notice The channel registry for checking channel ownership and state
    ChannelRegistry public channelRegistry;
    /// @notice The escrow contract for unclaimed channels
    ChannelEscrow public channelEscrow;

    /// @notice Factory for creating ERC1155 token contracts
    PremintingERC1155Factory public immutable erc1155Factory;
    /// @notice Factory for creating secondary marketplace contracts
    MarketplaceFactory public immutable marketplaceFactory;
    /// @notice Factory for creating ETH threshold condition contracts
    ValueThresholdConditionFactory public immutable conditionFactory;
    /// @notice The separator character used in canonical content IDs (e.g. "/")
    string public contentIdSeparator;
    /// @notice The ERC-20 token used for all MVP content-funding contracts
    address public immutable paymentToken;
    /// @notice Optional DelegatableNotes contract that accepts creator contracts as primary markets
    address public delegatableNotes;

    /// @notice Maps contract address to the channel it belongs to
    mapping(address => bytes32) public channelIdByContract;
    /// @notice Whether a contract was created by a third party (not the channel owner)
    mapping(address => bool) public isThirdPartyCreated;
    /// @notice Maps contract address to its condition contract
    mapping(address => address) public contractCondition;
    /// @notice Maps contract address to its ERC1155 token contract
    mapping(address => address) public contractERC1155;

    /// @notice Minimum initial purchase required for third-party contract creation
    /// @dev Default is 1 unit of the settlement token (e.g., 1 USDC for 6-decimal tokens).
    ///      This is intentionally small; the owner should configure this appropriately for the
    ///      specific payment token being used via setThirdPartyMinPurchase().
    uint256 public thirdPartyMinPurchase = 1;

    /**
     * @notice Initializes the factory with all required dependency addresses
     * @param _contentRegistry The content registry contract
     * @param _channelRegistry The channel registry contract
     * @param _channelEscrow The channel escrow contract
     * @param _erc1155Factory The ERC1155 token factory
     * @param _marketplaceFactory The secondary marketplace factory
     * @param _conditionFactory The ETH threshold condition factory
     * @param _paymentToken The ERC-20 token used to settle all MVP content-funding contracts
     * @param _contentIdSeparator The single-character separator for canonical content IDs
     */
    constructor(
        address _contentRegistry,
        address _channelRegistry,
        address _channelEscrow,
        address _erc1155Factory,
        address _marketplaceFactory,
        address _conditionFactory,
        address _paymentToken,
        string memory _contentIdSeparator
    ) Ownable(msg.sender) {
        if (bytes(_contentIdSeparator).length != 1) revert InvalidContentIdSeparator();
        if (_paymentToken == address(0)) revert InvalidPaymentTokenAddress();
        contentRegistry = ContentRegistry(_contentRegistry);
        channelRegistry = ChannelRegistry(_channelRegistry);
        channelEscrow = ChannelEscrow(_channelEscrow);
        erc1155Factory = PremintingERC1155Factory(_erc1155Factory);
        marketplaceFactory = MarketplaceFactory(_marketplaceFactory);
        conditionFactory = ValueThresholdConditionFactory(_conditionFactory);
        paymentToken = _paymentToken;
        contentIdSeparator = _contentIdSeparator;
    }

    /**
     * @notice Update the minimum initial purchase required for third-party contracts
     * @dev Only callable by the contract owner
     * @param _minPurchase The new minimum purchase amount in wei
     */
    function setThirdPartyMinPurchase(uint256 _minPurchase) external onlyOwner {
        uint256 oldValue = thirdPartyMinPurchase;
        thirdPartyMinPurchase = _minPurchase;
        emit ThirdPartyMinPurchaseUpdated(oldValue, _minPurchase);
    }

    /**
     * @notice Set the DelegatableNotes contract that should trust creator contracts created here.
     * @dev Optional for deployments that do not support delegated purchases of content-funding tokens.
     */
    function setDelegatableNotes(address _delegatableNotes) external onlyOwner {
        if (_delegatableNotes == address(0)) revert InvalidDelegatableNotesAddress();
        address oldValue = delegatableNotes;
        delegatableNotes = _delegatableNotes;
        emit DelegatableNotesUpdated(oldValue, _delegatableNotes);
    }

    /**
     * @notice Create a complete assurance contract as the verified channel owner.
     * @param params Contract, content, pricing, metadata, and optional initial purchase details.
     * @return The address of the created CreatorAssuranceContract
     */
    function createCreatorContract(CreateContractParams calldata params) external returns (address) {
        BuiltContent memory content = _validateAndBuildContent(params);
        uint256 initialPurchaseValue = _calculateInitialPurchaseValue(params);
        ChannelCreationContext memory channel = _validateCreatorContract(params.channelId);
        return _deployContract(params, content, channel, false, initialPurchaseValue);
    }

    /**
     * @notice Create a complete assurance contract for an unclaimed or verified channel as a third party.
     * @dev Verified-channel third-party contracts use a CancellableCondition so the creator can veto them.
     * @param params Contract, content, pricing, metadata, and required initial purchase details.
     * @return The address of the created CreatorAssuranceContract
     */
    function createThirdPartyContract(CreateContractParams calldata params) external returns (address) {
        BuiltContent memory content = _validateAndBuildContent(params);
        uint256 initialPurchaseValue = _calculateInitialPurchaseValue(params);
        ChannelCreationContext memory channel = _validateThirdPartyContract(params, initialPurchaseValue);
        return _deployContract(params, content, channel, true, initialPurchaseValue);
    }

    function _validateAndBuildContent(
        CreateContractParams calldata params
    ) private view returns (BuiltContent memory content) {
        if (
            params.contentSuffixes.length != params.supplies.length
                || params.contentSuffixes.length != params.prices.length
                || params.initialPurchaseIndices.length != params.initialPurchaseCounts.length
        ) {
            revert ArrayLengthMismatch();
        }

        if (params.channelId == bytes32(0)) revert InvalidChannelId();

        bytes32 canonicalChannelIdHash = keccak256(bytes(params.channelCanonicalId));
        if (canonicalChannelIdHash != params.channelId) {
            revert ChannelCanonicalIdMismatch(params.channelId, canonicalChannelIdHash);
        }

        content.ids = new uint256[](params.contentSuffixes.length);
        content.canonicalIds = new string[](params.contentSuffixes.length);
        for (uint256 i = 0; i < params.contentSuffixes.length; i++) {
            (uint256 contentId, string memory canonicalId) = _buildContentId(
                params.channelCanonicalId,
                params.contentSuffixes[i],
                i
            );
            if (contentRegistry.isRegistered(contentId)) {
                revert ContentAlreadyRegisteredForContract(contentId);
            }
            content.ids[i] = contentId;
            content.canonicalIds[i] = canonicalId;
        }
    }

    function _validateCreatorContract(
        bytes32 channelId
    ) private view returns (ChannelCreationContext memory channel) {
        channel.verified = channelRegistry.isVerified(channelId);
        channel.channelOwner = channel.verified
            ? channelRegistry.channelOwner(channelId)
            : address(0);

        if (!channel.verified) {
            revert ChannelNotVerifiedOrControlled(channelId);
        }
        if (msg.sender != channel.channelOwner) {
            revert OnlyChannelOwnerCanCreateCreatorContract(channelId);
        }
        channel.recipient = channel.channelOwner;
    }

    function _validateThirdPartyContract(
        CreateContractParams calldata params,
        uint256 initialPurchaseValue
    ) private view returns (ChannelCreationContext memory channel) {
        channel.verified = channelRegistry.isVerified(params.channelId);
        bool creatorControlled = channelRegistry.isCreatorControlled(params.channelId);
        channel.channelOwner = channel.verified
            ? channelRegistry.channelOwner(params.channelId)
            : address(0);

        if (creatorControlled) {
            revert ChannelCreatorControlled(params.channelId);
        }
        if (initialPurchaseValue < thirdPartyMinPurchase) {
            revert InsufficientThirdPartyPurchase();
        }
        // For Verified channels, require threshold > initial purchase so the contract cannot succeed
        // inside creation and bypass the creator's veto window.
        if (channel.verified && params.threshold <= initialPurchaseValue) {
            revert ThresholdMustExceedInitialPurchase();
        }
        channel.recipient = channel.verified ? channel.channelOwner : address(channelEscrow);
    }

    function _deployContract(
        CreateContractParams calldata params,
        BuiltContent memory content,
        ChannelCreationContext memory channel,
        bool isThirdParty,
        uint256 initialPurchaseValue
    ) private returns (address) {

        PremintingERC1155 erc1155 = erc1155Factory.createPremintingERC1155(
            address(this),
            params.erc1155MetadataUri,
            params.erc1155ContractUri
        );

        ERC1155SecondaryMarket marketplace = marketplaceFactory.createMarketplace(address(erc1155), paymentToken);
        if (address(marketplace) == address(0)) revert MarketplaceCreationFailed();

        CreatorAssuranceContract ac = new CreatorAssuranceContract(
            address(this),
            channel.recipient,
            paymentToken,
            address(erc1155),
            params.metadataCid,
            params.channelId,
            !channel.verified
        );

        address conditionAddress;
        if (isThirdParty) {
            ValueThresholdCondition baseCondition = conditionFactory.createCondition(
                address(ac),
                params.threshold,
                params.deadline
            );
            CancellableCondition cancellableCondition = new CancellableCondition(
                address(baseCondition),
                address(channelRegistry)
            );
            conditionAddress = address(cancellableCondition);
        } else {
            ValueThresholdCondition condition = conditionFactory.createCondition(
                address(ac),
                params.threshold,
                params.deadline
            );
            conditionAddress = address(condition);
        }

        ac.setCondition(IAssuranceCondition(conditionAddress));
        ac.setPricesERC1155(content.ids, params.prices);
        ac.setContentIds(content.ids);
        ac.setOwner(msg.sender);

        erc1155.mintBatch(address(ac), content.ids, params.supplies);
        erc1155.renounceOwnership();

        for (uint256 i = 0; i < content.ids.length; i++) {
            contentRegistry.registerContent(content.ids[i], address(ac), content.canonicalIds[i]);
        }

        channelIdByContract[address(ac)] = params.channelId;
        isThirdPartyCreated[address(ac)] = isThirdParty;
        contractCondition[address(ac)] = conditionAddress;
        contractERC1155[address(ac)] = address(erc1155);
        if (delegatableNotes != address(0)) {
            IDelegatableNotesPrimaryMarketAuthorizer(delegatableNotes).authorizePrimaryMarket(address(ac));
        }

        if (initialPurchaseValue > 0) {
            IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), initialPurchaseValue);
            IERC20(paymentToken).forceApprove(address(ac), initialPurchaseValue);
            ac.buyERC1155(
                msg.sender,
                address(erc1155),
                _initialPurchaseIds(content.ids, params.initialPurchaseIndices),
                params.initialPurchaseCounts,
                ""
            );
            IERC20(paymentToken).forceApprove(address(ac), 0);
        }

        emit CreatorContractCreated(address(ac), params.channelId, msg.sender, isThirdParty);

        return address(ac);
    }

    /**
     * @notice Release content IDs from the registry when a contract's condition has failed
     * @dev Called by the ChannelRegistry during veto, or can be called by anyone after failure.
     *      Releases all content IDs associated with the contract back to unregistered state.
     * @param contractAddress The address of the failed creator assurance contract
     */
    function releaseContentOnFailure(address contractAddress) external {
        bytes32 channelId = channelIdByContract[contractAddress];
        if (channelId == bytes32(0)) {
            revert NotCreatorContract(contractAddress);
        }

        address conditionAddr = contractCondition[contractAddress];
        IAssuranceCondition condition = IAssuranceCondition(conditionAddr);

        if (!condition.hasFailed()) {
            revert ConditionNotFailed();
        }

        uint256[] memory contentIds = ICreatorAssuranceContract(contractAddress).getContentIds();
        for (uint256 i = 0; i < contentIds.length; i++) {
            if (contentRegistry.contentContract(contentIds[i]) == contractAddress) {
                contentRegistry.releaseContent(contentIds[i]);
            }
        }
    }

    function _calculateInitialPurchaseValue(
        CreateContractParams calldata params
    ) private pure returns (uint256 totalValue) {
        for (uint256 i = 0; i < params.initialPurchaseIndices.length; i++) {
            uint256 purchaseIndex = params.initialPurchaseIndices[i];
            if (purchaseIndex >= params.prices.length) revert InvalidInitialPurchaseIndex(purchaseIndex);
            totalValue += params.prices[purchaseIndex] * params.initialPurchaseCounts[i];
        }
    }

    function _initialPurchaseIds(
        uint256[] memory contentIds,
        uint256[] calldata initialPurchaseIndices
    ) private pure returns (uint256[] memory ids) {
        ids = new uint256[](initialPurchaseIndices.length);
        for (uint256 i = 0; i < initialPurchaseIndices.length; i++) {
            uint256 purchaseIndex = initialPurchaseIndices[i];
            if (purchaseIndex >= contentIds.length) revert InvalidInitialPurchaseIndex(purchaseIndex);
            ids[i] = contentIds[purchaseIndex];
        }
    }

    function _buildContentId(
        string memory channelCanonicalId,
        string memory contentSuffix,
        uint256 index
    ) private view returns (uint256 contentId, string memory canonicalId) {
        if (bytes(contentSuffix).length == 0) revert EmptyContentSuffix(index);
        canonicalId = string.concat(channelCanonicalId, contentIdSeparator, contentSuffix);
        contentId = uint256(keccak256(bytes(canonicalId)));
    }
}
