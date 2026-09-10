//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IBeneficiaryRegistry} from "./BeneficiaryRegistry.sol";

error InvalidRegistryAddress();
error InvalidPaymentTokenAddress();
error MustSendTokens();
error BeneficiaryNotVerified();
error OnlyBeneficiaryPayoutAddress();
error NoBalance();

/**
 * @title IBeneficiaryEscrow
 * @notice Interface for beneficiary escrow
 */
interface IBeneficiaryEscrow {
    function deposit(bytes32 beneficiaryId, uint256 amount) external;
    function withdraw(bytes32 beneficiaryId) external;
    function balance(bytes32 beneficiaryId) external view returns (uint256);
}

/**
 * @title BeneficiaryEscrow
 * @notice Holds settlement tokens until a beneficiary binds a payout address and withdraws
 * @dev Funds are keyed by beneficiary ID. Only the registry's payout address can withdraw.
 *      Used for public identities that are unclaimed when funds are sent, so their
 *      controller can claim them later after verification.
 *
 *      Token assumptions: The paymentToken must be a standard ERC-20 token with:
 *      - No transfer fees or callbacks
 *      - No rebasing behavior
 *      - Standard transfer/transferFrom/approve interface
 *
 *      This contract uses SafeERC20 for all token transfers to handle non-standard
 *      tokens that may not return boolean success values.
 */
contract BeneficiaryEscrow is IBeneficiaryEscrow {
    using SafeERC20 for IERC20;

    mapping(bytes32 beneficiaryId => uint256 amount) private _balances;

    /// @notice The registry used to resolve the beneficiary payout address
    address public beneficiaryRegistry;
    /// @notice The ERC-20 token held in escrow
    address public immutable paymentToken;

    /**
     * @notice Emitted when settlement tokens are deposited for a beneficiary
     * @param beneficiaryId The beneficiary the deposit is for
     * @param from The address that deposited the tokens
     * @param amount The amount deposited
     */
    event Deposited(bytes32 indexed beneficiaryId, address indexed from, uint256 amount);

    /**
     * @notice Emitted when the beneficiary payout address withdraws escrowed funds
     * @param beneficiaryId The beneficiary the withdrawal is from
     * @param to The payout address that received the tokens
     * @param amount The amount withdrawn
     */
    event Withdrawn(bytes32 indexed beneficiaryId, address indexed to, uint256 amount);

    /**
     * @notice Initializes the escrow with a beneficiary registry and settlement token
     * @param _beneficiaryRegistry The address of the BeneficiaryRegistry contract
     * @param _paymentToken The ERC-20 token held in escrow
     */
    constructor(address _beneficiaryRegistry, address _paymentToken) {
        if (_beneficiaryRegistry == address(0)) revert InvalidRegistryAddress();
        if (_paymentToken == address(0)) revert InvalidPaymentTokenAddress();
        beneficiaryRegistry = _beneficiaryRegistry;
        paymentToken = _paymentToken;
    }

    /**
     * @notice Deposit settlement tokens into escrow for a beneficiary
     * @param beneficiaryId The beneficiary to deposit funds for
     * @param amount The amount of tokens to deposit
     */
    function deposit(bytes32 beneficiaryId, uint256 amount) external {
        if (amount == 0) revert MustSendTokens();
        _balances[beneficiaryId] += amount;
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(beneficiaryId, msg.sender, amount);
    }

    /**
     * @notice Withdraw all escrowed tokens for a beneficiary
     * @param beneficiaryId The beneficiary to withdraw funds for
     */
    function withdraw(bytes32 beneficiaryId) external {
        if (!IBeneficiaryRegistry(beneficiaryRegistry).isVerified(beneficiaryId)) {
            revert BeneficiaryNotVerified();
        }
        if (msg.sender != IBeneficiaryRegistry(beneficiaryRegistry).payoutAddress(beneficiaryId)) {
            revert OnlyBeneficiaryPayoutAddress();
        }

        uint256 amount = _balances[beneficiaryId];
        if (amount == 0) revert NoBalance();

        delete _balances[beneficiaryId];
        emit Withdrawn(beneficiaryId, msg.sender, amount);

        IERC20(paymentToken).safeTransfer(msg.sender, amount);
    }

    /**
     * @notice Returns the escrowed balance for a beneficiary
     * @param beneficiaryId The beneficiary to query
     * @return The amount of settlement-token value held in escrow
     */
    function balance(bytes32 beneficiaryId) external view returns (uint256) {
        return _balances[beneficiaryId];
    }
}
