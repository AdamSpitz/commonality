//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
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
error ForgoAmountExceedsAllowed();
error NonTransferableReimbursementClaim();

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
    ERC1155PrimaryMarket,
    ERC20
{
    using SafeERC20 for IERC20;

    /// @notice The single ERC1155 collection this contract sells / refunds.
    address public immutable erc1155Addr;

    mapping(uint256 => uint256) private _erc1155Prices;
    mapping(uint256 => bool) private _erc1155PriceIsSet;

    uint256 private _totalReceivedValue = 0;

    // Legacy contribution-basis views retained for indexers and project totals.
    // The live future claim is exposed by futureReimbursementClaims().
    uint256 public totalEarlyContributions;
    uint256 public totalRetroReceived;
    uint256 public totalReimbursementsWithdrawn;
    mapping(address => uint256) public earlyContributions;
    mapping(address => uint256) public reimbursementsWithdrawn;

    // Claims are represented as shares so a reimbursement can consume every
    // holder's claim pro rata without iterating over all holders. Account state
    // is checkpointed lazily when that account next interacts.
    uint256 private constant REIMBURSEMENT_PER_SHARE_SCALE = 1e36;
    uint256 public accumulatedReimbursementPerClaimShare;
    mapping(address => uint256) private _reimbursementPerShareCheckpoint;
    mapping(address => uint256) private _withdrawableReimbursements;

    event RetroactiveDonationReceived(address indexed donor, uint256 amount);
    event ReimbursementWithdrawn(address indexed contributor, uint256 amount);
    event ReimbursementForgone(address indexed contributor, uint256 amount);

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
    ) Ownable(owner)
      AssuranceContract(recipient, _paymentToken)
      ERC20("Commonality Future Reimbursement Claim", "CFRC") {
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
        return withdrawableReimbursements(contributor);
    }

    /** @notice The caller's remaining, not-yet-earned at-cost claim. */
    function futureReimbursementClaims(address contributor) public view returns (uint256) {
        uint256 totalShares = totalSupply();
        if (totalShares == 0) return 0;
        return Math.mulDiv(
            balanceOf(contributor),
            outstandingReimbursementTotal(),
            totalShares
        );
    }

    /** @notice Reimbursement already earned by an account and available to withdraw. */
    function withdrawableReimbursements(address contributor) public view returns (uint256) {
        uint256 newlyEarned = Math.mulDiv(
            balanceOf(contributor),
            accumulatedReimbursementPerClaimShare - _reimbursementPerShareCheckpoint[contributor],
            REIMBURSEMENT_PER_SHARE_SCALE
        );
        return _withdrawableReimbursements[contributor] + newlyEarned;
    }

    /**
     * @dev `nonReentrant` here (and on {withdrawReimbursement} and
     *      {forgoReimbursement}) is cross-function protection, not self-
     *      protection. The concrete surface it was added for is gone —
     *      {donateNormallyERC1155} no longer records a contribution basis it
     *      then has to take back, so the ERC1155 mint callback no longer
     *      observes a basis mid-correction. These modifiers are the second
     *      layer: any future path that mutates reimbursement state after an
     *      external call is contained by default rather than relying on
     *      whoever writes it to notice.
     */
    function donateRetroactive(uint256 amount) external nonReentrant {
        requireAssuranceContractHasSucceeded();
        if (amount > outstandingReimbursementTotal()) revert RetroactiveDonationExceedsOutstandingReimbursement();
        if (amount == 0 || totalSupply() == 0) {
            revert RetroactiveDonationExceedsOutstandingReimbursement();
        }
        accumulatedReimbursementPerClaimShare += Math.mulDiv(
            amount,
            REIMBURSEMENT_PER_SHARE_SCALE,
            totalSupply()
        );
        totalRetroReceived += amount;
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);
        emit RetroactiveDonationReceived(msg.sender, amount);
    }

    function withdrawReimbursement() external nonReentrant {
        _withdrawReimbursement(msg.sender, reimbursableAmount(msg.sender));
    }

    /**
     * @notice Withdraw part of the caller's available reimbursement to a chosen recipient.
     * @dev The reimbursement claim always remains attributed to `msg.sender`; choosing a
     *      recipient cannot transfer or enlarge it. This lets custody contracts return
     *      reimbursement to the same internal account that funded the contribution.
     */
    function withdrawReimbursementTo(address recipientAddress, uint256 amount) external nonReentrant {
        if (recipientAddress == address(0) || amount > reimbursableAmount(msg.sender)) {
            revert NoReimbursementAvailable();
        }
        _withdrawReimbursement(recipientAddress, amount);
    }

    function _withdrawReimbursement(address recipientAddress, uint256 amount) internal {
        _checkpointReimbursement(msg.sender);
        if (amount == 0 || amount > _withdrawableReimbursements[msg.sender]) {
            revert NoReimbursementAvailable();
        }
        _withdrawableReimbursements[msg.sender] -= amount;
        reimbursementsWithdrawn[msg.sender] += amount;
        totalReimbursementsWithdrawn += amount;
        IERC20(paymentToken).safeTransfer(recipientAddress, amount);
        emit ReimbursementWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Permanently give up part (or all) of your reimbursement claim,
     *         turning that portion of your early contribution into a pure,
     *         non-recoverable donation to the project.
     * @dev Reimbursement already earned is checkpointed first and remains
     *      withdrawable by this contributor. Only claim shares representing the
     *      requested amount of future reimbursement are burned. The global
     *      contribution basis falls by the same amount, preserving the at-cost
     *      cap without reallocating previously earned money.
     *
     *      This is the after-the-fact route. To contribute without ever taking
     *      a claim in the first place, see {donateNormallyERC1155}, which
     *      reaches the same end state without routing through here.
     */
    function forgoReimbursement(uint256 amount) external nonReentrant {
        _forgoReimbursement(msg.sender, amount);
    }

    /**
     * @notice Contribute without acquiring a reimbursement claim, while keeping
     *         the recognition receipt.
     * @dev Buys with the contribution basis never recorded, rather than
     *      recording it and forgoing it back. The two are equivalent in their
     *      end state — `T` is unchanged either way, and the emitted event
     *      stream (`ERC1155Bought` then `ReimbursementForgone` for the same
     *      value) is identical, so indexers cannot tell them apart — but only
     *      this one keeps the ERC1155 mint callback from observing a
     *      momentarily inflated basis, which was a cross-function reentrancy
     *      surface. The claim belongs to `buyer`, even when another address
     *      pays on their behalf.
     *
     *      `ReimbursementForgone` is emitted here rather than by
     *      {_forgoReimbursement}: from outside, the buyer did give up the claim
     *      their purchase would otherwise have earned.
     *
     *      Slither's `reentrancy-no-eth` detector flags this intermittently: it
     *      sees the `_buyERC1155` external call preceding state writes, but does
     *      not model `nonReentrant` through the modifier, and the basis this
     *      function never records is precisely the cross-function surface the
     *      detector is worried about. Suppressed rather than allowlisted so the
     *      reasoning sits next to the code; re-examine if the guard or the
     *      never-record property here ever changes.
     */
    // slither-disable-next-line reentrancy-no-eth
    function donateNormallyERC1155(
        address buyer,
        address _erc1155Addr,
        uint256[] calldata ids,
        uint256[] calldata counts,
        bytes calldata data
    ) external nonReentrant {
        uint256 amount = _buyERC1155(buyer, _erc1155Addr, ids, counts, data, false);
        // Preserves the zero-amount rejection that the forgo path used to give.
        if (amount == 0) revert ForgoAmountExceedsAllowed();
        emit ReimbursementForgone(buyer, amount);
    }

    function _forgoReimbursement(address contributorAddress, uint256 amount) internal {
        _checkpointReimbursement(contributorAddress);
        uint256 claim = futureReimbursementClaims(contributorAddress);
        if (amount == 0 || amount > claim) {
            revert ForgoAmountExceedsAllowed();
        }

        uint256 holderShares = balanceOf(contributorAddress);
        uint256 sharesToBurn = amount == claim
            ? holderShares
            : Math.mulDiv(
                amount,
                totalSupply(),
                outstandingReimbursementTotal(),
                Math.Rounding.Ceil
            );
        if (sharesToBurn > holderShares) revert ForgoAmountExceedsAllowed();
        _burn(contributorAddress, sharesToBurn);
        earlyContributions[contributorAddress] -= amount;
        totalEarlyContributions -= amount;
        emit ReimbursementForgone(contributorAddress, amount);
    }

    function recordPrimaryPurchase(address buyer, uint256 value) internal override {
        _checkpointReimbursement(buyer);
        uint256 outstanding = outstandingReimbursementTotal();
        uint256 newShares = totalSupply() == 0 || outstanding == 0
            ? value
            : Math.mulDiv(
                value,
                totalSupply(),
                outstanding,
                Math.Rounding.Ceil
            );
        _mint(buyer, newShares);
        earlyContributions[buyer] += value;
        totalEarlyContributions += value;
    }

    function recordPrimaryRefund(address holder, uint256 value) internal override {
        // A contributor may have already forgone part of their reimbursement
        // basis (see {forgoReimbursement}), so their tracked contribution can be
        // smaller than the token value being refunded. Refund-on-failure is a
        // token-backed right independent of the reimbursement basis, so clamp
        // rather than underflow. (Refunds and retro reimbursement never coexist:
        // refunds require failure, donateRetroactive requires success.)
        uint256 tracked = earlyContributions[holder];
        uint256 reduction = value < tracked ? value : tracked;
        if (reduction > 0) _forgoReimbursement(holder, reduction);
    }

    function _checkpointReimbursement(address contributor) internal {
        uint256 checkpoint = _reimbursementPerShareCheckpoint[contributor];
        uint256 current = accumulatedReimbursementPerClaimShare;
        if (current != checkpoint) {
            _withdrawableReimbursements[contributor] += Math.mulDiv(
                balanceOf(contributor),
                current - checkpoint,
                REIMBURSEMENT_PER_SHARE_SCALE
            );
            _reimbursementPerShareCheckpoint[contributor] = current;
        }
    }

    /** @notice ERC-20 claim-share balance, named for reimbursement-domain callers. */
    function futureReimbursementClaimShares(address contributor) external view returns (uint256) {
        return balanceOf(contributor);
    }

    function totalFutureReimbursementClaimShares() external view returns (uint256) {
        return totalSupply();
    }

    /**
     * @dev Checkpointing is deliberately transfer-ready, but holder-to-holder
     *      movement remains prohibited by the accepted reimbursement-only legal
     *      posture. Removing the revert requires a separate legal/product decision.
     */
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0)) _checkpointReimbursement(from);
        if (to != address(0) && to != from) _checkpointReimbursement(to);
        if (from != address(0) && to != address(0)) {
            revert NonTransferableReimbursementClaim();
        }
        super._update(from, to, value);
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
