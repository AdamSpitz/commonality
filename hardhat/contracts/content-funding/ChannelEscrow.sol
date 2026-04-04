//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

error OnlyChannelOwnerCanWithdraw();
error InvalidRegistryAddress();
error MustSendEth();
error ChannelNotVerified();
error OnlyChannelOwner();
error NoBalance();
error TransferFailed();

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
        if (_channelRegistry == address(0)) revert InvalidRegistryAddress();
        channelRegistry = _channelRegistry;
    }

    function deposit(bytes32 channelId) external payable {
        if (msg.value == 0) revert MustSendEth();
        _balances[channelId] += msg.value;
        emit Deposited(channelId, msg.sender, msg.value);
    }

    function withdraw(bytes32 channelId) external {
        if (!IChannelRegistry(channelRegistry).isVerified(channelId)) revert ChannelNotVerified();
        if (msg.sender != IChannelRegistry(channelRegistry).channelOwner(channelId)) {
            revert OnlyChannelOwner();
        }

        uint256 amount = _balances[channelId];
        if (amount == 0) revert NoBalance();

        delete _balances[channelId];
        emit Withdrawn(channelId, msg.sender, amount);

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    function balance(bytes32 channelId) external view returns (uint256) {
        return _balances[channelId];
    }
}
