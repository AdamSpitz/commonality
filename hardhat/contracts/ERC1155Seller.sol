//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

/**
 * Simple buy/sell mechanism for ERC1155 tokens (not a full marketplace).
 * Contract holds tokens and sells them at fixed prices.
 * Subclasses define when buying and selling are allowed.
 */
abstract contract ERC1155Seller is ReentrancyGuard, ERC1155Holder {
    event ERC1155Offered(
        address indexed erc1155Addr,
        uint256 id,
        uint256 price
    );
    event ERC1155Bought(
        address indexed participant,
        address indexed erc1155Addr,
        uint256 totalCost,
        uint256[] ids,
        uint256[] counts
    );
    event ERC1155Sold(
        address indexed participant,
        address indexed erc1155Addr,
        uint256 totalCost,
        uint256[] ids,
        uint256[] counts
    );

    function requireBuyingAllowed() internal view virtual;

    function requireSellingAllowed() internal view virtual;

    function erc1155Price(
        address erc1155Addr,
        uint256 id
    ) internal view virtual returns (uint256);

    function getTotalReceivedValue() internal view virtual returns (uint256);

    function setTotalReceivedValue(uint256 value) internal virtual;

    function erc1155TotalCost(
        address erc1155Addr,
        uint256[] calldata ids,
        uint256[] calldata counts
    ) private view returns (uint256) {
        uint256 total = 0;
        for (uint i = 0; i < ids.length; i++) {
            total += erc1155Price(erc1155Addr, ids[i]) * counts[i];
        }
        return total;
    }

    function buyERC1155(
        address buyer,
        address erc1155Addr,
        uint256[] calldata ids,
        uint256[] calldata counts,
        bytes calldata data
    ) external payable nonReentrant {
        requireBuyingAllowed();
        uint256 requiredValue = erc1155TotalCost(erc1155Addr, ids, counts);
        require(msg.value == requiredValue, "Incorrect amount of ETH sent");
        setTotalReceivedValue(getTotalReceivedValue() + msg.value);
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
     * If the deadline has passed and the funding target hasn't
     * been reached, allow a donor to get a refund.
     *
     * NOTE that it is still possible for the project to succeed
     * after this; the tokens are still available for purchase,
     * and if the project later passes the threshold it will
     * be considered successful.
     *
     * That is: after success we no longer allow refunds, but
     * after refunds there is still a possibility of success.
     * (The point being that presumably the buyers *want* the
     * project to succeed, so no one's going to be upset if
     * it does.)
     */
    function sellERC1155(
        address buyer,
        address erc1155Addr,
        uint256[] calldata ids,
        uint256[] calldata counts,
        bytes calldata data
    ) external nonReentrant {
        requireSellingAllowed();
        uint256 refundValue = erc1155TotalCost(erc1155Addr, ids, counts);
        setTotalReceivedValue(getTotalReceivedValue() - refundValue);
        payable(buyer).transfer(refundValue);
        IERC1155(erc1155Addr).safeBatchTransferFrom(
            buyer,
            address(this),
            ids,
            counts,
            data
        );
        emit ERC1155Sold(buyer, erc1155Addr, refundValue, ids, counts);
    }
}
