// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

contract MockPrimaryMarket {
  uint256 public price = 1;
  bytes32 public beneficiaryId;
  address public recipient;
  address public proceedsRegistry;

  function setRoute(bytes32 beneficiaryId_, address recipient_, address registry_) external {
    beneficiaryId = beneficiaryId_;
    recipient = recipient_;
    proceedsRegistry = registry_;
  }

  function setPrice(uint256 price_) external {
    price = price_;
  }

  function erc1155TotalCost(
    address,
    uint256[] calldata,
    uint256[] calldata counts
  ) external view returns (uint256) {
    uint256 totalCount = 0;
    for (uint256 i = 0; i < counts.length; i++) {
      totalCount += counts[i];
    }
    return price * totalCount;
  }
}
