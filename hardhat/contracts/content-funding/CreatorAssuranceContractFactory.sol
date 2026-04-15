//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
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
error InitialPurchaseValueMismatch();
error ContentAlreadyRegisteredForContract(uint256 contentId);
error InvalidInitialPurchaseToken(uint256 contentId);
error EmptyContentSuffix(uint256 index);
error ConditionNotFailed();
error NotCreatorContract(address contractAddress);
error MarketplaceCreationFailed();
error OnlyChannelOwnerCanCreateCreatorContract(bytes32 channelId);
error ThresholdMustExceedInitialPurchase();

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
contract CreatorAssuranceContractFactory is Ownable {
    using SafeERC20 for IERC20;

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
     * @notice Create a complete creator assurance contract with ERC1155 tokens and marketplace
     * @dev Orchestrates creation of ERC1155, marketplace, assurance contract, and condition.
     *      For third-party contracts, wraps the condition in a CancellableCondition.
     *      The msg.value must match the total cost of the initial purchase tokens.
     * @param channelId The channel this contract is for (keccak256 of channelCanonicalId)
     * @param channelCanonicalId The human-readable canonical channel identifier
     * @param contentSuffixes Suffixes appended to channelCanonicalId to form content IDs
     * @param supplies Token supply amounts for each content item
     * @param prices Token prices (in wei) for each content item
     * @param threshold The funding threshold for project success
     * @param deadline The unix timestamp after which the project can fail
     * @param metadataCid The IPFS CID for project metadata
     * @param erc1155MetadataUri The base URI for ERC1155 token metadata
     * @param erc1155ContractUri The contract-level metadata URI for the ERC1155
     * @param isThirdParty True if created by someone other than the channel owner
     * @param initialPurchaseIds Token IDs to purchase immediately upon creation
     * @param initialPurchaseCounts Amounts of each token to purchase initially
     * @return The address of the created CreatorAssuranceContract
     */
    function createContract(
        bytes32 channelId,
        string memory channelCanonicalId,
        string[] memory contentSuffixes,
        uint256[] memory supplies,
        uint256[] memory prices,
        uint256 threshold,
        uint256 deadline,
        string memory metadataCid,
        string memory erc1155MetadataUri,
        string memory erc1155ContractUri,
        bool isThirdParty,
        uint256[] memory initialPurchaseIds,
        uint256[] memory initialPurchaseCounts
    ) external returns (address) {
        if (
            contentSuffixes.length != supplies.length
                || contentSuffixes.length != prices.length
                || initialPurchaseIds.length != initialPurchaseCounts.length
        ) {
            revert ArrayLengthMismatch();
        }

        if (channelId == bytes32(0)) revert InvalidChannelId();

        bytes32 canonicalChannelIdHash = keccak256(bytes(channelCanonicalId));
        if (canonicalChannelIdHash != channelId) {
            revert ChannelCanonicalIdMismatch(channelId, canonicalChannelIdHash);
        }

        uint256[] memory contentIds = new uint256[](contentSuffixes.length);
        for (uint256 i = 0; i < contentSuffixes.length; i++) {
            (uint256 contentId, ) = _buildContentId(channelCanonicalId, contentSuffixes[i], i);
            if (IContentRegistry(address(contentRegistry)).isRegistered(contentId)) {
                revert ContentAlreadyRegisteredForContract(contentId);
            }
            contentIds[i] = contentId;
        }

        uint256 initialPurchaseValue = _calculateInitialPurchaseValue(
            contentIds,
            prices,
            initialPurchaseIds,
            initialPurchaseCounts
        );
        bool verified = IChannelRegistry(address(channelRegistry)).isVerified(channelId);
        bool creatorControlled = IChannelRegistry(address(channelRegistry)).isCreatorControlled(channelId);
        address channelOwner = verified
            ? IChannelRegistry(address(channelRegistry)).channelOwner(channelId)
            : address(0);

        if (isThirdParty) {
            // Third parties can create for Unclaimed or Verified channels, not CreatorControlled
            if (creatorControlled) {
                revert ChannelCreatorControlled(channelId);
            }
            if (initialPurchaseValue < thirdPartyMinPurchase) {
                revert InsufficientThirdPartyPurchase();
            }
            // For Verified channels, require threshold > initial purchase so contract can't succeed
            // inside createContract() and bypass the creator's veto window.
            // Unclaimed channels have no veto window, so this check is skipped.
            if (verified && threshold <= initialPurchaseValue) {
                revert ThresholdMustExceedInitialPurchase();
            }
        } else {
            // Creator contracts require Verified or CreatorControlled channel
            if (!verified) {
                revert ChannelNotVerifiedOrControlled(channelId);
            }
            if (msg.sender != channelOwner) {
                revert OnlyChannelOwnerCanCreateCreatorContract(channelId);
            }
        }

        // Unclaimed channels route funds to escrow; verified/controlled go to channel owner
        address recipient;
        if (!verified) {
            recipient = address(channelEscrow);
        } else {
            recipient = channelOwner;
        }

        PremintingERC1155 erc1155 = erc1155Factory.createPremintingERC1155(
            address(this),
            erc1155MetadataUri,
            erc1155ContractUri
        );

        ERC1155SecondaryMarket marketplace = marketplaceFactory.createMarketplace(address(erc1155), paymentToken);
        if (address(marketplace) == address(0)) revert MarketplaceCreationFailed();

        CreatorAssuranceContract ac = new CreatorAssuranceContract(
            address(this),
            recipient,
            paymentToken,
            metadataCid,
            channelId,
            !verified
        );

        address conditionAddress;
        if (isThirdParty) {
            ValueThresholdCondition baseCondition = conditionFactory.createCondition(
                address(ac),
                threshold,
                deadline
            );
            CancellableCondition cancellableCondition = new CancellableCondition(
                address(baseCondition),
                address(channelRegistry)
            );
            conditionAddress = address(cancellableCondition);
        } else {
            ValueThresholdCondition condition = conditionFactory.createCondition(
                address(ac),
                threshold,
                deadline
            );
            conditionAddress = address(condition);
        }

        ac.setCondition(IAssuranceCondition(conditionAddress));
        ac.setPricesERC1155(address(erc1155), contentIds, prices);
        ac.setContentIds(contentIds);
        ac.setOwner(msg.sender);

        erc1155.mintBatch(address(ac), contentIds, supplies);
        erc1155.renounceOwnership();

        for (uint256 i = 0; i < contentIds.length; i++) {
            (, string memory canonicalId) = _buildContentId(channelCanonicalId, contentSuffixes[i], i);
            IContentRegistry(address(contentRegistry)).registerContent(contentIds[i], address(ac), canonicalId);
        }

        channelIdByContract[address(ac)] = channelId;
        isThirdPartyCreated[address(ac)] = isThirdParty;
        contractCondition[address(ac)] = conditionAddress;
        contractERC1155[address(ac)] = address(erc1155);

        if (initialPurchaseValue > 0) {
            IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), initialPurchaseValue);
            IERC20(paymentToken).forceApprove(address(ac), initialPurchaseValue);
            ac.buyERC1155(
                msg.sender,
                address(erc1155),
                initialPurchaseIds,
                initialPurchaseCounts,
                ""
            );
            IERC20(paymentToken).forceApprove(address(ac), 0);
        }

        emit CreatorContractCreated(address(ac), channelId, msg.sender, isThirdParty);

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

        try ICreatorAssuranceContract(contractAddress).getContentIds() returns (uint256[] memory contentIds) {
            for (uint256 i = 0; i < contentIds.length; i++) {
                if (IContentRegistry(address(contentRegistry)).contentContract(contentIds[i]) == contractAddress) {
                    IContentRegistry(address(contentRegistry)).releaseContent(contentIds[i]);
                }
            }
        } catch (bytes memory) { // solhint-disable-line no-empty-blocks
            // Fallback: content IDs not retrievable from contract
        }
    }

    function _calculateInitialPurchaseValue(
        uint256[] memory contentIds,
        uint256[] memory prices,
        uint256[] memory initialPurchaseIds,
        uint256[] memory initialPurchaseCounts
    ) private pure returns (uint256 totalValue) {
        for (uint256 i = 0; i < initialPurchaseIds.length; i++) {
            uint256 price = _findPrice(contentIds, prices, initialPurchaseIds[i]);
            totalValue += price * initialPurchaseCounts[i];
        }
    }

    function _findPrice(
        uint256[] memory contentIds,
        uint256[] memory prices,
        uint256 purchaseId
    ) private pure returns (uint256) {
        for (uint256 i = 0; i < contentIds.length; i++) {
            if (contentIds[i] == purchaseId) {
                return prices[i];
            }
        }
        revert InvalidInitialPurchaseToken(purchaseId);
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
