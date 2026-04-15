//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

error InvalidRegistryAddress();
error InvalidPaymentTokenAddress();
error MustSendTokens();
error ChannelNotVerified();
error OnlyChannelOwner();
error NoBalance();

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
    function deposit(bytes32 channelId, uint256 amount) external;
    function withdraw(bytes32 channelId) external;
    function balance(bytes32 channelId) external view returns (uint256);
}

/**
 * @title ChannelEscrow
 * @notice Holds settlement tokens in escrow per channel until the channel owner is verified and withdraws
 * @dev Funds are deposited by channel ID. Only the verified channel owner can withdraw.
 *      Used for channels that are unclaimed at the time funds are sent, so the creator
 *      can claim them later after verification.
 *
 *      Token assumptions: The paymentToken must be a standard ERC-20 token with:
 *      - No transfer fees or callbacks
 *      - No rebasing behavior
 *      - Standard transfer/transferFrom/approve interface
 *
 *      This contract uses SafeERC20 for all token transfers to handle non-standard
 *      tokens that may not return boolean success values.
 */
contract ChannelEscrow is IChannelEscrow {
    using SafeERC20 for IERC20;

    mapping(bytes32 channelId => uint256 amount) private _balances;

    /// @notice The channel registry contract used to verify channel ownership
    address public channelRegistry;
    /// @notice The ERC-20 token held in escrow
    address public immutable paymentToken;

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
     * @notice Initializes the escrow with a channel registry address and settlement token
     * @param _channelRegistry The address of the ChannelRegistry contract
     * @param _paymentToken The ERC-20 token held in escrow
     */
    constructor(address _channelRegistry, address _paymentToken) {
        if (_channelRegistry == address(0)) revert InvalidRegistryAddress();
        if (_paymentToken == address(0)) revert InvalidPaymentTokenAddress();
        channelRegistry = _channelRegistry;
        paymentToken = _paymentToken;
    }

    /**
     * @notice Deposit settlement tokens into escrow for a specific channel
     * @param channelId The channel to deposit funds for
     * @param amount The amount of tokens to deposit
     */
    function deposit(bytes32 channelId, uint256 amount) external {
        if (amount == 0) revert MustSendTokens();
        _balances[channelId] += amount;
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(channelId, msg.sender, amount);
    }

    /**
     * @notice Withdraw all escrowed settlement tokens for a channel (only verified channel owner)
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

        IERC20(paymentToken).safeTransfer(msg.sender, amount);
    }

    /**
     * @notice Returns the escrowed balance for a channel
     * @param channelId The channel to query
     * @return The amount of settlement-token value held in escrow
     */
    function balance(bytes32 channelId) external view returns (uint256) {
        return _balances[channelId];
    }
}
