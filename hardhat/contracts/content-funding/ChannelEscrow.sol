//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

error OnlyChannelOwnerCanWithdraw();
error InvalidRegistryAddress();
error MustSendEth();
error ChannelNotVerified();
error OnlyChannelOwner();
error NoBalance();
error TransferFailed();

/**
 * @title IChannelRegistry
 * @notice Interface for the channel registry used by the escrow
 */
interface IChannelRegistry {
    function channelOwner(bytes32 channelId) external view returns (address);
    function isVerified(bytes32 channelId) external view returns (bool);
}

/**
 * @title IChannelEscrow
 * @notice Interface for the channel escrow contract
 */
interface IChannelEscrow {
    function deposit(bytes32 channelId) external payable;
    function withdraw(bytes32 channelId) external;
    function balance(bytes32 channelId) external view returns (uint256);
}

/**
 * @title ChannelEscrow
 * @notice Holds ETH in escrow per channel until the channel owner is verified and withdraws
 * @dev Funds are deposited by channel ID. Only the verified channel owner can withdraw.
 *      Used for channels that are unclaimed at the time funds are sent, so the creator
 *      can claim them later after verification.
 */
contract ChannelEscrow is IChannelEscrow {
    mapping(bytes32 channelId => uint256 amount) private _balances;

    /// @notice The channel registry contract used to verify channel ownership
    address public channelRegistry;

    /**
     * @notice Emitted when ETH is deposited into escrow for a channel
     * @param channelId The channel the deposit is for
     * @param from The address that deposited the ETH
     * @param amount The amount of ETH deposited
     */
    event Deposited(bytes32 indexed channelId, address indexed from, uint256 amount);

    /**
     * @notice Emitted when the verified channel owner withdraws escrowed funds
     * @param channelId The channel the withdrawal is from
     * @param to The address that received the ETH
     * @param amount The amount of ETH withdrawn
     */
    event Withdrawn(bytes32 indexed channelId, address indexed to, uint256 amount);

    /**
     * @notice Initializes the escrow with a channel registry address
     * @param _channelRegistry The address of the ChannelRegistry contract
     */
    constructor(address _channelRegistry) {
        if (_channelRegistry == address(0)) revert InvalidRegistryAddress();
        channelRegistry = _channelRegistry;
    }

    /**
     * @notice Deposit ETH into escrow for a specific channel
     * @param channelId The channel to deposit funds for
     */
    function deposit(bytes32 channelId) external payable {
        if (msg.value == 0) revert MustSendEth();
        _balances[channelId] += msg.value;
        emit Deposited(channelId, msg.sender, msg.value);
    }

    /**
     * @notice Withdraw all escrowed ETH for a channel (only verified channel owner)
     * @param channelId The channel to withdraw funds from
     */
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

    /**
     * @notice Returns the escrowed balance for a channel
     * @param channelId The channel to query
     * @return The amount of ETH held in escrow
     */
    function balance(bytes32 channelId) external view returns (uint256) {
        return _balances[channelId];
    }
}
