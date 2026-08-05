//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {ProspectiveContentTokens} from "./ProspectiveContentTokens.sol";
import {ProspectiveContentAssuranceContract} from "./ProspectiveContentAssuranceContract.sol";
import {MaterializedContentTokens} from "./MaterializedContentTokens.sol";
import {ChannelRegistry} from "./ChannelRegistry.sol";
import {ContentRegistry} from "./ContentRegistry.sol";
import {ValueThresholdConditionFactory} from "../individual-projects/ProjectFactory.sol";
import {ValueThresholdCondition} from "../individual-projects/ValueThresholdCondition.sol";
import {IAssuranceCondition} from "../individual-projects/IAssuranceCondition.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

error InvalidChannelId();
error ChannelCanonicalIdMismatch(bytes32 channelId, bytes32 canonicalHash);
error ChannelNotVerified(bytes32 channelId);
error OnlyCurrentChannelOwner(bytes32 channelId);
error InvalidFundingTerms();
error InvalidReceiptTerms();
error NotProspectiveRound(address round);
error ProspectiveRoundNotSuccessful(address round);
error MaterializedCollectionAlreadyCreated(address round);

interface IRegistrarAuthority {
    function authorizeMaterializedRegistrar(address registrar) external;
}

contract ProspectiveRoundDeploymentHelper {
    function deployToken(address owner, bytes32 channelId, string calldata canonicalId, string calldata uri, string calldata contractUri) external returns (ProspectiveContentTokens) {
        return new ProspectiveContentTokens(owner, channelId, canonicalId, uri, contractUri);
    }
    function deployRound(address owner, address recipient, address paymentToken, address token, string calldata metadataCid, bytes32 channelId) external returns (ProspectiveContentAssuranceContract) {
        return new ProspectiveContentAssuranceContract(owner, recipient, paymentToken, token, metadataCid, channelId);
    }
}

contract MaterializedContentDeploymentHelper {
    function deploy(address owner, address receipt, uint256 receiptId, address contents, address channels, address round, bytes32 channelId, string calldata canonicalId, string calldata separator, string calldata uri, string calldata contractUri) external returns (MaterializedContentTokens) {
        return new MaterializedContentTokens(owner, receipt, receiptId, contents, channels, round, channelId, canonicalId, separator, uri, contractUri);
    }
}

/** Trusted, atomic creation path for creator-only prospective rounds and their fulfillment. */
contract ProspectiveContentRoundFactory is ReentrancyGuard {
    struct CreateRoundParams {
        bytes32 channelId;
        string channelCanonicalId;
        uint256 tokenId;
        uint256 supply;
        uint256 price;
        uint256 threshold;
        uint256 deadline;
        string metadataCid;
        string receiptMetadataUri;
        string receiptContractUri;
    }

    ChannelRegistry public immutable channelRegistry;
    ContentRegistry public immutable contentRegistry;
    ValueThresholdConditionFactory public immutable conditionFactory;
    address public immutable paymentToken;
    address public immutable registrarAuthority;
    ProspectiveRoundDeploymentHelper public immutable roundDeploymentHelper;
    MaterializedContentDeploymentHelper public immutable materializedDeploymentHelper;
    string public contentIdSeparator;

    mapping(address => bool) public isProspectiveRound;
    mapping(address => bytes32) public channelIdByRound;
    mapping(address => address) public receiptTokenByRound;
    mapping(address => uint256) public receiptTokenIdByRound;
    mapping(address => address) public conditionByRound;
    mapping(address => address) public materializedTokenByRound;
    mapping(address => string) private _channelCanonicalIdByRound;

    event ProspectiveRoundCreated(address indexed round, bytes32 indexed channelId, address indexed receiptToken, uint256 receiptTokenId, address condition);
    event ProspectiveRoundMaterialized(address indexed round, address indexed tokenContract);

    constructor(address channels, address contents, address conditions, address settlementToken, address authority, address roundHelper, address materializedHelper, string memory separator) {
        channelRegistry = ChannelRegistry(channels);
        contentRegistry = ContentRegistry(contents);
        conditionFactory = ValueThresholdConditionFactory(conditions);
        paymentToken = settlementToken;
        registrarAuthority = authority;
        roundDeploymentHelper = ProspectiveRoundDeploymentHelper(roundHelper);
        materializedDeploymentHelper = MaterializedContentDeploymentHelper(materializedHelper);
        contentIdSeparator = separator;
    }

    function createProspectiveRound(CreateRoundParams calldata p) external returns (address) {
        if (p.channelId == bytes32(0)) revert InvalidChannelId();
        _requireChannelOwner(p.channelId);
        bytes32 canonicalHash = keccak256(bytes(p.channelCanonicalId));
        if (canonicalHash != p.channelId) revert ChannelCanonicalIdMismatch(p.channelId, canonicalHash);
        if (p.threshold == 0 || p.deadline <= block.timestamp) revert InvalidFundingTerms();
        if (p.supply == 0 || p.price == 0) revert InvalidReceiptTerms();

        ProspectiveContentTokens token = roundDeploymentHelper.deployToken(address(this), p.channelId, p.channelCanonicalId, p.receiptMetadataUri, p.receiptContractUri);
        ProspectiveContentAssuranceContract round = roundDeploymentHelper.deployRound(address(this), msg.sender, paymentToken, address(token), p.metadataCid, p.channelId);
        ValueThresholdCondition condition = conditionFactory.createCondition(address(round), p.threshold, p.deadline);
        round.setCondition(condition);
        uint256[] memory ids = new uint256[](1);
        uint256[] memory values = new uint256[](1);
        ids[0] = p.tokenId;
        values[0] = p.price;
        round.setPricesERC1155(ids, values);
        values[0] = p.supply;
        token.setPrimaryMarket(address(round));
        token.mintBatch(address(round), ids, values);
        token.renounceOwnership();
        round.transferOwnership(msg.sender);

        address roundAddress = address(round);
        isProspectiveRound[roundAddress] = true;
        channelIdByRound[roundAddress] = p.channelId;
        receiptTokenByRound[roundAddress] = address(token);
        receiptTokenIdByRound[roundAddress] = p.tokenId;
        conditionByRound[roundAddress] = address(condition);
        _channelCanonicalIdByRound[roundAddress] = p.channelCanonicalId;
        emit ProspectiveRoundCreated(roundAddress, p.channelId, address(token), p.tokenId, address(condition));
        return roundAddress;
    }

    function createMaterializedContentTokens(address round, string calldata metadataUri, string calldata contractUri) external nonReentrant returns (address) {
        if (!isProspectiveRound[round]) revert NotProspectiveRound(round);
        bytes32 channelId = channelIdByRound[round];
        _requireChannelOwner(channelId);
        if (!IAssuranceCondition(conditionByRound[round]).hasSucceeded()) revert ProspectiveRoundNotSuccessful(round);
        if (materializedTokenByRound[round] != address(0)) revert MaterializedCollectionAlreadyCreated(round);

        MaterializedContentTokens token = materializedDeploymentHelper.deploy(
            msg.sender, receiptTokenByRound[round], receiptTokenIdByRound[round], address(contentRegistry),
            address(channelRegistry), round, channelId, _channelCanonicalIdByRound[round], contentIdSeparator,
            metadataUri, contractUri
        );
        materializedTokenByRound[round] = address(token);
        IRegistrarAuthority(registrarAuthority).authorizeMaterializedRegistrar(address(token));
        ProspectiveContentAssuranceContract(round).setMaterializedContentTokens(address(token));
        emit ProspectiveRoundMaterialized(round, address(token));
        return address(token);
    }

    function _requireChannelOwner(bytes32 channelId) private view {
        if (!channelRegistry.isVerified(channelId)) revert ChannelNotVerified(channelId);
        if (msg.sender != channelRegistry.channelOwner(channelId)) revert OnlyCurrentChannelOwner(channelId);
    }
}
