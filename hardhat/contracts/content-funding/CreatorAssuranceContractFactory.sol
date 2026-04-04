//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {CreatorAssuranceContract} from "./CreatorAssuranceContract.sol";
import {ContentRegistry} from "./ContentRegistry.sol";
import {ChannelRegistry} from "./ChannelRegistry.sol";
import {ChannelEscrow} from "./ChannelEscrow.sol";
import {PremintingERC1155} from "../utils/PremintingERC1155.sol";
import {PremintingERC1155Factory} from "../individual-projects/Pubstarter.sol";
import {ERC1155SecondaryMarket} from "../marketplace/ERC1155SecondaryMarket.sol";
import {MarketplaceFactory} from "../individual-projects/Pubstarter.sol";
import {EthThresholdCondition} from "../individual-projects/EthThresholdCondition.sol";
import {EthThresholdConditionFactory} from "../individual-projects/Pubstarter.sol";
import {CancellableCondition} from "../individual-projects/CancellableCondition.sol";
import {IAssuranceCondition} from "../individual-projects/IAssuranceCondition.sol";

error ArrayLengthMismatch();
error ChannelNotVerifiedOrControlled(bytes32 channelId);
error InsufficientThirdPartyPurchase();
error ContentAlreadyRegisteredForContract(uint256 contentId);
error ConditionNotFailed();
error NotCreatorContract(address contractAddress);

interface IChannelRegistry {
    function channelOwner(bytes32 channelId) external view returns (address);
    function isVerified(bytes32 channelId) external view returns (bool);
    function isCreatorControlled(bytes32 channelId) external view returns (bool);
}

interface IContentRegistry {
    function registerContent(uint256 contentId, address assuranceContract) external;
    function releaseContent(uint256 contentId) external;
    function isRegistered(uint256 contentId) external view returns (bool);
}

interface IChannelEscrow {
    function deposit(bytes32 channelId) external payable;
}

interface ICreatorAssuranceContract {
    function contentIds() external view returns (uint256[] memory);
}

contract CreatorAssuranceContractFactory {
    event CreatorContractCreated(
        address indexed contractAddress,
        bytes32 indexed channelId,
        address indexed erc1155,
        bool isThirdParty
    );

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
    ) {
        contentRegistry = ContentRegistry(_contentRegistry);
        channelRegistry = ChannelRegistry(_channelRegistry);
        channelEscrow = ChannelEscrow(_channelEscrow);
        erc1155Factory = PremintingERC1155Factory(_erc1155Factory);
        marketplaceFactory = MarketplaceFactory(_marketplaceFactory);
        conditionFactory = EthThresholdConditionFactory(_conditionFactory);
    }

    function setThirdPartyMinPurchase(uint256 _minPurchase) external {
        thirdPartyMinPurchase = _minPurchase;
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
        bool isThirdParty
    ) external payable returns (address) {
        if (contentIds.length != supplies.length || contentIds.length != prices.length) {
            revert ArrayLengthMismatch();
        }

        bool isVerified = IChannelRegistry(address(channelRegistry)).isVerified(channelId);
        bool isCreatorControlled = IChannelRegistry(address(channelRegistry)).isCreatorControlled(channelId);

        if (!isVerified && !isCreatorControlled) {
            revert ChannelNotVerifiedOrControlled(channelId);
        }

        if (isThirdParty) {
            if (msg.value < thirdPartyMinPurchase) {
                revert InsufficientThirdPartyPurchase();
            }
            for (uint256 i = 0; i < contentIds.length; i++) {
                if (IContentRegistry(address(contentRegistry)).isRegistered(contentIds[i])) {
                    revert ContentAlreadyRegisteredForContract(contentIds[i]);
                }
            }
        }

        address recipient;
        if (!isVerified) {
            recipient = address(channelEscrow);
        } else {
            recipient = IChannelRegistry(address(channelRegistry)).channelOwner(channelId);
        }

        PremintingERC1155 erc1155 = erc1155Factory.createPremintingERC1155(
            address(this),
            erc1155MetadataUri,
            erc1155ContractUri
        );

        marketplaceFactory.createMarketplace(address(erc1155));

        CreatorAssuranceContract ac = new CreatorAssuranceContract(
            address(this),
            recipient,
            metadataCid,
            channelId
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

        if (isThirdParty && msg.value > 0) {
            IChannelEscrow(address(channelEscrow)).deposit{value: msg.value}(channelId);
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

        try ICreatorAssuranceContract(contractAddress).contentIds() returns (uint256[] memory contentIds) {
            for (uint256 i = 0; i < contentIds.length; i++) {
                if (IContentRegistry(address(contentRegistry)).isRegistered(contentIds[i])) {
                    IContentRegistry(address(contentRegistry)).releaseContent(contentIds[i]);
                }
            }
        } catch {
            // Fallback: content IDs not retrievable from contract
        }
    }
}
