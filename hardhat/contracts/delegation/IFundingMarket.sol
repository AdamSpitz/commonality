// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/// @notice The purchase capability used by delegated notes. Implementing this
/// interface does not authorize a market: factory authorization is still required.
/// An authorized implementation must collect the quoted settlement-token amount
/// from the caller and deliver the requested token quantities to buyer atomically.
/// The settlement token must satisfy the notes' standard ERC-20 assumptions.
interface IFundingMarket {
    function paymentToken() external view returns (address);
    function erc1155TotalCost(address token, uint256[] calldata ids, uint256[] calldata counts)
        external view returns (uint256);
    function buyERC1155(address buyer, address token, uint256[] calldata ids,
        uint256[] calldata counts, bytes calldata data) external;
}

/// @notice Optional return path. A refund must return settlement tokens to holder;
/// delegated notes account for the actual balance received, not a quoted amount.
interface IRefundableFundingMarket {
    function refundERC1155(address holder, address token, uint256[] calldata ids,
        uint256[] calldata counts, bytes calldata data) external;
}
