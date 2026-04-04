//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

error OnlyChannelOwnerCanWithdraw();

interface IChannelRegistry {
    function channelOwner(bytes32 channelId) external view returns (address);
    function isVerified(bytes32 channelId) external view returns (bool);
}

interface IChannelEscrow {
    function deposit(bytes32 channelId) external payable;
    function withdraw(bytes32 channelId) external;
    function balance(bytes32 channelId) external view returns (uint256);
}

contract ChannelEscrow is IChannelEscrow {
    mapping(bytes32 channelId => uint256 amount) private _balances;

    address public channelRegistry;

    event Deposited(bytes32 indexed channelId, address indexed from, uint256 amount);
    event Withdrawn(bytes32 indexed channelId, address indexed to, uint256 amount);

    constructor(address _channelRegistry) {
        require(_channelRegistry != address(0), "Invalid registry address");
        channelRegistry = _channelRegistry;
    }

    function deposit(bytes32 channelId) external payable {
        require(msg.value > 0, "Must send ETH");
        _balances[channelId] += msg.value;
        emit Deposited(channelId, msg.sender, msg.value);
    }

    function withdraw(bytes32 channelId) external {
        require(IChannelRegistry(channelRegistry).isVerified(channelId), "Channel not verified");
        require(
            msg.sender == IChannelRegistry(channelRegistry).channelOwner(channelId),
            "Only channel owner"
        );

        uint256 amount = _balances[channelId];
        require(amount > 0, "No balance");

        delete _balances[channelId];
        emit Withdrawn(channelId, msg.sender, amount);

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
    }

    function balance(bytes32 channelId) external view returns (uint256) {
        return _balances[channelId];
    }
}
