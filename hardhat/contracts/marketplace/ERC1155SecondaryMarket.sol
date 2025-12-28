// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Context.sol";

/**
 * @title ERC1155SecondaryMarket
 * @notice A simple orderbook marketplace for ERC1155 tokens
 * @dev Users can create sale listings (ask orders) and buy orders (bid orders).
 *      Supports partial fulfillment of orders. All trades settle in ETH.
 *      Each marketplace instance is tied to a specific ERC1155 contract.
 */
contract ERC1155SecondaryMarket is Context, ERC1155Holder, ReentrancyGuard {
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
    event SaleListingCreated(uint256 indexed saleListingId, address indexed seller, uint256 tokenId, uint256 count, uint256 pricePerToken);

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
    event BuyOrderCreated(uint256 indexed buyOrderId, address indexed buyer, uint256 tokenId, uint256 count, uint256 pricePerToken);

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
        require(count > 0, "Count must be greater than 0");
        require(pricePerToken > 0, "Price must be greater than 0");

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

    /**
     * @notice Fulfills a sale listing by purchasing tokens
     * @dev Sends ETH to seller and tokens to buyer. Partial fulfillment is supported.
     * @param saleListingId The ID of the sale listing to fulfill
     * @param count The number of tokens to purchase
     */
    function fulfillSaleListing(uint256 saleListingId, uint256 count) external payable nonReentrant {
        address buyer = _msgSender();
        _fulfillSaleListingInternal(saleListingId, count, buyer);
    }

    /**
     * @dev Fulfill a sale listing and send the purchased tokens to a specified recipient.
     * This is useful for contracts that want to purchase tokens on behalf of users.
     * @param saleListingId The ID of the sale listing to fulfill
     * @param count The number of tokens to purchase
     * @param recipient The address to receive the purchased tokens
     */
    function fulfillSaleListingTo(
        uint256 saleListingId,
        uint256 count,
        address recipient
    ) external payable nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        _fulfillSaleListingInternal(saleListingId, count, recipient);
    }

    /**
     * @notice Internal function to fulfill a sale listing
     * @dev Handles the core logic of fulfilling a sale listing
     * @param saleListingId The ID of the sale listing to fulfill
     * @param count The number of tokens to purchase
     * @param recipient The address to receive the purchased tokens
     */
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
        require(seller != address(0), "Listing does not exist");
        require(count > 0 && count <= listingCount, "Invalid count");
        require(msg.value == totalCost, "Incorrect payment");

        address buyer = _msgSender();

        // Update listing
        uint256 remaining = listingCount - count;
        if (remaining == 0) {
            delete _saleListings[saleListingId];
        } else {
            listing.count = remaining;
        }

        // Transfer payment from this contract (which just received
        // payment; note that this function is payable) to seller
        payable(seller).transfer(totalCost);

        _erc1155.safeTransferFrom(
            address(this),
            recipient,
            tokenId,
            count,
            "0x"
        );

        emit SaleListingFulfilled(saleListingId, buyer, count);
    }

    /**
     * @notice Cancels a sale listing and returns tokens to the seller
     * @dev Only the seller can cancel their own listing
     * @param saleListingId The ID of the sale listing to cancel
     */
    function cancelSaleListing(uint256 saleListingId) external nonReentrant {
        SaleListing storage listing = _saleListings[saleListingId];
        address seller = listing.seller;
        uint256 tokenId = listing.tokenId;
        uint256 count = listing.count;
        require(seller != address(0), "Listing does not exist");
        require(seller == _msgSender(), "Not the seller");

        delete _saleListings[saleListingId];

        // Transfer tokens from this contract back to seller
        _erc1155.safeTransferFrom(
            address(this),
            seller,
            tokenId,
            count,
            "0x"
        );

        emit SaleListingCancelled(saleListingId);
    }

    /**
     * @notice Creates a new buy order for ERC1155 tokens
     * @dev ETH is escrowed in this contract until the order is fulfilled or cancelled.
     *      Only the buyer can cancel the order.
     * @param tokenId The ERC1155 token ID to buy
     * @param count The number of tokens to buy
     * @param pricePerToken The price per token in wei
     */
    function createBuyOrder(
        uint256 tokenId,
        uint256 count,
        uint256 pricePerToken
    ) external payable nonReentrant {
        require(count > 0, "Amount must be greater than 0");
        require(pricePerToken > 0, "Must send ETH");
        require(msg.value == count * pricePerToken, "Incorrect amount of ETH sent");

        address buyer = _msgSender();

        // Note that this function is payable, so we received
        // the ETH here.
        
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

    /**
     * @notice Fulfills a buy order by selling tokens to the buyer
     * @dev Sellers call this to sell their tokens to the buyer at the specified price.
     *      Partial fulfillment is supported.
     * @param buyOrderId The ID of the buy order to fulfill
     * @param count The number of tokens to sell
     */
    function fulfillBuyOrder(uint256 buyOrderId, uint256 count) external nonReentrant {
        BuyOrder storage order = _buyOrders[buyOrderId];
        address buyer = order.buyer;
        uint256 tokenId = order.tokenId;
        uint256 pricePerToken = order.pricePerToken;
        uint256 orderCount = order.count;
        uint256 totalCost = count * pricePerToken;
        require(buyer != address(0), "Order does not exist");
        require(count > 0 && count <= orderCount, "Invalid count");

        address seller = _msgSender();

        // Update order
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

        // Transfer payment to seller; note that we received
        // the ETH when the buy order was created.
        payable(seller).transfer(totalCost);

        emit BuyOrderFulfilled(buyOrderId, seller, count);
    }

    /**
     * @notice Cancels a buy order and refunds the buyer
     * @dev Only the buyer can cancel their own order
     * @param buyOrderId The ID of the buy order to cancel
     */
    function cancelBuyOrder(uint256 buyOrderId) external nonReentrant {
        BuyOrder storage order = _buyOrders[buyOrderId];
        address buyer = order.buyer;
        uint256 pricePerToken = order.pricePerToken;
        uint256 count = order.count;
        uint256 refund = count * pricePerToken;
        require(buyer == _msgSender(), "Not the buyer");

        delete _buyOrders[buyOrderId];
        
        payable(buyer).transfer(refund);

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
     * @return seller The address of the seller
     * @return tokenId The ERC1155 token ID
     * @return count The number of tokens available
     * @return pricePerToken The price per token in wei
     */
    function getSaleListing(uint256 saleListingId) external view returns (
        address seller,
        uint256 tokenId,
        uint256 count,
        uint256 pricePerToken
    ) {
        SaleListing storage listing = _saleListings[saleListingId];
        return (
            listing.seller,
            listing.tokenId,
            listing.count,
            listing.pricePerToken
        );
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
