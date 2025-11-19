// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Context.sol";

/**
 * @title ERC1155Marketplace
 * @dev A simple orderbook for ERC1155 tokens.
 * Users can list tokens for sale and buy tokens (in exchange for ETH).
 */
contract ERC1155Marketplace is Context, ERC1155Holder, ReentrancyGuard {
    struct SaleListing {
        address seller;
        uint256 tokenId;
        uint256 count;
        uint256 pricePerToken;
    }
    struct BuyOrder {
        address buyer;
        uint256 tokenId;
        uint256 count;
        uint256 pricePerToken;
    }

    IERC1155 public _erc1155; // AAA could this be marked as immutable or something?
    mapping(uint256 => SaleListing) private _saleListings;
    mapping(uint256 => BuyOrder) private _buyOrders;
    uint256 private _nextSaleListingId;
    uint256 private _nextBuyOrderId;

    // Useful for building an offchain mapping, so we can find
    // a/the marketplace contract for a given ERC1155 contract.
    event ERC1155MarketplaceCreated(address indexed erc1155);
    
    event SaleListingCreated(uint256 indexed saleListingId, address indexed seller, uint256 tokenId, uint256 count, uint256 pricePerToken);
    event SaleListingFulfilled(uint256 indexed saleListingId, address indexed buyer, uint256 count);
    event SaleListingCancelled(uint256 indexed saleListingId);
    event BuyOrderCreated(uint256 indexed buyOrderId, address indexed buyer, uint256 tokenId, uint256 count, uint256 pricePerToken);
    event BuyOrderFulfilled(uint256 indexed buyOrderId, address indexed seller, uint256 count);
    event BuyOrderCancelled(uint256 indexed buyOrderId);

    constructor(address erc1155Address) {
        _erc1155 = IERC1155(erc1155Address);
        emit ERC1155MarketplaceCreated(erc1155Address);
    }

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

    function erc1155() external view returns (IERC1155) {
        return _erc1155;
    }

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