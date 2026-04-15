//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

/**
 * @title ERC1155PrimaryMarket
 * @notice Primary market mechanism for ERC1155 tokens - buy from contract at fixed prices
 * @dev Contract holds tokens and sells them at fixed prices, with optional refunds.
 *      Subclasses define when buying and refunds are allowed through virtual functions.
 *      This is an abstract contract that must be implemented by a concrete contract.
 */
abstract contract ERC1155PrimaryMarket is ReentrancyGuard, ERC1155Holder {
    using SafeERC20 for IERC20;

    error ZeroAddress();

    /**
     * @notice Emitted when ERC1155 tokens are offered for sale at a specific price
     * @param erc1155Addr The address of the ERC1155 token contract
     * @param id The token ID being offered
     * @param price The price per token in wei
     */
    event ERC1155Offered(
        address indexed erc1155Addr,
        uint256 id,
        uint256 price
    );

    /**
     * @notice Emitted when ERC1155 tokens are bought from this contract
     * @param participant The address of the buyer
     * @param erc1155Addr The address of the ERC1155 token contract
     * @param totalCost The total cost in wei for all tokens
     * @param ids Array of token IDs purchased
     * @param counts Array of token counts purchased
     */
    event ERC1155Bought(
        address indexed participant,
        address indexed erc1155Addr,
        uint256 totalCost,
        uint256[] ids,
        uint256[] counts
    );

    /**
     * @notice Emitted when ERC1155 tokens are sold back to this contract for a refund
     * @param participant The address of the seller
     * @param erc1155Addr The address of the ERC1155 token contract
     * @param totalCost The total refund amount in wei
     * @param ids Array of token IDs refunded
     * @param counts Array of token counts refunded
     */
    event ERC1155Sold(
        address indexed participant,
        address indexed erc1155Addr,
        uint256 totalCost,
        uint256[] ids,
        uint256[] counts
    );

    /**
     * @notice Virtual function to check if buying is currently allowed
     * @dev Must be implemented by concrete contract to define buying conditions
     */
    function requireBuyingAllowed() internal view virtual;

    /**
     * @notice Virtual function to check if refunds are currently allowed
     * @dev Must be implemented by concrete contract to define refund conditions
     */
    function requireRefundsAllowed() internal view virtual;

    /**
     * @notice Virtual function to get the price of a specific ERC1155 token
     * @param erc1155Addr The address of the ERC1155 token contract
     * @param id The token ID to get the price for
     * @return The price per token in units of the settlement token
     */
    function erc1155Price(
        address erc1155Addr,
        uint256 id
    ) internal view virtual returns (uint256);

    /**
     * @notice Virtual function to get the settlement token used by this market
     * @return The ERC-20 token address
     */
    function settlementToken() internal view virtual returns (address);

    /**
     * @notice Virtual function to get the total value received so far
     * @return The total amount of settlement-token value received
     */
    function getTotalReceivedValue() internal view virtual returns (uint256);

    /**
     * @notice Virtual function to set the total value received
     * @param value The new total received value
     */
    function setTotalReceivedValue(uint256 value) internal virtual;

    /**
     * @notice Calculates the total cost for multiple ERC1155 tokens
     * @param erc1155Addr The address of the ERC1155 token contract
     * @param ids Array of token IDs to calculate cost for
     * @param counts Array of token counts corresponding to each ID
     * @return The total cost in units of the settlement token for all tokens
     */
    function erc1155TotalCost(
        address erc1155Addr,
        uint256[] calldata ids,
        uint256[] calldata counts
    ) private view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            total += erc1155Price(erc1155Addr, ids[i]) * counts[i];
        }
        return total;
    }

    /**
     * @notice Buys ERC1155 tokens from this contract
     * @dev Transfers tokens from this contract to the buyer after payment verification.
     *      Only callable when buying is allowed (defined by subclass).
     * @param buyer The address that will receive the tokens
     * @param erc1155Addr The address of the ERC1155 token contract
     * @param ids Array of token IDs to purchase
     * @param counts Array of token counts to purchase
     * @param data Additional data for the transfer
     */
    function buyERC1155(
        address buyer,
        address erc1155Addr,
        uint256[] calldata ids,
        uint256[] calldata counts,
        bytes calldata data
    ) external nonReentrant {
        requireBuyingAllowed();
        uint256 requiredValue = erc1155TotalCost(erc1155Addr, ids, counts);
        IERC20(settlementToken()).safeTransferFrom(
            msg.sender,
            address(this),
            requiredValue
        );
        setTotalReceivedValue(getTotalReceivedValue() + requiredValue);
        IERC1155(erc1155Addr).safeBatchTransferFrom(
            address(this),
            buyer,
            ids,
            counts,
            data
        );
        emit ERC1155Bought(buyer, erc1155Addr, requiredValue, ids, counts);
    }

    /**
     * @notice Refunds ERC1155 tokens back to this contract for settlement tokens
     * @dev Refunds are only available once the contract has entered a failed state.
     * @param holder The address that currently holds the tokens to be refunded
     * @param erc1155Addr The address of the ERC1155 token contract
     * @param ids Array of token IDs to refund
     * @param counts Array of token counts to refund
     * @param data Additional data for the transfer
     */
    function refundERC1155(
        address holder,
        address erc1155Addr,
        uint256[] calldata ids,
        uint256[] calldata counts,
        bytes calldata data
    ) external nonReentrant {
        requireRefundsAllowed();
        if (holder == address(0)) revert ZeroAddress();
        uint256 refundValue = erc1155TotalCost(erc1155Addr, ids, counts);
        setTotalReceivedValue(getTotalReceivedValue() - refundValue);
        IERC1155(erc1155Addr).safeBatchTransferFrom(
            holder,
            address(this),
            ids,
            counts,
            data
        );
        IERC20(settlementToken()).safeTransfer(holder, refundValue);
        emit ERC1155Sold(holder, erc1155Addr, refundValue, ids, counts);
    }
}
