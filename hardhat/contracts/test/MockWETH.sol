// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockWETH is ERC20 {
  constructor() ERC20("Wrapped Ether", "WETH") {}

  receive() external payable {
    deposit();
  }

  function deposit() public payable {
    _mint(msg.sender, msg.value);
  }

  function withdraw(uint256 amount) external {
    _burn(msg.sender, amount);
    (bool ok,) = msg.sender.call{value: amount}("");
    require(ok, "ETH transfer failed");
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}
