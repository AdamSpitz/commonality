//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {CreatorAssuranceContract, ICreatorAssuranceContract} from "./CreatorAssuranceContract.sol";
import {ContentRegistry} from "./ContentRegistry.sol";
import {ChannelRegistry} from "./ChannelRegistry.sol";
import {ChannelEscrow} from "./ChannelEscrow.sol";
import {PremintingERC1155} from "../utils/PremintingERC1155.sol";
import {PremintingERC1155Factory} from "../individual-projects/Pubstarter.sol";
import {MarketplaceFactory, ERC1155SecondaryMarket} from "../individual-projects/Pubstarter.sol";
import {EthThresholdCondition} from "../individual-projects/EthThresholdCondition.sol";
import {EthThresholdConditionFactory} from "../individual-projects/Pubstarter.sol";
import {CancellableCondition} from "../individual-projects/CancellableCondition.sol";
import {IAssuranceCondition} from "../individual-projects/IAssuranceCondition.sol";

error ArrayLengthMismatch();
error ChannelNotVerifiedOrControlled(bytes32 channelId);
error ChannelCreatorControlled(bytes32 channelId);
error InsufficientThirdPartyPurchase();
error InitialPurchaseValueMismatch();
error ContentAlreadyRegisteredForContract(uint256 contentId);
error InvalidInitialPurchaseToken(uint256 contentId);
error ConditionNotFailed();
error NotCreatorContract(address contractAddress);
error MarketplaceCreationFailed();
error OnlyChannelOwnerCanCreateCreatorContract(bytes32 channelId);

interface IChannelRegistry {
    function channelOwner(bytes32 channelId) external view returns (address);
    function isVerified(bytes32 channelId) external view returns (bool);
    function isCreatorControlled(bytes32 channelId) external view returns (bool);
}

interface IContentRegistry {
    function contentContract(uint256 contentId) external view returns (address);
    function registerContent(uint256 contentId, address assuranceContract) external;
    function releaseContent(uint256 contentId) external;
    function isRegistered(uint256 contentId) external view returns (bool);
}

contract CreatorAssuranceContractFactory is Ownable {
    event CreatorContractCreated(
        address indexed contractAddress,
        bytes32 indexed channelId,
        address indexed erc1155,
        bool isThirdParty
    );

    event ThirdPartyMinPurchaseUpdated(uint256 oldValue, uint256 newValue);

    ContentRegistry public contentRegistry;
    ChannelRegistry public channelRegistry;
    ChannelEscrow public channelEscrow;

    PremintingERC1155Factory public immutable erc1155Factory;
    MarketplaceFactory public immutable marketplaceFactory;
    EthThresholdConditionFactory public immutable conditionFactory;

    mapping(address => bytes32) public channelIdByContract;
    mapping(address => bool) public isThirdPartyCreated;
    mapping(address => address) public contractCondition;
    mapping(address => address) public contractERC1155;

    uint256 public thirdPartyMinPurchase = 0.01 ether;

    constructor(
        address _contentRegistry,
        address _channelRegistry,
        address _channelEscrow,
        address _erc1155Factory,
        address _marketplaceFactory,
        address _conditionFactory
    ) Ownable(msg.sender) {
        contentRegistry = ContentRegistry(_contentRegistry);
        channelRegistry = ChannelRegistry(_channelRegistry);
        channelEscrow = ChannelEscrow(_channelEscrow);
        erc1155Factory = PremintingERC1155Factory(_erc1155Factory);
        marketplaceFactory = MarketplaceFactory(_marketplaceFactory);
        conditionFactory = EthThresholdConditionFactory(_conditionFactory);
    }

    function setThirdPartyMinPurchase(uint256 _minPurchase) external onlyOwner {
        uint256 oldValue = thirdPartyMinPurchase;
        thirdPartyMinPurchase = _minPurchase;
        emit ThirdPartyMinPurchaseUpdated(oldValue, _minPurchase);
    }

    function createContract(
        bytes32 channelId,
        uint256[] memory contentIds,
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
    ) external payable returns (address) {
        if (
            contentIds.length != supplies.length
                || contentIds.length != prices.length
                || initialPurchaseIds.length != initialPurchaseCounts.length
        ) {
            revert ArrayLengthMismatch();
        }

        uint256 initialPurchaseValue = _calculateInitialPurchaseValue(
            contentIds,
            prices,
            initialPurchaseIds,
            initialPurchaseCounts
        );
        if (msg.value != initialPurchaseValue) {
            revert InitialPurchaseValueMismatch();
        }

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
        } else {
            // Creator contracts require Verified or CreatorControlled channel
            if (!verified) {
                revert ChannelNotVerifiedOrControlled(channelId);
            }
            if (msg.sender != channelOwner) {
                revert OnlyChannelOwnerCanCreateCreatorContract(channelId);
            }
        }

        for (uint256 i = 0; i < contentIds.length; i++) {
            if (IContentRegistry(address(contentRegistry)).isRegistered(contentIds[i])) {
                revert ContentAlreadyRegisteredForContract(contentIds[i]);
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

        ERC1155SecondaryMarket marketplace = marketplaceFactory.createMarketplace(address(erc1155));
        if (address(marketplace) == address(0)) revert MarketplaceCreationFailed();

        CreatorAssuranceContract ac = new CreatorAssuranceContract(
            address(this),
            recipient,
            metadataCid,
            channelId,
            !verified
        );

        address conditionAddress;
        if (isThirdParty) {
            EthThresholdCondition baseCondition = conditionFactory.createCondition(
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
            EthThresholdCondition condition = conditionFactory.createCondition(
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
            IContentRegistry(address(contentRegistry)).registerContent(contentIds[i], address(ac));
        }

        channelIdByContract[address(ac)] = channelId;
        isThirdPartyCreated[address(ac)] = isThirdParty;
        contractCondition[address(ac)] = conditionAddress;
        contractERC1155[address(ac)] = address(erc1155);

        if (initialPurchaseValue > 0) {
            ac.buyERC1155{value: initialPurchaseValue}(
                msg.sender,
                address(erc1155),
                initialPurchaseIds,
                initialPurchaseCounts,
                ""
            );
        }

        emit CreatorContractCreated(address(ac), channelId, address(erc1155), isThirdParty);

        return address(ac);
    }

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
}
