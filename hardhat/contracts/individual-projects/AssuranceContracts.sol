//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ContractMetadata} from "../utils/ContractMetadata.sol";
import {ERC1155PrimaryMarket} from "./ERC1155PrimaryMarket.sol";
import {AssuranceContract} from "./AssuranceContract.sol";
import {IAssuranceCondition} from "./IAssuranceCondition.sol";

error ArrayLengthMismatch();
error PriceAlreadySet();
error PriceNotSet();
error UnsupportedERC1155();
error InvalidERC1155Address();
error NoReimbursementAvailable();
error RetroactiveDonationExceedsOutstandingReimbursement();

/**
 * @title MultiERC1155AssuranceContract
 * @notice Combines assurance contract with ERC1155 token sales
 * @dev Holds pre-minted ERC1155 tokens of a single, fixed ERC1155 collection
 *      (locked at construction) and sells them at fixed prices.
 *      Tracks total received value to measure funding progress.
 *      Refunds only allowed if project failed.
 *      Implements AssuranceContract, ContractMetadata, and ERC1155PrimaryMarket.
 */
contract MultiERC1155AssuranceContract is
    Ownable,
    ContractMetadata,
    AssuranceContract,
    ERC1155PrimaryMarket
{
    using SafeERC20 for IERC20;

    /// @notice The single ERC1155 collection this contract sells / refunds.
    address public immutable erc1155Addr;

    mapping(uint256 => uint256) private _erc1155Prices;
    mapping(uint256 => bool) private _erc1155PriceIsSet;

    uint256 private _totalReceivedValue = 0;

    uint256 public totalEarlyContributions;
    uint256 public totalRetroReceived;
    uint256 public totalReimbursementsWithdrawn;
    mapping(address => uint256) public earlyContributions;
    mapping(address => uint256) public reimbursementsWithdrawn;

    event RetroactiveDonationReceived(address indexed donor, uint256 amount);
    event ReimbursementWithdrawn(address indexed contributor, uint256 amount);

    /**
     * @notice Initializes the multi-ERC1155 assurance contract
     * @param owner The owner of the contract who can set prices and manage the contract
     * @param recipient The address that will receive funds if the project succeeds
     * @param _paymentToken The ERC-20 token used for payments / refunds / withdrawals
     * @param _erc1155Addr The single ERC1155 collection this contract sells
     * @param projectMetadataCid The IPFS CID containing project metadata
     */
    constructor(
        address owner,
        address recipient,
        address _paymentToken,
        address _erc1155Addr,
        string memory projectMetadataCid
    ) Ownable(owner) AssuranceContract(recipient, _paymentToken) {
        if (_erc1155Addr == address(0)) revert InvalidERC1155Address();
        erc1155Addr = _erc1155Addr;
        // no reason to validate the CID, plus we can't really anyway
        emit ContractMetadataUpdated(projectMetadataCid);
    }

    /**
     * @notice Sets the condition contract for this assurance contract (one-time, owner-only)
     * @param condition The IAssuranceCondition that determines success/failure
     */
    function setCondition(IAssuranceCondition condition) external onlyOwner {
        _setCondition(condition);
    }

    /**
     * @notice Sets prices for ERC1155 token IDs on the configured ERC1155 collection
     * @dev Prices cannot be modified once set. Only callable by owner.
     *      Setting a price of 0 is allowed and treated as "set to zero" (the
     *      separate `_erc1155PriceIsSet` flag prevents later overwrite).
     * @param ids Array of token IDs to set prices for
     * @param prices Array of prices corresponding to each token ID
     */
    function setPricesERC1155(
        uint256[] memory ids,
        uint256[] memory prices
    ) external onlyOwner {
        if (ids.length != prices.length) revert ArrayLengthMismatch();
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            if (_erc1155PriceIsSet[id]) revert PriceAlreadySet();
            _erc1155Prices[id] = prices[i];
            _erc1155PriceIsSet[id] = true;
            emit ERC1155Offered(erc1155Addr, id, prices[i]);
        }
    }

    /**
     * @notice Returns the current funding progress
     */
    function getAssuranceContractProgress()
        public
        view
        override
        returns (uint256)
    {
        return _totalReceivedValue;
    }

    /**
     * @notice Returns the price for a specific ERC1155 token
     * @dev Reverts if `_erc1155Addr` is not the configured collection or if no
     *      price has been set for `id`.
     */
    function erc1155Price(
        address _erc1155Addr,
        uint256 id
    ) internal view override returns (uint256) {
        if (_erc1155Addr != erc1155Addr) revert UnsupportedERC1155();
        if (!_erc1155PriceIsSet[id]) revert PriceNotSet();
        return _erc1155Prices[id];
    }

    function getTotalReceivedValue() internal view override returns (uint256) {
        return _totalReceivedValue;
    }

    function outstandingReimbursementTotal() public view returns (uint256) {
        return totalEarlyContributions - totalRetroReceived;
    }

    function reimbursableAmount(address contributor) public view returns (uint256) {
        if (totalEarlyContributions == 0) return 0;
        uint256 earned = earlyContributions[contributor] * totalRetroReceived / totalEarlyContributions;
        return earned - reimbursementsWithdrawn[contributor];
    }

    function donateRetroactive(uint256 amount) external {
        requireAssuranceContractHasSucceeded();
        if (amount > outstandingReimbursementTotal()) revert RetroactiveDonationExceedsOutstandingReimbursement();
        totalRetroReceived += amount;
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);
        emit RetroactiveDonationReceived(msg.sender, amount);
    }

    function withdrawReimbursement() external {
        uint256 amount = reimbursableAmount(msg.sender);
        if (amount == 0) revert NoReimbursementAvailable();
        reimbursementsWithdrawn[msg.sender] += amount;
        totalReimbursementsWithdrawn += amount;
        IERC20(paymentToken).safeTransfer(msg.sender, amount);
        emit ReimbursementWithdrawn(msg.sender, amount);
    }

    function recordPrimaryPurchase(address buyer, uint256 value) internal override {
        earlyContributions[buyer] += value;
        totalEarlyContributions += value;
    }

    function recordPrimaryRefund(address holder, uint256 value) internal override {
        earlyContributions[holder] -= value;
        totalEarlyContributions -= value;
    }

    function withdrawableRecipientBalance() internal view override returns (uint256) {
        uint256 balance = IERC20(paymentToken).balanceOf(address(this));
        uint256 reservedReimbursements = totalRetroReceived - totalReimbursementsWithdrawn;
        return balance > reservedReimbursements ? balance - reservedReimbursements : 0;
    }

    function settlementToken() internal view override returns (address) {
        return paymentToken;
    }

    function setTotalReceivedValue(uint256 value) internal override {
        _totalReceivedValue = value;
    }

    /**
     * @inheritdoc ERC1155PrimaryMarket
     * @dev Buying is disabled once the assurance contract has failed
     */
    function requireBuyingAllowed() internal view override {
        requireAssuranceContractHasNotFailed();
    }

    /**
     * @notice Checks if refunds are allowed
     * @dev Refunds are only allowed if the assurance contract has failed
     */
    function requireRefundsAllowed() internal view override {
        requireAssuranceContractHasFailed();
    }
}
