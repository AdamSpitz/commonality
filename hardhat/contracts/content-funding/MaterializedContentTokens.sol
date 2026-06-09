//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Burnable} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC7572} from "../utils/ERC7572.sol";
import {ContentRegistry} from "./ContentRegistry.sol";

error NoProspectiveBalance();
error ContentTokenAlreadyClaimed(uint256 contentId, address account);
error ContentTokenAlreadyAdded(uint256 contentId);
error InvalidContentId();
error ArrayLengthMismatch();

/**
 * @title MaterializedContentTokens
 * @notice Transferable content-item tokens claimable by holders of a non-transferable
 *      prospective content receipt token.
 * @dev A creator can add one or more concrete content IDs over time. For each content
 *      ID, every prospective-token holder can claim an equal number of transferable
 *      content tokens. This intentionally relies on prospective receipt tokens being
 *      non-transferable; otherwise claims would require snapshots.
 */
contract MaterializedContentTokens is Ownable, ERC1155, ERC1155Burnable, ERC7572, ReentrancyGuard {
    IERC1155 public immutable prospectiveToken;
    uint256 public immutable prospectiveTokenId;
    ContentRegistry public immutable contentRegistry;
    address public immutable sourceProspectiveContract;

    uint256[] public contentIds;
    mapping(uint256 => bool) public contentIdAdded;
    mapping(uint256 => string) public contentCanonicalId;
    mapping(uint256 => mapping(address => bool)) public claimed;

    event ContentMaterialized(uint256 indexed contentId, string canonicalId);
    event ContentTokenClaimed(address indexed account, uint256 indexed contentId, uint256 amount);

    constructor(
        address owner,
        address _prospectiveToken,
        uint256 _prospectiveTokenId,
        address _contentRegistry,
        address _sourceProspectiveContract,
        string memory uri,
        string memory initialContractURI
    ) Ownable(owner) ERC1155(uri) ERC7572(initialContractURI) {
        prospectiveToken = IERC1155(_prospectiveToken);
        prospectiveTokenId = _prospectiveTokenId;
        contentRegistry = ContentRegistry(_contentRegistry);
        sourceProspectiveContract = _sourceProspectiveContract;
    }

    function addContent(uint256 contentId, string calldata canonicalId) external onlyOwner nonReentrant {
        if (contentId == 0) revert InvalidContentId();
        if (contentIdAdded[contentId]) revert ContentTokenAlreadyAdded(contentId);
        contentIdAdded[contentId] = true;
        contentCanonicalId[contentId] = canonicalId;
        contentIds.push(contentId);
        contentRegistry.registerContent(contentId, address(this), canonicalId);
        emit ContentMaterialized(contentId, canonicalId);
    }

    function addContentBatch(uint256[] calldata ids, string[] calldata canonicalIds) external onlyOwner nonReentrant {
        if (ids.length != canonicalIds.length) revert ArrayLengthMismatch();
        for (uint256 i = 0; i < ids.length; i++) {
            if (ids[i] == 0) revert InvalidContentId();
            if (contentIdAdded[ids[i]]) revert ContentTokenAlreadyAdded(ids[i]);
            contentIdAdded[ids[i]] = true;
            contentCanonicalId[ids[i]] = canonicalIds[i];
            contentIds.push(ids[i]);
        }
        for (uint256 i = 0; i < ids.length; i++) {
            contentRegistry.registerContent(ids[i], address(this), canonicalIds[i]);
            emit ContentMaterialized(ids[i], canonicalIds[i]);
        }
    }

    function claim(uint256 contentId) external nonReentrant {
        _claim(msg.sender, contentId);
    }

    function claimFor(address account, uint256 contentId) external nonReentrant {
        _claim(account, contentId);
    }

    function claimBatch(uint256[] calldata ids) external nonReentrant {
        for (uint256 i = 0; i < ids.length; i++) {
            _claim(msg.sender, ids[i]);
        }
    }

    function getContentIds() external view returns (uint256[] memory) {
        return contentIds;
    }

    function _claim(address account, uint256 contentId) private {
        if (!contentIdAdded[contentId]) revert InvalidContentId();
        if (claimed[contentId][account]) revert ContentTokenAlreadyClaimed(contentId, account);
        uint256 amount = prospectiveToken.balanceOf(account, prospectiveTokenId);
        if (amount == 0) revert NoProspectiveBalance();
        claimed[contentId][account] = true;
        _mint(account, contentId, amount, "");
        emit ContentTokenClaimed(account, contentId, amount);
    }
}

contract MaterializedContentTokensFactory {
    event MaterializedContentTokensCreated(
        address indexed tokenContract,
        address indexed owner,
        address indexed sourceProspectiveContract,
        address prospectiveToken,
        uint256 prospectiveTokenId
    );

    function createMaterializedContentTokens(
        address owner,
        address prospectiveToken,
        uint256 prospectiveTokenId,
        address contentRegistry,
        address sourceProspectiveContract,
        string memory uri,
        string memory initialContractURI
    ) external returns (MaterializedContentTokens) {
        MaterializedContentTokens token = new MaterializedContentTokens(
            owner,
            prospectiveToken,
            prospectiveTokenId,
            contentRegistry,
            sourceProspectiveContract,
            uri,
            initialContractURI
        );
        emit MaterializedContentTokensCreated(
            address(token),
            owner,
            sourceProspectiveContract,
            prospectiveToken,
            prospectiveTokenId
        );
        return token;
    }
}
