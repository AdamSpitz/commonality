//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Burnable} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC7572} from "../utils/ERC7572.sol";
import {ContentRegistry} from "./ContentRegistry.sol";
import {ChannelRegistry} from "./ChannelRegistry.sol";

error NoProspectiveBalance();
error ContentTokenAlreadyClaimed(uint256 contentId, address account);
error ContentTokenAlreadyAdded(uint256 contentId);
error InvalidContentId();
error EmptyContentSuffix(uint256 index);
error NonTransferableContentToken();
error OnlyCurrentChannelOwner(address caller);

/** Channel-bound, non-transferable recognition for content fulfilled by a prospective round. */
contract MaterializedContentTokens is Ownable, ERC1155, ERC1155Burnable, ERC7572, ReentrancyGuard {
    IERC1155 public immutable prospectiveToken;
    uint256 public immutable prospectiveTokenId;
    ContentRegistry public immutable contentRegistry;
    ChannelRegistry public immutable channelRegistry;
    address public immutable sourceProspectiveContract;
    bytes32 public immutable channelId;
    string public channelCanonicalId;
    string public contentIdSeparator;

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
        address _channelRegistry,
        address _sourceProspectiveContract,
        bytes32 _channelId,
        string memory _channelCanonicalId,
        string memory _contentIdSeparator,
        string memory uri,
        string memory initialContractURI
    ) Ownable(owner) ERC1155(uri) ERC7572(initialContractURI) {
        prospectiveToken = IERC1155(_prospectiveToken);
        prospectiveTokenId = _prospectiveTokenId;
        contentRegistry = ContentRegistry(_contentRegistry);
        channelRegistry = ChannelRegistry(_channelRegistry);
        sourceProspectiveContract = _sourceProspectiveContract;
        channelId = _channelId;
        channelCanonicalId = _channelCanonicalId;
        contentIdSeparator = _contentIdSeparator;
    }

    modifier onlyCurrentChannelOwner() {
        if (msg.sender != channelRegistry.channelOwner(channelId)) revert OnlyCurrentChannelOwner(msg.sender);
        _;
    }

    function addContent(string calldata suffix) external onlyCurrentChannelOwner nonReentrant returns (uint256) {
        return _addContent(suffix, 0);
    }

    function addContentBatch(string[] calldata suffixes) external onlyCurrentChannelOwner nonReentrant {
        for (uint256 i = 0; i < suffixes.length; i++) _addContent(suffixes[i], i);
    }

    function claim(uint256 contentId) external nonReentrant { _claim(msg.sender, contentId); }
    function claimBatch(uint256[] calldata ids) external nonReentrant {
        for (uint256 i = 0; i < ids.length; i++) _claim(msg.sender, ids[i]);
    }
    function getContentIds() external view returns (uint256[] memory) { return contentIds; }

    function _addContent(string calldata suffix, uint256 index) private returns (uint256 contentId) {
        if (bytes(suffix).length == 0) revert EmptyContentSuffix(index);
        string memory canonicalId = string.concat(channelCanonicalId, contentIdSeparator, suffix);
        contentId = uint256(keccak256(bytes(canonicalId)));
        if (contentId == 0) revert InvalidContentId();
        if (contentIdAdded[contentId]) revert ContentTokenAlreadyAdded(contentId);
        contentIdAdded[contentId] = true;
        contentCanonicalId[contentId] = canonicalId;
        contentIds.push(contentId);
        contentRegistry.registerContent(contentId, sourceProspectiveContract, canonicalId);
        emit ContentMaterialized(contentId, canonicalId);
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override {
        if (from != address(0) && to != address(0)) revert NonTransferableContentToken();
        super._update(from, to, ids, values);
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
