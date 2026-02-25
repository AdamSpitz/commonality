// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

/**
 * @title ERC1155SecondaryMarket
 * @notice A simple orderbook marketplace for ERC1155 tokens
 * @dev Users can create sale listings (ask orders) and buy orders (bid orders).
 *      Supports partial fulfillment of orders. All trades settle in ETH.
 *      Each marketplace instance is tied to a specific ERC1155 contract.
 */
contract ERC1155SecondaryMarket is Context, ERC1155Holder, ReentrancyGuard {

    error CountMustBeGreaterThanZero();
    error PriceMustBeGreaterThanZero();
    error InvalidRecipient();
    error ListingDoesNotExist();
    error InvalidCount();
    error IncorrectPayment();
    error ETHTransferFailed();
    error NotTheSeller();
    error NotTheBuyer();
    error AmountMustBeGreaterThanZero2();
    error MustSendETH();
    error IncorrectAmountOfETHSent();
    error OrderDoesNotExist();

    /**
     * @dev Structure representing a sale listing (ask order)
     */
    struct SaleListing {
        address seller;        // Address of the seller
        uint256 tokenId;      // ERC1155 token ID being sold
        uint256 count;        // Number of tokens available for sale
        uint256 pricePerToken; // Price per token in wei
    }

    /**
     * @dev Structure representing a buy order (bid order)
     */
    struct BuyOrder {
        address buyer;         // Address of the buyer
        uint256 tokenId;       // ERC1155 token ID being bought
        uint256 count;         // Number of tokens wanted
        uint256 pricePerToken; // Price per token in wei
    }

    IERC1155 public immutable _erc1155;
    mapping(uint256 => SaleListing) private _saleListings;
    mapping(uint256 => BuyOrder) private _buyOrders;
    uint256 private _nextSaleListingId;
    uint256 private _nextBuyOrderId;

    /**
     * @notice Emitted when a new marketplace contract is created
     * @param erc1155 The address of the ERC1155 token contract this marketplace serves
     */
    event ERC1155SecondaryMarketCreated(address indexed erc1155);
    
    /**
     * @notice Emitted when a new sale listing is created
     * @param saleListingId The ID of the new sale listing
     * @param seller The address of the seller
     * @param tokenId The ERC1155 token ID being sold
     * @param count The number of tokens available for sale
     * @param pricePerToken The price per token in wei
     */
    event SaleListingCreated(
        uint256 indexed saleListingId,
        address indexed seller,
        uint256 tokenId,
        uint256 count,
        uint256 pricePerToken
    );

    /**
     * @notice Emitted when a sale listing is fulfilled (partially or fully)
     * @param saleListingId The ID of the sale listing
     * @param buyer The address of the buyer
     * @param count The number of tokens purchased
     */
    event SaleListingFulfilled(uint256 indexed saleListingId, address indexed buyer, uint256 count);

    /**
     * @notice Emitted when a sale listing is cancelled
     * @param saleListingId The ID of the cancelled sale listing
     */
    event SaleListingCancelled(uint256 indexed saleListingId);

    /**
     * @notice Emitted when a new buy order is created
     * @param buyOrderId The ID of the new buy order
     * @param buyer The address of the buyer
     * @param tokenId The ERC1155 token ID being bought
     * @param count The number of tokens wanted
     * @param pricePerToken The price per token in wei
     */
    event BuyOrderCreated(
        uint256 indexed buyOrderId,
        address indexed buyer,
        uint256 tokenId,
        uint256 count,
        uint256 pricePerToken
    );

    /**
     * @notice Emitted when a buy order is fulfilled (partially or fully)
     * @param buyOrderId The ID of the buy order
     * @param seller The address of the seller
     * @param count The number of tokens sold
     */
    event BuyOrderFulfilled(uint256 indexed buyOrderId, address indexed seller, uint256 count);

    /**
     * @notice Emitted when a buy order is cancelled
     * @param buyOrderId The ID of the cancelled buy order
     */
    event BuyOrderCancelled(uint256 indexed buyOrderId);

    /**
     * @notice Initializes the marketplace for a specific ERC1155 token
     * @param erc1155Address The address of the ERC1155 token contract this marketplace will serve
     */
    constructor(address erc1155Address) {
        _erc1155 = IERC1155(erc1155Address);
        emit ERC1155SecondaryMarketCreated(erc1155Address);
    }

    /**
     * @notice Creates a new sale listing for ERC1155 tokens
     * @dev Tokens are transferred to this contract and held in escrow until sold.
     *      Only the seller can cancel the listing.
     * @param tokenId The ERC1155 token ID to list for sale
     * @param count The number of tokens to list for sale
     * @param pricePerToken The price per token in wei
     */
    function createSaleListing(
        uint256 tokenId,
        uint256 count,
        uint256 pricePerToken
    ) external nonReentrant {
        if (count == 0) revert CountMustBeGreaterThanZero();
        if (pricePerToken == 0) revert PriceMustBeGreaterThanZero();

        address seller = _msgSender();

        uint256 saleListingId = _nextSaleListingId;
        _nextSaleListingId++;
        _saleListings[saleListingId] = SaleListing({
            seller: seller,
            tokenId: tokenId,
            count: count,
            pricePerToken: pricePerToken
        });

        _erc1155.safeTransferFrom(
            seller,
            address(this),
            tokenId,
            count,
            "0x"
        );

        emit SaleListingCreated(saleListingId, seller, tokenId, count, pricePerToken);
    }

    function fulfillSaleListing(uint256 saleListingId, uint256 count) external payable nonReentrant {
        address buyer = _msgSender();
        _fulfillSaleListingInternal(saleListingId, count, buyer);
    }

    function fulfillSaleListingTo(
        uint256 saleListingId,
        uint256 count,
        address recipient
    ) external payable nonReentrant {
        if (recipient == address(0)) revert InvalidRecipient();
        _fulfillSaleListingInternal(saleListingId, count, recipient);
    }

    function _fulfillSaleListingInternal(
        uint256 saleListingId,
        uint256 count,
        address recipient
    ) private {
        SaleListing storage listing = _saleListings[saleListingId];
        address seller = listing.seller;
        uint256 tokenId = listing.tokenId;
        uint256 listingCount = listing.count;
        uint256 pricePerToken = listing.pricePerToken;
        uint256 totalCost = count * pricePerToken;
        if (seller == address(0)) revert ListingDoesNotExist();
        if (count == 0 || count > listingCount) revert InvalidCount();
        if (msg.value != totalCost) revert IncorrectPayment();

        address buyer = _msgSender();

        uint256 remaining = listingCount - count;
        if (remaining == 0) {
            delete _saleListings[saleListingId];
        } else {
            listing.count = remaining;
        }

        (bool success, ) = payable(seller).call{value: totalCost}("");
        if (!success) revert ETHTransferFailed();

        _erc1155.safeTransferFrom(
            address(this),
            recipient,
            tokenId,
            count,
            "0x"
        );

        emit SaleListingFulfilled(saleListingId, buyer, count);
    }

    function cancelSaleListing(uint256 saleListingId) external nonReentrant {
        SaleListing storage listing = _saleListings[saleListingId];
        address seller = listing.seller;
        uint256 tokenId = listing.tokenId;
        uint256 count = listing.count;
        if (seller == address(0)) revert ListingDoesNotExist();
        if (seller != _msgSender()) revert NotTheSeller();

        delete _saleListings[saleListingId];

        _erc1155.safeTransferFrom(
            address(this),
            seller,
            tokenId,
            count,
            "0x"
        );

        emit SaleListingCancelled(saleListingId);
    }

    function createBuyOrder(
        uint256 tokenId,
        uint256 count,
        uint256 pricePerToken
    ) external payable nonReentrant {
        if (count == 0) revert AmountMustBeGreaterThanZero2();
        if (pricePerToken == 0) revert MustSendETH();
        if (msg.value != count * pricePerToken) revert IncorrectAmountOfETHSent();

        address buyer = _msgSender();

        uint256 buyOrderId = _nextBuyOrderId;
        _nextBuyOrderId++;
        _buyOrders[buyOrderId] = BuyOrder({
            buyer: buyer,
            tokenId: tokenId,
            count: count,
            pricePerToken: pricePerToken
        });

        emit BuyOrderCreated(buyOrderId, buyer, tokenId, count, pricePerToken);
    }

    function fulfillBuyOrder(uint256 buyOrderId, uint256 count) external nonReentrant {
        BuyOrder storage order = _buyOrders[buyOrderId];
        address buyer = order.buyer;
        uint256 tokenId = order.tokenId;
        uint256 pricePerToken = order.pricePerToken;
        uint256 orderCount = order.count;
        uint256 totalCost = count * pricePerToken;
        if (buyer == address(0)) revert OrderDoesNotExist();
        if (count == 0 || count > orderCount) revert InvalidCount();

        address seller = _msgSender();

        uint256 remaining = orderCount - count;
        if (remaining == 0) {
            delete _buyOrders[buyOrderId];
        } else {
            order.count = remaining;
        }

        _erc1155.safeTransferFrom(
            seller,
            buyer,
            tokenId,
            count,
            "0x"
        );

        (bool success, ) = payable(seller).call{value: totalCost}("");
        if (!success) revert ETHTransferFailed();

        emit BuyOrderFulfilled(buyOrderId, seller, count);
    }

    function cancelBuyOrder(uint256 buyOrderId) external nonReentrant {
        BuyOrder storage order = _buyOrders[buyOrderId];
        address buyer = order.buyer;
        uint256 pricePerToken = order.pricePerToken;
        uint256 count = order.count;
        uint256 refund = count * pricePerToken;
        if (buyer != _msgSender()) revert NotTheBuyer();

        delete _buyOrders[buyOrderId];

        (bool success, ) = payable(buyer).call{value: refund}("");
        if (!success) revert ETHTransferFailed();

        emit BuyOrderCancelled(buyOrderId);
    }

    // View functions

    /**
     * @notice Returns the ERC1155 token contract address
     * @return The ERC1155 token contract this marketplace serves
     */
    function erc1155() external view returns (IERC1155) {
        return _erc1155;
    }

    /**
     * @notice Returns the details of a sale listing
     * @param saleListingId The ID of the sale listing to query
     * @return The SaleListing struct
     */
    function getSaleListing(uint256 saleListingId) external view returns (SaleListing memory) {
        return _saleListings[saleListingId];
    }

    /**
     * @notice Returns the details of a buy order
     * @param buyOrderId The ID of the buy order to query
     * @return buyer The address of the buyer
     * @return tokenId The ERC1155 token ID
     * @return count The number of tokens wanted
     * @return pricePerToken The price per token in wei
     */
    function getBuyOrder(uint256 buyOrderId) external view returns (
        address buyer,
        uint256 tokenId,
        uint256 count,
        uint256 pricePerToken
    ) {
        BuyOrder storage order = _buyOrders[buyOrderId];
        return (
            order.buyer,
            order.tokenId,
            order.count,
            order.pricePerToken
        );
    }
}
